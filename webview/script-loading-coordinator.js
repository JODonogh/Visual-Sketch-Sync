/**
 * ScriptLoadingCoordinator - Manages script loading order and dependencies
 * 
 * This class ensures that scripts are loaded in the correct order with proper
 * dependency management, error recovery, and retry mechanisms.
 */
class ScriptLoadingCoordinator {
    constructor() {
        if (ScriptLoadingCoordinator.instance) {
            return ScriptLoadingCoordinator.instance;
        }

        this.loadedScripts = new Set();
        this.loadingScripts = new Map(); // script -> Promise
        this.failedScripts = new Map(); // script -> Error
        this.dependencies = new Map(); // script -> {dependencies: [], checkFunction: Function}
        this.loadingQueue = [];
        this.maxRetries = 3;
        this.retryDelay = 1000; // 1 second
        this.loadingCallbacks = new Map(); // script -> callbacks[]
        this.globalCallbacks = [];
        this.isInitialized = false;
        this.diagnosticLogger = null;

        ScriptLoadingCoordinator.instance = this;
        this._initializeDiagnosticLogger();
        this._initialize();
    }

    /**
     * Get the singleton instance
     * @returns {ScriptLoadingCoordinator} The singleton instance
     */
    static getInstance() {
        if (!ScriptLoadingCoordinator.instance) {
            ScriptLoadingCoordinator.instance = new ScriptLoadingCoordinator();
        }
        return ScriptLoadingCoordinator.instance;
    }

    /**
     * Initialize diagnostic logger
     * @private
     */
    _initializeDiagnosticLogger() {
        if (window.DiagnosticLogger) {
            this.diagnosticLogger = window.DiagnosticLogger.getInstance();
        } else {
            // Fallback logging
            this.diagnosticLogger = {
                log: (level, component, message, metadata, error) => {
                    console[level.toLowerCase()](`[${level}] [${component}] ${message}`, metadata || {}, error || '');
                },
                startTimer: (name, metadata) => `timer_${Date.now()}`,
                endTimer: (id, metadata) => ({ duration: 0 }),
                trackResourceLoad: () => {},
                trackSystemEvent: () => {}
            };
        }
    }

    /**
     * Initialize the coordinator
     * @private
     */
    _initialize() {
        // Register VS Code API as a core dependency
        this.registerDependency('vscode-api', () => {
            return window.VSCodeAPIManager && window.VSCodeAPIManager.getInstance().isAPIAvailable();
        });

        // Register CSS initialization as a dependency
        this.registerDependency('css-initialization', () => {
            return window.cssInitialization && window.cssInitialization.isInitialized;
        });

        // Register resource URI builder as a dependency
        this.registerDependency('resource-uri-builder', () => {
            return window.ResourceURIBuilder !== undefined;
        });

        this.isInitialized = true;
        
        this.diagnosticLogger.log('INFO', 'ScriptLoadingCoordinator', 'Initialized with core dependencies', {
            dependencyCount: this.dependencies.size,
            dependencies: Array.from(this.dependencies.keys())
        });
        
        this.diagnosticLogger.trackSystemEvent('script-coordinator-initialized', {
            dependencyCount: this.dependencies.size
        });
    }

    /**
     * Load a script with dependency checking
     * @param {string} src - Script source path
     * @param {string[]} dependencies - Array of dependency names
     * @param {object} options - Loading options
     * @returns {Promise} Promise that resolves when script is loaded
     */
    async loadScript(src, dependencies = [], options = {}) {
        const {
            retries = this.maxRetries,
            timeout = 30000,
            critical = false,
            onProgress = null
        } = options;

        // Check if script is already loaded
        if (this.loadedScripts.has(src)) {
            this.diagnosticLogger.log('DEBUG', 'ScriptLoadingCoordinator', `Script already loaded: ${src}`);
            return Promise.resolve();
        }

        // Check if script is currently loading
        if (this.loadingScripts.has(src)) {
            this.diagnosticLogger.log('DEBUG', 'ScriptLoadingCoordinator', `Script already loading, waiting: ${src}`);
            return this.loadingScripts.get(src);
        }

        // Create loading promise
        const loadingTimerId = this.diagnosticLogger.startTimer(`script-load-${src}`, {
            src,
            dependencies,
            critical,
            retries,
            timeout
        });

        this.diagnosticLogger.log('INFO', 'ScriptLoadingCoordinator', `Starting script load: ${src}`, {
            dependencies,
            critical,
            retries,
            timeout
        });

        const loadingPromise = this._loadScriptWithDependencies(src, dependencies, {
            retries,
            timeout,
            critical,
            onProgress
        });

        this.loadingScripts.set(src, loadingPromise);

        try {
            await loadingPromise;
            
            const loadMetrics = this.diagnosticLogger.endTimer(loadingTimerId, {
                success: true,
                src,
                critical
            });

            this.loadedScripts.add(src);
            this.loadingScripts.delete(src);
            
            this.diagnosticLogger.trackResourceLoad('script', src, loadMetrics.duration, true, {
                dependencies,
                critical,
                retries
            });
            
            // Call script-specific callbacks
            if (this.loadingCallbacks.has(src)) {
                const callbacks = this.loadingCallbacks.get(src);
                callbacks.forEach((callback, index) => {
                    try {
                        callback(null, src);
                    } catch (error) {
                        this.diagnosticLogger.log('ERROR', 'ScriptLoadingCoordinator', `Error in success callback ${index + 1} for ${src}`, {
                            callbackIndex: index,
                            totalCallbacks: callbacks.length
                        }, error);
                    }
                });
                this.loadingCallbacks.delete(src);
            }

            this.diagnosticLogger.log('INFO', 'ScriptLoadingCoordinator', `Successfully loaded script: ${src}`, {
                duration: `${loadMetrics.duration.toFixed(2)}ms`,
                dependencies,
                critical
            });
            
            return Promise.resolve();
        } catch (error) {
            const loadMetrics = this.diagnosticLogger.endTimer(loadingTimerId, {
                success: false,
                src,
                critical,
                errorMessage: error.message
            });

            this.loadingScripts.delete(src);
            this.failedScripts.set(src, error);
            
            this.diagnosticLogger.trackResourceLoad('script', src, loadMetrics.duration, false, {
                dependencies,
                critical,
                retries,
                errorMessage: error.message
            });
            
            // Call error callbacks
            if (this.loadingCallbacks.has(src)) {
                const callbacks = this.loadingCallbacks.get(src);
                callbacks.forEach((callback, index) => {
                    try {
                        callback(error, src);
                    } catch (callbackError) {
                        this.diagnosticLogger.log('ERROR', 'ScriptLoadingCoordinator', `Error in error callback ${index + 1} for ${src}`, {
                            callbackIndex: index,
                            totalCallbacks: callbacks.length,
                            originalError: error.message
                        }, callbackError);
                    }
                });
                this.loadingCallbacks.delete(src);
            }

            this.diagnosticLogger.log('ERROR', 'ScriptLoadingCoordinator', `Failed to load script: ${src}`, {
                duration: `${loadMetrics.duration.toFixed(2)}ms`,
                dependencies,
                critical,
                errorMessage: error.message
            }, error);
            
            if (critical) {
                throw error;
            }
            
            return Promise.reject(error);
        }
    }

    /**
     * Register a dependency checker
     * @param {string} name - Dependency name
     * @param {Function} checkFunction - Function that returns true when dependency is ready
     */
    registerDependency(name, checkFunction) {
        if (typeof checkFunction !== 'function') {
            throw new Error('Dependency check function must be a function');
        }

        this.dependencies.set(name, {
            checkFunction,
            registeredAt: Date.now()
        });

        console.log(`ScriptLoadingCoordinator: Registered dependency '${name}'`);
    }

    /**
     * Check if a dependency is ready
     * @param {string} name - Dependency name
     * @returns {boolean} True if dependency is ready
     */
    isDependencyReady(name) {
        const dependency = this.dependencies.get(name);
        if (!dependency) {
            console.warn(`ScriptLoadingCoordinator: Unknown dependency '${name}'`);
            return false;
        }

        try {
            return dependency.checkFunction();
        } catch (error) {
            console.error(`ScriptLoadingCoordinator: Error checking dependency '${name}':`, error);
            return false;
        }
    }

    /**
     * Wait for dependencies to be ready
     * @param {string[]} dependencies - Array of dependency names
     * @param {number} timeout - Timeout in milliseconds
     * @returns {Promise} Promise that resolves when all dependencies are ready
     */
    async waitForDependencies(dependencies, timeout = 30000) {
        if (!dependencies || dependencies.length === 0) {
            return Promise.resolve();
        }

        const startTime = Date.now();
        const checkInterval = 100; // Check every 100ms

        return new Promise((resolve, reject) => {
            const checkDependencies = () => {
                const readyDependencies = [];
                const notReadyDependencies = [];

                dependencies.forEach(dep => {
                    if (this.isDependencyReady(dep)) {
                        readyDependencies.push(dep);
                    } else {
                        notReadyDependencies.push(dep);
                    }
                });

                if (notReadyDependencies.length === 0) {
                    console.log(`ScriptLoadingCoordinator: All dependencies ready: [${dependencies.join(', ')}]`);
                    resolve();
                    return;
                }

                if (Date.now() - startTime > timeout) {
                    const error = new Error(`Timeout waiting for dependencies: [${notReadyDependencies.join(', ')}]`);
                    console.error('ScriptLoadingCoordinator:', error.message);
                    reject(error);
                    return;
                }

                setTimeout(checkDependencies, checkInterval);
            };

            checkDependencies();
        });
    }

    /**
     * Register a callback for when all scripts are loaded
     * @param {Function} callback - Callback function
     */
    onAllScriptsLoaded(callback) {
        if (typeof callback !== 'function') {
            console.warn('ScriptLoadingCoordinator: onAllScriptsLoaded callback must be a function');
            return;
        }

        this.globalCallbacks.push(callback);
    }

    /**
     * Register a callback for when a specific script is loaded
     * @param {string} src - Script source path
     * @param {Function} callback - Callback function (error, src) => {}
     */
    onScriptLoaded(src, callback) {
        if (typeof callback !== 'function') {
            console.warn('ScriptLoadingCoordinator: onScriptLoaded callback must be a function');
            return;
        }

        if (this.loadedScripts.has(src)) {
            // Script already loaded, call callback immediately
            try {
                callback(null, src);
            } catch (error) {
                console.error(`ScriptLoadingCoordinator: Error in immediate callback for ${src}:`, error);
            }
            return;
        }

        if (this.failedScripts.has(src)) {
            // Script failed to load, call callback with error
            try {
                callback(this.failedScripts.get(src), src);
            } catch (error) {
                console.error(`ScriptLoadingCoordinator: Error in immediate error callback for ${src}:`, error);
            }
            return;
        }

        // Script not loaded yet, add to callbacks
        if (!this.loadingCallbacks.has(src)) {
            this.loadingCallbacks.set(src, []);
        }
        this.loadingCallbacks.get(src).push(callback);
    }

    /**
     * Handle loading errors with retry logic
     * @param {string} src - Script source
     * @param {Error} error - The error that occurred
     * @param {number} attempt - Current attempt number
     * @param {number} maxRetries - Maximum retry attempts
     * @returns {Promise} Promise for retry attempt
     */
    async handleLoadingError(src, error, attempt, maxRetries) {
        console.error(`ScriptLoadingCoordinator: Loading error for ${src} (attempt ${attempt}/${maxRetries}):`, error);

        if (attempt >= maxRetries) {
            const finalError = new Error(`Failed to load ${src} after ${maxRetries} attempts: ${error.message}`);
            console.error('ScriptLoadingCoordinator:', finalError.message);
            throw finalError;
        }

        // Calculate retry delay with exponential backoff
        const delay = this.retryDelay * Math.pow(2, attempt - 1);
        console.log(`ScriptLoadingCoordinator: Retrying ${src} in ${delay}ms...`);

        await new Promise(resolve => setTimeout(resolve, delay));
        return this._loadScriptElement(src, attempt + 1, maxRetries);
    }

    /**
     * Get loading statistics
     * @returns {object} Loading statistics
     */
    getStats() {
        return {
            loadedScripts: Array.from(this.loadedScripts),
            loadingScripts: Array.from(this.loadingScripts.keys()),
            failedScripts: Array.from(this.failedScripts.entries()),
            registeredDependencies: Array.from(this.dependencies.keys()),
            pendingCallbacks: this.loadingCallbacks.size,
            globalCallbacks: this.globalCallbacks.length
        };
    }

    /**
     * Load script with dependencies (internal method)
     * @param {string} src - Script source
     * @param {string[]} dependencies - Dependencies
     * @param {object} options - Loading options
     * @returns {Promise} Loading promise
     * @private
     */
    async _loadScriptWithDependencies(src, dependencies, options) {
        const { retries, timeout, onProgress } = options;

        // Wait for dependencies first
        if (dependencies && dependencies.length > 0) {
            if (onProgress) onProgress(`Waiting for dependencies: ${dependencies.join(', ')}`);
            await this.waitForDependencies(dependencies, timeout);
        }

        // Load the script
        if (onProgress) onProgress(`Loading script: ${src}`);
        return this._loadScriptElement(src, 1, retries);
    }

    /**
     * Load script element (internal method)
     * @param {string} src - Script source
     * @param {number} attempt - Current attempt
     * @param {number} maxRetries - Maximum retries
     * @returns {Promise} Loading promise
     * @private
     */
    _loadScriptElement(src, attempt, maxRetries) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.async = true;

            const cleanup = () => {
                script.removeEventListener('load', onLoad);
                script.removeEventListener('error', onError);
            };

            const onLoad = () => {
                cleanup();
                console.log(`ScriptLoadingCoordinator: Loaded ${src} on attempt ${attempt}`);
                resolve();
            };

            const onError = (event) => {
                cleanup();
                document.head.removeChild(script);
                
                const error = new Error(`Failed to load script: ${src}`);
                this.handleLoadingError(src, error, attempt, maxRetries)
                    .then(resolve)
                    .catch(reject);
            };

            script.addEventListener('load', onLoad);
            script.addEventListener('error', onError);

            document.head.appendChild(script);
        });
    }

    /**
     * Reset the coordinator (for testing)
     * @private
     */
    _reset() {
        this.loadedScripts.clear();
        this.loadingScripts.clear();
        this.failedScripts.clear();
        this.dependencies.clear();
        this.loadingQueue = [];
        this.loadingCallbacks.clear();
        this.globalCallbacks = [];
        this.isInitialized = false;
        this._initialize();
    }
}

// Create and expose the singleton instance
window.ScriptLoadingCoordinator = ScriptLoadingCoordinator;

// For convenience, also expose the instance
window.scriptLoadingCoordinator = ScriptLoadingCoordinator.getInstance();

console.log('ScriptLoadingCoordinator: Class loaded and instance created');