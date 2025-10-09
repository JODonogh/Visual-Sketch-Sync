import * as vscode from 'vscode';
import * as path from 'path';
import { WebviewContentProvider } from './webview-content-provider';
import { WebviewMessageHandler } from './webview-message-handler';

/**
 * Panel state interface for tracking webview panel status
 */
interface PanelState {
    isVisible: boolean;
    isActive: boolean;
    isReady: boolean;
    lastFocusTime: Date | undefined;
    creationTime: Date | undefined;
    disposeCount: number;
}

/**
 * Display method enum for tracking how the webview is currently displayed
 */
enum DisplayMethod {
    NONE = 'none',
    PANEL = 'panel',
    SIDEBAR = 'sidebar'
}

/**
 * Fallback options interface for configuring fallback behavior
 */
interface FallbackOptions {
    enableSidebarFallback: boolean;
    showFallbackMessage: boolean;
    preferredDisplayMethod: DisplayMethod;
}

/**
 * Singleton class to manage webview panel lifecycle and state
 * Handles creation, display, focus, and disposal of webview panels with fallback support
 */
export class WebviewPanelManager {
    private static instance: WebviewPanelManager;
    private currentPanel: vscode.WebviewPanel | undefined;
    private logger: VSSLogger;
    private contentProvider: WebviewContentProvider;
    private messageHandler: WebviewMessageHandler;
    private panelState: PanelState;
    private currentDisplayMethod: DisplayMethod;
    private fallbackOptions: FallbackOptions;

    private constructor(private extensionUri: vscode.Uri, logger: VSSLogger) {
        this.logger = logger;
        this.contentProvider = new WebviewContentProvider(extensionUri, logger);
        this.messageHandler = new WebviewMessageHandler(logger);
        this.panelState = this.initializePanelState();
        this.currentDisplayMethod = DisplayMethod.NONE;
        this.fallbackOptions = this.initializeFallbackOptions();
        this.logger.info('WebviewPanelManager initialized with fallback support');
    }

    /**
     * Initializes the panel state with default values
     */
    private initializePanelState(): PanelState {
        return {
            isVisible: false,
            isActive: false,
            isReady: false,
            lastFocusTime: undefined,
            creationTime: undefined,
            disposeCount: 0
        };
    }

    /**
     * Initializes fallback options with default values
     */
    private initializeFallbackOptions(): FallbackOptions {
        const config = vscode.workspace.getConfiguration('vss');
        return {
            enableSidebarFallback: config.get<boolean>('webview.enableSidebarFallback', true),
            showFallbackMessage: config.get<boolean>('webview.showFallbackMessage', true),
            preferredDisplayMethod: config.get<string>('webview.preferredDisplayMethod', 'panel') === 'sidebar' 
                ? DisplayMethod.SIDEBAR 
                : DisplayMethod.PANEL
        };
    }

    public static getInstance(extensionUri: vscode.Uri, logger: VSSLogger): WebviewPanelManager {
        if (!WebviewPanelManager.instance) {
            WebviewPanelManager.instance = new WebviewPanelManager(extensionUri, logger);
        }
        return WebviewPanelManager.instance;
    }

    /**
     * Shows the drawing canvas webview panel with fallback support
     * Creates new panel if none exists, or reveals existing panel
     * Falls back to sidebar view if panel creation fails
     */
    public async showDrawingCanvas(): Promise<void> {
        try {
            // Check user preference for display method
            if (this.fallbackOptions.preferredDisplayMethod === DisplayMethod.SIDEBAR) {
                await this.showInSidebar();
                return;
            }

            // If panel exists and is not disposed, just reveal it
            if (this.currentPanel && this.currentDisplayMethod === DisplayMethod.PANEL) {
                this.revealPanel();
                return;
            }

            // Try to create webview panel first
            await this.tryShowInPanel();

        } catch (error) {
            this.logger.error('Failed to show drawing canvas in panel', { error });
            
            // Try fallback to sidebar if enabled
            if (this.fallbackOptions.enableSidebarFallback) {
                this.logger.info('Attempting fallback to sidebar view');
                try {
                    await this.showInSidebar();
                    
                    if (this.fallbackOptions.showFallbackMessage) {
                        vscode.window.showInformationMessage(
                            'Drawing Canvas opened in sidebar (fallback mode)',
                            'Switch to Panel',
                            'Don\'t Show Again'
                        ).then(selection => {
                            if (selection === 'Switch to Panel') {
                                this.tryShowInPanel().catch(panelError => {
                                    this.logger.error('Panel creation failed after user request', { panelError });
                                    vscode.window.showErrorMessage('Unable to create panel view. Sidebar view will continue to be used.');
                                });
                            } else if (selection === 'Don\'t Show Again') {
                                this.updateFallbackOptions({ showFallbackMessage: false });
                            }
                        });
                    }
                } catch (fallbackError) {
                    this.logger.error('Both panel and sidebar fallback failed', { 
                        originalError: error, 
                        fallbackError 
                    });
                    throw new Error(`Failed to display webview: Panel creation failed (${error}), Sidebar fallback failed (${fallbackError})`);
                }
            } else {
                throw error;
            }
        }
    }

    /**
     * Attempts to show the webview in a panel
     */
    private async tryShowInPanel(): Promise<void> {
        try {
            // Create new webview panel
            this.currentPanel = vscode.window.createWebviewPanel(
                'vssDrawingCanvas',
                'VSS Drawing Canvas',
                vscode.ViewColumn.One,
                {
                    enableScripts: true,
                    retainContextWhenHidden: true,
                    localResourceRoots: [this.extensionUri]
                }
            );

            // Update display method and panel state
            this.currentDisplayMethod = DisplayMethod.PANEL;
            this.updatePanelState({
                creationTime: new Date(),
                isVisible: true,
                isActive: true,
                isReady: false
            });

            // Set up panel content and event handlers
            this.setupWebviewPanel();
            this.logger.info('New webview panel created and configured', { 
                displayMethod: this.currentDisplayMethod,
                panelState: this.panelState 
            });

        } catch (error) {
            this.currentDisplayMethod = DisplayMethod.NONE;
            throw error;
        }
    }

    /**
     * Shows the webview in the sidebar using the existing WebviewViewProvider
     */
    private async showInSidebar(): Promise<void> {
        try {
            // Open the Explorer view first to ensure sidebar is visible
            await vscode.commands.executeCommand('workbench.view.explorer');
            
            // Focus the drawing canvas view in the sidebar
            await vscode.commands.executeCommand('vss.drawingCanvas.focus');
            
            // Update display method
            this.currentDisplayMethod = DisplayMethod.SIDEBAR;
            this.updatePanelState({
                creationTime: new Date(),
                isVisible: true,
                isActive: true,
                isReady: false
            });

            this.logger.info('Webview displayed in sidebar', { 
                displayMethod: this.currentDisplayMethod 
            });

        } catch (error) {
            this.currentDisplayMethod = DisplayMethod.NONE;
            this.logger.error('Failed to show webview in sidebar', { error });
            throw new Error(`Sidebar display failed: ${error}`);
        }
    }

    /**
     * Reveals and focuses the existing panel
     */
    public revealPanel(): void {
        if (!this.currentPanel) {
            this.logger.warn('Cannot reveal panel - no panel exists');
            return;
        }

        try {
            this.currentPanel.reveal(vscode.ViewColumn.One);
            this.updatePanelState({
                lastFocusTime: new Date(),
                isVisible: true,
                isActive: true
            });
            this.logger.info('Existing webview panel revealed and focused');
        } catch (error) {
            this.logger.error('Failed to reveal panel', { error });
            throw error;
        }
    }

    /**
     * Updates the panel state with new values
     */
    private updatePanelState(updates: Partial<PanelState>): void {
        this.panelState = { ...this.panelState, ...updates };
        this.logger.debug('Panel state updated', { panelState: this.panelState });
    }

    /**
     * Sets up the webview panel with content and event handlers
     */
    private setupWebviewPanel(): void {
        if (!this.currentPanel) {
            this.logger.error('Cannot setup webview panel - panel is undefined');
            return;
        }

        try {
            // Set webview content using the content provider
            this.currentPanel.webview.html = this.contentProvider.getWebviewContent(this.currentPanel.webview);
            this.logger.info('Webview content loaded successfully');

            // Set up message handling
            this.messageHandler.setWebviewPanel(this.currentPanel);

            // Handle panel disposal
            this.currentPanel.onDidDispose(() => {
                this.handlePanelDisposal();
            });

            // Handle panel visibility changes
            this.currentPanel.onDidChangeViewState(e => {
                this.handlePanelViewStateChange(e);
            });

            // Register message handler for canvas ready event
            this.messageHandler.registerHandler('canvasReady', () => {
                this.updatePanelState({ isReady: true });
                this.logger.info('Canvas is ready', { panelState: this.panelState });
            });

        } catch (error) {
            this.logger.error('Failed to setup webview panel', { error });
            throw error;
        }
    }





    /**
     * Handles panel disposal and state cleanup
     */
    private handlePanelDisposal(): void {
        this.messageHandler.dispose();
        this.currentPanel = undefined;
        
        // Reset display method only if it was a panel
        if (this.currentDisplayMethod === DisplayMethod.PANEL) {
            this.currentDisplayMethod = DisplayMethod.NONE;
        }
        
        // Update panel state
        this.updatePanelState({
            isVisible: false,
            isActive: false,
            isReady: false,
            disposeCount: this.panelState.disposeCount + 1
        });

        this.logger.info('Webview panel disposed', { 
            disposeCount: this.panelState.disposeCount,
            displayMethod: this.currentDisplayMethod,
            panelState: this.panelState 
        });
    }

    /**
     * Handles panel view state changes (visibility, focus)
     */
    private handlePanelViewStateChange(e: vscode.WebviewPanelOnDidChangeViewStateEvent): void {
        const wasVisible = this.panelState.isVisible;
        const wasActive = this.panelState.isActive;

        this.updatePanelState({
            isVisible: e.webviewPanel.visible,
            isActive: e.webviewPanel.active,
            lastFocusTime: e.webviewPanel.active ? new Date() : this.panelState.lastFocusTime
        });

        // Log significant state changes
        if (wasVisible !== e.webviewPanel.visible || wasActive !== e.webviewPanel.active) {
            this.logger.info('Webview panel visibility changed', { 
                visible: e.webviewPanel.visible,
                active: e.webviewPanel.active,
                previousVisible: wasVisible,
                previousActive: wasActive,
                panelState: this.panelState
            });
        }
    }

    /**
     * Recreates the panel if it was disposed
     */
    public async recreatePanel(): Promise<void> {
        if (this.currentPanel) {
            this.logger.info('Panel already exists, no need to recreate');
            return;
        }

        this.logger.info('Recreating disposed panel');
        await this.showDrawingCanvas();
    }

    /**
     * Checks if the webview panel is currently visible
     */
    public isVisible(): boolean {
        return this.panelState.isVisible && this.currentPanel?.visible === true;
    }

    /**
     * Checks if the webview panel is currently active (focused)
     */
    public isActive(): boolean {
        return this.panelState.isActive && this.currentPanel?.active === true;
    }

    /**
     * Checks if the webview panel exists (may not be visible)
     */
    public exists(): boolean {
        return this.currentPanel !== undefined;
    }

    /**
     * Checks if the canvas is ready for interaction
     */
    public isReady(): boolean {
        return this.panelState.isReady;
    }

    /**
     * Gets the current panel state
     */
    public getPanelState(): Readonly<PanelState> {
        return { ...this.panelState };
    }

    /**
     * Gets panel statistics for diagnostics
     */
    public getPanelStats(): { 
        exists: boolean; 
        visible: boolean; 
        active: boolean; 
        ready: boolean;
        disposeCount: number;
        displayMethod: DisplayMethod;
        fallbackEnabled: boolean;
        preferredMethod: DisplayMethod;
        uptime?: number;
    } {
        const uptime = this.panelState.creationTime 
            ? Date.now() - this.panelState.creationTime.getTime()
            : undefined;

        return {
            exists: this.exists(),
            visible: this.isVisible(),
            active: this.isActive(),
            ready: this.isReady(),
            disposeCount: this.panelState.disposeCount,
            displayMethod: this.currentDisplayMethod,
            fallbackEnabled: this.fallbackOptions.enableSidebarFallback,
            preferredMethod: this.fallbackOptions.preferredDisplayMethod,
            uptime
        };
    }

    /**
     * Disposes of the current webview panel
     */
    public dispose(): void {
        if (this.currentPanel) {
            this.currentPanel.dispose();
            // handlePanelDisposal will be called automatically
        } else {
            // Clean up state even if no panel exists
            this.messageHandler.dispose();
            this.updatePanelState({
                isVisible: false,
                isActive: false,
                isReady: false
            });
        }
        
        this.currentDisplayMethod = DisplayMethod.NONE;
        this.logger.info('Webview panel manually disposed', { 
            displayMethod: this.currentDisplayMethod 
        });
    }

    /**
     * Sends a message to the webview
     */
    public sendMessage(message: any): void {
        this.messageHandler.sendMessage(message);
    }

    /**
     * Gets connection status from message handler
     */
    public isConnected(): boolean {
        return this.messageHandler.isConnected();
    }

    /**
     * Registers a custom message handler
     */
    public registerMessageHandler(command: string, handler: (message: any) => void): void {
        this.messageHandler.registerHandler(command, handler);
    }

    /**
     * Gets the current display method
     */
    public getCurrentDisplayMethod(): DisplayMethod {
        return this.currentDisplayMethod;
    }

    /**
     * Updates fallback options
     */
    public updateFallbackOptions(updates: Partial<FallbackOptions>): void {
        this.fallbackOptions = { ...this.fallbackOptions, ...updates };
        this.logger.info('Fallback options updated', { fallbackOptions: this.fallbackOptions });
    }

    /**
     * Gets current fallback options
     */
    public getFallbackOptions(): Readonly<FallbackOptions> {
        return { ...this.fallbackOptions };
    }

    /**
     * Switches display method between panel and sidebar
     */
    public async switchDisplayMethod(method: DisplayMethod): Promise<void> {
        if (method === this.currentDisplayMethod) {
            this.logger.info('Already using requested display method', { method });
            return;
        }

        this.logger.info('Switching display method', { 
            from: this.currentDisplayMethod, 
            to: method 
        });

        try {
            // Dispose current panel if switching away from panel
            if (this.currentDisplayMethod === DisplayMethod.PANEL && this.currentPanel) {
                this.currentPanel.dispose();
                this.currentPanel = undefined;
            }

            // Show in new method
            if (method === DisplayMethod.PANEL) {
                await this.tryShowInPanel();
            } else if (method === DisplayMethod.SIDEBAR) {
                await this.showInSidebar();
            }

            this.logger.info('Display method switched successfully', { 
                newMethod: this.currentDisplayMethod 
            });

        } catch (error) {
            this.logger.error('Failed to switch display method', { 
                targetMethod: method, 
                error 
            });
            throw error;
        }
    }

    /**
     * Provides user choice between panel and sidebar display
     */
    public async showDisplayMethodChoice(): Promise<void> {
        const choice = await vscode.window.showQuickPick([
            {
                label: '$(window) Panel View',
                description: 'Open in main editor area (recommended)',
                detail: 'Full-size canvas with better drawing experience',
                method: DisplayMethod.PANEL
            },
            {
                label: '$(sidebar-left) Sidebar View', 
                description: 'Open in Explorer sidebar',
                detail: 'Compact view, always visible alongside code',
                method: DisplayMethod.SIDEBAR
            }
        ], {
            placeHolder: 'Choose how to display the Drawing Canvas',
            title: 'VSS Display Method'
        });

        if (choice) {
            try {
                await this.switchDisplayMethod(choice.method);
                
                // Update user preference
                const config = vscode.workspace.getConfiguration('vss');
                await config.update('webview.preferredDisplayMethod', 
                    choice.method === DisplayMethod.PANEL ? 'panel' : 'sidebar', 
                    vscode.ConfigurationTarget.Global
                );
                
                vscode.window.showInformationMessage(
                    `Drawing Canvas opened in ${choice.method} view`
                );
            } catch (error) {
                vscode.window.showErrorMessage(
                    `Failed to open in ${choice.method} view: ${error}`
                );
            }
        }
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
 * Logger interface - this should match the existing VSSLogger class
 * This is a minimal interface to avoid circular dependencies
 */
interface VSSLogger {
    info(message: string, context?: any): void;
    warn(message: string, context?: any): void;
    error(message: string, context?: any): void;
    debug(message: string, context?: any): void;
}

// VSSLogger will be injected from the main extension to avoid circular dependencies

// Export DisplayMethod enum for use by other modules
export { DisplayMethod };