/**
 * DiagnosticLogger - Comprehensive logging and monitoring system for webview operations
 * 
 * This class provides detailed logging, performance monitoring, and error reporting
 * for all webview operations with actionable diagnostic information.
 */
class DiagnosticLogger {
    constructor() {
        if (DiagnosticLogger.instance) {
            return DiagnosticLogger.instance;
        }

        // Core logging configuration
        this.logLevel = 'INFO'; // DEBUG, INFO, WARN, ERROR
        this.maxLogEntries = 1000;
        this.logBuffer = [];
        this.sessionId = this.generateSessionId();
        this.startTime = Date.now();

        // Performance monitoring
        this.performanceMetrics = new Map();
        this.resourceLoadTimes = new Map();
        this.operationTimers = new Map();
        this.memorySnapshots = [];

        // Error tracking
        this.errorCounts = new Map();
        this.errorPatterns = new Map();
        this.criticalErrors = [];
        this.recoveryAttempts = new Map();

        // Event tracking
        this.eventCounts = new Map();
        this.userActions = [];
        this.systemEvents = [];

        // Diagnostic context
        this.contextStack = [];
        this.currentContext = null;
        this.diagnosticData = new Map();

        // Reporting configuration
        this.reportingEnabled = true;
        this.autoReportThreshold = 5; // Auto-report after 5 critical errors
        this.reportingCallbacks = [];

        DiagnosticLogger.instance = this;
        this.initialize();
    }

    /**
     * Get the singleton instance
     * @returns {DiagnosticLogger} The singleton instance
     */
    static getInstance() {
        if (!DiagnosticLogger.instance) {
            DiagnosticLogger.instance = new DiagnosticLogger();
        }
        return DiagnosticLogger.instance;
    }

    /**
     * Initialize the diagnostic logger
     */
    initialize() {
        this.log('INFO', 'DiagnosticLogger', 'Initializing diagnostic logging system', {
            sessionId: this.sessionId,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href
        });

        // Set up global error handling
        this.setupGlobalErrorHandling();

        // Set up performance monitoring
        this.setupPerformanceMonitoring();

        // Set up memory monitoring
        this.setupMemoryMonitoring();

        // Set up VS Code API monitoring
        this.setupVSCodeAPIMonitoring();

        this.log('INFO', 'DiagnosticLogger', 'Diagnostic logging system initialized');
    }

    /**
     * Log a message with context and metadata
     * @param {string} level - Log level (DEBUG, INFO, WARN, ERROR)
     * @param {string} component - Component name
     * @param {string} message - Log message
     * @param {object} metadata - Additional metadata
     * @param {Error} error - Optional error object
     */
    log(level, component, message, metadata = {}, error = null) {
        const timestamp = Date.now();
        const logEntry = {
            id: this.generateLogId(),
            timestamp,
            sessionId: this.sessionId,
            level,
            component,
            message,
            metadata: { ...metadata },
            context: this.currentContext ? { ...this.currentContext } : null,
            error: error ? this.serializeError(error) : null,
            stackTrace: error ? error.stack : null,
            memoryUsage: this.getMemoryUsage(),
            performanceNow: performance.now()
        };

        // Add to log buffer
        this.addToLogBuffer(logEntry);

        // Console output with formatting
        this.outputToConsole(logEntry);

        // Track error patterns
        if (level === 'ERROR' && error) {
            this.trackError(error, component, metadata);
        }

        // Check for auto-reporting
        if (level === 'ERROR') {
            this.checkAutoReporting();
        }

        return logEntry.id;
    }

    /**
     * Start performance timing for an operation
     * @param {string} operationName - Name of the operation
     * @param {object} metadata - Additional metadata
     * @returns {string} Timer ID
     */
    startTimer(operationName, metadata = {}) {
        const timerId = this.generateTimerId(operationName);
        const startTime = performance.now();

        this.operationTimers.set(timerId, {
            operationName,
            startTime,
            metadata: { ...metadata },
            sessionId: this.sessionId
        });

        this.log('DEBUG', 'PerformanceMonitor', `Started timer for ${operationName}`, {
            timerId,
            operationName,
            ...metadata
        });

        return timerId;
    }

    /**
     * End performance timing for an operation
     * @param {string} timerId - Timer ID from startTimer
     * @param {object} additionalMetadata - Additional metadata
     * @returns {object} Performance metrics
     */
    endTimer(timerId, additionalMetadata = {}) {
        const timer = this.operationTimers.get(timerId);
        if (!timer) {
            this.log('WARN', 'PerformanceMonitor', `Timer not found: ${timerId}`);
            return null;
        }

        const endTime = performance.now();
        const duration = endTime - timer.startTime;

        const metrics = {
            timerId,
            operationName: timer.operationName,
            duration,
            startTime: timer.startTime,
            endTime,
            metadata: { ...timer.metadata, ...additionalMetadata },
            sessionId: this.sessionId
        };

        // Store performance metrics
        if (!this.performanceMetrics.has(timer.operationName)) {
            this.performanceMetrics.set(timer.operationName, []);
        }
        this.performanceMetrics.get(timer.operationName).push(metrics);

        // Clean up timer
        this.operationTimers.delete(timerId);

        this.log('INFO', 'PerformanceMonitor', `Completed ${timer.operationName}`, {
            duration: `${duration.toFixed(2)}ms`,
            operationName: timer.operationName,
            ...metrics.metadata
        });

        return metrics;
    }

    /**
     * Track resource loading performance
     * @param {string} resourceType - Type of resource (script, stylesheet, image, etc.)
     * @param {string} resourcePath - Path to the resource
     * @param {number} loadTime - Load time in milliseconds
     * @param {boolean} success - Whether loading was successful
     * @param {object} metadata - Additional metadata
     */
    trackResourceLoad(resourceType, resourcePath, loadTime, success, metadata = {}) {
        const resourceKey = `${resourceType}:${resourcePath}`;
        
        const loadData = {
            resourceType,
            resourcePath,
            loadTime,
            success,
            timestamp: Date.now(),
            metadata: { ...metadata },
            sessionId: this.sessionId
        };

        this.resourceLoadTimes.set(resourceKey, loadData);

        this.log(success ? 'INFO' : 'WARN', 'ResourceMonitor', 
            `${resourceType} ${success ? 'loaded' : 'failed'}`, {
            resourcePath,
            loadTime: `${loadTime.toFixed(2)}ms`,
            success,
            ...metadata
        });

        // Track slow loading resources
        if (success && loadTime > 5000) { // 5 seconds threshold
            this.log('WARN', 'ResourceMonitor', `Slow resource loading detected`, {
                resourcePath,
                loadTime: `${loadTime.toFixed(2)}ms`,
                threshold: '5000ms'
            });
        }
    }

    /**
     * Set diagnostic context for subsequent operations
     * @param {string} contextName - Name of the context
     * @param {object} contextData - Context data
     */
    setContext(contextName, contextData = {}) {
        this.currentContext = {
            name: contextName,
            data: { ...contextData },
            timestamp: Date.now(),
            id: this.generateContextId()
        };

        this.contextStack.push(this.currentContext);

        this.log('DEBUG', 'ContextManager', `Set context: ${contextName}`, contextData);
    }

    /**
     * Clear current diagnostic context
     */
    clearContext() {
        if (this.currentContext) {
            this.log('DEBUG', 'ContextManager', `Cleared context: ${this.currentContext.name}`);
            this.currentContext = null;
        }
    }

    /**
     * Pop the last context from the stack
     */
    popContext() {
        if (this.contextStack.length > 0) {
            const poppedContext = this.contextStack.pop();
            this.currentContext = this.contextStack.length > 0 
                ? this.contextStack[this.contextStack.length - 1] 
                : null;
            
            this.log('DEBUG', 'ContextManager', `Popped context: ${poppedContext.name}`);
        }
    }

    /**
     * Track user action for diagnostic purposes
     * @param {string} action - Action name
     * @param {object} details - Action details
     */
    trackUserAction(action, details = {}) {
        const actionData = {
            action,
            details: { ...details },
            timestamp: Date.now(),
            context: this.currentContext ? { ...this.currentContext } : null,
            sessionId: this.sessionId
        };

        this.userActions.push(actionData);

        // Keep only recent actions
        if (this.userActions.length > 100) {
            this.userActions = this.userActions.slice(-100);
        }

        this.log('DEBUG', 'UserActionTracker', `User action: ${action}`, details);
    }

    /**
     * Track system event for diagnostic purposes
     * @param {string} event - Event name
     * @param {object} details - Event details
     */
    trackSystemEvent(event, details = {}) {
        const eventData = {
            event,
            details: { ...details },
            timestamp: Date.now(),
            context: this.currentContext ? { ...this.currentContext } : null,
            sessionId: this.sessionId
        };

        this.systemEvents.push(eventData);

        // Keep only recent events
        if (this.systemEvents.length > 200) {
            this.systemEvents = this.systemEvents.slice(-200);
        }

        this.log('DEBUG', 'SystemEventTracker', `System event: ${event}`, details);
    }

    /**
     * Generate comprehensive diagnostic report
     * @param {object} options - Report options
     * @returns {object} Diagnostic report
     */
    generateDiagnosticReport(options = {}) {
        const {
            includePerformance = true,
            includeErrors = true,
            includeUserActions = true,
            includeSystemEvents = true,
            includeLogs = true,
            logLevel = 'INFO'
        } = options;

        const report = {
            sessionInfo: {
                sessionId: this.sessionId,
                startTime: this.startTime,
                duration: Date.now() - this.startTime,
                timestamp: new Date().toISOString(),
                userAgent: navigator.userAgent,
                url: window.location.href
            },
            summary: this.generateSummary()
        };

        if (includePerformance) {
            report.performance = this.generatePerformanceReport();
        }

        if (includeErrors) {
            report.errors = this.generateErrorReport();
        }

        if (includeUserActions) {
            report.userActions = this.userActions.slice(-50); // Last 50 actions
        }

        if (includeSystemEvents) {
            report.systemEvents = this.systemEvents.slice(-100); // Last 100 events
        }

        if (includeLogs) {
            report.logs = this.getFilteredLogs(logLevel);
        }

        report.diagnosticData = Object.fromEntries(this.diagnosticData);
        report.memorySnapshots = this.memorySnapshots.slice(-10); // Last 10 snapshots

        this.log('INFO', 'DiagnosticReporter', 'Generated diagnostic report', {
            reportSize: JSON.stringify(report).length,
            includePerformance,
            includeErrors,
            includeUserActions,
            includeSystemEvents,
            includeLogs
        });

        return report;
    }

    /**
     * Export diagnostic data for external analysis
     * @param {string} format - Export format ('json', 'csv', 'text')
     * @returns {string} Exported data
     */
    exportDiagnosticData(format = 'json') {
        const report = this.generateDiagnosticReport();

        switch (format.toLowerCase()) {
            case 'json':
                return JSON.stringify(report, null, 2);
            
            case 'csv':
                return this.convertToCSV(report);
            
            case 'text':
                return this.convertToText(report);
            
            default:
                throw new Error(`Unsupported export format: ${format}`);
        }
    }

    /**
     * Set up global error handling
     * @private
     */
    setupGlobalErrorHandling() {
        // Capture unhandled errors
        window.addEventListener('error', (event) => {
            this.log('ERROR', 'GlobalErrorHandler', 'Unhandled error', {
                message: event.message,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                type: 'javascript'
            }, event.error);
        });

        // Capture unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            this.log('ERROR', 'GlobalErrorHandler', 'Unhandled promise rejection', {
                reason: event.reason,
                type: 'promise'
            }, event.reason instanceof Error ? event.reason : new Error(event.reason));
        });

        // Capture CSP violations
        document.addEventListener('securitypolicyviolation', (event) => {
            this.log('ERROR', 'CSPViolationHandler', 'Content Security Policy violation', {
                blockedURI: event.blockedURI,
                violatedDirective: event.violatedDirective,
                originalPolicy: event.originalPolicy,
                disposition: event.disposition
            });
        });
    }

    /**
     * Set up performance monitoring
     * @private
     */
    setupPerformanceMonitoring() {
        // Monitor page load performance
        if (performance.timing) {
            window.addEventListener('load', () => {
                const timing = performance.timing;
                const loadTime = timing.loadEventEnd - timing.navigationStart;
                
                this.trackResourceLoad('page', window.location.href, loadTime, true, {
                    domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
                    domInteractive: timing.domInteractive - timing.navigationStart,
                    domComplete: timing.domComplete - timing.navigationStart
                });
            });
        }

        // Monitor resource loading
        if (performance.getEntriesByType) {
            const observer = new PerformanceObserver((list) => {
                list.getEntries().forEach((entry) => {
                    if (entry.entryType === 'resource') {
                        this.trackResourceLoad(
                            this.getResourceType(entry.name),
                            entry.name,
                            entry.duration,
                            entry.transferSize > 0,
                            {
                                transferSize: entry.transferSize,
                                encodedBodySize: entry.encodedBodySize,
                                decodedBodySize: entry.decodedBodySize
                            }
                        );
                    }
                });
            });

            observer.observe({ entryTypes: ['resource'] });
        }
    }

    /**
     * Set up memory monitoring
     * @private
     */
    setupMemoryMonitoring() {
        // Take memory snapshots periodically
        setInterval(() => {
            const memoryInfo = this.getMemoryUsage();
            if (memoryInfo) {
                this.memorySnapshots.push({
                    timestamp: Date.now(),
                    ...memoryInfo
                });

                // Keep only recent snapshots
                if (this.memorySnapshots.length > 100) {
                    this.memorySnapshots = this.memorySnapshots.slice(-100);
                }

                // Log memory warnings
                if (memoryInfo.usedJSHeapSize > 50 * 1024 * 1024) { // 50MB threshold
                    this.log('WARN', 'MemoryMonitor', 'High memory usage detected', {
                        usedJSHeapSize: `${(memoryInfo.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB`,
                        totalJSHeapSize: `${(memoryInfo.totalJSHeapSize / 1024 / 1024).toFixed(2)}MB`
                    });
                }
            }
        }, 30000); // Every 30 seconds
    }

    /**
     * Set up VS Code API monitoring
     * @private
     */
    setupVSCodeAPIMonitoring() {
        // Monitor VS Code API availability
        const checkAPIAvailability = () => {
            const apiManager = window.VSCodeAPIManager?.getInstance();
            if (apiManager) {
                const stats = apiManager.getStats();
                this.diagnosticData.set('vscode-api-stats', {
                    ...stats,
                    timestamp: Date.now()
                });

                if (stats.errorState) {
                    this.log('ERROR', 'VSCodeAPIMonitor', 'VS Code API error detected', stats);
                }
            }
        };

        // Check immediately and then periodically
        checkAPIAvailability();
        setInterval(checkAPIAvailability, 10000); // Every 10 seconds
    }  
  /**
     * Track error patterns and recovery attempts
     * @param {Error} error - The error object
     * @param {string} component - Component where error occurred
     * @param {object} metadata - Additional metadata
     * @private
     */
    trackError(error, component, metadata) {
        const errorKey = `${component}:${error.name}:${error.message}`;
        
        // Count error occurrences
        const currentCount = this.errorCounts.get(errorKey) || 0;
        this.errorCounts.set(errorKey, currentCount + 1);

        // Track error patterns
        const pattern = {
            component,
            errorName: error.name,
            message: error.message,
            count: currentCount + 1,
            firstOccurrence: this.errorPatterns.get(errorKey)?.firstOccurrence || Date.now(),
            lastOccurrence: Date.now(),
            metadata: { ...metadata }
        };
        this.errorPatterns.set(errorKey, pattern);

        // Track critical errors
        if (this.isCriticalError(error, component)) {
            this.criticalErrors.push({
                error: this.serializeError(error),
                component,
                timestamp: Date.now(),
                context: this.currentContext ? { ...this.currentContext } : null,
                metadata: { ...metadata }
            });

            // Keep only recent critical errors
            if (this.criticalErrors.length > 50) {
                this.criticalErrors = this.criticalErrors.slice(-50);
            }
        }
    }

    /**
     * Track recovery attempts for errors
     * @param {string} errorType - Type of error
     * @param {string} recoveryStrategy - Recovery strategy used
     * @param {boolean} success - Whether recovery was successful
     * @param {object} metadata - Additional metadata
     */
    trackRecoveryAttempt(errorType, recoveryStrategy, success, metadata = {}) {
        const recoveryKey = `${errorType}:${recoveryStrategy}`;
        
        if (!this.recoveryAttempts.has(recoveryKey)) {
            this.recoveryAttempts.set(recoveryKey, {
                errorType,
                recoveryStrategy,
                attempts: 0,
                successes: 0,
                failures: 0,
                lastAttempt: null
            });
        }

        const recovery = this.recoveryAttempts.get(recoveryKey);
        recovery.attempts++;
        recovery.lastAttempt = Date.now();

        if (success) {
            recovery.successes++;
        } else {
            recovery.failures++;
        }

        this.log(success ? 'INFO' : 'WARN', 'RecoveryTracker', 
            `Recovery ${success ? 'succeeded' : 'failed'}: ${recoveryStrategy}`, {
            errorType,
            recoveryStrategy,
            success,
            attempts: recovery.attempts,
            successRate: `${((recovery.successes / recovery.attempts) * 100).toFixed(1)}%`,
            ...metadata
        });
    }

    /**
     * Generate performance report
     * @returns {object} Performance report
     * @private
     */
    generatePerformanceReport() {
        const report = {
            operationMetrics: {},
            resourceLoadTimes: {},
            slowOperations: [],
            memoryUsage: this.getMemoryUsage()
        };

        // Aggregate operation metrics
        for (const [operation, metrics] of this.performanceMetrics) {
            const durations = metrics.map(m => m.duration);
            report.operationMetrics[operation] = {
                count: metrics.length,
                averageDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
                minDuration: Math.min(...durations),
                maxDuration: Math.max(...durations),
                totalDuration: durations.reduce((a, b) => a + b, 0)
            };

            // Identify slow operations
            const slowMetrics = metrics.filter(m => m.duration > 1000); // > 1 second
            if (slowMetrics.length > 0) {
                report.slowOperations.push({
                    operation,
                    count: slowMetrics.length,
                    averageDuration: slowMetrics.reduce((a, b) => a + b.duration, 0) / slowMetrics.length
                });
            }
        }

        // Aggregate resource load times
        for (const [resource, data] of this.resourceLoadTimes) {
            const [type] = resource.split(':');
            if (!report.resourceLoadTimes[type]) {
                report.resourceLoadTimes[type] = {
                    count: 0,
                    totalLoadTime: 0,
                    failures: 0,
                    successes: 0
                };
            }

            const typeData = report.resourceLoadTimes[type];
            typeData.count++;
            typeData.totalLoadTime += data.loadTime;
            
            if (data.success) {
                typeData.successes++;
            } else {
                typeData.failures++;
            }
        }

        // Calculate averages
        for (const type of Object.keys(report.resourceLoadTimes)) {
            const typeData = report.resourceLoadTimes[type];
            typeData.averageLoadTime = typeData.totalLoadTime / typeData.count;
            typeData.successRate = (typeData.successes / typeData.count) * 100;
        }

        return report;
    }

    /**
     * Generate error report
     * @returns {object} Error report
     * @private
     */
    generateErrorReport() {
        return {
            errorCounts: Object.fromEntries(this.errorCounts),
            errorPatterns: Array.from(this.errorPatterns.values()),
            criticalErrors: this.criticalErrors.slice(-20), // Last 20 critical errors
            recoveryAttempts: Object.fromEntries(this.recoveryAttempts),
            topErrors: this.getTopErrors(10)
        };
    }

    /**
     * Generate summary statistics
     * @returns {object} Summary statistics
     * @private
     */
    generateSummary() {
        const totalErrors = Array.from(this.errorCounts.values()).reduce((a, b) => a + b, 0);
        const totalOperations = Array.from(this.performanceMetrics.values())
            .reduce((total, metrics) => total + metrics.length, 0);

        return {
            sessionDuration: Date.now() - this.startTime,
            totalLogEntries: this.logBuffer.length,
            totalErrors,
            criticalErrorCount: this.criticalErrors.length,
            totalOperations,
            uniqueErrorTypes: this.errorPatterns.size,
            memoryUsage: this.getMemoryUsage(),
            userActionCount: this.userActions.length,
            systemEventCount: this.systemEvents.length
        };
    }

    /**
     * Get top errors by frequency
     * @param {number} limit - Number of top errors to return
     * @returns {Array} Top errors
     * @private
     */
    getTopErrors(limit = 10) {
        return Array.from(this.errorCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit)
            .map(([errorKey, count]) => ({
                errorKey,
                count,
                pattern: this.errorPatterns.get(errorKey)
            }));
    }

    /**
     * Get filtered logs by level
     * @param {string} minLevel - Minimum log level
     * @returns {Array} Filtered log entries
     * @private
     */
    getFilteredLogs(minLevel = 'INFO') {
        const levelPriority = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 };
        const minPriority = levelPriority[minLevel] || 1;

        return this.logBuffer.filter(entry => 
            levelPriority[entry.level] >= minPriority
        );
    }

    /**
     * Check if error is critical
     * @param {Error} error - Error object
     * @param {string} component - Component name
     * @returns {boolean} Whether error is critical
     * @private
     */
    isCriticalError(error, component) {
        const criticalPatterns = [
            /VS Code API/i,
            /CSP violation/i,
            /initialization/i,
            /security/i,
            /cannot read property/i,
            /is not defined/i
        ];

        const criticalComponents = [
            'VSCodeAPIManager',
            'ScriptLoadingCoordinator',
            'StylesheetLoader',
            'InitializationManager'
        ];

        return criticalPatterns.some(pattern => pattern.test(error.message)) ||
               criticalComponents.includes(component);
    }

    /**
     * Check for auto-reporting threshold
     * @private
     */
    checkAutoReporting() {
        if (this.criticalErrors.length >= this.autoReportThreshold) {
            this.log('WARN', 'AutoReporter', 'Auto-reporting threshold reached', {
                criticalErrorCount: this.criticalErrors.length,
                threshold: this.autoReportThreshold
            });

            // Trigger auto-report
            this.triggerAutoReport();
        }
    }

    /**
     * Trigger automatic diagnostic report
     * @private
     */
    triggerAutoReport() {
        try {
            const report = this.generateDiagnosticReport();
            
            // Notify reporting callbacks
            this.reportingCallbacks.forEach(callback => {
                try {
                    callback(report, 'auto');
                } catch (error) {
                    console.error('Error in reporting callback:', error);
                }
            });

            this.log('INFO', 'AutoReporter', 'Auto-report generated and sent');
        } catch (error) {
            this.log('ERROR', 'AutoReporter', 'Failed to generate auto-report', {}, error);
        }
    }

    /**
     * Add log entry to buffer
     * @param {object} logEntry - Log entry object
     * @private
     */
    addToLogBuffer(logEntry) {
        this.logBuffer.push(logEntry);

        // Maintain buffer size
        if (this.logBuffer.length > this.maxLogEntries) {
            this.logBuffer = this.logBuffer.slice(-this.maxLogEntries);
        }
    }

    /**
     * Output log entry to console with formatting
     * @param {object} logEntry - Log entry object
     * @private
     */
    outputToConsole(logEntry) {
        const { level, component, message, metadata, error } = logEntry;
        const timestamp = new Date(logEntry.timestamp).toISOString();
        
        const prefix = `[${timestamp}] [${level}] [${component}]`;
        const metadataStr = Object.keys(metadata).length > 0 
            ? ` | ${JSON.stringify(metadata)}` 
            : '';

        const fullMessage = `${prefix} ${message}${metadataStr}`;

        switch (level) {
            case 'DEBUG':
                console.debug(fullMessage, error || '');
                break;
            case 'INFO':
                console.info(fullMessage, error || '');
                break;
            case 'WARN':
                console.warn(fullMessage, error || '');
                break;
            case 'ERROR':
                console.error(fullMessage, error || '');
                break;
            default:
                console.log(fullMessage, error || '');
        }
    }

    /**
     * Serialize error object for logging
     * @param {Error} error - Error object
     * @returns {object} Serialized error
     * @private
     */
    serializeError(error) {
        return {
            name: error.name,
            message: error.message,
            stack: error.stack,
            cause: error.cause,
            code: error.code,
            fileName: error.fileName,
            lineNumber: error.lineNumber,
            columnNumber: error.columnNumber
        };
    }

    /**
     * Get memory usage information
     * @returns {object|null} Memory usage data
     * @private
     */
    getMemoryUsage() {
        if (performance.memory) {
            return {
                usedJSHeapSize: performance.memory.usedJSHeapSize,
                totalJSHeapSize: performance.memory.totalJSHeapSize,
                jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
            };
        }
        return null;
    }

    /**
     * Get resource type from URL
     * @param {string} url - Resource URL
     * @returns {string} Resource type
     * @private
     */
    getResourceType(url) {
        if (url.endsWith('.js')) return 'script';
        if (url.endsWith('.css')) return 'stylesheet';
        if (url.match(/\.(png|jpg|jpeg|gif|svg|webp)$/i)) return 'image';
        if (url.match(/\.(woff|woff2|ttf|eot)$/i)) return 'font';
        return 'other';
    }

    /**
     * Convert report to CSV format
     * @param {object} report - Diagnostic report
     * @returns {string} CSV data
     * @private
     */
    convertToCSV(report) {
        const lines = [];
        
        // Add session info
        lines.push('Session Information');
        lines.push('Field,Value');
        Object.entries(report.sessionInfo).forEach(([key, value]) => {
            lines.push(`${key},"${value}"`);
        });
        lines.push('');

        // Add error summary
        if (report.errors) {
            lines.push('Error Summary');
            lines.push('Error Type,Count,Component');
            report.errors.topErrors.forEach(error => {
                const pattern = error.pattern;
                lines.push(`"${pattern.errorName}: ${pattern.message}",${error.count},"${pattern.component}"`);
            });
            lines.push('');
        }

        return lines.join('\n');
    }

    /**
     * Convert report to text format
     * @param {object} report - Diagnostic report
     * @returns {string} Text data
     * @private
     */
    convertToText(report) {
        const lines = [];
        
        lines.push('=== DIAGNOSTIC REPORT ===');
        lines.push(`Session ID: ${report.sessionInfo.sessionId}`);
        lines.push(`Generated: ${report.sessionInfo.timestamp}`);
        lines.push(`Duration: ${Math.round(report.sessionInfo.duration / 1000)}s`);
        lines.push('');

        lines.push('=== SUMMARY ===');
        Object.entries(report.summary).forEach(([key, value]) => {
            lines.push(`${key}: ${value}`);
        });
        lines.push('');

        if (report.errors && report.errors.topErrors.length > 0) {
            lines.push('=== TOP ERRORS ===');
            report.errors.topErrors.forEach((error, index) => {
                const pattern = error.pattern;
                lines.push(`${index + 1}. ${pattern.errorName}: ${pattern.message} (${error.count} times)`);
                lines.push(`   Component: ${pattern.component}`);
                lines.push(`   First: ${new Date(pattern.firstOccurrence).toISOString()}`);
                lines.push(`   Last: ${new Date(pattern.lastOccurrence).toISOString()}`);
                lines.push('');
            });
        }

        return lines.join('\n');
    }

    /**
     * Generate unique session ID
     * @returns {string} Session ID
     * @private
     */
    generateSessionId() {
        return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Generate unique log ID
     * @returns {string} Log ID
     * @private
     */
    generateLogId() {
        return `log_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    }

    /**
     * Generate unique timer ID
     * @param {string} operationName - Operation name
     * @returns {string} Timer ID
     * @private
     */
    generateTimerId(operationName) {
        return `timer_${operationName}_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    }

    /**
     * Generate unique context ID
     * @returns {string} Context ID
     * @private
     */
    generateContextId() {
        return `ctx_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    }

    /**
     * Register callback for diagnostic reports
     * @param {Function} callback - Callback function (report, trigger) => {}
     */
    onReport(callback) {
        if (typeof callback === 'function') {
            this.reportingCallbacks.push(callback);
        }
    }

    /**
     * Set log level
     * @param {string} level - Log level (DEBUG, INFO, WARN, ERROR)
     */
    setLogLevel(level) {
        if (['DEBUG', 'INFO', 'WARN', 'ERROR'].includes(level)) {
            this.logLevel = level;
            this.log('INFO', 'DiagnosticLogger', `Log level set to ${level}`);
        }
    }

    /**
     * Enable or disable reporting
     * @param {boolean} enabled - Whether reporting is enabled
     */
    setReportingEnabled(enabled) {
        this.reportingEnabled = enabled;
        this.log('INFO', 'DiagnosticLogger', `Reporting ${enabled ? 'enabled' : 'disabled'}`);
    }

    /**
     * Get current diagnostic statistics
     * @returns {object} Current statistics
     */
    getStats() {
        return {
            sessionId: this.sessionId,
            uptime: Date.now() - this.startTime,
            logEntries: this.logBuffer.length,
            errorCount: Array.from(this.errorCounts.values()).reduce((a, b) => a + b, 0),
            criticalErrorCount: this.criticalErrors.length,
            performanceMetrics: this.performanceMetrics.size,
            memoryUsage: this.getMemoryUsage(),
            contextStack: this.contextStack.length,
            currentContext: this.currentContext?.name || null
        };
    }

    /**
     * Clear all diagnostic data
     */
    clearData() {
        this.logBuffer = [];
        this.performanceMetrics.clear();
        this.resourceLoadTimes.clear();
        this.operationTimers.clear();
        this.errorCounts.clear();
        this.errorPatterns.clear();
        this.criticalErrors = [];
        this.recoveryAttempts.clear();
        this.userActions = [];
        this.systemEvents = [];
        this.memorySnapshots = [];
        this.contextStack = [];
        this.currentContext = null;
        this.diagnosticData.clear();

        this.log('INFO', 'DiagnosticLogger', 'All diagnostic data cleared');
    }
}

// Create and expose the singleton instance
window.DiagnosticLogger = DiagnosticLogger;

// For convenience, also expose the instance
window.diagnosticLogger = DiagnosticLogger.getInstance();

// Initialize immediately
DiagnosticLogger.getInstance();

console.log('DiagnosticLogger: Comprehensive logging and monitoring system loaded');