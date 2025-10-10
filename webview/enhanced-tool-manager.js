/**
 * Enhanced Tool Manager - Integrates PersistentDrawingManager with tool switching
 * 
 * This module modifies the existing tool selection logic to maintain canvas content
 * when switching between tools, addressing Requirements 4.1, 4.2, 4.3, 2.3, 2.4
 */

(function() {
    'use strict';
    
    // Check if EnhancedToolManager already exists
    if (window.EnhancedToolManager) {
        console.log('EnhancedToolManager already exists, skipping redefinition');
        return;
    }

    class EnhancedToolManager {
        constructor(canvas, ctx) {
            this.canvas = canvas;
            this.ctx = ctx;
            this.currentTool = 'pen';
            this.isDrawing = false;
            this.isDrawingShape = false;
            
            // Initialize persistent drawing manager
            this.persistentManager = new window.PersistentDrawingManager(canvas, ctx);
            
            // Initialize tool state manager
            this.toolStateManager = new window.ToolStateManager(canvas, ctx);
            
            // Current drawing state for shapes
            this.currentElement = null;
            this.startX = 0;
            this.startY = 0;
            this.currentPoints = []; // For pen tool
            
            // Eraser state management
            this.eraserActive = false;
            this.eraserSize = 0;
            this.contextSaved = false;
            
            // Legacy tool state management (kept for compatibility)
            this.toolStates = {
                pen: { active: false },
                rectangle: { active: false },
                circle: { active: false },
                line: { active: false },
                eraser: { active: false }
            };
            
            console.log('EnhancedToolManager initialized with PersistentDrawingManager and ToolStateManager');
        }
        
        /**
         * Select a tool and properly clean up previous tool state
         * @param {string} toolName - Name of the tool to select
         */
        async selectTool(toolName) {
            console.log(`EnhancedToolManager: Switching from ${this.currentTool} to ${toolName}`);
            
            // Use ToolStateManager for safe tool transition
            const transitionSuccess = await this.toolStateManager.transitionToTool(toolName);
            
            if (!transitionSuccess) {
                console.error(`EnhancedToolManager: Failed to transition to tool ${toolName}`);
                return false;
            }
            
            // Update drawing state in ToolStateManager
            this.toolStateManager.updateDrawingState({
                isDrawing: this.isDrawing,
                isDrawingShape: this.isDrawingShape,
                hasUnsavedChanges: false
            });
            
            // Update tool state
            const previousTool = this.currentTool;
            this.currentTool = toolName;
            
            // Update legacy tool states for compatibility
            Object.keys(this.toolStates).forEach(tool => {
                this.toolStates[tool].active = (tool === toolName);
            });
            
            // Update UI
            this.updateToolButtons();
            this.updateCursor();
            
            // Redraw all persistent elements to ensure they remain visible
            this.persistentManager.redrawAll();
            
            console.log(`EnhancedToolManager: Tool switched to ${toolName}, ${this.persistentManager.getElementCount()} elements preserved`);
            
            // Notify about tool change
            this.notifyToolChange(previousTool, toolName);
            
            return true;
        }
        
        /**
         * Clean up the current tool's state before switching
         * @private
         */
        cleanupCurrentTool() {
            // If currently drawing, finish the current element
            if (this.isDrawing || this.isDrawingShape) {
                this.finishCurrentDrawing();
            }
            
            // Reset tool-specific states
            switch (this.currentTool) {
                case 'eraser':
                    // Properly cleanup eraser state
                    if (this.eraserActive) {
                        this.finishErasing();
                    }
                    // Force reset composite operation and restore context if needed
                    if (this.contextSaved) {
                        try {
                            this.ctx.restore();
                            this.contextSaved = false;
                        } catch (e) {
                            console.warn('EnhancedToolManager: Error restoring context:', e);
                        }
                    }
                    this.ctx.globalCompositeOperation = 'source-over';
                    this.ctx.globalAlpha = 1.0;
                    break;
                    
                case 'pen':
                    // Finish any ongoing pen stroke
                    if (this.currentPoints.length > 0) {
                        this.finishPenStroke();
                    }
                    break;
                    
                case 'rectangle':
                case 'circle':
                case 'line':
                    // Finish any ongoing shape
                    if (this.isDrawingShape && this.currentElement) {
                        this.finishShape();
                    }
                    break;
            }
            
            // Reset drawing states
            this.isDrawing = false;
            this.isDrawingShape = false;
            this.currentElement = null;
            this.currentPoints = [];
        }
        
        /**
         * Start drawing with the current tool
         * @param {number} x - X coordinate
         * @param {number} y - Y coordinate
         * @param {number} pressure - Pressure value (0-1)
         */
        startDrawing(x, y, pressure = 0.5) {
            this.isDrawing = true;
            this.startX = x;
            this.startY = y;
            
            // Update drawing state in ToolStateManager
            this.toolStateManager.updateDrawingState({
                isDrawing: true,
                hasUnsavedChanges: true
            });
            
            switch (this.currentTool) {
                case 'pen':
                    this.startPenStroke(x, y, pressure);
                    break;
                    
                case 'rectangle':
                case 'circle':
                case 'line':
                    this.startShape(x, y);
                    break;
                    
                case 'eraser':
                    this.startErasing(x, y);
                    break;
            }
        }
        
        /**
         * Continue drawing with the current tool
         * @param {number} x - X coordinate
         * @param {number} y - Y coordinate
         * @param {number} pressure - Pressure value (0-1)
         */
        continueDrawing(x, y, pressure = 0.5) {
            if (!this.isDrawing && !this.isDrawingShape) return;
            
            switch (this.currentTool) {
                case 'pen':
                    this.continuePenStroke(x, y, pressure);
                    break;
                    
                case 'rectangle':
                case 'circle':
                case 'line':
                    this.updateShape(x, y);
                    break;
                    
                case 'eraser':
                    this.continueErasing(x, y);
                    break;
            }
        }
        
        /**
         * Finish drawing with the current tool
         * @param {number} x - X coordinate
         * @param {number} y - Y coordinate
         */
        finishDrawing(x, y) {
            if (!this.isDrawing && !this.isDrawingShape) return;
            
            switch (this.currentTool) {
                case 'pen':
                    this.finishPenStroke();
                    break;
                    
                case 'rectangle':
                case 'circle':
                case 'line':
                    this.finishShape(x, y);
                    break;
                    
                case 'eraser':
                    this.finishErasing();
                    break;
            }
            
            this.isDrawing = false;
            this.isDrawingShape = false;
            
            // Update drawing state in ToolStateManager
            this.toolStateManager.updateDrawingState({
                isDrawing: false,
                isDrawingShape: false,
                hasUnsavedChanges: false
            });
        }
        
        /**
         * Start pen stroke
         * @param {number} x - X coordinate
         * @param {number} y - Y coordinate
         * @param {number} pressure - Pressure value
         * @private
         */
        startPenStroke(x, y, pressure) {
            this.currentPoints = [{x, y, pressure}];
            
            // Get settings from SettingsManager or fallback to VSSCanvas
            const settings = this.getToolSettings('pen');
            const color = settings.color || window.VSSCanvas?.settings?.color || '#000000';
            const strokeWidth = settings.strokeWidth || window.VSSCanvas?.settings?.strokeSize || 5;
            const opacity = (settings.opacity || window.VSSCanvas?.settings?.opacity || 100) / 100;
            
            // Set up canvas for pen drawing
            this.ctx.globalCompositeOperation = 'source-over';
            this.ctx.strokeStyle = color;
            this.ctx.lineWidth = strokeWidth;
            this.ctx.globalAlpha = opacity;
            this.ctx.lineCap = 'round';
            this.ctx.lineJoin = 'round';
            
            this.ctx.beginPath();
            this.ctx.moveTo(x, y);
        }
        
        /**
         * Continue pen stroke
         * @param {number} x - X coordinate
         * @param {number} y - Y coordinate
         * @param {number} pressure - Pressure value
         * @private
         */
        continuePenStroke(x, y, pressure) {
            this.currentPoints.push({x, y, pressure});
            
            // Get settings from SettingsManager or fallback to VSSCanvas
            const settings = this.getToolSettings('pen');
            const baseSize = settings.strokeWidth || window.VSSCanvas?.settings?.strokeSize || 5;
            const baseOpacity = (settings.opacity || window.VSSCanvas?.settings?.opacity || 100) / 100;
            const pressureSensitive = settings.pressureSensitive !== undefined ? settings.pressureSensitive : window.VSSCanvas?.settings?.pressureSensitivity;
            
            // Apply pressure sensitivity if enabled
            if (pressureSensitive && window.pressureSensitivityManager?.enabled) {
                // Use pressure manager's normalized pressure value
                const normalizedPressure = window.pressureSensitivityManager.getCurrentPressure();
                this.ctx.lineWidth = baseSize * normalizedPressure;
                
                // Also adjust opacity slightly based on pressure for more natural feel
                this.ctx.globalAlpha = baseOpacity * (0.7 + normalizedPressure * 0.3);
            } else {
                // Fixed line width when pressure sensitivity is disabled
                this.ctx.lineWidth = baseSize;
                this.ctx.globalAlpha = baseOpacity;
            }
            
            this.ctx.lineTo(x, y);
            this.ctx.stroke();
            
            // Start new path for next segment to apply new line width
            this.ctx.beginPath();
            this.ctx.moveTo(x, y);
        }
        
        /**
         * Finish pen stroke and add to persistent storage
         * @private
         */
        finishPenStroke() {
            if (this.currentPoints.length < 2) return;
            
            // Create element for persistent storage
            const element = {
                type: 'pen',
                tool: 'pen',
                strokeColor: window.VSSCanvas?.settings?.color || '#000000',
                strokeWidth: window.VSSCanvas?.settings?.strokeSize || 5,
                opacity: window.VSSCanvas?.settings?.opacity || 1.0,
                points: [...this.currentPoints],
                pressureSensitive: window.VSSCanvas?.settings?.pressureSensitivity || false,
                minPressure: window.VSSCanvas?.settings?.minPressure || 0.1,
                maxPressure: window.VSSCanvas?.settings?.maxPressure || 1.0
            };
            
            // Add to persistent storage
            const elementId = this.persistentManager.addElement(element);
            console.log(`EnhancedToolManager: Added pen stroke with ID ${elementId}`);
            
            // Reset pen state
            this.currentPoints = [];
            this.ctx.globalAlpha = 1.0;
        }
        
        /**
         * Start shape drawing
         * @param {number} x - X coordinate
         * @param {number} y - Y coordinate
         * @private
         */
        startShape(x, y) {
            this.isDrawingShape = true;
            this.startX = x;
            this.startY = y;
            
            // Update drawing state in ToolStateManager
            this.toolStateManager.updateDrawingState({
                isDrawingShape: true,
                hasUnsavedChanges: true
            });
            
            // Create preview canvas to preserve existing content
            this.previewCanvas = document.createElement('canvas');
            this.previewCanvas.width = this.canvas.width;
            this.previewCanvas.height = this.canvas.height;
            this.previewCtx = this.previewCanvas.getContext('2d');
            this.previewCtx.drawImage(this.canvas, 0, 0);
        }
        
        /**
         * Update shape preview
         * @param {number} x - X coordinate
         * @param {number} y - Y coordinate
         * @private
         */
        updateShape(x, y) {
            if (!this.isDrawingShape) return;
            
            // Restore canvas from preview
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.drawImage(this.previewCanvas, 0, 0);
            
            // Get current settings from SettingsManager or fallback to VSSCanvas
            const settings = this.getToolSettings(this.currentTool);
            const strokeColor = settings.strokeColor || window.VSSCanvas?.settings?.color || '#000000';
            const fillColor = settings.fillColor || window.VSSCanvas?.settings?.fillColor || '#000000';
            const fillMode = settings.fillMode || window.VSSCanvas?.settings?.fillMode || 'outline';
            const strokeWidth = settings.strokeWidth || window.VSSCanvas?.settings?.strokeSize || 5;
            const cornerRadius = settings.cornerRadius || window.VSSCanvas?.settings?.cornerRadius || 0;
            const opacity = (settings.opacity || window.VSSCanvas?.settings?.opacity || 100) / 100;
            
            // Set up drawing context
            this.ctx.strokeStyle = strokeColor;
            this.ctx.fillStyle = fillColor;
            this.ctx.lineWidth = strokeWidth;
            this.ctx.globalAlpha = opacity * 0.7; // Semi-transparent preview
            
            const width = x - this.startX;
            const height = y - this.startY;
            
            switch (this.currentTool) {
                case 'rectangle':
                    this.drawRectangleWithFill(this.startX, this.startY, width, height, cornerRadius, fillMode);
                    break;
                    
                case 'circle':
                    const radius = Math.sqrt(width * width + height * height);
                    this.drawCircleWithFill(this.startX, this.startY, radius, fillMode);
                    break;
                    
                case 'line':
                    this.drawLineWithFill(this.startX, this.startY, x, y, fillMode, strokeWidth);
                    break;
            }
            
            this.ctx.globalAlpha = 1.0;
        }
        
        /**
         * Finish shape and add to persistent storage
         * @param {number} x - X coordinate
         * @param {number} y - Y coordinate
         * @private
         */
        finishShape(x, y) {
            if (!this.isDrawingShape) return;
            
            const width = x - this.startX;
            const height = y - this.startY;
            
            // Get current settings from SettingsManager or fallback to VSSCanvas
            const settings = this.getToolSettings(this.currentTool);
            const strokeColor = settings.strokeColor || window.VSSCanvas?.settings?.color || '#000000';
            const fillColor = settings.fillColor || window.VSSCanvas?.settings?.fillColor || '#000000';
            const fillMode = settings.fillMode || window.VSSCanvas?.settings?.fillMode || 'outline';
            const strokeWidth = settings.strokeWidth || window.VSSCanvas?.settings?.strokeSize || 5;
            const cornerRadius = settings.cornerRadius || window.VSSCanvas?.settings?.cornerRadius || 0;
            const opacity = (settings.opacity || window.VSSCanvas?.settings?.opacity || 100) / 100;
            
            let element = {
                strokeColor: strokeColor,
                fillColor: fillColor,
                fillMode: fillMode,
                strokeWidth: strokeWidth,
                opacity: opacity,
                x: this.startX,
                y: this.startY,
                width: width,
                height: height
            };
            
            switch (this.currentTool) {
                case 'rectangle':
                    element.type = 'rectangle';
                    element.tool = 'rectangle';
                    element.cornerRadius = cornerRadius;
                    break;
                    
                case 'circle':
                    const ellipseMode = settings.ellipseMode || window.VSSCanvas?.settings?.ellipseMode || 'circle';
                    const aspectRatio = settings.aspectRatio || window.VSSCanvas?.settings?.aspectRatio || 1.0;
                    
                    if (ellipseMode === 'free' && aspectRatio !== 1.0) {
                        element.type = 'ellipse';
                        element.tool = 'circle'; // Keep tool as circle for UI consistency
                        // For ellipses, store radii
                        const baseRadius = Math.sqrt(width * width + height * height);
                        element.x = this.startX; // Center X
                        element.y = this.startY; // Center Y
                        element.radiusX = baseRadius;
                        element.radiusY = baseRadius / aspectRatio;
                        element.aspectRatio = aspectRatio;
                        element.width = baseRadius * 2;
                        element.height = (baseRadius / aspectRatio) * 2;
                    } else {
                        element.type = 'circle';
                        element.tool = 'circle';
                        // For circles, store as radius from center
                        const radius = Math.sqrt(width * width + height * height);
                        element.x = this.startX; // Center X
                        element.y = this.startY; // Center Y
                        element.radius = radius;
                        element.width = radius * 2;
                        element.height = radius * 2;
                    }
                    break;
                    
                case 'line':
                    element.type = 'line';
                    element.tool = 'line';
                    element.startX = this.startX;
                    element.startY = this.startY;
                    element.endX = x;
                    element.endY = y;
                    break;
            }
            
            // Draw the final shape with proper settings
            this.ctx.strokeStyle = strokeColor;
            this.ctx.fillStyle = fillColor;
            this.ctx.lineWidth = strokeWidth;
            this.ctx.globalAlpha = opacity;
            
            // Clear and redraw from preview
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.drawImage(this.previewCanvas, 0, 0);
            
            // Draw final shape
            switch (this.currentTool) {
                case 'rectangle':
                    this.drawRectangleWithFill(this.startX, this.startY, width, height, cornerRadius, fillMode);
                    break;
                    
                case 'circle':
                    const radius = Math.sqrt(width * width + height * height);
                    this.drawCircleWithFill(this.startX, this.startY, radius, fillMode);
                    break;
                    
                case 'line':
                    this.drawLineWithFill(this.startX, this.startY, x, y, fillMode, strokeWidth);
                    break;
            }
            
            this.ctx.globalAlpha = 1.0;
            
            // Add to persistent storage
            const elementId = this.persistentManager.addElement(element);
            console.log(`EnhancedToolManager: Added ${this.currentTool} with ID ${elementId} (fillMode: ${fillMode})`);
            
            // Clean up preview canvas
            this.previewCanvas = null;
            this.previewCtx = null;
        }
        
        /**
         * Start erasing
         * @param {number} x - X coordinate
         * @param {number} y - Y coordinate
         * @private
         */
        startErasing(x, y) {
            // Set up eraser composite operation properly
            this.ctx.save(); // Save current context state
            this.contextSaved = true;
            this.ctx.globalCompositeOperation = 'destination-out';
            this.ctx.globalAlpha = 1.0;
            this.ctx.lineCap = 'round';
            this.ctx.lineJoin = 'round';
            
            const eraserSize = (window.VSSCanvas?.settings?.strokeSize || 5) * 2;
            this.ctx.lineWidth = eraserSize;
            
            // Update drawing state in ToolStateManager
            this.toolStateManager.updateDrawingState({
                contextSaved: true,
                compositeOperation: 'destination-out',
                hasUnsavedChanges: true
            });
            
            // Start eraser path
            this.ctx.beginPath();
            this.ctx.moveTo(x, y);
            
            // Also remove elements from persistent storage for area-based removal
            this.persistentManager.removeElementsInArea(
                x - eraserSize / 2, 
                y - eraserSize / 2, 
                eraserSize, 
                eraserSize
            );
            
            // Store eraser state
            this.eraserActive = true;
            this.eraserSize = eraserSize;
            
            console.log('EnhancedToolManager: Eraser started with destination-out composite operation');
        }
        
        /**
         * Continue erasing
         * @param {number} x - X coordinate
         * @param {number} y - Y coordinate
         * @private
         */
        continueErasing(x, y) {
            if (!this.eraserActive) return;
            
            // Continue eraser path with proper composite operation
            this.ctx.lineTo(x, y);
            this.ctx.stroke();
            
            // Start new path segment for continuous erasing
            this.ctx.beginPath();
            this.ctx.moveTo(x, y);
            
            // Also remove elements from persistent storage for area-based removal
            this.persistentManager.removeElementsInArea(
                x - this.eraserSize / 2, 
                y - this.eraserSize / 2, 
                this.eraserSize, 
                this.eraserSize
            );
        }
        
        /**
         * Finish erasing
         * @private
         */
        finishErasing() {
            if (this.eraserActive) {
                // Finish the eraser stroke
                this.ctx.stroke();
                
                // Restore context state to reset composite operation
                if (this.contextSaved) {
                    this.ctx.restore();
                    this.contextSaved = false;
                }
                
                // Update drawing state in ToolStateManager
                this.toolStateManager.updateDrawingState({
                    contextSaved: false,
                    compositeOperation: 'source-over',
                    hasUnsavedChanges: false
                });
                
                // Reset eraser state
                this.eraserActive = false;
                this.eraserSize = 0;
                
                // Ensure we're back to normal drawing mode
                this.resetCanvasState();
                
                console.log('EnhancedToolManager: Eraser finished, composite operation reset');
            }
        }
        
        /**
         * Finish any current drawing operation
         * @private
         */
        finishCurrentDrawing() {
            if (this.isDrawing) {
                switch (this.currentTool) {
                    case 'pen':
                        this.finishPenStroke();
                        break;
                    case 'eraser':
                        this.finishErasing();
                        break;
                }
            }
            
            if (this.isDrawingShape) {
                // For shapes, we need coordinates to finish properly
                // Use the last known position or current start position
                this.finishShape(this.startX, this.startY);
            }
        }
        
        /**
         * Clear all drawings
         */
        clearAll() {
            this.persistentManager.clearAll();
            console.log('EnhancedToolManager: All drawings cleared');
        }
        
        /**
         * Get all drawing elements
         * @returns {Array} - Array of drawing elements
         */
        getAllElements() {
            return this.persistentManager.getAllElements();
        }
        
        /**
         * Get element count
         * @returns {number} - Number of elements
         */
        getElementCount() {
            return this.persistentManager.getElementCount();
        }
        
        /**
         * Update tool button states in UI
         * @private
         */
        updateToolButtons() {
            // Update button states
            document.querySelectorAll('.tool-button[data-tool]').forEach(button => {
                button.classList.remove('active');
            });
            
            const activeButton = document.querySelector(`[data-tool="${this.currentTool}"]`);
            if (activeButton) {
                activeButton.classList.add('active');
            }
        }
        
        /**
         * Update cursor based on current tool
         * @private
         */
        updateCursor() {
            if (this.canvas) {
                this.canvas.style.cursor = this.currentTool === 'eraser' ? 'grab' : 'crosshair';
            }
        }
        
        /**
         * Reset canvas state for new tool
         * @private
         */
        resetCanvasState() {
            this.ctx.globalCompositeOperation = 'source-over';
            this.ctx.globalAlpha = 1.0;
            this.ctx.lineCap = 'round';
            this.ctx.lineJoin = 'round';
        }
        
        /**
         * Notify about tool change
         * @param {string} previousTool - Previous tool name
         * @param {string} newTool - New tool name
         * @private
         */
        notifyToolChange(previousTool, newTool) {
            // Update status
            if (window.updateStatus) {
                window.updateStatus(`Selected tool: ${newTool}`);
            }
            
            // Send message to extension if available
            if (window.sendMessage) {
                window.sendMessage({
                    command: 'toolChanged',
                    data: { 
                        previousTool: previousTool,
                        newTool: newTool,
                        elementCount: this.persistentManager.getElementCount()
                    }
                });
            }
        }
        
        /**
         * Get current tool
         * @returns {string} - Current tool name
         */
        getCurrentTool() {
            return this.currentTool;
        }
        
        /**
         * Check if currently drawing
         * @returns {boolean} - True if drawing
         */
        isCurrentlyDrawing() {
            return this.isDrawing || this.isDrawingShape;
        }
        
        /**
         * Get persistent drawing manager
         * @returns {PersistentDrawingManager} - The persistent drawing manager instance
         */
        getPersistentManager() {
            return this.persistentManager;
        }
        
        /**
         * Get tool state manager
         * @returns {ToolStateManager} - The tool state manager instance
         */
        getToolStateManager() {
            return this.toolStateManager;
        }
        
        /**
         * Draw rectangle with fill mode support
         * @param {number} x - X coordinate
         * @param {number} y - Y coordinate
         * @param {number} width - Width
         * @param {number} height - Height
         * @param {number} cornerRadius - Corner radius
         * @param {string} fillMode - Fill mode ('outline', 'filled', 'both')
         * @private
         */
        drawRectangleWithFill(x, y, width, height, cornerRadius, fillMode) {
            if (cornerRadius > 0) {
                this.drawRoundedRect(x, y, width, height, cornerRadius, fillMode);
            } else {
                this.ctx.beginPath();
                this.ctx.rect(x, y, width, height);
                
                if (fillMode === 'filled' || fillMode === 'both') {
                    this.ctx.fill();
                }
                if (fillMode === 'outline' || fillMode === 'both') {
                    this.ctx.stroke();
                }
            }
        }
        
        /**
         * Draw rounded rectangle with fill mode support
         * @param {number} x - X coordinate
         * @param {number} y - Y coordinate
         * @param {number} width - Width
         * @param {number} height - Height
         * @param {number} radius - Corner radius
         * @param {string} fillMode - Fill mode ('outline', 'filled', 'both')
         * @private
         */
        drawRoundedRect(x, y, width, height, radius, fillMode) {
            // Clamp radius to prevent drawing issues
            const maxRadius = Math.min(Math.abs(width) / 2, Math.abs(height) / 2);
            const clampedRadius = Math.min(radius, maxRadius);
            
            this.ctx.beginPath();
            this.ctx.moveTo(x + clampedRadius, y);
            this.ctx.lineTo(x + width - clampedRadius, y);
            this.ctx.quadraticCurveTo(x + width, y, x + width, y + clampedRadius);
            this.ctx.lineTo(x + width, y + height - clampedRadius);
            this.ctx.quadraticCurveTo(x + width, y + height, x + width - clampedRadius, y + height);
            this.ctx.lineTo(x + clampedRadius, y + height);
            this.ctx.quadraticCurveTo(x, y + height, x, y + height - clampedRadius);
            this.ctx.lineTo(x, y + clampedRadius);
            this.ctx.quadraticCurveTo(x, y, x + clampedRadius, y);
            this.ctx.closePath();
            
            if (fillMode === 'filled' || fillMode === 'both') {
                this.ctx.fill();
            }
            if (fillMode === 'outline' || fillMode === 'both') {
                this.ctx.stroke();
            }
        }
        
        /**
         * Draw circle/ellipse with fill mode support
         * @param {number} centerX - Center X coordinate
         * @param {number} centerY - Center Y coordinate
         * @param {number} radius - Base radius
         * @param {string} fillMode - Fill mode ('outline', 'filled', 'both')
         * @private
         */
        drawCircleWithFill(centerX, centerY, radius, fillMode) {
            const ellipseMode = window.VSSCanvas?.settings?.ellipseMode || 'circle';
            const aspectRatio = window.VSSCanvas?.settings?.aspectRatio || 1.0;
            
            this.ctx.beginPath();
            
            if (ellipseMode === 'free' && aspectRatio !== 1.0) {
                // Draw ellipse with aspect ratio
                const radiusX = radius;
                const radiusY = radius / aspectRatio;
                this.ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
            } else {
                // Draw circle
                this.ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
            }
            
            if (fillMode === 'filled' || fillMode === 'both') {
                this.ctx.fill();
            }
            if (fillMode === 'outline' || fillMode === 'both') {
                this.ctx.stroke();
            }
        }
        
        /**
         * Draw line with fill mode support (thick lines can be filled)
         * @param {number} startX - Start X coordinate
         * @param {number} startY - Start Y coordinate
         * @param {number} endX - End X coordinate
         * @param {number} endY - End Y coordinate
         * @param {string} fillMode - Fill mode ('outline', 'filled', 'both')
         * @param {number} strokeWidth - Line width
         * @private
         */
        drawLineWithFill(startX, startY, endX, endY, fillMode, strokeWidth) {
            if (fillMode === 'filled' || fillMode === 'both') {
                // For filled lines, draw as a thick rectangle
                const angle = Math.atan2(endY - startY, endX - startX);
                const length = Math.sqrt((endX - startX) ** 2 + (endY - startY) ** 2);
                
                this.ctx.save();
                this.ctx.translate(startX, startY);
                this.ctx.rotate(angle);
                
                this.ctx.beginPath();
                this.ctx.rect(0, -strokeWidth / 2, length, strokeWidth);
                this.ctx.fill();
                
                this.ctx.restore();
            }
            
            if (fillMode === 'outline' || fillMode === 'both') {
                this.ctx.beginPath();
                this.ctx.moveTo(startX, startY);
                this.ctx.lineTo(endX, endY);
                this.ctx.stroke();
            }
        }
        
        /**
         * Update tool settings from SettingsManager
         * @param {string} toolName - Name of the tool
         * @param {Object} settings - Tool settings object
         */
        updateToolSettings(toolName, settings) {
            console.log(`EnhancedToolManager: Updating settings for ${toolName}:`, settings);
            
            // Store settings for use during drawing operations
            if (!this.toolSettings) {
                this.toolSettings = {};
            }
            this.toolSettings[toolName] = { ...settings };
            
            // If this is the current tool, apply settings immediately
            if (toolName === this.currentTool) {
                this.applyCurrentToolSettings();
            }
        }
        
        /**
         * Apply current tool settings to canvas context
         * @private
         */
        applyCurrentToolSettings() {
            const settings = this.toolSettings?.[this.currentTool];
            if (!settings) return;
            
            switch (this.currentTool) {
                case 'pen':
                    // Pen settings are applied during drawing
                    break;
                    
                case 'rectangle':
                case 'circle':
                case 'line':
                    // Shape settings are applied during shape drawing
                    break;
                    
                case 'eraser':
                    if (settings.size) {
                        this.eraserSize = settings.size;
                    }
                    break;
            }
        }
        
        /**
         * Get current tool settings
         * @param {string} toolName - Optional tool name, defaults to current tool
         * @returns {Object} Tool settings
         */
        getToolSettings(toolName = null) {
            const tool = toolName || this.currentTool;
            return this.toolSettings?.[tool] || {};
        }
    }
    
    // Expose to global scope
    window.EnhancedToolManager = EnhancedToolManager;
    
    console.log('EnhancedToolManager class defined');
    
})(); // End of IIFE