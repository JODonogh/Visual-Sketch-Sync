/**
 * Canvas-to-CSS Conversion Engine
 * Main orchestrator for converting canvas designs to CSS code
 * Part of the VDS (Visual Design Sync) system
 */

const CSSGenerator = require('./css-generator');
const TokenGenerator = require('./token-generator');
const fs = require('fs').promises;
const path = require('path');

class CanvasToCSSEngine {
  constructor(options = {}) {
    this.options = {
      outputDir: 'src/styles',
      generateTokens: true,
      generateComponents: true,
      generateLayouts: true,
      ...options
    };
    
    this.cssGenerator = new CSSGenerator(options.cssGenerator);
    this.tokenGenerator = new TokenGenerator(options.tokenGenerator);
  }

  /**
   * Convert complete canvas data to CSS files
   * @param {Object} canvasData - Complete canvas design data
   * @returns {Object} Generated CSS files and their contents
   */
  async convertCanvasToCSS(canvasData) {
    const results = {
      files: {},
      tokens: {},
      components: [],
      layouts: []
    };

    try {
      // Generate design tokens first
      if (this.options.generateTokens && canvasData.colorPalette) {
        const tokens = this.tokenGenerator.generateAllTokens(canvasData);
        results.tokens = tokens;
        results.files['design-tokens.css'] = tokens.css;
        
        if (tokens.sass) {
          results.files['design-tokens.scss'] = tokens.sass;
        }
        
        results.files['design-tokens.json'] = this.tokenGenerator.exportToJSON(tokens);
      }

      // Generate component styles from individual elements
      if (this.options.generateComponents && canvasData.elements) {
        const componentCSS = this.generateComponentStyles(canvasData.elements);
        results.files['components.css'] = componentCSS;
        results.components = this.extractComponentInfo(canvasData.elements);
      }

      // Generate layout styles from element groups
      if (this.options.generateLayouts && canvasData.elements) {
        const layoutCSS = this.generateLayoutStyles(canvasData.elements, canvasData.layers);
        results.files['layouts.css'] = layoutCSS;
        results.layouts = this.extractLayoutInfo(canvasData.elements, canvasData.layers);
      }

      // Generate utility classes
      const utilityCSS = this.generateUtilityClasses(canvasData);
      results.files['utilities.css'] = utilityCSS;

      // Write files to disk
      await this.writeGeneratedFiles(results.files);

      return results;
    } catch (error) {
      console.error('Error converting canvas to CSS:', error);
      throw error;
    }
  }

  /**
   * Generate CSS for individual components
   * @param {Array} elements - Array of canvas elements
   * @returns {string} Generated component CSS
   */
  generateComponentStyles(elements) {
    let css = '/* Generated Component Styles */\n\n';
    
    elements.forEach(element => {
      const elementCSS = this.cssGenerator.elementToCSS(element);
      if (elementCSS) {
        css += elementCSS + '\n';
      }
      
      // Generate button-like styles for rectangles with text
      if (element.type === 'rectangle' && element.hasText) {
        css += this.generateButtonStyle(element);
      }
      
      // Generate card-like styles for grouped elements
      if (element.type === 'group') {
        css += this.generateCardStyle(element);
      }
    });
    
    return css;
  }

  /**
   * Generate CSS for layout containers
   * @param {Array} elements - Array of canvas elements
   * @param {Array} layers - Array of canvas layers
   * @returns {string} Generated layout CSS
   */
  generateLayoutStyles(elements, layers = []) {
    let css = '/* Generated Layout Styles */\n\n';
    
    // Group elements by layers
    layers.forEach(layer => {
      const layerElements = elements.filter(el => el.layerId === layer.id);
      
      if (layerElements.length > 1) {
        const layoutCSS = this.cssGenerator.generateLayoutCSS(layerElements);
        css += `/* Layer: ${layer.name} */\n`;
        css += layoutCSS + '\n';
      }
    });
    
    // Generate responsive layouts
    const responsiveCSS = this.generateResponsiveLayouts(elements);
    css += responsiveCSS;
    
    return css;
  }

  /**
   * Generate utility classes from design patterns
   * @param {Object} canvasData - Canvas data
   * @returns {string} Generated utility CSS
   */
  generateUtilityClasses(canvasData) {
    let css = '/* Generated Utility Classes */\n\n';
    
    // Spacing utilities from grid
    if (canvasData.canvas && canvasData.canvas.grid) {
      css += this.generateSpacingUtilities(canvasData.canvas.grid);
    }
    
    // Color utilities from palette
    if (canvasData.colorPalette) {
      css += this.generateColorUtilities(canvasData.colorPalette);
    }
    
    // Typography utilities
    const textElements = canvasData.elements ? 
      canvasData.elements.filter(el => el.type === 'text') : [];
    
    if (textElements.length > 0) {
      css += this.generateTypographyUtilities(textElements);
    }
    
    return css;
  }

  /**
   * Generate button-style CSS for rectangle elements
   * @param {Object} element - Rectangle element with text
   * @returns {string} Button CSS
   */
  generateButtonStyle(element) {
    const className = `vds-button-${element.id}`;
    
    let css = `.${className} {\n`;
    css += `  display: inline-flex;\n`;
    css += `  align-items: center;\n`;
    css += `  justify-content: center;\n`;
    css += `  padding: 8px 16px;\n`;
    css += `  border: none;\n`;
    css += `  cursor: pointer;\n`;
    css += `  text-decoration: none;\n`;
    css += `  transition: all 0.2s ease;\n`;
    
    if (element.style.fill) {
      css += `  background-color: ${element.style.fill};\n`;
    }
    
    if (element.style.borderRadius) {
      css += `  border-radius: ${element.style.borderRadius}px;\n`;
    }
    
    css += `}\n\n`;
    
    // Add hover state
    css += `.${className}:hover {\n`;
    css += `  transform: translateY(-1px);\n`;
    css += `  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);\n`;
    css += `}\n\n`;
    
    return css;
  }

  /**
   * Generate card-style CSS for grouped elements
   * @param {Object} element - Group element
   * @returns {string} Card CSS
   */
  generateCardStyle(element) {
    const className = `vds-card-${element.id}`;
    
    let css = `.${className} {\n`;
    css += `  display: flex;\n`;
    css += `  flex-direction: column;\n`;
    css += `  padding: 16px;\n`;
    css += `  border-radius: 8px;\n`;
    css += `  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);\n`;
    css += `  background-color: white;\n`;
    css += `}\n\n`;
    
    return css;
  }

  /**
   * Generate responsive layout CSS
   * @param {Array} elements - Array of elements
   * @returns {string} Responsive CSS
   */
  generateResponsiveLayouts(elements) {
    let css = '/* Responsive Layouts */\n\n';
    
    const breakpoints = [
      { name: 'mobile', maxWidth: 768 },
      { name: 'tablet', maxWidth: 1024 }
    ];
    
    breakpoints.forEach(bp => {
      css += `@media (max-width: ${bp.maxWidth}px) {\n`;
      
      // Make layouts stack on smaller screens
      css += `  .vds-layout-flexbox {\n`;
      css += `    flex-direction: column;\n`;
      css += `  }\n`;
      
      css += `  .vds-layout-grid {\n`;
      css += `    grid-template-columns: 1fr;\n`;
      css += `  }\n`;
      
      css += `}\n\n`;
    });
    
    return css;
  }

  /**
   * Generate spacing utility classes
   * @param {Object} grid - Grid configuration
   * @returns {string} Spacing utilities CSS
   */
  generateSpacingUtilities(grid) {
    let css = '/* Spacing Utilities */\n\n';
    
    const baseSize = grid.size || 8;
    const spacingScale = [0, 1, 2, 3, 4, 6, 8, 12, 16, 24];
    
    spacingScale.forEach(multiplier => {
      const value = baseSize * multiplier;
      
      // Margin utilities
      css += `.m-${multiplier} { margin: ${value}px; }\n`;
      css += `.mt-${multiplier} { margin-top: ${value}px; }\n`;
      css += `.mr-${multiplier} { margin-right: ${value}px; }\n`;
      css += `.mb-${multiplier} { margin-bottom: ${value}px; }\n`;
      css += `.ml-${multiplier} { margin-left: ${value}px; }\n`;
      
      // Padding utilities
      css += `.p-${multiplier} { padding: ${value}px; }\n`;
      css += `.pt-${multiplier} { padding-top: ${value}px; }\n`;
      css += `.pr-${multiplier} { padding-right: ${value}px; }\n`;
      css += `.pb-${multiplier} { padding-bottom: ${value}px; }\n`;
      css += `.pl-${multiplier} { padding-left: ${value}px; }\n`;
    });
    
    css += '\n';
    return css;
  }

  /**
   * Generate color utility classes
   * @param {Array} palette - Color palette
   * @returns {string} Color utilities CSS
   */
  generateColorUtilities(palette) {
    let css = '/* Color Utilities */\n\n';
    
    palette.forEach(color => {
      const tokenName = this.tokenGenerator.sanitizeTokenName(color.name);
      
      // Background utilities
      css += `.bg-${tokenName} { background-color: ${color.color}; }\n`;
      
      // Text utilities
      css += `.text-${tokenName} { color: ${color.color}; }\n`;
      
      // Border utilities
      css += `.border-${tokenName} { border-color: ${color.color}; }\n`;
    });
    
    css += '\n';
    return css;
  }

  /**
   * Generate typography utility classes
   * @param {Array} textElements - Text elements
   * @returns {string} Typography utilities CSS
   */
  generateTypographyUtilities(textElements) {
    let css = '/* Typography Utilities */\n\n';
    
    const fontSizes = new Set();
    const fontWeights = new Set();
    
    textElements.forEach(element => {
      if (element.style.fontSize) fontSizes.add(element.style.fontSize);
      if (element.style.fontWeight) fontWeights.add(element.style.fontWeight);
    });
    
    // Font size utilities
    Array.from(fontSizes).forEach(size => {
      css += `.text-${size}px { font-size: ${size}px; }\n`;
    });
    
    // Font weight utilities
    Array.from(fontWeights).forEach(weight => {
      const name = this.tokenGenerator.getFontWeightName(weight);
      css += `.font-${name} { font-weight: ${weight}; }\n`;
    });
    
    css += '\n';
    return css;
  }

  /**
   * Extract component information for documentation
   * @param {Array} elements - Array of elements
   * @returns {Array} Component information
   */
  extractComponentInfo(elements) {
    return elements.map(element => ({
      id: element.id,
      type: element.type,
      className: `vds-${element.type}-${element.id}`,
      properties: this.extractElementProperties(element),
      usage: this.generateUsageExample(element)
    }));
  }

  /**
   * Extract layout information for documentation
   * @param {Array} elements - Array of elements
   * @param {Array} layers - Array of layers
   * @returns {Array} Layout information
   */
  extractLayoutInfo(elements, layers = []) {
    return layers.map(layer => {
      const layerElements = elements.filter(el => el.layerId === layer.id);
      const layout = this.cssGenerator.analyzeLayout(layerElements);
      
      return {
        layerId: layer.id,
        layerName: layer.name,
        layoutType: layout.type,
        elementCount: layerElements.length,
        className: `vds-layout-${layer.id}`,
        properties: layout
      };
    });
  }

  /**
   * Extract CSS properties from element
   * @param {Object} element - Canvas element
   * @returns {Object} CSS properties
   */
  extractElementProperties(element) {
    const properties = {};
    
    if (element.size) {
      properties.width = `${element.size.width}px`;
      properties.height = `${element.size.height}px`;
    }
    
    if (element.style) {
      if (element.style.fill) properties.backgroundColor = element.style.fill;
      if (element.style.stroke) properties.borderColor = element.style.stroke;
      if (element.style.strokeWidth) properties.borderWidth = `${element.style.strokeWidth}px`;
      if (element.style.borderRadius) properties.borderRadius = `${element.style.borderRadius}px`;
    }
    
    return properties;
  }

  /**
   * Generate usage example for element
   * @param {Object} element - Canvas element
   * @returns {string} HTML usage example
   */
  generateUsageExample(element) {
    const className = `vds-${element.type}-${element.id}`;
    
    switch (element.type) {
      case 'rectangle':
        return element.hasText ? 
          `<button class="${className}">Button Text</button>` :
          `<div class="${className}"></div>`;
      case 'circle':
        return `<div class="${className}"></div>`;
      case 'text':
        return `<span class="${className}">Text Content</span>`;
      default:
        return `<div class="${className}"></div>`;
    }
  }

  /**
   * Write generated CSS files to disk
   * @param {Object} files - Object with filename: content pairs
   */
  async writeGeneratedFiles(files) {
    try {
      // Ensure output directory exists
      await fs.mkdir(this.options.outputDir, { recursive: true });
      
      // Write each file
      for (const [filename, content] of Object.entries(files)) {
        const filePath = path.join(this.options.outputDir, filename);
        await fs.writeFile(filePath, content, 'utf8');
        console.log(`Generated: ${filePath}`);
      }
    } catch (error) {
      console.error('Error writing generated files:', error);
      throw error;
    }
  }

  /**
   * Update existing CSS files with new styles
   * @param {string} filePath - Path to existing CSS file
   * @param {string} newCSS - New CSS to add
   */
  async updateCSSFile(filePath, newCSS) {
    try {
      let existingCSS = '';
      
      try {
        existingCSS = await fs.readFile(filePath, 'utf8');
      } catch (error) {
        // File doesn't exist, will create new
      }
      
      // Simple append for now - could be more sophisticated
      const updatedCSS = existingCSS + '\n' + newCSS;
      await fs.writeFile(filePath, updatedCSS, 'utf8');
      
      console.log(`Updated: ${filePath}`);
    } catch (error) {
      console.error('Error updating CSS file:', error);
      throw error;
    }
  }
}

module.exports = CanvasToCSSEngine;