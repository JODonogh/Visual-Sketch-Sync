/**
 * VSCodeAPIManager - Singleton class to manage VS Code API acquisition and prevent conflicts
 * 
 * This class ensures that the VS Code API is acquired only once and provides
 * centralized access to all webview scripts that need it.
 */
class VSCodeAPIManager {
    constructor() {
        if (VSCodeAPIManager.instance) {
            return VSCodeAPIManager.instance;
        }

        this.apiInstance = null;
        this.isAcquired = false;
        this.acquisitionAttempts = 0;
        this.maxAttempts = 3;
        this.readyCallbacks = [];
        this.errorState = null;
        this.isAcquiring = false;
        this.diagnosticLogger = null;

        VSCodeAPIManager.instance = this;
        this.initializeDiagnosticLogger();
    }

    /**
     * Get the singleton instance of VSCodeAPIManager
     * @returns {VSCodeAPIManager} The singleton instance
     */
    static getInstance() {
        if (!VSCodeAPIManager.instance) {
            VSCodeAPIManager.instance = new VSCodeAPIManager();
        }
        return VSCodeAPIManager.instance;
    }

    /**
     * Get the VS Code API instance
     * @returns {object|null} The VS Code API instance or null if not available
     */
    getAPI() {
        if (this.isAcquired && this.apiInstance) {
            return this.apiInstance;
        }

        // If not acquired yet, try to acquire it
        if (!this.isAcquiring && !this.isAcquired) {
            this._acquireAPI();
        }

        return this.apiInstance;
    }

    /**
     * Check if the VS Code API is available and ready
     * @returns {boolean} True if API is available, false otherwise
     */
    isAPIAvailable() {
        return this.isAcquired && this.apiInstance !== null && this.errorState === null;
    }

    /**
     * Register a callback to be called when the API is ready
     * @param {Function} callback - Function to call when API is ready
     */
    onAPIReady(callback) {
        if (typeof callback !== 'function') {
            console.warn('VSCodeAPIManager: onAPIReady callback must be a function');
            return;
        }

        if (this.isAPIAvailable()) {
            // API is already ready, call callback immediately
            try {
                callback(this.apiInstance);
            } catch (error) {
                console.error('VSCodeAPIManager: Error in ready callback:', error);
            }
        } else {
            // API not ready yet, add to callback queue
            this.readyCallbacks.push(callback);
            
            // Try to acquire API if not already trying
            if (!this.isAcquiring && !this.isAcquired) {
                this._acquireAPI();
            }
        }
    }

    /**
     * Get the current error state
     * @returns {string|null} Error message or null if no error
     */
    getErrorState() {
        return this.errorState;
    }

    /**
     * Get acquisition statistics
     * @returns {object} Object containing acquisition stats
     */
    getStats() {
        return {
            isAcquired: this.isAcquired,
            acquisitionAttempts: this.acquisitionAttempts,
            errorState: this.errorState,
            readyCallbacksCount: this.readyCallbacks.length,
            isAcquiring: this.isAcquiring
        };
    }

    /**
     * Initialize diagnostic logger
     * @private
     */
    initializeDiagnosticLogger() {
        if (window.DiagnosticLogger) {
            this.diagnosticLogger = window.DiagnosticLogger.getInstance();
        } else {
            // Fallback logging
            this.diagnosticLogger = {
                log: (level, component, message, metadata, error) => {
                    console[level.toLowerCase()](`[${level}] [${component}] ${message}`, metadata || {}, error || '');
                },
                trackResourceLoad: () => {},
                trackSystemEvent: () => {}
            };
        }
    }

    /**
     * Internal method to acquire the VS Code API
     * @private
     */
    _acquireAPI() {
        if (this.isAcquiring || this.isAcquired) {
            return;
        }

        this.isAcquiring = true;
        this.acquisitionAttempts++;

        try {
            // Check if API was already acquired by another script
            if (window.vscodeApi) {
                this.diagnosticLogger.log('INFO', 'VSCodeAPIManager', 'Using existing VS Code API instance', {
                    acquisitionAttempt: this.acquisitionAttempts,
                    reusingExisting: true
                });
                
                this.apiInstance = window.vscodeApi;
                this._onAPIAcquired();
                return;
            }

            // Check if acquireVsCodeApi function is available
            if (typeof acquireVsCodeApi === 'function') {
                this.diagnosticLogger.log('INFO', 'VSCodeAPIManager', 'Acquiring VS Code API', {
                    attempt: this.acquisitionAttempts,
                    maxAttempts: this.maxAttempts
                });
                
                const acquisitionStart = performance.now();
                this.apiInstance = acquireVsCodeApi();
                const acquisitionTime = performance.now() - acquisitionStart;
                
                // Store globally to prevent other scripts from acquiring again
                window.vscodeApi = this.apiInstance;
                
                this.diagnosticLogger.trackResourceLoad('vscode-api', 'acquireVsCodeApi', acquisitionTime, true, {
                    attempt: this.acquisitionAttempts,
                    apiType: typeof this.apiInstance
                });
                
                this._onAPIAcquired();
            } else {
                throw new Error('acquireVsCodeApi function not available - not running in VS Code webview context');
            }
        } catch (error) {
            this.diagnosticLogger.trackResourceLoad('vscode-api', 'acquireVsCodeApi', 0, false, {
                attempt: this.acquisitionAttempts,
                errorMessage: error.message
            });
            
            this._onAPIError(error);
        }
    }

    /**
     * Handle successful API acquisition
     * @private
     */
    _onAPIAcquired() {
        this.isAcquired = true;
        this.isAcquiring = false;
        this.errorState = null;

        this.diagnosticLogger.log('INFO', 'VSCodeAPIManager', 'VS Code API successfully acquired', {
            acquisitionAttempts: this.acquisitionAttempts,
            callbackCount: this.readyCallbacks.length,
            apiType: typeof this.apiInstance
        });

        this.diagnosticLogger.trackSystemEvent('vscode-api-acquired', {
            attempts: this.acquisitionAttempts,
            callbackCount: this.readyCallbacks.length
        });

        // Call all ready callbacks
        const callbacks = [...this.readyCallbacks];
        this.readyCallbacks = [];

        callbacks.forEach((callback, index) => {
            try {
                callback(this.apiInstance);
                this.diagnosticLogger.log('DEBUG', 'VSCodeAPIManager', `Ready callback ${index + 1} executed successfully`);
            } catch (error) {
                this.diagnosticLogger.log('ERROR', 'VSCodeAPIManager', `Error in ready callback ${index + 1}`, {
                    callbackIndex: index,
                    totalCallbacks: callbacks.length
                }, error);
            }
        });
    }

    /**
     * Handle API acquisition error
     * @param {Error} error - The error that occurred
     * @private
     */
    _onAPIError(error) {
        this.isAcquiring = false;
        this.errorState = error.message;

        this.diagnosticLogger.log('ERROR', 'VSCodeAPIManager', 'Failed to acquire VS Code API', {
            attempt: this.acquisitionAttempts,
            maxAttempts: this.maxAttempts,
            errorMessage: error.message,
            willRetry: this.acquisitionAttempts < this.maxAttempts
        }, error);

        this.diagnosticLogger.trackSystemEvent('vscode-api-error', {
            attempt: this.acquisitionAttempts,
            maxAttempts: this.maxAttempts,
            errorMessage: error.message
        });

        // If we haven't exceeded max attempts, try again after a delay
        if (this.acquisitionAttempts < this.maxAttempts) {
            const retryDelay = 1000;
            this.diagnosticLogger.log('INFO', 'VSCodeAPIManager', `Retrying API acquisition in ${retryDelay}ms`, {
                nextAttempt: this.acquisitionAttempts + 1,
                maxAttempts: this.maxAttempts
            });
            
            setTimeout(() => {
                this._acquireAPI();
            }, retryDelay);
        } else {
            this.diagnosticLogger.log('ERROR', 'VSCodeAPIManager', 'Max acquisition attempts reached - API unavailable', {
                totalAttempts: this.acquisitionAttempts,
                callbackCount: this.readyCallbacks.length
            });
            
            this.diagnosticLogger.trackSystemEvent('vscode-api-max-attempts', {
                totalAttempts: this.acquisitionAttempts,
                callbackCount: this.readyCallbacks.length
            });
            
            // Call callbacks with null to indicate failure
            const callbacks = [...this.readyCallbacks];
            this.readyCallbacks = [];

            callbacks.forEach((callback, index) => {
                try {
                    callback(null);
                    this.diagnosticLogger.log('DEBUG', 'VSCodeAPIManager', `Error callback ${index + 1} executed`);
                } catch (callbackError) {
                    this.diagnosticLogger.log('ERROR', 'VSCodeAPIManager', `Error in error callback ${index + 1}`, {
                        callbackIndex: index,
                        totalCallbacks: callbacks.length
                    }, callbackError);
                }
            });
        }
    }

    /**
     * Reset the manager state (for testing purposes)
     * @private
     */
    _reset() {
        this.apiInstance = null;
        this.isAcquired = false;
        this.acquisitionAttempts = 0;
        this.readyCallbacks = [];
        this.errorState = null;
        this.isAcquiring = false;
        
        // Clear global reference
        if (window.vscodeApi) {
            delete window.vscodeApi;
        }
    }
}

// Create and expose the singleton instance
window.VSCodeAPIManager = VSCodeAPIManager;

// For backward compatibility, also expose the instance
window.vscodeAPIManager = VSCodeAPIManager.getInstance();

// Initialize API acquisition immediately if in webview context
if (typeof acquireVsCodeApi === 'function') {
    VSCodeAPIManager.getInstance()._acquireAPI();
}