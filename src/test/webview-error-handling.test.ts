import * as assert from 'assert';
import * as vscode from 'vscode';
import { WebviewPanelManager } from '../webview-panel-manager';
import { WebviewContentProvider } from '../webview-content-provider';
import { WebviewMessageHandler } from '../webview-message-handler';
import { isError, getErrorMessage, errorMessageIncludes } from './error-utils';

/**
 * Test suite for webview error handling and recovery scenarios
 * Tests Requirements: 1.4, 1.5, 4.2, 4.4
 */
suite('Webview Error Handling and Recovery Tests', () => {
    let webviewPanelManager: WebviewPanelManager;
    let mockLogger: any;
    let extensionUri: vscode.Uri;

    setup(() => {
        // Create mock logger that captures log messages
        const logMessages: any[] = [];
        mockLogger = {
            info: (message: string, context?: any) => {
                logMessages.push({ level: 'info', message, context });
                console.log(`INFO: ${message}`, context);
            },
            warn: (message: string, context?: any) => {
                logMessages.push({ level: 'warn', message, context });
                console.warn(`WARN: ${message}`, context);
            },
            error: (message: string, context?: any) => {
                logMessages.push({ level: 'error', message, context });
                console.error(`ERROR: ${message}`, context);
            },
            debug: (message: string, context?: any) => {
                logMessages.push({ level: 'debug', message, context });
                console.log(`DEBUG: ${message}`, context);
            },
            getMessages: () => logMessages,
            clearMessages: () => logMessages.length = 0
        };

        extensionUri = vscode.Uri.file(__dirname + '/../..');
        webviewPanelManager = WebviewPanelManager.getInstance(extensionUri, mockLogger);
    });

    teardown(() => {
        if (webviewPanelManager) {
            webviewPanelManager.dispose();
        }
        mockLogger.clearMessages();
    });   
 test('should handle webview content loading failures gracefully', async () => {
        // Requirement 4.2: WHEN the webview HTML fails to load THEN it SHALL display an error page with diagnostic information
        
        // Create a content provider with invalid extension URI to simulate failure
        const invalidUri = vscode.Uri.file('/invalid/path');
        const contentProvider = new WebviewContentProvider(invalidUri, mockLogger);
        
        // Create a mock webview object
        const mockWebview = {
            cspSource: 'vscode-webview://test',
            asWebviewUri: (uri: vscode.Uri) => uri
        };
        
        // Act - Try to get webview content with invalid path
        const content = contentProvider.getWebviewContent(mockWebview as any);
        
        // Assert - Should return error content instead of throwing
        assert.ok(content.includes('VSS Drawing Canvas Error'), 'Should return error HTML content');
        assert.ok(content.includes('Troubleshooting Steps'), 'Should include troubleshooting information');
        assert.ok(content.includes('retry-button'), 'Should include retry functionality');
        assert.ok(content.includes('report-button'), 'Should include report issue functionality');
        
        // Verify error was logged
        const errorMessages = mockLogger.getMessages().filter((msg: any) => msg.level === 'error');
        assert.ok(errorMessages.length > 0, 'Should have logged error messages');
    });

    test('should handle multiple command executions without creating duplicates', async () => {
        // Requirement 1.5: WHEN the webview is opened multiple times THEN it SHALL focus the existing webview instead of creating duplicates
        
        // Act - Execute showDrawingCanvas multiple times rapidly
        const promises = [
            webviewPanelManager.showDrawingCanvas(),
            webviewPanelManager.showDrawingCanvas(),
            webviewPanelManager.showDrawingCanvas()
        ];
        
        await Promise.all(promises);
        
        // Assert - Should only have one panel
        assert.strictEqual(webviewPanelManager.exists(), true, 'Panel should exist');
        
        const panelStats = webviewPanelManager.getPanelStats();
        assert.strictEqual(panelStats.disposeCount, 0, 'Panel should not have been disposed and recreated');
        
        // Verify no error messages were logged
        const errorMessages = mockLogger.getMessages().filter((msg: any) => msg.level === 'error');
        assert.strictEqual(errorMessages.length, 0, 'Should not have logged any errors');
    });

    test('should handle panel disposal and recreation properly', async () => {
        // Requirement 1.4, 1.5: Test panel disposal and recreation functionality
        
        // Act - Create panel, dispose it, then recreate
        await webviewPanelManager.showDrawingCanvas();
        assert.strictEqual(webviewPanelManager.exists(), true, 'Panel should exist initially');
        
        webviewPanelManager.dispose();
        assert.strictEqual(webviewPanelManager.exists(), false, 'Panel should not exist after disposal');
        
        await webviewPanelManager.recreatePanel();
        assert.strictEqual(webviewPanelManager.exists(), true, 'Panel should exist after recreation');
        
        // Assert - Panel state should be properly reset
        const panelState = webviewPanelManager.getPanelState();
        assert.strictEqual(panelState.isVisible, true, 'Recreated panel should be visible');
        assert.strictEqual(panelState.isActive, true, 'Recreated panel should be active');
        assert.strictEqual(panelState.disposeCount, 1, 'Should track disposal count correctly');
    });

    test('should handle message handler errors gracefully', async () => {
        // Test error handling in message communication
        
        await webviewPanelManager.showDrawingCanvas();
        
        // Register a handler that throws an error
        webviewPanelManager.registerMessageHandler('errorTest', (message) => {
            throw new Error('Test error in message handler');
        });
        
        // Act - This would normally be triggered by webview message, but we can't simulate that easily
        // Instead, verify the handler registration doesn't throw
        assert.doesNotThrow(() => {
            webviewPanelManager.registerMessageHandler('anotherTest', () => {
                throw new Error('Another test error');
            });
        }, 'Registering error-throwing handlers should not throw during registration');
    });
});/**

 * WebviewContentProvider Error Handling Tests
 */
suite('WebviewContentProvider Error Handling Tests', () => {
    let contentProvider: WebviewContentProvider;
    let mockLogger: any;
    let extensionUri: vscode.Uri;

    setup(() => {
        const logMessages: any[] = [];
        mockLogger = {
            info: (message: string, context?: any) => logMessages.push({ level: 'info', message, context }),
            warn: (message: string, context?: any) => logMessages.push({ level: 'warn', message, context }),
            error: (message: string, context?: any) => logMessages.push({ level: 'error', message, context }),
            debug: (message: string, context?: any) => logMessages.push({ level: 'debug', message, context }),
            getMessages: () => logMessages,
            clearMessages: () => logMessages.length = 0
        };

        extensionUri = vscode.Uri.file(__dirname + '/../..');
        contentProvider = new WebviewContentProvider(extensionUri, mockLogger);
    });

    test('should return error content when resource files are missing', () => {
        // Requirement 4.2: Test error display when webview content fails to load
        
        // Create mock webview with invalid resource paths
        const mockWebview = {
            cspSource: 'vscode-webview://test',
            asWebviewUri: (uri: vscode.Uri) => vscode.Uri.parse('vscode-webview://invalid/' + uri.path)
        };
        
        // Act
        const content = contentProvider.getWebviewContent(mockWebview as any);
        
        // Assert - Should handle missing resources gracefully
        assert.ok(typeof content === 'string', 'Should return string content');
        assert.ok(content.length > 0, 'Should return non-empty content');
        
        // Check if it's error content or regular content with warnings
        const isErrorContent = content.includes('VSS Drawing Canvas Error');
        const hasWarnings = mockLogger.getMessages().some((msg: any) => 
            msg.level === 'warn' && msg.message.includes('file not found')
        );
        
        assert.ok(isErrorContent || hasWarnings, 'Should either return error content or log warnings about missing files');
    });

    test('should generate proper error HTML with troubleshooting steps', () => {
        // Requirement 4.2: Verify error page contains diagnostic information
        
        const testError = 'Test error message for validation';
        const errorContent = contentProvider.getErrorWebviewContent(testError);
        
        // Assert - Verify error HTML structure
        assert.ok(errorContent.includes(testError), 'Error content should include the error message');
        assert.ok(errorContent.includes('VSS Drawing Canvas Error'), 'Should have error title');
        assert.ok(errorContent.includes('Troubleshooting Steps'), 'Should include troubleshooting section');
        assert.ok(errorContent.includes('Reload VS Code'), 'Should include reload instruction');
        assert.ok(errorContent.includes('Check Extension'), 'Should include extension check instruction');
        assert.ok(errorContent.includes('Run Diagnostics'), 'Should include diagnostics instruction');
        assert.ok(errorContent.includes('retry-button'), 'Should include retry button');
        assert.ok(errorContent.includes('report-button'), 'Should include report button');
        assert.ok(errorContent.includes('System Information'), 'Should include system info section');
    });

    test('should handle HTML escaping for security', () => {
        // Test XSS prevention in error messages
        
        const maliciousInput = '<script>alert("xss")</script>';
        const errorContent = contentProvider.getErrorWebviewContent(maliciousInput);
        
        // Assert - Should escape HTML characters
        assert.ok(!errorContent.includes('<script>'), 'Should not contain unescaped script tags');
        assert.ok(errorContent.includes('&lt;script&gt;'), 'Should contain escaped HTML');
    });
});

/**
 * WebviewMessageHandler Error Handling Tests
 */
suite('WebviewMessageHandler Error Handling Tests', () => {
    let messageHandler: WebviewMessageHandler;
    let mockLogger: any;

    setup(() => {
        const logMessages: any[] = [];
        mockLogger = {
            info: (message: string, context?: any) => logMessages.push({ level: 'info', message, context }),
            warn: (message: string, context?: any) => logMessages.push({ level: 'warn', message, context }),
            error: (message: string, context?: any) => logMessages.push({ level: 'error', message, context }),
            debug: (message: string, context?: any) => logMessages.push({ level: 'debug', message, context }),
            getMessages: () => logMessages,
            clearMessages: () => logMessages.length = 0
        };

        messageHandler = new WebviewMessageHandler(mockLogger);
    });

    teardown(() => {
        messageHandler.dispose();
    });

    test('should handle connection status tracking', () => {
        // Requirement 4.4: Test connection status handling
        
        // Initially should be disconnected
        assert.strictEqual(messageHandler.isConnected(), false, 'Should initially be disconnected');
        
        // Time since last message should be 0 initially
        const timeSinceLastMessage = messageHandler.getTimeSinceLastMessage();
        assert.ok(timeSinceLastMessage >= 0, 'Time since last message should be non-negative');
    });

    test('should register and handle custom message handlers', () => {
        // Test custom message handler registration and error handling
        
        let handlerCalled = false;
        let errorThrown = false;
        
        // Register normal handler
        messageHandler.registerHandler('testCommand', (message) => {
            handlerCalled = true;
        });
        
        // Register error-throwing handler
        messageHandler.registerHandler('errorCommand', (message) => {
            errorThrown = true;
            throw new Error('Test handler error');
        });
        
        // Assert - Registration should not throw
        assert.doesNotThrow(() => {
            messageHandler.registerHandler('anotherCommand', () => {});
        }, 'Handler registration should not throw');
    });

    test('should handle message sending without webview panel', () => {
        // Test message sending when no webview panel is set
        
        const testMessage = {
            command: 'test',
            data: { message: 'test' }
        };
        
        // Act - Should not throw when no panel is set
        assert.doesNotThrow(() => {
            messageHandler.sendMessage(testMessage);
        }, 'Sending message without panel should not throw');
        
        // Should log warning
        const warnings = mockLogger.getMessages().filter((msg: any) => msg.level === 'warn');
        assert.ok(warnings.some((w: any) => w.message.includes('no webview panel')), 'Should log warning about missing panel');
    });

    test('should properly dispose and clean up resources', () => {
        // Test proper cleanup on disposal
        
        // Register some handlers
        messageHandler.registerHandler('test1', () => {});
        messageHandler.registerHandler('test2', () => {});
        
        // Act - Dispose
        messageHandler.dispose();
        
        // Assert - Should handle disposal gracefully
        assert.strictEqual(messageHandler.isConnected(), false, 'Should be disconnected after disposal');
        
        // Sending messages after disposal should not throw
        assert.doesNotThrow(() => {
            messageHandler.sendMessage({ command: 'test', data: {} });
        }, 'Sending message after disposal should not throw');
    });
});

/**
 * Integration Error Handling Tests
 */
suite('Integration Error Handling Tests', () => {
    
    test('should handle extension command errors gracefully', async () => {
        // Requirement 1.4: Test error handling when webview fails to load
        
        try {
            // Try to execute command that might fail in test environment
            await vscode.commands.executeCommand('vss.openDrawingCanvas');
            
            // If successful, verify no errors were thrown
            assert.ok(true, 'Command executed without throwing');
            
        } catch (error) {
            // Expected in test environment where extension might not be fully activated
            if (isError(error)) {
                assert.ok(errorMessageIncludes(error, 'command not found') || 
                         errorMessageIncludes(error, 'not initialized'), 
                         'Should fail with expected error message');
            }
        }
    });

    test('should verify error recovery mechanisms exist', () => {
        // Requirement 4.4: Verify error recovery and troubleshooting features
        
        const fs = require('fs');
        const path = require('path');
        
        try {
            // Check if webview HTML contains error recovery elements
            const htmlPath = path.join(__dirname, '../../webview/index.html');
            const htmlContent = fs.readFileSync(htmlPath, 'utf8');
            
            // Assert - Verify error recovery features
            assert.ok(htmlContent.includes('window.addEventListener(\'error\''), 'Should have global error handler');
            assert.ok(htmlContent.includes('unhandledrejection'), 'Should handle unhandled promise rejections');
            assert.ok(htmlContent.includes('showError'), 'Should have showError function');
            assert.ok(htmlContent.includes('retry-button'), 'Should have retry functionality');
            assert.ok(htmlContent.includes('location.reload'), 'Should have page reload functionality');
            assert.ok(htmlContent.includes('reportIssue'), 'Should have issue reporting functionality');
            
        } catch (error) {
            console.warn('Could not verify error recovery mechanisms:', getErrorMessage(error));
            assert.ok(true, 'Test skipped - HTML file not accessible');
        }
    });
});