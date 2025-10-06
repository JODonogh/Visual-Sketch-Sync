/**
 * Design Token Generator - Creates CSS custom properties and design tokens from visual designs
 * Part of the VDS (Visual Design Sync) system
 */

class TokenGenerator {
  constructor(options = {}) {
    this.options = {
      prefix: '--vds',
      generateSass: false,
      generateJSON: true,
      ...options
    };
  }

  /**
   * Generate color tokens from color palette
   * @param {Array} palette - Array of color objects
   * @returns {Object} Generated color tokens
   */
  generateColorTokens(palette) {
    const tokens = {
      css: '',
      sass: '',
      json: {}
    };

    // CSS Custom Properties
    tokens.css = ':root {\n';
    
    palette.forEach(color => {
      const tokenName = this.sanitizeTokenName(color.name);
      const cssVar = `${this.options.prefix}-color-${tokenName}`;
      
      tokens.css += `  ${cssVar}: ${color.color};\n`;
      
      // Sass variables
      if (this.options.generateSass) {
        tokens.sass += `$color-${tokenName}: ${color.color};\n`;
      }
      
      // JSON format
      tokens.json[tokenName] = {
        value: color.color,
        type: 'color',
        usage: color.usage || 'general'
      };
      
      // Generate color variations (lighter, darker)
      const variations = this.generateColorVariations(color.color);
      variations.forEach(variation => {
        const varName = `${cssVar}-${variation.suffix}`;
        tokens.css += `  ${varName}: ${variation.color};\n`;
        
        if (this.options.generateSass) {
          tokens.sass += `$color-${tokenName}-${variation.suffix}: ${variation.color};\n`;
        }
        
        tokens.json[`${tokenName}-${variation.suffix}`] = {
          value: variation.color,
          type: 'color',
          usage: `${color.usage || 'general'} ${variation.suffix}`
        };
      });
    });
    
    tokens.css += '}\n';
    
    return tokens;
  }

  /**
   * Generate spacing tokens from grid system
   * @param {Object} grid - Grid configuration object
   * @returns {Object} Generated spacing tokens
   */
  generateSpacingTokens(grid) {
    const tokens = {
      css: '',
      sass: '',
      json: {}
    };

    const baseSize = grid.size || 8;
    const spacingScale = [0.25, 0.5, 1, 1.5, 2, 3, 4, 6, 8, 12, 16, 24];
    const spacingNames = ['xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl', '6xl', '7xl', '8xl'];

    // Add to CSS custom properties
    tokens.css += '\n  /* Spacing Tokens */\n';
    
    spacingScale.forEach((multiplier, index) => {
      const value = Math.round(baseSize * multiplier);
      const name = spacingNames[index] || `${index}`;
      const cssVar = `${this.options.prefix}-spacing-${name}`;
      
      tokens.css += `  ${cssVar}: ${value}px;\n`;
      
      if (this.options.generateSass) {
        tokens.sass += `$spacing-${name}: ${value}px;\n`;
      }
      
      tokens.json[`spacing-${name}`] = {
        value: `${value}px`,
        type: 'spacing',
        scale: multiplier
      };
    });

    return tokens;
  }

  /**
   * Generate typography tokens from text elements
   * @param {Array} textElements - Array of text element objects
   * @returns {Object} Generated typography tokens
   */
  generateTypographyTokens(textElements) {
    const tokens = {
      css: '',
      sass: '',
      json: {}
    };

    // Extract unique font sizes, weights, and families
    const fontSizes = new Set();
    const fontWeights = new Set();
    const fontFamilies = new Set();

    textElements.forEach(element => {
      if (element.style.fontSize) fontSizes.add(element.style.fontSize);
      if (element.style.fontWeight) fontWeights.add(element.style.fontWeight);
      if (element.style.fontFamily) fontFamilies.add(element.style.fontFamily);
    });

    tokens.css += '\n  /* Typography Tokens */\n';

    // Font families
    Array.from(fontFamilies).forEach((family, index) => {
      const name = this.getFontFamilyName(family, index);
      const cssVar = `${this.options.prefix}-font-family-${name}`;
      
      tokens.css += `  ${cssVar}: ${family};\n`;
      
      if (this.options.generateSass) {
        tokens.sass += `$font-family-${name}: ${family};\n`;
      }
      
      tokens.json[`font-family-${name}`] = {
        value: family,
        type: 'fontFamily'
      };
    });

    // Font sizes
    const sortedSizes = Array.from(fontSizes).sort((a, b) => a - b);
    const sizeNames = ['xs', 'sm', 'base', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl'];
    
    sortedSizes.forEach((size, index) => {
      const name = sizeNames[index] || `size-${index}`;
      const cssVar = `${this.options.prefix}-font-size-${name}`;
      
      tokens.css += `  ${cssVar}: ${size}px;\n`;
      
      if (this.options.generateSass) {
        tokens.sass += `$font-size-${name}: ${size}px;\n`;
      }
      
      tokens.json[`font-size-${name}`] = {
        value: `${size}px`,
        type: 'fontSize'
      };
    });

    // Font weights
    Array.from(fontWeights).forEach(weight => {
      const name = this.getFontWeightName(weight);
      const cssVar = `${this.options.prefix}-font-weight-${name}`;
      
      tokens.css += `  ${cssVar}: ${weight};\n`;
      
      if (this.options.generateSass) {
        tokens.sass += `$font-weight-${name}: ${weight};\n`;
      }
      
      tokens.json[`font-weight-${name}`] = {
        value: weight,
        type: 'fontWeight'
      };
    });

    return tokens;
  }

  /**
   * Generate all design tokens from canvas data
   * @param {Object} canvasData - Complete canvas data object
   * @returns {Object} All generated tokens
   */
  generateAllTokens(canvasData) {
    const allTokens = {
      css: ':root {\n',
      sass: '',
      json: {
        colors: {},
        spacing: {},
        typography: {},
        metadata: {
          generated: new Date().toISOString(),
          version: '1.0.0'
        }
      }
    };

    // Generate color tokens
    if (canvasData.colorPalette) {
      const colorTokens = this.generateColorTokens(canvasData.colorPalette);
      allTokens.css += colorTokens.css.replace(':root {\n', '').replace('}\n', '');
      allTokens.sass += colorTokens.sass;
      allTokens.json.colors = colorTokens.json;
    }

    // Generate spacing tokens
    if (canvasData.canvas && canvasData.canvas.grid) {
      const spacingTokens = this.generateSpacingTokens(canvasData.canvas.grid);
      allTokens.css += spacingTokens.css;
      allTokens.sass += spacingTokens.sass;
      allTokens.json.spacing = spacingTokens.json;
    }

    // Generate typography tokens from text elements
    const textElements = canvasData.elements ? 
      canvasData.elements.filter(el => el.type === 'text') : [];
    
    if (textElements.length > 0) {
      const typographyTokens = this.generateTypographyTokens(textElements);
      allTokens.css += typographyTokens.css;
      allTokens.sass += typographyTokens.sass;
      allTokens.json.typography = typographyTokens.json;
    }

    allTokens.css += '}\n';

    return allTokens;
  }

  /**
   * Export tokens to CSS format
   * @param {Object} tokens - Token object
   * @returns {string} CSS string
   */
  exportToCSS(tokens) {
    return tokens.css || '';
  }

  /**
   * Export tokens to Sass format
   * @param {Object} tokens - Token object
   * @returns {string} Sass string
   */
  exportToSass(tokens) {
    return tokens.sass || '';
  }

  /**
   * Export tokens to JSON format
   * @param {Object} tokens - Token object
   * @returns {string} JSON string
   */
  exportToJSON(tokens) {
    return JSON.stringify(tokens.json || {}, null, 2);
  }

  /**
   * Generate color variations (lighter, darker)
   * @param {string} color - Base color (hex, rgb, hsl)
   * @returns {Array} Array of color variations
   */
  generateColorVariations(color) {
    const variations = [];
    
    // Convert to HSL for easier manipulation
    const hsl = this.hexToHsl(color);
    
    if (hsl) {
      // Lighter variations
      variations.push({
        suffix: 'light',
        color: this.hslToHex(hsl.h, hsl.s, Math.min(hsl.l + 20, 100))
      });
      
      variations.push({
        suffix: 'lighter',
        color: this.hslToHex(hsl.h, hsl.s, Math.min(hsl.l + 40, 100))
      });
      
      // Darker variations
      variations.push({
        suffix: 'dark',
        color: this.hslToHex(hsl.h, hsl.s, Math.max(hsl.l - 20, 0))
      });
      
      variations.push({
        suffix: 'darker',
        color: this.hslToHex(hsl.h, hsl.s, Math.max(hsl.l - 40, 0))
      });
    }
    
    return variations;
  }

  /**
   * Sanitize token name for CSS variables
   * @param {string} name - Original name
   * @returns {string} Sanitized name
   */
  sanitizeTokenName(name) {
    return name.toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  /**
   * Get font family name for token
   * @param {string} family - Font family string
   * @param {number} index - Index for fallback naming
   * @returns {string} Token name
   */
  getFontFamilyName(family, index) {
    const cleanFamily = family.replace(/['"]/g, '').split(',')[0].trim();
    const sanitized = this.sanitizeTokenName(cleanFamily);
    return sanitized || `family-${index}`;
  }

  /**
   * Get font weight name for token
   * @param {number|string} weight - Font weight value
   * @returns {string} Token name
   */
  getFontWeightName(weight) {
    const weightMap = {
      100: 'thin',
      200: 'extra-light',
      300: 'light',
      400: 'normal',
      500: 'medium',
      600: 'semi-bold',
      700: 'bold',
      800: 'extra-bold',
      900: 'black'
    };
    
    return weightMap[weight] || `weight-${weight}`;
  }

  /**
   * Convert hex color to HSL
   * @param {string} hex - Hex color string
   * @returns {Object|null} HSL object or null if invalid
   */
  hexToHsl(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return null;

    let r = parseInt(result[1], 16) / 255;
    let g = parseInt(result[2], 16) / 255;
    let b = parseInt(result[3], 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
      h = s = 0;
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }

    return {
      h: Math.round(h * 360),
      s: Math.round(s * 100),
      l: Math.round(l * 100)
    };
  }

  /**
   * Convert HSL to hex color
   * @param {number} h - Hue (0-360)
   * @param {number} s - Saturation (0-100)
   * @param {number} l - Lightness (0-100)
   * @returns {string} Hex color string
   */
  hslToHex(h, s, l) {
    h /= 360;
    s /= 100;
    l /= 100;

    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };

    let r, g, b;

    if (s === 0) {
      r = g = b = l;
    } else {
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }

    const toHex = (c) => {
      const hex = Math.round(c * 255).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };

    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }
}

module.exports = TokenGenerator;