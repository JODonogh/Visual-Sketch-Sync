import * as vscode from 'vscode';
import { WebviewPanelManager } from './webview-panel-manager';

/**
 * VS Code Extension for Visual Sketch Sync
 * Provides drawing canvas and three-way synchronization between canvas, code, and live app
 */

let drawingCanvasProvider: DrawingCanvasProvider | undefined;
let webviewPanelManager: WebviewPanelManager | undefined;

/**
 * Warning handler for experimental Node.js features and SQLite warnings
 */
class WarningHandler {
    private static instance: WarningHandler;
    private suppressedWarnings: Set<string> = new Set();
    private warningCount: number = 0;
    private readonly maxWarnings: number = 10;

    private constructor() {
        this.setupWarningHandlers();
    }

    public static getInstance(): WarningHandler {
        if (!WarningHandler.instance) {
            WarningHandler.instance = new WarningHandler();
        }
        return WarningHandler.instance;
    }

    private setupWarningHandlers(): void {
        // Handle Node.js process warnings (including experimental SQLite warnings)
        process.on('warning', (warning) => {
            this.handleNodeWarning(warning);
        });

        // Suppress specific experimental warnings that don't affect functionality
        const originalEmitWarning = process.emitWarning;
        process.emitWarning = (warning: string | Error, ...args: any[]) => {
            const warningMessage = warning instanceof Error ? warning.message : warning;
            const type = args[0];
            const code = args[1];
            
            if (this.shouldSuppressWarning(warning, type, code)) {
                return; // Suppress the warning
            }
            originalEmitWarning.call(process, warning, ...args);
        };
    }

    private shouldSuppressWarning(warning: string | Error, type?: string, code?: string): boolean {
        const warningMessage = warning instanceof Error ? warning.message : warning;
        
        // SQLite experimental warnings that are safe to suppress
        const sqliteWarnings = [
            'ExperimentalWarning: SQLite is an experimental feature',
            'ExperimentalWarning: node:sqlite is an experimental feature',
            'sqlite is an experimental feature and might change at any time'
        ];

        // Other Node.js experimental warnings that don't affect VS Code extensions
        const safeExperimentalWarnings = [
            'ExperimentalWarning: The fs.promises API is experimental',
            'ExperimentalWarning: --experimental-loader is an experimental feature',
            'ExperimentalWarning: Custom ESM Loaders is an experimental feature'
        ];

        const allSuppressedWarnings = [...sqliteWarnings, ...safeExperimentalWarnings];
        
        return allSuppressedWarnings.some(suppressedWarning => 
            warningMessage.toLowerCase().includes(suppressedWarning.toLowerCase())
        );
    }

    private handleNodeWarning(warning: Error): void {
        const warningKey = `${warning.name}:${warning.message}`;
        
        // Avoid duplicate warnings
        if (this.suppressedWarnings.has(warningKey)) {
            return;
        }

        this.suppressedWarnings.add(warningKey);
        this.warningCount++;

        // Log warning for debugging but don't show to user unless critical
        console.log(`VSS Warning Handler: ${warning.name} - ${warning.message}`);

        // Only show user notification for critical warnings or first few warnings
        if (this.warningCount <= 3 && !this.shouldSuppressWarning(warning.message)) {
            this.showUserFriendlyWarning(warning);
        }
    }

    private showUserFriendlyWarning(warning: Error): void {
        const isSQLiteWarning = warning.message.toLowerCase().includes('sqlite');
        
        if (isSQLiteWarning) {
            // SQLite-specific user message
            vscode.window.showWarningMessage(
                'Visual Sketch Sync: SQLite experimental features detected. This won\'t affect extension functionality.',
                'Learn More',
                'Don\'t Show Again'
            ).then(selection => {
                if (selection === 'Learn More') {
                    vscode.env.openExternal(vscode.Uri.parse('https://nodejs.org/api/sqlite.html'));
                } else if (selection === 'Don\'t Show Again') {
                    // Add to permanent suppression list
                    this.suppressedWarnings.add('sqlite-user-notification');
                }
            });
        } else {
            // Generic experimental warning message
            vscode.window.showWarningMessage(
                `Visual Sketch Sync: Node.js experimental feature warning detected (${warning.name}). Extension functionality is not affected.`,
                'Dismiss'
            );
        }
    }

    public getSuppressedWarningCount(): number {
        return this.suppressedWarnings.size;
    }

    public getWarningStats(): { total: number, suppressed: number } {
        return {
            total: this.warningCount,
            suppressed: this.suppressedWarnings.size
        };
    }
}

export function activate(context: vscode.ExtensionContext) {
    const logger = VSSLogger.getInstance();
    logger.info('Visual Sketch Sync extension activation started', { 
        vscodeVersion: vscode.version,
        nodeVersion: process.version,
        platform: process.platform
    });

    try {
        // Initialize warning handler for SQLite and other experimental warnings
        const warningHandler = WarningHandler.getInstance();
        logger.info('Warning handler initialized');

        // Validate extension environment
        validateExtensionEnvironment(logger);

        // Initialize WebviewPanelManager for drawing canvas
        webviewPanelManager = WebviewPanelManager.getInstance(context.extensionUri, logger);
        logger.info('WebviewPanelManager initialized');

        // Register all VSS commands with comprehensive error handling
        registerCommands(context);
        logger.info('Commands registered successfully');

        // Register webview provider for drawing canvas with error handling
        drawingCanvasProvider = new DrawingCanvasProvider(context.extensionUri);
        
        const webviewRegistration = vscode.window.registerWebviewViewProvider(
            'vss.drawingCanvas', 
            drawingCanvasProvider,
            {
                webviewOptions: {
                    retainContextWhenHidden: true
                }
            }
        );
        
        context.subscriptions.push(webviewRegistration);
        logger.info('Webview provider registered successfully');

        // Add enhanced diagnostic command for troubleshooting
        const diagnosticCommand = vscode.commands.registerCommand('vss.showDiagnostics', () => {
            showEnhancedDiagnostics(warningHandler, logger);
        });

        // Add log export command
        const exportLogsCommand = vscode.commands.registerCommand('vss.exportLogs', async () => {
            await exportDiagnosticLogs(logger);
        });

        context.subscriptions.push(diagnosticCommand, exportLogsCommand);

        // Set up periodic health checks
        const healthCheckInterval = setInterval(() => {
            performHealthCheck(logger);
        }, 300000); // Every 5 minutes

        // Set up configuration watcher for fallback options
        const configWatcher = vscode.workspace.onDidChangeConfiguration(event => {
            if (event.affectsConfiguration('vss.webview') && webviewPanelManager) {
                logger.info('Webview configuration changed, updating fallback options');
                
                const config = vscode.workspace.getConfiguration('vss');
                const newOptions = {
                    enableSidebarFallback: config.get<boolean>('webview.enableSidebarFallback', true),
                    showFallbackMessage: config.get<boolean>('webview.showFallbackMessage', true),
                    preferredDisplayMethod: config.get<string>('webview.preferredDisplayMethod', 'panel') === 'sidebar' 
                        ? 'sidebar' as any
                        : 'panel' as any
                };
                
                webviewPanelManager.updateFallbackOptions(newOptions);
            }
        });

        // Clean up interval and watchers on deactivation
        context.subscriptions.push(
            { dispose: () => clearInterval(healthCheckInterval) },
            configWatcher
        );

        // Show success message with diagnostic option
        vscode.window.showInformationMessage(
            'Visual Sketch Sync extension activated successfully!',
            'Show Diagnostics',
            'Export Logs'
        ).then(selection => {
            if (selection === 'Show Diagnostics') {
                vscode.commands.executeCommand('vss.showDiagnostics');
            } else if (selection === 'Export Logs') {
                vscode.commands.executeCommand('vss.exportLogs');
            }
        });

        logger.info('Extension activation completed successfully');

    } catch (error) {
        logger.error('Failed to activate Visual Sketch Sync extension', { 
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined
        });
        
        // Provide detailed error information to user
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : 'No stack trace available';
        
        vscode.window.showErrorMessage(
            `Failed to activate Visual Sketch Sync: ${errorMessage}`,
            'Show Details',
            'Export Logs',
            'Report Issue'
        ).then(selection => {
            if (selection === 'Show Details') {
                vscode.window.showErrorMessage('VSS Activation Error', {
                    modal: true,
                    detail: `Error: ${errorMessage}\n\nStack Trace:\n${errorStack}\n\nFor more details, use 'VSS: Export Logs' command.`
                });
            } else if (selection === 'Export Logs') {
                vscode.commands.executeCommand('vss.exportLogs');
            } else if (selection === 'Report Issue') {
                const issueUrl = `https://github.com/JODonogh/Visual-Sketch-Sync/issues/new?title=Activation%20Error&body=${encodeURIComponent(`Activation Error: ${errorMessage}\n\nStack Trace:\n${errorStack}`)}`;
                vscode.env.openExternal(vscode.Uri.parse(issueUrl));
            }
        });

        // Re-throw to ensure VS Code knows activation failed
        throw error;
    }
}

/**
 * Validates the extension environment and logs any issues
 */
function validateExtensionEnvironment(logger: VSSLogger): void {
    try {
        // Check Node.js version
        const nodeVersion = process.version;
        const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
        if (majorVersion < 16) {
            logger.warn('Node.js version is outdated', { version: nodeVersion, recommended: '16+' });
        }

        // Check available memory
        const memoryUsage = process.memoryUsage();
        const rssMemoryMB = memoryUsage.rss / 1024 / 1024;
        if (rssMemoryMB > 500) { // More than 500MB
            logger.warn('High memory usage detected', { memoryUsageMB: rssMemoryMB });
        }

        // Check workspace
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            logger.warn('No workspace folder detected');
        } else {
            logger.info('Workspace detected', { path: workspaceFolder.uri.fsPath });
        }

        logger.info('Environment validation completed');

    } catch (error) {
        logger.error('Environment validation failed', { error });
    }
}

/**
 * Shows enhanced diagnostics with detailed system information
 */
function showEnhancedDiagnostics(warningHandler: WarningHandler, logger: VSSLogger): void {
    const stats = warningHandler.getWarningStats();
    const logs = logger.getLogs();
    const errorLogs = logger.getLogs('error');
    const warnLogs = logger.getLogs('warn');
    
    // Get webview panel manager stats if available
    const panelStats = webviewPanelManager ? webviewPanelManager.getPanelStats() : null;
    const fallbackOptions = webviewPanelManager ? webviewPanelManager.getFallbackOptions() : null;
    
    const diagnosticInfo = [
        `Visual Sketch Sync Diagnostics:`,
        ``,
        `Extension Status:`,
        `- Status: Active`,
        `- Webview Provider: ${drawingCanvasProvider ? 'Registered' : 'Not Registered'}`,
        `- Panel Manager: ${webviewPanelManager ? 'Initialized' : 'Not Initialized'}`,
        `- Warning Handler: Active`,
        ``,
        ...(panelStats ? [
            `Webview Panel Status:`,
            `- Display Method: ${panelStats.displayMethod}`,
            `- Panel Exists: ${panelStats.exists}`,
            `- Panel Visible: ${panelStats.visible}`,
            `- Panel Active: ${panelStats.active}`,
            `- Canvas Ready: ${panelStats.ready}`,
            `- Dispose Count: ${panelStats.disposeCount}`,
            `- Uptime: ${panelStats.uptime ? Math.round(panelStats.uptime / 1000) + 's' : 'N/A'}`,
            ``,
            `Fallback Configuration:`,
            `- Sidebar Fallback: ${fallbackOptions?.enableSidebarFallback ? 'Enabled' : 'Disabled'}`,
            `- Fallback Messages: ${fallbackOptions?.showFallbackMessage ? 'Enabled' : 'Disabled'}`,
            `- Preferred Method: ${fallbackOptions?.preferredDisplayMethod || 'N/A'}`,
            ``
        ] : []),
        `System Information:`,
        `- Node.js Version: ${process.version}`,
        `- VS Code Version: ${vscode.version}`,
        `- Platform: ${process.platform}`,
        `- Architecture: ${process.arch}`,
        ``,
        `Warning Statistics:`,
        `- Total Warnings: ${stats.total}`,
        `- Suppressed Warnings: ${stats.suppressed}`,
        ``,
        `Log Statistics:`,
        `- Total Log Entries: ${logs.length}`,
        `- Error Entries: ${errorLogs.length}`,
        `- Warning Entries: ${warnLogs.length}`,
        ``,
        `Memory Usage:`,
        `- RSS: ${(process.memoryUsage().rss / 1024 / 1024).toFixed(2)} MB`,
        `- Heap Used: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`,
        `- Heap Total: ${(process.memoryUsage().heapTotal / 1024 / 1024).toFixed(2)} MB`
    ].join('\n');

    vscode.window.showInformationMessage('VSS Diagnostics', { modal: true, detail: diagnosticInfo });
}

/**
 * Exports diagnostic logs to a file
 */
async function exportDiagnosticLogs(logger: VSSLogger): Promise<void> {
    try {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            vscode.window.showErrorMessage('No workspace folder open. Cannot export logs.');
            return;
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const logFileName = `vss-diagnostic-logs-${timestamp}.txt`;
        const logFilePath = vscode.Uri.joinPath(workspaceFolder.uri, logFileName);

        const logContent = [
            `Visual Sketch Sync Diagnostic Logs`,
            `Generated: ${new Date().toISOString()}`,
            `Node.js Version: ${process.version}`,
            `VS Code Version: ${vscode.version}`,
            `Platform: ${process.platform}`,
            ``,
            `=== LOGS ===`,
            logger.exportLogs()
        ].join('\n');

        await vscode.workspace.fs.writeFile(logFilePath, Buffer.from(logContent, 'utf8'));
        
        vscode.window.showInformationMessage(
            `Diagnostic logs exported to ${logFileName}`,
            'Open File'
        ).then(selection => {
            if (selection === 'Open File') {
                vscode.window.showTextDocument(logFilePath);
            }
        });

        logger.info('Diagnostic logs exported', { filePath: logFilePath.fsPath });

    } catch (error) {
        logger.error('Failed to export diagnostic logs', { error });
        vscode.window.showErrorMessage(`Failed to export logs: ${error}`);
    }
}

/**
 * Performs periodic health checks
 */
function performHealthCheck(logger: VSSLogger): void {
    try {
        const memoryUsage = process.memoryUsage();
        const heapUsedMB = memoryUsage.heapUsed / 1024 / 1024;
        
        if (heapUsedMB > 200) { // More than 200MB heap usage
            logger.warn('High heap memory usage detected', { heapUsedMB: heapUsedMB.toFixed(2) });
        }

        // Check if webview provider is still registered
        if (!drawingCanvasProvider) {
            logger.warn('Webview provider is no longer available');
        }

        logger.debug('Health check completed', { heapUsedMB: heapUsedMB.toFixed(2) });

    } catch (error) {
        logger.error('Health check failed', { error });
    }
}

export function deactivate() {
    console.log('Visual Sketch Sync extension is now deactivated');
    
    try {
        // Clean up warning handler
        const warningHandler = WarningHandler.getInstance();
        const stats = warningHandler.getWarningStats();
        console.log(`VSS: Deactivating - handled ${stats.total} warnings, suppressed ${stats.suppressed}`);

        // Clean up webview provider
        if (drawingCanvasProvider) {
            console.log('VSS: Cleaning up webview provider');
            drawingCanvasProvider = undefined;
        }

        // Clean up webview panel manager
        if (webviewPanelManager) {
            console.log('VSS: Cleaning up webview panel manager');
            webviewPanelManager.dispose();
            webviewPanelManager = undefined;
        }

        // Log successful deactivation
        console.log('VSS: Extension deactivated successfully');

    } catch (error) {
        console.error('VSS: Error during deactivation:', error);
        // Don't throw error during deactivation to avoid VS Code issues
    }
}

/**
 * Logging utility for consistent error reporting and diagnostics
 */
class VSSLogger {
    private static instance: VSSLogger;
    private logs: Array<{ timestamp: Date, level: string, message: string, context?: any }> = [];
    private readonly maxLogs = 1000;

    private constructor() {}

    public static getInstance(): VSSLogger {
        if (!VSSLogger.instance) {
            VSSLogger.instance = new VSSLogger();
        }
        return VSSLogger.instance;
    }

    public log(level: 'info' | 'warn' | 'error' | 'debug', message: string, context?: any): void {
        const logEntry = {
            timestamp: new Date(),
            level,
            message,
            context
        };

        this.logs.push(logEntry);

        // Keep only the most recent logs
        if (this.logs.length > this.maxLogs) {
            this.logs = this.logs.slice(-this.maxLogs);
        }

        // Console output with consistent formatting
        const timestamp = logEntry.timestamp.toISOString();
        const contextStr = context ? ` | Context: ${JSON.stringify(context)}` : '';
        console.log(`[${timestamp}] VSS ${level.toUpperCase()}: ${message}${contextStr}`);
    }

    public info(message: string, context?: any): void {
        this.log('info', message, context);
    }

    public warn(message: string, context?: any): void {
        this.log('warn', message, context);
    }

    public error(message: string, context?: any): void {
        this.log('error', message, context);
    }

    public debug(message: string, context?: any): void {
        this.log('debug', message, context);
    }

    public getLogs(level?: string): Array<{ timestamp: Date, level: string, message: string, context?: any }> {
        if (level) {
            return this.logs.filter(log => log.level === level);
        }
        return [...this.logs];
    }

    public exportLogs(): string {
        return this.logs.map(log => {
            const contextStr = log.context ? ` | ${JSON.stringify(log.context)}` : '';
            return `[${log.timestamp.toISOString()}] ${log.level.toUpperCase()}: ${log.message}${contextStr}`;
        }).join('\n');
    }

    public clearLogs(): void {
        this.logs = [];
    }
}

function registerCommands(context: vscode.ExtensionContext) {
    const logger = VSSLogger.getInstance();
    
    // Enhanced command wrapper with comprehensive error handling and logging
    const createCommandHandler = (commandName: string, handler: () => void | Promise<void>) => {
        return vscode.commands.registerCommand(commandName, async () => {
            const startTime = Date.now();
            logger.info(`Executing command: ${commandName}`);
            
            try {
                await handler();
                const duration = Date.now() - startTime;
                logger.info(`Command completed successfully: ${commandName}`, { durationMs: duration });
            } catch (error) {
                const duration = Date.now() - startTime;
                const errorMessage = error instanceof Error ? error.message : String(error);
                const errorStack = error instanceof Error ? error.stack : undefined;
                
                logger.error(`Command failed: ${commandName}`, { 
                    error: errorMessage, 
                    stack: errorStack,
                    durationMs: duration 
                });
                
                const userFriendlyMessage = getUserFriendlyErrorMessage(commandName, errorMessage);
                
                vscode.window.showErrorMessage(
                    userFriendlyMessage,
                    'Retry',
                    'Show Details',
                    'Export Logs',
                    'Report Issue'
                ).then(selection => {
                    if (selection === 'Retry') {
                        logger.info(`User requested retry for command: ${commandName}`);
                        vscode.commands.executeCommand(commandName);
                    } else if (selection === 'Show Details') {
                        vscode.window.showErrorMessage(`${commandName} Error Details`, {
                            modal: true,
                            detail: `Command: ${commandName}\nError: ${errorMessage}\nDuration: ${duration}ms\n\nStack Trace:\n${errorStack || 'Not available'}\n\nFor more details, use 'VSS: Export Logs' command.`
                        });
                    } else if (selection === 'Export Logs') {
                        vscode.commands.executeCommand('vss.exportLogs');
                    } else if (selection === 'Report Issue') {
                        const issueUrl = `https://github.com/JODonogh/Visual-Sketch-Sync/issues/new?title=Command%20Error:%20${encodeURIComponent(commandName)}&body=${encodeURIComponent(`Command: ${commandName}\nError: ${errorMessage}\nDuration: ${duration}ms\nStack Trace:\n${errorStack || 'Not available'}`)}`;
                        vscode.env.openExternal(vscode.Uri.parse(issueUrl));
                    }
                });
            }
        });
    };

    // Helper function to provide user-friendly error messages
    const getUserFriendlyErrorMessage = (commandName: string, errorMessage: string): string => {
        const commandMessages: { [key: string]: string } = {
            'vss.openDrawingCanvas': 'Failed to open the drawing canvas. Please ensure the extension is properly installed.',
            'vss.startSyncServer': 'Failed to start the sync server. Check if the port is available.',
            'vss.stopSyncServer': 'Failed to stop the sync server. It may not be running.',
            'vss.exportDesign': 'Failed to export design. Check file permissions and available disk space.',
            'vss.chooseDisplayMethod': 'Failed to change display method. Please try again or restart VS Code.',
        };

        const userMessage = commandMessages[commandName] || `Failed to execute ${commandName}`;
        return `${userMessage} (${errorMessage})`;
    };

    // Helper function to show fallback-specific error messages
    const showFallbackErrorMessage = (error: any): void => {
        const errorMessage = error instanceof Error ? error.message : String(error);
        
        if (errorMessage.includes('Panel creation failed') && errorMessage.includes('Sidebar fallback failed')) {
            vscode.window.showErrorMessage(
                'Unable to open Drawing Canvas in any display method',
                'Try Panel Only',
                'Try Sidebar Only',
                'Show Diagnostics',
                'Report Issue'
            ).then(selection => {
                if (selection === 'Try Panel Only') {
                    webviewPanelManager?.updateFallbackOptions({ enableSidebarFallback: false });
                    vscode.commands.executeCommand('vss.openDrawingCanvas');
                } else if (selection === 'Try Sidebar Only') {
                    webviewPanelManager?.updateFallbackOptions({ preferredDisplayMethod: 'sidebar' as any });
                    vscode.commands.executeCommand('vss.openDrawingCanvas');
                } else if (selection === 'Show Diagnostics') {
                    vscode.commands.executeCommand('vss.showDiagnostics');
                } else if (selection === 'Report Issue') {
                    const issueUrl = `https://github.com/JODonogh/Visual-Sketch-Sync/issues/new?title=Webview%20Display%20Error&body=${encodeURIComponent(`Error: ${errorMessage}\n\nBoth panel and sidebar display methods failed.`)}`;
                    vscode.env.openExternal(vscode.Uri.parse(issueUrl));
                }
            });
        } else {
            // Standard error handling for other cases
            vscode.window.showErrorMessage(
                `Drawing Canvas Error: ${errorMessage}`,
                'Retry',
                'Choose Display Method',
                'Show Diagnostics'
            ).then(selection => {
                if (selection === 'Retry') {
                    vscode.commands.executeCommand('vss.openDrawingCanvas');
                } else if (selection === 'Choose Display Method') {
                    vscode.commands.executeCommand('vss.chooseDisplayMethod');
                } else if (selection === 'Show Diagnostics') {
                    vscode.commands.executeCommand('vss.showDiagnostics');
                }
            });
        }
    };

    // Register vss.openDrawingCanvas command with enhanced error handling
    const openDrawingCanvasCommand = createCommandHandler('vss.openDrawingCanvas', async () => {
        // Validate webview panel manager exists
        if (!webviewPanelManager) {
            throw new Error('Webview panel manager not initialized. Please restart VS Code.');
        }

        try {
            // Use WebviewPanelManager to show the drawing canvas with fallback support
            await webviewPanelManager.showDrawingCanvas();
            
            // Get display method for appropriate success message
            const displayMethod = webviewPanelManager.getCurrentDisplayMethod();
            const methodName = displayMethod === 'panel' ? 'panel' : 'sidebar';
            vscode.window.showInformationMessage(`Drawing Canvas opened successfully in ${methodName}!`);
            
        } catch (error) {
            logger.error('All webview display methods failed', { error });
            
            // Use specialized fallback error handling
            showFallbackErrorMessage(error);
            
            // Still throw the error for the command handler's error handling
            throw error;
        }
    });

    // Register vss.startSyncServer command with enhanced error handling
    const startSyncServerCommand = createCommandHandler('vss.startSyncServer', async () => {
        // Check if sync server is already running
        const config = vscode.workspace.getConfiguration('vss');
        const syncPort = config.get<number>('sync.port', 3001);
        
        vscode.window.showInformationMessage(`Sync Server starting on port ${syncPort}... (Feature coming soon)`);
        // TODO: Implement sync server startup with port validation
    });

    // Register vss.stopSyncServer command with enhanced error handling
    const stopSyncServerCommand = createCommandHandler('vss.stopSyncServer', async () => {
        vscode.window.showInformationMessage('Sync Server stopping... (Feature coming soon)');
        // TODO: Implement sync server shutdown with graceful cleanup
    });

    // Register vss.exportDesign command with enhanced error handling
    const exportDesignCommand = createCommandHandler('vss.exportDesign', async () => {
        // Validate workspace and design data before export
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            throw new Error('No workspace folder open. Please open a project folder first.');
        }

        vscode.window.showInformationMessage('Design export starting... (Feature coming soon)');
        // TODO: Implement design export functionality with file validation
    });

    // Register additional commands from package.json with enhanced error handling
    const startLiveServerCommand = createCommandHandler('vss.startLiveServer', async () => {
        const config = vscode.workspace.getConfiguration('vss');
        const autoStart = config.get<boolean>('liveServer.autoStart', false);
        
        vscode.window.showInformationMessage(`Live Server integration starting (auto-start: ${autoStart})... (Feature coming soon)`);
    });

    const debugChromeCommand = createCommandHandler('vss.debugChrome', async () => {
        const config = vscode.workspace.getConfiguration('vss');
        const debugPort = config.get<number>('chrome.debugPort', 9222);
        
        vscode.window.showInformationMessage(`Chrome debugging starting on port ${debugPort}... (Feature coming soon)`);
    });

    const captureDOMTreeCommand = createCommandHandler('vss.captureDOMTree', async () => {
        vscode.window.showInformationMessage('DOM Tree capture starting... (Feature coming soon)');
    });

    const captureStylesheetsCommand = createCommandHandler('vss.captureStylesheets', async () => {
        vscode.window.showInformationMessage('Stylesheet capture starting... (Feature coming soon)');
    });

    const runIntegrationTestsCommand = createCommandHandler('vss.runIntegrationTests', async () => {
        vscode.window.showInformationMessage('Integration tests starting... (Feature coming soon)');
    });

    const runDiagnosticsCommand = createCommandHandler('vss.runDiagnostics', async () => {
        // This will run the actual diagnostics script
        const terminal = vscode.window.createTerminal('VSS Diagnostics');
        terminal.sendText('npm run diagnostics');
        terminal.show();
        vscode.window.showInformationMessage('System diagnostics started in terminal');
    });

    const runRecoveryCommand = createCommandHandler('vss.runRecovery', async () => {
        const result = await vscode.window.showWarningMessage(
            'This will run the VSS recovery tool to fix common issues. Continue?',
            'Yes, Run Recovery',
            'Cancel'
        );
        
        if (result === 'Yes, Run Recovery') {
            const terminal = vscode.window.createTerminal('VSS Recovery');
            terminal.sendText('npm run recovery');
            terminal.show();
            vscode.window.showInformationMessage('Recovery tool started in terminal');
        }
    });

    const clearCanvasHistoryCommand = createCommandHandler('vss.clearCanvasHistory', async () => {
        const result = await vscode.window.showWarningMessage(
            'This will clear all canvas drawing history. This action cannot be undone. Continue?',
            'Yes, Clear History',
            'Cancel'
        );
        
        if (result === 'Yes, Clear History') {
            vscode.window.showInformationMessage('Canvas history cleared... (Feature coming soon)');
            // TODO: Implement canvas history clearing
        }
    });

    const exportErrorLogsCommand = createCommandHandler('vss.exportErrorLogs', async () => {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            throw new Error('No workspace folder open. Please open a project folder first.');
        }
        
        vscode.window.showInformationMessage('Error logs export starting... (Feature coming soon)');
        // TODO: Implement error log export functionality
    });

    // Register command to choose display method for drawing canvas
    const chooseDisplayMethodCommand = createCommandHandler('vss.chooseDisplayMethod', async () => {
        if (!webviewPanelManager) {
            throw new Error('Webview panel manager not initialized. Please restart VS Code.');
        }

        await webviewPanelManager.showDisplayMethodChoice();
    });

    // Add all commands to context subscriptions for proper cleanup
    context.subscriptions.push(
        openDrawingCanvasCommand,
        startSyncServerCommand,
        stopSyncServerCommand,
        exportDesignCommand,
        startLiveServerCommand,
        debugChromeCommand,
        captureDOMTreeCommand,
        captureStylesheetsCommand,
        runIntegrationTestsCommand,
        runDiagnosticsCommand,
        runRecoveryCommand,
        clearCanvasHistoryCommand,
        exportErrorLogsCommand,
        chooseDisplayMethodCommand
    );

    console.log('All VSS commands registered successfully');
}

/**
 * Webview provider for the drawing canvas
 */
class DrawingCanvasProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'vss.drawingCanvas';
    private logger: VSSLogger;

    constructor(private readonly _extensionUri: vscode.Uri) {
        this.logger = VSSLogger.getInstance();
        this.logger.info('DrawingCanvasProvider initialized');
    }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        try {
            this.logger.info('Resolving webview view');

            webviewView.webview.options = {
                // Allow scripts in the webview
                enableScripts: true,
                localResourceRoots: [
                    this._extensionUri
                ]
            };

            // Set up webview HTML with error handling
            try {
                webviewView.webview.html = this.getHtmlForWebview(webviewView.webview);
                this.logger.info('Webview HTML loaded successfully');
            } catch (htmlError) {
                this.logger.error('Failed to load webview HTML', { error: htmlError });
                webviewView.webview.html = this.getErrorHtml('Failed to load canvas interface');
            }

            // Handle messages from the webview with comprehensive error handling
            webviewView.webview.onDidReceiveMessage(
                message => {
                    try {
                        this.handleWebviewMessage(message, webviewView);
                    } catch (messageError) {
                        this.logger.error('Error handling webview message', { 
                            error: messageError,
                            messageCommand: message?.command,
                            messageData: message?.data
                        });
                        
                        vscode.window.showErrorMessage(
                            `Canvas communication error: ${messageError}`,
                            'Show Details',
                            'Export Logs'
                        ).then(selection => {
                            if (selection === 'Show Details') {
                                vscode.window.showErrorMessage('Webview Communication Error', {
                                    modal: true,
                                    detail: `Error: ${messageError}\nMessage Command: ${message?.command}\nMessage Data: ${JSON.stringify(message?.data, null, 2)}`
                                });
                            } else if (selection === 'Export Logs') {
                                vscode.commands.executeCommand('vss.exportLogs');
                            }
                        });
                        
                        // Send error back to webview
                        webviewView.webview.postMessage({
                            command: 'error',
                            data: { 
                                message: 'Extension communication error',
                                details: messageError instanceof Error ? messageError.message : String(messageError)
                            }
                        });
                    }
                },
                undefined,
                []
            );

            // Set up webview lifecycle handlers
            webviewView.onDidChangeVisibility(() => {
                if (webviewView.visible) {
                    this.logger.info('Webview became visible');
                    // Send refresh signal to webview
                    webviewView.webview.postMessage({
                        command: 'refresh',
                        data: { timestamp: Date.now() }
                    });
                } else {
                    this.logger.info('Webview became hidden');
                }
            });

            this.logger.info('Webview view resolved successfully');

        } catch (error) {
            this.logger.error('Failed to resolve webview view', { error });
            vscode.window.showErrorMessage(
                `Failed to initialize drawing canvas: ${error}`,
                'Show Details',
                'Export Logs'
            ).then(selection => {
                if (selection === 'Show Details') {
                    vscode.window.showErrorMessage('Webview Initialization Error', {
                        modal: true,
                        detail: `Error: ${error}\n\nThis error occurred while setting up the drawing canvas webview.`
                    });
                } else if (selection === 'Export Logs') {
                    vscode.commands.executeCommand('vss.exportLogs');
                }
            });
            
            // Set error HTML as fallback
            webviewView.webview.html = this.getErrorHtml('Failed to initialize canvas');
        }
    }

    private handleWebviewMessage(message: any, webviewView: vscode.WebviewView): void {
        this.logger.debug(`Received webview message: ${message.command}`, { 
            command: message.command,
            hasData: !!message.data
        });

        switch (message.command) {
            case 'canvasReady':
                this.logger.info('Canvas ready', { data: message.data });
                vscode.window.showInformationMessage('Drawing canvas is ready!');
                
                // Send connection status and configuration to webview
                webviewView.webview.postMessage({
                    command: 'connectionStatus',
                    connected: true,
                    config: this.getCanvasConfig()
                });
                break;

            case 'drawingStarted':
                this.logger.debug('Drawing started', { data: message.data });
                // TODO: Handle drawing start for sync
                break;

            case 'drawing':
                this.logger.debug('Drawing event received');
                // TODO: Handle drawing events for sync
                break;

            case 'drawingEnded':
                this.logger.debug('Drawing ended', { data: message.data });
                // TODO: Handle drawing end for sync
                break;

            case 'toolChanged':
                this.logger.info('Tool changed', { data: message.data });
                // TODO: Handle tool changes
                break;

            case 'canvasCleared':
                this.logger.info('Canvas cleared');
                vscode.window.showInformationMessage('Canvas cleared');
                break;

            case 'error':
                const errorMsg = message.data?.message || message.data || 'Unknown canvas error';
                this.logger.error('Canvas error received', { 
                    error: errorMsg,
                    context: message.data
                });
                
                vscode.window.showErrorMessage(
                    `Canvas error: ${errorMsg}`, 
                    'Show Details',
                    'Export Logs'
                ).then(selection => {
                    if (selection === 'Show Details') {
                        vscode.window.showErrorMessage('Canvas Error Details', {
                            modal: true,
                            detail: `Error: ${errorMsg}\n\nContext: ${JSON.stringify(message.data, null, 2)}\n\nFor more details, use 'VSS: Export Logs' command.`
                        });
                    } else if (selection === 'Export Logs') {
                        vscode.commands.executeCommand('vss.exportLogs');
                    }
                });
                break;

            case 'requestConfig':
                this.logger.debug('Config requested by webview');
                // Send current configuration to webview
                webviewView.webview.postMessage({
                    command: 'config',
                    data: this.getCanvasConfig()
                });
                break;

            default:
                this.logger.warn('Unknown message from webview', { 
                    command: message.command,
                    data: message.data
                });
                // Don't show error for unknown messages, just log them
        }
    }

    private getCanvasConfig(): any {
        const config = vscode.workspace.getConfiguration('vss');
        return {
            canvas: {
                width: config.get<number>('canvas.width', 1920),
                height: config.get<number>('canvas.height', 1080)
            },
            tablet: {
                pressureSensitivity: config.get<boolean>('tablet.pressureSensitivity', true)
            },
            sync: {
                autoStart: config.get<boolean>('sync.autoStart', true),
                port: config.get<number>('sync.port', 3001)
            }
        };
    }

    private getHtmlForWebview(webview: vscode.Webview): string {
        try {
            // Get path to HTML file
            const fs = require('fs');
            const path = require('path');
            const htmlFilePath = path.join(this._extensionUri.fsPath, 'webview', 'index.html');
            
            this.logger.debug(`Looking for webview HTML at: ${htmlFilePath}`);
            
            if (fs.existsSync(htmlFilePath)) {
                this.logger.info('Loading webview HTML from file');
                const htmlContent = fs.readFileSync(htmlFilePath, 'utf8');
                
                // Validate HTML content
                if (!htmlContent || htmlContent.trim().length === 0) {
                    throw new Error('HTML file is empty');
                }
                
                this.logger.debug('HTML content loaded successfully', { 
                    contentLength: htmlContent.length 
                });
                
                // Process HTML to add security and error handling
                return this.processHtmlContent(htmlContent, webview);
            } else {
                this.logger.warn('HTML file not found, using fallback', { path: htmlFilePath });
                return this.getFallbackHtml();
            }
        } catch (error) {
            this.logger.error('Error loading webview HTML', { 
                error,
                extensionPath: this._extensionUri.fsPath
            });
            return this.getErrorHtml(`Failed to load HTML: ${error}`);
        }
    }

    private processHtmlContent(htmlContent: string, webview: vscode.Webview): string {
        try {
            this.logger.debug('Processing HTML content for error handling');
            
            // Add comprehensive error handling script to the HTML
            const errorHandlingScript = `
                <script>
                    // Global error handler
                    window.addEventListener('error', function(event) {
                        console.error('Canvas error:', event.error);
                        if (window.vscode) {
                            window.vscode.postMessage({
                                command: 'error',
                                data: {
                                    message: event.error?.message || 'Unknown error',
                                    filename: event.filename,
                                    lineno: event.lineno,
                                    colno: event.colno,
                                    stack: event.error?.stack,
                                    type: 'javascript-error'
                                }
                            });
                        }
                    });

                    // Unhandled promise rejection handler
                    window.addEventListener('unhandledrejection', function(event) {
                        console.error('Unhandled promise rejection:', event.reason);
                        if (window.vscode) {
                            window.vscode.postMessage({
                                command: 'error',
                                data: {
                                    message: 'Unhandled promise rejection: ' + (event.reason?.message || event.reason),
                                    type: 'promise-rejection',
                                    reason: event.reason
                                }
                            });
                        }
                    });

                    // Canvas-specific error handling
                    window.addEventListener('DOMContentLoaded', function() {
                        const canvas = document.getElementById('drawing-canvas');
                        if (canvas) {
                            canvas.addEventListener('error', function(event) {
                                if (window.vscode) {
                                    window.vscode.postMessage({
                                        command: 'error',
                                        data: {
                                            message: 'Canvas element error',
                                            type: 'canvas-error',
                                            event: event
                                        }
                                    });
                                }
                            });
                        }

                        // Send ready signal
                        if (window.vscode) {
                            window.vscode.postMessage({
                                command: 'canvasReady',
                                data: {
                                    timestamp: Date.now(),
                                    userAgent: navigator.userAgent,
                                    canvasSupported: !!document.createElement('canvas').getContext
                                }
                            });
                        }
                    });
                </script>
            `;

            // Insert error handling script before closing head tag
            if (htmlContent.includes('</head>')) {
                const processedContent = htmlContent.replace('</head>', errorHandlingScript + '</head>');
                this.logger.debug('HTML content processed successfully');
                return processedContent;
            } else {
                // If no head tag, add script at the beginning
                this.logger.debug('No head tag found, adding script at beginning');
                return errorHandlingScript + htmlContent;
            }
        } catch (error) {
            this.logger.error('Error processing HTML content', { error });
            return htmlContent; // Return original content if processing fails
        }
    }

    private getErrorHtml(errorMessage: string): string {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>VSS Canvas Error</title>
    <style>
        body {
            margin: 0;
            padding: 20px;
            font-family: var(--vscode-font-family);
            background-color: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
        }
        .error-container {
            background-color: var(--vscode-inputValidation-errorBackground);
            border: 1px solid var(--vscode-inputValidation-errorBorder);
            color: var(--vscode-inputValidation-errorForeground);
            padding: 20px;
            border-radius: 4px;
            text-align: center;
        }
        .error-title {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 10px;
        }
        .error-message {
            margin-bottom: 15px;
        }
        .retry-button {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            margin: 5px;
        }
        .retry-button:hover {
            background-color: var(--vscode-button-hoverBackground);
        }
    </style>
</head>
<body>
    <div class="error-container">
        <div class="error-title">Canvas Loading Error</div>
        <div class="error-message">${errorMessage}</div>
        <button class="retry-button" onclick="retryLoad()">Retry</button>
        <button class="retry-button" onclick="reportIssue()">Report Issue</button>
    </div>
    <script>
        const vscode = acquireVsCodeApi();
        
        function retryLoad() {
            vscode.postMessage({
                command: 'error',
                data: { message: 'User requested retry', action: 'retry' }
            });
        }
        
        function reportIssue() {
            vscode.postMessage({
                command: 'error',
                data: { message: 'User requested issue report', action: 'report' }
            });
        }

        // Send initial error notification
        vscode.postMessage({
            command: 'error',
            data: { message: '${errorMessage}', type: 'html-load-error' }
        });
    </script>
</body>
</html>`;
    }

    private getFallbackHtml(): string {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>VSS Drawing Canvas</title>
    <style>
        body {
            margin: 0;
            padding: 20px;
            font-family: var(--vscode-font-family);
            background-color: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
        }
        .error {
            background-color: var(--vscode-inputValidation-errorBackground);
            border: 1px solid var(--vscode-inputValidation-errorBorder);
            color: var(--vscode-inputValidation-errorForeground);
            padding: 10px;
            border-radius: 4px;
        }
    </style>
</head>
<body>
    <div class="error">
        <h3>Canvas Loading Error</h3>
        <p>Could not load the drawing canvas HTML file. Please check that webview/index.html exists.</p>
    </div>
    <script>
        const vscode = acquireVsCodeApi();
        vscode.postMessage({
            command: 'error',
            data: { message: 'Failed to load webview HTML file' }
        });
    </script>
</body>
</html>`;
    }
}