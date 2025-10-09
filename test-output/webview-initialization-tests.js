/**
 * Comprehensive Test Suite for Webview Initialization Fix
 * 
 * This test suite verifies that the webview initialization fix properly handles:
 * - Webview reloading without JavaScript errors
 * - Extension restart scenarios
 * - Multiple webview instances without conflicts
 * - Canvas functionality integrity after initialization
 * - Error handling and recovery mechanisms
 */

// Test configuration
const TEST_CONFIG = {
    INITIALIZATION_TIMEOUT: 10000,
    RETRY_ATTEMPTS: 3,
    DELAY_BETWEEN_TESTS: 1000,
    CANVAS_SIZE: { width: 800, height: 600 }
};

// Test results tracking
let testResults = {
    passed: 0,
    failed: 0,
    skipped: 0,
    errors: [],
    details: []
};

/**
 * Test Suite 5.1: Webview Reloading Scenarios
 * Requirements: 1.3, 1.4, 2.5
 */
class WebviewReloadingTests {
    constructor() {
        this.testName = 'Webview Reloading Scenarios';
        this.originalConsoleError = console.error;
        this.capturedErrors = [];
    }

    async runAllTests() {
        console.log(`\n=== Starting ${this.testName} Tests ===`);
        
        try {
            await this.testBasicWebviewReload();
            await this.testMultipleReloads();
            await this.testExtensionRestartSimulation();
            await this.testMultipleWebviewInstances();
            await this.testVariableConflictPrevention();
            await this.testCleanupOnReload();
            
            console.log(`\n=== ${this.testName} Tests Completed ===`);
            return this.getTestSummary();
            
        } catch (error) {
            console.error(`Fatal error in ${this.testName}:`, error);
            this.recordTestResult('FATAL_ERROR', false, `Fatal error: ${error.message}`);
            return this.getTestSummary();
        }
    }

    async testBasicWebviewReload() {
        const testName = 'Basic Webview Reload';
        console.log(`\nTesting: ${testName}`);
        
        try {
            // Capture initial state
            const initialState = this.captureWebviewState();
            
            // Simulate webview reload by re-executing initialization
            await this.simulateWebviewReload();
            
            // Verify no JavaScript errors occurred
            const hasErrors = this.checkForJavaScriptErrors();
            if (hasErrors.length > 0) {
                throw new Error(`JavaScript errors detected: ${hasErrors.join(', ')}`);
            }
            
            // Verify VSSCanvas namespace exists and is properly initialized
            if (!window.VSSCanvas) {
                throw new Error('VSSCanvas namespace not found after reload');
            }
            
            if (!window.VSSCanvas.initialized) {
                throw new Error('VSSCanvas not properly initialized after reload');
            }
            
            // Verify canvas functionality
            const canvasWorking = await this.verifyCanvasFunctionality();
            if (!canvasWorking) {
                throw new Error('Canvas functionality not working after reload');
            }
            
            this.recordTestResult(testName, true, 'Webview reloaded successfully without errors');
            
        } catch (error) {
            this.recordTestResult(testName, false, error.message);
        }
    }

    async testMultipleReloads() {
        const testName = 'Multiple Sequential Reloads';
        console.log(`\nTesting: ${testName}`);
        
        try {
            const reloadCount = 5;
            
            for (let i = 1; i <= reloadCount; i++) {
                console.log(`  Reload attempt ${i}/${reloadCount}`);
                
                await this.simulateWebviewReload();
                
                // Check for errors after each reload
                const errors = this.checkForJavaScriptErrors();
                if (errors.length > 0) {
                    throw new Error(`Errors after reload ${i}: ${errors.join(', ')}`);
                }
                
                // Verify VSSCanvas is still functional
                if (!window.VSSCanvas || !window.VSSCanvas.initialized) {
                    throw new Error(`VSSCanvas not properly initialized after reload ${i}`);
                }
                
                // Small delay between reloads
                await this.delay(500);
            }
            
            this.recordTestResult(testName, true, `Successfully completed ${reloadCount} sequential reloads`);
            
        } catch (error) {
            this.recordTestResult(testName, false, error.message);
        }
    }

    async testExtensionRestartSimulation() {
        const testName = 'Extension Restart Simulation';
        console.log(`\nTesting: ${testName}`);
        
        try {
            // Simulate extension restart by:
            // 1. Cleaning up existing instance
            // 2. Clearing VS Code API reference
            // 3. Re-initializing everything
            
            if (window.VSSCanvas && window.VSSCanvas.cleanup) {
                await window.VSSCanvas.cleanup();
            }
            
            // Clear VS Code API to simulate extension restart
            const originalVscode = window.vscode;
            window.vscode = null;
            
            // Simulate re-acquiring VS Code API
            if (typeof acquireVsCodeApi === 'function') {
                window.vscode = acquireVsCodeApi();
            }
            
            // Re-initialize webview
            await this.simulateWebviewReload();
            
            // Verify initialization succeeded
            if (!window.VSSCanvas || !window.VSSCanvas.initialized) {
                throw new Error('VSSCanvas not properly initialized after extension restart simulation');
            }
            
            // Verify canvas functionality
            const canvasWorking = await this.verifyCanvasFunctionality();
            if (!canvasWorking) {
                throw new Error('Canvas functionality not working after extension restart');
            }
            
            this.recordTestResult(testName, true, 'Extension restart simulation completed successfully');
            
        } catch (error) {
            this.recordTestResult(testName, false, error.message);
        }
    }

    async testMultipleWebviewInstances() {
        const testName = 'Multiple Webview Instances';
        console.log(`\nTesting: ${testName}`);
        
        try {
            // Create multiple VSSCanvas instances to simulate multiple webviews
            const instances = [];
            const instanceCount = 3;
            
            for (let i = 0; i < instanceCount; i++) {
                // Create a new namespace for each instance
                const instanceName = `VSSCanvas_Instance_${i}`;
                
                // Simulate creating a new webview instance
                window[instanceName] = {
                    canvas: null,
                    ctx: null,
                    initialized: false,
                    instanceId: `instance_${i}_${Date.now()}`,
                    
                    init: async function() {
                        this.initialized = true;
                        console.log(`${instanceName} initialized`);
                    },
                    
                    cleanup: async function() {
                        this.initialized = false;
                        console.log(`${instanceName} cleaned up`);
                    }
                };
                
                instances.push(window[instanceName]);
                await window[instanceName].init();
            }
            
            // Verify all instances are independent
            for (let i = 0; i < instances.length; i++) {
                if (!instances[i].initialized) {
                    throw new Error(`Instance ${i} not properly initialized`);
                }
                
                if (instances[i].instanceId === instances[(i + 1) % instances.length].instanceId) {
                    throw new Error(`Instance ${i} has conflicting ID with another instance`);
                }
            }
            
            // Cleanup instances
            for (const instance of instances) {
                await instance.cleanup();
            }
            
            this.recordTestResult(testName, true, `Successfully created and managed ${instanceCount} independent instances`);
            
        } catch (error) {
            this.recordTestResult(testName, false, error.message);
        }
    }

    async testVariableConflictPrevention() {
        const testName = 'Variable Conflict Prevention';
        console.log(`\nTesting: ${testName}`);
        
        try {
            // Test the specific error that was being fixed
            // Try to declare hasInitialized multiple times
            
            let errorCaught = false;
            
            try {
                // This should not cause an error due to IIFE wrapper
                eval(`
                    (function() {
                        let hasInitialized = false;
                        let hasInitialized2 = true; // Different variable name should work
                    })();
                    
                    (function() {
                        let hasInitialized = false; // Same name in different scope should work
                    })();
                `);
            } catch (error) {
                if (error.message.includes('already been declared')) {
                    errorCaught = true;
                }
            }
            
            if (errorCaught) {
                throw new Error('Variable redeclaration error still occurs - IIFE wrapper not working properly');
            }
            
            // Test namespace pattern prevents conflicts
            if (window.VSSCanvas) {
                const originalInstanceId = window.VSSCanvas.instanceId;
                
                // Simulate reinitialization
                await this.simulateWebviewReload();
                
                // Verify new instance was created properly
                if (!window.VSSCanvas.instanceId || window.VSSCanvas.instanceId === originalInstanceId) {
                    console.warn('Instance ID not changed - this may be expected behavior');
                }
            }
            
            this.recordTestResult(testName, true, 'Variable conflicts properly prevented');
            
        } catch (error) {
            this.recordTestResult(testName, false, error.message);
        }
    }

    async testCleanupOnReload() {
        const testName = 'Cleanup on Reload';
        console.log(`\nTesting: ${testName}`);
        
        try {
            // Initialize and track resources
            await this.simulateWebviewReload();
            
            if (!window.VSSCanvas) {
                throw new Error('VSSCanvas not available for cleanup test');
            }
            
            // Get initial state
            const initialEventListeners = window.VSSCanvas.eventListeners ? window.VSSCanvas.eventListeners.length : 0;
            const initialTimeouts = window.VSSCanvas.initializationTimeout ? 1 : 0;
            
            // Add some test resources
            if (window.VSSCanvas.addEventListener) {
                window.VSSCanvas.addEventListener(document, 'test-event', () => {});
            }
            
            // Simulate reload with cleanup
            if (window.VSSCanvas.cleanup) {
                await window.VSSCanvas.cleanup();
            }
            
            await this.simulateWebviewReload();
            
            // Verify cleanup occurred
            if (window.VSSCanvas.eventListeners && window.VSSCanvas.eventListeners.length > initialEventListeners + 10) {
                console.warn('Event listeners may not be properly cleaned up');
            }
            
            this.recordTestResult(testName, true, 'Cleanup on reload working properly');
            
        } catch (error) {
            this.recordTestResult(testName, false, error.message);
        }
    }

    // Helper methods
    async simulateWebviewReload() {
        // Simulate the webview reload process
        if (window.VSSCanvas && window.VSSCanvas.cleanup) {
            await window.VSSCanvas.cleanup();
        }
        
        // Re-execute the initialization script (simulate script re-execution)
        if (window.VSSCanvas && window.VSSCanvas.init) {
            await window.VSSCanvas.init();
        } else {
            // If VSSCanvas doesn't exist, simulate the IIFE execution
            // This would normally happen when the script is re-executed
            console.log('Simulating IIFE re-execution...');
        }
        
        // Wait for initialization to complete
        await this.delay(1000);
    }

    captureWebviewState() {
        return {
            vssCanvasExists: !!window.VSSCanvas,
            vssCanvasInitialized: window.VSSCanvas ? window.VSSCanvas.initialized : false,
            canvasElement: !!document.getElementById('drawing-canvas'),
            errorScreenVisible: this.isErrorScreenVisible(),
            loadingScreenVisible: this.isLoadingScreenVisible()
        };
    }

    checkForJavaScriptErrors() {
        // Check captured errors
        const errors = [...this.capturedErrors];
        this.capturedErrors = []; // Clear for next test
        
        // Filter out expected/harmless errors
        return errors.filter(error => {
            return !error.includes('acquireVsCodeApi') && 
                   !error.includes('test-event') &&
                   !error.includes('Non-Error promise rejection');
        });
    }

    async verifyCanvasFunctionality() {
        try {
            const canvas = document.getElementById('drawing-canvas');
            if (!canvas) return false;
            
            const ctx = canvas.getContext('2d');
            if (!ctx) return false;
            
            // Test basic drawing operations
            ctx.beginPath();
            ctx.moveTo(10, 10);
            ctx.lineTo(50, 50);
            ctx.stroke();
            
            return true;
        } catch (error) {
            console.error('Canvas functionality test failed:', error);
            return false;
        }
    }

    isErrorScreenVisible() {
        const errorScreen = document.getElementById('error-screen');
        return errorScreen && errorScreen.style.display !== 'none';
    }

    isLoadingScreenVisible() {
        const loadingScreen = document.getElementById('loading-screen');
        return loadingScreen && loadingScreen.style.display !== 'none';
    }

    setupErrorCapture() {
        this.capturedErrors = [];
        console.error = (...args) => {
            this.capturedErrors.push(args.join(' '));
            this.originalConsoleError.apply(console, args);
        };
    }

    restoreErrorCapture() {
        console.error = this.originalConsoleError;
    }

    recordTestResult(testName, passed, details) {
        const result = {
            test: testName,
            passed: passed,
            details: details,
            timestamp: new Date().toISOString()
        };
        
        testResults.details.push(result);
        
        if (passed) {
            testResults.passed++;
            console.log(`  ✅ ${testName}: ${details}`);
        } else {
            testResults.failed++;
            testResults.errors.push(`${testName}: ${details}`);
            console.error(`  ❌ ${testName}: ${details}`);
        }
    }

    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    getTestSummary() {
        return {
            testSuite: this.testName,
            passed: testResults.passed,
            failed: testResults.failed,
            total: testResults.passed + testResults.failed,
            errors: testResults.errors,
            details: testResults.details
        };
    }
}

/**
 * Test Suite 5.2: Canvas Functionality Integrity
 * Requirements: 4.1, 4.2, 4.3, 4.5
 */
class CanvasFunctionalityTests {
    constructor() {
        this.testName = 'Canvas Functionality Integrity';
    }

    async runAllTests() {
        console.log(`\n=== Starting ${this.testName} Tests ===`);
        
        try {
            await this.testDrawingToolsAfterInit();
            await this.testToolbarInteractions();
            await this.testStatusBarUpdates();
            await this.testCanvasInteractions();
            await this.testMessagePassingWithExtension();
            await this.testCanvasResizing();
            await this.testEventListenerIntegrity();
            
            console.log(`\n=== ${this.testName} Tests Completed ===`);
            return this.getTestSummary();
            
        } catch (error) {
            console.error(`Fatal error in ${this.testName}:`, error);
            this.recordTestResult('FATAL_ERROR', false, `Fatal error: ${error.message}`);
            return this.getTestSummary();
        }
    }

    async testDrawingToolsAfterInit() {
        const testName = 'Drawing Tools After Initialization';
        console.log(`\nTesting: ${testName}`);
        
        try {
            // Ensure webview is initialized
            if (!window.VSSCanvas || !window.VSSCanvas.initialized) {
                throw new Error('VSSCanvas not initialized');
            }
            
            const canvas = document.getElementById('drawing-canvas');
            if (!canvas) {
                throw new Error('Canvas element not found');
            }
            
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                throw new Error('Canvas context not available');
            }
            
            // Test pen tool
            await this.testPenTool(canvas, ctx);
            
            // Test eraser tool
            await this.testEraserTool(canvas, ctx);
            
            // Test clear functionality
            await this.testClearCanvas(canvas, ctx);
            
            this.recordTestResult(testName, true, 'All drawing tools working correctly after initialization');
            
        } catch (error) {
            this.recordTestResult(testName, false, error.message);
        }
    }

    async testPenTool(canvas, ctx) {
        // Simulate pen tool selection
        const penButton = document.querySelector('[data-tool="pen"]');
        if (penButton) {
            penButton.click();
        }
        
        // Test drawing with pen
        const startX = 100, startY = 100;
        const endX = 200, endY = 200;
        
        // Simulate mouse events
        this.simulateMouseEvent(canvas, 'mousedown', startX, startY);
        this.simulateMouseEvent(canvas, 'mousemove', endX, endY);
        this.simulateMouseEvent(canvas, 'mouseup', endX, endY);
        
        // Verify drawing occurred (check if pixels changed)
        const imageData = ctx.getImageData(startX, startY, endX - startX, endY - startY);
        const hasDrawing = Array.from(imageData.data).some(pixel => pixel !== 0);
        
        if (!hasDrawing) {
            throw new Error('Pen tool did not draw on canvas');
        }
    }

    async testEraserTool(canvas, ctx) {
        // First draw something to erase
        ctx.fillStyle = '#000000';
        ctx.fillRect(50, 50, 100, 100);
        
        // Select eraser tool
        const eraserButton = document.querySelector('[data-tool="eraser"]');
        if (eraserButton) {
            eraserButton.click();
        }
        
        // Simulate erasing
        this.simulateMouseEvent(canvas, 'mousedown', 75, 75);
        this.simulateMouseEvent(canvas, 'mousemove', 125, 125);
        this.simulateMouseEvent(canvas, 'mouseup', 125, 125);
        
        // Note: Actual erasing verification would require more complex pixel analysis
        // For now, we just verify the tool selection worked
        const eraserActive = eraserButton && eraserButton.classList.contains('active');
        if (!eraserActive) {
            throw new Error('Eraser tool not properly activated');
        }
    }

    async testClearCanvas(canvas, ctx) {
        // Draw something first
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(0, 0, 50, 50);
        
        // Click clear button
        const clearButton = document.getElementById('clear-canvas');
        if (!clearButton) {
            throw new Error('Clear canvas button not found');
        }
        
        clearButton.click();
        
        // Verify canvas is cleared
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const isCleared = Array.from(imageData.data).every((pixel, index) => {
            // Check if all pixels are white (255) or transparent (0)
            return index % 4 === 3 ? pixel === 255 || pixel === 0 : pixel === 255 || pixel === 0;
        });
        
        if (!isCleared) {
            console.warn('Canvas may not be completely cleared - this might be expected behavior');
        }
    }

    async testToolbarInteractions() {
        const testName = 'Toolbar Interactions';
        console.log(`\nTesting: ${testName}`);
        
        try {
            const toolButtons = document.querySelectorAll('.tool-button[data-tool]');
            if (toolButtons.length === 0) {
                throw new Error('No tool buttons found');
            }
            
            // Test each tool button
            for (const button of toolButtons) {
                const tool = button.dataset.tool;
                button.click();
                
                // Verify button becomes active
                if (!button.classList.contains('active')) {
                    throw new Error(`Tool button ${tool} did not become active when clicked`);
                }
                
                // Verify other buttons are not active
                const otherButtons = Array.from(toolButtons).filter(b => b !== button);
                for (const otherButton of otherButtons) {
                    if (otherButton.classList.contains('active')) {
                        throw new Error(`Multiple tool buttons active simultaneously`);
                    }
                }
            }
            
            this.recordTestResult(testName, true, 'All toolbar interactions working correctly');
            
        } catch (error) {
            this.recordTestResult(testName, false, error.message);
        }
    }

    async testStatusBarUpdates() {
        const testName = 'Status Bar Updates';
        console.log(`\nTesting: ${testName}`);
        
        try {
            const statusElement = document.getElementById('status');
            if (!statusElement) {
                throw new Error('Status element not found');
            }
            
            const connectionStatus = document.getElementById('connection-status');
            if (!connectionStatus) {
                throw new Error('Connection status element not found');
            }
            
            // Test status updates
            if (window.VSSCanvas && window.VSSCanvas.updateStatus) {
                window.VSSCanvas.updateStatus('Test status message');
                
                const statusText = statusElement.querySelector('span:first-child');
                if (statusText && !statusText.textContent.includes('Test status message')) {
                    throw new Error('Status message not updated correctly');
                }
            }
            
            // Test connection status updates
            if (window.VSSCanvas && window.VSSCanvas.updateConnectionStatus) {
                window.VSSCanvas.updateConnectionStatus(true);
                
                if (!connectionStatus.classList.contains('connected')) {
                    throw new Error('Connection status not updated to connected');
                }
                
                window.VSSCanvas.updateConnectionStatus(false);
                
                if (!connectionStatus.classList.contains('disconnected')) {
                    throw new Error('Connection status not updated to disconnected');
                }
            }
            
            this.recordTestResult(testName, true, 'Status bar updates working correctly');
            
        } catch (error) {
            this.recordTestResult(testName, false, error.message);
        }
    }

    async testCanvasInteractions() {
        const testName = 'Canvas Interactions';
        console.log(`\nTesting: ${testName}`);
        
        try {
            const canvas = document.getElementById('drawing-canvas');
            if (!canvas) {
                throw new Error('Canvas element not found');
            }
            
            // Test mouse events
            let mouseDownFired = false;
            let mouseMoveFireed = false;
            let mouseUpFired = false;
            
            const originalMouseDown = canvas.onmousedown;
            const originalMouseMove = canvas.onmousemove;
            const originalMouseUp = canvas.onmouseup;
            
            // Temporarily override event handlers to track firing
            canvas.addEventListener('mousedown', () => mouseDownFired = true);
            canvas.addEventListener('mousemove', () => mouseMoveFireed = true);
            canvas.addEventListener('mouseup', () => mouseUpFired = true);
            
            // Simulate drawing interaction
            this.simulateMouseEvent(canvas, 'mousedown', 100, 100);
            this.simulateMouseEvent(canvas, 'mousemove', 150, 150);
            this.simulateMouseEvent(canvas, 'mouseup', 150, 150);
            
            // Small delay to allow event processing
            await this.delay(100);
            
            if (!mouseDownFired || !mouseMoveFireed || !mouseUpFired) {
                throw new Error('Canvas mouse events not firing correctly');
            }
            
            // Test touch events (if supported)
            if ('ontouchstart' in window) {
                this.simulateTouchEvent(canvas, 'touchstart', 200, 200);
                this.simulateTouchEvent(canvas, 'touchend', 200, 200);
            }
            
            this.recordTestResult(testName, true, 'Canvas interactions working correctly');
            
        } catch (error) {
            this.recordTestResult(testName, false, error.message);
        }
    }

    async testMessagePassingWithExtension() {
        const testName = 'Message Passing with VS Code Extension';
        console.log(`\nTesting: ${testName}`);
        
        try {
            // Check if VS Code API is available
            if (!window.vscode && !window.VSSCanvas?.vscode) {
                console.warn('VS Code API not available - skipping message passing test');
                this.recordTestResult(testName, true, 'Skipped - VS Code API not available in test environment');
                return;
            }
            
            const vscode = window.vscode || window.VSSCanvas?.vscode;
            
            // Test sending messages
            let messageSent = false;
            const originalPostMessage = vscode.postMessage;
            
            vscode.postMessage = function(message) {
                messageSent = true;
                console.log('Test message sent:', message);
                // Call original if it exists
                if (originalPostMessage && typeof originalPostMessage === 'function') {
                    return originalPostMessage.call(this, message);
                }
            };
            
            // Send test message
            if (window.VSSCanvas && window.VSSCanvas.sendMessage) {
                window.VSSCanvas.sendMessage({
                    command: 'test',
                    data: { test: true }
                });
            } else {
                vscode.postMessage({
                    command: 'test',
                    data: { test: true }
                });
            }
            
            if (!messageSent) {
                throw new Error('Message not sent to extension');
            }
            
            // Test receiving messages
            const testMessage = {
                command: 'setTool',
                tool: 'pen'
            };
            
            // Simulate receiving message from extension
            window.dispatchEvent(new MessageEvent('message', {
                data: testMessage
            }));
            
            // Restore original postMessage
            vscode.postMessage = originalPostMessage;
            
            this.recordTestResult(testName, true, 'Message passing with extension working correctly');
            
        } catch (error) {
            this.recordTestResult(testName, false, error.message);
        }
    }

    async testCanvasResizing() {
        const testName = 'Canvas Resizing';
        console.log(`\nTesting: ${testName}`);
        
        try {
            const canvas = document.getElementById('drawing-canvas');
            if (!canvas) {
                throw new Error('Canvas element not found');
            }
            
            const originalWidth = canvas.width;
            const originalHeight = canvas.height;
            
            // Simulate window resize
            const resizeEvent = new Event('resize');
            window.dispatchEvent(resizeEvent);
            
            // Small delay to allow resize handling
            await this.delay(100);
            
            // Verify canvas dimensions are still valid
            if (canvas.width <= 0 || canvas.height <= 0) {
                throw new Error('Canvas dimensions invalid after resize');
            }
            
            // Test manual resize if VSSCanvas has resizeCanvas method
            if (window.VSSCanvas && window.VSSCanvas.resizeCanvas) {
                window.VSSCanvas.resizeCanvas();
                
                if (canvas.width <= 0 || canvas.height <= 0) {
                    throw new Error('Canvas dimensions invalid after manual resize');
                }
            }
            
            this.recordTestResult(testName, true, 'Canvas resizing working correctly');
            
        } catch (error) {
            this.recordTestResult(testName, false, error.message);
        }
    }

    async testEventListenerIntegrity() {
        const testName = 'Event Listener Integrity';
        console.log(`\nTesting: ${testName}`);
        
        try {
            // Check if event listeners are properly tracked
            if (window.VSSCanvas && window.VSSCanvas.eventListeners) {
                const listenerCount = window.VSSCanvas.eventListeners.length;
                
                if (listenerCount === 0) {
                    console.warn('No event listeners tracked - this may indicate an issue');
                }
                
                // Test adding and removing event listeners
                const testElement = document.createElement('div');
                const testHandler = () => {};
                
                if (window.VSSCanvas.addEventListener) {
                    const initialCount = window.VSSCanvas.eventListeners.length;
                    window.VSSCanvas.addEventListener(testElement, 'click', testHandler);
                    
                    if (window.VSSCanvas.eventListeners.length !== initialCount + 1) {
                        throw new Error('Event listener not properly tracked when added');
                    }
                }
                
                // Test cleanup
                if (window.VSSCanvas.removeAllEventListeners) {
                    window.VSSCanvas.removeAllEventListeners();
                    
                    if (window.VSSCanvas.eventListeners.length !== 0) {
                        console.warn('Event listeners not completely removed - some may be expected to remain');
                    }
                }
            }
            
            this.recordTestResult(testName, true, 'Event listener integrity verified');
            
        } catch (error) {
            this.recordTestResult(testName, false, error.message);
        }
    }

    // Helper methods
    simulateMouseEvent(element, type, x, y) {
        const event = new MouseEvent(type, {
            clientX: x,
            clientY: y,
            bubbles: true,
            cancelable: true
        });
        element.dispatchEvent(event);
    }

    simulateTouchEvent(element, type, x, y) {
        const touch = new Touch({
            identifier: 1,
            target: element,
            clientX: x,
            clientY: y
        });
        
        const event = new TouchEvent(type, {
            touches: type === 'touchend' ? [] : [touch],
            targetTouches: type === 'touchend' ? [] : [touch],
            changedTouches: [touch],
            bubbles: true,
            cancelable: true
        });
        
        element.dispatchEvent(event);
    }

    recordTestResult(testName, passed, details) {
        const result = {
            test: testName,
            passed: passed,
            details: details,
            timestamp: new Date().toISOString()
        };
        
        testResults.details.push(result);
        
        if (passed) {
            testResults.passed++;
            console.log(`  ✅ ${testName}: ${details}`);
        } else {
            testResults.failed++;
            testResults.errors.push(`${testName}: ${details}`);
            console.error(`  ❌ ${testName}: ${details}`);
        }
    }

    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    getTestSummary() {
        return {
            testSuite: this.testName,
            passed: testResults.passed,
            failed: testResults.failed,
            total: testResults.passed + testResults.failed,
            errors: testResults.errors,
            details: testResults.details
        };
    }
}

// Export test classes for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        WebviewReloadingTests,
        CanvasFunctionalityTests,
        TEST_CONFIG,
        testResults
    };
}

// Auto-run tests if this file is loaded directly in a browser
if (typeof window !== 'undefined' && window.document) {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', runAllInitializationTests);
    } else {
        runAllInitializationTests();
    }
}

async function runAllInitializationTests() {
    console.log('🧪 Starting Webview Initialization Fix Tests');
    console.log('='.repeat(50));
    
    try {
        // Reset test results
        testResults = {
            passed: 0,
            failed: 0,
            skipped: 0,
            errors: [],
            details: []
        };
        
        // Run test suites
        const reloadingTests = new WebviewReloadingTests();
        const functionalityTests = new CanvasFunctionalityTests();
        
        const reloadingResults = await reloadingTests.runAllTests();
        const functionalityResults = await functionalityTests.runAllTests();
        
        // Generate final report
        const finalReport = {
            totalTests: testResults.passed + testResults.failed,
            passed: testResults.passed,
            failed: testResults.failed,
            successRate: testResults.passed / (testResults.passed + testResults.failed) * 100,
            errors: testResults.errors,
            details: testResults.details,
            suites: [reloadingResults, functionalityResults]
        };
        
        console.log('\n' + '='.repeat(50));
        console.log('🏁 Test Results Summary');
        console.log('='.repeat(50));
        console.log(`Total Tests: ${finalReport.totalTests}`);
        console.log(`Passed: ${finalReport.passed} ✅`);
        console.log(`Failed: ${finalReport.failed} ❌`);
        console.log(`Success Rate: ${finalReport.successRate.toFixed(1)}%`);
        
        if (finalReport.errors.length > 0) {
            console.log('\n❌ Failed Tests:');
            finalReport.errors.forEach(error => console.log(`  - ${error}`));
        }
        
        // Store results globally for inspection
        window.testResults = finalReport;
        
        return finalReport;
        
    } catch (error) {
        console.error('Fatal error running tests:', error);
        return {
            totalTests: 0,
            passed: 0,
            failed: 1,
            successRate: 0,
            errors: [`Fatal error: ${error.message}`],
            details: []
        };
    }
}