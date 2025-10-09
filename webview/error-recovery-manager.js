/**
 * Error Recovery Manager for VSS Canvas Initialization
 * 
 * Handles initialization failures with specific recovery strategies,
 * automatic retry mechanisms, and user-initiated recovery options.
 */

(function() {
    'use strict';
    
    // Check if ErrorRecoveryManager already exists
    if (window.ErrorRecoveryManager) {
        console.log('ErrorRecoveryManager already exists, skipping redefinition');
        return;
    }

    class ErrorRecoveryManager {
        constructor(canvasManager) {
            this.canvasManager = canvasManager;
            this.recoveryStrategies = new Map();
            this.retryAttempts = new Map();
            this.maxRetries = 3;
            this.retryDelay = 1000; // Base delay in milliseconds
            this.isRecovering = false;
            
            this.setupRecoveryStrategies();
            console.log('ErrorRecoveryManager: Initialized with recovery strategies');
        }
        
        /**
         * Setup recovery strategies for different error types
         */
        setupRecoveryStrategies() {
            // Duplicate declaration error - most common initialization error
            this.recoveryStrategies.set('DUPLICATE_DECLARATION', {
                strategy: 'cleanup_and_reinit',
                message: 'Variable conflict detected. Cleaning up and reinitializing...',
                autoRecover: true,
                maxRetries: 2,
                action: async () => {
                    console.log('ErrorRecoveryManager: Executing cleanup and reinit strategy');
                    if (this.canvasManager) {
                        await this.canvasManager.cleanup();
                        return await this.canvasManager.init();
                    }
                    return false;
                }
            });
            
            // Canvas element not found
            this.recoveryStrategies.set('CANVAS_NOT_FOUND', {
                strategy: 'wait_and_retry',
                message: 'Canvas element missing. Waiting for DOM to load...',
                autoRecover: true,
                maxRetries: 3,
                retryDelay: 2000,
                action: async () => {
                    console.log('ErrorRecoveryManager: Waiting for DOM and retrying canvas initialization');
                    // Wait for DOM to be fully loaded
                    await this.waitForDOM();
                    // Check if canvas element exists now
                    const canvas = document.getElementById('drawing-canvas');
                    if (canvas) {
                        return await this.canvasManager.init();
                    }
                    return false;
                }
            });
            
            // Canvas context error
            this.recoveryStrategies.set('CONTEXT_ERROR', {
                strategy: 'recreate_canvas',
                message: 'Canvas context error. Recreating canvas element...',
                autoRecover: true,
                maxRetries: 2,
                action: async () => {
                    console.log('ErrorRecoveryManager: Recreating canvas element');
                    return await this.recreateCanvasElement();
                }
            });
            
            // DOM elements missing
            this.recoveryStrategies.set('DOM_ERROR', {
                strategy: 'reload_page',
                message: 'Critical DOM elements missing. Page reload required.',
                autoRecover: false,
                showReloadButton: true,
                action: async () => {
                    console.log('ErrorRecoveryManager: DOM error requires page reload');
                    return false; // Cannot auto-recover, requires user action
                }
            });
            
            // Initialization timeout
            this.recoveryStrategies.set('TIMEOUT', {
                strategy: 'extended_timeout_retry',
                message: 'Initialization timeout. Retrying with extended timeout...',
                autoRecover: true,
                maxRetries: 2,
                extendedTimeout: 20000, // 20 seconds
                action: async () => {
                    console.log('ErrorRecoveryManager: Retrying with extended timeout');
                    if (this.canvasManager) {
                        await this.canvasManager.cleanup();
                        return await this.canvasManager.init(this.recoveryStrategies.get('TIMEOUT').extendedTimeout);
                    }
                    return false;
                }
            });
            
            // VS Code API not available
            this.recoveryStrategies.set('VSCODE_API_ERROR', {
                strategy: 'fallback_mode',
                message: 'VS Code API unavailable. Running in standalone mode...',
                autoRecover: true,
                maxRetries: 1,
                action: async () => {
                    console.log('ErrorRecoveryManager: Falling back to standalone mode');
                    // Initialize without VS Code API dependency
                    return await this.initializeStandaloneMode();
                }
            });
            
            // Memory/resource error
            this.recoveryStrategies.set('MEMORY_ERROR', {
                strategy: 'cleanup_and_retry',
                message: 'Memory error detected. Cleaning up resources and retrying...',
                autoRecover: true,
                maxRetries: 1,
                action: async () => {
                    console.log('ErrorRecoveryManager: Cleaning up memory and retrying');
                    await this.performMemoryCleanup();
                    if (this.canvasManager) {
                        return await this.canvasManager.init();
                    }
                    return false;
                }
            });
            
            // Generic unknown error
            this.recoveryStrategies.set('UNKNOWN', {
                strategy: 'generic_retry',
                message: 'Unknown error occurred. Attempting generic recovery...',
                autoRecover: true,
                maxRetries: 1,
                action: async () => {
                    console.log('ErrorRecoveryManager: Attempting generic recovery');
                    if (this.canvasManager) {
                        await this.canvasManager.cleanup();
                        // Wait a bit before retrying
                        await new Promise(resolve => setTimeout(resolve, 2000));
                        return await this.canvasManager.init();
                    }
                    return false;
                }
            });
        }
        
        /**
         * Handle initialization error with appropriate recovery strategy
         * @param {Error} error - The error that occurred
         * @param {number} retryCount - Current retry attempt (default: 0)
         * @returns {Promise<boolean>} - Whether recovery was successful
         */
        async handleError(error, retryCount = 0) {
            if (this.isRecovering) {
                console.log('ErrorRecoveryManager: Recovery already in progress, skipping');
                return false;
            }
            
            this.isRecovering = true;
            
            try {
                console.log(`ErrorRecoveryManager: Handling error (attempt ${retryCount + 1}):`, error.message);
                
                // Determine error type
                const errorType = this.classifyError(error);
                console.log(`ErrorRecoveryManager: Classified error as: ${errorType}`);
                
                // Get recovery strategy
                const strategy = this.recoveryStrategies.get(errorType);
                if (!strategy) {
                    console.warn(`ErrorRecoveryManager: No recovery strategy found for error type: ${errorType}`);
                    return false;
                }
                
                // Check if we've exceeded max retries for this error type
                const currentRetries = this.retryAttempts.get(errorType) || 0;
                const maxRetries = strategy.maxRetries || this.maxRetries;
                
                if (currentRetries >= maxRetries) {
                    console.log(`ErrorRecoveryManager: Max retries (${maxRetries}) exceeded for ${errorType}`);
                    this.showFinalErrorMessage(error, strategy);
                    return false;
                }
                
                // Increment retry count
                this.retryAttempts.set(errorType, currentRetries + 1);
                
                // Show recovery message to user
                this.showRecoveryMessage(strategy.message);
                
                // Attempt automatic recovery if enabled
                if (strategy.autoRecover) {
                    console.log(`ErrorRecoveryManager: Attempting automatic recovery using strategy: ${strategy.strategy}`);
                    
                    // Calculate delay with exponential backoff
                    const delay = this.calculateRetryDelay(currentRetries, strategy.retryDelay);
                    if (delay > 0) {
                        console.log(`ErrorRecoveryManager: Waiting ${delay}ms before retry...`);
                        await new Promise(resolve => setTimeout(resolve, delay));
                    }
                    
                    // Execute recovery action
                    const success = await strategy.action();
                    
                    if (success) {
                        console.log(`ErrorRecoveryManager: Recovery successful for ${errorType}`);
                        this.retryAttempts.delete(errorType); // Reset retry count on success
                        this.hideRecoveryMessage();
                        return true;
                    } else {
                        console.log(`ErrorRecoveryManager: Recovery failed for ${errorType}, will retry if attempts remain`);
                        
                        // If we still have retries left, try again
                        if (currentRetries + 1 < maxRetries) {
                            return await this.handleError(error, retryCount + 1);
                        }
                    }
                }
                
                // If auto-recovery failed or is disabled, show manual recovery options
                this.showManualRecoveryOptions(error, strategy);
                return false;
                
            } catch (recoveryError) {
                console.error('ErrorRecoveryManager: Recovery process failed:', recoveryError);
                this.showFinalErrorMessage(error, null);
                return false;
            } finally {
                this.isRecovering = false;
            }
        }
        
        /**
         * Classify error based on error message and context
         * @param {Error} error - The error to classify
         * @returns {string} - Error type
         */
        classifyError(error) {
            const message = error.message.toLowerCase();
            
            if (message.includes('already been declared') || message.includes('identifier') && message.includes('declared')) {
                return 'DUPLICATE_DECLARATION';
            }
            
            if (message.includes('canvas element not found') || message.includes('drawing-canvas')) {
                return 'CANVAS_NOT_FOUND';
            }
            
            if (message.includes('failed to get 2d rendering context') || message.includes('context')) {
                return 'CONTEXT_ERROR';
            }
            
            if (message.includes('required dom elements not found') || message.includes('dom')) {
                return 'DOM_ERROR';
            }
            
            if (message.includes('timeout') || message.includes('failed to load')) {
                return 'TIMEOUT';
            }
            
            if (message.includes('vscode') || message.includes('acquirevscodapi')) {
                return 'VSCODE_API_ERROR';
            }
            
            if (message.includes('memory') || message.includes('out of memory')) {
                return 'MEMORY_ERROR';
            }
            
            return 'UNKNOWN';
        }
        
        /**
         * Calculate retry delay with exponential backoff
         * @param {number} retryCount - Current retry attempt
         * @param {number} baseDelay - Base delay from strategy (optional)
         * @returns {number} - Delay in milliseconds
         */
        calculateRetryDelay(retryCount, baseDelay = null) {
            const delay = baseDelay || this.retryDelay;
            return Math.min(delay * Math.pow(2, retryCount), 10000); // Max 10 seconds
        }
        
        /**
         * Wait for DOM to be fully loaded
         * @returns {Promise<void>}
         */
        waitForDOM() {
            return new Promise((resolve) => {
                if (document.readyState === 'complete') {
                    resolve();
                } else {
                    const checkReady = () => {
                        if (document.readyState === 'complete') {
                            resolve();
                        } else {
                            setTimeout(checkReady, 100);
                        }
                    };
                    checkReady();
                }
            });
        }
        
        /**
         * Recreate canvas element if it's corrupted
         * @returns {Promise<boolean>}
         */
        async recreateCanvasElement() {
            try {
                const container = document.getElementById('canvas-container');
                if (!container) {
                    console.error('ErrorRecoveryManager: Canvas container not found');
                    return false;
                }
                
                // Remove existing canvas if it exists
                const existingCanvas = document.getElementById('drawing-canvas');
                if (existingCanvas) {
                    existingCanvas.remove();
                }
                
                // Create new canvas element
                const newCanvas = document.createElement('canvas');
                newCanvas.id = 'drawing-canvas';
                newCanvas.style.cssText = `
                    flex: 1;
                    background: white;
                    cursor: crosshair;
                    touch-action: none;
                    user-select: none;
                    -webkit-user-select: none;
                    -moz-user-select: none;
                    -ms-user-select: none;
                `;
                
                container.appendChild(newCanvas);
                
                console.log('ErrorRecoveryManager: Canvas element recreated');
                
                // Reinitialize canvas manager
                if (this.canvasManager) {
                    return await this.canvasManager.init();
                }
                
                return true;
            } catch (error) {
                console.error('ErrorRecoveryManager: Failed to recreate canvas element:', error);
                return false;
            }
        }
        
        /**
         * Initialize standalone mode without VS Code API
         * @returns {Promise<boolean>}
         */
        async initializeStandaloneMode() {
            try {
                console.log('ErrorRecoveryManager: Initializing standalone mode');
                
                // Mock VS Code API for standalone operation
                if (!window.acquireVsCodeApi) {
                    window.acquireVsCodeApi = () => ({
                        postMessage: (message) => {
                            console.log('Mock VS Code API - Message:', message);
                        }
                    });
                }
                
                // Initialize canvas manager in standalone mode
                if (this.canvasManager) {
                    return await this.canvasManager.init();
                }
                
                return true;
            } catch (error) {
                console.error('ErrorRecoveryManager: Failed to initialize standalone mode:', error);
                return false;
            }
        }
        
        /**
         * Perform memory cleanup
         * @returns {Promise<void>}
         */
        async performMemoryCleanup() {
            try {
                console.log('ErrorRecoveryManager: Performing memory cleanup');
                
                // Clear any cached data
                if (window.canvasCache) {
                    window.canvasCache.clear();
                }
                
                // Clear undo/redo history if it exists
                if (window.canvasHistory) {
                    window.canvasHistory.clear();
                }
                
                // Force garbage collection if available
                if (window.gc) {
                    window.gc();
                }
                
                // Clear any large objects from memory
                if (window.imageData) {
                    window.imageData = null;
                }
                
                console.log('ErrorRecoveryManager: Memory cleanup completed');
            } catch (error) {
                console.error('ErrorRecoveryManager: Memory cleanup failed:', error);
            }
        }
        
        /**
         * Show recovery message to user
         * @param {string} message - Recovery message
         */
        showRecoveryMessage(message) {
            console.log('ErrorRecoveryManager: Showing recovery message:', message);
            
            // Update loading status if available
            const loadingStatus = document.getElementById('loading-status');
            if (loadingStatus) {
                loadingStatus.textContent = message;
            }
            
            // Show loading screen if hidden
            const loadingScreen = document.getElementById('loading-screen');
            if (loadingScreen) {
                loadingScreen.style.display = 'flex';
            }
            
            // Hide error screen temporarily
            const errorScreen = document.getElementById('error-screen');
            if (errorScreen) {
                errorScreen.style.display = 'none';
            }
        }
        
        /**
         * Hide recovery message
         */
        hideRecoveryMessage() {
            const loadingScreen = document.getElementById('loading-screen');
            if (loadingScreen) {
                loadingScreen.style.display = 'none';
            }
        }
        
        /**
         * Show manual recovery options to user
         * @param {Error} error - The original error
         * @param {Object} strategy - Recovery strategy
         */
        showManualRecoveryOptions(error, strategy) {
            console.log('ErrorRecoveryManager: Showing manual recovery options');
            
            const errorScreen = document.getElementById('error-screen');
            const errorMessage = document.getElementById('error-message');
            
            if (errorScreen && errorMessage) {
                // Update error message with recovery information
                const recoveryInfo = strategy ? 
                    `\n\nRecovery attempted: ${strategy.message}\nYou can try the options below to resolve this issue.` :
                    '\n\nAutomatic recovery failed. Please try the manual options below.';
                
                errorMessage.textContent = error.message + recoveryInfo;
                
                // Show error screen
                errorScreen.style.display = 'flex';
                
                // Hide loading screen
                this.hideRecoveryMessage();
                
                // Set up enhanced retry functionality
                this.setupEnhancedRetryOptions(error, strategy);
            }
        }
        
        /**
         * Show final error message when all recovery attempts fail
         * @param {Error} error - The original error
         * @param {Object} strategy - Recovery strategy (if any)
         */
        showFinalErrorMessage(error, strategy) {
            console.log('ErrorRecoveryManager: Showing final error message');
            
            const errorScreen = document.getElementById('error-screen');
            const errorMessage = document.getElementById('error-message');
            
            if (errorScreen && errorMessage) {
                let finalMessage = `${error.message}\n\nAll automatic recovery attempts have failed.`;
                
                if (strategy && strategy.showReloadButton) {
                    finalMessage += '\n\nThis error requires a page reload to resolve.';
                } else {
                    finalMessage += '\n\nPlease try reloading the page or report this issue.';
                }
                
                errorMessage.textContent = finalMessage;
                errorScreen.style.display = 'flex';
                this.hideRecoveryMessage();
                
                // Set up final recovery options
                this.setupFinalRecoveryOptions(error, strategy);
            }
        }
        
        /**
         * Set up enhanced retry options with different strategies
         * @param {Error} error - The original error
         * @param {Object} strategy - Recovery strategy
         */
        setupEnhancedRetryOptions(error, strategy) {
            const retryButton = document.getElementById('retry-button');
            
            if (retryButton) {
                // Remove existing event listeners
                const newRetryButton = retryButton.cloneNode(true);
                retryButton.parentNode.replaceChild(newRetryButton, retryButton);
                
                // Add enhanced retry functionality
                newRetryButton.addEventListener('click', async () => {
                    console.log('ErrorRecoveryManager: Enhanced retry button clicked');
                    
                    // Show different retry options based on error type
                    const errorType = this.classifyError(error);
                    
                    // Reset retry count for manual retry
                    this.retryAttempts.delete(errorType);
                    
                    // Hide error screen and show loading
                    const errorScreen = document.getElementById('error-screen');
                    if (errorScreen) {
                        errorScreen.style.display = 'none';
                    }
                    
                    // Attempt recovery again
                    const success = await this.handleError(error, 0);
                    
                    if (!success) {
                        // If still failing, offer page reload
                        this.showPageReloadOption(error);
                    }
                });
            }
        }
        
        /**
         * Set up final recovery options when all else fails
         * @param {Error} error - The original error
         * @param {Object} strategy - Recovery strategy
         */
        setupFinalRecoveryOptions(error, strategy) {
            const retryButton = document.getElementById('retry-button');
            
            if (retryButton) {
                // Change retry button to reload button for final recovery
                retryButton.textContent = 'Reload Page';
                
                // Remove existing event listeners
                const newRetryButton = retryButton.cloneNode(true);
                retryButton.parentNode.replaceChild(newRetryButton, retryButton);
                
                // Add page reload functionality
                newRetryButton.addEventListener('click', () => {
                    console.log('ErrorRecoveryManager: Page reload requested by user');
                    window.location.reload();
                });
            }
        }
        
        /**
         * Show page reload option as last resort
         * @param {Error} error - The original error
         */
        showPageReloadOption(error) {
            const errorScreen = document.getElementById('error-screen');
            const errorMessage = document.getElementById('error-message');
            
            if (errorScreen && errorMessage) {
                errorMessage.textContent = `${error.message}\n\nAll recovery attempts have failed. A page reload is required to continue.`;
                errorScreen.style.display = 'flex';
                
                // Update retry button to reload button
                const retryButton = document.getElementById('retry-button');
                if (retryButton) {
                    retryButton.textContent = 'Reload Page';
                    retryButton.onclick = () => window.location.reload();
                }
            }
        }
        
        /**
         * Provide manual retry with specific strategy
         * @param {string} errorType - Type of error to retry
         * @returns {Promise<boolean>}
         */
        async manualRetry(errorType) {
            console.log(`ErrorRecoveryManager: Manual retry requested for ${errorType}`);
            
            const strategy = this.recoveryStrategies.get(errorType);
            if (!strategy) {
                console.warn(`ErrorRecoveryManager: No strategy found for manual retry of ${errorType}`);
                return false;
            }
            
            // Reset retry count for manual retry
            this.retryAttempts.delete(errorType);
            
            try {
                this.showRecoveryMessage(`Manual retry: ${strategy.message}`);
                const success = await strategy.action();
                
                if (success) {
                    this.hideRecoveryMessage();
                    console.log(`ErrorRecoveryManager: Manual retry successful for ${errorType}`);
                } else {
                    console.log(`ErrorRecoveryManager: Manual retry failed for ${errorType}`);
                }
                
                return success;
            } catch (error) {
                console.error(`ErrorRecoveryManager: Manual retry error for ${errorType}:`, error);
                return false;
            }
        }
        
        /**
         * Get recovery statistics
         * @returns {Object} - Recovery statistics
         */
        getRecoveryStats() {
            return {
                totalRetryAttempts: Array.from(this.retryAttempts.values()).reduce((sum, count) => sum + count, 0),
                retryAttemptsByType: Object.fromEntries(this.retryAttempts),
                availableStrategies: Array.from(this.recoveryStrategies.keys()),
                isRecovering: this.isRecovering
            };
        }
        
        /**
         * Reset recovery statistics
         */
        resetStats() {
            this.retryAttempts.clear();
            this.isRecovering = false;
            console.log('ErrorRecoveryManager: Recovery statistics reset');
        }
    }
    
    // Expose ErrorRecoveryManager to global scope
    window.ErrorRecoveryManager = ErrorRecoveryManager;
    
    console.log('ErrorRecoveryManager: Class definition loaded');
    
})(); // End of IIFE