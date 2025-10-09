import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Webview content provider with robust error handling and loading states
 * Handles HTML content generation, resource URI management, and CSP configuration
 */
export class WebviewContentProvider {
    private logger: VSSLogger;
    private extensionUri: vscode.Uri;

    constructor(extensionUri: vscode.Uri, logger: VSSLogger) {
        this.extensionUri = extensionUri;
        this.logger = logger;
    }

    /**
     * Gets webview content with proper resource URI handling and error fallback
     */
    public getWebviewContent(webview: vscode.Webview): string {
        try {
            this.logger.info('Loading webview content');
            
            // Get resource URIs for local files
            const webviewPath = vscode.Uri.joinPath(this.extensionUri, 'webview');
            const scriptUris = this.getScriptResourceUris(webview);
            const styleUris = this.getStyleResourceUris(webview);
            
            // Generate Content Security Policy
            const csp = this.generateContentSecurityPolicy(webview);
            
            // Load base HTML template
            const baseHtml = this.loadBaseHtmlTemplate();
            
            // Generate complete HTML with loading states
            const completeHtml = this.generateCompleteHtml(baseHtml, scriptUris, styleUris, csp);
            
            this.logger.info('Webview content loaded successfully');
            return completeHtml;

        } catch (error) {
            this.logger.error('Failed to load webview content', { error });
            return this.getErrorWebviewContent(error instanceof Error ? error.message : String(error));
        }
    }

    /**
     * Gets script resource URIs with proper webview URI conversion
     */
    private getScriptResourceUris(webview: vscode.Webview): { [key: string]: vscode.Uri } {
        const webviewPath = vscode.Uri.joinPath(this.extensionUri, 'webview');
        
        const scripts = {
            drawingTools: vscode.Uri.joinPath(webviewPath, 'drawing-tools.js'),
            canvasState: vscode.Uri.joinPath(webviewPath, 'canvas-state.js'),
            colorSystem: vscode.Uri.joinPath(webviewPath, 'color-system.js'),
            alignmentGuides: vscode.Uri.joinPath(webviewPath, 'alignment-guides.js'),
            errorHandler: vscode.Uri.joinPath(webviewPath, 'error-handler.js')
        };

        // Convert to webview URIs
        const webviewUris: { [key: string]: vscode.Uri } = {};
        for (const [key, uri] of Object.entries(scripts)) {
            try {
                // Check if file exists before creating webview URI
                if (fs.existsSync(uri.fsPath)) {
                    webviewUris[key] = webview.asWebviewUri(uri);
                } else {
                    this.logger.warn(`Script file not found: ${uri.fsPath}`);
                }
            } catch (error) {
                this.logger.warn(`Failed to process script URI: ${key}`, { error });
            }
        }

        return webviewUris;
    }

    /**
     * Gets style resource URIs with proper webview URI conversion
     */
    private getStyleResourceUris(webview: vscode.Webview): { [key: string]: vscode.Uri } {
        const styles = {
            main: vscode.Uri.joinPath(this.extensionUri, 'comprehensive-styles.css'),
            designTokens: vscode.Uri.joinPath(this.extensionUri, 'design-tokens.css'),
            test: vscode.Uri.joinPath(this.extensionUri, 'test-styles.css')
        };

        // Convert to webview URIs
        const webviewUris: { [key: string]: vscode.Uri } = {};
        for (const [key, uri] of Object.entries(styles)) {
            try {
                // Check if file exists before creating webview URI
                if (fs.existsSync(uri.fsPath)) {
                    webviewUris[key] = webview.asWebviewUri(uri);
                } else {
                    this.logger.warn(`Style file not found: ${uri.fsPath}`);
                }
            } catch (error) {
                this.logger.warn(`Failed to process style URI: ${key}`, { error });
            }
        }

        return webviewUris;
    }

    /**
     * Generates Content Security Policy for webview security
     */
    private generateContentSecurityPolicy(webview: vscode.Webview): string {
        const cspSource = webview.cspSource;
        
        return [
            `default-src 'none'`,
            `style-src ${cspSource} 'unsafe-inline'`,
            `script-src ${cspSource} 'unsafe-inline'`,
            `img-src ${cspSource} data: https:`,
            `font-src ${cspSource}`,
            `connect-src ${cspSource}`
        ].join('; ');
    }

    /**
     * Loads base HTML template from file or returns embedded template
     */
    private loadBaseHtmlTemplate(): string {
        try {
            const htmlPath = vscode.Uri.joinPath(this.extensionUri, 'webview', 'index.html');
            
            if (fs.existsSync(htmlPath.fsPath)) {
                return fs.readFileSync(htmlPath.fsPath, 'utf8');
            } else {
                this.logger.warn('HTML template file not found, using embedded template');
                return this.getEmbeddedHtmlTemplate();
            }
        } catch (error) {
            this.logger.warn('Failed to load HTML template file, using embedded template', { error });
            return this.getEmbeddedHtmlTemplate();
        }
    }

    /**
     * Gets embedded HTML template as fallback
     */
    private getEmbeddedHtmlTemplate(): string {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>VSS Drawing Canvas</title>
</head>
<body>
    <div id="canvas-container">
        <div id="status">
            <span>VSS Drawing Canvas - Ready</span>
            <span class="connection-status disconnected" id="connection-status">Disconnected</span>
        </div>
        
        <div class="toolbar">
            <button class="tool-button active" data-tool="pen" id="pen-tool">Pen</button>
            <button class="tool-button" data-tool="eraser" id="eraser-tool">Eraser</button>
            <button class="tool-button" id="clear-canvas">Clear</button>
        </div>
        
        <canvas id="drawing-canvas"></canvas>
    </div>
</body>
</html>`;
    }

    /**
     * Generates complete HTML with loading states and error handling
     */
    private generateCompleteHtml(
        baseHtml: string, 
        scriptUris: { [key: string]: vscode.Uri }, 
        styleUris: { [key: string]: vscode.Uri }, 
        csp: string
    ): string {
        // Update CSP in the HTML
        let html = baseHtml.replace(
            /content="[^"]*"/,
            `content="${csp}"`
        );

        // Add loading screen HTML if not present
        if (!html.includes('loading-screen')) {
            html = this.addLoadingScreen(html);
        }

        // Add error handling HTML if not present
        if (!html.includes('error-screen')) {
            html = this.addErrorScreen(html);
        }

        // Add style links
        const styleLinks = this.generateStyleLinks(styleUris);
        html = html.replace('</head>', `${styleLinks}</head>`);

        // Add script tags
        const scriptTags = this.generateScriptTags(scriptUris);
        html = html.replace('</body>', `${scriptTags}</body>`);

        // Add initialization script
        const initScript = this.generateInitializationScript();
        html = html.replace('</body>', `${initScript}</body>`);

        return html;
    }

    /**
     * Adds loading screen HTML to the content
     */
    private addLoadingScreen(html: string): string {
        const loadingScreenHtml = `
        <div id="loading-screen" class="loading-screen">
            <div class="loading-spinner">
                <div class="spinner"></div>
            </div>
            <div class="loading-text">
                <h3>Loading Drawing Canvas...</h3>
                <p id="loading-status">Initializing components...</p>
            </div>
        </div>`;

        // Insert after body tag
        return html.replace('<body>', `<body>${loadingScreenHtml}`);
    }

    /**
     * Adds error screen HTML to the content
     */
    private addErrorScreen(html: string): string {
        const errorScreenHtml = `
        <div id="error-screen" class="error-screen" style="display: none;">
            <div class="error-content">
                <h2>⚠️ Canvas Error</h2>
                <div id="error-message" class="error-message"></div>
                <div class="error-actions">
                    <button id="retry-button" class="retry-button">Retry</button>
                    <button id="report-button" class="report-button">Report Issue</button>
                </div>
                <details class="error-details">
                    <summary>Technical Details</summary>
                    <pre id="error-stack"></pre>
                </details>
            </div>
        </div>`;

        // Insert after loading screen
        return html.replace('</div>', `</div>${errorScreenHtml}`);
    }

    /**
     * Generates style link tags for CSS resources
     */
    private generateStyleLinks(styleUris: { [key: string]: vscode.Uri }): string {
        const links: string[] = [];
        
        // Add embedded styles first
        links.push(`<style>${this.getEmbeddedStyles()}</style>`);
        
        // Add external stylesheets
        for (const [key, uri] of Object.entries(styleUris)) {
            links.push(`<link rel="stylesheet" href="${uri}" data-style="${key}">`);
        }

        return links.join('\n');
    }

    /**
     * Gets embedded CSS styles for loading and error states
     */
    private getEmbeddedStyles(): string {
        return `
        /* Loading Screen Styles */
        .loading-screen {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: #1e1e1e;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            z-index: 9999;
            color: #cccccc;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .loading-spinner {
            margin-bottom: 20px;
        }

        .spinner {
            width: 40px;
            height: 40px;
            border: 4px solid #333;
            border-top: 4px solid #007acc;
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }

        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }

        .loading-text {
            text-align: center;
        }

        .loading-text h3 {
            margin: 0 0 10px 0;
            font-size: 18px;
            font-weight: 500;
        }

        .loading-text p {
            margin: 0;
            font-size: 14px;
            color: #999;
        }

        /* Error Screen Styles */
        .error-screen {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: #1e1e1e;
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 9998;
            color: #cccccc;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .error-content {
            max-width: 500px;
            padding: 30px;
            background: #2d2d2d;
            border-radius: 8px;
            border: 1px solid #444;
            text-align: center;
        }

        .error-content h2 {
            color: #f48771;
            margin: 0 0 20px 0;
            font-size: 24px;
        }

        .error-message {
            background: #3c1e1e;
            border: 1px solid #d32f2f;
            border-radius: 4px;
            padding: 15px;
            margin: 20px 0;
            color: #ffcdd2;
            text-align: left;
        }

        .error-actions {
            margin: 20px 0;
            display: flex;
            gap: 10px;
            justify-content: center;
        }

        .retry-button, .report-button {
            padding: 10px 20px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
        }

        .retry-button {
            background: #007acc;
            color: white;
        }

        .retry-button:hover {
            background: #005a9e;
        }

        .report-button {
            background: #444;
            color: #cccccc;
        }

        .report-button:hover {
            background: #555;
        }

        .error-details {
            margin-top: 20px;
            text-align: left;
        }

        .error-details summary {
            cursor: pointer;
            color: #999;
            font-size: 12px;
        }

        .error-details pre {
            background: #1a1a1a;
            border: 1px solid #333;
            border-radius: 4px;
            padding: 10px;
            margin-top: 10px;
            font-size: 11px;
            color: #ccc;
            overflow-x: auto;
            white-space: pre-wrap;
        }

        /* Hide canvas container when loading or error */
        .loading-screen ~ #canvas-container,
        .error-screen:not([style*="display: none"]) ~ #canvas-container {
            display: none;
        }
        `;
    }

    /**
     * Generates script tags for JavaScript resources
     */
    private generateScriptTags(scriptUris: { [key: string]: vscode.Uri }): string {
        const scripts: string[] = [];
        
        // Add scripts in dependency order
        const scriptOrder = ['errorHandler', 'canvasState', 'colorSystem', 'alignmentGuides', 'drawingTools'];
        
        for (const scriptName of scriptOrder) {
            if (scriptUris[scriptName]) {
                scripts.push(`<script src="${scriptUris[scriptName]}" data-script="${scriptName}"></script>`);
            }
        }

        return scripts.join('\n');
    }

    /**
     * Generates initialization script with error handling and loading states
     */
    private generateInitializationScript(): string {
        return `
        <script>
            // Global error handling
            let hasInitialized = false;
            let initializationTimeout;
            const vscode = acquireVsCodeApi();

            // Loading state management
            const loadingScreen = document.getElementById('loading-screen');
            const errorScreen = document.getElementById('error-screen');
            const loadingStatus = document.getElementById('loading-status');

            function updateLoadingStatus(message) {
                if (loadingStatus) {
                    loadingStatus.textContent = message;
                }
                console.log('VSS Loading:', message);
            }

            function showError(message, stack) {
                console.error('VSS Error:', message, stack);
                
                if (errorScreen) {
                    const errorMessage = document.getElementById('error-message');
                    const errorStackElement = document.getElementById('error-stack');
                    
                    if (errorMessage) {
                        errorMessage.textContent = message;
                    }
                    
                    if (errorStackElement && stack) {
                        errorStackElement.textContent = stack;
                    }
                    
                    errorScreen.style.display = 'flex';
                }
                
                if (loadingScreen) {
                    loadingScreen.style.display = 'none';
                }

                // Send error to extension
                vscode.postMessage({
                    command: 'error',
                    data: {
                        message: message,
                        stack: stack,
                        source: 'webview-initialization'
                    }
                });
            }

            function hideLoadingScreen() {
                if (loadingScreen) {
                    loadingScreen.style.display = 'none';
                }
                hasInitialized = true;
                
                // Send ready message to extension
                vscode.postMessage({
                    command: 'canvasReady',
                    data: {
                        timestamp: new Date().toISOString(),
                        userAgent: navigator.userAgent
                    }
                });
            }

            // Set up error handlers
            window.addEventListener('error', function(e) {
                if (!hasInitialized) {
                    showError('Initialization Error: ' + e.message, e.error ? e.error.stack : null);
                } else {
                    vscode.postMessage({
                        command: 'error',
                        data: {
                            message: e.message,
                            filename: e.filename,
                            lineno: e.lineno,
                            colno: e.colno,
                            stack: e.error ? e.error.stack : null
                        }
                    });
                }
            });

            window.addEventListener('unhandledrejection', function(e) {
                const message = 'Unhandled Promise Rejection: ' + (e.reason ? e.reason.toString() : 'Unknown');
                if (!hasInitialized) {
                    showError(message, e.reason ? e.reason.stack : null);
                } else {
                    vscode.postMessage({
                        command: 'error',
                        data: {
                            message: message,
                            stack: e.reason ? e.reason.stack : null
                        }
                    });
                }
            });

            // Set up retry functionality
            document.addEventListener('DOMContentLoaded', function() {
                const retryButton = document.getElementById('retry-button');
                const reportButton = document.getElementById('report-button');
                
                if (retryButton) {
                    retryButton.addEventListener('click', function() {
                        location.reload();
                    });
                }
                
                if (reportButton) {
                    reportButton.addEventListener('click', function() {
                        vscode.postMessage({
                            command: 'reportIssue',
                            data: {
                                source: 'webview-error-screen'
                            }
                        });
                    });
                }
            });

            // Initialization sequence
            document.addEventListener('DOMContentLoaded', function() {
                updateLoadingStatus('Loading components...');
                
                // Set initialization timeout
                initializationTimeout = setTimeout(function() {
                    if (!hasInitialized) {
                        showError('Initialization timeout - Canvas failed to load within 10 seconds', null);
                    }
                }, 10000);

                try {
                    // Initialize canvas step by step
                    updateLoadingStatus('Initializing canvas...');
                    
                    // Check if canvas element exists
                    const canvas = document.getElementById('drawing-canvas');
                    if (!canvas) {
                        throw new Error('Canvas element not found in DOM');
                    }

                    updateLoadingStatus('Setting up drawing tools...');
                    
                    // Initialize drawing functionality (if available)
                    if (typeof initializeCanvas === 'function') {
                        initializeCanvas();
                    }
                    
                    updateLoadingStatus('Establishing connection...');
                    
                    // Set up message passing
                    if (typeof setupMessagePassing === 'function') {
                        setupMessagePassing();
                    }
                    
                    updateLoadingStatus('Canvas ready!');
                    
                    // Hide loading screen after a short delay
                    setTimeout(function() {
                        clearTimeout(initializationTimeout);
                        hideLoadingScreen();
                    }, 500);

                } catch (error) {
                    clearTimeout(initializationTimeout);
                    showError('Initialization failed: ' + error.message, error.stack);
                }
            });

            // Connection status tracking
            let connectionCheckInterval;
            let lastMessageTime = Date.now();

            function updateConnectionStatus(connected) {
                const statusElement = document.getElementById('connection-status');
                if (statusElement) {
                    statusElement.textContent = connected ? 'Connected' : 'Disconnected';
                    statusElement.className = 'connection-status ' + (connected ? 'connected' : 'disconnected');
                }
            }

            // Start connection monitoring after initialization
            function startConnectionMonitoring() {
                connectionCheckInterval = setInterval(function() {
                    const timeSinceLastMessage = Date.now() - lastMessageTime;
                    const isConnected = timeSinceLastMessage < 30000; // 30 seconds timeout
                    updateConnectionStatus(isConnected);
                }, 5000);
            }

            // Listen for messages from extension to track connection
            window.addEventListener('message', function(event) {
                lastMessageTime = Date.now();
                updateConnectionStatus(true);
            });

            // Start monitoring once canvas is ready
            document.addEventListener('DOMContentLoaded', function() {
                setTimeout(startConnectionMonitoring, 1000);
            });

            // Cleanup on unload
            window.addEventListener('beforeunload', function() {
                if (connectionCheckInterval) {
                    clearInterval(connectionCheckInterval);
                }
                if (initializationTimeout) {
                    clearTimeout(initializationTimeout);
                }
            });
        </script>`;
    }

    /**
     * Generates error HTML content when webview fails to load
     */
    public getErrorWebviewContent(errorMessage: string): string {
        const csp = "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';";
        
        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <meta http-equiv="Content-Security-Policy" content="${csp}">
            <title>VSS Error</title>
            <style>
                body { 
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
                    padding: 20px; 
                    background: #1e1e1e; 
                    color: #cccccc; 
                    margin: 0;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    min-height: 100vh;
                }
                .error-container {
                    max-width: 600px;
                    background: #2d2d2d;
                    border-radius: 8px;
                    border: 1px solid #444;
                    padding: 30px;
                }
                .error-header {
                    display: flex;
                    align-items: center;
                    margin-bottom: 20px;
                }
                .error-icon {
                    font-size: 32px;
                    margin-right: 15px;
                    color: #f48771;
                }
                .error-title {
                    font-size: 24px;
                    font-weight: 600;
                    color: #f48771;
                    margin: 0;
                }
                .error { 
                    background: #3c1e1e;
                    border: 1px solid #d32f2f;
                    color: #ffcdd2;
                    padding: 15px; 
                    border-radius: 5px; 
                    margin: 20px 0;
                    font-family: 'Courier New', monospace;
                    font-size: 14px;
                }
                .troubleshooting { 
                    background: #333; 
                    padding: 20px; 
                    border-radius: 5px; 
                    margin: 20px 0; 
                }
                .troubleshooting h3 {
                    margin-top: 0;
                    color: #007acc;
                }
                .troubleshooting ol {
                    padding-left: 20px;
                }
                .troubleshooting li {
                    margin: 10px 0;
                    line-height: 1.5;
                }
                .action-buttons {
                    display: flex;
                    gap: 10px;
                    margin-top: 20px;
                }
                .retry-button, .report-button {
                    background: #007acc;
                    color: white;
                    border: none;
                    padding: 12px 24px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 14px;
                    font-weight: 500;
                    text-decoration: none;
                    display: inline-block;
                }
                .retry-button:hover {
                    background: #005a9e;
                }
                .report-button {
                    background: #444;
                }
                .report-button:hover {
                    background: #555;
                }
                .system-info {
                    background: #1a1a1a;
                    border: 1px solid #333;
                    border-radius: 4px;
                    padding: 15px;
                    margin-top: 20px;
                    font-size: 12px;
                    color: #999;
                }
                .system-info h4 {
                    margin: 0 0 10px 0;
                    color: #ccc;
                }
            </style>
        </head>
        <body>
            <div class="error-container">
                <div class="error-header">
                    <div class="error-icon">⚠️</div>
                    <h1 class="error-title">VSS Drawing Canvas Error</h1>
                </div>
                
                <div class="error">
                    <strong>Error:</strong> ${this.escapeHtml(errorMessage)}
                </div>
                
                <div class="troubleshooting">
                    <h3>Troubleshooting Steps:</h3>
                    <ol>
                        <li><strong>Reload VS Code:</strong> Press <code>Ctrl+Shift+P</code> → "Developer: Reload Window"</li>
                        <li><strong>Check Extension:</strong> Ensure Visual Sketch Sync is properly installed and enabled</li>
                        <li><strong>Check Files:</strong> Verify webview files exist in the extension directory</li>
                        <li><strong>Run Diagnostics:</strong> Use "VSS: Show Diagnostics" command for detailed information</li>
                        <li><strong>Check Console:</strong> Open Developer Tools (Help → Toggle Developer Tools) for more errors</li>
                        <li><strong>Restart VS Code:</strong> Close and reopen VS Code completely</li>
                    </ol>
                </div>

                <div class="action-buttons">
                    <button class="retry-button" onclick="location.reload()">Retry Loading</button>
                    <button class="report-button" onclick="reportIssue()">Report Issue</button>
                </div>

                <div class="system-info">
                    <h4>System Information:</h4>
                    <div>User Agent: <span id="user-agent"></span></div>
                    <div>Timestamp: <span id="timestamp"></span></div>
                    <div>Error Source: Webview Content Provider</div>
                </div>
            </div>

            <script>
                // Populate system info
                document.getElementById('user-agent').textContent = navigator.userAgent;
                document.getElementById('timestamp').textContent = new Date().toISOString();

                // VS Code API for message passing
                const vscode = acquireVsCodeApi();
                
                // Send error message to extension
                vscode.postMessage({
                    command: 'error',
                    data: {
                        message: '${this.escapeHtml(errorMessage)}',
                        source: 'webview-content-provider',
                        userAgent: navigator.userAgent,
                        timestamp: new Date().toISOString()
                    }
                });

                function reportIssue() {
                    vscode.postMessage({
                        command: 'reportIssue',
                        data: {
                            error: '${this.escapeHtml(errorMessage)}',
                            source: 'webview-content-provider'
                        }
                    });
                }

                // Handle connection status
                let connectionTimeout = setTimeout(function() {
                    console.warn('VSS: No connection established with extension after 5 seconds');
                }, 5000);

                window.addEventListener('message', function(event) {
                    clearTimeout(connectionTimeout);
                    console.log('VSS: Connection established with extension');
                });
            </script>
        </body>
        </html>`;
    }

    /**
     * Escapes HTML to prevent XSS attacks
     */
    private escapeHtml(text: string): string {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
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