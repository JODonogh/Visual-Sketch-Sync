/**
 * CSPComplianceManager
 * Manages Content Security Policy configuration and violation handling
 * Implements the design requirements for CSP compliance and resource loading
 */

(function() {
    'use strict';

    class CSPComplianceManager {
        constructor() {
            this.violations = [];
            this.violationCallbacks = [];
            this.isInitialized = false;
            this.diagnosticLogger = null;
            this.resourceLoadingSystem = null;
            
            // CSP configuration
            this.cspDirectives = {
                'default-src': "'none'",
                'style-src': "'unsafe-inline' vscode-resource:",
                'script-src': "'unsafe-inline' vscode-resource:",
                'img-src': "vscode-resource: data:",
                'font-src': "vscode-resource:",
                'connect-src': "vscode-resource:",
                'media-src': "vscode-resource:",
                'object-src': "'none'",
                'base-uri': "'none'",
                'form-action': "'none'"
            };
            
            this.initialize();
        }

        /**
         * Initialize CSP compliance manager
         */
        initialize() {
            if (this.isInitialized) {
                return;
            }

            try {
                // Configure CSP meta tag
                this.configureMeta();
                
                // Set up violation monitoring
                this.setupViolationMonitoring();
                
                // Initialize diagnostic logging
                this.initializeDiagnosticLogging();
                
                this.isInitialized = true;
                this.log('CSPComplianceManager initialized successfully');
                
            } catch (error) {
                console.error('Failed to initialize CSPComplianceManager:', error);
                throw error;
            }
        }

        /**
         * Configure CSP meta tag with proper syntax
         * Requirements: 1.1, 1.3, 3.1
         */
        configureMeta() {
            try {
                // Find existing CSP meta tag
                let cspMeta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
                
                if (!cspMeta) {
                    // Create new CSP meta tag if it doesn't exist
                    cspMeta = document.createElement('meta');
                    cspMeta.setAttribute('http-equiv', 'Content-Security-Policy');
                    document.head.appendChild(cspMeta);
                }
                
                // Build CSP content with proper comma-separated syntax
                const cspContent = Object.entries(this.cspDirectives)
                    .map(([directive, value]) => `${directive} ${value}`)
                    .join('; ');
                
                cspMeta.setAttribute('content', cspContent);
                
                this.log('CSP meta tag configured successfully');
                return true;
                
            } catch (error) {
                console.error('Failed to configure CSP meta tag:', error);
                return false;
            }
        }

        /**
         * Validate resource URI against CSP rules
         * Requirements: 1.2, 3.1
         * @param {string} uri - Resource URI to validate
         * @returns {boolean} - Whether URI is CSP compliant
         */
        validateResourceURI(uri) {
            if (!uri || typeof uri !== 'string') {
                return false;
            }

            try {
                // Check for allowed schemes
                const allowedSchemes = [
                    'vscode-resource:',
                    'data:',
                    'blob:',
                    'about:blank'
                ];

                // Check if URI uses an allowed scheme
                const hasAllowedScheme = allowedSchemes.some(scheme => uri.startsWith(scheme));
                
                if (hasAllowedScheme) {
                    return true;
                }

                // Check for relative paths (which are generally allowed)
                if (!uri.includes('://') && !uri.startsWith('//')) {
                    return true;
                }

                // Log potential CSP violation
                this.log(`URI validation failed for: ${uri}`, 'warn');
                return false;
                
            } catch (error) {
                console.error('Error validating resource URI:', error);
                return false;
            }
        }

        /**
         * Handle CSP violations with recovery mechanisms
         * Requirements: 1.1, 1.2, 1.4, 6.1
         * @param {SecurityPolicyViolationEvent|Object} violation - CSP violation event
         */
        handleViolation(violation) {
            try {
                // Normalize violation object
                const normalizedViolation = this.normalizeViolation(violation);
                
                // Store violation
                this.violations.push(normalizedViolation);
                
                // Log violation
                this.log(`CSP violation detected: ${normalizedViolation.violatedDirective} - ${normalizedViolation.blockedURI}`, 'error');
                
                // Notify callbacks
                this.notifyViolationCallbacks(normalizedViolation);
                
                // Attempt recovery
                this.attemptViolationRecovery(normalizedViolation);
                
                // Log to diagnostic system if available
                if (this.diagnosticLogger && typeof this.diagnosticLogger.logCSPViolation === 'function') {
                    this.diagnosticLogger.logCSPViolation(normalizedViolation);
                }
                
            } catch (error) {
                console.error('Error handling CSP violation:', error);
            }
        }

        /**
         * Generate nonce for inline content when necessary
         * @returns {string} - Generated nonce
         */
        generateNonce() {
            const array = new Uint8Array(16);
            crypto.getRandomValues(array);
            return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
        }

        /**
         * Set up CSP violation monitoring
         * Requirements: 1.1, 1.5, 6.3, 6.4
         */
        setupViolationMonitoring() {
            // Listen for CSP violations
            document.addEventListener('securitypolicyviolation', (event) => {
                this.handleViolation(event);
            });

            // Listen for resource loading errors that might be CSP-related
            window.addEventListener('error', (event) => {
                if (this.isPotentialCSPError(event)) {
                    const syntheticViolation = this.createSyntheticViolation(event);
                    this.handleViolation(syntheticViolation);
                }
            }, true);

            // Enhanced detection: Monitor for failed fetch requests
            this.setupFetchMonitoring();

            // Enhanced detection: Monitor for blocked inline styles
            this.setupInlineStyleMonitoring();

            // Enhanced detection: Monitor for blocked script execution
            this.setupScriptExecutionMonitoring();

            this.log('Enhanced CSP violation monitoring set up');
        }

        /**
         * Set up fetch request monitoring for CSP violations
         * Requirements: 1.1, 1.5
         */
        setupFetchMonitoring() {
            // Wrap the original fetch function
            const originalFetch = window.fetch;
            
            window.fetch = async (...args) => {
                try {
                    const response = await originalFetch.apply(this, args);
                    return response;
                } catch (error) {
                    // Check if this might be a CSP-related fetch failure
                    if (this.isFetchCSPError(error, args[0])) {
                        const syntheticViolation = this.createFetchViolation(args[0], error);
                        this.handleViolation(syntheticViolation);
                    }
                    throw error;
                }
            };
        }

        /**
         * Set up inline style monitoring
         * Requirements: 1.1, 1.5
         */
        setupInlineStyleMonitoring() {
            // Monitor for attempts to set inline styles that might be blocked
            const originalSetAttribute = Element.prototype.setAttribute;
            
            Element.prototype.setAttribute = function(name, value) {
                if (name === 'style' && this.tagName) {
                    // Check if this might cause a CSP violation
                    const manager = window.CSPComplianceManager.getInstance();
                    if (manager && !manager.isInlineStyleAllowed()) {
                        const syntheticViolation = manager.createInlineStyleViolation(this, value);
                        manager.handleViolation(syntheticViolation);
                    }
                }
                return originalSetAttribute.call(this, name, value);
            };
        }

        /**
         * Set up script execution monitoring
         * Requirements: 1.1, 1.5
         */
        setupScriptExecutionMonitoring() {
            // Monitor for dynamic script creation that might be blocked
            const originalCreateElement = document.createElement;
            
            document.createElement = function(tagName) {
                const element = originalCreateElement.call(this, tagName);
                
                if (tagName.toLowerCase() === 'script') {
                    // Add monitoring for script loading
                    element.addEventListener('error', (event) => {
                        const manager = window.CSPComplianceManager.getInstance();
                        if (manager && manager.isPotentialCSPError(event)) {
                            const syntheticViolation = manager.createSyntheticViolation(event);
                            manager.handleViolation(syntheticViolation);
                        }
                    });
                }
                
                return element;
            };
        }

        /**
         * Check if fetch error is CSP-related
         * @param {Error} error - Fetch error
         * @param {string} url - Request URL
         * @returns {boolean} - Whether error is CSP-related
         */
        isFetchCSPError(error, url) {
            if (!error || !url) return false;
            
            // Check error message for CSP-related keywords
            const errorMessage = error.message ? error.message.toLowerCase() : '';
            const cspKeywords = ['content security policy', 'csp', 'blocked', 'refused'];
            
            return cspKeywords.some(keyword => errorMessage.includes(keyword)) ||
                   !this.validateResourceURI(url);
        }

        /**
         * Create synthetic violation for fetch failures
         * @param {string} url - Request URL
         * @param {Error} error - Fetch error
         * @returns {Object} - Synthetic violation object
         */
        createFetchViolation(url, error) {
            return {
                timestamp: new Date().toISOString(),
                blockedURI: url,
                violatedDirective: 'connect-src',
                originalPolicy: 'synthetic-fetch',
                sourceFile: window.location.href,
                lineNumber: 0,
                columnNumber: 0,
                disposition: 'enforce',
                effectiveDirective: 'connect-src',
                synthetic: true,
                errorMessage: error.message
            };
        }

        /**
         * Check if inline styles are allowed by current CSP
         * @returns {boolean} - Whether inline styles are allowed
         */
        isInlineStyleAllowed() {
            const styleSrc = this.cspDirectives['style-src'];
            return styleSrc && styleSrc.includes("'unsafe-inline'");
        }

        /**
         * Create synthetic violation for inline style attempts
         * @param {Element} element - Element with inline style
         * @param {string} styleValue - Style value
         * @returns {Object} - Synthetic violation object
         */
        createInlineStyleViolation(element, styleValue) {
            return {
                timestamp: new Date().toISOString(),
                blockedURI: 'inline',
                violatedDirective: 'style-src',
                originalPolicy: 'synthetic-inline-style',
                sourceFile: window.location.href,
                lineNumber: 0,
                columnNumber: 0,
                disposition: 'enforce',
                effectiveDirective: 'style-src',
                synthetic: true,
                elementTag: element.tagName,
                styleValue: styleValue
            };
        }

        /**
         * Initialize diagnostic logging
         */
        initializeDiagnosticLogging() {
            // Try to get existing diagnostic logger
            if (window.DiagnosticLogger) {
                this.diagnosticLogger = window.DiagnosticLogger.getInstance ? 
                    window.DiagnosticLogger.getInstance() : 
                    new window.DiagnosticLogger();
            }
        }

        /**
         * Normalize violation event to consistent format
         * @param {SecurityPolicyViolationEvent|Object} violation - Violation event
         * @returns {Object} - Normalized violation object
         */
        normalizeViolation(violation) {
            return {
                timestamp: new Date().toISOString(),
                blockedURI: violation.blockedURI || violation.blockedUri || 'unknown',
                violatedDirective: violation.violatedDirective || violation.directive || 'unknown',
                originalPolicy: violation.originalPolicy || 'unknown',
                sourceFile: violation.sourceFile || violation.source || window.location.href,
                lineNumber: violation.lineNumber || 0,
                columnNumber: violation.columnNumber || 0,
                disposition: violation.disposition || 'enforce',
                effectiveDirective: violation.effectiveDirective || violation.violatedDirective || 'unknown'
            };
        }

        /**
         * Check if an error event might be CSP-related
         * @param {ErrorEvent} event - Error event
         * @returns {boolean} - Whether error might be CSP-related
         */
        isPotentialCSPError(event) {
            const target = event.target;
            if (!target || (!target.src && !target.href)) {
                return false;
            }

            const resourceURI = target.src || target.href;
            
            // Check for external resources that might be blocked
            if (resourceURI.startsWith('http') && !resourceURI.includes(window.location.hostname)) {
                return true;
            }
            
            // Check for resources without proper vscode-resource scheme
            if (!this.validateResourceURI(resourceURI)) {
                return true;
            }
            
            return false;
        }

        /**
         * Create synthetic violation from error event
         * @param {ErrorEvent} event - Error event
         * @returns {Object} - Synthetic violation object
         */
        createSyntheticViolation(event) {
            const target = event.target;
            const resourceURI = target.src || target.href;
            const resourceType = target.tagName ? target.tagName.toLowerCase() : 'unknown';
            
            let violatedDirective = 'default-src';
            if (resourceType === 'link' || resourceType === 'style') {
                violatedDirective = 'style-src';
            } else if (resourceType === 'script') {
                violatedDirective = 'script-src';
            } else if (resourceType === 'img') {
                violatedDirective = 'img-src';
            }

            return {
                timestamp: new Date().toISOString(),
                blockedURI: resourceURI,
                violatedDirective: violatedDirective,
                originalPolicy: 'synthetic',
                sourceFile: window.location.href,
                lineNumber: 0,
                columnNumber: 0,
                disposition: 'enforce',
                effectiveDirective: violatedDirective,
                synthetic: true
            };
        }

        /**
         * Attempt recovery from CSP violation with enhanced fallback logic
         * Requirements: 1.1, 1.5, 6.3, 6.4
         * @param {Object} violation - Violation details
         */
        attemptViolationRecovery(violation) {
            try {
                // Track recovery attempt
                this.log(`Starting recovery for violation: ${violation.violatedDirective} - ${violation.blockedURI}`);
                
                // Delegate to resource loading system if available
                if (this.resourceLoadingSystem && typeof this.resourceLoadingSystem.handleCSPViolation === 'function') {
                    this.resourceLoadingSystem.handleCSPViolation(violation);
                    return;
                }

                // Enhanced recovery based on violation type
                switch (violation.violatedDirective) {
                    case 'style-src':
                        this.recoverStylesheetViolation(violation);
                        break;
                    case 'script-src':
                        this.recoverScriptViolation(violation);
                        break;
                    case 'img-src':
                        this.recoverImageViolation(violation);
                        break;
                    case 'connect-src':
                        this.recoverConnectViolation(violation);
                        break;
                    case 'font-src':
                        this.recoverFontViolation(violation);
                        break;
                    default:
                        this.recoverGenericViolation(violation);
                }
                
                // Show recovery notification to user
                this.showRecoveryNotification(violation);
                
            } catch (error) {
                console.error('Error during violation recovery:', error);
                this.notifyUser(`Recovery failed for ${violation.violatedDirective}: ${error.message}`, 'error');
            }
        }

        /**
         * Show recovery notification to user
         * Requirements: 6.3, 6.4
         * @param {Object} violation - Violation details
         */
        showRecoveryNotification(violation) {
            const resourceName = this.getResourceName(violation.blockedURI);
            const message = `Security policy blocked ${resourceName}. Recovery attempted automatically.`;
            
            // Create visual notification
            this.createRecoveryNotification(message, violation);
            
            // Log recovery attempt
            this.log(`Recovery notification shown for: ${violation.blockedURI}`);
        }

        /**
         * Create visual recovery notification
         * @param {string} message - Notification message
         * @param {Object} violation - Violation details
         */
        createRecoveryNotification(message, violation) {
            // Remove any existing recovery notifications
            const existingNotifications = document.querySelectorAll('.csp-recovery-notification');
            existingNotifications.forEach(notification => notification.remove());

            // Create notification element
            const notification = document.createElement('div');
            notification.className = 'csp-recovery-notification';
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: linear-gradient(135deg, #ff9800, #f57c00);
                color: white;
                padding: 12px 16px;
                border-radius: 6px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                z-index: 10001;
                max-width: 350px;
                font-size: 13px;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                animation: slideInRight 0.3s ease-out;
            `;

            // Add animation keyframes
            this.ensureNotificationStyles();

            notification.innerHTML = `
                <div style="display: flex; align-items: flex-start; gap: 8px;">
                    <div style="font-size: 16px;">⚠️</div>
                    <div style="flex: 1;">
                        <div style="font-weight: 600; margin-bottom: 4px;">Resource Recovery</div>
                        <div style="margin-bottom: 8px;">${message}</div>
                        <div style="font-size: 11px; opacity: 0.9;">
                            Directive: ${violation.violatedDirective}
                        </div>
                    </div>
                    <button onclick="this.parentElement.parentElement.remove()" 
                            style="background: none; border: none; color: white; cursor: pointer; font-size: 18px; padding: 0; margin-left: 8px;">×</button>
                </div>
            `;

            document.body.appendChild(notification);

            // Auto-remove after 5 seconds
            setTimeout(() => {
                if (notification.parentElement) {
                    notification.style.animation = 'slideOutRight 0.3s ease-in';
                    setTimeout(() => notification.remove(), 300);
                }
            }, 5000);
        }

        /**
         * Get user-friendly resource name from URI
         * @param {string} uri - Resource URI
         * @returns {string} - User-friendly name
         */
        getResourceName(uri) {
            if (!uri || uri === 'inline') return 'inline content';
            
            try {
                const url = new URL(uri);
                const filename = url.pathname.split('/').pop();
                return filename || 'resource';
            } catch {
                // If not a valid URL, extract filename from path
                const parts = uri.split('/');
                return parts[parts.length - 1] || 'resource';
            }
        }

        /**
         * Recover from connect-src violations (fetch, XHR, etc.)
         * @param {Object} violation - Violation details
         */
        recoverConnectViolation(violation) {
            this.log(`Attempting connect recovery for: ${violation.blockedURI}`);
            
            // Notify user about connection issues
            this.notifyUser('Network request blocked by security policy. Some features may be limited.', 'warning');
            
            // Try to provide offline functionality if applicable
            this.activateOfflineMode(violation);
        }

        /**
         * Recover from font-src violations
         * @param {Object} violation - Violation details
         */
        recoverFontViolation(violation) {
            this.log(`Attempting font recovery for: ${violation.blockedURI}`);
            
            // Apply fallback fonts
            this.applyFallbackFonts();
            
            this.notifyUser('Custom font blocked. Using system fonts instead.', 'info');
        }

        /**
         * Recover from generic violations
         * @param {Object} violation - Violation details
         */
        recoverGenericViolation(violation) {
            this.log(`Attempting generic recovery for: ${violation.violatedDirective} - ${violation.blockedURI}`);
            
            // Log detailed information for debugging
            console.warn('CSP Violation - Generic Recovery:', {
                directive: violation.violatedDirective,
                uri: violation.blockedURI,
                policy: violation.originalPolicy,
                source: violation.sourceFile
            });
            
            this.notifyUser(`Content blocked by security policy: ${violation.violatedDirective}`, 'warning');
        }

        /**
         * Activate offline mode for blocked network requests
         * @param {Object} violation - Violation details
         */
        activateOfflineMode(violation) {
            // Set offline flag
            if (!window.CSPRecoveryState) {
                window.CSPRecoveryState = {};
            }
            window.CSPRecoveryState.offlineMode = true;
            
            // Notify other components about offline mode
            const offlineEvent = new CustomEvent('csp-offline-mode', {
                detail: { violation, timestamp: Date.now() }
            });
            document.dispatchEvent(offlineEvent);
        }

        /**
         * Apply fallback fonts when custom fonts are blocked
         */
        applyFallbackFonts() {
            const fallbackCSS = `
                * {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 
                                'Helvetica Neue', Arial, sans-serif !important;
                }
                code, pre, .monospace {
                    font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', 
                                Consolas, 'Courier New', monospace !important;
                }
            `;
            
            this.injectFallbackCSS(fallbackCSS, 'csp-fallback-fonts');
        }

        /**
         * Inject fallback CSS safely
         * @param {string} css - CSS content
         * @param {string} id - Style element ID
         */
        injectFallbackCSS(css, id) {
            try {
                // Remove existing fallback styles with same ID
                const existing = document.getElementById(id);
                if (existing) {
                    existing.remove();
                }
                
                // Create new style element
                const style = document.createElement('style');
                style.id = id;
                style.type = 'text/css';
                style.textContent = css;
                
                document.head.appendChild(style);
                this.log(`Fallback CSS injected: ${id}`);
                
            } catch (error) {
                console.error('Failed to inject fallback CSS:', error);
            }
        }

        /**
         * Recover from stylesheet CSP violation
         * @param {Object} violation - Violation details
         */
        recoverStylesheetViolation(violation) {
            this.log(`Attempting stylesheet recovery for: ${violation.blockedURI}`);
            
            // Notify user of recovery attempt
            this.notifyUser('Stylesheet blocked by security policy. Attempting recovery...', 'warning');
            
            // Try to trigger fallback style loading
            if (window.FallbackStyleProvider) {
                const provider = window.FallbackStyleProvider.getInstance ? 
                    window.FallbackStyleProvider.getInstance() : 
                    new window.FallbackStyleProvider();
                
                if (typeof provider.applyFallbackStyles === 'function') {
                    provider.applyFallbackStyles();
                }
            }
        }

        /**
         * Recover from script CSP violation
         * @param {Object} violation - Violation details
         */
        recoverScriptViolation(violation) {
            this.log(`Attempting script recovery for: ${violation.blockedURI}`);
            
            // Notify user of recovery attempt
            this.notifyUser('Script blocked by security policy. Some features may be limited.', 'warning');
            
            // Try to initialize minimal functionality
            this.initializeMinimalFunctionality(violation.blockedURI);
        }

        /**
         * Recover from image CSP violation
         * @param {Object} violation - Violation details
         */
        recoverImageViolation(violation) {
            this.log(`Attempting image recovery for: ${violation.blockedURI}`);
            
            // Replace blocked images with placeholders
            const images = document.querySelectorAll(`img[src*="${violation.blockedURI}"]`);
            images.forEach(img => {
                img.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjI0IiBoZWlnaHQ9IjI0IiBmaWxsPSIjZjBmMGYwIi8+CjxwYXRoIGQ9Ik0xMiA4QzEzLjEgOCAxNCA4LjkgMTQgMTBDMTQgMTEuMSAxMy4xIDEyIDEyIDEyQzEwLjkgMTIgMTAgMTEuMSAxMCAxMEMxMCA4LjkgMTAuOSA4IDEyIDhaIiBmaWxsPSIjY2NjY2NjIi8+CjxwYXRoIGQ9Ik01IDE3TDguNSAxMy41TDExIDE2TDE0LjUgMTIuNUwxOSAxN0g1WiIgZmlsbD0iI2NjY2NjYyIvPgo8L3N2Zz4K';
                img.alt = 'Image blocked by security policy';
            });
        }

        /**
         * Initialize minimal functionality when scripts are blocked
         * @param {string} blockedURI - Blocked script URI
         */
        initializeMinimalFunctionality(blockedURI) {
            // Provide basic canvas functionality if canvas-related script is blocked
            if (blockedURI.includes('canvas') && !window.CanvasManager) {
                this.initializeBasicCanvas();
            }
            
            // Provide basic drawing tools if drawing-related script is blocked
            if (blockedURI.includes('drawing') && !window.DrawingTools) {
                this.initializeBasicDrawingTools();
            }
        }

        /**
         * Initialize basic canvas functionality
         */
        initializeBasicCanvas() {
            window.CanvasManager = {
                initialize: () => {
                    this.log('Basic CanvasManager initialized as fallback');
                    const canvas = document.getElementById('drawing-canvas');
                    if (canvas) {
                        canvas.width = canvas.offsetWidth || 800;
                        canvas.height = canvas.offsetHeight || 600;
                    }
                },
                clear: () => {
                    const canvas = document.getElementById('drawing-canvas');
                    if (canvas) {
                        const ctx = canvas.getContext('2d');
                        ctx.clearRect(0, 0, canvas.width, canvas.height);
                    }
                }
            };
        }

        /**
         * Initialize basic drawing tools
         */
        initializeBasicDrawingTools() {
            window.DrawingTools = {
                currentTool: 'pen',
                setTool: (tool) => {
                    this.currentTool = tool;
                    this.log(`Tool set to: ${tool}`);
                }
            };
        }

        /**
         * Add violation callback
         * @param {Function} callback - Callback function
         */
        addViolationCallback(callback) {
            if (typeof callback === 'function') {
                this.violationCallbacks.push(callback);
            }
        }

        /**
         * Remove violation callback
         * @param {Function} callback - Callback function to remove
         */
        removeViolationCallback(callback) {
            const index = this.violationCallbacks.indexOf(callback);
            if (index > -1) {
                this.violationCallbacks.splice(index, 1);
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
                    console.error('Error in violation callback:', error);
                }
            });
        }

        /**
         * Comprehensive user notification system for CSP events
         * Requirements: 6.3, 6.4
         * @param {string} message - Message to display
         * @param {string} type - Message type (info, warning, error, success)
         */
        notifyUser(message, type = 'info') {
            // Try to use existing notification system first
            if (window.ErrorNotificationSystem) {
                const notificationSystem = window.ErrorNotificationSystem.getInstance ? 
                    window.ErrorNotificationSystem.getInstance() : 
                    new window.ErrorNotificationSystem();
                
                if (typeof notificationSystem.showNotification === 'function') {
                    notificationSystem.showNotification(message, type);
                    return;
                }
            }

            // Use built-in notification system
            this.showBuiltInNotification(message, type);
        }

        /**
         * Show built-in notification with enhanced styling
         * @param {string} message - Message to display
         * @param {string} type - Notification type
         */
        showBuiltInNotification(message, type) {
            // Create notification container if it doesn't exist
            let container = document.getElementById('csp-notification-container');
            if (!container) {
                container = this.createNotificationContainer();
            }

            // Create notification element
            const notification = this.createNotificationElement(message, type);
            
            // Add to container
            container.appendChild(notification);

            // Auto-remove after delay
            const delay = type === 'error' ? 8000 : type === 'warning' ? 6000 : 4000;
            setTimeout(() => {
                this.removeNotification(notification);
            }, delay);

            // Log to console as well
            console.log(`CSP Notification [${type}]: ${message}`);
        }

        /**
         * Create notification container
         * @returns {HTMLElement} - Container element
         */
        createNotificationContainer() {
            const container = document.createElement('div');
            container.id = 'csp-notification-container';
            container.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                pointer-events: none;
                max-width: 400px;
            `;
            
            document.body.appendChild(container);
            return container;
        }

        /**
         * Create notification element
         * @param {string} message - Message text
         * @param {string} type - Notification type
         * @returns {HTMLElement} - Notification element
         */
        createNotificationElement(message, type) {
            const notification = document.createElement('div');
            notification.className = `csp-notification csp-notification-${type}`;
            
            // Get type-specific styling
            const typeConfig = this.getNotificationTypeConfig(type);
            
            notification.style.cssText = `
                background: ${typeConfig.background};
                color: ${typeConfig.color};
                border-left: 4px solid ${typeConfig.borderColor};
                padding: 12px 16px;
                margin-bottom: 8px;
                border-radius: 4px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.2);
                font-size: 13px;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                pointer-events: auto;
                cursor: pointer;
                animation: slideInRight 0.3s ease-out;
                position: relative;
                word-wrap: break-word;
            `;

            notification.innerHTML = `
                <div style="display: flex; align-items: flex-start; gap: 8px;">
                    <div style="font-size: 16px; flex-shrink: 0;">${typeConfig.icon}</div>
                    <div style="flex: 1;">
                        <div style="font-weight: 600; margin-bottom: 2px;">${typeConfig.title}</div>
                        <div>${message}</div>
                    </div>
                    <button onclick="this.parentElement.parentElement.remove()" 
                            style="background: none; border: none; color: currentColor; cursor: pointer; font-size: 18px; padding: 0; opacity: 0.7; flex-shrink: 0;">×</button>
                </div>
            `;

            // Add click to dismiss
            notification.addEventListener('click', (e) => {
                if (e.target.tagName !== 'BUTTON') {
                    this.removeNotification(notification);
                }
            });

            return notification;
        }

        /**
         * Get notification type configuration
         * @param {string} type - Notification type
         * @returns {Object} - Type configuration
         */
        getNotificationTypeConfig(type) {
            const configs = {
                info: {
                    icon: 'ℹ️',
                    title: 'Information',
                    background: 'linear-gradient(135deg, #2196f3, #1976d2)',
                    color: 'white',
                    borderColor: '#1976d2'
                },
                warning: {
                    icon: '⚠️',
                    title: 'Warning',
                    background: 'linear-gradient(135deg, #ff9800, #f57c00)',
                    color: 'white',
                    borderColor: '#f57c00'
                },
                error: {
                    icon: '❌',
                    title: 'Error',
                    background: 'linear-gradient(135deg, #f44336, #d32f2f)',
                    color: 'white',
                    borderColor: '#d32f2f'
                },
                success: {
                    icon: '✅',
                    title: 'Success',
                    background: 'linear-gradient(135deg, #4caf50, #388e3c)',
                    color: 'white',
                    borderColor: '#388e3c'
                }
            };

            return configs[type] || configs.info;
        }

        /**
         * Remove notification with animation
         * @param {HTMLElement} notification - Notification element
         */
        removeNotification(notification) {
            if (!notification || !notification.parentElement) return;

            notification.style.animation = 'slideOutRight 0.3s ease-in';
            setTimeout(() => {
                if (notification.parentElement) {
                    notification.remove();
                }
            }, 300);
        }

        /**
         * Clear all notifications
         */
        clearAllNotifications() {
            const container = document.getElementById('csp-notification-container');
            if (container) {
                container.innerHTML = '';
            }
        }

        /**
         * Show recovery success notification
         * @param {string} resourceName - Name of recovered resource
         */
        showRecoverySuccess(resourceName) {
            this.notifyUser(`Successfully recovered ${resourceName} using fallback method.`, 'success');
        }

        /**
         * Show recovery failure notification
         * @param {string} resourceName - Name of failed resource
         * @param {string} reason - Failure reason
         */
        showRecoveryFailure(resourceName, reason) {
            this.notifyUser(`Failed to recover ${resourceName}: ${reason}`, 'error');
        }

        /**
         * Ensure notification styles are loaded
         */
        ensureNotificationStyles() {
            if (!document.getElementById('csp-notification-styles')) {
                const style = document.createElement('style');
                style.id = 'csp-notification-styles';
                style.textContent = `
                    @keyframes slideInRight {
                        from { 
                            transform: translateX(100%); 
                            opacity: 0; 
                        }
                        to { 
                            transform: translateX(0); 
                            opacity: 1; 
                        }
                    }
                    
                    @keyframes slideOutRight {
                        from { 
                            transform: translateX(0); 
                            opacity: 1; 
                        }
                        to { 
                            transform: translateX(100%); 
                            opacity: 0; 
                        }
                    }
                    
                    .csp-notification:hover {
                        transform: translateX(-2px);
                        transition: transform 0.2s ease;
                    }
                    
                    .csp-notification button:hover {
                        opacity: 1 !important;
                        background: rgba(255,255,255,0.2) !important;
                        border-radius: 50% !important;
                    }
                `;
                document.head.appendChild(style);
            }
        }

        /**
         * Set resource loading system reference
         * @param {Object} resourceLoadingSystem - Resource loading system instance
         */
        setResourceLoadingSystem(resourceLoadingSystem) {
            this.resourceLoadingSystem = resourceLoadingSystem;
        }

        /**
         * Get violation statistics
         * @returns {Object} - Violation statistics
         */
        getViolationStats() {
            const stats = {
                total: this.violations.length,
                byDirective: {},
                recent: this.violations.filter(v => {
                    const violationTime = new Date(v.timestamp);
                    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
                    return violationTime > fiveMinutesAgo;
                }).length
            };

            // Count violations by directive
            this.violations.forEach(violation => {
                const directive = violation.violatedDirective;
                stats.byDirective[directive] = (stats.byDirective[directive] || 0) + 1;
            });

            return stats;
        }

        /**
         * Clear violation history
         */
        clearViolations() {
            this.violations = [];
            this.log('Violation history cleared');
        }

        /**
         * Log message with timestamp
         * @param {string} message - Message to log
         * @param {string} level - Log level (log, warn, error)
         */
        log(message, level = 'log') {
            const timestamp = new Date().toISOString();
            console[level](`[${timestamp}] CSPComplianceManager: ${message}`);
        }

        /**
         * Get instance (singleton pattern)
         * @returns {CSPComplianceManager} - Manager instance
         */
        static getInstance() {
            if (!CSPComplianceManager.instance) {
                CSPComplianceManager.instance = new CSPComplianceManager();
            }
            return CSPComplianceManager.instance;
        }
    }

    // Export to global scope
    window.CSPComplianceManager = CSPComplianceManager;

    // Auto-initialize if not in test environment
    if (typeof window !== 'undefined' && !window.TEST_MODE) {
        window.CSPComplianceManager.getInstance();
    }

})();