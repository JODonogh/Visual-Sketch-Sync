// Professional Color System Implementation
// IIFE wrapper to prevent global conflicts
(function() {
    'use strict';
    
    // Check if ColorSystem already exists
    if (window.ColorSystem) {
        console.log('ColorSystem already exists, skipping redefinition');
        return;
    }

class ColorSystem {
    constructor() {
        this.currentColor = { h: 0, s: 100, b: 100 }; // HSB format
        this.swatches = [];
        this.colorHistory = [];
        this.maxHistorySize = 20;
        
        this.initializeDefaultSwatches();
    }
    
    initializeDefaultSwatches() {
        // Professional color palette
        this.swatches = [
            { name: 'Black', color: '#000000', usage: 'text' },
            { name: 'White', color: '#FFFFFF', usage: 'background' },
            { name: 'Primary Blue', color: '#007ACC', usage: 'primary' },
            { name: 'Success Green', color: '#28A745', usage: 'success' },
            { name: 'Warning Orange', color: '#FFC107', usage: 'warning' },
            { name: 'Danger Red', color: '#DC3545', usage: 'danger' },
            { name: 'Info Cyan', color: '#17A2B8', usage: 'info' },
            { name: 'Light Gray', color: '#F8F9FA', usage: 'light' },
            { name: 'Dark Gray', color: '#343A40', usage: 'dark' }
        ];
    }
    
    // Color format conversions
    hsbToRgb(h, s, b) {
        s /= 100;
        b /= 100;
        const c = b * s;
        const x = c * (1 - Math.abs((h / 60) % 2 - 1));
        const m = b - c;
        let r, g, bl;
        
        if (0 <= h && h < 60) {
            r = c; g = x; bl = 0;
        } else if (60 <= h && h < 120) {
            r = x; g = c; bl = 0;
        } else if (120 <= h && h < 180) {
            r = 0; g = c; bl = x;
        } else if (180 <= h && h < 240) {
            r = 0; g = x; bl = c;
        } else if (240 <= h && h < 300) {
            r = x; g = 0; bl = c;
        } else if (300 <= h && h < 360) {
            r = c; g = 0; bl = x;
        }
        
        r = Math.round((r + m) * 255);
        g = Math.round((g + m) * 255);
        bl = Math.round((bl + m) * 255);
        
        return { r, g, b: bl };
    }
    
    rgbToHsb(r, g, b) {
        r /= 255;
        g /= 255;
        b /= 255;
        
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const delta = max - min;
        
        let h = 0;
        const s = max === 0 ? 0 : (delta / max) * 100;
        const brightness = max * 100;
        
        if (delta !== 0) {
            if (max === r) {
                h = ((g - b) / delta) % 6;
            } else if (max === g) {
                h = (b - r) / delta + 2;
            } else {
                h = (r - g) / delta + 4;
            }
            h *= 60;
            if (h < 0) h += 360;
        }
        
        return { h: Math.round(h), s: Math.round(s), b: Math.round(brightness) };
    }
    
    hsbToHex(h, s, b) {
        const rgb = this.hsbToRgb(h, s, b);
        return '#' + [rgb.r, rgb.g, rgb.b].map(x => {
            const hex = x.toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        }).join('');
    }
    
    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }
    
    hexToHsb(hex) {
        const rgb = this.hexToRgb(hex);
        return rgb ? this.rgbToHsb(rgb.r, rgb.g, rgb.b) : null;
    }
    
    // Color harmony generation
    getColorHarmony(baseColor, type) {
        const hsb = typeof baseColor === 'string' ? this.hexToHsb(baseColor) : baseColor;
        if (!hsb) return [];
        
        const harmonies = [];
        
        switch (type) {
            case 'complementary':
                harmonies.push(hsb);
                harmonies.push({
                    h: (hsb.h + 180) % 360,
                    s: hsb.s,
                    b: hsb.b
                });
                break;
                
            case 'triadic':
                harmonies.push(hsb);
                harmonies.push({
                    h: (hsb.h + 120) % 360,
                    s: hsb.s,
                    b: hsb.b
                });
                harmonies.push({
                    h: (hsb.h + 240) % 360,
                    s: hsb.s,
                    b: hsb.b
                });
                break;
                
            case 'analogous':
                for (let i = -2; i <= 2; i++) {
                    harmonies.push({
                        h: (hsb.h + i * 30 + 360) % 360,
                        s: hsb.s,
                        b: hsb.b
                    });
                }
                break;
                
            case 'monochromatic':
                for (let i = 0; i < 5; i++) {
                    harmonies.push({
                        h: hsb.h,
                        s: hsb.s,
                        b: Math.max(20, Math.min(100, hsb.b - i * 20))
                    });
                }
                break;
                
            case 'tetradic':
                harmonies.push(hsb);
                harmonies.push({
                    h: (hsb.h + 90) % 360,
                    s: hsb.s,
                    b: hsb.b
                });
                harmonies.push({
                    h: (hsb.h + 180) % 360,
                    s: hsb.s,
                    b: hsb.b
                });
                harmonies.push({
                    h: (hsb.h + 270) % 360,
                    s: hsb.s,
                    b: hsb.b
                });
                break;
        }
        
        return harmonies.map(color => this.hsbToHex(color.h, color.s, color.b));
    }
    
    // Accessibility functions
    getLuminance(hex) {
        const rgb = this.hexToRgb(hex);
        if (!rgb) return 0;
        
        const [r, g, b] = [rgb.r, rgb.g, rgb.b].map(c => {
            c = c / 255;
            return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
        });
        
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    }
    
    getContrastRatio(color1, color2) {
        const lum1 = this.getLuminance(color1);
        const lum2 = this.getLuminance(color2);
        const brightest = Math.max(lum1, lum2);
        const darkest = Math.min(lum1, lum2);
        
        return (brightest + 0.05) / (darkest + 0.05);
    }
    
    checkAccessibility(foreground, background) {
        const ratio = this.getContrastRatio(foreground, background);
        
        return {
            ratio: ratio,
            aa: ratio >= 4.5,
            aaa: ratio >= 7,
            aaLarge: ratio >= 3,
            aaaLarge: ratio >= 4.5
        };
    }
    
    suggestAccessibleColors(baseColor, targetBackground = '#FFFFFF') {
        const suggestions = [];
        const baseHsb = this.hexToHsb(baseColor);
        if (!baseHsb) return suggestions;
        
        // Try different brightness levels
        for (let b = 10; b <= 90; b += 10) {
            const testColor = this.hsbToHex(baseHsb.h, baseHsb.s, b);
            const accessibility = this.checkAccessibility(testColor, targetBackground);
            
            if (accessibility.aa) {
                suggestions.push({
                    color: testColor,
                    accessibility: accessibility,
                    brightness: b
                });
            }
        }
        
        return suggestions.sort((a, b) => b.accessibility.ratio - a.accessibility.ratio);
    }
    
    // Swatch management
    addToSwatch(color, name = '', usage = '') {
        const swatch = {
            name: name || `Color ${this.swatches.length + 1}`,
            color: color,
            usage: usage,
            timestamp: Date.now()
        };
        
        // Check if color already exists
        const existingIndex = this.swatches.findIndex(s => s.color.toLowerCase() === color.toLowerCase());
        if (existingIndex !== -1) {
            this.swatches[existingIndex] = swatch;
        } else {
            this.swatches.push(swatch);
        }
        
        this.addToHistory(color);
        return swatch;
    }
    
    removeFromSwatch(index) {
        if (index >= 0 && index < this.swatches.length) {
            return this.swatches.splice(index, 1)[0];
        }
        return null;
    }
    
    addToHistory(color) {
        // Remove if already exists
        const existingIndex = this.colorHistory.indexOf(color);
        if (existingIndex !== -1) {
            this.colorHistory.splice(existingIndex, 1);
        }
        
        // Add to beginning
        this.colorHistory.unshift(color);
        
        // Limit history size
        if (this.colorHistory.length > this.maxHistorySize) {
            this.colorHistory = this.colorHistory.slice(0, this.maxHistorySize);
        }
    }
    
    // Color palette generation
    generatePalette(baseColor, count = 5, type = 'monochromatic') {
        const palette = [];
        const baseHsb = this.hexToHsb(baseColor);
        if (!baseHsb) return palette;
        
        switch (type) {
            case 'monochromatic':
                for (let i = 0; i < count; i++) {
                    const brightness = Math.max(10, Math.min(90, baseHsb.b - (i * 15)));
                    palette.push(this.hsbToHex(baseHsb.h, baseHsb.s, brightness));
                }
                break;
                
            case 'analogous':
                const step = 30;
                for (let i = 0; i < count; i++) {
                    const hue = (baseHsb.h + (i - Math.floor(count / 2)) * step + 360) % 360;
                    palette.push(this.hsbToHex(hue, baseHsb.s, baseHsb.b));
                }
                break;
                
            case 'complementary':
                palette.push(baseColor);
                if (count > 1) {
                    palette.push(this.hsbToHex((baseHsb.h + 180) % 360, baseHsb.s, baseHsb.b));
                }
                // Fill remaining with variations
                for (let i = 2; i < count; i++) {
                    const brightness = Math.max(20, Math.min(80, baseHsb.b + (i - 2) * 20));
                    palette.push(this.hsbToHex(baseHsb.h, baseHsb.s, brightness));
                }
                break;
        }
        
        return palette;
    }
    
    // Export functions
    exportSwatches(format = 'css') {
        switch (format) {
            case 'css':
                return this.exportToCss();
            case 'json':
                return JSON.stringify(this.swatches, null, 2);
            case 'ase':
                return this.exportToAse();
            default:
                return this.swatches;
        }
    }
    
    exportToCss() {
        let css = ':root {\n';
        this.swatches.forEach((swatch, index) => {
            const varName = swatch.usage || `color-${index + 1}`;
            css += `  --${varName}: ${swatch.color};\n`;
        });
        css += '}';
        return css;
    }
    
    exportToAse() {
        // Adobe Swatch Exchange format (simplified)
        return {
            version: '1.0',
            colors: this.swatches.map(swatch => ({
                name: swatch.name,
                color: swatch.color,
                type: 'RGB'
            }))
        };
    }
    
    // Current color management
    setCurrentColor(color) {
        if (typeof color === 'string') {
            this.currentColor = this.hexToHsb(color) || this.currentColor;
        } else {
            this.currentColor = color;
        }
        this.addToHistory(this.getCurrentColorHex());
    }
    
    getCurrentColorHex() {
        return this.hsbToHex(this.currentColor.h, this.currentColor.s, this.currentColor.b);
    }
    
    getCurrentColorRgb() {
        return this.hsbToRgb(this.currentColor.h, this.currentColor.s, this.currentColor.b);
    }
}

// Expose ColorSystem to global scope
window.ColorSystem = ColorSystem;

})(); // End of IIFE