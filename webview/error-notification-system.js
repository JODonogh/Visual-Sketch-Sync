/**
 * Enhanced Error Display and User Notification System
 * 
 * Provides user-friendly error messages, actionable notifications,
 * retry and report buttons, and comprehensive error logging.
 */

(function() {
    'use strict';
    
    // Check if ErrorNotificationSystem already exists
    if (window.ErrorNotificationSystem) {
        console.log('ErrorNotificationSystem already exists, skipping redefinition');
        return;
    }

    class ErrorNotificationSystem {
        constructor() {
            this.notifications = new Map();
            this.errorLog = [];
            this.maxLogEntries = 100;
            this.notificationContainer = null;
            this.debugMode = false;
            
            this.initializeNotificationContainer();
            this.setupErrorTemplates();
            
            console.log('ErrorNotificationSystem: Initialized');
        }
        
        /**
         * Initialize notification container
         */
        initializeNotificationContainer() {
            // Create notification container if it doesn't exist
            this.notificationContainer = document.getElementById('error-notifications');
            if (!this.notificationContainer) {
                this.notificationContainer = document.createElement('div');
                this.notificationContainer.id = 'error-notifications';
                this.notificationContainer.style.cssText = `
                    position: fixed;
                    top: 10px;
                    right: 10px;
                    z-index: 10000;
                    max-width: 400px;
                    pointer-events: none;
                `;
                document.body.appendChild(this.notificationContainer);
            }
        }
        
        /**
         * Setup user-friendly error message templates
         */
        setupErrorTemplates() {
            this.errorTemplates = {
                'DUPLICATE_DECLARATION': {
                    title: 'Initialization Conflict',
                    message: 'The canvas is already running. We\'re restarting it for you.',
                    type: 'warning',
                    icon: '🔄',
                    userAction: 'This usually happens when the page is refreshed. No action needed.',
                    technicalDetails: 'Variable redeclaration error during webview initialization'
                },
                
                'CANVAS_NOT_FOUND': {
                    title: 'Canvas Loading Issue',
                    message: 'The drawing canvas is still loading. Please wait a moment.',
                    type: 'info',
                    icon: '⏳',
                    userAction: 'The canvas should appear shortly. If it doesn\'t, try refreshing the page.',
                    technicalDetails: 'Canvas DOM element not found during initialization'
                },
                
                'CONTEXT_ERROR': {
                    title: 'Graphics System Error',
                    message: 'There\'s an issue with the graphics system. We\'re fixing it automatically.',
                    type: 'warning',
                    icon: '🎨',
                    userAction: 'This is usually temporary. The canvas will be recreated automatically.',
                    technicalDetails: 'Failed to get 2D rendering context from canvas element'
                },
                
                'DOM_ERROR': {
                    title: 'Page Loading Problem',
                    message: 'Some parts of the page didn\'t load correctly.',
                    type: 'error',
                    icon: '⚠️',
                    userAction: 'Please refresh the page to reload all components.',
                    technicalDetails: 'Required DOM elements missing from page structure'
                },
                
                'TIMEOUT': {
                    title: 'Loading Timeout',
                    message: 'The canvas is taking longer than usual to load.',
                    type: 'warning',
                    icon: '⏰',
                    userAction: 'We\'re trying again with more time. You can also refresh the page.',
                    technicalDetails: 'Initialization process exceeded timeout threshold'
                },
                
                'VSCODE_API_ERROR': {
                    title: 'VS Code Connection Issue',
                    message: 'Can\'t connect to VS Code, but the canvas will still work.',
                    type: 'info',
                    icon: '🔌',
                    userAction: 'You can still draw, but some features may be limited.',
                    technicalDetails: 'VS Code API not available or failed to initialize'
                },
                
                'MEMORY_ERROR': {
                    title: 'Memory Issue',
                    message: 'Running low on memory. We\'re cleaning up to make room.',
                    type: 'warning',
                    icon: '💾',
                    userAction: 'Consider closing other browser tabs if the issue persists.',
                    technicalDetails: 'Memory allocation error or resource exhaustion'
                },
                
                'UNKNOWN': {
                    title: 'Unexpected Error',
                    message: 'Something unexpected happened, but we\'re working to fix it.',
                    type: 'error',
                    icon: '❓',
                    userAction: 'Try refreshing the page. If the problem continues, please report it.',
                    technicalDetails: 'Unclassified error during initialization or operation'
                }
            };
        }
        
        /**
         * Show enhanced error message with user-friendly content
         * @param {string} errorType - Type of error
         * @param {Error} error - Original error object
         * @param {Object} options - Additional options
         */
        showEnhancedError(errorType, error, options = {}) {
            console.log(`ErrorNotificationSystem: Showing enhanced error for ${errorType}`);
            
            const template = this.errorTemplates[errorType] || this.errorTemplates['UNKNOWN'];
            const errorId = this.generateErrorId();
            
            // Log the error
            this.logError(errorType, error, options);
            
            // Update main error screen with enhanced content
            this.updateMainErrorScreen(template, error, options);
            
            // Show notification if not a critical error
            if (template.type !== 'error' || options.showNotification) {
                this.showNotification(template, error, options);
            }
            
            // Set up enhanced action buttons
            this.setupEnhancedActionButtons(errorType, error, options);
            
            return errorId;
        }
        
        /**
         * Update main error screen with enhanced content
         * @param {Object} template - Error template
         * @param {Error} error - Original error
         * @param {Object} options - Additional options
         */
        updateMainErrorScreen(template, error, options) {
            const errorScreen = document.getElementById('error-screen');
            const errorContent = errorScreen?.querySelector('.error-content');
            
            if (!errorScreen || !errorContent) {
                console.warn('ErrorNotificationSystem: Error screen elements not found');
                return;
            }
            
            // Update error screen content with enhanced template
            errorContent.innerHTML = `
                <div class="error-header">
                    <div class="error-icon">${template.icon}</div>
                    <h2 class="error-title">${template.title}</h2>
                </div>
                
                <div class="error-main-message">
                    <p>${template.message}</p>
                </div>
                
                <div class="error-user-action">
                    <h4>What you can do:</h4>
                    <p>${template.userAction}</p>
                </div>
                
                <div class="error-actions">
                    <button id="retry-button" class="retry-button">
                        <span class="button-icon">🔄</span>
                        Try Again
                    </button>
                    <button id="report-button" class="report-button">
                        <span class="button-icon">📋</span>
                        Report Issue
                    </button>
                    <button id="reload-button" class="reload-button">
                        <span class="button-icon">↻</span>
                        Reload Page
                    </button>
                </div>
                
                <details class="error-details">
                    <summary>Technical Details</summary>
                    <div class="technical-info">
                        <div class="tech-section">
                            <strong>Error Type:</strong> ${template.technicalDetails}
                        </div>
                        <div class="tech-section">
                            <strong>Error Message:</strong>
                            <pre class="error-message-text">${error.message}</pre>
                        </div>
                        ${error.stack ? `
                        <div class="tech-section">
                            <strong>Stack Trace:</strong>
                            <pre class="error-stack-text">${error.stack}</pre>
                        </div>
                        ` : ''}
                        <div class="tech-section">
                            <strong>Timestamp:</strong> ${new Date().toLocaleString()}
                        </div>
                        <div class="tech-section">
                            <strong>User Agent:</strong> ${navigator.userAgent}
                        </div>
                    </div>
                </details>
                
                <div class="error-help">
                    <p>Need more help? Check the <a href="#" id="help-link">troubleshooting guide</a> or contact support.</p>
                </div>
            `;
            
            // Add enhanced styles
            this.addEnhancedErrorStyles();
            
            // Show the error screen
            errorScreen.style.display = 'flex';
        }
        
        /**
         * Show notification for non-critical errors
         * @param {Object} template - Error template
         * @param {Error} error - Original error
         * @param {Object} options - Additional options
         */
        showNotification(template, error, options) {
            const notificationId = this.generateErrorId();
            
            const notification = document.createElement('div');
            notification.className = `error-notification notification-${template.type}`;
            notification.id = `notification-${notificationId}`;
            notification.style.cssText = `
                background: ${this.getNotificationColor(template.type)};
                color: white;
                padding: 16px;
                margin-bottom: 10px;
                border-radius: 8px;
                font-size: 14px;
                line-height: 1.4;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                animation: slideInRight 0.3s ease-out;
                pointer-events: auto;
                position: relative;
                max-width: 100%;
            `;
            
            notification.innerHTML = `
                <div class="notification-header">
                    <span class="notification-icon">${template.icon}</span>
                    <span class="notification-title">${template.title}</span>
                    <button class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
                </div>
                <div class="notification-message">${template.message}</div>
                ${options.showActions !== false ? `
                <div class="notification-actions">
                    <button class="notification-action retry-action" data-action="retry">Retry</button>
                    <button class="notification-action details-action" data-action="details">Details</button>
                </div>
                ` : ''}
            `;
            
            // Add event listeners for notification actions
            this.setupNotificationActions(notification, template.type, error);
            
            // Add to container
            this.notificationContainer.appendChild(notification);
            
            // Store notification reference
            this.notifications.set(notificationId, {
                element: notification,
                template: template,
                error: error,
                timestamp: Date.now()
            });
            
            // Auto-remove after delay (longer for errors)
            const autoRemoveDelay = template.type === 'error' ? 15000 : 8000;
            setTimeout(() => {
                this.removeNotification(notificationId);
            }, autoRemoveDelay);
            
            return notificationId;
        }
        
        /**
         * Setup enhanced action buttons with improved functionality
         * @param {string} errorType - Type of error
         * @param {Error} error - Original error
         * @param {Object} options - Additional options
         */
        setupEnhancedActionButtons(errorType, error, options) {
            const retryButton = document.getElementById('retry-button');
            const reportButton = document.getElementById('report-button');
            const reloadButton = document.getElementById('reload-button');
            const helpLink = document.getElementById('help-link');
            
            // Enhanced retry button
            if (retryButton) {
                retryButton.onclick = async () => {
                    console.log('ErrorNotificationSystem: Enhanced retry clicked');
                    
                    // Show retry in progress
                    retryButton.innerHTML = '<span class="button-icon">⏳</span> Retrying...';
                    retryButton.disabled = true;
                    
                    // Hide error screen and show loading
                    const errorScreen = document.getElementById('error-screen');
                    const loadingScreen = document.getElementById('loading-screen');
                    
                    if (errorScreen) errorScreen.style.display = 'none';
                    if (loadingScreen) loadingScreen.style.display = 'flex';
                    
                    // Attempt retry through error recovery manager
                    let success = false;
                    if (window.vssCanvasManager && window.vssCanvasManager.errorRecoveryManager) {
                        success = await window.vssCanvasManager.errorRecoveryManager.manualRetry(errorType);
                    } else if (window.vssCanvasManager) {
                        // Fallback to canvas manager reinitialize
                        success = await window.vssCanvasManager.reinitialize();
                    }
                    
                    if (!success) {
                        // Restore error screen if retry failed
                        if (errorScreen) errorScreen.style.display = 'flex';
                        if (loadingScreen) loadingScreen.style.display = 'none';
                        
                        // Update retry button
                        retryButton.innerHTML = '<span class="button-icon">🔄</span> Try Again';
                        retryButton.disabled = false;
                        
                        // Show failure notification
                        this.showNotification({
                            title: 'Retry Failed',
                            message: 'The retry attempt was unsuccessful. You may need to reload the page.',
                            type: 'error',
                            icon: '❌'
                        }, error, { showActions: false });
                    }
                };
            }
            
            // Enhanced report button
            if (reportButton) {
                reportButton.onclick = () => {
                    console.log('ErrorNotificationSystem: Report issue clicked');
                    this.reportIssue(errorType, error, options);
                };
            }
            
            // Enhanced reload button
            if (reloadButton) {
                reloadButton.onclick = () => {
                    console.log('ErrorNotificationSystem: Reload page clicked');
                    
                    // Show reload confirmation for better UX
                    if (confirm('This will reload the page and you may lose any unsaved work. Continue?')) {
                        window.location.reload();
                    }
                };
            }
            
            // Help link
            if (helpLink) {
                helpLink.onclick = (e) => {
                    e.preventDefault();
                    this.showTroubleshootingGuide(errorType);
                };
            }
        }
        
        /**
         * Setup notification action buttons
         * @param {HTMLElement} notification - Notification element
         * @param {string} errorType - Type of error
         * @param {Error} error - Original error
         */
        setupNotificationActions(notification, errorType, error) {
            const retryAction = notification.querySelector('.retry-action');
            const detailsAction = notification.querySelector('.details-action');
            
            if (retryAction) {
                retryAction.onclick = async () => {
                    console.log('ErrorNotificationSystem: Notification retry clicked');
                    
                    // Update button state
                    retryAction.textContent = 'Retrying...';
                    retryAction.disabled = true;
                    
                    // Attempt retry
                    let success = false;
                    if (window.vssCanvasManager && window.vssCanvasManager.errorRecoveryManager) {
                        success = await window.vssCanvasManager.errorRecoveryManager.manualRetry(errorType);
                    }
                    
                    if (success) {
                        // Remove notification on success
                        notification.remove();
                    } else {
                        // Restore button state on failure
                        retryAction.textContent = 'Retry';
                        retryAction.disabled = false;
                    }
                };
            }
            
            if (detailsAction) {
                detailsAction.onclick = () => {
                    console.log('ErrorNotificationSystem: Show details clicked');
                    this.showErrorDetails(errorType, error);
                };
            }
        }
        
        /**
         * Report issue with comprehensive error information
         * @param {string} errorType - Type of error
         * @param {Error} error - Original error
         * @param {Object} options - Additional options
         */
        reportIssue(errorType, error, options) {
            const errorReport = {
                errorType: errorType,
                message: error.message,
                stack: error.stack,
                timestamp: new Date().toISOString(),
                userAgent: navigator.userAgent,
                url: window.location.href,
                canvasState: this.getCanvasState(),
                errorLog: this.getRecentErrorLog(),
                options: options
            };
            
            // Send to VS Code extension if available
            if (window.vssCanvasManager && window.vssCanvasManager.vscode) {
                window.vssCanvasManager.vscode.postMessage({
                    command: 'reportIssue',
                    data: {
                        source: 'error-notification-system',
                        report: errorReport,
                        timestamp: new Date().toISOString()
                    }
                });
            }
            
            // Show confirmation to user
            this.showNotification({
                title: 'Issue Reported',
                message: 'Thank you for reporting this issue. The error details have been sent to help improve the extension.',
                type: 'success',
                icon: '✅'
            }, error, { showActions: false });
            
            // Log the report
            console.log('ErrorNotificationSystem: Issue reported:', errorReport);
        }
        
        /**
         * Show troubleshooting guide
         * @param {string} errorType - Type of error
         */
        showTroubleshootingGuide(errorType) {
            const troubleshootingSteps = {
                'DUPLICATE_DECLARATION': [
                    'This usually happens when the page is refreshed while the canvas is loading.',
                    'Try waiting a few seconds and the issue should resolve automatically.',
                    'If it persists, refresh the page completely (Ctrl+F5 or Cmd+Shift+R).'
                ],
                'CANVAS_NOT_FOUND': [
                    'Make sure the VS Code extension is properly installed and activated.',
                    'Try closing and reopening the webview panel.',
                    'Check if there are any browser console errors (F12 → Console tab).'
                ],
                'CONTEXT_ERROR': [
                    'This can happen if your graphics drivers are outdated.',
                    'Try updating your graphics drivers.',
                    'If using a virtual machine, ensure hardware acceleration is enabled.'
                ],
                'DOM_ERROR': [
                    'This indicates the page didn\'t load completely.',
                    'Refresh the page (F5) to reload all components.',
                    'Check your internet connection if the issue persists.'
                ],
                'TIMEOUT': [
                    'The canvas is taking longer than usual to load.',
                    'This can happen on slower systems or with limited resources.',
                    'Try closing other applications to free up system resources.',
                    'Wait a bit longer or refresh the page.'
                ]
            };
            
            const steps = troubleshootingSteps[errorType] || troubleshootingSteps['TIMEOUT'];
            
            const guideHtml = `
                <div class="troubleshooting-guide">
                    <h3>Troubleshooting Steps</h3>
                    <ol>
                        ${steps.map(step => `<li>${step}</li>`).join('')}
                    </ol>
                    <p><strong>Still having issues?</strong> Try reloading the page or report the issue for further assistance.</p>
                </div>
            `;
            
            // Show in a modal or notification
            this.showNotification({
                title: 'Troubleshooting Guide',
                message: guideHtml,
                type: 'info',
                icon: '💡'
            }, new Error('Troubleshooting guide'), { showActions: false });
        }
        
        /**
         * Show detailed error information
         * @param {string} errorType - Type of error
         * @param {Error} error - Original error
         */
        showErrorDetails(errorType, error) {
            const details = `
                <div class="error-details-popup">
                    <h4>Error Details</h4>
                    <p><strong>Type:</strong> ${errorType}</p>
                    <p><strong>Message:</strong> ${error.message}</p>
                    <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
                    ${error.stack ? `<p><strong>Stack:</strong><br><code>${error.stack}</code></p>` : ''}
                </div>
            `;
            
            this.showNotification({
                title: 'Error Details',
                message: details,
                type: 'info',
                icon: '🔍'
            }, error, { showActions: false });
        }
        
        /**
         * Log error with comprehensive information
         * @param {string} errorType - Type of error
         * @param {Error} error - Original error
         * @param {Object} options - Additional options
         */
        logError(errorType, error, options) {
            const logEntry = {
                id: this.generateErrorId(),
                type: errorType,
                message: error.message,
                stack: error.stack,
                timestamp: new Date().toISOString(),
                userAgent: navigator.userAgent,
                url: window.location.href,
                options: options
            };
            
            // Add to error log
            this.errorLog.push(logEntry);
            
            // Maintain log size limit
            if (this.errorLog.length > this.maxLogEntries) {
                this.errorLog.shift();
            }
            
            // Console logging with enhanced format
            console.group(`🚨 VSS Canvas Error [${errorType}]`);
            console.error('Message:', error.message);
            console.error('Stack:', error.stack);
            console.info('Timestamp:', logEntry.timestamp);
            console.info('Options:', options);
            console.groupEnd();
            
            // Debug mode additional logging
            if (this.debugMode) {
                console.table([logEntry]);
            }
        }
        
        /**
         * Add enhanced error screen styles
         */
        addEnhancedErrorStyles() {
            if (document.getElementById('enhanced-error-styles')) {
                return; // Already added
            }
            
            const style = document.createElement('style');
            style.id = 'enhanced-error-styles';
            style.textContent = `
                .error-header {
                    display: flex;
                    align-items: center;
                    margin-bottom: 20px;
                }
                
                .error-icon {
                    font-size: 32px;
                    margin-right: 12px;
                }
                
                .error-title {
                    margin: 0;
                    color: #f48771;
                    font-size: 24px;
                }
                
                .error-main-message {
                    background: #2d2d2d;
                    border-left: 4px solid #f48771;
                    padding: 16px;
                    margin: 20px 0;
                    border-radius: 4px;
                }
                
                .error-user-action {
                    background: #1a3a1a;
                    border-left: 4px solid #28a745;
                    padding: 16px;
                    margin: 20px 0;
                    border-radius: 4px;
                }
                
                .error-user-action h4 {
                    margin: 0 0 8px 0;
                    color: #28a745;
                }
                
                .error-actions {
                    display: flex;
                    gap: 12px;
                    margin: 20px 0;
                    flex-wrap: wrap;
                }
                
                .retry-button, .report-button, .reload-button {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 12px 20px;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 14px;
                    font-weight: 500;
                    transition: all 0.2s ease;
                }
                
                .retry-button {
                    background: #007acc;
                    color: white;
                }
                
                .retry-button:hover:not(:disabled) {
                    background: #005a9e;
                    transform: translateY(-1px);
                }
                
                .retry-button:disabled {
                    background: #555;
                    cursor: not-allowed;
                }
                
                .report-button {
                    background: #6c757d;
                    color: white;
                }
                
                .report-button:hover {
                    background: #545b62;
                    transform: translateY(-1px);
                }
                
                .reload-button {
                    background: #dc3545;
                    color: white;
                }
                
                .reload-button:hover {
                    background: #c82333;
                    transform: translateY(-1px);
                }
                
                .button-icon {
                    font-size: 16px;
                }
                
                .technical-info {
                    background: #1a1a1a;
                    border: 1px solid #333;
                    border-radius: 4px;
                    padding: 16px;
                    margin-top: 12px;
                }
                
                .tech-section {
                    margin-bottom: 12px;
                }
                
                .tech-section:last-child {
                    margin-bottom: 0;
                }
                
                .error-message-text, .error-stack-text {
                    background: #0d1117;
                    border: 1px solid #30363d;
                    border-radius: 4px;
                    padding: 12px;
                    margin-top: 8px;
                    font-size: 12px;
                    color: #f0f6fc;
                    overflow-x: auto;
                    white-space: pre-wrap;
                }
                
                .error-help {
                    margin-top: 20px;
                    padding-top: 20px;
                    border-top: 1px solid #444;
                    text-align: center;
                    color: #999;
                }
                
                .error-help a {
                    color: #007acc;
                    text-decoration: none;
                }
                
                .error-help a:hover {
                    text-decoration: underline;
                }
                
                /* Notification styles */
                .notification-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: 8px;
                    font-weight: bold;
                }
                
                .notification-icon {
                    margin-right: 8px;
                    font-size: 16px;
                }
                
                .notification-close {
                    background: none;
                    border: none;
                    color: white;
                    font-size: 18px;
                    cursor: pointer;
                    padding: 0;
                    width: 20px;
                    height: 20px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                
                .notification-actions {
                    margin-top: 12px;
                    display: flex;
                    gap: 8px;
                }
                
                .notification-action {
                    background: rgba(255,255,255,0.2);
                    border: none;
                    color: white;
                    padding: 6px 12px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 12px;
                }
                
                .notification-action:hover:not(:disabled) {
                    background: rgba(255,255,255,0.3);
                }
                
                .notification-action:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }
                
                /* Animation */
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
            `;
            
            document.head.appendChild(style);
        }
        
        /**
         * Get notification color based on type
         * @param {string} type - Notification type
         * @returns {string} - CSS color
         */
        getNotificationColor(type) {
            const colors = {
                error: 'linear-gradient(135deg, #dc3545, #c82333)',
                warning: 'linear-gradient(135deg, #ffc107, #e0a800)',
                info: 'linear-gradient(135deg, #17a2b8, #138496)',
                success: 'linear-gradient(135deg, #28a745, #1e7e34)'
            };
            return colors[type] || colors.error;
        }
        
        /**
         * Generate unique error ID
         * @returns {string} - Unique ID
         */
        generateErrorId() {
            return 'err_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        }
        
        /**
         * Remove notification by ID
         * @param {string} notificationId - Notification ID
         */
        removeNotification(notificationId) {
            const notification = this.notifications.get(notificationId);
            if (notification && notification.element.parentElement) {
                notification.element.remove();
                this.notifications.delete(notificationId);
            }
        }
        
        /**
         * Get current canvas state for error reporting
         * @returns {Object} - Canvas state information
         */
        getCanvasState() {
            if (window.vssCanvasManager) {
                return window.vssCanvasManager.getState();
            }
            return {
                canvasManagerAvailable: false,
                timestamp: new Date().toISOString()
            };
        }
        
        /**
         * Get recent error log entries
         * @param {number} count - Number of recent entries (default: 10)
         * @returns {Array} - Recent error log entries
         */
        getRecentErrorLog(count = 10) {
            return this.errorLog.slice(-count);
        }
        
        /**
         * Clear error log
         */
        clearErrorLog() {
            this.errorLog = [];
            console.log('ErrorNotificationSystem: Error log cleared');
        }
        
        /**
         * Enable/disable debug mode
         * @param {boolean} enabled - Debug mode state
         */
        setDebugMode(enabled) {
            this.debugMode = enabled;
            console.log(`ErrorNotificationSystem: Debug mode ${enabled ? 'enabled' : 'disabled'}`);
        }
        
        /**
         * Get error statistics
         * @returns {Object} - Error statistics
         */
        getErrorStats() {
            const errorsByType = {};
            this.errorLog.forEach(entry => {
                errorsByType[entry.type] = (errorsByType[entry.type] || 0) + 1;
            });
            
            return {
                totalErrors: this.errorLog.length,
                errorsByType: errorsByType,
                activeNotifications: this.notifications.size,
                recentErrors: this.getRecentErrorLog(5)
            };
        }
    }
    
    // Expose ErrorNotificationSystem to global scope
    window.ErrorNotificationSystem = ErrorNotificationSystem;
    
    console.log('ErrorNotificationSystem: Class definition loaded');
    
})(); // End of IIFE