/**
 * Settings Manager - Handles tool-specific settings persistence and UI updates
 * 
 * This module manages settings for each drawing tool, persists them across tool switches,
 * and provides validation and default value handling.
 * 
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 3.6
 */

(function() {
    'use strict';
    
    // Check if SettingsManager already exists
    if (window.SettingsManager) {
        console.log('SettingsManager already exists, skipping redefinition');
        return;
    }

    class SettingsManager {
        constructor() {
            this.currentTool = 'pen';
            this.initialized = false;
            
            // Default settings for each tool
            this.defaultSettings = {
                pen: {
                    strokeWidth: 5,
                    color: '#000000',
                    opacity: 100,
                    smoothing: 50,
                    pressureSensitive: true,
                    minPressure: 10,
                    maxPressure: 100,
                    mouseSpeedPressure: true,
                    pressureFeedback: true
                },
                rectangle: {
                    strokeWidth: 5,
                    strokeColor: '#000000',
                    fillColor: '#000000',
                    fillMode: 'outline', // 'outline', 'filled', 'both'
                    cornerRadius: 0,
                    opacity: 100
                },
                circle: {
                    strokeWidth: 5,
                    strokeColor: '#000000',
                    fillColor: '#000000',
                    fillMode: 'outline', // 'outline', 'filled', 'both'
                    ellipseMode: 'circle', // 'circle', 'free'
                    aspectRatio: 1.0,
                    opacity: 100
                },
                line: {
                    strokeWidth: 5,
                    color: '#000000',
                    opacity: 100
                },
                eraser: {
                    size: 20
                }
            };
            
            // Current settings (will be loaded from storage or defaults)
            this.settings = JSON.parse(JSON.stringify(this.defaultSettings));
            
            // UI element references
            this.elements = {};
            
            this.init();
        }
        
        init() {
            if (this.initialized) return;
            
            try {
                this.cacheElements();
                this.setupEventListeners();
                this.loadSettings();
                this.updateUI();
                this.initialized = true;
                console.log('SettingsManager initialized successfully');
            } catch (error) {
                console.error('Failed to initialize SettingsManager:', error);
            }
        }
        
        cacheElements() {
            // Basic settings elements
            this.elements.strokeSize = document.getElementById('stroke-size');
            this.elements.strokeSizeValue = document.getElementById('stroke-size-value');
            this.elements.opacity = document.getElementById('opacity');
            this.elements.opacityValue = document.getElementById('opacity-value');
            this.elements.colorPicker = document.getElementById('color-picker');
            this.elements.smoothing = document.getElementById('smoothing');
            this.elements.smoothingValue = document.getElementById('smoothing-value');
            
            // Pressure sensitivity elements
            this.elements.pressureSensitivity = document.getElementById('pressure-sensitivity');
            this.elements.pressureRangeControls = document.getElementById('pressure-range-controls');
            this.elements.minPressure = document.getElementById('min-pressure');
            this.elements.minPressureValue = document.getElementById('min-pressure-value');
            this.elements.maxPressure = document.getElementById('max-pressure');
            this.elements.maxPressureValue = document.getElementById('max-pressure-value');
            this.elements.mouseSpeedPressure = document.getElementById('mouse-speed-pressure');
            this.elements.pressureFeedback = document.getElementById('pressure-feedback');
            
            // Shape-specific elements
            this.elements.shapeFillMode = document.getElementById('shape-fill-mode');
            this.elements.strokeColorSection = document.getElementById('stroke-color-section');
            this.elements.fillColorSection = document.getElementById('fill-color-section');
            this.elements.cornerRadiusSection = document.getElementById('corner-radius-section');
            this.elements.ellipseAspectSection = document.getElementById('ellipse-aspect-section');
            
            // Fill mode buttons
            this.elements.fillOutlineBtn = document.getElementById('fill-outline');
            this.elements.fillFilledBtn = document.getElementById('fill-filled');
            this.elements.fillBothBtn = document.getElementById('fill-both');
            
            // Color pickers
            this.elements.strokeColorPicker = document.getElementById('stroke-color-picker');
            this.elements.fillColorPicker = document.getElementById('fill-color-picker');
            
            // Corner radius
            this.elements.cornerRadius = document.getElementById('corner-radius');
            this.elements.cornerRadiusValue = document.getElementById('corner-radius-value');
            
            // Ellipse controls
            this.elements.ellipseCircleBtn = document.getElementById('ellipse-circle');
            this.elements.ellipseFreeBtn = document.getElementById('ellipse-free');
            this.elements.aspectRatioControls = document.getElementById('aspect-ratio-controls');
            this.elements.aspectRatio = document.getElementById('aspect-ratio');
            this.elements.aspectRatioValue = document.getElementById('aspect-ratio-value');
        }
        
        setupEventListeners() {
            // Basic settings
            if (this.elements.strokeSize) {
                this.elements.strokeSize.addEventListener('input', (e) => {
                    this.updateSetting('strokeWidth', parseInt(e.target.value));
                    this.elements.strokeSizeValue.textContent = e.target.value;
                });
            }
            
            if (this.elements.opacity) {
                this.elements.opacity.addEventListener('input', (e) => {
                    this.updateSetting('opacity', parseInt(e.target.value));
                    this.elements.opacityValue.textContent = e.target.value;
                });
            }
            
            if (this.elements.colorPicker) {
                this.elements.colorPicker.addEventListener('change', (e) => {
                    this.updateSetting('color', e.target.value);
                });
            }
            
            if (this.elements.smoothing) {
                this.elements.smoothing.addEventListener('input', (e) => {
                    this.updateSetting('smoothing', parseInt(e.target.value));
                    this.elements.smoothingValue.textContent = e.target.value;
                });
            }
            
            // Pressure sensitivity
            if (this.elements.pressureSensitivity) {
                this.elements.pressureSensitivity.addEventListener('change', (e) => {
                    this.updateSetting('pressureSensitive', e.target.checked);
                    this.togglePressureControls(e.target.checked);
                });
            }
            
            if (this.elements.minPressure) {
                this.elements.minPressure.addEventListener('input', (e) => {
                    this.updateSetting('minPressure', parseInt(e.target.value));
                    this.elements.minPressureValue.textContent = e.target.value;
                });
            }
            
            if (this.elements.maxPressure) {
                this.elements.maxPressure.addEventListener('input', (e) => {
                    this.updateSetting('maxPressure', parseInt(e.target.value));
                    this.elements.maxPressureValue.textContent = e.target.value;
                });
            }
            
            if (this.elements.mouseSpeedPressure) {
                this.elements.mouseSpeedPressure.addEventListener('change', (e) => {
                    this.updateSetting('mouseSpeedPressure', e.target.checked);
                });
            }
            
            if (this.elements.pressureFeedback) {
                this.elements.pressureFeedback.addEventListener('change', (e) => {
                    this.updateSetting('pressureFeedback', e.target.checked);
                });
            }
            
            // Fill mode buttons
            this.setupFillModeListeners();
            
            // Color pickers for shapes
            if (this.elements.strokeColorPicker) {
                this.elements.strokeColorPicker.addEventListener('change', (e) => {
                    this.updateSetting('strokeColor', e.target.value);
                });
            }
            
            if (this.elements.fillColorPicker) {
                this.elements.fillColorPicker.addEventListener('change', (e) => {
                    this.updateSetting('fillColor', e.target.value);
                });
            }
            
            // Corner radius
            if (this.elements.cornerRadius) {
                this.elements.cornerRadius.addEventListener('input', (e) => {
                    this.updateSetting('cornerRadius', parseInt(e.target.value));
                    this.elements.cornerRadiusValue.textContent = e.target.value;
                });
            }
            
            // Ellipse mode buttons
            this.setupEllipseModeListeners();
            
            // Aspect ratio
            if (this.elements.aspectRatio) {
                this.elements.aspectRatio.addEventListener('input', (e) => {
                    this.updateSetting('aspectRatio', parseFloat(e.target.value));
                    this.elements.aspectRatioValue.textContent = parseFloat(e.target.value).toFixed(1);
                });
            }
            
            // Color preset buttons
            this.setupColorPresets();
        }
        
        setupFillModeListeners() {
            const fillModeButtons = [
                { element: this.elements.fillOutlineBtn, mode: 'outline' },
                { element: this.elements.fillFilledBtn, mode: 'filled' },
                { element: this.elements.fillBothBtn, mode: 'both' }
            ];
            
            fillModeButtons.forEach(({ element, mode }) => {
                if (element) {
                    element.addEventListener('click', () => {
                        this.updateSetting('fillMode', mode);
                        this.updateFillModeButtons(mode);
                        this.updateFillColorVisibility(mode);
                    });
                }
            });
        }
        
        setupEllipseModeListeners() {
            if (this.elements.ellipseCircleBtn) {
                this.elements.ellipseCircleBtn.addEventListener('click', () => {
                    this.updateSetting('ellipseMode', 'circle');
                    this.updateEllipseModeButtons('circle');
                    this.toggleAspectRatioControls(false);
                });
            }
            
            if (this.elements.ellipseFreeBtn) {
                this.elements.ellipseFreeBtn.addEventListener('click', () => {
                    this.updateSetting('ellipseMode', 'free');
                    this.updateEllipseModeButtons('free');
                    this.toggleAspectRatioControls(true);
                });
            }
        }
        
        setupColorPresets() {
            // Regular color presets
            const colorPresets = document.querySelectorAll('.color-preset');
            colorPresets.forEach(preset => {
                preset.addEventListener('click', () => {
                    const color = preset.dataset.color;
                    this.updateSetting('color', color);
                    if (this.elements.colorPicker) {
                        this.elements.colorPicker.value = color;
                    }
                });
            });
            
            // Stroke color presets
            const strokeColorPresets = document.querySelectorAll('.stroke-color-preset');
            strokeColorPresets.forEach(preset => {
                preset.addEventListener('click', () => {
                    const color = preset.dataset.color;
                    this.updateSetting('strokeColor', color);
                    if (this.elements.strokeColorPicker) {
                        this.elements.strokeColorPicker.value = color;
                    }
                });
            });
            
            // Fill color presets
            const fillColorPresets = document.querySelectorAll('.fill-color-preset');
            fillColorPresets.forEach(preset => {
                preset.addEventListener('click', () => {
                    const color = preset.dataset.color;
                    this.updateSetting('fillColor', color);
                    if (this.elements.fillColorPicker) {
                        this.elements.fillColorPicker.value = color;
                    }
                });
            });
        }
        
        updateSetting(key, value) {
            if (this.settings[this.currentTool]) {
                this.settings[this.currentTool][key] = value;
                this.saveSettings();
                
                // Notify other components of setting change
                this.notifySettingChange(key, value);
            }
        }
        
        notifySettingChange(key, value) {
            // Dispatch custom event for other components to listen to
            const event = new CustomEvent('settingChanged', {
                detail: {
                    tool: this.currentTool,
                    key: key,
                    value: value,
                    allSettings: this.getCurrentSettings()
                }
            });
            window.dispatchEvent(event);
        }
        
        switchTool(toolName) {
            if (this.settings[toolName]) {
                this.currentTool = toolName;
                this.updateUI();
                this.showRelevantSettings();
            }
        }
        
        showRelevantSettings() {
            // Hide all shape-specific sections first
            this.hideAllShapeSettings();
            
            // Show relevant sections based on current tool
            switch (this.currentTool) {
                case 'rectangle':
                    this.showElement(this.elements.shapeFillMode);
                    this.showElement(this.elements.strokeColorSection);
                    this.showElement(this.elements.cornerRadiusSection);
                    this.updateFillColorVisibility(this.getCurrentSettings().fillMode);
                    break;
                    
                case 'circle':
                    this.showElement(this.elements.shapeFillMode);
                    this.showElement(this.elements.strokeColorSection);
                    this.showElement(this.elements.ellipseAspectSection);
                    this.updateFillColorVisibility(this.getCurrentSettings().fillMode);
                    this.toggleAspectRatioControls(this.getCurrentSettings().ellipseMode === 'free');
                    break;
                    
                case 'line':
                    // Line tool uses basic color settings only
                    break;
                    
                case 'pen':
                    // Pen tool shows pressure sensitivity controls
                    this.togglePressureControls(this.getCurrentSettings().pressureSensitive);
                    break;
                    
                case 'eraser':
                    // Eraser tool has minimal settings
                    break;
            }
        }
        
        hideAllShapeSettings() {
            this.hideElement(this.elements.shapeFillMode);
            this.hideElement(this.elements.strokeColorSection);
            this.hideElement(this.elements.fillColorSection);
            this.hideElement(this.elements.cornerRadiusSection);
            this.hideElement(this.elements.ellipseAspectSection);
        }
        
        showElement(element) {
            if (element) {
                element.style.display = 'block';
            }
        }
        
        hideElement(element) {
            if (element) {
                element.style.display = 'none';
            }
        }
        
        updateUI() {
            const settings = this.getCurrentSettings();
            
            // Update basic settings
            this.updateBasicSettings(settings);
            
            // Update shape-specific settings
            this.updateShapeSettings(settings);
            
            // Update pressure settings
            this.updatePressureSettings(settings);
        }
        
        updateBasicSettings(settings) {
            if (this.elements.strokeSize && settings.strokeWidth !== undefined) {
                this.elements.strokeSize.value = settings.strokeWidth;
                if (this.elements.strokeSizeValue) {
                    this.elements.strokeSizeValue.textContent = settings.strokeWidth;
                }
            }
            
            if (this.elements.opacity && settings.opacity !== undefined) {
                this.elements.opacity.value = settings.opacity;
                if (this.elements.opacityValue) {
                    this.elements.opacityValue.textContent = settings.opacity;
                }
            }
            
            if (this.elements.colorPicker && settings.color) {
                this.elements.colorPicker.value = settings.color;
            }
            
            if (this.elements.smoothing && settings.smoothing !== undefined) {
                this.elements.smoothing.value = settings.smoothing;
                if (this.elements.smoothingValue) {
                    this.elements.smoothingValue.textContent = settings.smoothing;
                }
            }
        }
        
        updateShapeSettings(settings) {
            // Fill mode
            if (settings.fillMode) {
                this.updateFillModeButtons(settings.fillMode);
                this.updateFillColorVisibility(settings.fillMode);
            }
            
            // Colors
            if (this.elements.strokeColorPicker && settings.strokeColor) {
                this.elements.strokeColorPicker.value = settings.strokeColor;
            }
            
            if (this.elements.fillColorPicker && settings.fillColor) {
                this.elements.fillColorPicker.value = settings.fillColor;
            }
            
            // Corner radius
            if (this.elements.cornerRadius && settings.cornerRadius !== undefined) {
                this.elements.cornerRadius.value = settings.cornerRadius;
                if (this.elements.cornerRadiusValue) {
                    this.elements.cornerRadiusValue.textContent = settings.cornerRadius;
                }
            }
            
            // Ellipse mode
            if (settings.ellipseMode) {
                this.updateEllipseModeButtons(settings.ellipseMode);
                this.toggleAspectRatioControls(settings.ellipseMode === 'free');
            }
            
            // Aspect ratio
            if (this.elements.aspectRatio && settings.aspectRatio !== undefined) {
                this.elements.aspectRatio.value = settings.aspectRatio;
                if (this.elements.aspectRatioValue) {
                    this.elements.aspectRatioValue.textContent = settings.aspectRatio.toFixed(1);
                }
            }
        }
        
        updatePressureSettings(settings) {
            if (this.elements.pressureSensitivity && settings.pressureSensitive !== undefined) {
                this.elements.pressureSensitivity.checked = settings.pressureSensitive;
                this.togglePressureControls(settings.pressureSensitive);
            }
            
            if (this.elements.minPressure && settings.minPressure !== undefined) {
                this.elements.minPressure.value = settings.minPressure;
                if (this.elements.minPressureValue) {
                    this.elements.minPressureValue.textContent = settings.minPressure;
                }
            }
            
            if (this.elements.maxPressure && settings.maxPressure !== undefined) {
                this.elements.maxPressure.value = settings.maxPressure;
                if (this.elements.maxPressureValue) {
                    this.elements.maxPressureValue.textContent = settings.maxPressure;
                }
            }
            
            if (this.elements.mouseSpeedPressure && settings.mouseSpeedPressure !== undefined) {
                this.elements.mouseSpeedPressure.checked = settings.mouseSpeedPressure;
            }
            
            if (this.elements.pressureFeedback && settings.pressureFeedback !== undefined) {
                this.elements.pressureFeedback.checked = settings.pressureFeedback;
            }
        }
        
        updateFillModeButtons(mode) {
            // Reset all buttons
            const buttons = [this.elements.fillOutlineBtn, this.elements.fillFilledBtn, this.elements.fillBothBtn];
            buttons.forEach(btn => {
                if (btn) {
                    btn.classList.remove('active');
                    btn.style.background = '#3c3c3c';
                    btn.style.color = '#cccccc';
                }
            });
            
            // Activate selected button
            let activeButton;
            switch (mode) {
                case 'outline':
                    activeButton = this.elements.fillOutlineBtn;
                    break;
                case 'filled':
                    activeButton = this.elements.fillFilledBtn;
                    break;
                case 'both':
                    activeButton = this.elements.fillBothBtn;
                    break;
            }
            
            if (activeButton) {
                activeButton.classList.add('active');
                activeButton.style.background = '#007acc';
                activeButton.style.color = 'white';
            }
        }
        
        updateEllipseModeButtons(mode) {
            // Reset buttons
            const buttons = [this.elements.ellipseCircleBtn, this.elements.ellipseFreeBtn];
            buttons.forEach(btn => {
                if (btn) {
                    btn.classList.remove('active');
                    btn.style.background = '#3c3c3c';
                    btn.style.color = '#cccccc';
                }
            });
            
            // Activate selected button
            const activeButton = mode === 'circle' ? this.elements.ellipseCircleBtn : this.elements.ellipseFreeBtn;
            if (activeButton) {
                activeButton.classList.add('active');
                activeButton.style.background = '#007acc';
                activeButton.style.color = 'white';
            }
        }
        
        updateFillColorVisibility(fillMode) {
            if (fillMode === 'outline') {
                this.hideElement(this.elements.fillColorSection);
            } else {
                this.showElement(this.elements.fillColorSection);
            }
        }
        
        togglePressureControls(enabled) {
            if (this.elements.pressureRangeControls) {
                this.elements.pressureRangeControls.style.opacity = enabled ? '1' : '0.5';
                
                // Enable/disable all pressure controls
                const controls = this.elements.pressureRangeControls.querySelectorAll('input');
                controls.forEach(control => {
                    control.disabled = !enabled;
                });
            }
        }
        
        toggleAspectRatioControls(show) {
            if (this.elements.aspectRatioControls) {
                this.elements.aspectRatioControls.style.display = show ? 'block' : 'none';
            }
        }
        
        getCurrentSettings() {
            return this.settings[this.currentTool] || {};
        }
        
        getAllSettings() {
            return this.settings;
        }
        
        resetToDefaults(toolName = null) {
            if (toolName) {
                this.settings[toolName] = JSON.parse(JSON.stringify(this.defaultSettings[toolName]));
            } else {
                this.settings = JSON.parse(JSON.stringify(this.defaultSettings));
            }
            this.saveSettings();
            this.updateUI();
        }
        
        validateSettings(settings) {
            // Validate numeric ranges
            if (settings.strokeWidth !== undefined) {
                settings.strokeWidth = Math.max(1, Math.min(50, settings.strokeWidth));
            }
            
            if (settings.opacity !== undefined) {
                settings.opacity = Math.max(10, Math.min(100, settings.opacity));
            }
            
            if (settings.cornerRadius !== undefined) {
                settings.cornerRadius = Math.max(0, Math.min(50, settings.cornerRadius));
            }
            
            if (settings.aspectRatio !== undefined) {
                settings.aspectRatio = Math.max(0.2, Math.min(5.0, settings.aspectRatio));
            }
            
            if (settings.minPressure !== undefined) {
                settings.minPressure = Math.max(1, Math.min(50, settings.minPressure));
            }
            
            if (settings.maxPressure !== undefined) {
                settings.maxPressure = Math.max(50, Math.min(100, settings.maxPressure));
            }
            
            // Validate enums
            if (settings.fillMode && !['outline', 'filled', 'both'].includes(settings.fillMode)) {
                settings.fillMode = 'outline';
            }
            
            if (settings.ellipseMode && !['circle', 'free'].includes(settings.ellipseMode)) {
                settings.ellipseMode = 'circle';
            }
            
            return settings;
        }
        
        saveSettings() {
            try {
                // Validate before saving
                Object.keys(this.settings).forEach(tool => {
                    this.settings[tool] = this.validateSettings(this.settings[tool]);
                });
                
                localStorage.setItem('vss-drawing-settings', JSON.stringify(this.settings));
            } catch (error) {
                console.error('Failed to save settings:', error);
            }
        }
        
        loadSettings() {
            try {
                const saved = localStorage.getItem('vss-drawing-settings');
                if (saved) {
                    const parsedSettings = JSON.parse(saved);
                    
                    // Merge with defaults to ensure all properties exist
                    Object.keys(this.defaultSettings).forEach(tool => {
                        this.settings[tool] = {
                            ...this.defaultSettings[tool],
                            ...parsedSettings[tool]
                        };
                        
                        // Validate merged settings
                        this.settings[tool] = this.validateSettings(this.settings[tool]);
                    });
                }
            } catch (error) {
                console.error('Failed to load settings, using defaults:', error);
                this.settings = JSON.parse(JSON.stringify(this.defaultSettings));
            }
        }
    }
    
    // Create global instance
    window.SettingsManager = new SettingsManager();
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.SettingsManager.init();
        });
    } else {
        window.SettingsManager.init();
    }
    
})(); 