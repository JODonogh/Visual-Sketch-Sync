/**
 * Tool Integration Script - Integrates EnhancedToolManager with existing VSSCanvas
 * 
 * This script modifies the existing VSSCanvas functionality to use the new
 * EnhancedToolManager and PersistentDrawingManager for proper drawing persistence
 */

(function() {
    'use strict';
    
    // Wait for DOM to be ready and VSSCanvas to be initialized
    function initializeEnhancedTools() {
        console.log('Tool Integration: Starting enhanced tools integration...');
        
        // Check if required components are available
        if (!window.VSSCanvas) {
            console.error('Tool Integration: VSSCanvas not found, retrying in 100ms...');
            setTimeout(initializeEnhancedTools, 100);
            return;
        }
        
        if (!window.PersistentDrawingManager) {
            console.error('Tool Integration: PersistentDrawingManager not found, retrying in 100ms...');
            setTimeout(initializeEnhancedTools, 100);
            return;
        }
        
        if (!window.EnhancedToolManager) {
            console.error('Tool Integration: EnhancedToolManager not found, retrying in 100ms...');
            setTimeout(initializeEnhancedTools, 100);
            return;
        }
        
        if (!window.ToolStateManager) {
            console.error('Tool Integration: ToolStateManager not found, retrying in 100ms...');
            setTimeout(initializeEnhancedTools, 100);
            return;
        }
        
        // Wait for canvas to be initialized
        if (!window.VSSCanvas.canvas || !window.VSSCanvas.ctx) {
            console.log('Tool Integration: Waiting for canvas initialization...');
            setTimeout(initializeEnhancedTools, 100);
            return;
        }
        
        console.log('Tool Integration: All components ready, integrating...');
        
        // Create enhanced tool manager instance
        window.VSSCanvas.enhancedToolManager = new window.EnhancedToolManager(
            window.VSSCanvas.canvas,
            window.VSSCanvas.ctx
        );
        
        // Override existing tool selection function
        const originalSelectTool = window.selectTool;
        window.selectTool = async function(tool) {
            console.log(`Tool Integration: Selecting tool ${tool} via enhanced manager`);
            const success = await window.VSSCanvas.enhancedToolManager.selectTool(tool);
            
            if (success) {
                // Update VSSCanvas current tool for compatibility
                window.VSSCanvas.currentTool = tool;
                
                // Update settings manager to show relevant controls
                if (window.SettingsManager) {
                    window.SettingsManager.switchTool(tool);
                }
                
                // Show/hide pressure indicator based on tool and settings
                if (window.pressureSensitivityManager) {
                    const settings = window.SettingsManager ? window.SettingsManager.getCurrentSettings() : {};
                    const pressureIndicator = document.getElementById('pressure-indicator');
                    if (pressureIndicator) {
                        if (tool === 'pen' && settings.pressureFeedback && settings.pressureSensitive) {
                            pressureIndicator.style.display = 'block';
                        } else {
                            pressureIndicator.style.display = 'none';
                            window.pressureSensitivityManager.hidePressureFeedback();
                        }
                    }
                }
            } else {
                console.error(`Tool Integration: Failed to select tool ${tool}`);
            }
            
            return success;
        };
        
        // Override drawing functions to use enhanced tool manager
        const originalStartDrawing = window.startDrawing;
        window.startDrawing = function(e) {
            const [x, y] = getMousePos(e);
            const pressure = getPressureFromEvent ? getPressureFromEvent(e) : 0.5;
            
            console.log(`Tool Integration: Starting drawing at (${x}, ${y}) with tool ${window.VSSCanvas.currentTool}`);
            window.VSSCanvas.enhancedToolManager.startDrawing(x, y, pressure);
            
            // Show pressure feedback if enabled and using pen tool
            if (window.VSSCanvas.currentTool === 'pen' && window.pressureSensitivityManager) {
                if (window.VSSCanvas.settings.pressureFeedback) {
                    window.pressureSensitivityManager.showPressureCursor(e.clientX, e.clientY);
                }
            }
            
            // Update VSSCanvas state for compatibility
            window.VSSCanvas.isDrawing = true;
            window.VSSCanvas.lastX = x;
            window.VSSCanvas.lastY = y;
            
            // Send message to extension
            if (window.sendMessage) {
                window.sendMessage({
                    command: 'drawingStarted',
                    data: { 
                        tool: window.VSSCanvas.currentTool,
                        x: x, 
                        y: y,
                        pressure: pressure
                    }
                });
            }
        };
        
        const originalDraw = window.draw;
        window.draw = function(e) {
            if (!window.VSSCanvas.isDrawing) return;
            
            const [x, y] = getMousePos(e);
            const pressure = getPressureFromEvent ? getPressureFromEvent(e) : 0.5;
            
            window.VSSCanvas.enhancedToolManager.continueDrawing(x, y, pressure);
            
            // Update pressure cursor position if enabled and using pen tool
            if (window.VSSCanvas.currentTool === 'pen' && window.pressureSensitivityManager) {
                if (window.VSSCanvas.settings.pressureFeedback) {
                    window.pressureSensitivityManager.showPressureCursor(e.clientX, e.clientY);
                }
            }
            
            // Update VSSCanvas state for compatibility
            window.VSSCanvas.lastX = x;
            window.VSSCanvas.lastY = y;
            
            // Send throttled drawing data to extension
            if (Math.random() < 0.1) { // Only send 10% of drawing events to avoid spam
                if (window.sendMessage) {
                    window.sendMessage({
                        command: 'drawing',
                        data: {
                            tool: window.VSSCanvas.currentTool,
                            x: x,
                            y: y,
                            lastX: window.VSSCanvas.lastX,
                            lastY: window.VSSCanvas.lastY
                        }
                    });
                }
            }
        };
        
        const originalStopDrawing = window.stopDrawing;
        window.stopDrawing = function() {
            if (!window.VSSCanvas.isDrawing) return;
            
            const [x, y] = [window.VSSCanvas.lastX || 0, window.VSSCanvas.lastY || 0];
            
            console.log(`Tool Integration: Stopping drawing at (${x}, ${y})`);
            window.VSSCanvas.enhancedToolManager.finishDrawing(x, y);
            
            // Hide pressure feedback
            if (window.pressureSensitivityManager) {
                window.pressureSensitivityManager.hidePressureFeedback();
            }
            
            // Update VSSCanvas state for compatibility
            window.VSSCanvas.isDrawing = false;
            
            // Send message to extension
            if (window.sendMessage) {
                window.sendMessage({
                    command: 'drawingEnded',
                    data: { 
                        tool: window.VSSCanvas.currentTool,
                        elementCount: window.VSSCanvas.enhancedToolManager.getElementCount()
                    }
                });
            }
        };
        
        // Override clear canvas function
        const originalClearCanvas = window.clearCanvas;
        window.clearCanvas = function() {
            console.log('Tool Integration: Clearing canvas via enhanced manager');
            window.VSSCanvas.enhancedToolManager.clearAll();
            
            // Update status
            if (window.updateStatus) {
                window.updateStatus('Canvas cleared');
            }
            
            // Send message to extension
            if (window.sendMessage) {
                window.sendMessage({
                    command: 'canvasCleared',
                    data: {}
                });
            }
        };
        
        // Override redrawElements function to use persistent manager
        if (window.redrawElements) {
            window.redrawElements = function() {
                console.log('Tool Integration: Redrawing elements via persistent manager');
                if (window.VSSCanvas.enhancedToolManager) {
                    window.VSSCanvas.enhancedToolManager.getPersistentManager().redrawAll();
                }
            };
        }
        
        // Add helper functions to VSSCanvas namespace
        window.VSSCanvas.getAllDrawingElements = function() {
            return this.enhancedToolManager ? this.enhancedToolManager.getAllElements() : [];
        };
        
        window.VSSCanvas.getDrawingElementCount = function() {
            return this.enhancedToolManager ? this.enhancedToolManager.getElementCount() : 0;
        };
        
        window.VSSCanvas.redrawAllElements = function() {
            if (this.enhancedToolManager) {
                this.enhancedToolManager.getPersistentManager().redrawAll();
            }
        };
        
        // Ensure existing drawings are preserved when canvas is resized
        const originalResizeCanvas = window.resizeCanvas;
        if (originalResizeCanvas) {
            window.resizeCanvas = function() {
                // Call original resize function
                originalResizeCanvas();
                
                // Redraw all elements after resize
                if (window.VSSCanvas.enhancedToolManager) {
                    setTimeout(() => {
                        window.VSSCanvas.enhancedToolManager.getPersistentManager().redrawAll();
                    }, 10); // Small delay to ensure canvas is properly resized
                }
            };
        }
        
        // Update code generation to use persistent elements
        if (window.generateCode) {
            const originalGenerateCode = window.generateCode;
            window.generateCode = function() {
                console.log('Tool Integration: Generating code with persistent elements');
                
                // Get all elements from persistent manager
                const elements = window.VSSCanvas.enhancedToolManager ? 
                    window.VSSCanvas.enhancedToolManager.getAllElements() : [];
                
                console.log(`Tool Integration: Found ${elements.length} elements for code generation`);
                
                // Update VSSCanvas.drawingElements for compatibility with existing code generation
                window.VSSCanvas.drawingElements = elements;
                
                // Call original function
                originalGenerateCode();
            };
        }
        
        // Initialize pressure sensitivity manager with current settings
        if (window.pressureSensitivityManager) {
            window.pressureSensitivityManager.setEnabled(window.VSSCanvas.settings.pressureSensitivity);
            window.pressureSensitivityManager.setPressureRange(
                window.VSSCanvas.settings.minPressure,
                window.VSSCanvas.settings.maxPressure
            );
            window.pressureSensitivityManager.setMouseSpeedPressure(window.VSSCanvas.settings.mouseSpeedPressure);
            window.pressureSensitivityManager.setFeedbackEnabled(window.VSSCanvas.settings.pressureFeedback);
            
            console.log('Tool Integration: Pressure sensitivity manager initialized with settings');
        }
        
        // Listen for settings changes and update tool manager
        window.addEventListener('settingChanged', function(event) {
            const { tool, key, value, allSettings } = event.detail;
            console.log(`Tool Integration: Setting changed for ${tool}: ${key} = ${value}`);
            
            // Update enhanced tool manager with new settings
            if (window.VSSCanvas.enhancedToolManager) {
                window.VSSCanvas.enhancedToolManager.updateToolSettings(tool, allSettings);
            }
            
            // Update pressure sensitivity manager if relevant
            if (window.pressureSensitivityManager && tool === 'pen') {
                switch (key) {
                    case 'pressureSensitive':
                        window.pressureSensitivityManager.setEnabled(value);
                        break;
                    case 'minPressure':
                    case 'maxPressure':
                        window.pressureSensitivityManager.setPressureRange(
                            allSettings.minPressure, 
                            allSettings.maxPressure
                        );
                        break;
                    case 'mouseSpeedPressure':
                        window.pressureSensitivityManager.setMouseSpeedPressure(value);
                        break;
                    case 'pressureFeedback':
                        window.pressureSensitivityManager.setFeedbackEnabled(value);
                        // Update pressure indicator visibility
                        const pressureIndicator = document.getElementById('pressure-indicator');
                        if (pressureIndicator && window.VSSCanvas.currentTool === 'pen') {
                            if (value && allSettings.pressureSensitive) {
                                pressureIndicator.style.display = 'block';
                            } else {
                                pressureIndicator.style.display = 'none';
                                window.pressureSensitivityManager.hidePressureFeedback();
                            }
                        }
                        break;
                }
            }
        });
        
        // Initialize with pen tool selected
        window.VSSCanvas.enhancedToolManager.selectTool('pen');
        
        console.log('Tool Integration: Enhanced tools integration completed successfully');
        console.log(`Tool Integration: Current tool: ${window.VSSCanvas.enhancedToolManager.getCurrentTool()}`);
        console.log(`Tool Integration: Element count: ${window.VSSCanvas.enhancedToolManager.getElementCount()}`);
        
        // Add mouse move listener for pressure cursor preview
        if (window.VSSCanvas.canvas) {
            window.VSSCanvas.canvas.addEventListener('mousemove', function(e) {
                // Only show cursor preview for pen tool when not drawing
                if (window.VSSCanvas.currentTool === 'pen' && 
                    !window.VSSCanvas.isDrawing && 
                    window.pressureSensitivityManager &&
                    window.VSSCanvas.settings.pressureFeedback &&
                    window.VSSCanvas.settings.pressureSensitivity) {
                    
                    // Get pressure for preview (will be mouse speed simulation or default)
                    const pressure = window.pressureSensitivityManager.getPressureFromEvent(e);
                    window.pressureSensitivityManager.showPressureCursor(e.clientX, e.clientY);
                }
            });
            
            // Hide cursor when mouse leaves canvas
            window.VSSCanvas.canvas.addEventListener('mouseleave', function() {
                if (window.pressureSensitivityManager) {
                    window.pressureSensitivityManager.hidePressureFeedback();
                }
            });
        }
        
        // Mark integration as complete
        window.VSSCanvas.enhancedToolsIntegrated = true;
        
        // Send ready message
        if (window.sendMessage) {
            window.sendMessage({
                command: 'enhancedToolsReady',
                data: {
                    currentTool: window.VSSCanvas.enhancedToolManager.getCurrentTool(),
                    elementCount: window.VSSCanvas.enhancedToolManager.getElementCount()
                }
            });
        }
    }
    
    // Helper function to get mouse position (ensure it exists)
    if (!window.getMousePos) {
        window.getMousePos = function(e) {
            if (!window.VSSCanvas.canvas) return [0, 0];
            
            const rect = window.VSSCanvas.canvas.getBoundingClientRect();
            return [
                e.clientX - rect.left,
                e.clientY - rect.top
            ];
        };
    }
    
    // Helper function to get pressure from event (ensure it exists)
    if (!window.getPressureFromEvent) {
        window.getPressureFromEvent = function(e) {
            // Try to get pressure from pointer event (stylus/tablet)
            if (e.pressure !== undefined) {
                return Math.max(e.pressure, 0.1);
            }
            
            // Try to get pressure from touch event
            if (e.touches && e.touches[0] && e.touches[0].force !== undefined) {
                return Math.max(e.touches[0].force, 0.1);
            }
            
            // Default pressure for mouse
            return 0.5;
        };
    }
    
    // Start integration when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeEnhancedTools);
    } else {
        // DOM is already ready
        initializeEnhancedTools();
    }
    
    console.log('Tool Integration: Integration script loaded');
    
})(); // End of IIFE