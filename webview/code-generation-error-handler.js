/**
 * CodeGenerationErrorHandler - Comprehensive error handling for code generation
 * 
 * This system provides try-catch blocks, fallback templates, user-friendly error messages,
 * and retry mechanisms for robust code generation.
 */

(function() {
    'use strict';
    
    class CodeGenerationErrorHandler {
        constructor() {
            this.errorHistory = [];
            this.retryAttempts = new Map();
            this.maxRetries = 3;
            this.fallbackGenerator = null;
            this.templateSystem = null;
            this.errorCallbacks = new Map();
            
            this.initializeErrorTypes();
            this.initializeFallbackGenerator();
        }
        
        /**
         * Initialize error type definitions
         */
        initializeErrorTypes() {
            this.errorTypes = {
                TEMPLATE_CORRUPTION: {
                    code: 'TEMPLATE_CORRUPTION',
                    severity: 'high',
                    recoverable: true,
                    userMessage: 'Template files may be corrupted. Using backup templates.',
                    technicalMessage: 'Template validation failed or template structure is invalid'
                },
                ELEMENT_PROCESSING: {
                    code: 'ELEMENT_PROCESSING',
                    severity: 'medium',
                    recoverable: true,
                    userMessage: 'Some drawing elements could not be processed. Generated code may be incomplete.',
                    technicalMessage: 'Error processing drawing element data structure'
                },
                CODE_GENERATION: {
                    code: 'CODE_GENERATION',
                    severity: 'high',
                    recoverable: true,
                    userMessage: 'Code generation failed. Please try again or report this issue.',
                    technicalMessage: 'Error during code string building or template processing'
                },
                VALIDATION_FAILURE: {
                    code: 'VALIDATION_FAILURE',
                    severity: 'medium',
                    recoverable: true,
                    userMessage: 'Generated code validation failed. Code may contain errors.',
                    technicalMessage: 'Generated code failed validation checks'
                },
                MEMORY_OVERFLOW: {
                    code: 'MEMORY_OVERFLOW',
                    severity: 'high',
                    recoverable: false,
                    userMessage: 'Drawing is too complex to generate code. Try simplifying your drawing.',
                    technicalMessage: 'Memory limit exceeded during code generation'
                },
                SYSTEM_ERROR: {
                    code: 'SYSTEM_ERROR',
                    severity: 'critical',
                    recoverable: false,
                    userMessage: 'System error occurred. Please refresh the page and try again.',
                    technicalMessage: 'Unexpected system error during code generation'
                }
            };
        }
        
        /**
         * Initialize fallback code generator
         */
        initializeFallbackGenerator() {
            this.fallbackGenerator = {
                generateHTML: (elements) => {
                    return [
                        '<!DOCTYPE html>',
                        '<html>',
                        '<head><title>VSS Drawing</title></head>',
                        '<body>',
                        '<canvas id="canvas" width="800" height="600"></canvas>',
                        '<script>',
                        '// Fallback: Drawing elements could not be processed',
                        '// Please try regenerating the code',
                        'console.log("Fallback HTML generated");',
                        '</script>',
                        '</body>',
                        '</html>'
                    ].join('\n');
                },
                
                generateSVG: (elements) => {
                    return [
                        '<?xml version="1.0" encoding="UTF-8"?>',
                        '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600">',
                        '<!-- Fallback: Drawing elements could not be processed -->',
                        '<!-- Please try regenerating the code -->',
                        '</svg>'
                    ].join('\n');
                },
                
                generateCSS: (elements) => {
                    return [
                        '/* Fallback CSS - Drawing elements could not be processed */',
                        'canvas {',
                        '  border: 1px solid #ccc;',
                        '  background: white;',
                        '}',
                        '',
                        '/* Please try regenerating the code */'
                    ].join('\n');
                },
                
                generateJavaScript: (elements) => {
                    return [
                        '// Fallback JavaScript - Drawing elements could not be processed',
                        'const canvas = document.getElementById("canvas");',
                        'const ctx = canvas.getContext("2d");',
                        '',
                        '// Please try regenerating the code',
                        'console.log("Fallback JavaScript generated");'
                    ].join('\n');
                }
            };
        }
        
        /**
         * Execute code generation with comprehensive error handling
         */
        async executeWithErrorHandling(generatorFunction, elements, options = {}) {
            const operationId = this.generateOperationId();
            const startTime = Date.now();
            
            try {
                // Pre-execution validation
                this.validateInputs(elements, options);
                
                // Initialize retry tracking
                if (!this.retryAttempts.has(operationId)) {
                    this.retryAttempts.set(operationId, 0);
                }
                
                // Execute with timeout
                const result = await this.executeWithTimeout(generatorFunction, elements, options);
                
                // Post-execution validation
                this.validateOutput(result, options.outputType);
                
                // Log success
                this.logSuccess(operationId, startTime, options.outputType);
                
                return {
                    success: true,
                    result: result,
                    operationId: operationId,
                    executionTime: Date.now() - startTime
                };
                
            } catch (error) {
                return this.handleError(error, operationId, elements, options, startTime);
            }
        }
        
        /**
         * Execute function with timeout protection
         */
        async executeWithTimeout(generatorFunction, elements, options) {
            const timeout = options.timeout || 30000; // 30 seconds default
            
            return new Promise((resolve, reject) => {
                const timeoutId = setTimeout(() => {
                    reject(new Error('Code generation timeout - operation took too long'));
                }, timeout);
                
                try {
                    const result = generatorFunction(elements, options.canvasWidth, options.canvasHeight);
                    clearTimeout(timeoutId);
                    resolve(result);
                } catch (error) {
                    clearTimeout(timeoutId);
                    reject(error);
                }
            });
        }
        
        /**
         * Validate inputs before code generation
         */
        validateInputs(elements, options) {
            if (!Array.isArray(elements)) {
                throw this.createError('ELEMENT_PROCESSING', 'Elements must be an array', { elements });
            }
            
            if (elements.length > 10000) {
                throw this.createError('MEMORY_OVERFLOW', 'Too many elements to process', { count: elements.length });
            }
            
            // Validate element structure
            elements.forEach((element, index) => {
                if (!element || typeof element !== 'object') {
                    throw this.createError('ELEMENT_PROCESSING', `Invalid element at index ${index}`, { element, index });
                }
                
                if (!element.type) {
                    throw this.createError('ELEMENT_PROCESSING', `Element at index ${index} missing type`, { element, index });
                }
            });
        }
        
        /**
         * Validate generated output
         */
        validateOutput(result, outputType) {
            if (typeof result !== 'string') {
                throw this.createError('CODE_GENERATION', 'Generated code must be a string', { result, outputType });
            }
            
            if (result.length === 0) {
                throw this.createError('CODE_GENERATION', 'Generated code is empty', { outputType });
            }
            
            if (result.length > 1000000) { // 1MB limit
                throw this.createError('MEMORY_OVERFLOW', 'Generated code exceeds size limit', { size: result.length, outputType });
            }
            
            // Type-specific validation
            switch (outputType) {
                case 'html':
                    this.validateHTMLOutput(result);
                    break;
                case 'svg':
                    this.validateSVGOutput(result);
                    break;
                case 'css':
                    this.validateCSSOutput(result);
                    break;
                case 'javascript':
                    this.validateJavaScriptOutput(result);
                    break;
            }
        }
        
        /**
         * Validate HTML output
         */
        validateHTMLOutput(html) {
            if (!html.includes('<!DOCTYPE') && !html.includes('<html')) {
                throw this.createError('VALIDATION_FAILURE', 'Invalid HTML structure', { html: html.substring(0, 100) });
            }
            
            // Check for script injection
            const scriptMatches = html.match(/<script[^>]*>/gi);
            if (scriptMatches && scriptMatches.length > 10) {
                throw this.createError('VALIDATION_FAILURE', 'Too many script tags in HTML', { count: scriptMatches.length });
            }
        }
        
        /**
         * Validate SVG output
         */
        validateSVGOutput(svg) {
            if (!svg.includes('<svg') || !svg.includes('</svg>')) {
                throw this.createError('VALIDATION_FAILURE', 'Invalid SVG structure', { svg: svg.substring(0, 100) });
            }
            
            if (!svg.includes('xmlns')) {
                console.warn('SVG missing namespace declaration');
            }
        }
        
        /**
         * Validate CSS output
         */
        validateCSSOutput(css) {
            // Check for balanced braces
            const openBraces = (css.match(/\{/g) || []).length;
            const closeBraces = (css.match(/\}/g) || []).length;
            
            if (openBraces !== closeBraces) {
                throw this.createError('VALIDATION_FAILURE', 'Unbalanced CSS braces', { openBraces, closeBraces });
            }
        }
        
        /**
         * Validate JavaScript output
         */
        validateJavaScriptOutput(js) {
            // Basic syntax check - look for common issues
            const openParens = (js.match(/\(/g) || []).length;
            const closeParens = (js.match(/\)/g) || []).length;
            
            if (openParens !== closeParens) {
                throw this.createError('VALIDATION_FAILURE', 'Unbalanced JavaScript parentheses', { openParens, closeParens });
            }
        }
        
        /**
         * Handle errors with recovery mechanisms
         */
        handleError(error, operationId, elements, options, startTime) {
            const errorInfo = this.analyzeError(error);
            const retryCount = this.retryAttempts.get(operationId) || 0;
            
            // Log error
            this.logError(error, operationId, options, startTime);
            
            // Attempt recovery if possible
            if (errorInfo.recoverable && retryCount < this.maxRetries) {
                return this.attemptRecovery(error, operationId, elements, options, retryCount);
            }
            
            // Use fallback if recovery fails
            if (this.canUseFallback(errorInfo, options)) {
                return this.useFallback(elements, options, operationId, errorInfo);
            }
            
            // Return error result
            return {
                success: false,
                error: errorInfo,
                operationId: operationId,
                executionTime: Date.now() - startTime,
                userMessage: errorInfo.userMessage,
                canRetry: errorInfo.recoverable && retryCount < this.maxRetries
            };
        }
        
        /**
         * Analyze error and determine type
         */
        analyzeError(error) {
            const message = error.message.toLowerCase();
            
            if (error.errorType) {
                return { ...this.errorTypes[error.errorType], originalError: error };
            }
            
            if (message.includes('template') || message.includes('validation')) {
                return { ...this.errorTypes.TEMPLATE_CORRUPTION, originalError: error };
            }
            
            if (message.includes('element') || message.includes('processing')) {
                return { ...this.errorTypes.ELEMENT_PROCESSING, originalError: error };
            }
            
            if (message.includes('timeout') || message.includes('memory') || message.includes('size')) {
                return { ...this.errorTypes.MEMORY_OVERFLOW, originalError: error };
            }
            
            if (message.includes('generation') || message.includes('building')) {
                return { ...this.errorTypes.CODE_GENERATION, originalError: error };
            }
            
            return { ...this.errorTypes.SYSTEM_ERROR, originalError: error };
        }
        
        /**
         * Attempt error recovery
         */
        async attemptRecovery(error, operationId, elements, options, retryCount) {
            this.retryAttempts.set(operationId, retryCount + 1);
            
            console.log(`Attempting recovery for operation ${operationId}, retry ${retryCount + 1}`);
            
            try {
                // Recovery strategies based on error type
                const errorInfo = this.analyzeError(error);
                
                switch (errorInfo.code) {
                    case 'TEMPLATE_CORRUPTION':
                        return this.recoverFromTemplateCorruption(elements, options, operationId);
                        
                    case 'ELEMENT_PROCESSING':
                        return this.recoverFromElementProcessing(elements, options, operationId);
                        
                    case 'CODE_GENERATION':
                        return this.recoverFromCodeGeneration(elements, options, operationId);
                        
                    default:
                        // Generic recovery - clean up and retry
                        await this.cleanupAndRetry(elements, options, operationId);
                        break;
                }
                
            } catch (recoveryError) {
                console.error('Recovery attempt failed:', recoveryError);
                return this.handleError(recoveryError, operationId, elements, options, Date.now());
            }
        }
        
        /**
         * Recover from template corruption
         */
        async recoverFromTemplateCorruption(elements, options, operationId) {
            console.log('Recovering from template corruption...');
            
            // Initialize template system if not available
            if (!this.templateSystem && window.SafeTemplateSystem) {
                this.templateSystem = new window.SafeTemplateSystem();
            }
            
            if (this.templateSystem) {
                // Clear corrupted cache and use fallback templates
                this.templateSystem.clearCache();
                
                // Retry with fallback templates
                const generator = new window.SafeCodeGenerator();
                const method = `generate${options.outputType.charAt(0).toUpperCase() + options.outputType.slice(1)}`;
                
                if (generator[method]) {
                    const result = generator[method](elements, options.canvasWidth, options.canvasHeight);
                    return {
                        success: true,
                        result: result,
                        operationId: operationId,
                        recovered: true,
                        recoveryMethod: 'template_fallback'
                    };
                }
            }
            
            throw new Error('Template recovery failed');
        }
        
        /**
         * Recover from element processing errors
         */
        async recoverFromElementProcessing(elements, options, operationId) {
            console.log('Recovering from element processing error...');
            
            // Filter out problematic elements
            const cleanElements = elements.filter(element => {
                try {
                    return element && 
                           typeof element === 'object' && 
                           element.type && 
                           typeof element.type === 'string';
                } catch (e) {
                    return false;
                }
            });
            
            console.log(`Filtered ${elements.length - cleanElements.length} problematic elements`);
            
            // Retry with cleaned elements
            const generator = new window.SafeCodeGenerator();
            const method = `generate${options.outputType.charAt(0).toUpperCase() + options.outputType.slice(1)}`;
            
            if (generator[method]) {
                const result = generator[method](cleanElements, options.canvasWidth, options.canvasHeight);
                return {
                    success: true,
                    result: result,
                    operationId: operationId,
                    recovered: true,
                    recoveryMethod: 'element_filtering',
                    elementsFiltered: elements.length - cleanElements.length
                };
            }
            
            throw new Error('Element processing recovery failed');
        }
        
        /**
         * Recover from code generation errors
         */
        async recoverFromCodeGeneration(elements, options, operationId) {
            console.log('Recovering from code generation error...');
            
            // Try with smaller batches
            const batchSize = Math.max(1, Math.floor(elements.length / 4));
            const batches = [];
            
            for (let i = 0; i < elements.length; i += batchSize) {
                batches.push(elements.slice(i, i + batchSize));
            }
            
            const results = [];
            const generator = new window.SafeCodeGenerator();
            
            for (const batch of batches) {
                try {
                    const method = `generate${options.outputType.charAt(0).toUpperCase() + options.outputType.slice(1)}`;
                    if (generator[method]) {
                        const batchResult = generator[method](batch, options.canvasWidth, options.canvasHeight);
                        results.push(batchResult);
                    }
                } catch (batchError) {
                    console.warn('Batch processing failed, skipping batch:', batchError);
                }
            }
            
            if (results.length > 0) {
                return {
                    success: true,
                    result: results.join('\n'),
                    operationId: operationId,
                    recovered: true,
                    recoveryMethod: 'batch_processing',
                    batchesProcessed: results.length,
                    totalBatches: batches.length
                };
            }
            
            throw new Error('Batch processing recovery failed');
        }
        
        /**
         * Generic cleanup and retry
         */
        async cleanupAndRetry(elements, options, operationId) {
            // Force garbage collection if available
            if (window.gc) {
                window.gc();
            }
            
            // Small delay before retry
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Retry with original parameters
            const generator = new window.SafeCodeGenerator();
            const method = `generate${options.outputType.charAt(0).toUpperCase() + options.outputType.slice(1)}`;
            
            if (generator[method]) {
                const result = generator[method](elements, options.canvasWidth, options.canvasHeight);
                return {
                    success: true,
                    result: result,
                    operationId: operationId,
                    recovered: true,
                    recoveryMethod: 'cleanup_retry'
                };
            }
            
            throw new Error('Cleanup retry failed');
        }
        
        /**
         * Check if fallback can be used
         */
        canUseFallback(errorInfo, options) {
            return this.fallbackGenerator && 
                   options.outputType && 
                   this.fallbackGenerator[`generate${options.outputType.charAt(0).toUpperCase() + options.outputType.slice(1)}`];
        }
        
        /**
         * Use fallback generator
         */
        useFallback(elements, options, operationId, errorInfo) {
            console.log('Using fallback generator for', options.outputType);
            
            try {
                const method = `generate${options.outputType.charAt(0).toUpperCase() + options.outputType.slice(1)}`;
                const result = this.fallbackGenerator[method](elements);
                
                return {
                    success: true,
                    result: result,
                    operationId: operationId,
                    fallback: true,
                    originalError: errorInfo,
                    userMessage: 'Generated using fallback templates. Some features may be missing.'
                };
            } catch (fallbackError) {
                console.error('Fallback generation failed:', fallbackError);
                
                return {
                    success: false,
                    error: errorInfo,
                    operationId: operationId,
                    fallbackFailed: true,
                    userMessage: 'Code generation failed completely. Please try again or report this issue.'
                };
            }
        }
        
        /**
         * Create typed error
         */
        createError(errorType, message, context = {}) {
            const error = new Error(message);
            error.errorType = errorType;
            error.context = context;
            error.timestamp = Date.now();
            return error;
        }
        
        /**
         * Generate unique operation ID
         */
        generateOperationId() {
            return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        }
        
        /**
         * Log successful operation
         */
        logSuccess(operationId, startTime, outputType) {
            const executionTime = Date.now() - startTime;
            console.log(`Code generation success: ${operationId} (${outputType}) in ${executionTime}ms`);
        }
        
        /**
         * Log error with details
         */
        logError(error, operationId, options, startTime) {
            const errorRecord = {
                operationId: operationId,
                timestamp: Date.now(),
                executionTime: Date.now() - startTime,
                error: {
                    message: error.message,
                    type: error.errorType || 'UNKNOWN',
                    stack: error.stack
                },
                options: options,
                context: error.context || {}
            };
            
            this.errorHistory.push(errorRecord);
            
            // Keep only last 100 errors
            if (this.errorHistory.length > 100) {
                this.errorHistory = this.errorHistory.slice(-100);
            }
            
            console.error('Code generation error:', errorRecord);
        }
        
        /**
         * Get error statistics
         */
        getErrorStats() {
            const stats = {
                totalErrors: this.errorHistory.length,
                errorsByType: {},
                recentErrors: this.errorHistory.slice(-10),
                activeRetries: this.retryAttempts.size
            };
            
            this.errorHistory.forEach(record => {
                const type = record.error.type;
                stats.errorsByType[type] = (stats.errorsByType[type] || 0) + 1;
            });
            
            return stats;
        }
        
        /**
         * Clear error history
         */
        clearErrorHistory() {
            this.errorHistory = [];
            this.retryAttempts.clear();
        }
        
        /**
         * Register error callback
         */
        onError(callback) {
            const id = Math.random().toString(36).substr(2, 9);
            this.errorCallbacks.set(id, callback);
            return id;
        }
        
        /**
         * Unregister error callback
         */
        offError(id) {
            return this.errorCallbacks.delete(id);
        }
        
        /**
         * Notify error callbacks
         */
        notifyErrorCallbacks(errorInfo) {
            this.errorCallbacks.forEach(callback => {
                try {
                    callback(errorInfo);
                } catch (callbackError) {
                    console.error('Error callback failed:', callbackError);
                }
            });
        }
    }
    
    // Export to global namespace
    if (typeof window !== 'undefined') {
        window.CodeGenerationErrorHandler = CodeGenerationErrorHandler;
        console.log('CodeGenerationErrorHandler: Class loaded successfully');
    }
    
})();