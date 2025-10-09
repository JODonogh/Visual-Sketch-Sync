// Alignment Guides and CRAP Design Principle Helpers
// IIFE wrapper to prevent global conflicts
(function() {
    'use strict';
    
    // Check if AlignmentGuides already exists
    if (window.AlignmentGuides) {
        console.log('AlignmentGuides already exists, skipping redefinition');
        return;
    }

class AlignmentGuides {
    constructor(canvas, ctx, stateManager) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.stateManager = stateManager;
        this.guides = {
            horizontal: [],
            vertical: [],
            visible: false
        };
        this.snapDistance = 8;
        this.gridSnap = false;
        this.elementSnap = true;
        
        // Enhanced grid system
        this.gridConfig = {
            size: 8,
            subdivisions: 4,
            visible: false,
            color: '#e0e0e0',
            subdivisionColor: '#f0f0f0',
            opacity: 0.3
        };
        
        // Typography tools
        this.typographyTools = {
            baselineGrid: false,
            baselineSpacing: 24,
            textElements: [],
            fontSizes: [12, 14, 16, 18, 24, 32, 48, 64],
            fontWeights: [300, 400, 500, 600, 700]
        };
        
        // Layout suggestions cache
        this.layoutSuggestions = [];
        this.lastAnalysisTime = 0;
        this.analysisThrottle = 500; // ms
    }
    
    // Enhanced Grid System
    showGrid(visible = true) {
        this.gridConfig.visible = visible;
        this.stateManager.setGridVisible(visible);
        this.redrawCanvas();
    }
    
    setGridSize(size) {
        this.gridConfig.size = size;
        this.stateManager.setGridSize(size);
        if (this.gridConfig.visible) {
            this.redrawCanvas();
        }
    }
    
    setGridSubdivisions(subdivisions) {
        this.gridConfig.subdivisions = subdivisions;
        if (this.gridConfig.visible) {
            this.redrawCanvas();
        }
    }
    
    setGridOpacity(opacity) {
        this.gridConfig.opacity = Math.max(0, Math.min(1, opacity));
        if (this.gridConfig.visible) {
            this.redrawCanvas();
        }
    }
    
    toggleGridSnap() {
        this.gridSnap = !this.gridSnap;
        return this.gridSnap;
    }
    
    drawGrid() {
        if (!this.gridConfig.visible) return;
        
        this.ctx.save();
        this.ctx.globalAlpha = this.gridConfig.opacity;
        
        const { size, subdivisions, color, subdivisionColor } = this.gridConfig;
        const subSize = size / subdivisions;
        
        // Draw subdivision grid (lighter)
        this.ctx.strokeStyle = subdivisionColor;
        this.ctx.lineWidth = 0.5;
        this.ctx.beginPath();
        
        for (let x = 0; x <= this.canvas.width; x += subSize) {
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
        }
        
        for (let y = 0; y <= this.canvas.height; y += subSize) {
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
        }
        
        this.ctx.stroke();
        
        // Draw main grid (darker)
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        
        for (let x = 0; x <= this.canvas.width; x += size) {
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
        }
        
        for (let y = 0; y <= this.canvas.height; y += size) {
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
        }
        
        this.ctx.stroke();
        this.ctx.restore();
    }
    
    // Snap to Grid
    snapToGrid(point) {
        if (!this.gridSnap) return point;
        
        const gridSize = this.stateManager.designData.canvas.grid.size;
        return {
            x: Math.round(point.x / gridSize) * gridSize,
            y: Math.round(point.y / gridSize) * gridSize
        };
    }
    
    // Dynamic Alignment Guides
    showAlignmentGuides(visible = true) {
        this.guides.visible = visible;
        if (!visible) {
            this.clearGuides();
        }
    }
    
    updateGuides(currentElement, currentPosition) {
        if (!this.guides.visible || !this.elementSnap) return { x: currentPosition.x, y: currentPosition.y };
        
        this.clearGuides();
        
        const elements = this.stateManager.designData.elements.filter(el => el.id !== currentElement?.id);
        const snapPoints = this.getSnapPoints(elements);
        
        let snappedX = currentPosition.x;
        let snappedY = currentPosition.y;
        
        // Find closest snap points
        const horizontalSnap = this.findClosestSnapPoint(currentPosition.y, snapPoints.horizontal);
        const verticalSnap = this.findClosestSnapPoint(currentPosition.x, snapPoints.vertical);
        
        // Apply snapping
        if (horizontalSnap.distance <= this.snapDistance) {
            snappedY = horizontalSnap.value;
            this.drawHorizontalGuide(snappedY);
        }
        
        if (verticalSnap.distance <= this.snapDistance) {
            snappedX = verticalSnap.value;
            this.drawVerticalGuide(snappedX);
        }
        
        return { x: snappedX, y: snappedY };
    }
    
    getSnapPoints(elements) {
        const horizontal = [];
        const vertical = [];
        
        elements.forEach(element => {
            switch (element.type) {
                case 'rectangle':
                    // Horizontal snap points (top, center, bottom)
                    horizontal.push(element.position.y); // top
                    horizontal.push(element.position.y + element.size.height / 2); // center
                    horizontal.push(element.position.y + element.size.height); // bottom
                    
                    // Vertical snap points (left, center, right)
                    vertical.push(element.position.x); // left
                    vertical.push(element.position.x + element.size.width / 2); // center
                    vertical.push(element.position.x + element.size.width); // right
                    break;
                    
                case 'circle':
                    // Center point
                    horizontal.push(element.position.y);
                    vertical.push(element.position.x);
                    
                    // Bounding box
                    horizontal.push(element.position.y - element.radius); // top
                    horizontal.push(element.position.y + element.radius); // bottom
                    vertical.push(element.position.x - element.radius); // left
                    vertical.push(element.position.x + element.radius); // right
                    break;
                    
                case 'line':
                    horizontal.push(element.start.y, element.end.y);
                    vertical.push(element.start.x, element.end.x);
                    break;
            }
        });
        
        // Add canvas edges
        horizontal.push(0, this.canvas.height / 2, this.canvas.height);
        vertical.push(0, this.canvas.width / 2, this.canvas.width);
        
        return {
            horizontal: [...new Set(horizontal)].sort((a, b) => a - b),
            vertical: [...new Set(vertical)].sort((a, b) => a - b)
        };
    }
    
    findClosestSnapPoint(value, snapPoints) {
        let closest = { value: value, distance: Infinity };
        
        snapPoints.forEach(point => {
            const distance = Math.abs(value - point);
            if (distance < closest.distance) {
                closest = { value: point, distance: distance };
            }
        });
        
        return closest;
    }
    
    drawHorizontalGuide(y) {
        this.ctx.save();
        this.ctx.strokeStyle = '#ff0066';
        this.ctx.lineWidth = 1;
        this.ctx.setLineDash([4, 4]);
        
        this.ctx.beginPath();
        this.ctx.moveTo(0, y);
        this.ctx.lineTo(this.canvas.width, y);
        this.ctx.stroke();
        
        this.ctx.restore();
    }
    
    drawVerticalGuide(x) {
        this.ctx.save();
        this.ctx.strokeStyle = '#ff0066';
        this.ctx.lineWidth = 1;
        this.ctx.setLineDash([4, 4]);
        
        this.ctx.beginPath();
        this.ctx.moveTo(x, 0);
        this.ctx.lineTo(x, this.canvas.height);
        this.ctx.stroke();
        
        this.ctx.restore();
    }
    
    clearGuides() {
        // Guides are drawn on top and cleared with canvas redraw
        // This method is called before redrawing
    }
    
    // CRAP Design Principles Analysis
    analyzeCRAP(elements = null) {
        const elementsToAnalyze = elements || this.stateManager.designData.elements;
        
        return {
            contrast: this.analyzeContrast(elementsToAnalyze),
            repetition: this.analyzeRepetition(elementsToAnalyze),
            alignment: this.analyzeAlignment(elementsToAnalyze),
            proximity: this.analyzeProximity(elementsToAnalyze)
        };
    }
    
    // Contrast Analysis
    analyzeContrast(elements) {
        const analysis = {
            score: 0,
            issues: [],
            suggestions: []
        };
        
        const colors = elements.map(el => el.style?.fill || el.style?.stroke).filter(Boolean);
        const uniqueColors = [...new Set(colors)];
        
        if (uniqueColors.length < 2) {
            analysis.issues.push('Limited color variety - consider adding contrast');
            analysis.suggestions.push('Add contrasting colors to create visual hierarchy');
            analysis.score = 30;
        } else {
            // Check color contrast ratios
            let contrastSum = 0;
            let comparisons = 0;
            
            for (let i = 0; i < uniqueColors.length; i++) {
                for (let j = i + 1; j < uniqueColors.length; j++) {
                    const ratio = this.getColorContrastRatio(uniqueColors[i], uniqueColors[j]);
                    contrastSum += ratio;
                    comparisons++;
                }
            }
            
            const avgContrast = comparisons > 0 ? contrastSum / comparisons : 1;
            
            if (avgContrast < 3) {
                analysis.issues.push('Low color contrast detected');
                analysis.suggestions.push('Increase color contrast for better readability');
                analysis.score = 40;
            } else if (avgContrast < 4.5) {
                analysis.score = 70;
                analysis.suggestions.push('Good contrast, consider enhancing for accessibility');
            } else {
                analysis.score = 90;
            }
        }
        
        return analysis;
    }
    
    // Repetition Analysis
    analyzeRepetition(elements) {
        const analysis = {
            score: 0,
            issues: [],
            suggestions: []
        };
        
        // Analyze repeated colors
        const colors = elements.map(el => el.style?.fill || el.style?.stroke).filter(Boolean);
        const colorCounts = {};
        colors.forEach(color => {
            colorCounts[color] = (colorCounts[color] || 0) + 1;
        });
        
        const repeatedColors = Object.values(colorCounts).filter(count => count > 1).length;
        
        // Analyze repeated shapes
        const shapes = elements.map(el => el.type);
        const shapeCounts = {};
        shapes.forEach(shape => {
            shapeCounts[shape] = (shapeCounts[shape] || 0) + 1;
        });
        
        const repeatedShapes = Object.values(shapeCounts).filter(count => count > 1).length;
        
        // Analyze repeated sizes
        const sizes = elements.map(el => {
            if (el.size) return `${el.size.width}x${el.size.height}`;
            if (el.radius) return `r${el.radius}`;
            return 'unknown';
        });
        const sizeCounts = {};
        sizes.forEach(size => {
            sizeCounts[size] = (sizeCounts[size] || 0) + 1;
        });
        
        const repeatedSizes = Object.values(sizeCounts).filter(count => count > 1).length;
        
        const repetitionScore = (repeatedColors + repeatedShapes + repeatedSizes) * 10;
        analysis.score = Math.min(100, repetitionScore);
        
        if (analysis.score < 30) {
            analysis.issues.push('Limited repetition of design elements');
            analysis.suggestions.push('Repeat colors, shapes, or sizes to create unity');
        } else if (analysis.score < 60) {
            analysis.suggestions.push('Good repetition, consider strengthening consistency');
        }
        
        return analysis;
    }
    
    // Alignment Analysis
    analyzeAlignment(elements) {
        const analysis = {
            score: 0,
            issues: [],
            suggestions: []
        };
        
        if (elements.length < 2) {
            analysis.score = 100;
            return analysis;
        }
        
        // Check horizontal alignment
        const horizontalGroups = this.groupByAlignment(elements, 'horizontal');
        const verticalGroups = this.groupByAlignment(elements, 'vertical');
        
        const totalElements = elements.length;
        const alignedElements = horizontalGroups.aligned + verticalGroups.aligned;
        const alignmentRatio = alignedElements / totalElements;
        
        analysis.score = Math.round(alignmentRatio * 100);
        
        if (analysis.score < 40) {
            analysis.issues.push('Poor alignment detected');
            analysis.suggestions.push('Align elements to create visual order');
        } else if (analysis.score < 70) {
            analysis.suggestions.push('Good alignment, consider refining edge alignment');
        }
        
        return analysis;
    }
    
    // Proximity Analysis
    analyzeProximity(elements) {
        const analysis = {
            score: 0,
            issues: [],
            suggestions: []
        };
        
        if (elements.length < 2) {
            analysis.score = 100;
            return analysis;
        }
        
        const distances = [];
        const clusters = this.findClusters(elements);
        
        // Analyze spacing consistency
        for (let i = 0; i < elements.length; i++) {
            for (let j = i + 1; j < elements.length; j++) {
                const distance = this.getElementDistance(elements[i], elements[j]);
                distances.push(distance);
            }
        }
        
        const avgDistance = distances.reduce((a, b) => a + b, 0) / distances.length;
        const distanceVariance = distances.reduce((sum, d) => sum + Math.pow(d - avgDistance, 2), 0) / distances.length;
        const consistencyScore = Math.max(0, 100 - (distanceVariance / 100));
        
        const clusterScore = clusters.length > 1 ? 80 : 60;
        
        analysis.score = Math.round((consistencyScore + clusterScore) / 2);
        
        if (analysis.score < 40) {
            analysis.issues.push('Inconsistent spacing between elements');
            analysis.suggestions.push('Group related elements closer together');
        } else if (analysis.score < 70) {
            analysis.suggestions.push('Good proximity, consider refining spacing consistency');
        }
        
        return analysis;
    }
    
    // Helper methods for CRAP analysis
    getColorContrastRatio(color1, color2) {
        // Simplified contrast ratio calculation
        const rgb1 = this.hexToRgb(color1);
        const rgb2 = this.hexToRgb(color2);
        
        if (!rgb1 || !rgb2) return 1;
        
        const lum1 = this.getLuminance(rgb1);
        const lum2 = this.getLuminance(rgb2);
        
        const brightest = Math.max(lum1, lum2);
        const darkest = Math.min(lum1, lum2);
        
        return (brightest + 0.05) / (darkest + 0.05);
    }
    
    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }
    
    getLuminance(rgb) {
        const [r, g, b] = [rgb.r, rgb.g, rgb.b].map(c => {
            c = c / 255;
            return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
        });
        
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    }
    
    groupByAlignment(elements, direction) {
        const tolerance = 5; // pixels
        let aligned = 0;
        
        for (let i = 0; i < elements.length; i++) {
            for (let j = i + 1; j < elements.length; j++) {
                const pos1 = this.getElementPosition(elements[i]);
                const pos2 = this.getElementPosition(elements[j]);
                
                if (direction === 'horizontal') {
                    if (Math.abs(pos1.y - pos2.y) <= tolerance) {
                        aligned += 2;
                    }
                } else {
                    if (Math.abs(pos1.x - pos2.x) <= tolerance) {
                        aligned += 2;
                    }
                }
            }
        }
        
        return { aligned: Math.min(aligned, elements.length) };
    }
    
    findClusters(elements) {
        const clusters = [];
        const processed = new Set();
        const clusterDistance = 50; // pixels
        
        elements.forEach((element, index) => {
            if (processed.has(index)) return;
            
            const cluster = [element];
            processed.add(index);
            
            elements.forEach((otherElement, otherIndex) => {
                if (processed.has(otherIndex) || index === otherIndex) return;
                
                const distance = this.getElementDistance(element, otherElement);
                if (distance <= clusterDistance) {
                    cluster.push(otherElement);
                    processed.add(otherIndex);
                }
            });
            
            clusters.push(cluster);
        });
        
        return clusters;
    }
    
    getElementDistance(element1, element2) {
        const pos1 = this.getElementPosition(element1);
        const pos2 = this.getElementPosition(element2);
        
        return Math.sqrt(Math.pow(pos2.x - pos1.x, 2) + Math.pow(pos2.y - pos1.y, 2));
    }
    
    getElementPosition(element) {
        if (element.position) {
            return element.position;
        } else if (element.start) {
            return element.start;
        }
        return { x: 0, y: 0 };
    }
    
    // Distribution and Alignment Tools
    distributeEvenly(elements, direction = 'horizontal') {
        if (elements.length < 3) return false;
        
        elements.sort((a, b) => {
            const posA = this.getElementPosition(a);
            const posB = this.getElementPosition(b);
            return direction === 'horizontal' ? posA.x - posB.x : posA.y - posB.y;
        });
        
        const first = this.getElementPosition(elements[0]);
        const last = this.getElementPosition(elements[elements.length - 1]);
        const totalDistance = direction === 'horizontal' ? last.x - first.x : last.y - first.y;
        const spacing = totalDistance / (elements.length - 1);
        
        for (let i = 1; i < elements.length - 1; i++) {
            const newPos = direction === 'horizontal' ? 
                first.x + (spacing * i) : 
                first.y + (spacing * i);
            
            if (direction === 'horizontal') {
                elements[i].position.x = newPos;
            } else {
                elements[i].position.y = newPos;
            }
        }
        
        return true;
    }
    
    alignToBaseline(elements, baseline = 'top') {
        if (elements.length < 2) return false;
        
        let referenceValue;
        
        switch (baseline) {
            case 'top':
                referenceValue = Math.min(...elements.map(el => this.getElementPosition(el).y));
                elements.forEach(el => el.position.y = referenceValue);
                break;
            case 'bottom':
                referenceValue = Math.max(...elements.map(el => {
                    const pos = this.getElementPosition(el);
                    return pos.y + (el.size?.height || el.radius || 0);
                }));
                elements.forEach(el => {
                    const height = el.size?.height || el.radius || 0;
                    el.position.y = referenceValue - height;
                });
                break;
            case 'left':
                referenceValue = Math.min(...elements.map(el => this.getElementPosition(el).x));
                elements.forEach(el => el.position.x = referenceValue);
                break;
            case 'right':
                referenceValue = Math.max(...elements.map(el => {
                    const pos = this.getElementPosition(el);
                    return pos.x + (el.size?.width || el.radius || 0);
                }));
                elements.forEach(el => {
                    const width = el.size?.width || el.radius || 0;
                    el.position.x = referenceValue - width;
                });
                break;
            case 'center-horizontal':
                const centerY = elements.reduce((sum, el) => sum + this.getElementPosition(el).y, 0) / elements.length;
                elements.forEach(el => el.position.y = centerY);
                break;
            case 'center-vertical':
                const centerX = elements.reduce((sum, el) => sum + this.getElementPosition(el).x, 0) / elements.length;
                elements.forEach(el => el.position.x = centerX);
                break;
        }
        
        return true;
    }
    
    // Typography Tools and Text Element Management
    enableBaselineGrid(enabled = true, spacing = 24) {
        this.typographyTools.baselineGrid = enabled;
        this.typographyTools.baselineSpacing = spacing;
        if (enabled) {
            this.drawBaselineGrid();
        }
    }
    
    drawBaselineGrid() {
        if (!this.typographyTools.baselineGrid) return;
        
        this.ctx.save();
        this.ctx.strokeStyle = '#ff6b6b';
        this.ctx.lineWidth = 0.5;
        this.ctx.globalAlpha = 0.2;
        this.ctx.setLineDash([2, 4]);
        
        const spacing = this.typographyTools.baselineSpacing;
        
        for (let y = spacing; y < this.canvas.height; y += spacing) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
            this.ctx.stroke();
        }
        
        this.ctx.restore();
    }
    
    addTextElement(element) {
        this.typographyTools.textElements.push({
            id: element.id,
            text: element.text,
            fontSize: element.style.fontSize || 16,
            fontWeight: element.style.fontWeight || 400,
            fontFamily: element.style.fontFamily || 'Arial',
            lineHeight: element.style.lineHeight || 1.4,
            position: element.position,
            baseline: this.calculateBaseline(element)
        });
        
        this.analyzeTypographyConsistency();
    }
    
    calculateBaseline(textElement) {
        const fontSize = textElement.style.fontSize || 16;
        const lineHeight = textElement.style.lineHeight || 1.4;
        return textElement.position.y + (fontSize * lineHeight * 0.8);
    }
    
    analyzeTypographyConsistency() {
        const elements = this.typographyTools.textElements;
        if (elements.length < 2) return;
        
        // Analyze font size consistency
        const fontSizes = elements.map(el => el.fontSize);
        const uniqueSizes = [...new Set(fontSizes)];
        
        // Analyze baseline alignment
        const baselines = elements.map(el => el.baseline);
        const baselineGroups = this.groupSimilarValues(baselines, 5);
        
        // Generate typography suggestions
        const suggestions = [];
        
        if (uniqueSizes.length > 5) {
            suggestions.push({
                type: 'typography',
                severity: 'warning',
                message: 'Too many font sizes detected. Consider using a type scale.',
                action: 'consolidate-font-sizes'
            });
        }
        
        if (baselineGroups.length > elements.length * 0.7) {
            suggestions.push({
                type: 'typography',
                severity: 'info',
                message: 'Text elements could benefit from baseline alignment.',
                action: 'align-baselines'
            });
        }
        
        this.layoutSuggestions = this.layoutSuggestions.filter(s => s.type !== 'typography');
        this.layoutSuggestions.push(...suggestions);
    }
    
    alignTextToBaseline(textElements = null) {
        const elements = textElements || this.typographyTools.textElements;
        if (elements.length < 2) return false;
        
        const spacing = this.typographyTools.baselineSpacing;
        
        elements.forEach(element => {
            const currentBaseline = element.baseline;
            const nearestGridLine = Math.round(currentBaseline / spacing) * spacing;
            const adjustment = nearestGridLine - currentBaseline;
            
            // Update element position
            const canvasElement = this.stateManager.getElementById(element.id);
            if (canvasElement) {
                canvasElement.position.y += adjustment;
                element.baseline = nearestGridLine;
            }
        });
        
        return true;
    }
    
    // Design Consistency Checking and Layout Suggestions
    analyzeDesignConsistency() {
        const now = Date.now();
        if (now - this.lastAnalysisTime < this.analysisThrottle) {
            return this.layoutSuggestions;
        }
        
        this.lastAnalysisTime = now;
        this.layoutSuggestions = [];
        
        const elements = this.stateManager.designData.elements;
        
        // Analyze spacing consistency
        this.analyzeSpacingConsistency(elements);
        
        // Analyze size consistency
        this.analyzeSizeConsistency(elements);
        
        // Analyze color consistency
        this.analyzeColorConsistency(elements);
        
        // Analyze alignment opportunities
        this.analyzeAlignmentOpportunities(elements);
        
        // Analyze grouping opportunities
        this.analyzeGroupingOpportunities(elements);
        
        return this.layoutSuggestions;
    }
    
    analyzeSpacingConsistency(elements) {
        const spacings = [];
        
        for (let i = 0; i < elements.length; i++) {
            for (let j = i + 1; j < elements.length; j++) {
                const distance = this.getElementDistance(elements[i], elements[j]);
                spacings.push(Math.round(distance));
            }
        }
        
        const spacingGroups = this.groupSimilarValues(spacings, 8);
        const mostCommon = this.getMostCommonValue(spacings);
        
        if (spacingGroups.length > spacings.length * 0.6) {
            this.layoutSuggestions.push({
                type: 'spacing',
                severity: 'warning',
                message: `Inconsistent spacing detected. Consider using ${mostCommon}px as standard spacing.`,
                action: 'standardize-spacing',
                value: mostCommon
            });
        }
    }
    
    analyzeSizeConsistency(elements) {
        const sizes = elements.map(el => {
            if (el.size) return el.size.width * el.size.height;
            if (el.radius) return Math.PI * el.radius * el.radius;
            return 0;
        }).filter(size => size > 0);
        
        const sizeGroups = this.groupSimilarValues(sizes, sizes.length * 0.1);
        
        if (sizeGroups.length < 3 && elements.length > 5) {
            this.layoutSuggestions.push({
                type: 'size',
                severity: 'info',
                message: 'Consider varying element sizes to create visual hierarchy.',
                action: 'vary-sizes'
            });
        }
    }
    
    analyzeColorConsistency(elements) {
        const colors = elements.map(el => el.style?.fill || el.style?.stroke).filter(Boolean);
        const uniqueColors = [...new Set(colors)];
        
        if (uniqueColors.length > 6) {
            this.layoutSuggestions.push({
                type: 'color',
                severity: 'warning',
                message: 'Too many colors detected. Consider limiting to 3-5 colors.',
                action: 'reduce-colors'
            });
        }
        
        if (uniqueColors.length < 2 && elements.length > 3) {
            this.layoutSuggestions.push({
                type: 'color',
                severity: 'info',
                message: 'Consider adding color variety for visual interest.',
                action: 'add-color-variety'
            });
        }
    }
    
    analyzeAlignmentOpportunities(elements) {
        const alignmentTolerance = 10;
        const opportunities = [];
        
        // Check for near-alignments that could be improved
        for (let i = 0; i < elements.length; i++) {
            for (let j = i + 1; j < elements.length; j++) {
                const pos1 = this.getElementPosition(elements[i]);
                const pos2 = this.getElementPosition(elements[j]);
                
                const horizontalDiff = Math.abs(pos1.y - pos2.y);
                const verticalDiff = Math.abs(pos1.x - pos2.x);
                
                if (horizontalDiff > 2 && horizontalDiff <= alignmentTolerance) {
                    opportunities.push({
                        type: 'alignment',
                        elements: [elements[i].id, elements[j].id],
                        direction: 'horizontal',
                        difference: horizontalDiff
                    });
                }
                
                if (verticalDiff > 2 && verticalDiff <= alignmentTolerance) {
                    opportunities.push({
                        type: 'alignment',
                        elements: [elements[i].id, elements[j].id],
                        direction: 'vertical',
                        difference: verticalDiff
                    });
                }
            }
        }
        
        if (opportunities.length > 0) {
            this.layoutSuggestions.push({
                type: 'alignment',
                severity: 'info',
                message: `${opportunities.length} alignment opportunities detected.`,
                action: 'improve-alignment',
                opportunities: opportunities
            });
        }
    }
    
    analyzeGroupingOpportunities(elements) {
        const clusters = this.findClusters(elements);
        const isolatedElements = elements.length - clusters.reduce((sum, cluster) => sum + cluster.length, 0);
        
        if (isolatedElements > elements.length * 0.3) {
            this.layoutSuggestions.push({
                type: 'grouping',
                severity: 'info',
                message: 'Consider grouping related elements closer together.',
                action: 'improve-grouping'
            });
        }
        
        // Check for overly tight groupings
        const tightClusters = clusters.filter(cluster => {
            if (cluster.length < 2) return false;
            const avgDistance = this.getAverageClusterDistance(cluster);
            return avgDistance < 20;
        });
        
        if (tightClusters.length > 0) {
            this.layoutSuggestions.push({
                type: 'grouping',
                severity: 'warning',
                message: 'Some elements may be too tightly grouped.',
                action: 'increase-spacing'
            });
        }
    }
    
    // Helper methods for consistency analysis
    groupSimilarValues(values, tolerance) {
        const groups = [];
        const processed = new Set();
        
        values.forEach((value, index) => {
            if (processed.has(index)) return;
            
            const group = [value];
            processed.add(index);
            
            values.forEach((otherValue, otherIndex) => {
                if (processed.has(otherIndex) || index === otherIndex) return;
                
                if (Math.abs(value - otherValue) <= tolerance) {
                    group.push(otherValue);
                    processed.add(otherIndex);
                }
            });
            
            groups.push(group);
        });
        
        return groups;
    }
    
    getMostCommonValue(values) {
        const counts = {};
        values.forEach(value => {
            counts[value] = (counts[value] || 0) + 1;
        });
        
        return Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
    }
    
    getAverageClusterDistance(cluster) {
        if (cluster.length < 2) return 0;
        
        let totalDistance = 0;
        let comparisons = 0;
        
        for (let i = 0; i < cluster.length; i++) {
            for (let j = i + 1; j < cluster.length; j++) {
                totalDistance += this.getElementDistance(cluster[i], cluster[j]);
                comparisons++;
            }
        }
        
        return comparisons > 0 ? totalDistance / comparisons : 0;
    }
    
    // Apply layout suggestions
    applySuggestion(suggestion) {
        switch (suggestion.action) {
            case 'standardize-spacing':
                return this.standardizeSpacing(suggestion.value);
            case 'improve-alignment':
                return this.improveAlignment(suggestion.opportunities);
            case 'align-baselines':
                return this.alignTextToBaseline();
            case 'improve-grouping':
                return this.improveGrouping();
            default:
                return false;
        }
    }
    
    standardizeSpacing(targetSpacing) {
        const elements = this.stateManager.designData.elements;
        const clusters = this.findClusters(elements);
        
        clusters.forEach(cluster => {
            if (cluster.length < 2) return;
            
            // Sort by position
            cluster.sort((a, b) => {
                const posA = this.getElementPosition(a);
                const posB = this.getElementPosition(b);
                return posA.x - posB.x;
            });
            
            // Apply standard spacing
            for (let i = 1; i < cluster.length; i++) {
                const prevPos = this.getElementPosition(cluster[i - 1]);
                const prevWidth = cluster[i - 1].size?.width || cluster[i - 1].radius || 0;
                cluster[i].position.x = prevPos.x + prevWidth + targetSpacing;
            }
        });
        
        return true;
    }
    
    improveAlignment(opportunities) {
        opportunities.forEach(opp => {
            const element1 = this.stateManager.getElementById(opp.elements[0]);
            const element2 = this.stateManager.getElementById(opp.elements[1]);
            
            if (!element1 || !element2) return;
            
            const pos1 = this.getElementPosition(element1);
            const pos2 = this.getElementPosition(element2);
            
            if (opp.direction === 'horizontal') {
                const avgY = (pos1.y + pos2.y) / 2;
                element1.position.y = avgY;
                element2.position.y = avgY;
            } else {
                const avgX = (pos1.x + pos2.x) / 2;
                element1.position.x = avgX;
                element2.position.x = avgX;
            }
        });
        
        return true;
    }
    
    improveGrouping() {
        const elements = this.stateManager.designData.elements;
        const clusters = this.findClusters(elements);
        
        // Move isolated elements closer to nearest cluster
        elements.forEach(element => {
            const isInCluster = clusters.some(cluster => cluster.includes(element));
            if (isInCluster) return;
            
            // Find nearest cluster
            let nearestCluster = null;
            let minDistance = Infinity;
            
            clusters.forEach(cluster => {
                const avgDistance = cluster.reduce((sum, clusterElement) => {
                    return sum + this.getElementDistance(element, clusterElement);
                }, 0) / cluster.length;
                
                if (avgDistance < minDistance) {
                    minDistance = avgDistance;
                    nearestCluster = cluster;
                }
            });
            
            if (nearestCluster && minDistance > 100) {
                // Move element closer to cluster
                const clusterCenter = this.getClusterCenter(nearestCluster);
                const elementPos = this.getElementPosition(element);
                const direction = {
                    x: clusterCenter.x - elementPos.x,
                    y: clusterCenter.y - elementPos.y
                };
                const distance = Math.sqrt(direction.x * direction.x + direction.y * direction.y);
                
                if (distance > 0) {
                    const moveDistance = Math.min(distance * 0.5, 50);
                    element.position.x += (direction.x / distance) * moveDistance;
                    element.position.y += (direction.y / distance) * moveDistance;
                }
            }
        });
        
        return true;
    }
    
    getClusterCenter(cluster) {
        const positions = cluster.map(el => this.getElementPosition(el));
        return {
            x: positions.reduce((sum, pos) => sum + pos.x, 0) / positions.length,
            y: positions.reduce((sum, pos) => sum + pos.y, 0) / positions.length
        };
    }
    
    // Canvas redraw helper
    redrawCanvas() {
        // This should be called from the main drawing engine
        // to trigger a complete canvas redraw including grid
        if (this.stateManager && this.stateManager.redraw) {
            this.stateManager.redraw();
        }
    }
}

// Expose AlignmentGuides to global scope
window.AlignmentGuides = AlignmentGuides;

})(); // End of IIFE