/**
 * InitializationRecovery System
 * Handles webview startup failures and provides fallback initialization strategies
 */

(function() {
    'use strict';

    class InitializationRecovery {
        constructor() {
            this.recoveryAttempts = 0;
            this.maxRecoveryAttempts = 3;
            this.lastError = null;
            this.recoveryStrategies = [
                { name: 'api-retry', attempted: false, success: false },
                { name: 'fallback-mode', attempted: false, success: false },
                { name: 'minimal-init', attempted: false, success: false }
            ];
            this.fallbackMode = false;
            this.initializationState = 'pending';
            this.errorCallbacks = [];
            this.recoveryCallbacks = [];
            
            // Bind methods to preserve context
            this.handleInitializationError = this.handleInitializationError.bind(this);
            this.attemptRecovery = this.attemptRecovery.bind(this);
            this.reportRecoveryStatus = this.reportRecoveryStatus.bind(this);
        }

        /**
         * Register error callback for initialization failures
         */
        onInitializationError(callback) {
            if (typeof callback === 'function') {
                this.errorCallbacks.push(callback);
            }
        }

        /**
         * Register recovery callback for successful recovery
         */
        onRecoverySuccess(callback) {
            if (typeof callback === 'function') {
                this.recoveryCallbacks.push(callback);
            }
        }

        /**
         * Handle initialization errors with recovery mechanisms
         */
        async handleInitializationError(error, context = {}) {
            this.lastError = error;
            this.recoveryAttempts++;
            
            console.error(`InitializationRecovery: Handling error (attempt ${this.recoveryAttempts}):`, error);
            
            // Update loading status if available
            this.updateLoadingStatus(`Error occurred, attempting recovery... (${this.recoveryAttempts}/${this.maxRecoveryAttempts})`);
            
            // Notify error callbacks
            this.errorCallbacks.forEach(callback => {
                try {
                    callback(error, context, this.recoveryAttempts);
                } catch (callbackError) {
                    console.error('InitializationRecovery: Error in error callback:', callbackError);
                }
            });

            // Check if we've exceeded max attempts
            if (this.recoveryAttempts > this.maxRecoveryAttempts) {
                this.initializationState = 'failed';
                this.showFinalErrorScreen(error);
                return false;
            }

            // Attempt recovery based on error type
            const recovered = await this.attemptRecovery(error, context);
            
            if (recovered) {
                this.initializationState = 'recovered';
                this.notifyRecoverySuccess();
                return true;
            }

            // If recovery failed, try next strategy or show error
            return false;
        }

        /**
         * Attempt recovery using available strategies
         */
        async attemptRecovery(error, context) {
            const errorMessage = error.message.toLowerCase();
            
            // Strategy 1: VS Code API retry for API conflicts
            if (errorMessage.includes('api') || errorMessage.includes('already been acquired')) {
                return await this.tryApiRetryStrategy(error, context);
            }
            
            // Strategy 2: CSP violation recovery
            if (errorMessage.includes('csp') || errorMessage.includes('content security policy')) {
                return await this.tryCSPRecoveryStrategy(error, context);
            }
            
            // Strategy 3: Script loading failure recovery
            if (errorMessage.includes('script') || errorMessage.includes('load')) {
                return await this.tryScriptLoadingRecovery(error, context);
            }
            
            // Strategy 4: General fallback mode
            return await this.tryFallbackModeStrategy(error, context);
        }

        /**
         * Strategy 1: Retry VS Code API acquisition with centralized manager
         */
        async tryApiRetryStrategy(error, context) {
            const strategy = this.recoveryStrategies.find(s => s.name === 'api-retry');
            if (strategy.attempted) return false;
            
            strategy.attempted = true;
            console.log('InitializationRecovery: Attempting API retry strategy');
            
            try {
                // Wait a bit before retry
                await this.delay(500);
                
                // Try to use existing VS Code API manager
                if (window.VSCodeAPIManager) {
                    const apiManager = window.VSCodeAPIManager.getInstance();
                    const api = apiManager.getAPI();
                    
                    if (api) {
                        console.log('InitializationRecovery: Successfully recovered using existing API');
                        strategy.success = true;
                        
                        // Reinitialize with recovered API
                        if (window.VSSCanvas && typeof window.VSSCanvas.reinitialize === 'function') {
                            window.VSSCanvas.reinitialize(api);
                        }
                        
                        return true;
                    }
                }
                
                // Try alternative API acquisition
                if (window.acquireVsCodeApi && !window.vscode) {
                    const api = window.acquireVsCodeApi();
                    if (api) {
                        window.vscode = api;
                        strategy.success = true;
                        return true;
                    }
                }
                
            } catch (retryError) {
                console.error('InitializationRecovery: API retry failed:', retryError);
            }
            
            return false;
        }

        /**
         * Strategy 2: CSP violation recovery with alternative loading
         */
        async tryCSPRecoveryStrategy(error, context) {
            const strategy = this.recoveryStrategies.find(s => s.name === 'csp-recovery');
            if (!strategy) {
                this.recoveryStrategies.push({ name: 'csp-recovery', attempted: false, success: false });
            }
            
            const cspStrategy = this.recoveryStrategies.find(s => s.name === 'csp-recovery');
            if (cspStrategy.attempted) return false;
            
            cspStrategy.attempted = true;
            console.log('InitializationRecovery: Attempting CSP recovery strategy');
            
            try {
                // Try to load critical CSS inline as fallback
                if (window.StylesheetLoader) {
                    const loader = new window.StylesheetLoader();
                    await loader.loadCriticalStylesInline();
                    cspStrategy.success = true;
                    return true;
                }
                
                // Fallback: inject minimal critical styles
                this.injectMinimalStyles();
                cspStrategy.success = true;
                return true;
                
            } catch (cspError) {
                console.error('InitializationRecovery: CSP recovery failed:', cspError);
            }
            
            return false;
        }

        /**
         * Strategy 3: Script loading recovery with minimal functionality
         */
        async tryScriptLoadingRecovery(error, context) {
            const strategy = this.recoveryStrategies.find(s => s.name === 'script-recovery');
            if (!strategy) {
                this.recoveryStrategies.push({ name: 'script-recovery', attempted: false, success: false });
            }
            
            const scriptStrategy = this.recoveryStrategies.find(s => s.name === 'script-recovery');
            if (scriptStrategy.attempted) return false;
            
            scriptStrategy.attempted = true;
            console.log('InitializationRecovery: Attempting script loading recovery');
            
            try {
                // Initialize minimal canvas functionality
                this.initializeMinimalCanvas();
                scriptStrategy.success = true;
                return true;
                
            } catch (scriptError) {
                console.error('InitializationRecovery: Script recovery failed:', scriptError);
            }
            
            return false;
        }

        /**
         * Strategy 4: Fallback mode with basic functionality
         */
        async tryFallbackModeStrategy(error, context) {
            const strategy = this.recoveryStrategies.find(s => s.name === 'fallback-mode');
            if (strategy.attempted) return false;
            
            strategy.attempted = true;
            this.fallbackMode = true;
            console.log('InitializationRecovery: Entering fallback mode');
            
            try {
                // Show fallback UI
                this.showFallbackUI();
                
                // Initialize basic canvas
                this.initializeBasicCanvas();
                
                strategy.success = true;
                return true;
                
            } catch (fallbackError) {
                console.error('InitializationRecovery: Fallback mode failed:', fallbackError);
            }
            
            return false;
        }

        /**
         * Initialize minimal canvas functionality
         */
        initializeMinimalCanvas() {
            const canvas = document.getElementById('drawing-canvas');
            if (!canvas) {
                throw new Error('Canvas element not found');
            }
            
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                throw new Error('Canvas context not available');
            }
            
            // Set canvas size
            canvas.width = canvas.offsetWidth || 800;
            canvas.height = canvas.offsetHeight || 600;
            
            // Basic drawing functionality
            let isDrawing = false;
            let lastX = 0;
            let lastY = 0;
            
            canvas.addEventListener('mousedown', (e) => {
                isDrawing = true;
                [lastX, lastY] = [e.offsetX, e.offsetY];
            });
            
            canvas.addEventListener('mousemove', (e) => {
                if (!isDrawing) return;
                
                ctx.beginPath();
                ctx.moveTo(lastX, lastY);
                ctx.lineTo(e.offsetX, e.offsetY);
                ctx.stroke();
                
                [lastX, lastY] = [e.offsetX, e.offsetY];
            });
            
            canvas.addEventListener('mouseup', () => {
                isDrawing = false;
            });
            
            console.log('InitializationRecovery: Minimal canvas initialized');
        }

        /**
         * Initialize basic canvas with limited functionality
         */
        initializeBasicCanvas() {
            this.initializeMinimalCanvas();
            
            // Add basic toolbar functionality
            const clearButton = document.getElementById('clear-canvas');
            if (clearButton) {
                clearButton.addEventListener('click', () => {
                    const canvas = document.getElementById('drawing-canvas');
                    const ctx = canvas.getContext('2d');
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                });
            }
            
            console.log('InitializationRecovery: Basic canvas initialized');
        }

        /**
         * Show fallback UI with recovery options
         */
        showFallbackUI() {
            // Hide loading screen
            const loadingScreen = document.getElementById('loading-screen');
            if (loadingScreen) {
                loadingScreen.style.display = 'none';
            }
            
            // Show canvas container
            const canvasContainer = document.getElementById('canvas-container');
            if (canvasContainer) {
                canvasContainer.style.display = 'block';
            }
            
            // Add fallback mode indicator
            const status = document.getElementById('status');
            if (status) {
                status.innerHTML = `
                    <span>VSS Drawing Canvas - Fallback Mode</span>
                    <span class="connection-status disconnected">Limited Functionality</span>
                `;
            }
            
            // Show recovery options
            this.showRecoveryOptions();
        }

        /**
         * Show recovery options to user
         */
        showRecoveryOptions() {
            const recoveryDiv = document.createElement('div');
            recoveryDiv.id = 'recovery-options';
            recoveryDiv.style.cssText = `
                position: fixed;
                top: 10px;
                right: 10px;
                background: rgba(255, 193, 7, 0.9);
                color: #000;
                padding: 10px;
                border-radius: 5px;
                z-index: 1000;
                max-width: 300px;
                font-size: 12px;
            `;
            
            recoveryDiv.innerHTML = `
                <div style="font-weight: bold; margin-bottom: 5px;">⚠️ Recovery Mode Active</div>
                <div style="margin-bottom: 10px;">Some features may be limited. You can:</div>
                <button id="retry-full-init" style="margin-right: 5px; padding: 3px 8px; font-size: 11px;">Retry Full Initialization</button>
                <button id="reload-webview" style="padding: 3px 8px; font-size: 11px;">Reload Webview</button>
                <button id="dismiss-recovery" style="float: right; background: none; border: none; font-size: 14px; cursor: pointer;">×</button>
            `;
            
            document.body.appendChild(recoveryDiv);
            
            // Add event listeners
            document.getElementById('retry-full-init')?.addEventListener('click', () => {
                this.retryFullInitialization();
            });
            
            document.getElementById('reload-webview')?.addEventListener('click', () => {
                window.location.reload();
            });
            
            document.getElementById('dismiss-recovery')?.addEventListener('click', () => {
                recoveryDiv.remove();
            });
        }

        /**
         * Retry full initialization
         */
        async retryFullInitialization() {
            console.log('InitializationRecovery: Retrying full initialization');
            
            // Reset recovery state
            this.recoveryAttempts = 0;
            this.recoveryStrategies.forEach(strategy => {
                strategy.attempted = false;
                strategy.success = false;
            });
            this.fallbackMode = false;
            this.initializationState = 'pending';
            
            // Remove recovery options
            const recoveryOptions = document.getElementById('recovery-options');
            if (recoveryOptions) {
                recoveryOptions.remove();
            }
            
            // Show loading screen
            const loadingScreen = document.getElementById('loading-screen');
            if (loadingScreen) {
                loadingScreen.style.display = 'flex';
            }
            
            // Attempt reinitialization
            try {
                if (window.initializeCoordinatedLoading) {
                    await window.initializeCoordinatedLoading();
                } else {
                    // Fallback initialization
                    window.location.reload();
                }
            } catch (error) {
                console.error('InitializationRecovery: Retry failed:', error);
                this.handleInitializationError(error, { source: 'retry' });
            }
        }

        /**
         * Inject minimal critical styles for basic functionality
         */
        injectMinimalStyles() {
            const style = document.createElement('style');
            style.textContent = `
                #drawing-canvas {
                    border: 1px solid #ccc;
                    cursor: crosshair;
                    background: white;
                }
                .toolbar {
                    padding: 10px;
                    background: #f0f0f0;
                    border-bottom: 1px solid #ccc;
                }
                .tool-button {
                    margin-right: 5px;
                    padding: 5px 10px;
                    border: 1px solid #ccc;
                    background: white;
                    cursor: pointer;
                }
                .tool-button:hover {
                    background: #e0e0e0;
                }
                .loading-screen {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.8);
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    z-index: 9999;
                }
            `;
            document.head.appendChild(style);
            console.log('InitializationRecovery: Minimal styles injected');
        }

        /**
         * Show final error screen when all recovery attempts fail
         */
        showFinalErrorScreen(error) {
            console.error('InitializationRecovery: All recovery attempts failed');
            
            const errorScreen = document.getElementById('error-screen');
            const errorMessage = document.getElementById('error-message');
            const errorStack = document.getElementById('error-stack');
            
            if (errorScreen && errorMessage) {
                errorMessage.innerHTML = `
                    <h3>Initialization Failed</h3>
                    <p>The webview failed to initialize after ${this.maxRecoveryAttempts} recovery attempts.</p>
                    <p><strong>Error:</strong> ${error.message}</p>
                    <p><strong>Recovery attempts:</strong></p>
                    <ul>
                        ${this.recoveryStrategies.map(strategy => 
                            `<li>${strategy.name}: ${strategy.attempted ? (strategy.success ? '✅ Success' : '❌ Failed') : '⏸️ Not attempted'}</li>`
                        ).join('')}
                    </ul>
                `;
                
                if (errorStack) {
                    errorStack.textContent = error.stack || 'No stack trace available';
                }
                
                errorScreen.style.display = 'flex';
                
                // Hide loading screen
                const loadingScreen = document.getElementById('loading-screen');
                if (loadingScreen) {
                    loadingScreen.style.display = 'none';
                }
            }
        }

        /**
         * Update loading status message
         */
        updateLoadingStatus(message) {
            const statusElement = document.getElementById('loading-status');
            if (statusElement) {
                statusElement.textContent = message;
            }
            console.log(`InitializationRecovery: ${message}`);
        }

        /**
         * Notify recovery success callbacks
         */
        notifyRecoverySuccess() {
            console.log('InitializationRecovery: Recovery successful');
            
            this.recoveryCallbacks.forEach(callback => {
                try {
                    callback(this.recoveryAttempts, this.recoveryStrategies);
                } catch (callbackError) {
                    console.error('InitializationRecovery: Error in recovery callback:', callbackError);
                }
            });
            
            // Update UI to show recovery success
            this.updateLoadingStatus('Recovery successful - initializing...');
        }

        /**
         * Get current recovery status
         */
        getRecoveryStatus() {
            return {
                state: this.initializationState,
                attempts: this.recoveryAttempts,
                maxAttempts: this.maxRecoveryAttempts,
                strategies: [...this.recoveryStrategies],
                fallbackMode: this.fallbackMode,
                lastError: this.lastError
            };
        }

        /**
         * Utility method for delays
         */
        delay(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        }
    }

    // Create global instance
    window.InitializationRecovery = InitializationRecovery;
    
    // Create singleton instance for immediate use
    window.initializationRecovery = new InitializationRecovery();
    
    console.log('InitializationRecovery system loaded');

})();