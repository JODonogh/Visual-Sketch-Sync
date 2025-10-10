/**
 * SafeTemplateSystem - Template validation and error recovery for code generation
 * 
 * This system provides template storage using JSON structures, proper escaping,
 * and validation mechanisms to ensure reliable code generation.
 */

(function() {
    'use strict';
    
    class SafeTemplateSystem {
        constructor() {
            this.templateCache = new Map();
            this.validationRules = this.initializeValidationRules();
            this.fallbackTemplates = this.initializeFallbackTemplates();
            this.escapePatterns = this.initializeEscapePatterns();
        }
        
        /**
         * Initialize validation rules for different template types
         */
        initializeValidationRules() {
            return {
                html: {
                    requiredFields: ['doctype', 'htmlOpen', 'htmlClose', 'bodyOpen', 'bodyClose'],
                    allowedTags: ['html', 'head', 'body', 'canvas', 'script', 'meta', 'title'],
                    maxLength: 50000
                },
                svg: {
                    requiredFields: ['xmlDeclaration', 'svgOpen', 'svgClose'],
                    allowedTags: ['svg', 'rect', 'ellipse', 'line', 'path', 'g'],
                    maxLength: 100000
                },
                css: {
                    requiredFields: ['canvasSelector', 'ruleOpen', 'ruleClose'],
                    allowedProperties: ['background', 'border', 'width', 'height', 'position'],
                    maxLength: 20000
                },
                javascript: {
                    requiredFields: ['canvasGet', 'ctxGet', 'ctxBeginPath', 'ctxStroke'],
                    allowedMethods: ['getContext', 'beginPath', 'stroke', 'fill', 'moveTo', 'lineTo'],
                    maxLength: 100000
                }
            };
        }
        
        /**
         * Initialize fallback templates for error recovery
         */
        initializeFallbackTemplates() {
            return {
                html: {
                    doctype: '<!DOCTYPE html>',
                    htmlOpen: '<html>',
                    htmlClose: '</html>',
                    headOpen: '<head>',
                    headClose: '</head>',
                    bodyOpen: '<body>',
                    bodyClose: '</body>',
                    canvasOpen: '<canvas width="',
                    canvasMiddle: '" height="',
                    canvasClose: '"></canvas>',
                    scriptOpen: '<script>',
                    scriptClose: '</script>'
                },
                svg: {
                    xmlDeclaration: '<?xml version="1.0"?>',
                    svgOpen: '<svg width="',
                    svgMiddle: '" height="',
                    svgClose: '</svg>',
                    rectOpen: '<rect x="',
                    tagClose: '/>'
                },
                css: {
                    canvasSelector: 'canvas',
                    ruleOpen: '{',
                    ruleClose: '}',
                    propertyEnd: ';'
                },
                javascript: {
                    canvasGet: 'document.getElementById(',
                    ctxGet: '.getContext(',
                    ctxBeginPath: 'beginPath()',
                    ctxStroke: 'stroke()',
                    semicolon: ';'
                }
            };
        }
        
        /**
         * Initialize escape patterns for different contexts
         */
        initializeEscapePatterns() {
            return {
                html: {
                    patterns: [
                        { regex: /&/g, replacement: '&amp;' },
                        { regex: /</g, replacement: '&lt;' },
                        { regex: />/g, replacement: '&gt;' },
                        { regex: /"/g, replacement: '&quot;' },
                        { regex: /'/g, replacement: '&#39;' }
                    ]
                },
                css: {
                    patterns: [
                        { regex: /\\/g, replacement: '\\\\' },
                        { regex: /"/g, replacement: '\\"' },
                        { regex: /'/g, replacement: "\\'" },
                        { regex: /\n/g, replacement: '\\A' },
                        { regex: /\r/g, replacement: '' }
                    ]
                },
                javascript: {
                    patterns: [
                        { regex: /\\/g, replacement: '\\\\' },
                        { regex: /"/g, replacement: '\\"' },
                        { regex: /'/g, replacement: "\\'" },
                        { regex: /\n/g, replacement: '\\n' },
                        { regex: /\r/g, replacement: '\\r' },
                        { regex: /\t/g, replacement: '\\t' }
                    ]
                },
                svg: {
                    patterns: [
                        { regex: /&/g, replacement: '&amp;' },
                        { regex: /</g, replacement: '&lt;' },
                        { regex: />/g, replacement: '&gt;' },
                        { regex: /"/g, replacement: '&quot;' }
                    ]
                }
            };
        }
        
        /**
         * Validate template structure and content
         */
        validateTemplate(templateType, template) {
            const validation = {
                isValid: true,
                errors: [],
                warnings: []
            };
            
            try {
                const rules = this.validationRules[templateType];
                if (!rules) {
                    validation.isValid = false;
                    validation.errors.push(`Unknown template type: ${templateType}`);
                    return validation;
                }
                
                // Check required fields
                if (rules.requiredFields) {
                    rules.requiredFields.forEach(field => {
                        if (!template.hasOwnProperty(field)) {
                            validation.errors.push(`Missing required field: ${field}`);
                            validation.isValid = false;
                        }
                    });
                }
                
                // Check template size
                const templateSize = JSON.stringify(template).length;
                if (templateSize > rules.maxLength) {
                    validation.warnings.push(`Template size (${templateSize}) exceeds recommended maximum (${rules.maxLength})`);
                }
                
                // Validate individual template values
                Object.keys(template).forEach(key => {
                    const value = template[key];
                    if (typeof value !== 'string') {
                        validation.errors.push(`Template field '${key}' must be a string, got ${typeof value}`);
                        validation.isValid = false;
                    } else if (value.length === 0) {
                        validation.warnings.push(`Template field '${key}' is empty`);
                    }
                });
                
                // Type-specific validation
                this.validateTemplateContent(templateType, template, validation);
                
            } catch (error) {
                validation.isValid = false;
                validation.errors.push(`Template validation error: ${error.message}`);
            }
            
            return validation;
        }
        
        /**
         * Validate template content based on type
         */
        validateTemplateContent(templateType, template, validation) {
            switch (templateType) {
                case 'html':
                    this.validateHTMLTemplate(template, validation);
                    break;
                case 'svg':
                    this.validateSVGTemplate(template, validation);
                    break;
                case 'css':
                    this.validateCSSTemplate(template, validation);
                    break;
                case 'javascript':
                    this.validateJavaScriptTemplate(template, validation);
                    break;
            }
        }
        
        /**
         * Validate HTML template content
         */
        validateHTMLTemplate(template, validation) {
            // Check for balanced tags
            const openTags = ['htmlOpen', 'headOpen', 'bodyOpen', 'scriptOpen'];
            const closeTags = ['htmlClose', 'headClose', 'bodyClose', 'scriptClose'];
            
            openTags.forEach((openTag, index) => {
                const closeTag = closeTags[index];
                if (template[openTag] && !template[closeTag]) {
                    validation.warnings.push(`Open tag '${openTag}' without corresponding close tag '${closeTag}'`);
                }
            });
            
            // Check for dangerous content
            Object.keys(template).forEach(key => {
                const value = template[key];
                if (value.includes('<script') && !key.includes('script')) {
                    validation.warnings.push(`Potential script injection in field '${key}'`);
                }
            });
        }
        
        /**
         * Validate SVG template content
         */
        validateSVGTemplate(template, validation) {
            // Check for required SVG namespace
            if (template.svgOpen && !template.svgOpen.includes('xmlns')) {
                validation.warnings.push('SVG template missing xmlns namespace declaration');
            }
            
            // Validate numeric attributes
            const numericFields = ['rectX', 'rectY', 'rectWidth', 'rectHeight'];
            numericFields.forEach(field => {
                if (template[field] && template[field].includes('NaN')) {
                    validation.errors.push(`Numeric field '${field}' contains NaN`);
                    validation.isValid = false;
                }
            });
        }
        
        /**
         * Validate CSS template content
         */
        validateCSSTemplate(template, validation) {
            // Check for CSS injection patterns
            Object.keys(template).forEach(key => {
                const value = template[key];
                if (value.includes('javascript:') || value.includes('expression(')) {
                    validation.errors.push(`Potential CSS injection in field '${key}'`);
                    validation.isValid = false;
                }
            });
        }
        
        /**
         * Validate JavaScript template content
         */
        validateJavaScriptTemplate(template, validation) {
            // Check for dangerous JavaScript patterns
            const dangerousPatterns = ['eval(', 'Function(', 'setTimeout(', 'setInterval('];
            
            Object.keys(template).forEach(key => {
                const value = template[key];
                dangerousPatterns.forEach(pattern => {
                    if (value.includes(pattern)) {
                        validation.warnings.push(`Potentially dangerous pattern '${pattern}' in field '${key}'`);
                    }
                });
            });
        }
        
        /**
         * Escape dynamic values for safe insertion into templates
         */
        escapeValue(value, context = 'html') {
            if (typeof value !== 'string') {
                value = String(value);
            }
            
            const patterns = this.escapePatterns[context];
            if (!patterns) {
                console.warn(`Unknown escape context: ${context}`);
                return value;
            }
            
            let escaped = value;
            patterns.patterns.forEach(pattern => {
                escaped = escaped.replace(pattern.regex, pattern.replacement);
            });
            
            return escaped;
        }
        
        /**
         * Get template with fallback recovery
         */
        getTemplate(templateType, useCache = true) {
            try {
                // Check cache first
                if (useCache && this.templateCache.has(templateType)) {
                    const cached = this.templateCache.get(templateType);
                    if (this.validateTemplate(templateType, cached.template).isValid) {
                        return cached.template;
                    } else {
                        console.warn(`Cached template for ${templateType} is invalid, using fallback`);
                    }
                }
                
                // Try to get template from SafeCodeGenerator
                if (window.SafeCodeGenerator) {
                    const generator = new window.SafeCodeGenerator();
                    const template = generator.templates[templateType];
                    
                    if (template) {
                        const validation = this.validateTemplate(templateType, template);
                        if (validation.isValid) {
                            // Cache valid template
                            this.templateCache.set(templateType, {
                                template: template,
                                timestamp: Date.now()
                            });
                            return template;
                        } else {
                            console.warn(`Template validation failed for ${templateType}:`, validation.errors);
                        }
                    }
                }
                
                // Fall back to safe templates
                console.log(`Using fallback template for ${templateType}`);
                return this.fallbackTemplates[templateType] || {};
                
            } catch (error) {
                console.error(`Error getting template for ${templateType}:`, error);
                return this.fallbackTemplates[templateType] || {};
            }
        }
        
        /**
         * Store template with validation
         */
        storeTemplate(templateType, template) {
            const validation = this.validateTemplate(templateType, template);
            
            if (!validation.isValid) {
                throw new Error(`Template validation failed: ${validation.errors.join(', ')}`);
            }
            
            if (validation.warnings.length > 0) {
                console.warn(`Template warnings for ${templateType}:`, validation.warnings);
            }
            
            this.templateCache.set(templateType, {
                template: template,
                timestamp: Date.now(),
                validation: validation
            });
            
            return validation;
        }
        
        /**
         * Clear template cache
         */
        clearCache() {
            this.templateCache.clear();
        }
        
        /**
         * Get cache statistics
         */
        getCacheStats() {
            const stats = {
                size: this.templateCache.size,
                templates: []
            };
            
            this.templateCache.forEach((value, key) => {
                stats.templates.push({
                    type: key,
                    timestamp: value.timestamp,
                    hasValidation: !!value.validation,
                    isValid: value.validation ? value.validation.isValid : 'unknown'
                });
            });
            
            return stats;
        }
        
        /**
         * Repair corrupted template using fallback
         */
        repairTemplate(templateType, corruptedTemplate) {
            const fallback = this.fallbackTemplates[templateType];
            if (!fallback) {
                throw new Error(`No fallback template available for ${templateType}`);
            }
            
            const repaired = { ...fallback };
            
            // Try to preserve valid parts of corrupted template
            if (corruptedTemplate && typeof corruptedTemplate === 'object') {
                Object.keys(corruptedTemplate).forEach(key => {
                    if (fallback.hasOwnProperty(key)) {
                        const value = corruptedTemplate[key];
                        if (typeof value === 'string' && value.length > 0) {
                            // Basic validation - no script injection
                            if (!value.includes('<script') || key.includes('script')) {
                                repaired[key] = value;
                            }
                        }
                    }
                });
            }
            
            return repaired;
        }
    }
    
    // Export to global namespace
    if (typeof window !== 'undefined') {
        window.SafeTemplateSystem = SafeTemplateSystem;
        console.log('SafeTemplateSystem: Class loaded successfully');
    }
    
})();