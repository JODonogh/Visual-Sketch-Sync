/**
 * CSPViolationHandler
 * Handles Content Security Policy violations and provides alternative loading strategies
 */

(function() {
    'use strict';

    class CSPViolationHandler {
        constructor() {
            this.violations = [];
            this.alternativeStrategies = new Map();
            this.fallbackResources = new Map();
            this.diagnosticLog = [];
            this.isInitialized = false;
            this.violationCallbacks = [];
            
            // Initialize CSP violation monitoring
            this.initializeViolationMonitoring();
        }

        /**
         * Initialize CSP violation monitoring and event listeners
         */
        initializeViolationMonitoring() {
            if (this.isInitialized) return;
            
            // Listen for CSP violations
            document.addEventListener('securitypolicyviolation', (event) => {
                this.handleCSPViolation(event);
            });
            
            // Listen for resource loading errors that might be CSP-related
            window.addEventListener('error', (event) => {
                if (event.target && (event.target.tagName === 'LINK' || event.target.tagName === 'SCRIPT')) {
                    this.handleResourceLoadingError(event);
                }
            }, true);
            
            this.isInitialized = true;
            this.logDiagnostic('CSPViolationHandler initialized');
        }

        /**
         * Handle CSP violations with alternative loading strategies
         * @param {SecurityPolicyViolationEvent} event - CSP violation event
         */
        async handleCSPViolation(event) {
            const violation = {
                timestamp: new Date().toISOString(),
                blockedURI: event.blockedURI,
                violatedDirective: event.violatedDirective,
                originalPolicy: event.originalPolicy,
                sourceFile: event.sourceFile,
                lineNumber: event.lineNumber,
                columnNumber: event.columnNumber
            };
            
            this.violations.push(violation);
            this.logDiagnostic(`CSP violation detected: ${violation.violatedDirective} - ${violation.blockedURI}`);
            
            // Notify violation callbacks
            this.notifyViolationCallbacks(violation);
            
            // Attempt alternative loading based on violation type
            await this.attemptAlternativeLoading(violation);
        }

        /**
         * Handle resource loading errors that might be CSP-related
         * @param {ErrorEvent} event - Error event
         */
        handleResourceLoadingError(event) {
            const target = event.target;
            const resourceType = target.tagName.toLowerCase();
            const resourceURI = target.src || target.href;
            
            this.logDiagnostic(`Resource loading error: ${resourceType} - ${resourceURI}`);
            
            // Check if this might be a CSP-related error
            if (this.isPotentialCSPError(event)) {
                const syntheticViolation = {
                    timestamp: new Date().toISOString(),
                    blockedURI: resourceURI,
                    violatedDirective: resourceType === 'link' ? 'style-src' : 'script-src',
                    originalPolicy: 'unknown',
                    sourceFile: window.location.href,
                    lineNumber: 0,
                    columnNumber: 0,
                    synthetic: true
                };
                
                this.violations.push(syntheticViolation);
                this.attemptAlternativeLoading(syntheticViolation);
            }
        }

        /**
         * Check if an error might be CSP-related
         * @param {ErrorEvent} event - Error event
         * @returns {boolean} - Whether the error might be CSP-related
         */
        isPotentialCSPError(event) {
            const target = event.target;
            const resourceURI = target.src || target.href;
            
            // Check for common CSP-related error patterns
            if (!resourceURI) return false;
            
            // External resources that might be blocked
            if (resourceURI.startsWith('http') && !resourceURI.includes(window.location.hostname)) {
                return true;
            }
            
            // Resources without proper vscode-resource scheme
            if (!resourceURI.startsWith('vscode-resource:') && !resourceURI.startsWith('data:')) {
                return true;
            }
            
            return false;
        }

        /**
         * Attempt alternative loading strategies for blocked resources
         * @param {Object} violation - CSP violation details
         */
        async attemptAlternativeLoading(violation) {
            const { blockedURI, violatedDirective } = violation;
            
            this.logDiagnostic(`Attempting alternative loading for: ${blockedURI}`);
            
            try {
                switch (violatedDirective) {
                    case 'style-src':
                        await this.handleStylesheetViolation(blockedURI, violation);
                        break;
                    case 'script-src':
                        await this.handleScriptViolation(blockedURI, violation);
                        break;
                    case 'img-src':
                        await this.handleImageViolation(blockedURI, violation);
                        break;
                    default:
                        await this.handleGenericViolation(blockedURI, violation);
                }
            } catch (error) {
                this.logDiagnostic(`Alternative loading failed for ${blockedURI}: ${error.message}`);
            }
        }

        /**
         * Handle stylesheet CSP violations with inline CSS injection
         * @param {string} blockedURI - The blocked stylesheet URI
         * @param {Object} violation - Violation details
         */
        async handleStylesheetViolation(blockedURI, violation) {
            this.logDiagnostic(`Handling stylesheet violation: ${blockedURI}`);
            
            // Strategy 1: Try to fetch CSS content and inject inline
            try {
                const cssContent = await this.fetchResourceAsText(blockedURI);
                if (cssContent) {
                    await this.injectInlineCSS(cssContent, `csp-fallback-${Date.now()}`);
                    this.logDiagnostic(`Successfully injected inline CSS for: ${blockedURI}`);
                    return;
                }
            } catch (error) {
                this.logDiagnostic(`Failed to fetch CSS content: ${error.message}`);
            }
            
            // Strategy 2: Use predefined fallback CSS
            const fallbackCSS = this.getFallbackCSS(blockedURI);
            if (fallbackCSS) {
                await this.injectInlineCSS(fallbackCSS, `csp-fallback-predefined-${Date.now()}`);
                this.logDiagnostic(`Applied predefined fallback CSS for: ${blockedURI}`);
                return;
            }
            
            // Strategy 3: Apply minimal critical styles
            await this.applyMinimalStyles();
            this.logDiagnostic(`Applied minimal styles as fallback for: ${blockedURI}`);
        }

        /**
         * Handle script CSP violations with alternative loading
         * @param {string} blockedURI - The blocked script URI
         * @param {Object} violation - Violation details
         */
        async handleScriptViolation(blockedURI, violation) {
            this.logDiagnostic(`Handling script violation: ${blockedURI}`);
            
            // Strategy 1: Try to load script content and execute inline
            try {
                const scriptContent = await this.fetchResourceAsText(blockedURI);
                if (scriptContent) {
                    this.executeInlineScript(scriptContent, `csp-fallback-${Date.now()}`);
                    this.logDiagnostic(`Successfully executed inline script for: ${blockedURI}`);
                    return;
                }
            } catch (error) {
                this.logDiagnostic(`Failed to fetch script content: ${error.message}`);
            }
            
            // Strategy 2: Use fallback script functionality
            const fallbackScript = this.getFallbackScript(blockedURI);
            if (fallbackScript) {
                this.executeInlineScript(fallbackScript, `csp-fallback-predefined-${Date.now()}`);
                this.logDiagnostic(`Applied predefined fallback script for: ${blockedURI}`);
                return;
            }
            
            // Strategy 3: Initialize minimal functionality
            this.initializeMinimalFunctionality(blockedURI);
            this.logDiagnostic(`Initialized minimal functionality for: ${blockedURI}`);
        }

        /**
         * Handle image CSP violations with alternative loading
         * @param {string} blockedURI - The blocked image URI
         * @param {Object} violation - Violation details
         */
        async handleImageViolation(blockedURI, violation) {
            this.logDiagnostic(`Handling image violation: ${blockedURI}`);
            
            // Strategy 1: Convert to data URI if possible
            try {
                const imageData = await this.fetchResourceAsDataURI(blockedURI);
                if (imageData) {
                    this.replaceImageWithDataURI(blockedURI, imageData);
                    this.logDiagnostic(`Successfully converted image to data URI: ${blockedURI}`);
                    return;
                }
            } catch (error) {
                this.logDiagnostic(`Failed to convert image to data URI: ${error.message}`);
            }
            
            // Strategy 2: Use fallback placeholder
            this.replaceImageWithPlaceholder(blockedURI);
            this.logDiagnostic(`Applied placeholder for image: ${blockedURI}`);
        }

        /**
         * Handle generic CSP violations
         * @param {string} blockedURI - The blocked resource URI
         * @param {Object} violation - Violation details
         */
        async handleGenericViolation(blockedURI, violation) {
            this.logDiagnostic(`Handling generic violation: ${violation.violatedDirective} - ${blockedURI}`);
            
            // Log the violation for analysis
            console.warn('CSP Violation - Generic handler:', violation);
            
            // Try to provide user feedback
            this.showCSPViolationNotification(violation);
        }

        /**
         * Fetch resource content as text
         * @param {string} uri - Resource URI
         * @returns {Promise<string>} - Resource content
         */
        async fetchResourceAsText(uri) {
            // Try different URI schemes
            const uriVariants = this.generateURIVariants(uri);
            
            for (const variant of uriVariants) {
                try {
                    const response = await fetch(variant);
                    if (response.ok) {
                        return await response.text();
                    }
                } catch (error) {
                    // Continue to next variant
                }
            }
            
            throw new Error(`Failed to fetch resource: ${uri}`);
        }

        /**
         * Fetch resource as data URI
         * @param {string} uri - Resource URI
         * @returns {Promise<string>} - Data URI
         */
        async fetchResourceAsDataURI(uri) {
            const uriVariants = this.generateURIVariants(uri);
            
            for (const variant of uriVariants) {
                try {
                    const response = await fetch(variant);
                    if (response.ok) {
                        const blob = await response.blob();
                        return new Promise((resolve, reject) => {
                            const reader = new FileReader();
                            reader.onload = () => resolve(reader.result);
                            reader.onerror = reject;
                            reader.readAsDataURL(blob);
                        });
                    }
                } catch (error) {
                    // Continue to next variant
                }
            }
            
            throw new Error(`Failed to fetch resource as data URI: ${uri}`);
        }

        /**
         * Generate URI variants for alternative loading attempts
         * @param {string} uri - Original URI
         * @returns {Array<string>} - URI variants
         */
        generateURIVariants(uri) {
            const variants = [uri];
            
            // Add vscode-resource scheme variant
            if (!uri.startsWith('vscode-resource:')) {
                if (window.ResourceURIBuilder) {
                    variants.push(ResourceURIBuilder.buildURI('', uri));
                } else {
                    variants.push(`vscode-resource:${uri}`);
                }
            }
            
            // Add relative path variants
            if (uri.startsWith('/')) {
                variants.push(`.${uri}`);
                variants.push(`webview${uri}`);
            }
            
            // Add current directory variant
            if (!uri.includes('/') && !uri.startsWith('http')) {
                variants.push(`./${uri}`);
            }
            
            return variants;
        }

        /**
         * Inject CSS content as inline styles
         * @param {string} cssContent - CSS content
         * @param {string} id - Unique identifier
         */
        async injectInlineCSS(cssContent, id) {
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
                        style.styleSheet.cssText = cssContent;
                    } else {
                        style.appendChild(document.createTextNode(cssContent));
                    }
                    
                    // Append to head
                    document.head.appendChild(style);
                    resolve();
                } catch (error) {
                    reject(error);
                }
            });
        }

        /**
         * Execute script content inline
         * @param {string} scriptContent - Script content
         * @param {string} id - Unique identifier
         */
        executeInlineScript(scriptContent, id) {
            try {
                // Create script element
                const script = document.createElement('script');
                script.id = id;
                script.type = 'text/javascript';
                
                // Add script content
                script.appendChild(document.createTextNode(scriptContent));
                
                // Append to head or body
                (document.head || document.body).appendChild(script);
                
                this.logDiagnostic(`Inline script executed: ${id}`);
            } catch (error) {
                this.logDiagnostic(`Failed to execute inline script: ${error.message}`);
                throw error;
            }
        }

        /**
         * Get predefined fallback CSS for common resources
         * @param {string} uri - Resource URI
         * @returns {string|null} - Fallback CSS content
         */
        getFallbackCSS(uri) {
            const fallbackMap = {
                'main-styles.css': `
                    body { font-family: Arial, sans-serif; margin: 0; padding: 0; }
                    .toolbar { background: #f0f0f0; padding: 10px; border-bottom: 1px solid #ccc; }
                    #drawing-canvas { border: 1px solid #ccc; background: white; cursor: crosshair; }
                    .tool-button { margin-right: 5px; padding: 5px 10px; border: 1px solid #ccc; background: white; cursor: pointer; }
                    .tool-button:hover { background: #e0e0e0; }
                `,
                'comprehensive-styles.css': `
                    .canvas-container { display: flex; flex-direction: column; height: 100vh; }
                    .status-bar { background: #333; color: white; padding: 5px 10px; font-size: 12px; }
                    .loading-screen { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); display: flex; justify-content: center; align-items: center; z-index: 9999; }
                `
            };
            
            // Check for exact matches
            for (const [key, css] of Object.entries(fallbackMap)) {
                if (uri.includes(key)) {
                    return css;
                }
            }
            
            return null;
        }

        /**
         * Get predefined fallback script for common resources
         * @param {string} uri - Resource URI
         * @returns {string|null} - Fallback script content
         */
        getFallbackScript(uri) {
            const fallbackMap = {
                'canvas-manager.js': `
                    window.CanvasManager = {
                        initialize: function() { console.log('Fallback CanvasManager initialized'); },
                        clear: function() { 
                            const canvas = document.getElementById('drawing-canvas');
                            if (canvas) {
                                const ctx = canvas.getContext('2d');
                                ctx.clearRect(0, 0, canvas.width, canvas.height);
                            }
                        }
                    };
                `,
                'drawing-tools.js': `
                    window.DrawingTools = {
                        currentTool: 'pen',
                        setTool: function(tool) { this.currentTool = tool; console.log('Tool set to:', tool); }
                    };
                `
            };
            
            // Check for exact matches
            for (const [key, script] of Object.entries(fallbackMap)) {
                if (uri.includes(key)) {
                    return script;
                }
            }
            
            return null;
        }

        /**
         * Apply minimal critical styles for basic functionality
         */
        async applyMinimalStyles() {
            const minimalCSS = `
                body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    margin: 0;
                    padding: 0;
                    background: #1e1e1e;
                    color: #cccccc;
                }
                
                .canvas-container {
                    display: flex;
                    flex-direction: column;
                    height: 100vh;
                }
                
                .toolbar {
                    background: #2d2d30;
                    padding: 8px;
                    border-bottom: 1px solid #3e3e42;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                
                #drawing-canvas {
                    flex: 1;
                    background: white;
                    cursor: crosshair;
                    border: none;
                }
                
                .tool-button {
                    padding: 6px 12px;
                    border: 1px solid #3e3e42;
                    background: #2d2d30;
                    color: #cccccc;
                    cursor: pointer;
                    border-radius: 3px;
                    font-size: 12px;
                }
                
                .tool-button:hover {
                    background: #3e3e42;
                }
                
                .tool-button.active {
                    background: #0e639c;
                    border-color: #0e639c;
                }
                
                .status-bar {
                    background: #007acc;
                    color: white;
                    padding: 4px 8px;
                    font-size: 11px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                
                .loading-screen {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(30, 30, 30, 0.95);
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    align-items: center;
                    z-index: 9999;
                    color: #cccccc;
                }
                
                .error-screen {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(30, 30, 30, 0.95);
                    display: none;
                    flex-direction: column;
                    justify-content: center;
                    align-items: center;
                    z-index: 9999;
                    color: #cccccc;
                    padding: 20px;
                    box-sizing: border-box;
                }
            `;
            
            await this.injectInlineCSS(minimalCSS, 'csp-minimal-styles');
        }

        /**
         * Initialize minimal functionality for blocked scripts
         * @param {string} blockedURI - The blocked script URI
         */
        initializeMinimalFunctionality(blockedURI) {
            // Provide basic canvas functionality if canvas-related script is blocked
            if (blockedURI.includes('canvas')) {
                this.initializeBasicCanvas();
            }
            
            // Provide basic drawing tools if drawing-related script is blocked
            if (blockedURI.includes('drawing') || blockedURI.includes('tool')) {
                this.initializeBasicDrawingTools();
            }
            
            // Provide basic API management if API-related script is blocked
            if (blockedURI.includes('api') || blockedURI.includes('vscode')) {
                this.initializeBasicAPIFunctionality();
            }
        }

        /**
         * Initialize basic canvas functionality
         */
        initializeBasicCanvas() {
            const canvas = document.getElementById('drawing-canvas');
            if (!canvas) return;
            
            // Set canvas size
            canvas.width = canvas.offsetWidth || 800;
            canvas.height = canvas.offsetHeight || 600;
            
            const ctx = canvas.getContext('2d');
            if (!ctx) return;
            
            // Basic drawing state
            let isDrawing = false;
            let lastX = 0;
            let lastY = 0;
            
            // Mouse events
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
            
            this.logDiagnostic('Basic canvas functionality initialized');
        }

        /**
         * Initialize basic drawing tools
         */
        initializeBasicDrawingTools() {
            // Create basic tool functionality
            window.DrawingTools = {
                currentTool: 'pen',
                currentColor: '#000000',
                currentSize: 2,
                
                setTool: function(tool) {
                    this.currentTool = tool;
                    console.log('Tool set to:', tool);
                },
                
                setColor: function(color) {
                    this.currentColor = color;
                    const canvas = document.getElementById('drawing-canvas');
                    if (canvas) {
                        const ctx = canvas.getContext('2d');
                        ctx.strokeStyle = color;
                    }
                },
                
                setSize: function(size) {
                    this.currentSize = size;
                    const canvas = document.getElementById('drawing-canvas');
                    if (canvas) {
                        const ctx = canvas.getContext('2d');
                        ctx.lineWidth = size;
                    }
                },
                
                clear: function() {
                    const canvas = document.getElementById('drawing-canvas');
                    if (canvas) {
                        const ctx = canvas.getContext('2d');
                        ctx.clearRect(0, 0, canvas.width, canvas.height);
                    }
                }
            };
            
            this.logDiagnostic('Basic drawing tools initialized');
        }

        /**
         * Initialize basic API functionality
         */
        initializeBasicAPIFunctionality() {
            if (!window.vscode && window.acquireVsCodeApi) {
                try {
                    window.vscode = window.acquireVsCodeApi();
                    this.logDiagnostic('Basic VS Code API initialized');
                } catch (error) {
                    this.logDiagnostic(`Failed to initialize VS Code API: ${error.message}`);
                }
            }
        }

        /**
         * Replace image with data URI
         * @param {string} originalURI - Original image URI
         * @param {string} dataURI - Data URI
         */
        replaceImageWithDataURI(originalURI, dataURI) {
            const images = document.querySelectorAll(`img[src*="${originalURI}"]`);
            images.forEach(img => {
                img.src = dataURI;
            });
        }

        /**
         * Replace image with placeholder
         * @param {string} originalURI - Original image URI
         */
        replaceImageWithPlaceholder(originalURI) {
            const images = document.querySelectorAll(`img[src*="${originalURI}"]`);
            images.forEach(img => {
                img.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjI0IiBoZWlnaHQ9IjI0IiBmaWxsPSIjZjBmMGYwIi8+CjxwYXRoIGQ9Ik0xMiA4QzEzLjEgOCAxNCA4LjkgMTQgMTBDMTQgMTEuMSAxMy4xIDEyIDEyIDEyQzEwLjkgMTIgMTAgMTEuMSAxMCAxMEMxMCA4LjkgMTAuOSA4IDEyIDhaIiBmaWxsPSIjY2NjY2NjIi8+CjxwYXRoIGQ9Ik01IDE3TDguNSAxMy41TDExIDE2TDE0LjUgMTIuNUwxOSAxN0g1WiIgZmlsbD0iI2NjY2NjYyIvPgo8L3N2Zz4K';
                img.alt = 'Image placeholder (CSP blocked)';
            });
        }

        /**
         * Show CSP violation notification to user
         * @param {Object} violation - Violation details
         */
        showCSPViolationNotification(violation) {
            // Create notification element
            const notification = document.createElement('div');
            notification.style.cssText = `
                position: fixed;
                top: 10px;
                right: 10px;
                background: rgba(255, 152, 0, 0.9);
                color: #000;
                padding: 10px;
                border-radius: 5px;
                z-index: 10000;
                max-width: 300px;
                font-size: 12px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.3);
            `;
            
            notification.innerHTML = `
                <div style="font-weight: bold; margin-bottom: 5px;">⚠️ Resource Blocked</div>
                <div style="margin-bottom: 5px;">A resource was blocked by Content Security Policy:</div>
                <div style="font-family: monospace; font-size: 10px; background: rgba(0,0,0,0.1); padding: 3px; border-radius: 3px; margin-bottom: 5px;">${violation.blockedURI}</div>
                <div style="font-size: 10px; color: #666;">Alternative loading attempted automatically.</div>
                <button onclick="this.parentElement.remove()" style="float: right; background: none; border: none; font-size: 14px; cursor: pointer;">×</button>
            `;
            
            document.body.appendChild(notification);
            
            // Auto-remove after 10 seconds
            setTimeout(() => {
                if (notification.parentElement) {
                    notification.remove();
                }
            }, 10000);
        }

        /**
         * Register callback for CSP violations
         * @param {Function} callback - Callback function
         */
        onViolation(callback) {
            if (typeof callback === 'function') {
                this.violationCallbacks.push(callback);
            }
        }

        /**
         * Notify violation callbacks
         * @param {Object} violation - Violation details
         */
        notifyViolationCallbacks(violation) {
            this.violationCallbacks.forEach(callback => {
                try {
                    callback(violation);
                } catch (error) {
                    console.error('CSPViolationHandler: Error in violation callback:', error);
                }
            });
        }

        /**
         * Log diagnostic information
         * @param {string} message - Diagnostic message
         */
        logDiagnostic(message) {
            const logEntry = {
                timestamp: new Date().toISOString(),
                message: message
            };
            
            this.diagnosticLog.push(logEntry);
            console.log(`CSPViolationHandler: ${message}`);
            
            // Keep log size manageable
            if (this.diagnosticLog.length > 100) {
                this.diagnosticLog = this.diagnosticLog.slice(-50);
            }
        }

        /**
         * Get violation statistics
         * @returns {Object} - Violation statistics
         */
        getViolationStats() {
            const stats = {
                total: this.violations.length,
                byDirective: {},
                recent: this.violations.slice(-10),
                diagnosticLog: this.diagnosticLog.slice(-20)
            };
            
            this.violations.forEach(violation => {
                const directive = violation.violatedDirective;
                stats.byDirective[directive] = (stats.byDirective[directive] || 0) + 1;
            });
            
            return stats;
        }

        /**
         * Clear violation history and diagnostic log
         */
        clearHistory() {
            this.violations = [];
            this.diagnosticLog = [];
            this.logDiagnostic('Violation history cleared');
        }

        /**
         * Export violation data for analysis
         * @returns {Object} - Exportable violation data
         */
        exportViolationData() {
            return {
                violations: this.violations,
                diagnosticLog: this.diagnosticLog,
                timestamp: new Date().toISOString(),
                userAgent: navigator.userAgent,
                url: window.location.href
            };
        }
        
  }

    // Create global instance
    window.CSPViolationHandler = CSPViolationHandler;
    
    // Create singleton instance for immediate use
    window.cspViolationHandler = new CSPViolationHandler();
    
    console.log('CSPViolationHandler loaded and initialized');

})();