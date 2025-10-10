/**
 * ToolStateManager - Manages tool state transitions and prevents conflicts
 * 
 * This class handles tool state validation, cleanup, and recovery mechanisms
 * to prevent tool switching conflicts and ensure proper state management.
 * Addresses Requirements 5.1, 5.2, 5.3, 2.3, 2.4
 */

(function() {
    'use strict';
    
    // Check if ToolStateManager already exists
    if (window.ToolStateManager) {
        console.log('ToolStateManager already exists, skipping redefinition');
        return;
    }

    class ToolStateManager {
        constructor(canvas, ctx) {
            this.canvas = canvas;
            this.ctx = ctx;
            
            // Current tool state
            this.currentTool = null;
            this.previousTool = null;
            this.isTransitioning = false;
            
            // Tool state tracking
            this.toolStates = new Map();
            this.validTools = ['pen', 'rectangle', 'circle', 'line', 'eraser'];
            
            // Drawing state tracking
            this.drawingState = {
                isDrawing: false,
                isDrawingShape: false,
                hasUnsavedChanges: false,
                contextSaved: false,
                compositeOperation: 'source-over'
            };
            
            // Recovery mechanisms
            this.recoveryStack = [];
            this.maxRecoveryDepth = 10;
            
            // Initialize tool states
            this.initializeToolStates();
            
            console.log('ToolStateManager initialized');
        }
        
        /**
         * Initialize tool states for all valid tools
         * @private
         */
        initializeToolStates() {
            this.validTools.forEach(tool => {
                this.toolStates.set(tool, {
                    active: false,
                    lastUsed: null,
                    properties: this.getDefaultToolProperties(tool),
                    state: 'ready', // ready, active, transitioning, error
                    errorCount: 0,
                    lastError: null
                });
            });
        }
        
        /**
         * Get default properties for a tool
         * @param {string} tool - Tool name
         * @returns {Object} - Default properties
         * @private
         */
        getDefaultToolProperties(tool) {
            const baseProperties = {
                strokeColor: '#000000',
                strokeWidth: 5,
                opacity: 1.0
            };
            
            switch (tool) {
                case 'pen':
                    return {
                        ...baseProperties,
                        pressureSensitive: true,
                        minPressure: 0.1,
                        maxPressure: 1.0
                    };
                    
                case 'rectangle':
                    return {
                        ...baseProperties,
                        fillMode: 'outline',
                        fillColor: null,
                        cornerRadius: 0
                    };
                    
                case 'circle':
                    return {
                        ...baseProperties,
                        fillMode: 'outline',
                        fillColor: null,
                        radiusX: 0,
                        radiusY: 0
                    };
                    
                case 'line':
                    return {
                        ...baseProperties,
                        dashArray: []
                    };
                    
                case 'eraser':
                    return {
                        size: 10,
                        compositeOperation: 'destination-out'
                    };
                    
                default:
                    return baseProperties;
            }
        }
        
        /**
         * Validate tool transition
         * @param {string} fromTool - Current tool
         * @param {string} toTool - Target tool
         * @returns {Object} - Validation result
         */
        validateToolTransition(fromTool, toTool) {
            const result = {
                valid: true,
                warnings: [],
                errors: [],
                requiresCleanup: false,
                requiresRecovery: false
            };
            
            // Check if tools are valid
            if (fromTool && !this.validTools.includes(fromTool)) {
                result.errors.push(`Invalid source tool: ${fromTool}`);
                result.valid = false;
            }
            
            if (!this.validTools.includes(toTool)) {
                result.errors.push(`Invalid target tool: ${toTool}`);
                result.valid = false;
            }
            
            // Check if already transitioning
            if (this.isTransitioning) {
                result.warnings.push('Tool transition already in progress');
                result.requiresRecovery = true;
            }
            
            // Check drawing state
            if (this.drawingState.isDrawing || this.drawingState.isDrawingShape) {
                result.warnings.push('Drawing operation in progress');
                result.requiresCleanup = true;
            }
            
            // Check for unsaved context state
            if (this.drawingState.contextSaved) {
                result.warnings.push('Canvas context state needs restoration');
                result.requiresCleanup = true;
            }
            
            // Check for non-standard composite operation
            if (this.drawingState.compositeOperation !== 'source-over') {
                result.warnings.push('Non-standard composite operation active');
                result.requiresCleanup = true;
            }
            
            // Tool-specific validations
            if (fromTool === 'eraser') {
                result.requiresCleanup = true;
                result.warnings.push('Eraser tool requires composite operation reset');
            }
            
            // Check tool error state
            const fromToolState = fromTool ? this.toolStates.get(fromTool) : null;
            const toToolState = this.toolStates.get(toTool);
            
            if (fromToolState && fromToolState.state === 'error') {
                result.warnings.push(`Source tool ${fromTool} is in error state`);
                result.requiresRecovery = true;
            }
            
            if (toToolState && toToolState.state === 'error') {
                result.errors.push(`Target tool ${toTool} is in error state`);
                result.valid = false;
            }
            
            return result;
        }
        
        /**
         * Perform tool transition with validation and cleanup
         * @param {string} toTool - Target tool
         * @returns {Promise<boolean>} - Success status
         */
        async transitionToTool(toTool) {
            try {
                console.log(`ToolStateManager: Transitioning from ${this.currentTool} to ${toTool}`);
                
                // Validate transition
                const validation = this.validateToolTransition(this.currentTool, toTool);
                
                if (!validation.valid) {
                    console.error('ToolStateManager: Tool transition validation failed:', validation.errors);
                    return false;
                }
                
                // Log warnings
                if (validation.warnings.length > 0) {
                    console.warn('ToolStateManager: Tool transition warnings:', validation.warnings);
                }
                
                // Set transitioning state
                this.isTransitioning = true;
                
                // Save current state for recovery
                this.saveStateForRecovery();
                
                // Perform cleanup if required
                if (validation.requiresCleanup) {
                    await this.performCleanup();
                }
                
                // Perform recovery if required
                if (validation.requiresRecovery) {
                    await this.performRecovery();
                }
                
                // Deactivate current tool
                if (this.currentTool) {
                    await this.deactivateTool(this.currentTool);
                }
                
                // Activate new tool
                await this.activateTool(toTool);
                
                // Update tool references
                this.previousTool = this.currentTool;
                this.currentTool = toTool;
                
                // Clear transitioning state
                this.isTransitioning = false;
                
                console.log(`ToolStateManager: Successfully transitioned to ${toTool}`);
                return true;
                
            } catch (error) {
                console.error('ToolStateManager: Tool transition failed:', error);
                
                // Attempt recovery
                await this.handleTransitionError(error);
                
                this.isTransitioning = false;
                return false;
            }
        }
        
        /**
         * Deactivate a tool and clean up its state
         * @param {string} tool - Tool to deactivate
         * @returns {Promise<void>}
         * @private
         */
        async deactivateTool(tool) {
            const toolState = this.toolStates.get(tool);
            if (!toolState) return;
            
            try {
                console.log(`ToolStateManager: Deactivating tool ${tool}`);
                
                // Set tool state to transitioning
                toolState.state = 'transitioning';
                
                // Tool-specific deactivation
                switch (tool) {
                    case 'eraser':
                        await this.deactivateEraser();
                        break;
                        
                    case 'pen':
                        await this.deactivatePen();
                        break;
                        
                    case 'rectangle':
                    case 'circle':
                    case 'line':
                        await this.deactivateShape(tool);
                        break;
                }
                
                // Update tool state
                toolState.active = false;
                toolState.state = 'ready';
                toolState.lastUsed = Date.now();
                
            } catch (error) {
                console.error(`ToolStateManager: Error deactivating tool ${tool}:`, error);
                toolState.state = 'error';
                toolState.lastError = error;
                toolState.errorCount++;
                throw error;
            }
        }
        
        /**
         * Activate a tool and set up its state
         * @param {string} tool - Tool to activate
         * @returns {Promise<void>}
         * @private
         */
        async activateTool(tool) {
            const toolState = this.toolStates.get(tool);
            if (!toolState) {
                throw new Error(`Unknown tool: ${tool}`);
            }
            
            try {
                console.log(`ToolStateManager: Activating tool ${tool}`);
                
                // Set tool state to transitioning
                toolState.state = 'transitioning';
                
                // Reset canvas state to defaults
                this.resetCanvasToDefaults();
                
                // Tool-specific activation
                switch (tool) {
                    case 'eraser':
                        await this.activateEraser();
                        break;
                        
                    case 'pen':
                        await this.activatePen();
                        break;
                        
                    case 'rectangle':
                    case 'circle':
                    case 'line':
                        await this.activateShape(tool);
                        break;
                }
                
                // Update tool state
                toolState.active = true;
                toolState.state = 'active';
                toolState.lastUsed = Date.now();
                
            } catch (error) {
                console.error(`ToolStateManager: Error activating tool ${tool}:`, error);
                toolState.state = 'error';
                toolState.lastError = error;
                toolState.errorCount++;
                throw error;
            }
        }
        
        /**
         * Deactivate eraser tool
         * @returns {Promise<void>}
         * @private
         */
        async deactivateEraser() {
            // Restore context if saved
            if (this.drawingState.contextSaved) {
                try {
                    this.ctx.restore();
                    this.drawingState.contextSaved = false;
                } catch (error) {
                    console.warn('ToolStateManager: Error restoring context during eraser deactivation:', error);
                }
            }
            
            // Reset composite operation
            this.ctx.globalCompositeOperation = 'source-over';
            this.drawingState.compositeOperation = 'source-over';
            
            // Reset other properties
            this.ctx.globalAlpha = 1.0;
        }
        
        /**
         * Activate eraser tool
         * @returns {Promise<void>}
         * @private
         */
        async activateEraser() {
            // Set up eraser properties
            const toolState = this.toolStates.get('eraser');
            this.ctx.lineWidth = toolState.properties.size;
            this.ctx.lineCap = 'round';
            this.ctx.lineJoin = 'round';
            
            // Note: We don't set composite operation here, it's set when drawing starts
        }
        
        /**
         * Deactivate pen tool
         * @returns {Promise<void>}
         * @private
         */
        async deactivatePen() {
            // Finish any ongoing stroke
            if (this.drawingState.isDrawing) {
                this.ctx.stroke();
                this.drawingState.isDrawing = false;
            }
        }
        
        /**
         * Activate pen tool
         * @returns {Promise<void>}
         * @private
         */
        async activatePen() {
            const toolState = this.toolStates.get('pen');
            this.ctx.strokeStyle = toolState.properties.strokeColor;
            this.ctx.lineWidth = toolState.properties.strokeWidth;
            this.ctx.globalAlpha = toolState.properties.opacity;
            this.ctx.lineCap = 'round';
            this.ctx.lineJoin = 'round';
        }
        
        /**
         * Deactivate shape tool
         * @param {string} tool - Shape tool name
         * @returns {Promise<void>}
         * @private
         */
        async deactivateShape(tool) {
            // Finish any ongoing shape drawing
            if (this.drawingState.isDrawingShape) {
                // Cancel the shape drawing
                this.drawingState.isDrawingShape = false;
            }
        }
        
        /**
         * Activate shape tool
         * @param {string} tool - Shape tool name
         * @returns {Promise<void>}
         * @private
         */
        async activateShape(tool) {
            const toolState = this.toolStates.get(tool);
            this.ctx.strokeStyle = toolState.properties.strokeColor;
            this.ctx.lineWidth = toolState.properties.strokeWidth;
            this.ctx.globalAlpha = toolState.properties.opacity;
            this.ctx.lineCap = 'round';
            this.ctx.lineJoin = 'round';
        }
        
        /**
         * Perform cleanup operations
         * @returns {Promise<void>}
         * @private
         */
        async performCleanup() {
            console.log('ToolStateManager: Performing cleanup');
            
            // Finish any ongoing drawing operations
            if (this.drawingState.isDrawing) {
                this.ctx.stroke();
                this.drawingState.isDrawing = false;
            }
            
            if (this.drawingState.isDrawingShape) {
                this.drawingState.isDrawingShape = false;
            }
            
            // Restore context if saved
            if (this.drawingState.contextSaved) {
                try {
                    this.ctx.restore();
                    this.drawingState.contextSaved = false;
                } catch (error) {
                    console.warn('ToolStateManager: Error restoring context during cleanup:', error);
                }
            }
            
            // Reset canvas state
            this.resetCanvasToDefaults();
        }
        
        /**
         * Perform recovery operations
         * @returns {Promise<void>}
         * @private
         */
        async performRecovery() {
            console.log('ToolStateManager: Performing recovery');
            
            // Reset transitioning state if stuck
            if (this.isTransitioning) {
                console.warn('ToolStateManager: Clearing stuck transition state');
                this.isTransitioning = false;
            }
            
            // Reset tool states that are in error
            this.toolStates.forEach((state, tool) => {
                if (state.state === 'error' || state.state === 'transitioning') {
                    console.log(`ToolStateManager: Recovering tool ${tool} from ${state.state} state`);
                    state.state = 'ready';
                    state.active = false;
                }
            });
            
            // Force canvas reset
            this.resetCanvasToDefaults();
        }
        
        /**
         * Reset canvas to default state
         * @private
         */
        resetCanvasToDefaults() {
            this.ctx.globalCompositeOperation = 'source-over';
            this.ctx.globalAlpha = 1.0;
            this.ctx.lineCap = 'round';
            this.ctx.lineJoin = 'round';
            this.ctx.strokeStyle = '#000000';
            this.ctx.lineWidth = 5;
            
            // Update drawing state
            this.drawingState.compositeOperation = 'source-over';
            this.drawingState.contextSaved = false;
        }
        
        /**
         * Save current state for recovery
         * @private
         */
        saveStateForRecovery() {
            const recoveryState = {
                timestamp: Date.now(),
                currentTool: this.currentTool,
                drawingState: { ...this.drawingState },
                canvasState: {
                    globalCompositeOperation: this.ctx.globalCompositeOperation,
                    globalAlpha: this.ctx.globalAlpha,
                    strokeStyle: this.ctx.strokeStyle,
                    lineWidth: this.ctx.lineWidth,
                    lineCap: this.ctx.lineCap,
                    lineJoin: this.ctx.lineJoin
                }
            };
            
            this.recoveryStack.push(recoveryState);
            
            // Limit recovery stack size
            if (this.recoveryStack.length > this.maxRecoveryDepth) {
                this.recoveryStack.shift();
            }
        }
        
        /**
         * Handle transition error
         * @param {Error} error - The error that occurred
         * @returns {Promise<void>}
         * @private
         */
        async handleTransitionError(error) {
            console.error('ToolStateManager: Handling transition error:', error);
            
            // Try to recover from the last known good state
            if (this.recoveryStack.length > 0) {
                const lastGoodState = this.recoveryStack[this.recoveryStack.length - 1];
                
                try {
                    // Restore canvas state
                    Object.assign(this.ctx, lastGoodState.canvasState);
                    this.drawingState = { ...lastGoodState.drawingState };
                    
                    console.log('ToolStateManager: Recovered from last known good state');
                } catch (recoveryError) {
                    console.error('ToolStateManager: Recovery failed:', recoveryError);
                    
                    // Force reset as last resort
                    await this.performRecovery();
                }
            } else {
                // No recovery state available, force reset
                await this.performRecovery();
            }
        }
        
        /**
         * Get current tool
         * @returns {string|null} - Current tool name
         */
        getCurrentTool() {
            return this.currentTool;
        }
        
        /**
         * Get tool state
         * @param {string} tool - Tool name
         * @returns {Object|null} - Tool state
         */
        getToolState(tool) {
            return this.toolStates.get(tool) || null;
        }
        
        /**
         * Update drawing state
         * @param {Object} state - State updates
         */
        updateDrawingState(state) {
            Object.assign(this.drawingState, state);
        }
        
        /**
         * Check if tool is valid
         * @param {string} tool - Tool name
         * @returns {boolean} - Validity status
         */
        isValidTool(tool) {
            return this.validTools.includes(tool);
        }
        
        /**
         * Get tool statistics
         * @returns {Object} - Tool usage statistics
         */
        getToolStatistics() {
            const stats = {
                currentTool: this.currentTool,
                previousTool: this.previousTool,
                isTransitioning: this.isTransitioning,
                recoveryStackSize: this.recoveryStack.length,
                toolStates: {}
            };
            
            this.toolStates.forEach((state, tool) => {
                stats.toolStates[tool] = {
                    active: state.active,
                    state: state.state,
                    errorCount: state.errorCount,
                    lastUsed: state.lastUsed
                };
            });
            
            return stats;
        }
    }
    
    // Expose to global scope
    window.ToolStateManager = ToolStateManager;
    
    console.log('ToolStateManager class defined');
    
})(); // End of IIFE