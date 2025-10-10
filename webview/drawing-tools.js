// Professional Drawing Tools Implementation
// IIFE wrapper to prevent global conflicts
(function() {
    'use strict';
    
    // Check if DrawingTools already exists
    if (window.DrawingTools) {
        console.log('DrawingTools already exists, skipping redefinition');
        return;
    }

class DrawingTools {
    constructor(canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.currentTool = 'pen';
        this.tools = {
            pen: new PenTool(ctx),
            rectangle: new RectangleTool(ctx),
            circle: new CircleTool(ctx),
            line: new LineTool(ctx)
        };
    }
    
    setTool(toolName) {
        this.currentTool = toolName;
        return this.tools[toolName];
    }
    
    getCurrentTool() {
        return this.tools[this.currentTool];
    }
    
    setToolProperty(property, value) {
        Object.values(this.tools).forEach(tool => {
            if (tool.setProperty) {
                tool.setProperty(property, value);
            }
        });
    }
}

// Base Tool Class
class BaseTool {
    constructor(ctx) {
        this.ctx = ctx;
        this.size = 5;
        this.color = '#000000';
        this.opacity = 1.0;
        this.pressureSensitive = true;
    }
    
    setProperty(property, value) {
        if (this.hasOwnProperty(property)) {
            this[property] = value;
        }
    }
    
    applyPressure(basePressure, pressure) {
        return this.pressureSensitive ? 
            basePressure * (0.3 + pressure * 0.7) : basePressure;
    }
}



// Pen Tool - Consistent line width, pressure affects opacity only
class PenTool extends BaseTool {
    constructor(ctx) {
        super(ctx);
        this.pressureSensitive = true;
    }
    
    startStroke(x, y, pressure = 0.5) {
        this.ctx.beginPath();
        this.ctx.moveTo(x, y);
        
        this.ctx.lineWidth = this.size;
        this.ctx.globalAlpha = this.applyPressure(this.opacity, pressure);
        this.ctx.strokeStyle = this.color;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
    }
    
    continueStroke(x, y, pressure = 0.5) {
        this.ctx.globalAlpha = this.applyPressure(this.opacity, pressure);
        
        this.ctx.lineTo(x, y);
        this.ctx.stroke();
        this.ctx.beginPath();
        this.ctx.moveTo(x, y);
    }
    
    endStroke() {
        this.ctx.stroke();
        this.ctx.globalAlpha = 1.0;
    }
}

// Rectangle Tool - Drag to draw rectangles
class RectangleTool extends BaseTool {
    constructor(ctx) {
        super(ctx);
        this.pressureSensitive = false;
        this.filled = false;
        this.cornerRadius = 0;
    }
    
    startShape(x, y) {
        this.startX = x;
        this.startY = y;
        this.previewCanvas = document.createElement('canvas');
        this.previewCanvas.width = this.ctx.canvas.width;
        this.previewCanvas.height = this.ctx.canvas.height;
        this.previewCtx = this.previewCanvas.getContext('2d');
        this.previewCtx.drawImage(this.ctx.canvas, 0, 0);
    }
    
    updateShape(x, y) {
        // Restore canvas
        this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
        this.ctx.drawImage(this.previewCanvas, 0, 0);
        
        // Draw preview rectangle
        this.ctx.strokeStyle = this.color;
        this.ctx.lineWidth = this.size;
        this.ctx.globalAlpha = 0.7;
        
        const width = x - this.startX;
        const height = y - this.startY;
        
        if (this.cornerRadius > 0) {
            this.drawRoundedRect(this.startX, this.startY, width, height, this.cornerRadius);
        } else {
            if (this.filled) {
                this.ctx.fillStyle = this.color;
                this.ctx.fillRect(this.startX, this.startY, width, height);
            } else {
                this.ctx.strokeRect(this.startX, this.startY, width, height);
            }
        }
        
        this.ctx.globalAlpha = 1.0;
    }
    
    finishShape(x, y) {
        this.ctx.strokeStyle = this.color;
        this.ctx.lineWidth = this.size;
        this.ctx.globalAlpha = this.opacity;
        
        const width = x - this.startX;
        const height = y - this.startY;
        
        if (this.cornerRadius > 0) {
            this.drawRoundedRect(this.startX, this.startY, width, height, this.cornerRadius);
        } else {
            if (this.filled) {
                this.ctx.fillStyle = this.color;
                this.ctx.fillRect(this.startX, this.startY, width, height);
            } else {
                this.ctx.strokeRect(this.startX, this.startY, width, height);
            }
        }
        
        this.ctx.globalAlpha = 1.0;
    }
    
    drawRoundedRect(x, y, width, height, radius) {
        this.ctx.beginPath();
        this.ctx.moveTo(x + radius, y);
        this.ctx.lineTo(x + width - radius, y);
        this.ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        this.ctx.lineTo(x + width, y + height - radius);
        this.ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        this.ctx.lineTo(x + radius, y + height);
        this.ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        this.ctx.lineTo(x, y + radius);
        this.ctx.quadraticCurveTo(x, y, x + radius, y);
        this.ctx.closePath();
        
        if (this.filled) {
            this.ctx.fill();
        } else {
            this.ctx.stroke();
        }
    }
}

// Circle Tool - Drag to draw circles
class CircleTool extends BaseTool {
    constructor(ctx) {
        super(ctx);
        this.pressureSensitive = false;
        this.filled = false;
    }
    
    startShape(x, y) {
        this.centerX = x;
        this.centerY = y;
        this.previewCanvas = document.createElement('canvas');
        this.previewCanvas.width = this.ctx.canvas.width;
        this.previewCanvas.height = this.ctx.canvas.height;
        this.previewCtx = this.previewCanvas.getContext('2d');
        this.previewCtx.drawImage(this.ctx.canvas, 0, 0);
    }
    
    updateShape(x, y) {
        // Restore canvas
        this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
        this.ctx.drawImage(this.previewCanvas, 0, 0);
        
        // Draw preview circle
        this.ctx.strokeStyle = this.color;
        this.ctx.lineWidth = this.size;
        this.ctx.globalAlpha = 0.7;
        
        const radius = Math.sqrt(
            Math.pow(x - this.centerX, 2) + Math.pow(y - this.centerY, 2)
        );
        
        this.ctx.beginPath();
        this.ctx.arc(this.centerX, this.centerY, radius, 0, 2 * Math.PI);
        
        if (this.filled) {
            this.ctx.fillStyle = this.color;
            this.ctx.fill();
        } else {
            this.ctx.stroke();
        }
        
        this.ctx.globalAlpha = 1.0;
    }
    
    finishShape(x, y) {
        this.ctx.strokeStyle = this.color;
        this.ctx.lineWidth = this.size;
        this.ctx.globalAlpha = this.opacity;
        
        const radius = Math.sqrt(
            Math.pow(x - this.centerX, 2) + Math.pow(y - this.centerY, 2)
        );
        
        this.ctx.beginPath();
        this.ctx.arc(this.centerX, this.centerY, radius, 0, 2 * Math.PI);
        
        if (this.filled) {
            this.ctx.fillStyle = this.color;
            this.ctx.fill();
        } else {
            this.ctx.stroke();
        }
        
        this.ctx.globalAlpha = 1.0;
    }
}

// Line Tool - Drag to draw straight lines
class LineTool extends BaseTool {
    constructor(ctx) {
        super(ctx);
        this.pressureSensitive = false;
        this.dashArray = [];
    }
    
    startShape(x, y) {
        this.startX = x;
        this.startY = y;
        this.previewCanvas = document.createElement('canvas');
        this.previewCanvas.width = this.ctx.canvas.width;
        this.previewCanvas.height = this.ctx.canvas.height;
        this.previewCtx = this.previewCanvas.getContext('2d');
        this.previewCtx.drawImage(this.ctx.canvas, 0, 0);
    }
    
    updateShape(x, y) {
        // Restore canvas
        this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
        this.ctx.drawImage(this.previewCanvas, 0, 0);
        
        // Draw preview line
        this.ctx.strokeStyle = this.color;
        this.ctx.lineWidth = this.size;
        this.ctx.globalAlpha = 0.7;
        this.ctx.setLineDash(this.dashArray);
        
        this.ctx.beginPath();
        this.ctx.moveTo(this.startX, this.startY);
        this.ctx.lineTo(x, y);
        this.ctx.stroke();
        
        this.ctx.globalAlpha = 1.0;
        this.ctx.setLineDash([]);
    }
    
    finishShape(x, y) {
        this.ctx.strokeStyle = this.color;
        this.ctx.lineWidth = this.size;
        this.ctx.globalAlpha = this.opacity;
        this.ctx.setLineDash(this.dashArray);
        
        this.ctx.beginPath();
        this.ctx.moveTo(this.startX, this.startY);
        this.ctx.lineTo(x, y);
        this.ctx.stroke();
        
        this.ctx.globalAlpha = 1.0;
        this.ctx.setLineDash([]);
    }
}

// Expose classes to global scope
window.DrawingTools = DrawingTools;
window.BaseTool = BaseTool;
window.PenTool = PenTool;
window.RectangleTool = RectangleTool;
window.CircleTool = CircleTool;
window.LineTool = LineTool;

})(); // End of IIFE