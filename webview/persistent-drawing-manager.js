/**
 * PersistentDrawingManager - Manages drawing state persistence across tool switches
 * 
 * This class stores and manages all drawn elements to ensure drawings persist
 * when switching between tools, addressing Requirements 4.1, 4.2, 4.3, 4.4
 */

(function() {
    'use strict';
    
    // Check if PersistentDrawingManager already exists
    if (window.PersistentDrawingManager) {
        console.log('PersistentDrawingManager already exists, skipping redefinition');
        return;
    }

    class PersistentDrawingManager {
        constructor(canvas, ctx) {
            this.canvas = canvas;
            this.ctx = ctx;
            this.elements = [];
            this.nextId = 1;
            
            console.log('PersistentDrawingManager initialized');
        }
        
        /**
         * Add a drawing element to persistent storage
         * @param {Object} element - Drawing element with properties
         * @returns {string} - Unique ID of the added element
         */
        addElement(element) {
            // Generate unique ID and timestamp
            const id = `element_${this.nextId++}_${Date.now()}`;
            const timestamp = Date.now();
            
            // Create complete element object
            const completeElement = {
                id: id,
                timestamp: timestamp,
                type: element.type || 'unknown',
                tool: element.tool || 'pen',
                properties: {
                    // Common properties
                    strokeColor: element.strokeColor || '#000000',
                    strokeWidth: element.strokeWidth || 5,
                    fillColor: element.fillColor || null,
                    fillMode: element.fillMode || 'outline',
                    opacity: element.opacity || 1.0,
                    
                    // Position and dimensions
                    x: element.x || 0,
                    y: element.y || 0,
                    width: element.width || 0,
                    height: element.height || 0,
                    
                    // Shape-specific properties
                    cornerRadius: element.cornerRadius || 0, // rectangles
                    radius: element.radius || 0, // circles
                    radiusX: element.radiusX || 0, // ellipses
                    radiusY: element.radiusY || 0, // ellipses
                    aspectRatio: element.aspectRatio || 1.0, // ellipses
                    startX: element.startX || 0, // lines
                    startY: element.startY || 0, // lines
                    endX: element.endX || 0, // lines
                    endY: element.endY || 0, // lines
                    
                    // Pen-specific properties
                    points: element.points || [], // pen strokes
                    
                    // Pressure sensitivity
                    pressureSensitive: element.pressureSensitive || false,
                    minPressure: element.minPressure || 0.1,
                    maxPressure: element.maxPressure || 1.0,
                    
                    // Copy any additional properties
                    ...element.additionalProperties
                }
            };
            
            // Store the element
            this.elements.push(completeElement);
            
            console.log(`PersistentDrawingManager: Added element ${id} of type ${completeElement.type}`);
            return id;
        }
        
        /**
         * Get all stored drawing elements
         * @returns {Array} - Array of all drawing elements
         */
        getAllElements() {
            return [...this.elements]; // Return a copy to prevent external modification
        }
        
        /**
         * Clear all stored drawing elements
         */
        clearAll() {
            const elementCount = this.elements.length;
            this.elements = [];
            this.nextId = 1;
            
            // Clear the canvas
            if (this.ctx && this.canvas) {
                this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            }
            
            console.log(`PersistentDrawingManager: Cleared ${elementCount} elements`);
        }
        
        /**
         * Redraw all stored elements on the canvas
         */
        redrawAll() {
            if (!this.ctx || !this.canvas) {
                console.warn('PersistentDrawingManager: Cannot redraw - canvas or context not available');
                return;
            }
            
            // Clear canvas first
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            
            // Save current context state
            this.ctx.save();
            
            // Redraw each element in order
            this.elements.forEach(element => {
                this.drawElement(element);
            });
            
            // Restore context state
            this.ctx.restore();
            
            console.log(`PersistentDrawingManager: Redrawn ${this.elements.length} elements`);
        }
        
        /**
         * Remove elements in a specific area (for eraser functionality)
         * @param {number} x - X coordinate of area
         * @param {number} y - Y coordinate of area
         * @param {number} width - Width of area
         * @param {number} height - Height of area
         * @returns {number} - Number of elements removed
         */
        removeElementsInArea(x, y, width, height) {
            const initialCount = this.elements.length;
            
            // Filter out elements that intersect with the eraser area
            this.elements = this.elements.filter(element => {
                return !this.elementIntersectsArea(element, x, y, width, height);
            });
            
            const removedCount = initialCount - this.elements.length;
            
            if (removedCount > 0) {
                // Redraw remaining elements
                this.redrawAll();
                console.log(`PersistentDrawingManager: Removed ${removedCount} elements in eraser area`);
            }
            
            return removedCount;
        }
        
        /**
         * Get element by ID
         * @param {string} id - Element ID
         * @returns {Object|null} - Element or null if not found
         */
        getElementById(id) {
            return this.elements.find(element => element.id === id) || null;
        }
        
        /**
         * Remove element by ID
         * @param {string} id - Element ID
         * @returns {boolean} - True if element was removed
         */
        removeElementById(id) {
            const initialCount = this.elements.length;
            this.elements = this.elements.filter(element => element.id !== id);
            
            const removed = this.elements.length < initialCount;
            if (removed) {
                this.redrawAll();
                console.log(`PersistentDrawingManager: Removed element ${id}`);
            }
            
            return removed;
        }
        
        /**
         * Get elements by type
         * @param {string} type - Element type
         * @returns {Array} - Array of elements of the specified type
         */
        getElementsByType(type) {
            return this.elements.filter(element => element.type === type);
        }
        
        /**
         * Get total number of stored elements
         * @returns {number} - Number of elements
         */
        getElementCount() {
            return this.elements.length;
        }
        
        /**
         * Draw a single element on the canvas
         * @param {Object} element - Element to draw
         * @private
         */
        drawElement(element) {
            const props = element.properties;
            
            // Set common properties
            this.ctx.strokeStyle = props.strokeColor;
            this.ctx.lineWidth = props.strokeWidth;
            this.ctx.globalAlpha = props.opacity;
            this.ctx.lineCap = 'round';
            this.ctx.lineJoin = 'round';
            
            // Draw based on element type
            switch (element.type) {
                case 'pen':
                case 'freehand':
                    this.drawPenElement(element);
                    break;
                    
                case 'rectangle':
                    this.drawRectangleElement(element);
                    break;
                    
                case 'circle':
                    this.drawCircleElement(element);
                    break;
                    
                case 'ellipse':
                    this.drawEllipseElement(element);
                    break;
                    
                case 'line':
                    this.drawLineElement(element);
                    break;
                    
                default:
                    console.warn(`PersistentDrawingManager: Unknown element type: ${element.type}`);
            }
            
            // Reset alpha
            this.ctx.globalAlpha = 1.0;
        }
        
        /**
         * Draw a pen/freehand element
         * @param {Object} element - Pen element
         * @private
         */
        drawPenElement(element) {
            const points = element.properties.points;
            if (!points || points.length < 2) return;
            
            this.ctx.beginPath();
            this.ctx.moveTo(points[0].x, points[0].y);
            
            for (let i = 1; i < points.length; i++) {
                this.ctx.lineTo(points[i].x, points[i].y);
            }
            
            this.ctx.stroke();
        }
        
        /**
         * Draw a rectangle element
         * @param {Object} element - Rectangle element
         * @private
         */
        drawRectangleElement(element) {
            const props = element.properties;
            
            if (props.cornerRadius > 0) {
                this.drawRoundedRect(props.x, props.y, props.width, props.height, props.cornerRadius, props.fillMode, props.fillColor);
            } else {
                if (props.fillMode === 'filled' || props.fillMode === 'both') {
                    this.ctx.fillStyle = props.fillColor || props.strokeColor;
                    this.ctx.fillRect(props.x, props.y, props.width, props.height);
                }
                
                if (props.fillMode === 'outline' || props.fillMode === 'both') {
                    this.ctx.strokeRect(props.x, props.y, props.width, props.height);
                }
            }
        }
        
        /**
         * Draw a circle element
         * @param {Object} element - Circle element
         * @private
         */
        drawCircleElement(element) {
            const props = element.properties;
            
            this.ctx.beginPath();
            
            if (props.radius) {
                // Circle with explicit radius (stored from EnhancedToolManager)
                this.ctx.arc(props.x, props.y, props.radius, 0, 2 * Math.PI);
            } else {
                // Circle - calculate radius from width/height
                const radius = Math.max(props.width, props.height) / 2;
                this.ctx.arc(props.x + props.width / 2, props.y + props.height / 2, radius, 0, 2 * Math.PI);
            }
            
            if (props.fillMode === 'filled' || props.fillMode === 'both') {
                this.ctx.fillStyle = props.fillColor || props.strokeColor;
                this.ctx.fill();
            }
            
            if (props.fillMode === 'outline' || props.fillMode === 'both') {
                this.ctx.stroke();
            }
        }
        
        /**
         * Draw an ellipse element
         * @param {Object} element - Ellipse element
         * @private
         */
        drawEllipseElement(element) {
            const props = element.properties;
            
            this.ctx.beginPath();
            
            if (props.radiusX && props.radiusY) {
                // Ellipse with explicit radii
                this.ctx.ellipse(props.x, props.y, props.radiusX, props.radiusY, 0, 0, 2 * Math.PI);
            } else {
                // Fallback to circle if radii not available
                const radius = Math.max(props.width, props.height) / 2;
                this.ctx.arc(props.x + props.width / 2, props.y + props.height / 2, radius, 0, 2 * Math.PI);
            }
            
            if (props.fillMode === 'filled' || props.fillMode === 'both') {
                this.ctx.fillStyle = props.fillColor || props.strokeColor;
                this.ctx.fill();
            }
            
            if (props.fillMode === 'outline' || props.fillMode === 'both') {
                this.ctx.stroke();
            }
        }
        
        /**
         * Draw a line element
         * @param {Object} element - Line element
         * @private
         */
        drawLineElement(element) {
            const props = element.properties;
            
            if (props.fillMode === 'filled' || props.fillMode === 'both') {
                // For filled lines, draw as a thick rectangle
                const angle = Math.atan2(props.endY - props.startY, props.endX - props.startX);
                const length = Math.sqrt((props.endX - props.startX) ** 2 + (props.endY - props.startY) ** 2);
                
                this.ctx.save();
                this.ctx.translate(props.startX, props.startY);
                this.ctx.rotate(angle);
                
                this.ctx.fillStyle = props.fillColor || props.strokeColor;
                this.ctx.beginPath();
                this.ctx.rect(0, -props.strokeWidth / 2, length, props.strokeWidth);
                this.ctx.fill();
                
                this.ctx.restore();
            }
            
            if (props.fillMode === 'outline' || props.fillMode === 'both') {
                this.ctx.beginPath();
                this.ctx.moveTo(props.startX, props.startY);
                this.ctx.lineTo(props.endX, props.endY);
                this.ctx.stroke();
            }
        }
        
        /**
         * Draw rounded rectangle
         * @param {number} x - X coordinate
         * @param {number} y - Y coordinate
         * @param {number} width - Width
         * @param {number} height - Height
         * @param {number} radius - Corner radius
         * @param {string} fillMode - Fill mode
         * @private
         */
        drawRoundedRect(x, y, width, height, radius, fillMode, fillColor) {
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
                this.ctx.fillStyle = fillColor || this.ctx.strokeStyle;
                this.ctx.fill();
            }
            
            if (fillMode === 'outline' || fillMode === 'both') {
                this.ctx.stroke();
            }
        }
        
        /**
         * Check if an element intersects with a given area
         * @param {Object} element - Element to check
         * @param {number} x - Area X coordinate
         * @param {number} y - Area Y coordinate
         * @param {number} width - Area width
         * @param {number} height - Area height
         * @returns {boolean} - True if element intersects area
         * @private
         */
        elementIntersectsArea(element, x, y, width, height) {
            const props = element.properties;
            
            switch (element.type) {
                case 'pen':
                case 'freehand':
                    // Check if any point in the pen stroke intersects the area
                    return props.points && props.points.some(point => 
                        point.x >= x && point.x <= x + width &&
                        point.y >= y && point.y <= y + height
                    );
                    
                case 'rectangle':
                    // Check rectangle intersection
                    return !(props.x > x + width || 
                            props.x + props.width < x || 
                            props.y > y + height || 
                            props.y + props.height < y);
                    
                case 'circle':
                case 'ellipse':
                    // Simple bounding box check for circles/ellipses
                    const centerX = props.x + props.width / 2;
                    const centerY = props.y + props.height / 2;
                    const radius = Math.max(props.width, props.height) / 2;
                    
                    return (centerX + radius >= x && centerX - radius <= x + width &&
                            centerY + radius >= y && centerY - radius <= y + height);
                    
                case 'line':
                    // Check if line intersects the area (simplified)
                    return this.lineIntersectsRect(props.startX, props.startY, props.endX, props.endY, x, y, width, height);
                    
                default:
                    return false;
            }
        }
        
        /**
         * Check if a line intersects with a rectangle
         * @param {number} x1 - Line start X
         * @param {number} y1 - Line start Y
         * @param {number} x2 - Line end X
         * @param {number} y2 - Line end Y
         * @param {number} rx - Rectangle X
         * @param {number} ry - Rectangle Y
         * @param {number} rw - Rectangle width
         * @param {number} rh - Rectangle height
         * @returns {boolean} - True if line intersects rectangle
         * @private
         */
        lineIntersectsRect(x1, y1, x2, y2, rx, ry, rw, rh) {
            // Check if either endpoint is inside the rectangle
            if ((x1 >= rx && x1 <= rx + rw && y1 >= ry && y1 <= ry + rh) ||
                (x2 >= rx && x2 <= rx + rw && y2 >= ry && y2 <= ry + rh)) {
                return true;
            }
            
            // Check if line intersects any of the rectangle's edges
            return this.lineIntersectsLine(x1, y1, x2, y2, rx, ry, rx + rw, ry) || // top edge
                   this.lineIntersectsLine(x1, y1, x2, y2, rx + rw, ry, rx + rw, ry + rh) || // right edge
                   this.lineIntersectsLine(x1, y1, x2, y2, rx + rw, ry + rh, rx, ry + rh) || // bottom edge
                   this.lineIntersectsLine(x1, y1, x2, y2, rx, ry + rh, rx, ry); // left edge
        }
        
        /**
         * Check if two lines intersect
         * @param {number} x1 - Line 1 start X
         * @param {number} y1 - Line 1 start Y
         * @param {number} x2 - Line 1 end X
         * @param {number} y2 - Line 1 end Y
         * @param {number} x3 - Line 2 start X
         * @param {number} y3 - Line 2 start Y
         * @param {number} x4 - Line 2 end X
         * @param {number} y4 - Line 2 end Y
         * @returns {boolean} - True if lines intersect
         * @private
         */
        lineIntersectsLine(x1, y1, x2, y2, x3, y3, x4, y4) {
            const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
            if (denom === 0) return false; // Lines are parallel
            
            const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
            const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;
            
            return t >= 0 && t <= 1 && u >= 0 && u <= 1;
        }
    }
    
    // Expose to global scope
    window.PersistentDrawingManager = PersistentDrawingManager;
    
    console.log('PersistentDrawingManager class defined');
    
})(); // End of IIFE