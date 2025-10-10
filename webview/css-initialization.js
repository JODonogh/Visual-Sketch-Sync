/**
 * CSS Initialization System
 * 
 * Handles dynamic loading of stylesheets with progress feedback
 * and fallback mechanisms for CSP compliance.
 */
class CSSInitialization {
    constructor() {
        this.stylesheetLoader = null;
        this.loadingIndicator = null;
        this.isInitialized = false;
        this.criticalStyles = this.getCriticalStyles();
        
        // Initialize immediately
        this.initialize();
    }

    /**
     * Initialize the CSS loading system
     */
    async initialize() {
        try {
            // Apply critical styles immediately (inline fallback)
            this.applyCriticalStyles();
            
            // Initialize stylesheet loader
            this.initializeStylesheetLoader();
            
            // Create loading indicator
            this.createLoadingIndicator();
            
            // Load stylesheets
            await this.loadAllStylesheets();
            
            // Mark as initialized
            this.isInitialized = true;
            
            // Hide loading indicator
            this.hideLoadingIndicator();
            
            console.log('CSS initialization completed successfully');
            
        } catch (error) {
            console.error('CSS initialization failed:', error);
            this.handleInitializationFailure(error);
        }
    }

    /**
     * Get critical styles that must be applied immediately
     */
    getCriticalStyles() {
        return `
            /* Critical styles for immediate rendering */
            body {
                margin: 0;
                padding: 0;
                background: #1e1e1e;
                color: #cccccc;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                overflow: hidden;
            }
            
            .loading-screen {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: #1e1e1e;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                z-index: 9999;
                color: #cccccc;
            }
            
            .css-loading-indicator {
                position: fixed;
                top: 20px;
                right: 20px;
                background: rgba(30, 30, 30, 0.9);
                border: 1px solid #555;
                border-radius: 6px;
                padding: 10px 15px;
                z-index: 10000;
                color: #cccccc;
                font-size: 12px;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            
            .css-loading-spinner {
                width: 16px;
                height: 16px;
                border: 2px solid #333;
                border-top: 2px solid #007acc;
                border-radius: 50%;
                animation: css-spin 1s linear infinite;
            }
            
            @keyframes css-spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            
            .css-progress-bar {
                width: 100px;
                height: 4px;
                background: #333;
                border-radius: 2px;
                overflow: hidden;
                margin-left: 8px;
            }
            
            .css-progress-fill {
                height: 100%;
                background: #007acc;
                width: 0%;
                transition: width 0.3s ease;
            }
        `;
    }

    /**
     * Apply critical styles immediately
     */
    applyCriticalStyles() {
        const style = document.createElement('style');
        style.id = 'critical-styles';
        style.textContent = this.criticalStyles;
        document.head.appendChild(style);
    }

    /**
     * Initialize the stylesheet loader
     */
    initializeStylesheetLoader() {
        if (window.StylesheetLoader) {
            this.stylesheetLoader = new StylesheetLoader();
            
            // Set up progress tracking
            this.stylesheetLoader.onProgress((progress) => {
                this.updateLoadingProgress(progress);
            });
        } else {
            throw new Error('StylesheetLoader not available');
        }
    }

    /**
     * Create loading progress indicator
     */
    createLoadingIndicator() {
        this.loadingIndicator = document.createElement('div');
        this.loadingIndicator.className = 'css-loading-indicator';
        this.loadingIndicator.innerHTML = `
            <div class="css-loading-spinner"></div>
            <span>Loading styles...</span>
            <div class="css-progress-bar">
                <div class="css-progress-fill"></div>
            </div>
        `;
        document.body.appendChild(this.loadingIndicator);
    }

    /**
     * Update loading progress
     */
    updateLoadingProgress(progress) {
        if (!this.loadingIndicator) return;
        
        const progressFill = this.loadingIndicator.querySelector('.css-progress-fill');
        const statusText = this.loadingIndicator.querySelector('span');
        
        if (progressFill) {
            progressFill.style.width = `${progress.percentage}%`;
        }
        
        if (statusText) {
            statusText.textContent = `Loading styles... ${Math.round(progress.percentage)}%`;
        }
    }

    /**
     * Hide loading indicator
     */
    hideLoadingIndicator() {
        if (this.loadingIndicator) {
            this.loadingIndicator.style.opacity = '0';
            setTimeout(() => {
                if (this.loadingIndicator && this.loadingIndicator.parentNode) {
                    this.loadingIndicator.parentNode.removeChild(this.loadingIndicator);
                }
            }, 300);
        }
    }

    /**
     * Load all required stylesheets
     */
    async loadAllStylesheets() {
        const stylesheets = [
            {
                href: 'main-styles.css',
                fallbackCSS: this.getMainStylesFallback(),
                priority: 'high'
            },
            {
                href: '../design-tokens.css',
                fallbackCSS: this.getDesignTokensFallback(),
                priority: 'normal'
            }
        ];

        const results = await this.stylesheetLoader.loadMultipleStylesheets(stylesheets);
        
        // Log results
        console.log('Stylesheet loading results:', results);
        
        // Handle any failures
        if (results.failed.length > 0) {
            console.warn('Some stylesheets failed to load:', results.failed);
        }
        
        return results;
    }

    /**
     * Get fallback CSS for main styles
     */
    getMainStylesFallback() {
        // Return a minimal version of main styles for fallback
        return `
            body { margin: 0; padding: 0; background: #1e1e1e; color: #cccccc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; overflow: hidden; }
            #canvas-container { width: 100%; height: 100vh; position: relative; display: flex; flex-direction: column; }
            #status { background: rgba(30, 30, 30, 0.9); color: #cccccc; padding: 8px 12px; font-size: 12px; border-bottom: 1px solid #555; display: flex; justify-content: space-between; align-items: center; }
            #drawing-canvas { flex: 1; background: white; cursor: crosshair; touch-action: none; user-select: none; }
            .toolbar { position: absolute; top: 50px; left: 10px; background: rgba(30, 30, 30, 0.9); border-radius: 6px; padding: 6px; display: flex; gap: 6px; z-index: 100; height: 30px; align-items: center; }
            .tool-button { background: #3c3c3c; border: none; color: #cccccc; padding: 4px 8px; border-radius: 3px; cursor: pointer; font-size: 11px; height: 24px; display: flex; align-items: center; justify-content: center; min-width: 24px; }
            .tool-button:hover { background: #4c4c4c; }
            .tool-button.active { background: #007acc; }
        `;
    }

    /**
     * Get fallback CSS for design tokens
     */
    getDesignTokensFallback() {
        return `
            :root {
                --color-primary: #007bff;
                --color-success: #28a745;
                --color-danger: #dc3545;
                --color-text: #333333;
                --color-background: #ffffff;
                --spacing-xs: 4px;
                --spacing-sm: 8px;
                --spacing-md: 16px;
                --spacing-lg: 24px;
                --spacing-xl: 32px;
                --font-size-sm: 12px;
                --font-size-md: 14px;
                --font-size-lg: 16px;
                --font-size-xl: 18px;
                --font-weight-normal: 400;
                --font-weight-medium: 500;
                --font-weight-bold: 700;
            }
        `;
    }

    /**
     * Handle initialization failure
     */
    handleInitializationFailure(error) {
        console.error('CSS initialization failed, applying emergency styles:', error);
        
        // Apply emergency inline styles
        const emergencyStyle = document.createElement('style');
        emergencyStyle.id = 'emergency-styles';
        emergencyStyle.textContent = this.getMainStylesFallback() + this.getDesignTokensFallback();
        document.head.appendChild(emergencyStyle);
        
        // Hide loading indicator
        this.hideLoadingIndicator();
        
        // Show error notification
        this.showErrorNotification(error);
    }

    /**
     * Show error notification
     */
    showErrorNotification(error) {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #d32f2f;
            color: white;
            padding: 10px 15px;
            border-radius: 6px;
            z-index: 10001;
            font-size: 12px;
            max-width: 300px;
        `;
        notification.innerHTML = `
            <strong>CSS Loading Error</strong><br>
            Some styles may not display correctly.<br>
            <small>${error.message}</small>
        `;
        
        document.body.appendChild(notification);
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 5000);
    }

    /**
     * Get initialization status
     */
    getStatus() {
        return {
            isInitialized: this.isInitialized,
            stylesheetLoader: this.stylesheetLoader ? this.stylesheetLoader.getLoadingInfo() : null
        };
    }

    /**
     * Reload stylesheets
     */
    async reload() {
        if (this.stylesheetLoader) {
            this.stylesheetLoader.reset();
        }
        this.isInitialized = false;
        await this.initialize();
    }
}

// Initialize CSS loading when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.cssInitialization = new CSSInitialization();
    });
} else {
    // DOM already loaded
    window.cssInitialization = new CSSInitialization();
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CSSInitialization;
} else {
    window.CSSInitialization = CSSInitialization;
}