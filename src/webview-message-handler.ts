import * as vscode from 'vscode';

/**
 * Message types for communication between webview and extension
 */
export interface WebviewMessage {
    command: string;
    data?: any;
    timestamp?: string;
    id?: string;
}

export interface CanvasReadyMessage extends WebviewMessage {
    command: 'canvasReady';
    data: {
        width?: number;
        height?: number;
        timestamp: string;
        userAgent?: string;
    };
}

export interface ErrorMessage extends WebviewMessage {
    command: 'error';
    data: {
        message: string;
        stack?: string;
        source?: string;
        filename?: string;
        lineno?: number;
        colno?: number;
        userAgent?: string;
        timestamp?: string;
    };
}

export interface DrawingMessage extends WebviewMessage {
    command: 'drawingStarted' | 'drawing' | 'drawingEnded';
    data: {
        tool: string;
        x?: number;
        y?: number;
        lastX?: number;
        lastY?: number;
        timestamp?: string;
    };
}

export interface ToolChangedMessage extends WebviewMessage {
    command: 'toolChanged';
    data: {
        tool: string;
        previousTool?: string;
    };
}

export interface ConnectionStatusMessage extends WebviewMessage {
    command: 'connectionStatus';
    data: {
        connected: boolean;
        lastPing?: string;
    };
}

export interface ReportIssueMessage extends WebviewMessage {
    command: 'reportIssue';
    data: {
        error?: string;
        source?: string;
        context?: any;
    };
}

/**
 * Handles message communication between webview and extension
 * Provides type-safe message handling and connection status tracking
 */
export class WebviewMessageHandler {
    private logger: VSSLogger;
    private connectionStatus: boolean = false;
    private lastMessageTime: number = 0;
    private connectionCheckInterval?: NodeJS.Timeout;
    private messageHandlers: Map<string, (message: WebviewMessage) => void> = new Map();
    private webviewPanel?: vscode.WebviewPanel;

    constructor(logger: VSSLogger) {
        this.logger = logger;
        this.setupDefaultHandlers();
    }

    /**
     * Sets the webview panel for message communication
     */
    public setWebviewPanel(panel: vscode.WebviewPanel): void {
        this.webviewPanel = panel;
        this.setupMessageListener();
        this.startConnectionMonitoring();
    }

    /**
     * Sets up the message listener for the webview panel
     */
    private setupMessageListener(): void {
        if (!this.webviewPanel) {
            this.logger.error('Cannot setup message listener - no webview panel');
            return;
        }

        this.webviewPanel.webview.onDidReceiveMessage(
            (message: WebviewMessage) => this.handleMessage(message),
            undefined,
            []
        );

        this.logger.info('Message listener setup completed');
    }

    /**
     * Handles incoming messages from the webview
     */
    private handleMessage(message: WebviewMessage): void {
        try {
            // Update connection tracking
            this.lastMessageTime = Date.now();
            this.updateConnectionStatus(true);

            // Add timestamp if not present
            if (!message.timestamp) {
                message.timestamp = new Date().toISOString();
            }

            this.logger.debug('Received webview message', { 
                command: message.command, 
                timestamp: message.timestamp 
            });

            // Find and execute handler
            const handler = this.messageHandlers.get(message.command);
            if (handler) {
                handler(message);
            } else {
                this.logger.warn('No handler found for message command', { command: message.command });
                this.handleUnknownMessage(message);
            }

        } catch (error) {
            this.logger.error('Error handling webview message', { error, message });
            this.sendErrorResponse(message, error instanceof Error ? error.message : String(error));
        }
    }

    /**
     * Sets up default message handlers
     */
    private setupDefaultHandlers(): void {
        this.registerHandler('canvasReady', (message) => this.handleCanvasReady(message as CanvasReadyMessage));
        this.registerHandler('error', (message) => this.handleError(message as ErrorMessage));
        this.registerHandler('toolChanged', (message) => this.handleToolChanged(message as ToolChangedMessage));
        this.registerHandler('drawingStarted', (message) => this.handleDrawingEvent(message as DrawingMessage));
        this.registerHandler('drawing', (message) => this.handleDrawingEvent(message as DrawingMessage));
        this.registerHandler('drawingEnded', (message) => this.handleDrawingEvent(message as DrawingMessage));
        this.registerHandler('canvasCleared', this.handleCanvasCleared.bind(this));
        this.registerHandler('reportIssue', (message) => this.handleReportIssue(message as ReportIssueMessage));
        this.registerHandler('connectionPing', this.handleConnectionPing.bind(this));
    }

    /**
     * Registers a message handler for a specific command
     */
    public registerHandler(command: string, handler: (message: WebviewMessage) => void): void {
        this.messageHandlers.set(command, handler);
        this.logger.debug('Message handler registered', { command });
    }

    /**
     * Handles canvas ready messages
     */
    private handleCanvasReady(message: CanvasReadyMessage): void {
        this.logger.info('Canvas ready confirmation received', { data: message.data });
        
        vscode.window.showInformationMessage('Drawing Canvas is ready!');
        
        // Send initial configuration to webview
        this.sendMessage({
            command: 'initialize',
            data: {
                theme: vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.Dark ? 'dark' : 'light',
                timestamp: new Date().toISOString()
            }
        });
    }

    /**
     * Handles error messages from webview
     */
    private handleError(message: ErrorMessage): void {
        const errorData = message.data;
        this.logger.error('Webview error received', { error: errorData });

        const errorMsg = errorData?.message || 'Unknown error';
        const source = errorData?.source || 'webview';
        
        vscode.window.showErrorMessage(
            `Canvas Error (${source}): ${errorMsg}`,
            'Show Details',
            'Export Logs',
            'Report Issue'
        ).then(selection => {
            if (selection === 'Show Details') {
                this.showErrorDetails(errorData);
            } else if (selection === 'Export Logs') {
                vscode.commands.executeCommand('vss.exportLogs');
            } else if (selection === 'Report Issue') {
                this.openIssueReport(errorData);
            }
        });
    }

    /**
     * Handles tool change messages
     */
    private handleToolChanged(message: ToolChangedMessage): void {
        const toolData = message.data;
        this.logger.debug('Tool changed in webview', { 
            tool: toolData.tool, 
            previousTool: toolData.previousTool 
        });

        // Could trigger extension-side tool change events here
        // For example, updating status bar or sending to other extensions
    }

    /**
     * Handles drawing event messages
     */
    private handleDrawingEvent(message: DrawingMessage): void {
        const drawingData = message.data;
        this.logger.debug('Drawing event received', { 
            command: message.command, 
            tool: drawingData.tool 
        });

        // Could implement drawing data persistence or synchronization here
        // For now, just track the activity for connection monitoring
    }

    /**
     * Handles canvas cleared messages
     */
    private handleCanvasCleared(message: WebviewMessage): void {
        this.logger.info('Canvas cleared by user');
        
        // Could implement canvas state persistence here
        // For example, saving the clear action to history
    }

    /**
     * Handles report issue messages
     */
    private handleReportIssue(message: ReportIssueMessage): void {
        const reportData = message.data;
        this.logger.info('Issue report requested from webview', { data: reportData });
        
        this.openIssueReport(reportData);
    }

    /**
     * Handles connection ping messages
     */
    private handleConnectionPing(message: WebviewMessage): void {
        this.logger.debug('Connection ping received');
        
        // Send pong response
        this.sendMessage({
            command: 'connectionPong',
            data: {
                timestamp: new Date().toISOString()
            }
        });
    }

    /**
     * Handles unknown message commands
     */
    private handleUnknownMessage(message: WebviewMessage): void {
        this.logger.warn('Unknown message command received', { 
            command: message.command, 
            data: message.data 
        });

        // Send unknown command response
        this.sendMessage({
            command: 'unknownCommand',
            data: {
                originalCommand: message.command,
                message: 'Unknown command received by extension'
            }
        });
    }

    /**
     * Sends a message to the webview
     */
    public sendMessage(message: WebviewMessage): void {
        if (!this.webviewPanel) {
            this.logger.warn('Cannot send message - no webview panel available');
            return;
        }

        try {
            // Add timestamp if not present
            if (!message.timestamp) {
                message.timestamp = new Date().toISOString();
            }

            this.webviewPanel.webview.postMessage(message);
            this.logger.debug('Message sent to webview', { command: message.command });

        } catch (error) {
            this.logger.error('Failed to send message to webview', { error, message });
        }
    }

    /**
     * Sends an error response message
     */
    private sendErrorResponse(originalMessage: WebviewMessage, errorMessage: string): void {
        this.sendMessage({
            command: 'errorResponse',
            data: {
                originalCommand: originalMessage.command,
                error: errorMessage,
                timestamp: new Date().toISOString()
            }
        });
    }

    /**
     * Starts connection monitoring
     */
    private startConnectionMonitoring(): void {
        // Clear existing interval if any
        if (this.connectionCheckInterval) {
            clearInterval(this.connectionCheckInterval);
        }

        this.connectionCheckInterval = setInterval(() => {
            this.checkConnectionStatus();
        }, 5000); // Check every 5 seconds

        this.logger.info('Connection monitoring started');
    }

    /**
     * Checks connection status based on last message time
     */
    private checkConnectionStatus(): void {
        const now = Date.now();
        const timeSinceLastMessage = now - this.lastMessageTime;
        const isConnected = timeSinceLastMessage < 30000; // 30 seconds timeout

        if (isConnected !== this.connectionStatus) {
            this.updateConnectionStatus(isConnected);
        }

        // Send periodic ping to webview
        if (isConnected) {
            this.sendMessage({
                command: 'connectionPing',
                data: {
                    timestamp: new Date().toISOString()
                }
            });
        }
    }

    /**
     * Updates connection status and notifies webview
     */
    private updateConnectionStatus(connected: boolean): void {
        if (this.connectionStatus !== connected) {
            this.connectionStatus = connected;
            this.logger.info('Connection status changed', { connected });

            // Send status update to webview
            this.sendMessage({
                command: 'connectionStatus',
                data: {
                    connected,
                    timestamp: new Date().toISOString()
                }
            });
        }
    }

    /**
     * Shows detailed error information
     */
    private showErrorDetails(errorData: any): void {
        const details = [
            `Error: ${errorData?.message || 'Unknown error'}`,
            `Source: ${errorData?.source || 'Unknown'}`,
            `Timestamp: ${errorData?.timestamp || new Date().toISOString()}`,
            ''
        ];

        if (errorData?.filename) {
            details.push(`File: ${errorData.filename}`);
        }

        if (errorData?.lineno) {
            details.push(`Line: ${errorData.lineno}`);
        }

        if (errorData?.colno) {
            details.push(`Column: ${errorData.colno}`);
        }

        if (errorData?.userAgent) {
            details.push(`User Agent: ${errorData.userAgent}`);
        }

        if (errorData?.stack) {
            details.push('');
            details.push('Stack Trace:');
            details.push(errorData.stack);
        }

        vscode.window.showErrorMessage('VSS Canvas Error Details', {
            modal: true,
            detail: details.join('\n')
        });
    }

    /**
     * Opens issue report with error details
     */
    private openIssueReport(errorData: any): void {
        const errorInfo = errorData?.error || errorData?.message || 'Unknown error';
        const source = errorData?.source || 'webview';
        
        const issueTitle = `Canvas Error: ${errorInfo}`;
        const issueBody = [
            `**Error Description:**`,
            errorInfo,
            '',
            `**Source:** ${source}`,
            `**Timestamp:** ${new Date().toISOString()}`,
            `**VS Code Version:** ${vscode.version}`,
            `**Platform:** ${process.platform}`,
            `**Node.js Version:** ${process.version}`,
            ''
        ];

        if (errorData?.stack) {
            issueBody.push(`**Stack Trace:**`);
            issueBody.push('```');
            issueBody.push(errorData.stack);
            issueBody.push('```');
            issueBody.push('');
        }

        if (errorData?.userAgent) {
            issueBody.push(`**User Agent:** ${errorData.userAgent}`);
            issueBody.push('');
        }

        issueBody.push(`**Additional Context:**`);
        issueBody.push('Please describe what you were doing when this error occurred.');
        issueBody.push('');
        issueBody.push(`**Logs:**`);
        issueBody.push('Please run "VSS: Export Logs" and attach the log file to this issue.');

        const issueUrl = `https://github.com/JODonogh/Visual-Sketch-Sync/issues/new?title=${encodeURIComponent(issueTitle)}&body=${encodeURIComponent(issueBody.join('\n'))}`;
        
        vscode.env.openExternal(vscode.Uri.parse(issueUrl));
        this.logger.info('Issue report URL opened', { source, error: errorInfo });
    }

    /**
     * Gets current connection status
     */
    public isConnected(): boolean {
        return this.connectionStatus;
    }

    /**
     * Gets time since last message in milliseconds
     */
    public getTimeSinceLastMessage(): number {
        return Date.now() - this.lastMessageTime;
    }

    /**
     * Disposes of the message handler and cleans up resources
     */
    public dispose(): void {
        if (this.connectionCheckInterval) {
            clearInterval(this.connectionCheckInterval);
            this.connectionCheckInterval = undefined;
        }

        this.messageHandlers.clear();
        this.webviewPanel = undefined;
        this.connectionStatus = false;
        this.lastMessageTime = 0;

        this.logger.info('WebviewMessageHandler disposed');
    }
}

/**
 * Logger interface to avoid circular dependencies
 */
interface VSSLogger {
    info(message: string, context?: any): void;
    warn(message: string, context?: any): void;
    error(message: string, context?: any): void;
    debug(message: string, context?: any): void;
}