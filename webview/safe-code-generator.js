/**
 * SafeCodeGenerator - Autoformat-resistant code generation system
 * 
 * This class uses array-based string building and template data structures
 * to prevent corruption from autoformatting tools.
 */

(function() {
    'use strict';
    
    class SafeCodeGenerator {
        constructor() {
            this.templates = this.initializeTemplates();
            this.escapeMap = {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;',
                '/': '&#x2F;'
            };
        }
        
        /**
         * Initialize template data structures
         * Using object/array structures instead of template literals
         */
        initializeTemplates() {
            return {
                html: {
                    doctype: '<!DOCTYPE html>',
                    htmlOpen: '<html lang="en">',
                    htmlClose: '</html>',
                    headOpen: '<head>',
                    headClose: '</head>',
                    metaCharset: '<meta charset="UTF-8">',
                    metaViewport: '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
                    titleOpen: '<title>',
                    titleClose: '</title>',
                    bodyOpen: '<body>',
                    bodyClose: '</body>',
                    canvasOpen: '<canvas id="drawing-canvas" width="',
                    canvasMiddle: '" height="',
                    canvasClose: '"></canvas>',
                    scriptOpen: '<script>',
                    scriptClose: '</script>'
                },
                svg: {
                    xmlDeclaration: '<?xml version="1.0" encoding="UTF-8"?>',
                    svgOpen: '<svg xmlns="http://www.w3.org/2000/svg" width="',
                    svgMiddle: '" height="',
                    svgViewBox: '" viewBox="0 0 ',
                    svgClose: '</svg>',
                    groupOpen: '<g>',
                    groupClose: '</g>',
                    rectOpen: '<rect x="',
                    rectY: '" y="',
                    rectWidth: '" width="',
                    rectHeight: '" height="',
                    rectRx: '" rx="',
                    rectRy: '" ry="',
                    ellipseOpen: '<ellipse cx="',
                    ellipseCy: '" cy="',
                    ellipseRx: '" rx="',
                    ellipseRy: '" ry="',
                    lineOpen: '<line x1="',
                    lineY1: '" y1="',
                    lineX2: '" x2="',
                    lineY2: '" y2="',
                    pathOpen: '<path d="',
                    pathClose: '"',
                    styleOpen: ' style="',
                    styleClose: '"',
                    fillOpen: 'fill:',
                    strokeOpen: 'stroke:',
                    strokeWidthOpen: 'stroke-width:',
                    tagClose: '/>'
                },
                css: {
                    canvasSelector: '#drawing-canvas',
                    ruleOpen: ' {',
                    ruleClose: '}',
                    propertyEnd: ';',
                    backgroundProperty: 'background',
                    borderProperty: 'border',
                    widthProperty: 'width',
                    heightProperty: 'height'
                },
                javascript: {
                    canvasGet: 'const canvas = document.getElementById(',
                    ctxGet: 'const ctx = canvas.getContext(',
                    ctxBeginPath: 'ctx.beginPath();',
                    ctxStroke: 'ctx.stroke();',
                    ctxFill: 'ctx.fill();',
                    ctxMoveTo: 'ctx.moveTo(',
                    ctxLineTo: 'ctx.lineTo(',
                    ctxRect: 'ctx.rect(',
                    ctxArc: 'ctx.arc(',
                    ctxStrokeStyle: 'ctx.strokeStyle = ',
                    ctxFillStyle: 'ctx.fillStyle = ',
                    ctxLineWidth: 'ctx.lineWidth = ',
                    semicolon: ';',
                    comma: ', ',
                    quote: '"',
                    parenOpen: '(',
                    parenClose: ')'
                }
            };
        }
        
        /**
         * Escape HTML entities to prevent XSS and formatting issues
         */
        escapeHtml(text) {
            if (typeof text !== 'string') {
                text = String(text);
            }
            return text.replace(/[&<>"'\/]/g, (match) => this.escapeMap[match]);
        }
        
        /**
         * Build string using array join method for autoformat resistance
         */
        buildString(parts) {
            if (!Array.isArray(parts)) {
                return String(parts);
            }
            return parts.join('');
        }
        
        /**
         * Generate HTML code from drawing elements
         */
        generateHTML(elements, canvasWidth = 800, canvasHeight = 600) {
            try {
                const parts = [];
                const t = this.templates.html;
                
                // Document structure
                parts.push(t.doctype);
                parts.push('\n');
                parts.push(t.htmlOpen);
                parts.push('\n');
                parts.push(t.headOpen);
                parts.push('\n');
                parts.push(t.metaCharset);
                parts.push('\n');
                parts.push(t.metaViewport);
                parts.push('\n');
                parts.push(t.titleOpen);
                parts.push('VSS Drawing Canvas');
                parts.push(t.titleClose);
                parts.push('\n');
                parts.push(t.headClose);
                parts.push('\n');
                parts.push(t.bodyOpen);
                parts.push('\n');
                
                // Canvas element
                parts.push(t.canvasOpen);
                parts.push(String(canvasWidth));
                parts.push(t.canvasMiddle);
                parts.push(String(canvasHeight));
                parts.push(t.canvasClose);
                parts.push('\n');
                
                // JavaScript to draw elements
                parts.push(t.scriptOpen);
                parts.push('\n');
                parts.push(this.generateCanvasJavaScript(elements));
                parts.push('\n');
                parts.push(t.scriptClose);
                parts.push('\n');
                
                parts.push(t.bodyClose);
                parts.push('\n');
                parts.push(t.htmlClose);
                
                return this.buildString(parts);
            } catch (error) {
                throw new Error('HTML generation failed: ' + error.message);
            }
        }
        
        /**
         * Generate SVG code from drawing elements
         */
        generateSVG(elements, canvasWidth = 800, canvasHeight = 600) {
            try {
                const parts = [];
                const t = this.templates.svg;
                
                // SVG declaration
                parts.push(t.xmlDeclaration);
                parts.push('\n');
                parts.push(t.svgOpen);
                parts.push(String(canvasWidth));
                parts.push(t.svgMiddle);
                parts.push(String(canvasHeight));
                parts.push(t.svgViewBox);
                parts.push(String(canvasWidth));
                parts.push(' ');
                parts.push(String(canvasHeight));
                parts.push('">');
                parts.push('\n');
                
                // Generate SVG elements
                if (Array.isArray(elements)) {
                    elements.forEach(element => {
                        const svgElement = this.generateSVGElement(element);
                        if (svgElement) {
                            parts.push('  ');
                            parts.push(svgElement);
                            parts.push('\n');
                        }
                    });
                }
                
                parts.push(t.svgClose);
                
                return this.buildString(parts);
            } catch (error) {
                throw new Error('SVG generation failed: ' + error.message);
            }
        }
        
        /**
         * Generate CSS code for styling
         */
        generateCSS(elements) {
            try {
                const parts = [];
                const t = this.templates.css;
                
                // Canvas base styles
                parts.push(t.canvasSelector);
                parts.push(t.ruleOpen);
                parts.push('\n');
                parts.push('  ');
                parts.push(t.backgroundProperty);
                parts.push(': white');
                parts.push(t.propertyEnd);
                parts.push('\n');
                parts.push('  ');
                parts.push(t.borderProperty);
                parts.push(': 1px solid #ccc');
                parts.push(t.propertyEnd);
                parts.push('\n');
                parts.push(t.ruleClose);
                parts.push('\n\n');
                
                // Additional styles based on elements
                parts.push('/* Drawing styles */');
                parts.push('\n');
                parts.push('.drawing-container');
                parts.push(t.ruleOpen);
                parts.push('\n');
                parts.push('  position: relative');
                parts.push(t.propertyEnd);
                parts.push('\n');
                parts.push('  display: inline-block');
                parts.push(t.propertyEnd);
                parts.push('\n');
                parts.push(t.ruleClose);
                
                return this.buildString(parts);
            } catch (error) {
                throw new Error('CSS generation failed: ' + error.message);
            }
        }
        
        /**
         * Generate JavaScript code for canvas drawing
         */
        generateJavaScript(elements) {
            try {
                const parts = [];
                const t = this.templates.javascript;
                
                // Canvas setup
                parts.push(t.canvasGet);
                parts.push(t.quote);
                parts.push('drawing-canvas');
                parts.push(t.quote);
                parts.push(')');
                parts.push(t.semicolon);
                parts.push('\n');
                parts.push(t.ctxGet);
                parts.push(t.quote);
                parts.push('2d');
                parts.push(t.quote);
                parts.push(')');
                parts.push(t.semicolon);
                parts.push('\n\n');
                
                // Generate drawing commands
                if (Array.isArray(elements)) {
                    elements.forEach((element, index) => {
                        const drawingCode = this.generateElementJavaScript(element, index);
                        if (drawingCode) {
                            parts.push(drawingCode);
                            parts.push('\n\n');
                        }
                    });
                }
                
                return this.buildString(parts);
            } catch (error) {
                throw new Error('JavaScript generation failed: ' + error.message);
            }
        }
        
        /**
         * Generate JavaScript for canvas drawing (internal method)
         */
        generateCanvasJavaScript(elements) {
            const parts = [];
            const t = this.templates.javascript;
            
            parts.push('window.addEventListener(');
            parts.push(t.quote);
            parts.push('load');
            parts.push(t.quote);
            parts.push(', function() {');
            parts.push('\n');
            parts.push('  ');
            parts.push(t.canvasGet);
            parts.push(t.quote);
            parts.push('drawing-canvas');
            parts.push(t.quote);
            parts.push(')');
            parts.push(t.semicolon);
            parts.push('\n');
            parts.push('  ');
            parts.push(t.ctxGet);
            parts.push(t.quote);
            parts.push('2d');
            parts.push(t.quote);
            parts.push(')');
            parts.push(t.semicolon);
            parts.push('\n\n');
            
            if (Array.isArray(elements)) {
                elements.forEach((element, index) => {
                    const drawingCode = this.generateElementJavaScript(element, index);
                    if (drawingCode) {
                        // Indent the code
                        const indentedCode = drawingCode.split('\n').map(line => 
                            line.trim() ? '  ' + line : line
                        ).join('\n');
                        parts.push(indentedCode);
                        parts.push('\n\n');
                    }
                });
            }
            
            parts.push('});');
            
            return this.buildString(parts);
        }
        
        /**
         * Generate SVG element from drawing element
         */
        generateSVGElement(element) {
            if (!element || !element.type) return '';
            
            const t = this.templates.svg;
            const parts = [];
            
            try {
                switch (element.type) {
                    case 'rectangle':
                        parts.push(t.rectOpen);
                        parts.push(String(element.x || 0));
                        parts.push(t.rectY);
                        parts.push(String(element.y || 0));
                        parts.push(t.rectWidth);
                        parts.push(String(element.width || 0));
                        parts.push(t.rectHeight);
                        parts.push(String(element.height || 0));
                        
                        if (element.cornerRadius && element.cornerRadius > 0) {
                            parts.push(t.rectRx);
                            parts.push(String(element.cornerRadius));
                            parts.push(t.rectRy);
                            parts.push(String(element.cornerRadius));
                        }
                        
                        parts.push(t.pathClose);
                        parts.push(this.generateSVGStyle(element));
                        parts.push(t.tagClose);
                        break;
                        
                    case 'circle':
                    case 'ellipse':
                        const cx = element.x || 0;
                        const cy = element.y || 0;
                        const rx = element.radiusX || element.radius || element.width / 2 || 0;
                        const ry = element.radiusY || element.radius || element.height / 2 || 0;
                        
                        parts.push(t.ellipseOpen);
                        parts.push(String(cx));
                        parts.push(t.ellipseCy);
                        parts.push(String(cy));
                        parts.push(t.ellipseRx);
                        parts.push(String(rx));
                        parts.push(t.ellipseRy);
                        parts.push(String(ry));
                        parts.push(t.pathClose);
                        parts.push(this.generateSVGStyle(element));
                        parts.push(t.tagClose);
                        break;
                        
                    case 'line':
                        parts.push(t.lineOpen);
                        parts.push(String(element.startX || 0));
                        parts.push(t.lineY1);
                        parts.push(String(element.startY || 0));
                        parts.push(t.lineX2);
                        parts.push(String(element.endX || 0));
                        parts.push(t.lineY2);
                        parts.push(String(element.endY || 0));
                        parts.push(t.pathClose);
                        parts.push(this.generateSVGStyle(element));
                        parts.push(t.tagClose);
                        break;
                        
                    case 'pen':
                        if (element.points && Array.isArray(element.points) && element.points.length > 0) {
                            parts.push(t.pathOpen);
                            parts.push('M ');
                            parts.push(String(element.points[0].x || 0));
                            parts.push(' ');
                            parts.push(String(element.points[0].y || 0));
                            
                            for (let i = 1; i < element.points.length; i++) {
                                parts.push(' L ');
                                parts.push(String(element.points[i].x || 0));
                                parts.push(' ');
                                parts.push(String(element.points[i].y || 0));
                            }
                            
                            parts.push(t.pathClose);
                            parts.push(this.generateSVGStyle(element));
                            parts.push(t.tagClose);
                        }
                        break;
                }
                
                return this.buildString(parts);
            } catch (error) {
                console.error('Error generating SVG element:', error);
                return '';
            }
        }
        
        /**
         * Generate SVG style attribute
         */
        generateSVGStyle(element) {
            const t = this.templates.svg;
            const parts = [];
            
            parts.push(t.styleOpen);
            
            // Fill
            if (element.fillMode === 'filled' || element.fillMode === 'both') {
                parts.push(t.fillOpen);
                parts.push(this.escapeHtml(element.fillColor || element.color || '#000000'));
                parts.push(';');
            } else {
                parts.push(t.fillOpen);
                parts.push('none;');
            }
            
            // Stroke
            if (element.fillMode !== 'filled') {
                parts.push(t.strokeOpen);
                parts.push(this.escapeHtml(element.strokeColor || element.color || '#000000'));
                parts.push(';');
                parts.push(t.strokeWidthOpen);
                parts.push(String(element.strokeWidth || element.lineWidth || 2));
                parts.push(';');
            }
            
            parts.push(t.styleClose);
            
            return this.buildString(parts);
        }
        
        /**
         * Generate JavaScript code for individual element
         */
        generateElementJavaScript(element, index) {
            if (!element || !element.type) return '';
            
            const t = this.templates.javascript;
            const parts = [];
            
            try {
                // Comment for element
                parts.push('// Element ');
                parts.push(String(index + 1));
                parts.push(': ');
                parts.push(element.type);
                parts.push('\n');
                
                // Set styles
                if (element.strokeColor || element.color) {
                    parts.push(t.ctxStrokeStyle);
                    parts.push(t.quote);
                    parts.push(this.escapeHtml(element.strokeColor || element.color));
                    parts.push(t.quote);
                    parts.push(t.semicolon);
                    parts.push('\n');
                }
                
                if (element.fillColor && (element.fillMode === 'filled' || element.fillMode === 'both')) {
                    parts.push(t.ctxFillStyle);
                    parts.push(t.quote);
                    parts.push(this.escapeHtml(element.fillColor));
                    parts.push(t.quote);
                    parts.push(t.semicolon);
                    parts.push('\n');
                }
                
                if (element.strokeWidth || element.lineWidth) {
                    parts.push(t.ctxLineWidth);
                    parts.push(String(element.strokeWidth || element.lineWidth));
                    parts.push(t.semicolon);
                    parts.push('\n');
                }
                
                // Draw element
                switch (element.type) {
                    case 'rectangle':
                        if (element.fillMode === 'filled' || element.fillMode === 'both') {
                            parts.push('ctx.fillRect(');
                            parts.push(String(element.x || 0));
                            parts.push(t.comma);
                            parts.push(String(element.y || 0));
                            parts.push(t.comma);
                            parts.push(String(element.width || 0));
                            parts.push(t.comma);
                            parts.push(String(element.height || 0));
                            parts.push(')');
                            parts.push(t.semicolon);
                            parts.push('\n');
                        }
                        
                        if (element.fillMode !== 'filled') {
                            parts.push('ctx.strokeRect(');
                            parts.push(String(element.x || 0));
                            parts.push(t.comma);
                            parts.push(String(element.y || 0));
                            parts.push(t.comma);
                            parts.push(String(element.width || 0));
                            parts.push(t.comma);
                            parts.push(String(element.height || 0));
                            parts.push(')');
                            parts.push(t.semicolon);
                        }
                        break;
                        
                    case 'circle':
                    case 'ellipse':
                        parts.push(t.ctxBeginPath);
                        parts.push('\n');
                        
                        const cx = element.x || 0;
                        const cy = element.y || 0;
                        const rx = element.radiusX || element.radius || element.width / 2 || 0;
                        const ry = element.radiusY || element.radius || element.height / 2 || 0;
                        
                        if (rx === ry) {
                            // Circle
                            parts.push(t.ctxArc);
                            parts.push(String(cx));
                            parts.push(t.comma);
                            parts.push(String(cy));
                            parts.push(t.comma);
                            parts.push(String(rx));
                            parts.push(', 0, 2 * Math.PI)');
                            parts.push(t.semicolon);
                        } else {
                            // Ellipse
                            parts.push('ctx.ellipse(');
                            parts.push(String(cx));
                            parts.push(t.comma);
                            parts.push(String(cy));
                            parts.push(t.comma);
                            parts.push(String(rx));
                            parts.push(t.comma);
                            parts.push(String(ry));
                            parts.push(', 0, 0, 2 * Math.PI)');
                            parts.push(t.semicolon);
                        }
                        parts.push('\n');
                        
                        if (element.fillMode === 'filled' || element.fillMode === 'both') {
                            parts.push(t.ctxFill);
                            parts.push('\n');
                        }
                        
                        if (element.fillMode !== 'filled') {
                            parts.push(t.ctxStroke);
                        }
                        break;
                        
                    case 'line':
                        parts.push(t.ctxBeginPath);
                        parts.push('\n');
                        parts.push(t.ctxMoveTo);
                        parts.push(String(element.startX || 0));
                        parts.push(t.comma);
                        parts.push(String(element.startY || 0));
                        parts.push(')');
                        parts.push(t.semicolon);
                        parts.push('\n');
                        parts.push(t.ctxLineTo);
                        parts.push(String(element.endX || 0));
                        parts.push(t.comma);
                        parts.push(String(element.endY || 0));
                        parts.push(')');
                        parts.push(t.semicolon);
                        parts.push('\n');
                        parts.push(t.ctxStroke);
                        break;
                        
                    case 'pen':
                        if (element.points && Array.isArray(element.points) && element.points.length > 0) {
                            parts.push(t.ctxBeginPath);
                            parts.push('\n');
                            parts.push(t.ctxMoveTo);
                            parts.push(String(element.points[0].x || 0));
                            parts.push(t.comma);
                            parts.push(String(element.points[0].y || 0));
                            parts.push(')');
                            parts.push(t.semicolon);
                            parts.push('\n');
                            
                            for (let i = 1; i < element.points.length; i++) {
                                parts.push(t.ctxLineTo);
                                parts.push(String(element.points[i].x || 0));
                                parts.push(t.comma);
                                parts.push(String(element.points[i].y || 0));
                                parts.push(')');
                                parts.push(t.semicolon);
                                parts.push('\n');
                            }
                            
                            parts.push(t.ctxStroke);
                        }
                        break;
                }
                
                return this.buildString(parts);
            } catch (error) {
                console.error('Error generating JavaScript for element:', error);
                return '// Error generating code for element ' + (index + 1);
            }
        }
    }
    
    // Export to global namespace
    if (typeof window !== 'undefined') {
        window.SafeCodeGenerator = SafeCodeGenerator;
        console.log('SafeCodeGenerator: Class loaded successfully');
    }
    
})();