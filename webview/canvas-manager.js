/**
 * VSSCanvasManager - Robust initialization and cleanup system for VSS Canvas
 * 
 * This class manages canvas initialization, state, and cleanup to prevent
 * variable redeclaration errors and ensure proper webview lifecycle management.
 */

class VSSCanvasManager {
    constructor() {
        this.initialized = false;
        this.canvas = null;
        this.ctx = null;
        this.isDrawing = false;
        this.currentTool = 'pen';
        this.lastX = 0;
        this.lastY = 0;
        
        // Event listener tracking for proper cleanup
        this.eventListeners = [];
        
        // Timeout and interval tracking
        this.initializationTimeout = null;
        this.connectionCheckInterval = null;
        
        // Connection state
        this.lastMessageTime = Date.now();
        
        // VS Code API reference
        this.vscode = null;
        
        // DOM element references
        this.loadingScreen = null;
        this.errorScreen = null;
        this.loadingStatus = null;
        
        // Error recovery manager
        this.errorRecoveryManager = null;
        
        // Error notification system
        this.errorNotificationSystem = null;
        
        console.log('VSSCanvasManager instance created');
    }
    
    /**
     * Initialize the canvas manager and all its components
     * @param {number} timeout - Initialization timeout in milliseconds (default: 10000)
     * @returns {Promise<boolean>} - Success status
     */
    async init(timeout = 10000) {
        try {
            console.log('VSSCanvasManager: Starting initialization...');
            
            // Initialize error recovery manager if not already done
            if (!this.errorRecoveryManager && window.ErrorRecoveryManager) {
                this.errorRecoveryManager = new window.ErrorRecoveryManager(this);
                console.log('VSSCanvasManager: Error recovery manager initialized');
            }
            
            // Initialize error notification system if not already done
            if (!this.errorNotificationSystem && window.ErrorNotificationSystem) {
                this.errorNotificationSystem = new window.ErrorNotificationSystem();
                console.log('VSSCanvasManager: Error notification system initialized');
            }
            
            // Cleanup any existing instance
            if (this.initialized) {
                console.log('VSSCanvasManager: Already initialized, cleaning up first...');
                await this.cleanup();
            }
            
            // Set initialization timeout
            this.initializationTimeout = setTimeout(() => {
                if (!this.initialized) {
                    const timeoutError = new Error('Initialization timeout - Canvas failed to load within ' + (timeout / 1000) + ' seconds');
                    this.handleInitializationError(timeoutError);
                }
            }, timeout);
            
            // Initialize VS Code API using centralized manager
            if (window.vscodeAPIManager) {
                // Use VSCodeAPIManager for centralized API access
                const api = window.vscodeAPIManager.getAPI();
                if (api) {
                    console.log('VSSCanvasManager: Using VS Code API from centralized manager');
                    this.vscode = api;
                } else {
                    console.log('VSSCanvasManager: Waiting for VS Code API to become available...');
                    this.vscode = null;
                    
                    // Register callback for when API becomes ready
                    window.vscodeAPIManager.onAPIReady((api) => {
                        if (api) {
                            console.log('VSSCanvasManager: VS Code API ready via callback');
                            this.vscode = api;
                        }
                    });
                }
            } else {
                console.warn('VSSCanvasManager: VSCodeAPIManager not available, falling back to direct acquisition');
                // Fallback to direct acquisition (should be avoided)
                if (!window.vscodeApi && typeof acquireVsCodeApi === 'function') {
                    window.vscodeApi = acquireVsCodeApi();
                    console.log('VSSCanvasManager: VS Code API acquired directly (fallback)');
                }
                this.vscode = window.vscodeApi || null;
            }
            
            // Get DOM element references
            this.getDOMReferences();
            
            // Initialize components step by step
            this.updateLoadingStatus('Initializing canvas...');
            await this.initializeCanvas();
            
            this.updateLoadingStatus('Setting up drawing tools...');
            await this.setupEventListeners();
            
            this.updateLoadingStatus('Establishing connection...');
            await this.setupMessagePassing();
            
            this.updateLoadingStatus('Starting connection monitoring...');
            this.startConnectionMonitoring();
            
            // Mark as initialized
            this.initialized = true;
            clearTimeout(this.initializationTimeout);
            this.initializationTimeout = null;
            
            this.updateLoadingStatus('Canvas ready!');
            console.log('VSSCanvasManager: Initialization completed successfully');
            
            // Hide loading screen after a short delay
            setTimeout(() => {
                this.hideLoadingScreen();
            }, 500);
            
            return true;
            
        } catch (error) {
            console.error('VSSCanvasManager: Initialization failed:', error);
            
            // Clear the initialization timeout since we're handling the error
            if (this.initializationTimeout) {
                clearTimeout(this.initializationTimeout);
                this.initializationTimeout = null;
            }
            
            // Use error recovery manager if available
            if (this.errorRecoveryManager) {
                const recovered = await this.errorRecoveryManager.handleError(error);
                if (recovered) {
                    return true;
                }
            } else {
                // Fallback to legacy error recovery
                const recovered = await this.recoverFromError(error);
                if (recovered) {
                    return true;
                }
            }
            
            // If recovery failed, show error screen
            this.handleInitializationError(error);
            return false;
        }
    }
    
    /**
     * Clean up all resources and reset state
     * @returns {Promise<void>}
     */
    async cleanup() {
        console.log('VSSCanvasManager: Starting cleanup...');
        
        // Clear timeouts and intervals
        if (this.initializationTimeout) {
            clearTimeout(this.initializationTimeout);
            this.initializationTimeout = null;
        }
        
        if (this.connectionCheckInterval) {
            clearInterval(this.connectionCheckInterval);
            this.connectionCheckInterval = null;
        }
        
        // Remove all tracked event listeners
        this.removeAllEventListeners();
        
        // Clear canvas if it exists
        if (this.ctx && this.canvas) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
        
        // Reset state
        this.initialized = false;
        this.canvas = null;
        this.ctx = null;
        this.isDrawing = false;
        this.currentTool = 'pen';
        this.lastX = 0;
        this.lastY = 0;
        
        // Reset DOM references
        this.loadingScreen = null;
        this.errorScreen = null;
        this.loadingStatus = null;
        
        console.log('VSSCanvasManager: Cleanup completed');
    }
    
    /**
     * Force reinitialization of the canvas manager
     * @returns {Promise<boolean>} - Success status
     */
    async reinitialize() {
        console.log('VSSCanvasManager: Reinitializing...');
        await this.cleanup();
        return await this.init();
    }
    
    /**
     * Get DOM element references
     */
    getDOMReferences() {
        this.loadingScreen = document.getElementById('loading-screen');
        this.errorScreen = document.getElementById('error-screen');
        this.loadingStatus = document.getElementById('loading-status');
        
        if (!this.loadingScreen || !this.errorScreen) {
            throw new Error('Required DOM elements not found');
        }
    }
    
    /**
     * Initialize the canvas element and drawing context
     */
    async initializeCanvas() {
        this.canvas = document.getElementById('drawing-canvas');
        if (!this.canvas) {
            throw new Error('Canvas element not found in DOM');
        }
        
        this.ctx = this.canvas.getContext('2d');
        if (!this.ctx) {
            throw new Error('Failed to get 2D rendering context from canvas');
        }
        
        // Set canvas size to fill container
        this.resizeCanvas();
        
        // Set default drawing properties
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        this.ctx.strokeStyle = '#000000';
        this.ctx.lineWidth = 2;
        
        console.log('VSSCanvasManager: Canvas initialized successfully');
    }
    
    /**
     * Set up all event listeners with proper tracking
     */
    async setupEventListeners() {
        // Window resize
        this.addEventListener(window, 'resize', () => this.resizeCanvas());
        
        // Tool buttons
        document.querySelectorAll('.tool-button[data-tool]').forEach(button => {
            this.addEventListener(button, 'click', () => {
                this.selectTool(button.dataset.tool);
            });
        });
        
        // Clear canvas button
        const clearButton = document.getElementById('clear-canvas');
        if (clearButton) {
            this.addEventListener(clearButton, 'click', () => this.clearCanvas());
        }
        
        // Mouse events for drawing
        this.addEventListener(this.canvas, 'mousedown', (e) => this.startDrawing(e));
        this.addEventListener(this.canvas, 'mousemove', (e) => this.draw(e));
        this.addEventListener(this.canvas, 'mouseup', () => this.stopDrawing());
        this.addEventListener(this.canvas, 'mouseout', () => this.stopDrawing());
        
        // Touch events for mobile/tablet support
        this.addEventListener(this.canvas, 'touchstart', (e) => this.handleTouch(e));
        this.addEventListener(this.canvas, 'touchmove', (e) => this.handleTouch(e));
        this.addEventListener(this.canvas, 'touchend', () => this.stopDrawing());
        
        // Global error handlers
        this.addEventListener(window, 'error', (e) => this.handleGlobalError(e));
        this.addEventListener(window, 'unhandledrejection', (e) => this.handleUnhandledRejection(e));
        
        // Cleanup on unload
        this.addEventListener(window, 'beforeunload', () => this.cleanup());
        
        console.log('VSSCanvasManager: Event listeners set up successfully');
    }
    
    /**
     * Set up message passing with VS Code extension
     */
    async setupMessagePassing() {
        // Listen for messages from VS Code extension
        this.addEventListener(window, 'message', (event) => {
            this.lastMessageTime = Date.now();
            this.updateConnectionStatus(true);
            
            const message = event.data;
            this.handleExtensionMessage(message);
        });
        
        // Send initial ready message to extension
        this.sendMessage({
            command: 'canvasReady',
            data: {
                width: this.canvas.width,
                height: this.canvas.height,
                timestamp: new Date().toISOString()
            }
        });
        
        console.log('VSSCanvasManager: Message passing set up successfully');
    }
    
    /**
     * Add event listener with tracking for cleanup
     * @param {EventTarget} element - Element to add listener to
     * @param {string} event - Event type
     * @param {Function} handler - Event handler function
     * @param {Object} options - Event listener options
     */
    addEventListener(element, event, handler, options = {}) {
        element.addEventListener(event, handler, options);
        this.eventListeners.push({ element, event, handler, options });
    }
    
    /**
     * Remove all tracked event listeners
     */
    removeAllEventListeners() {
        console.log(`VSSCanvasManager: Removing ${this.eventListeners.length} event listeners`);
        
        this.eventListeners.forEach(({ element, event, handler }) => {
            try {
                element.removeEventListener(event, handler);
            } catch (error) {
                console.warn('VSSCanvasManager: Error removing event listener:', error);
            }
        });
        
        this.eventListeners = [];
    }
    
    /**
     * Start connection monitoring
     */
    startConnectionMonitoring() {
        this.connectionCheckInterval = setInterval(() => {
            const timeSinceLastMessage = Date.now() - this.lastMessageTime;
            const isConnected = timeSinceLastMessage < 30000; // 30 seconds timeout
            this.updateConnectionStatus(isConnected);
        }, 5000);
        
        console.log('VSSCanvasManager: Connection monitoring started');
    }
    
    /**
     * Update loading status message
     * @param {string} message - Status message
     */
    updateLoadingStatus(message) {
        if (this.loadingStatus) {
            this.loadingStatus.textContent = message;
        }
        console.log('VSSCanvasManager Loading:', message);
    }
    
    /**
     * Show error screen with message and stack trace
     * @param {string} message - Error message
     * @param {string} stack - Error stack trace
     */
    showError(message, stack) {
        console.error('VSSCanvasManager Error:', message, stack);
        
        if (this.errorScreen) {
            const errorMessage = document.getElementById('error-message');
            const errorStackElement = document.getElementById('error-stack');
            
            if (errorMessage) {
                errorMessage.textContent = message;
            }
            
            if (errorStackElement && stack) {
                errorStackElement.textContent = stack;
            }
            
            this.errorScreen.style.display = 'flex';
        }
        
        if (this.loadingScreen) {
            this.loadingScreen.style.display = 'none';
        }
        
        // Set up retry functionality when showing error
        this.setupRetryFunctionality();
        
        // Send error to extension
        this.sendMessage({
            command: 'error',
            data: {
                message: message,
                stack: stack,
                source: 'webview-initialization',
                timestamp: new Date().toISOString(),
                canvasState: this.getState()
            }
        });
    }
    
    /**
     * Hide loading screen and show canvas
     */
    hideLoadingScreen() {
        if (this.loadingScreen) {
            this.loadingScreen.style.display = 'none';
        }
        
        this.updateStatus('Canvas initialized successfully');
        
        // Send ready message to extension
        this.sendMessage({
            command: 'canvasReady',
            data: {
                timestamp: new Date().toISOString(),
                width: this.canvas ? this.canvas.width : 0,
                height: this.canvas ? this.canvas.height : 0
            }
        });
    }
    
    /**
     * Resize canvas to fit container
     */
    resizeCanvas() {
        if (!this.canvas) return;
        
        const container = document.getElementById('canvas-container');
        const statusHeight = document.getElementById('status')?.offsetHeight || 0;
        
        this.canvas.width = container.clientWidth;
        this.canvas.height = container.clientHeight - statusHeight;
        
        // Restore drawing properties after resize
        if (this.ctx) {
            this.ctx.lineCap = 'round';
            this.ctx.lineJoin = 'round';
            this.ctx.strokeStyle = '#000000';
            this.ctx.lineWidth = 2;
        }
    }
    
    /**
     * Handle messages from VS Code extension
     * @param {Object} message - Message from extension
     */
    handleExtensionMessage(message) {
        switch (message.command) {
            case 'clearCanvas':
                this.clearCanvas();
                break;
            case 'setTool':
                this.selectTool(message.tool);
                break;
            case 'connectionStatus':
                this.updateConnectionStatus(message.connected);
                break;
            default:
                console.log('VSSCanvasManager: Unknown message:', message);
        }
    }
    
    /**
     * Handle global errors
     * @param {ErrorEvent} e - Error event
     */
    handleGlobalError(e) {
        if (!this.initialized) {
            this.showError('Initialization Error: ' + e.message, e.error ? e.error.stack : null);
        } else {
            this.sendMessage({
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
    }
    
    /**
     * Handle unhandled promise rejections
     * @param {PromiseRejectionEvent} e - Promise rejection event
     */
    handleUnhandledRejection(e) {
        const message = 'Unhandled Promise Rejection: ' + (e.reason ? e.reason.toString() : 'Unknown');
        if (!this.initialized) {
            this.showError(message, e.reason ? e.reason.stack : null);
        } else {
            this.sendMessage({
                command: 'error',
                data: {
                    message: message,
                    stack: e.reason ? e.reason.stack : null
                }
            });
        }
    }
    
    /**
     * Send message to VS Code extension
     * @param {Object} message - Message to send
     */
    sendMessage(message) {
        try {
            if (this.vscode) {
                this.vscode.postMessage(message);
            } else {
                console.warn('VSSCanvasManager: VS Code API not available');
            }
        } catch (error) {
            console.error('VSSCanvasManager: Error sending message to extension:', error);
            this.updateStatus('Communication error with extension');
            
            // If we're not initialized yet, show error screen
            if (!this.initialized) {
                this.showError('Failed to communicate with VS Code extension: ' + error.message, error.stack);
            }
        }
    }
    
    /**
     * Select drawing tool
     * @param {string} tool - Tool name ('pen' or 'eraser')
     */
    selectTool(tool) {
        this.currentTool = tool;
        
        // Update button states
        document.querySelectorAll('.tool-button[data-tool]').forEach(button => {
            button.classList.remove('active');
        });
        
        const toolButton = document.querySelector(`[data-tool="${tool}"]`);
        if (toolButton) {
            toolButton.classList.add('active');
        }
        
        // Update cursor
        if (this.canvas) {
            this.canvas.style.cursor = tool === 'eraser' ? 'grab' : 'crosshair';
        }
        
        this.updateStatus(`Selected tool: ${tool}`);
        
        // Notify extension of tool change
        this.sendMessage({
            command: 'toolChanged',
            data: { tool: tool }
        });
    }
    
    /**
     * Start drawing operation
     * @param {MouseEvent} e - Mouse event
     */
    startDrawing(e) {
        this.isDrawing = true;
        [this.lastX, this.lastY] = this.getMousePos(e);
        
        // Start new path
        this.ctx.beginPath();
        this.ctx.moveTo(this.lastX, this.lastY);
        
        this.sendMessage({
            command: 'drawingStarted',
            data: { 
                tool: this.currentTool,
                x: this.lastX, 
                y: this.lastY 
            }
        });
    }
    
    /**
     * Continue drawing operation
     * @param {MouseEvent} e - Mouse event
     */
    draw(e) {
        if (!this.isDrawing) return;
        
        const [currentX, currentY] = this.getMousePos(e);
        
        if (this.currentTool === 'pen') {
            this.ctx.globalCompositeOperation = 'source-over';
            this.ctx.strokeStyle = '#000000';
            this.ctx.lineWidth = 2;
        } else if (this.currentTool === 'eraser') {
            this.ctx.globalCompositeOperation = 'destination-out';
            this.ctx.lineWidth = 10;
        }
        
        this.ctx.lineTo(currentX, currentY);
        this.ctx.stroke();
        
        [this.lastX, this.lastY] = [currentX, currentY];
        
        // Send drawing data to extension (throttled)
        if (Math.random() < 0.1) { // Only send 10% of drawing events to avoid spam
            this.sendMessage({
                command: 'drawing',
                data: {
                    tool: this.currentTool,
                    x: currentX,
                    y: currentY,
                    lastX: this.lastX,
                    lastY: this.lastY
                }
            });
        }
    }
    
    /**
     * Stop drawing operation
     */
    stopDrawing() {
        if (!this.isDrawing) return;
        
        this.isDrawing = false;
        this.ctx.beginPath(); // Reset path
        
        this.sendMessage({
            command: 'drawingEnded',
            data: { tool: this.currentTool }
        });
    }
    
    /**
     * Handle touch events
     * @param {TouchEvent} e - Touch event
     */
    handleTouch(e) {
        e.preventDefault();
        
        const touch = e.touches[0];
        const mouseEvent = new MouseEvent(e.type === 'touchstart' ? 'mousedown' : 
                                        e.type === 'touchmove' ? 'mousemove' : 'mouseup', {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
        
        this.canvas.dispatchEvent(mouseEvent);
    }
    
    /**
     * Get mouse position relative to canvas
     * @param {MouseEvent} e - Mouse event
     * @returns {Array<number>} - [x, y] coordinates
     */
    getMousePos(e) {
        const rect = this.canvas.getBoundingClientRect();
        return [
            e.clientX - rect.left,
            e.clientY - rect.top
        ];
    }
    
    /**
     * Clear the canvas
     */
    clearCanvas() {
        if (this.ctx && this.canvas) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.updateStatus('Canvas cleared');
            
            this.sendMessage({
                command: 'canvasCleared',
                data: {}
            });
        }
    }
    
    /**
     * Update status message
     * @param {string} message - Status message
     */
    updateStatus(message) {
        const statusElement = document.getElementById('status');
        if (statusElement) {
            const statusText = statusElement.querySelector('span:first-child');
            if (statusText) {
                statusText.textContent = `VSS Drawing Canvas - ${message}`;
            }
        }
    }
    
    /**
     * Update connection status display
     * @param {boolean} connected - Connection status
     */
    updateConnectionStatus(connected) {
        const statusElement = document.getElementById('connection-status');
        if (statusElement) {
            statusElement.textContent = connected ? 'Connected' : 'Disconnected';
            statusElement.className = `connection-status ${connected ? 'connected' : 'disconnected'}`;
        }
    }
    
    /**
     * Get current state of the canvas manager
     * @returns {Object} - Current state
     */
    getState() {
        return {
            initialized: this.initialized,
            isDrawing: this.isDrawing,
            currentTool: this.currentTool,
            canvasSize: this.canvas ? { width: this.canvas.width, height: this.canvas.height } : null,
            eventListenerCount: this.eventListeners.length,
            hasTimeout: !!this.initializationTimeout,
            hasConnectionMonitoring: !!this.connectionCheckInterval
        };
    }
    
    /**
     * Check if canvas manager is properly initialized
     * @returns {boolean} - Initialization status
     */
    isInitialized() {
        return this.initialized && this.canvas && this.ctx;
    }
    
    /**
     * Set up retry functionality for error recovery
     */
    setupRetryFunctionality() {
        const retryButton = document.getElementById('retry-button');
        const reportButton = document.getElementById('report-button');
        
        if (retryButton) {
            // Remove existing listeners to prevent duplicates
            const existingRetryListener = this.eventListeners.find(
                listener => listener.element === retryButton && listener.event === 'click'
            );
            if (existingRetryListener) {
                retryButton.removeEventListener('click', existingRetryListener.handler);
                this.eventListeners = this.eventListeners.filter(listener => listener !== existingRetryListener);
            }
            
            // Add new retry listener
            this.addEventListener(retryButton, 'click', async () => {
                console.log('VSSCanvasManager: Retry button clicked');
                
                // Hide error screen and show loading screen
                if (this.errorScreen) {
                    this.errorScreen.style.display = 'none';
                }
                if (this.loadingScreen) {
                    this.loadingScreen.style.display = 'flex';
                }
                
                // Attempt reinitialization
                const success = await this.reinitialize();
                if (!success) {
                    console.warn('VSSCanvasManager: Retry failed, falling back to page reload');
                    // If reinitialization fails, reload the page as last resort
                    window.location.reload();
                }
            });
        }
        
        if (reportButton) {
            // Remove existing listeners to prevent duplicates
            const existingReportListener = this.eventListeners.find(
                listener => listener.element === reportButton && listener.event === 'click'
            );
            if (existingReportListener) {
                reportButton.removeEventListener('click', existingReportListener.handler);
                this.eventListeners = this.eventListeners.filter(listener => listener !== existingReportListener);
            }
            
            // Add new report listener
            this.addEventListener(reportButton, 'click', () => {
                console.log('VSSCanvasManager: Report button clicked');
                this.sendMessage({
                    command: 'reportIssue',
                    data: {
                        source: 'webview-error-screen',
                        timestamp: new Date().toISOString(),
                        state: this.getState()
                    }
                });
            });
        }
    }
    
    /**
     * Handle different types of initialization errors with specific recovery strategies
     * @param {Error} error - The error that occurred
     * @returns {boolean} - Whether recovery was attempted
     */
    handleInitializationError(error) {
        console.error('VSSCanvasManager: Handling initialization error:', error);
        
        // Determine error type and recovery strategy
        let errorType = 'UNKNOWN';
        let recoverable = false;
        let recoveryMessage = '';
        
        if (error.message.includes('Canvas element not found')) {
            errorType = 'CANVAS_NOT_FOUND';
            recoverable = true;
            recoveryMessage = 'Canvas element missing. Will retry initialization.';
        } else if (error.message.includes('Failed to get 2D rendering context')) {
            errorType = 'CONTEXT_ERROR';
            recoverable = true;
            recoveryMessage = 'Canvas context error. Will attempt to recreate canvas.';
        } else if (error.message.includes('Required DOM elements not found')) {
            errorType = 'DOM_ERROR';
            recoverable = false;
            recoveryMessage = 'Critical DOM elements missing. Page reload required.';
        } else if (error.message.includes('timeout')) {
            errorType = 'TIMEOUT';
            recoverable = true;
            recoveryMessage = 'Initialization timeout. You can retry with extended timeout.';
        } else if (error.message.includes('already been declared')) {
            errorType = 'DUPLICATE_DECLARATION';
            recoverable = true;
            recoveryMessage = 'Variable conflict detected. Will cleanup and retry.';
        }
        
        // Log error details
        console.log(`VSSCanvasManager: Error type: ${errorType}, Recoverable: ${recoverable}`);
        
        // Use enhanced error notification system if available
        if (this.errorNotificationSystem) {
            this.errorNotificationSystem.showEnhancedError(errorType, error, {
                recoverable: recoverable,
                recoveryMessage: recoveryMessage
            });
        } else {
            // Fallback to legacy error display
            const fullMessage = `${error.message}\n\nRecovery: ${recoveryMessage}`;
            this.showError(fullMessage, error.stack);
            this.setupRetryFunctionality();
        }
        
        return recoverable;
    }
    
    /**
     * Enhanced error recovery with automatic retry for certain error types
     * @param {Error} error - The error to recover from
     * @param {number} retryCount - Current retry attempt (default: 0)
     * @param {number} maxRetries - Maximum retry attempts (default: 3)
     * @returns {Promise<boolean>} - Whether recovery was successful
     */
    async recoverFromError(error, retryCount = 0, maxRetries = 3) {
        console.log(`VSSCanvasManager: Attempting error recovery (attempt ${retryCount + 1}/${maxRetries})`);
        
        if (retryCount >= maxRetries) {
            console.error('VSSCanvasManager: Max retry attempts reached');
            this.handleInitializationError(error);
            return false;
        }
        
        // Determine if this error type supports automatic recovery
        const autoRecoverableErrors = [
            'Canvas element not found',
            'Failed to get 2D rendering context',
            'already been declared'
        ];
        
        const isAutoRecoverable = autoRecoverableErrors.some(errorText => 
            error.message.includes(errorText)
        );
        
        if (!isAutoRecoverable) {
            console.log('VSSCanvasManager: Error not auto-recoverable, showing error screen');
            this.handleInitializationError(error);
            return false;
        }
        
        try {
            // Wait before retry (exponential backoff)
            const delay = Math.min(1000 * Math.pow(2, retryCount), 5000);
            console.log(`VSSCanvasManager: Waiting ${delay}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            
            // Attempt recovery based on error type
            if (error.message.includes('already been declared')) {
                // For duplicate declaration errors, cleanup and reinitialize
                await this.cleanup();
                return await this.init();
            } else if (error.message.includes('Canvas element not found') || 
                      error.message.includes('Failed to get 2D rendering context')) {
                // For canvas-related errors, try to reinitialize
                return await this.reinitialize();
            }
            
            return false;
            
        } catch (recoveryError) {
            console.error('VSSCanvasManager: Recovery attempt failed:', recoveryError);
            return await this.recoverFromError(error, retryCount + 1, maxRetries);
        }
    }
}