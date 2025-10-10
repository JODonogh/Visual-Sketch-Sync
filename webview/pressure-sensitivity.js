/**
 * Pressure Sensitivity Manager - Enhanced pressure detection and handling
 * 
 * This module implements proper pressure detection for stylus/touch devices
 * and pressure simulation for mouse input based on drawing speed.
 * 
 * Requirements: 6.1, 6.2, 6.3, 6.4
 */

(function() {
    'use strict';
    
    // Check if PressureSensitivityManager already exists
    if (window.PressureSensitivityManager) {
        console.log('PressureSensitivityManager already exists, skipping redefinition');
        return;
    }

    class PressureSensitivityManager {
        constructor() {
            this.enabled = true;
            this.minPressure = 0.1;
            this.maxPressure = 1.0;
            this.pressureRange = this.maxPressure - this.minPressure;
            
            // Mouse pressure simulation based on drawing speed
            this.mouseSpeedPressure = true;
            this.lastMouseTime = 0;
            this.lastMouseX = 0;
            this.lastMouseY = 0;
            this.mouseSpeed = 0;
            this.maxMouseSpeed = 50; // pixels per frame for maximum pressure
            this.minMouseSpeed = 5;  // pixels per frame for minimum pressure
            
            // Pressure smoothing
            this.pressureHistory = [];
            this.pressureHistorySize = 3;
            this.smoothingEnabled = true;
            
            // Device detection
            this.hasPointerEvents = 'PointerEvent' in window;
            this.hasTouchEvents = 'TouchEvent' in window;
            this.isStylus = false;
            this.isMouse = false;
            this.isTouch = false;
            
            // Real-time feedback
            this.feedbackEnabled = true;
            this.currentPressure = 0.5;
            
            console.log('PressureSensitivityManager initialized');
            console.log(`Pointer Events: ${this.hasPointerEvents}, Touch Events: ${this.hasTouchEvents}`);
        }
        
        /**
         * Get pressure from event with proper device detection
         * @param {Event} event - The input event
         * @returns {number} - Pressure value between 0 and 1
         */
        getPressureFromEvent(event) {
            let rawPressure = 0.5; // Default pressure
            let deviceType = 'mouse';
            
            // Try to get pressure from pointer event (best for stylus/tablet)
            if (this.hasPointerEvents && event.pressure !== undefined) {
                rawPressure = event.pressure;
                deviceType = this.getPointerType(event);
                
                // Some devices report 0 pressure for hover, use 0.1 as minimum
                if (rawPressure === 0 && event.pointerType === 'pen') {
                    rawPressure = 0.1;
                }
            }
            // Try to get pressure from touch event (iOS/Android)
            else if (this.hasTouchEvents && event.touches && event.touches[0]) {
                const touch = event.touches[0];
                if (touch.force !== undefined) {
                    rawPressure = touch.force;
                    deviceType = 'touch';
                } else {
                    // Fallback for touch devices without force
                    rawPressure = 0.7; // Slightly higher than mouse default
                    deviceType = 'touch';
                }
            }
            // Mouse input - simulate pressure based on drawing speed
            else {
                rawPressure = this.getMousePressureFromSpeed(event);
                deviceType = 'mouse';
            }
            
            // Update device detection flags
            this.updateDeviceFlags(deviceType);
            
            // Apply pressure sensitivity settings if enabled
            if (!this.enabled) {
                return 0.5; // Fixed pressure when disabled
            }
            
            // Normalize pressure to our range
            let normalizedPressure = this.normalizePressure(rawPressure);
            
            // Apply smoothing if enabled
            if (this.smoothingEnabled) {
                normalizedPressure = this.smoothPressure(normalizedPressure);
            }
            
            // Store current pressure for feedback
            this.currentPressure = normalizedPressure;
            
            // Update real-time feedback
            if (this.feedbackEnabled) {
                this.updatePressureFeedback(normalizedPressure, deviceType);
            }
            
            return normalizedPressure;
        }
        
        /**
         * Get pointer type from pointer event
         * @param {PointerEvent} event - The pointer event
         * @returns {string} - Device type
         * @private
         */
        getPointerType(event) {
            if (event.pointerType) {
                switch (event.pointerType) {
                    case 'pen': return 'stylus';
                    case 'touch': return 'touch';
                    case 'mouse': return 'mouse';
                    default: return 'mouse';
                }
            }
            
            // Fallback detection based on pressure availability
            if (event.pressure !== undefined && event.pressure > 0) {
                return 'stylus';
            }
            
            return 'mouse';
        }
        
        /**
         * Calculate mouse pressure based on drawing speed
         * @param {Event} event - The mouse event
         * @returns {number} - Simulated pressure value
         * @private
         */
        getMousePressureFromSpeed(event) {
            if (!this.mouseSpeedPressure) {
                return 0.5; // Fixed pressure when speed simulation is disabled
            }
            
            const currentTime = performance.now();
            const currentX = event.clientX || 0;
            const currentY = event.clientY || 0;
            
            // Calculate speed if we have previous position
            if (this.lastMouseTime > 0) {
                const deltaTime = currentTime - this.lastMouseTime;
                const deltaX = currentX - this.lastMouseX;
                const deltaY = currentY - this.lastMouseY;
                const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
                
                // Calculate speed in pixels per millisecond, then convert to pixels per frame (assuming 60fps)
                const speedPerMs = distance / Math.max(deltaTime, 1);
                this.mouseSpeed = speedPerMs * 16.67; // Convert to pixels per frame (1000ms/60fps)
            }
            
            // Update tracking variables
            this.lastMouseTime = currentTime;
            this.lastMouseX = currentX;
            this.lastMouseY = currentY;
            
            // Map speed to pressure (slower = lighter pressure, faster = heavier pressure)
            let pressureFromSpeed;
            if (this.mouseSpeed <= this.minMouseSpeed) {
                pressureFromSpeed = 0.2; // Light pressure for slow movement
            } else if (this.mouseSpeed >= this.maxMouseSpeed) {
                pressureFromSpeed = 1.0; // Full pressure for fast movement
            } else {
                // Linear interpolation between min and max
                const speedRatio = (this.mouseSpeed - this.minMouseSpeed) / (this.maxMouseSpeed - this.minMouseSpeed);
                pressureFromSpeed = 0.2 + (speedRatio * 0.8); // Map to 0.2-1.0 range
            }
            
            return pressureFromSpeed;
        }
        
        /**
         * Normalize pressure to our configured range
         * @param {number} rawPressure - Raw pressure value
         * @returns {number} - Normalized pressure value
         * @private
         */
        normalizePressure(rawPressure) {
            // Clamp to 0-1 range first
            const clampedPressure = Math.max(0, Math.min(1, rawPressure));
            
            // Map to our configured pressure range
            return this.minPressure + (clampedPressure * this.pressureRange);
        }
        
        /**
         * Apply smoothing to pressure values
         * @param {number} pressure - Current pressure value
         * @returns {number} - Smoothed pressure value
         * @private
         */
        smoothPressure(pressure) {
            // Add to history
            this.pressureHistory.push(pressure);
            
            // Keep history size limited
            if (this.pressureHistory.length > this.pressureHistorySize) {
                this.pressureHistory.shift();
            }
            
            // Calculate average of recent pressures
            const sum = this.pressureHistory.reduce((a, b) => a + b, 0);
            return sum / this.pressureHistory.length;
        }
        
        /**
         * Update device detection flags
         * @param {string} deviceType - Detected device type
         * @private
         */
        updateDeviceFlags(deviceType) {
            this.isStylus = (deviceType === 'stylus');
            this.isMouse = (deviceType === 'mouse');
            this.isTouch = (deviceType === 'touch');
        }
        
        /**
         * Update real-time pressure feedback visualization
         * @param {number} pressure - Current pressure value
         * @param {string} deviceType - Device type
         * @private
         */
        updatePressureFeedback(pressure, deviceType) {
            // Update pressure indicator if it exists
            const pressureIndicator = document.getElementById('pressure-indicator');
            if (pressureIndicator) {
                const pressureBar = pressureIndicator.querySelector('.pressure-bar');
                const pressureValue = pressureIndicator.querySelector('.pressure-value');
                const deviceLabel = pressureIndicator.querySelector('.device-label');
                
                if (pressureBar) {
                    pressureBar.style.width = `${pressure * 100}%`;
                    pressureBar.style.backgroundColor = this.getPressureColor(pressure);
                }
                
                if (pressureValue) {
                    pressureValue.textContent = `${Math.round(pressure * 100)}%`;
                }
                
                if (deviceLabel) {
                    deviceLabel.textContent = this.getDeviceLabel(deviceType);
                }
                
                // Show indicator when drawing
                pressureIndicator.classList.add('active');
            }
            
            // Update cursor size based on pressure if enabled
            this.updatePressureCursor(pressure);
        }
        
        /**
         * Get color for pressure visualization
         * @param {number} pressure - Pressure value
         * @returns {string} - CSS color
         * @private
         */
        getPressureColor(pressure) {
            // Green for light pressure, yellow for medium, red for heavy
            if (pressure < 0.3) {
                return '#28a745'; // Green
            } else if (pressure < 0.7) {
                return '#ffc107'; // Yellow
            } else {
                return '#dc3545'; // Red
            }
        }
        
        /**
         * Get device label for display
         * @param {string} deviceType - Device type
         * @returns {string} - Display label
         * @private
         */
        getDeviceLabel(deviceType) {
            switch (deviceType) {
                case 'stylus': return 'Stylus';
                case 'touch': return 'Touch';
                case 'mouse': return 'Mouse (Speed)';
                default: return 'Unknown';
            }
        }
        
        /**
         * Update cursor size based on pressure
         * @param {number} pressure - Pressure value
         * @private
         */
        updatePressureCursor(pressure) {
            const canvas = window.VSSCanvas?.canvas;
            if (!canvas) return;
            
            // Only update cursor for pen tool
            const currentTool = window.VSSCanvas?.currentTool;
            if (currentTool !== 'pen') return;
            
            // Create or update pressure cursor
            let cursor = document.getElementById('pressure-cursor');
            if (!cursor) {
                cursor = document.createElement('div');
                cursor.id = 'pressure-cursor';
                cursor.style.position = 'absolute';
                cursor.style.pointerEvents = 'none';
                cursor.style.borderRadius = '50%';
                cursor.style.border = '2px solid rgba(0, 122, 204, 0.8)';
                cursor.style.backgroundColor = 'rgba(0, 122, 204, 0.1)';
                cursor.style.zIndex = '1000';
                cursor.style.display = 'none';
                document.body.appendChild(cursor);
            }
            
            // Calculate cursor size based on pressure and stroke size
            const baseSize = window.VSSCanvas?.settings?.strokeSize || 5;
            const pressureSize = baseSize * pressure;
            const cursorSize = Math.max(4, pressureSize * 2); // Minimum 4px, scale by 2x
            
            cursor.style.width = `${cursorSize}px`;
            cursor.style.height = `${cursorSize}px`;
        }
        
        /**
         * Hide pressure feedback
         */
        hidePressureFeedback() {
            const pressureIndicator = document.getElementById('pressure-indicator');
            if (pressureIndicator) {
                pressureIndicator.classList.remove('active');
            }
            
            const cursor = document.getElementById('pressure-cursor');
            if (cursor) {
                cursor.style.display = 'none';
            }
        }
        
        /**
         * Show pressure cursor at position
         * @param {number} x - X coordinate
         * @param {number} y - Y coordinate
         */
        showPressureCursor(x, y) {
            const cursor = document.getElementById('pressure-cursor');
            if (cursor) {
                cursor.style.left = `${x - parseInt(cursor.style.width) / 2}px`;
                cursor.style.top = `${y - parseInt(cursor.style.height) / 2}px`;
                cursor.style.display = 'block';
            }
        }
        
        /**
         * Enable or disable pressure sensitivity
         * @param {boolean} enabled - Whether to enable pressure sensitivity
         */
        setEnabled(enabled) {
            this.enabled = enabled;
            console.log(`PressureSensitivityManager: Pressure sensitivity ${enabled ? 'enabled' : 'disabled'}`);
            
            if (!enabled) {
                this.hidePressureFeedback();
            }
        }
        
        /**
         * Set pressure range
         * @param {number} minPressure - Minimum pressure (0-1)
         * @param {number} maxPressure - Maximum pressure (0-1)
         */
        setPressureRange(minPressure, maxPressure) {
            this.minPressure = Math.max(0, Math.min(1, minPressure));
            this.maxPressure = Math.max(this.minPressure, Math.min(1, maxPressure));
            this.pressureRange = this.maxPressure - this.minPressure;
            
            console.log(`PressureSensitivityManager: Pressure range set to ${this.minPressure}-${this.maxPressure}`);
        }
        
        /**
         * Enable or disable mouse speed pressure simulation
         * @param {boolean} enabled - Whether to enable speed simulation
         */
        setMouseSpeedPressure(enabled) {
            this.mouseSpeedPressure = enabled;
            console.log(`PressureSensitivityManager: Mouse speed pressure ${enabled ? 'enabled' : 'disabled'}`);
        }
        
        /**
         * Set mouse speed sensitivity
         * @param {number} minSpeed - Minimum speed for pressure calculation
         * @param {number} maxSpeed - Maximum speed for pressure calculation
         */
        setMouseSpeedSensitivity(minSpeed, maxSpeed) {
            this.minMouseSpeed = Math.max(1, minSpeed);
            this.maxMouseSpeed = Math.max(this.minMouseSpeed, maxSpeed);
            
            console.log(`PressureSensitivityManager: Mouse speed sensitivity set to ${this.minMouseSpeed}-${this.maxMouseSpeed}`);
        }
        
        /**
         * Enable or disable pressure smoothing
         * @param {boolean} enabled - Whether to enable smoothing
         */
        setSmoothing(enabled) {
            this.smoothingEnabled = enabled;
            if (!enabled) {
                this.pressureHistory = [];
            }
            console.log(`PressureSensitivityManager: Pressure smoothing ${enabled ? 'enabled' : 'disabled'}`);
        }
        
        /**
         * Enable or disable real-time feedback
         * @param {boolean} enabled - Whether to enable feedback
         */
        setFeedbackEnabled(enabled) {
            this.feedbackEnabled = enabled;
            if (!enabled) {
                this.hidePressureFeedback();
            }
            console.log(`PressureSensitivityManager: Pressure feedback ${enabled ? 'enabled' : 'disabled'}`);
        }
        
        /**
         * Get current pressure value
         * @returns {number} - Current pressure value
         */
        getCurrentPressure() {
            return this.currentPressure;
        }
        
        /**
         * Get device detection status
         * @returns {Object} - Device detection status
         */
        getDeviceStatus() {
            return {
                hasPointerEvents: this.hasPointerEvents,
                hasTouchEvents: this.hasTouchEvents,
                isStylus: this.isStylus,
                isMouse: this.isMouse,
                isTouch: this.isTouch,
                currentPressure: this.currentPressure
            };
        }
        
        /**
         * Reset pressure tracking state
         */
        reset() {
            this.pressureHistory = [];
            this.lastMouseTime = 0;
            this.lastMouseX = 0;
            this.lastMouseY = 0;
            this.mouseSpeed = 0;
            this.currentPressure = 0.5;
            this.hidePressureFeedback();
        }
    }
    
    // Expose to global scope
    window.PressureSensitivityManager = PressureSensitivityManager;
    
    // Create global instance
    window.pressureSensitivityManager = new PressureSensitivityManager();
    
    // Override the existing getPressureFromEvent function
    window.getPressureFromEvent = function(event) {
        return window.pressureSensitivityManager.getPressureFromEvent(event);
    };
    
    console.log('PressureSensitivityManager loaded and global instance created');
    
})(); // End of IIFE