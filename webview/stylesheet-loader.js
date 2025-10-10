/**
 * StylesheetLoader - CSP-compliant CSS loading system
 * 
 * This class provides dynamic CSS loading capabilities that comply with
 * VS Code webview Content Security Policy restrictions. It includes
 * fallback mechanisms for when external CSS loading fails.
 */
class StylesheetLoader {
    constructor() {
        this.loadedStylesheets = new Set();
        this.failedStylesheets = new Map();
        this.loadingPromises = new Map();
        this.fallbackStyles = new Map();
        this.loadingProgress = { total: 0, loaded: 0 };
        this.progressCallbacks = [];
        this.diagnosticLogger = null;
        
        // Initialize diagnostic logging
        this.initializeDiagnosticLogger();
        
        // Initialize error handling
        this.initializeErrorHandling();
    }

    /**
     * Initialize diagnostic logger
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
                startTimer: (name, metadata) => `timer_${Date.now()}`,
                endTimer: (id, metadata) => ({ duration: 0 }),
                trackResourceLoad: () => {},
                trackSystemEvent: () => {}
            };
        }
    }

    /**
     * Initialize error handling for CSS loading
     */
    initializeErrorHandling() {
        // Listen for CSP violations
        document.addEventListener('securitypolicyviolation', (event) => {
            if (event.violatedDirective === 'style-src') {
                this.diagnosticLogger.log('WARN', 'StylesheetLoader', 'CSP violation detected for stylesheet', {
                    blockedURI: event.blockedURI,
                    violatedDirective: event.violatedDirective,
                    originalPolicy: event.originalPolicy
                });
                this.handleCSPViolation(event);
            }
        });
    }

    /**
     * Load a stylesheet dynamically with CSP compliance
     * @param {string} href - The stylesheet URL or path
     * @param {Object} options - Loading options
     * @returns {Promise<boolean>} - Success status
     */
    async loadStylesheet(href, options = {}) {
        const {
            fallbackCSS = null,
            priority = 'normal',
            timeout = 10000,
            retryCount = 2
        } = options;

        // Check if already loaded
        if (this.loadedStylesheets.has(href)) {
            this.diagnosticLogger.log('DEBUG', 'StylesheetLoader', `Stylesheet already loaded: ${href}`);
            return true;
        }

        // Check if already loading
        if (this.loadingPromises.has(href)) {
            this.diagnosticLogger.log('DEBUG', 'StylesheetLoader', `Stylesheet already loading, waiting: ${href}`);
            return await this.loadingPromises.get(href);
        }

        // Store fallback CSS if provided
        if (fallbackCSS) {
            this.fallbackStyles.set(href, fallbackCSS);
        }

        // Create loading promise
        const loadingTimerId = this.diagnosticLogger.startTimer(`stylesheet-load-${href}`, {
            href,
            priority,
            timeout,
            retryCount,
            hasFallback: !!fallbackCSS
        });

        this.diagnosticLogger.log('INFO', 'StylesheetLoader', `Starting stylesheet load: ${href}`, {
            priority,
            timeout,
            retryCount,
            hasFallback: !!fallbackCSS
        });

        const loadingPromise = this.attemptStylesheetLoad(href, {
            priority,
            timeout,
            retryCount
        });

        this.loadingPromises.set(href, loadingPromise);
        this.updateProgress();

        try {
            const success = await loadingPromise;
            
            const loadMetrics = this.diagnosticLogger.endTimer(loadingTimerId, {
                success,
                href,
                priority
            });

            if (success) {
                this.loadedStylesheets.add(href);
                
                this.diagnosticLogger.trackResourceLoad('stylesheet', href, loadMetrics.duration, true, {
                    priority,
                    retryCount,
                    hasFallback: !!fallbackCSS
                });

                this.diagnosticLogger.log('INFO', 'StylesheetLoader', `Successfully loaded stylesheet: ${href}`, {
                    duration: `${loadMetrics.duration.toFixed(2)}ms`,
                    priority
                });
            }
            
            return success;
        } catch (error) {
            const loadMetrics = this.diagnosticLogger.endTimer(loadingTimerId, {
                success: false,
                href,
                priority,
                errorMessage: error.message
            });

            this.diagnosticLogger.trackResourceLoad('stylesheet', href, loadMetrics.duration, false, {
                priority,
                retryCount,
                hasFallback: !!fallbackCSS,
                errorMessage: error.message
            });

            this.failedStylesheets.set(href, error);
            
            this.diagnosticLogger.log('WARN', 'StylesheetLoader', `Stylesheet load failed, attempting recovery: ${href}`, {
                duration: `${loadMetrics.duration.toFixed(2)}ms`,
                errorMessage: error.message,
                hasFallback: !!fallbackCSS
            }, error);
            
            return await this.handleLoadingFailure(href, error);
        } finally {
            this.loadingPromises.delete(href);
            this.updateProgress();
        }
    }

    /**
     * Attempt to load stylesheet with proper URI handling
     * @param {string} href - The stylesheet path
     * @param {Object} options - Loading options
     * @returns {Promise<boolean>} - Success status
     */
    async attemptStylesheetLoad(href, options) {
        const { timeout, retryCount } = options;
        let lastError = null;

        for (let attempt = 0; attempt <= retryCount; attempt++) {
            try {
                // Build proper vscode-resource URI
                const resourceURI = this.buildResourceURI(href);
                
                // Create link element
                const link = document.createElement('link');
                link.rel = 'stylesheet';
                link.type = 'text/css';
                link.href = resourceURI;

                // Add loading promise
                const loadPromise = new Promise((resolve, reject) => {
                    const timeoutId = setTimeout(() => {
                        reject(new Error(`Stylesheet loading timeout: ${href}`));
                    }, timeout);

                    link.onload = () => {
                        clearTimeout(timeoutId);
                        resolve(true);
                    };

                    link.onerror = (event) => {
                        clearTimeout(timeoutId);
                        reject(new Error(`Failed to load stylesheet: ${href}`));
                    };
                });

                // Append to head
                document.head.appendChild(link);

                // Wait for load
                await loadPromise;
                return true;

            } catch (error) {
                lastError = error;
                
                // Wait before retry (exponential backoff)
                if (attempt < retryCount) {
                    await this.delay(Math.pow(2, attempt) * 1000);
                }
            }
        }

        throw lastError;
    }

    /**
     * Build proper vscode-resource URI for CSS files
     * @param {string} href - The original href
     * @returns {string} - Proper vscode-resource URI
     */
    buildResourceURI(href) {
        // Use ResourceURIBuilder if available
        if (window.ResourceURIBuilder) {
            return ResourceURIBuilder.buildURI('', href);
        }

        // Fallback URI construction
        if (href.startsWith('vscode-resource:')) {
            return href;
        }

        // Convert relative paths to vscode-resource scheme
        if (!href.startsWith('http') && !href.startsWith('//')) {
            return `vscode-resource:${href}`;
        }

        return href;
    }

    /**
     * Handle CSS loading failure with fallback strategies
     * @param {string} href - The failed stylesheet path
     * @param {Error} error - The loading error
     * @returns {Promise<boolean>} - Fallback success status
     */
    async handleLoadingFailure(href, error) {
        console.warn(`Stylesheet loading failed for ${href}:`, error);

        // Try fallback CSS injection
        const fallbackCSS = this.fallbackStyles.get(href);
        if (fallbackCSS) {
            try {
                await this.injectInlineCSS(fallbackCSS, `fallback-${href}`);
                console.log(`Applied fallback CSS for ${href}`);
                return true;
            } catch (fallbackError) {
                console.error(`Fallback CSS injection failed for ${href}:`, fallbackError);
            }
        }

        // Try alternative loading strategies
        return await this.tryAlternativeLoading(href);
    }

    /**
     * Inject CSS as inline styles (CSP-compliant fallback)
     * @param {string} css - The CSS content
     * @param {string} id - Unique identifier for the style element
     * @returns {Promise<void>}
     */
    async injectInlineCSS(css, id) {
        return new Promise((resolve, reject) => {
            try {
                // Remove existing style element with same ID
                const existing = document.getElementById(id);
                if (existing) {
                    existing.remove();
                }

                // Create new style element
                const style = document.createElement('style');
                style.id = id;
                style.type = 'text/css';
                
                // Add CSS content
                if (style.styleSheet) {
                    // IE support
                    style.styleSheet.cssText = css;
                } else {
                    style.appendChild(document.createTextNode(css));
                }

                // Append to head
                document.head.appendChild(style);
                
                // Mark as loaded
                this.loadedStylesheets.add(id);
                resolve();
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Try alternative loading strategies for failed stylesheets
     * @param {string} href - The stylesheet path
     * @returns {Promise<boolean>} - Success status
     */
    async tryAlternativeLoading(href) {
        // Strategy 1: Try loading as text and inject inline
        try {
            const cssText = await this.fetchStylesheetAsText(href);
            if (cssText) {
                await this.injectInlineCSS(cssText, `alt-${href}`);
                return true;
            }
        } catch (error) {
            console.warn(`Alternative text loading failed for ${href}:`, error);
        }

        // Strategy 2: Use @import in a style element
        try {
            const importCSS = `@import url("${this.buildResourceURI(href)}");`;
            await this.injectInlineCSS(importCSS, `import-${href}`);
            return true;
        } catch (error) {
            console.warn(`@import strategy failed for ${href}:`, error);
        }

        return false;
    }

    /**
     * Fetch stylesheet content as text
     * @param {string} href - The stylesheet path
     * @returns {Promise<string>} - CSS content
     */
    async fetchStylesheetAsText(href) {
        const resourceURI = this.buildResourceURI(href);
        
        try {
            const response = await fetch(resourceURI);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return await response.text();
        } catch (error) {
            throw new Error(`Failed to fetch CSS as text: ${error.message}`);
        }
    }

    /**
     * Handle CSP violations for stylesheet loading
     * @param {SecurityPolicyViolationEvent} event - CSP violation event
     */
    handleCSPViolation(event) {
        console.warn('CSP violation detected for stylesheet:', {
            blockedURI: event.blockedURI,
            violatedDirective: event.violatedDirective,
            originalPolicy: event.originalPolicy
        });

        // Try to identify which stylesheet caused the violation
        const blockedURI = event.blockedURI;
        for (const [href, promise] of this.loadingPromises) {
            if (blockedURI.includes(href) || href.includes(blockedURI)) {
                // Trigger fallback for this stylesheet
                this.handleLoadingFailure(href, new Error(`CSP violation: ${event.violatedDirective}`));
                break;
            }
        }
    }

    /**
     * Load multiple stylesheets with progress tracking
     * @param {Array<string|Object>} stylesheets - Array of stylesheet paths or config objects
     * @returns {Promise<Object>} - Loading results
     */
    async loadMultipleStylesheets(stylesheets) {
        this.loadingProgress.total = stylesheets.length;
        this.loadingProgress.loaded = 0;

        const results = {
            successful: [],
            failed: [],
            total: stylesheets.length
        };

        const loadPromises = stylesheets.map(async (stylesheet) => {
            const config = typeof stylesheet === 'string' 
                ? { href: stylesheet } 
                : stylesheet;

            try {
                const success = await this.loadStylesheet(config.href, config);
                if (success) {
                    results.successful.push(config.href);
                } else {
                    results.failed.push(config.href);
                }
                this.loadingProgress.loaded++;
                this.notifyProgress();
            } catch (error) {
                results.failed.push(config.href);
                this.loadingProgress.loaded++;
                this.notifyProgress();
            }
        });

        await Promise.all(loadPromises);
        return results;
    }

    /**
     * Register progress callback
     * @param {Function} callback - Progress callback function
     */
    onProgress(callback) {
        this.progressCallbacks.push(callback);
    }

    /**
     * Update and notify progress
     */
    updateProgress() {
        this.loadingProgress.total = this.loadingPromises.size + this.loadedStylesheets.size;
        this.notifyProgress();
    }

    /**
     * Notify progress callbacks
     */
    notifyProgress() {
        const progress = {
            ...this.loadingProgress,
            percentage: this.loadingProgress.total > 0 
                ? (this.loadingProgress.loaded / this.loadingProgress.total) * 100 
                : 0
        };

        this.progressCallbacks.forEach(callback => {
            try {
                callback(progress);
            } catch (error) {
                console.error('Progress callback error:', error);
            }
        });
    }

    /**
     * Get loading status for a stylesheet
     * @param {string} href - The stylesheet path
     * @returns {string} - Status: 'loaded', 'loading', 'failed', 'not-started'
     */
    getLoadingStatus(href) {
        if (this.loadedStylesheets.has(href)) {
            return 'loaded';
        }
        if (this.loadingPromises.has(href)) {
            return 'loading';
        }
        if (this.failedStylesheets.has(href)) {
            return 'failed';
        }
        return 'not-started';
    }

    /**
     * Get detailed loading information
     * @returns {Object} - Loading information
     */
    getLoadingInfo() {
        return {
            loaded: Array.from(this.loadedStylesheets),
            loading: Array.from(this.loadingPromises.keys()),
            failed: Array.from(this.failedStylesheets.keys()),
            progress: this.loadingProgress
        };
    }

    /**
     * Utility delay function
     * @param {number} ms - Milliseconds to delay
     * @returns {Promise<void>}
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Clear all loaded stylesheets and reset state
     */
    reset() {
        // Remove all dynamically loaded stylesheets
        this.loadedStylesheets.forEach(href => {
            const elements = document.querySelectorAll(`link[href*="${href}"], style[id*="${href}"]`);
            elements.forEach(el => el.remove());
        });

        // Clear state
        this.loadedStylesheets.clear();
        this.failedStylesheets.clear();
        this.loadingPromises.clear();
        this.fallbackStyles.clear();
        this.loadingProgress = { total: 0, loaded: 0 };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StylesheetLoader;
} else {
    window.StylesheetLoader = StylesheetLoader;
}