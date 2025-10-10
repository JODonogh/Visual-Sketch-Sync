/**
 * InitializationManager - Centralized webview initialization system
 * 
 * This class manages the complete webview startup sequence using the new API
 * and resource management systems with proper error handling and progress indicators.
 */
class InitializationManager {
    constructor() {
        if (InitializationManager.instance) {
            return InitializationManager.instance;
        }

        this.isInitialized = false;
        this.isInitializing = false;
        this.initializationSteps = [];
        this.currentStep = 0;
        this.totalSteps = 0;
        this.startTime = null;
        this.errorRecoveryAttempts = 0;
        this.maxRecoveryAttempts = 3;
        
        // Core managers
        this.vscodeAPIManager = null;
        this.scriptCoordinator = null;
        this.cssInitializer = null;
        this.resourceBuilder = null;
        this.diagnosticLogger = null;
        
        // UI elements
        this.loadingScreen = null;
        this.errorScreen = null;
        this.canvasContainer = null;
        
        InitializationManager.instance = this;
    }

    /**
     * Get the singleton instance
     * @returns {InitializationManager} The singleton instance
     */
    static getInstance() {
        if (!InitializationManager.instance) {
            InitializationManager.instance = new InitializationManager();
        }
        return InitializationManager.instance;
    }

    /**
     * Initialize the webview with comprehensive error handling and progress tracking
     * @returns {Promise<boolean>} Success status
     */
    async initialize() {
        if (this.isInitialized) {
            console.log('InitializationManager: Already initialized');
            return true;
        }

        if (this.isInitializing) {
            console.log('InitializationManager: Already initializing');
            return false;
        }

        this.isInitializing = true;
        this.startTime = performance.now();
        
        // Initialize diagnostic logger first
        this.initializeDiagnosticLogger();
        
        try {
            this.diagnosticLogger.log('INFO', 'InitializationManager', 'Starting webview initialization', {
                timestamp: new Date().toISOString(),
                userAgent: navigator.userAgent,
                url: window.location.href
            });
            
            this.diagnosticLogger.setContext('webview-initialization', {
                startTime: this.startTime,
                maxRecoveryAttempts: this.maxRecoveryAttempts
            });
            
            // Setup initialization steps
            this.setupInitializationSteps();
            
            // Initialize UI elements
            this.initializeUIElements();
            
            // Show loading screen
            this.showLoadingScreen();
            
            // Execute initialization steps
            for (let i = 0; i < this.initializationSteps.length; i++) {
                this.currentStep = i;
                const step = this.initializationSteps[i];
                
                try {
                    this.updateLoadingProgress(step.name, step.description);
                    
                    const timerId = this.diagnosticLogger.startTimer(`init-step-${step.name}`, {
                        stepIndex: i,
                        stepName: step.name,
                        critical: step.critical
                    });
                    
                    this.diagnosticLogger.log('INFO', 'InitializationManager', `Executing step: ${step.name}`, {
                        stepIndex: i + 1,
                        totalSteps: this.totalSteps,
                        description: step.description,
                        critical: step.critical
                    });
                    
                    await step.execute();
                    
                    const metrics = this.diagnosticLogger.endTimer(timerId, {
                        success: true,
                        stepCompleted: true
                    });
                    
                    this.diagnosticLogger.log('INFO', 'InitializationManager', `Step completed: ${step.name}`, {
                        duration: `${metrics.duration.toFixed(2)}ms`,
                        stepIndex: i + 1,
                        totalSteps: this.totalSteps
                    });
                    
                } catch (error) {
                    this.diagnosticLogger.log('ERROR', 'InitializationManager', `Step failed: ${step.name}`, {
                        stepIndex: i + 1,
                        totalSteps: this.totalSteps,
                        critical: step.critical,
                        errorMessage: error.message
                    }, error);
                    
                    if (step.critical) {
                        throw new Error(`Critical step failed: ${step.name} - ${error.message}`);
                    } else {
                        this.diagnosticLogger.log('WARN', 'InitializationManager', `Non-critical step failed, continuing: ${step.name}`, {
                            errorMessage: error.message
                        });
                    }
                }
            }
            
            // Final initialization
            await this.finalizeInitialization();
            
            this.isInitialized = true;
            this.isInitializing = false;
            
            const totalDuration = performance.now() - this.startTime;
            
            this.diagnosticLogger.log('INFO', 'InitializationManager', 'Initialization completed successfully', {
                totalDuration: `${totalDuration.toFixed(2)}ms`,
                stepsCompleted: this.totalSteps,
                errorRecoveryAttempts: this.errorRecoveryAttempts
            });
            
            this.diagnosticLogger.clearContext();
            
            // Track successful initialization
            this.diagnosticLogger.trackSystemEvent('initialization-success', {
                duration: totalDuration,
                stepsCompleted: this.totalSteps
            });
            
            // Hide loading screen and show canvas
            this.hideLoadingScreen();
            this.showCanvas();
            
            return true;
            
        } catch (error) {
            this.diagnosticLogger.log('ERROR', 'InitializationManager', 'Initialization failed', {
                currentStep: this.currentStep,
                totalSteps: this.totalSteps,
                errorRecoveryAttempts: this.errorRecoveryAttempts,
                errorMessage: error.message
            }, error);
            
            this.isInitializing = false;
            
            // Track initialization failure
            this.diagnosticLogger.trackSystemEvent('initialization-failure', {
                error: error.message,
                currentStep: this.currentStep,
                totalSteps: this.totalSteps
            });
            
            // Attempt error recovery
            const recovered = await this.attemptErrorRecovery(error);
            if (!recovered) {
                this.showErrorScreen(error);
            }
            
            return false;
        }
    }

    /**
     * Initialize diagnostic logger
     * @private
     */
    initializeDiagnosticLogger() {
        if (window.DiagnosticLogger) {
            this.diagnosticLogger = window.DiagnosticLogger.getInstance();
            
            // Set up reporting callback for critical errors
            this.diagnosticLogger.onReport((report, trigger) => {
                if (trigger === 'auto' && this.vscodeAPIManager?.isAPIAvailable()) {
                    const vscodeApi = this.vscodeAPIManager.getAPI();
                    vscodeApi.postMessage({
                        type: 'diagnostic-report',
                        trigger,
                        data: report
                    });
                }
            });
        } else {
            // Fallback to console logging if DiagnosticLogger not available
            this.diagnosticLogger = {
                log: (level, component, message, metadata, error) => {
                    console[level.toLowerCase()](
                        `[${level}] [${component}] ${message}`,
                        metadata || {},
                        error || ''
                    );
                },
                startTimer: (name, metadata) => `timer_${Date.now()}`,
                endTimer: (id, metadata) => ({ duration: 0 }),
                setContext: (name, data) => {},
                clearContext: () => {},
                trackSystemEvent: (event, details) => {},
                trackRecoveryAttempt: (type, strategy, success, metadata) => {}
            };
        }
    }

    /**
     * Setup the initialization steps sequence
     * @private
     */
    setupInitializationSteps() {
        this.initializationSteps = [
            {
                name: 'API_MANAGER',
                description: 'Initializing VS Code API Manager...',
                critical: true,
                execute: () => this.initializeAPIManager()
            },
            {
                name: 'RESOURCE_BUILDER',
                description: 'Setting up resource URI builder...',
                critical: true,
                execute: () => this.initializeResourceBuilder()
            },
            {
                name: 'CSS_SYSTEM',
                description: 'Loading stylesheets and CSS system...',
                critical: true,
                execute: () => this.initializeCSSSystem()
            },
            {
                name: 'SCRIPT_COORDINATOR',
                description: 'Initializing script loading coordinator...',
                critical: true,
                execute: () => this.initializeScriptCoordinator()
            },
            {
                name: 'CORE_SCRIPTS',
                description: 'Loading core drawing components...',
                critical: true,
                execute: () => this.loadCoreScripts()
            },
            {
                name: 'OPTIONAL_SCRIPTS',
                description: 'Loading optional components...',
                critical: false,
                execute: () => this.loadOptionalScripts()
            },
            {
                name: 'CANVAS_SETUP',
                description: 'Setting up drawing canvas...',
                critical: true,
                execute: () => this.setupCanvas()
            },
            {
                name: 'EVENT_HANDLERS',
                description: 'Registering event handlers...',
                critical: true,
                execute: () => this.setupEventHandlers()
            },
            {
                name: 'FINAL_VALIDATION',
                description: 'Validating initialization...',
                critical: true,
                execute: () => this.validateInitialization()
            }
        ];
        
        this.totalSteps = this.initializationSteps.length;
    }

    /**
     * Initialize UI elements references
     * @private
     */
    initializeUIElements() {
        this.loadingScreen = document.getElementById('loading-screen');
        this.errorScreen = document.getElementById('error-screen');
        this.canvasContainer = document.getElementById('canvas-container');
        
        if (!this.loadingScreen || !this.errorScreen || !this.canvasContainer) {
            throw new Error('Required UI elements not found in DOM');
        }
    }

    /**
     * Initialize VS Code API Manager
     * @private
     */
    async initializeAPIManager() {
        if (!window.VSCodeAPIManager) {
            throw new Error('VSCodeAPIManager not available');
        }
        
        this.vscodeAPIManager = window.VSCodeAPIManager.getInstance();
        
        // Wait for API to be ready with timeout
        const apiReady = await this.waitForCondition(
            () => this.vscodeAPIManager.isAPIAvailable(),
            5000,
            'VS Code API acquisition'
        );
        
        if (!apiReady) {
            throw new Error('VS Code API failed to initialize within timeout');
        }
        
        console.log('InitializationManager: VS Code API Manager initialized');
    }

    /**
     * Initialize Resource URI Builder
     * @private
     */
    async initializeResourceBuilder() {
        if (!window.ResourceURIBuilder) {
            throw new Error('ResourceURIBuilder not available');
        }
        
        this.resourceBuilder = new window.ResourceURIBuilder();
        
        // Initialize with VS Code API
        const vscodeApi = this.vscodeAPIManager.getAPI();
        if (vscodeApi) {
            this.resourceBuilder.initialize(vscodeApi, null, null);
            console.log('InitializationManager: Resource URI Builder initialized');
        } else {
            throw new Error('VS Code API not available for ResourceURIBuilder');
        }
    }

    /**
     * Initialize CSS System
     * @private
     */
    async initializeCSSSystem() {
        if (!window.CSSInitialization) {
            throw new Error('CSSInitialization not available');
        }
        
        this.cssInitializer = new window.CSSInitialization();
        
        // Wait for CSS initialization to complete
        const cssReady = await this.waitForCondition(
            () => this.cssInitializer.isInitialized,
            10000,
            'CSS system initialization'
        );
        
        if (!cssReady) {
            throw new Error('CSS system failed to initialize within timeout');
        }
        
        console.log('InitializationManager: CSS system initialized');
    }

    /**
     * Initialize Script Loading Coordinator
     * @private
     */
    async initializeScriptCoordinator() {
        if (!window.ScriptLoadingCoordinator) {
            throw new Error('ScriptLoadingCoordinator not available');
        }
        
        this.scriptCoordinator = window.ScriptLoadingCoordinator.getInstance();
        
        // Register additional dependencies
        this.scriptCoordinator.registerDependency('initialization-manager', () => {
            return this.isInitialized;
        });
        
        console.log('InitializationManager: Script Loading Coordinator initialized');
    }

    /**
     * Load core scripts required for basic functionality
     * @private
     */
    async loadCoreScripts() {
        const coreScripts = [
            {
                src: 'persistent-drawing-manager.js',
                dependencies: ['css-initialization', 'vscode-api'],
                timeout: 5000
            },
            {
                src: 'tool-state-manager.js',
                dependencies: ['css-initialization', 'vscode-api'],
                timeout: 5000
            },
            {
                src: 'enhanced-tool-manager.js',
                dependencies: ['css-initialization', 'vscode-api'],
                timeout: 5000
            },
            {
                src: 'tool-integration.js',
                dependencies: ['css-initialization', 'vscode-api'],
                timeout: 5000
            }
        ];
        
        const loadPromises = coreScripts.map(async (scriptConfig) => {
            try {
                await this.scriptCoordinator.loadScript(
                    scriptConfig.src,
                    scriptConfig.dependencies,
                    {
                        critical: true,
                        timeout: scriptConfig.timeout,
                        onProgress: (message) => {
                            console.log(`Loading ${scriptConfig.src}: ${message}`);
                        }
                    }
                );
                console.log(`InitializationManager: Successfully loaded core script: ${scriptConfig.src}`);
            } catch (error) {
                throw new Error(`Failed to load critical script ${scriptConfig.src}: ${error.message}`);
            }
        });
        
        await Promise.all(loadPromises);
        console.log('InitializationManager: All core scripts loaded');
    }

    /**
     * Load optional scripts for enhanced functionality
     * @private
     */
    async loadOptionalScripts() {
        const optionalScripts = [
            {
                src: 'pressure-sensitivity.js',
                dependencies: ['css-initialization'],
                timeout: 3000
            },
            {
                src: 'safe-code-generator.js',
                dependencies: ['vscode-api'],
                timeout: 3000
            },
            {
                src: 'safe-template-system.js',
                dependencies: ['vscode-api'],
                timeout: 3000
            },
            {
                src: 'code-generation-error-handler.js',
                dependencies: ['vscode-api'],
                timeout: 3000
            }
        ];
        
        const loadPromises = optionalScripts.map(async (scriptConfig) => {
            try {
                await this.scriptCoordinator.loadScript(
                    scriptConfig.src,
                    scriptConfig.dependencies,
                    {
                        critical: false,
                        timeout: scriptConfig.timeout,
                        onProgress: (message) => {
                            console.log(`Loading ${scriptConfig.src}: ${message}`);
                        }
                    }
                );
                console.log(`InitializationManager: Successfully loaded optional script: ${scriptConfig.src}`);
            } catch (error) {
                console.warn(`InitializationManager: Failed to load optional script ${scriptConfig.src}:`, error);
            }
        });
        
        await Promise.allSettled(loadPromises);
        console.log('InitializationManager: Optional scripts loading completed');
    }

    /**
     * Setup the drawing canvas
     * @private
     */
    async setupCanvas() {
        // Wait for VSSCanvas to be available
        const canvasReady = await this.waitForCondition(
            () => window.VSSCanvas && typeof window.VSSCanvas.init === 'function',
            5000,
            'VSSCanvas availability'
        );
        
        if (!canvasReady) {
            throw new Error('VSSCanvas not available for initialization');
        }
        
        // Initialize VSSCanvas with error handling
        try {
            const initResult = await window.VSSCanvas.init();
            if (!initResult) {
                throw new Error('VSSCanvas initialization returned false');
            }
            console.log('InitializationManager: Canvas setup completed');
        } catch (error) {
            throw new Error(`Canvas initialization failed: ${error.message}`);
        }
    }

    /**
     * Setup global event handlers
     * @private
     */
    async setupEventHandlers() {
        // Setup error recovery button handlers
        const retryButton = document.getElementById('retry-button');
        const reportButton = document.getElementById('report-button');
        
        if (retryButton) {
            retryButton.addEventListener('click', () => this.handleRetryRequest());
        }
        
        if (reportButton) {
            reportButton.addEventListener('click', () => this.handleErrorReport());
        }
        
        // Setup global error handlers
        window.addEventListener('error', (event) => this.handleGlobalError(event));
        window.addEventListener('unhandledrejection', (event) => this.handleUnhandledRejection(event));
        
        console.log('InitializationManager: Event handlers setup completed');
    }

    /**
     * Validate that initialization completed successfully
     * @private
     */
    async validateInitialization() {
        const validationChecks = [
            {
                name: 'VS Code API',
                check: () => this.vscodeAPIManager && this.vscodeAPIManager.isAPIAvailable()
            },
            {
                name: 'CSS System',
                check: () => this.cssInitializer && this.cssInitializer.isInitialized
            },
            {
                name: 'Canvas',
                check: () => window.VSSCanvas && window.VSSCanvas.hasInitialized
            },
            {
                name: 'Drawing Tools',
                check: () => window.EnhancedToolManager !== undefined
            }
        ];
        
        const failedChecks = [];
        
        for (const validation of validationChecks) {
            try {
                if (!validation.check()) {
                    failedChecks.push(validation.name);
                }
            } catch (error) {
                failedChecks.push(`${validation.name} (error: ${error.message})`);
            }
        }
        
        if (failedChecks.length > 0) {
            throw new Error(`Validation failed for: ${failedChecks.join(', ')}`);
        }
        
        console.log('InitializationManager: All validation checks passed');
    }

    /**
     * Finalize initialization process
     * @private
     */
    async finalizeInitialization() {
        // Update resource references if needed
        if (this.resourceBuilder) {
            try {
                const updateResults = this.resourceBuilder.updateAllResourceReferences();
                console.log('InitializationManager: Resource URI updates completed:', updateResults);
            } catch (error) {
                console.warn('InitializationManager: Resource URI update failed:', error);
            }
        }
        
        // Notify all systems that initialization is complete
        if (this.scriptCoordinator) {
            this.scriptCoordinator.notifyInitializationComplete();
        }
        
        console.log('InitializationManager: Finalization completed');
    }

    /**
     * Wait for a condition to be true with timeout
     * @private
     */
    async waitForCondition(condition, timeout, description) {
        const startTime = Date.now();
        
        while (Date.now() - startTime < timeout) {
            try {
                if (condition()) {
                    return true;
                }
            } catch (error) {
                console.warn(`Condition check failed for ${description}:`, error);
            }
            
            await new Promise(resolve => setTimeout(resolve, 50));
        }
        
        console.error(`Timeout waiting for condition: ${description}`);
        return false;
    }

    /**
     * Update loading progress display
     * @private
     */
    updateLoadingProgress(stepName, description) {
        const statusElement = document.getElementById('loading-status');
        if (statusElement) {
            const progress = Math.round(((this.currentStep + 1) / this.totalSteps) * 100);
            statusElement.textContent = `${description} (${progress}%)`;
        }
        
        console.log(`InitializationManager: [${this.currentStep + 1}/${this.totalSteps}] ${stepName}: ${description}`);
    }

    /**
     * Show loading screen
     * @private
     */
    showLoadingScreen() {
        if (this.loadingScreen) {
            this.loadingScreen.style.display = 'flex';
        }
        if (this.errorScreen) {
            this.errorScreen.style.display = 'none';
        }
        if (this.canvasContainer) {
            this.canvasContainer.style.display = 'none';
        }
    }

    /**
     * Hide loading screen
     * @private
     */
    hideLoadingScreen() {
        if (this.loadingScreen) {
            this.loadingScreen.style.display = 'none';
        }
    }

    /**
     * Show canvas container
     * @private
     */
    showCanvas() {
        if (this.canvasContainer) {
            this.canvasContainer.style.display = 'block';
        }
    }

    /**
     * Show error screen with details
     * @private
     */
    showErrorScreen(error) {
        if (this.errorScreen) {
            this.errorScreen.style.display = 'flex';
            
            const errorMessage = document.getElementById('error-message');
            const errorStack = document.getElementById('error-stack');
            
            if (errorMessage) {
                errorMessage.textContent = error.message || 'An unknown error occurred during initialization';
            }
            
            if (errorStack) {
                errorStack.textContent = error.stack || 'No stack trace available';
            }
        }
        
        if (this.loadingScreen) {
            this.loadingScreen.style.display = 'none';
        }
        
        if (this.canvasContainer) {
            this.canvasContainer.style.display = 'none';
        }
    }

    /**
     * Attempt error recovery
     * @private
     */
    async attemptErrorRecovery(error) {
        if (this.errorRecoveryAttempts >= this.maxRecoveryAttempts) {
            this.diagnosticLogger.log('ERROR', 'InitializationManager', 'Maximum recovery attempts reached', {
                maxAttempts: this.maxRecoveryAttempts,
                originalError: error.message
            });
            
            this.diagnosticLogger.trackRecoveryAttempt('initialization-failure', 'max-attempts-reached', false, {
                attempts: this.errorRecoveryAttempts,
                originalError: error.message
            });
            
            return false;
        }
        
        this.errorRecoveryAttempts++;
        
        this.diagnosticLogger.log('WARN', 'InitializationManager', 'Attempting error recovery', {
            attempt: this.errorRecoveryAttempts,
            maxAttempts: this.maxRecoveryAttempts,
            originalError: error.message,
            currentStep: this.currentStep
        });
        
        const recoveryTimerId = this.diagnosticLogger.startTimer('error-recovery', {
            attempt: this.errorRecoveryAttempts,
            originalError: error.message
        });
        
        try {
            // Reset state
            this.isInitialized = false;
            this.isInitializing = false;
            this.currentStep = 0;
            
            // Wait before retry with exponential backoff
            const delay = 1000 * this.errorRecoveryAttempts;
            this.diagnosticLogger.log('INFO', 'InitializationManager', `Waiting ${delay}ms before recovery attempt`);
            await new Promise(resolve => setTimeout(resolve, delay));
            
            // Attempt reinitialization
            const success = await this.initialize();
            
            const recoveryMetrics = this.diagnosticLogger.endTimer(recoveryTimerId, {
                success,
                attempt: this.errorRecoveryAttempts
            });
            
            this.diagnosticLogger.trackRecoveryAttempt('initialization-failure', 'reinitialization', success, {
                attempt: this.errorRecoveryAttempts,
                duration: recoveryMetrics.duration,
                originalError: error.message
            });
            
            if (success) {
                this.diagnosticLogger.log('INFO', 'InitializationManager', 'Error recovery successful', {
                    attempt: this.errorRecoveryAttempts,
                    duration: `${recoveryMetrics.duration.toFixed(2)}ms`
                });
            }
            
            return success;
            
        } catch (recoveryError) {
            const recoveryMetrics = this.diagnosticLogger.endTimer(recoveryTimerId, {
                success: false,
                attempt: this.errorRecoveryAttempts,
                recoveryError: recoveryError.message
            });
            
            this.diagnosticLogger.log('ERROR', 'InitializationManager', 'Recovery attempt failed', {
                attempt: this.errorRecoveryAttempts,
                originalError: error.message,
                recoveryError: recoveryError.message,
                duration: `${recoveryMetrics.duration.toFixed(2)}ms`
            }, recoveryError);
            
            this.diagnosticLogger.trackRecoveryAttempt('initialization-failure', 'reinitialization', false, {
                attempt: this.errorRecoveryAttempts,
                duration: recoveryMetrics.duration,
                originalError: error.message,
                recoveryError: recoveryError.message
            });
            
            return false;
        }
    }

    /**
     * Handle retry button click
     * @private
     */
    async handleRetryRequest() {
        this.diagnosticLogger.log('INFO', 'InitializationManager', 'User requested retry');
        
        this.diagnosticLogger.trackUserAction('retry-initialization', {
            previousAttempts: this.errorRecoveryAttempts,
            currentStep: this.currentStep
        });
        
        // Reset error recovery attempts for user-initiated retry
        this.errorRecoveryAttempts = 0;
        
        // Hide error screen and show loading
        this.showLoadingScreen();
        
        const retryTimerId = this.diagnosticLogger.startTimer('user-retry', {
            trigger: 'user-action'
        });
        
        // Attempt reinitialization
        const success = await this.initialize();
        
        const retryMetrics = this.diagnosticLogger.endTimer(retryTimerId, {
            success,
            trigger: 'user-action'
        });
        
        if (!success) {
            this.diagnosticLogger.log('ERROR', 'InitializationManager', 'User-initiated retry failed', {
                duration: `${retryMetrics.duration.toFixed(2)}ms`
            });
        } else {
            this.diagnosticLogger.log('INFO', 'InitializationManager', 'User-initiated retry successful', {
                duration: `${retryMetrics.duration.toFixed(2)}ms`
            });
        }
    }

    /**
     * Handle error report button click
     * @private
     */
    handleErrorReport() {
        this.diagnosticLogger.log('INFO', 'InitializationManager', 'User requested error report');
        
        this.diagnosticLogger.trackUserAction('request-error-report', {
            currentStep: this.currentStep,
            errorRecoveryAttempts: this.errorRecoveryAttempts
        });
        
        // Generate comprehensive diagnostic report
        const diagnosticReport = this.diagnosticLogger.generateDiagnosticReport({
            includePerformance: true,
            includeErrors: true,
            includeUserActions: true,
            includeSystemEvents: true,
            includeLogs: true,
            logLevel: 'INFO'
        });
        
        // Add initialization-specific information
        const initializationInfo = {
            initializationSteps: this.initializationSteps.map(step => ({
                name: step.name,
                description: step.description,
                critical: step.critical
            })),
            currentStep: this.currentStep,
            totalSteps: this.totalSteps,
            errorRecoveryAttempts: this.errorRecoveryAttempts,
            availableManagers: {
                vscodeAPI: !!this.vscodeAPIManager,
                scriptCoordinator: !!this.scriptCoordinator,
                cssInitializer: !!this.cssInitializer,
                resourceBuilder: !!this.resourceBuilder,
                diagnosticLogger: !!this.diagnosticLogger
            },
            initializationStatus: {
                isInitialized: this.isInitialized,
                isInitializing: this.isInitializing,
                startTime: this.startTime,
                duration: this.startTime ? performance.now() - this.startTime : null
            }
        };
        
        // Merge with diagnostic report
        const fullReport = {
            ...diagnosticReport,
            initializationInfo
        };
        
        // Send diagnostic info to VS Code extension
        if (this.vscodeAPIManager && this.vscodeAPIManager.isAPIAvailable()) {
            const vscodeApi = this.vscodeAPIManager.getAPI();
            vscodeApi.postMessage({
                type: 'comprehensive-error-report',
                data: fullReport
            });
            
            this.diagnosticLogger.log('INFO', 'InitializationManager', 'Comprehensive error report sent to VS Code', {
                reportSize: JSON.stringify(fullReport).length
            });
        } else {
            this.diagnosticLogger.log('WARN', 'InitializationManager', 'Cannot send error report - VS Code API not available');
        }
        
        // Also log the report locally for debugging
        console.log('InitializationManager: Comprehensive diagnostic report:', fullReport);
    }

    /**
     * Handle global errors
     * @private
     */
    handleGlobalError(event) {
        this.diagnosticLogger.log('ERROR', 'InitializationManager', 'Global error detected', {
            message: event.message,
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
            isInitializing: this.isInitializing,
            currentStep: this.currentStep
        }, event.error);
        
        // If initialization is in progress, this might be a critical error
        if (this.isInitializing) {
            this.diagnosticLogger.log('ERROR', 'InitializationManager', 'Critical error during initialization, attempting recovery');
            this.attemptErrorRecovery(event.error);
        }
    }

    /**
     * Handle unhandled promise rejections
     * @private
     */
    handleUnhandledRejection(event) {
        this.diagnosticLogger.log('ERROR', 'InitializationManager', 'Unhandled promise rejection', {
            reason: event.reason,
            isInitializing: this.isInitializing,
            currentStep: this.currentStep
        }, event.reason instanceof Error ? event.reason : new Error(event.reason));
        
        // Prevent default handling
        event.preventDefault();
        
        // If initialization is in progress, this might be a critical error
        if (this.isInitializing) {
            this.diagnosticLogger.log('ERROR', 'InitializationManager', 'Promise rejection during initialization, attempting recovery');
            this.attemptErrorRecovery(new Error(event.reason));
        }
    }

    /**
     * Get initialization status and performance metrics
     * @returns {object} Status information
     */
    getStatus() {
        return {
            isInitialized: this.isInitialized,
            isInitializing: this.isInitializing,
            currentStep: this.currentStep,
            totalSteps: this.totalSteps,
            errorRecoveryAttempts: this.errorRecoveryAttempts,
            initializationTime: this.startTime ? performance.now() - this.startTime : null,
            managers: {
                vscodeAPI: !!this.vscodeAPIManager,
                scriptCoordinator: !!this.scriptCoordinator,
                cssInitializer: !!this.cssInitializer,
                resourceBuilder: !!this.resourceBuilder
            }
        };
    }

    /**
     * Force reinitialization (for debugging/recovery)
     * @returns {Promise<boolean>} Success status
     */
    async reinitialize() {
        console.log('InitializationManager: Force reinitialization requested');
        
        // Reset all state
        this.isInitialized = false;
        this.isInitializing = false;
        this.currentStep = 0;
        this.errorRecoveryAttempts = 0;
        
        // Clear managers
        this.vscodeAPIManager = null;
        this.scriptCoordinator = null;
        this.cssInitializer = null;
        this.resourceBuilder = null;
        
        // Reinitialize
        return await this.initialize();
    }
}

// Make InitializationManager globally available
window.InitializationManager = InitializationManager;

// Note: Initialization is now handled by the HTML file's script loading system
// This prevents double initialization and ensures proper script loading order

console.log('InitializationManager: Class loaded and ready');