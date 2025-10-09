// Canvas State Management and Layer System
// IIFE wrapper to prevent global conflicts
(function() {
    'use strict';
    
    // Check if CanvasStateManager already exists
    if (window.CanvasStateManager) {
        console.log('CanvasStateManager already exists, skipping redefinition');
        return;
    }

class CanvasStateManager {
    constructor(canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.layers = [];
        this.currentLayerId = null;
        this.history = [];
        this.historyIndex = -1;
        this.maxHistorySize = 50;
        this.designData = this.initializeDesignData();
        
        this.createDefaultLayer();
        this.saveState();
    }
    
    initializeDesignData() {
        return {
            canvas: {
                width: this.canvas.width,
                height: this.canvas.height,
                backgroundColor: '#ffffff',
                grid: { size: 8, visible: false }
            },
            layers: [],
            elements: [],
            colorPalette: [],
            designTokens: {
                spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 },
                colors: {},
                typography: {}
            },
            metadata: {
                version: '1.0',
                created: new Date().toISOString(),
                modified: new Date().toISOString()
            }
        };
    }
    
    // Layer Management
    createLayer(name = '', visible = true, locked = false) {
        const layer = {
            id: `layer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: name || `Layer ${this.layers.length + 1}`,
            visible: visible,
            locked: locked,
            opacity: 1.0,
            blendMode: 'normal',
            elements: [],
            created: new Date().toISOString()
        };
        
        this.layers.push(layer);
        this.designData.layers.push(layer);
        
        if (!this.currentLayerId) {
            this.currentLayerId = layer.id;
        }
        
        return layer;
    }
    
    createDefaultLayer() {
        const defaultLayer = this.createLayer('Background', true, false);
        this.currentLayerId = defaultLayer.id;
        return defaultLayer;
    }
    
    deleteLayer(layerId) {
        if (this.layers.length <= 1) {
            console.warn('Cannot delete the last layer');
            return false;
        }
        
        const layerIndex = this.layers.findIndex(layer => layer.id === layerId);
        if (layerIndex === -1) return false;
        
        // Remove layer and its elements
        const layer = this.layers[layerIndex];
        this.layers.splice(layerIndex, 1);
        
        // Remove from design data
        const designLayerIndex = this.designData.layers.findIndex(l => l.id === layerId);
        if (designLayerIndex !== -1) {
            this.designData.layers.splice(designLayerIndex, 1);
        }
        
        // Remove elements belonging to this layer
        this.designData.elements = this.designData.elements.filter(el => el.layerId !== layerId);
        
        // Update current layer if necessary
        if (this.currentLayerId === layerId) {
            this.currentLayerId = this.layers[Math.max(0, layerIndex - 1)].id;
        }
        
        this.redrawCanvas();
        return true;
    }
    
    setLayerVisibility(layerId, visible) {
        const layer = this.layers.find(l => l.id === layerId);
        if (layer) {
            layer.visible = visible;
            const designLayer = this.designData.layers.find(l => l.id === layerId);
            if (designLayer) {
                designLayer.visible = visible;
            }
            this.redrawCanvas();
        }
    }
    
    setLayerLocked(layerId, locked) {
        const layer = this.layers.find(l => l.id === layerId);
        if (layer) {
            layer.locked = locked;
            const designLayer = this.designData.layers.find(l => l.id === layerId);
            if (designLayer) {
                designLayer.locked = locked;
            }
        }
    }
    
    setLayerOpacity(layerId, opacity) {
        const layer = this.layers.find(l => l.id === layerId);
        if (layer) {
            layer.opacity = Math.max(0, Math.min(1, opacity));
            const designLayer = this.designData.layers.find(l => l.id === layerId);
            if (designLayer) {
                designLayer.opacity = layer.opacity;
            }
            this.redrawCanvas();
        }
    }
    
    moveLayer(layerId, direction) {
        const currentIndex = this.layers.findIndex(l => l.id === layerId);
        if (currentIndex === -1) return false;
        
        let newIndex;
        if (direction === 'up' && currentIndex < this.layers.length - 1) {
            newIndex = currentIndex + 1;
        } else if (direction === 'down' && currentIndex > 0) {
            newIndex = currentIndex - 1;
        } else {
            return false;
        }
        
        // Swap layers
        [this.layers[currentIndex], this.layers[newIndex]] = [this.layers[newIndex], this.layers[currentIndex]];
        
        // Update design data
        [this.designData.layers[currentIndex], this.designData.layers[newIndex]] = 
            [this.designData.layers[newIndex], this.designData.layers[currentIndex]];
        
        this.redrawCanvas();
        return true;
    }
    
    getCurrentLayer() {
        return this.layers.find(l => l.id === this.currentLayerId);
    }
    
    setCurrentLayer(layerId) {
        const layer = this.layers.find(l => l.id === layerId);
        if (layer && !layer.locked) {
            this.currentLayerId = layerId;
            return true;
        }
        return false;
    }
    
    // Element Management
    addElement(element) {
        const elementWithId = {
            id: `element_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            layerId: this.currentLayerId,
            created: new Date().toISOString(),
            ...element
        };
        
        this.designData.elements.push(elementWithId);
        
        // Add to current layer
        const currentLayer = this.getCurrentLayer();
        if (currentLayer) {
            currentLayer.elements.push(elementWithId.id);
        }
        
        return elementWithId;
    }
    
    removeElement(elementId) {
        const elementIndex = this.designData.elements.findIndex(el => el.id === elementId);
        if (elementIndex === -1) return false;
        
        const element = this.designData.elements[elementIndex];
        this.designData.elements.splice(elementIndex, 1);
        
        // Remove from layer
        const layer = this.layers.find(l => l.id === element.layerId);
        if (layer) {
            const elIndex = layer.elements.indexOf(elementId);
            if (elIndex !== -1) {
                layer.elements.splice(elIndex, 1);
            }
        }
        
        return true;
    }
    
    updateElement(elementId, updates) {
        const element = this.designData.elements.find(el => el.id === elementId);
        if (element) {
            Object.assign(element, updates, { modified: new Date().toISOString() });
            return element;
        }
        return null;
    }
    
    // History Management (Undo/Redo)
    saveState(description = '') {
        // Remove any states after current index (when undoing then making new changes)
        this.history = this.history.slice(0, this.historyIndex + 1);
        
        // Create state snapshot
        const state = {
            imageData: this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height),
            designData: JSON.parse(JSON.stringify(this.designData)),
            layers: JSON.parse(JSON.stringify(this.layers)),
            currentLayerId: this.currentLayerId,
            timestamp: Date.now(),
            description: description
        };
        
        this.history.push(state);
        this.historyIndex = this.history.length - 1;
        
        // Limit history size
        if (this.history.length > this.maxHistorySize) {
            this.history.shift();
            this.historyIndex--;
        }
        
        this.updateDesignDataTimestamp();
    }
    
    undo() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            this.restoreState(this.history[this.historyIndex]);
            return true;
        }
        return false;
    }
    
    redo() {
        if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            this.restoreState(this.history[this.historyIndex]);
            return true;
        }
        return false;
    }
    
    restoreState(state) {
        // Restore canvas
        this.ctx.putImageData(state.imageData, 0, 0);
        
        // Restore data
        this.designData = JSON.parse(JSON.stringify(state.designData));
        this.layers = JSON.parse(JSON.stringify(state.layers));
        this.currentLayerId = state.currentLayerId;
        
        // Trigger UI updates
        this.onStateRestored();
    }
    
    onStateRestored() {
        // Override this method to handle UI updates when state is restored
        if (this.onStateRestoredCallback) {
            this.onStateRestoredCallback();
        }
    }
    
    canUndo() {
        return this.historyIndex > 0;
    }
    
    canRedo() {
        return this.historyIndex < this.history.length - 1;
    }
    
    // Canvas Rendering
    redrawCanvas() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw background
        this.ctx.fillStyle = this.designData.canvas.backgroundColor;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw layers in order (bottom to top)
        for (const layer of this.layers) {
            if (!layer.visible) continue;
            
            this.ctx.globalAlpha = layer.opacity;
            this.ctx.globalCompositeOperation = layer.blendMode;
            
            // Draw elements in this layer
            const layerElements = this.designData.elements.filter(el => el.layerId === layer.id);
            for (const element of layerElements) {
                this.drawElement(element);
            }
        }
        
        this.ctx.globalAlpha = 1.0;
        this.ctx.globalCompositeOperation = 'source-over';
    }
    
    drawElement(element) {
        switch (element.type) {
            case 'rectangle':
                this.drawRectangle(element);
                break;
            case 'circle':
                this.drawCircle(element);
                break;
            case 'line':
                this.drawLine(element);
                break;
            case 'freehand':
                this.drawFreehand(element);
                break;
        }
    }
    
    drawRectangle(element) {
        this.ctx.strokeStyle = element.style.stroke || '#000000';
        this.ctx.fillStyle = element.style.fill || 'transparent';
        this.ctx.lineWidth = element.style.strokeWidth || 1;
        
        if (element.style.fill && element.style.fill !== 'transparent') {
            this.ctx.fillRect(element.position.x, element.position.y, element.size.width, element.size.height);
        }
        
        if (element.style.stroke) {
            this.ctx.strokeRect(element.position.x, element.position.y, element.size.width, element.size.height);
        }
    }
    
    drawCircle(element) {
        this.ctx.strokeStyle = element.style.stroke || '#000000';
        this.ctx.fillStyle = element.style.fill || 'transparent';
        this.ctx.lineWidth = element.style.strokeWidth || 1;
        
        this.ctx.beginPath();
        this.ctx.arc(element.position.x, element.position.y, element.radius, 0, 2 * Math.PI);
        
        if (element.style.fill && element.style.fill !== 'transparent') {
            this.ctx.fill();
        }
        
        if (element.style.stroke) {
            this.ctx.stroke();
        }
    }
    
    drawLine(element) {
        this.ctx.strokeStyle = element.style.stroke || '#000000';
        this.ctx.lineWidth = element.style.strokeWidth || 1;
        
        this.ctx.beginPath();
        this.ctx.moveTo(element.start.x, element.start.y);
        this.ctx.lineTo(element.end.x, element.end.y);
        this.ctx.stroke();
    }
    
    drawFreehand(element) {
        if (!element.path || element.path.length < 2) return;
        
        this.ctx.strokeStyle = element.style.stroke || '#000000';
        this.ctx.lineWidth = element.style.strokeWidth || 1;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        
        this.ctx.beginPath();
        this.ctx.moveTo(element.path[0].x, element.path[0].y);
        
        for (let i = 1; i < element.path.length; i++) {
            this.ctx.lineTo(element.path[i].x, element.path[i].y);
        }
        
        this.ctx.stroke();
    }
    
    // Design Data Serialization
    exportDesignData() {
        this.updateDesignDataTimestamp();
        return JSON.stringify(this.designData, null, 2);
    }
    
    importDesignData(jsonData) {
        try {
            const data = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
            
            // Validate basic structure
            if (!data.canvas || !data.layers || !data.elements) {
                throw new Error('Invalid design data structure');
            }
            
            this.designData = data;
            this.layers = data.layers || [];
            
            // Set current layer
            if (this.layers.length > 0) {
                this.currentLayerId = this.layers[0].id;
            }
            
            // Update canvas size if needed
            if (data.canvas.width && data.canvas.height) {
                this.canvas.width = data.canvas.width;
                this.canvas.height = data.canvas.height;
            }
            
            this.redrawCanvas();
            this.saveState('Imported design data');
            
            return true;
        } catch (error) {
            console.error('Failed to import design data:', error);
            return false;
        }
    }
    
    updateDesignDataTimestamp() {
        this.designData.metadata.modified = new Date().toISOString();
    }
    
    // Grid and Guides
    setGridVisible(visible) {
        this.designData.canvas.grid.visible = visible;
        this.redrawCanvas();
        if (visible) {
            this.drawGrid();
        }
    }
    
    setGridSize(size) {
        this.designData.canvas.grid.size = Math.max(4, Math.min(64, size));
        if (this.designData.canvas.grid.visible) {
            this.redrawCanvas();
            this.drawGrid();
        }
    }
    
    drawGrid() {
        const gridSize = this.designData.canvas.grid.size;
        
        this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
        this.ctx.lineWidth = 1;
        this.ctx.setLineDash([1, 1]);
        
        // Vertical lines
        for (let x = gridSize; x < this.canvas.width; x += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
            this.ctx.stroke();
        }
        
        // Horizontal lines
        for (let y = gridSize; y < this.canvas.height; y += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
            this.ctx.stroke();
        }
        
        this.ctx.setLineDash([]);
    }
    
    // Utility methods
    clear() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.designData.elements = [];
        this.layers.forEach(layer => {
            layer.elements = [];
        });
        this.saveState('Canvas cleared');
    }
    
    getCanvasDataURL() {
        return this.canvas.toDataURL();
    }
    
    getStats() {
        return {
            layers: this.layers.length,
            elements: this.designData.elements.length,
            historySize: this.history.length,
            canUndo: this.canUndo(),
            canRedo: this.canRedo(),
            currentLayer: this.getCurrentLayer()?.name || 'None'
        };
    }
}

// Expose CanvasStateManager to global scope
window.CanvasStateManager = CanvasStateManager;

})(); // End of IIFE