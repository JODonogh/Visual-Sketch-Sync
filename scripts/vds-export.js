#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');
const sharp = require('sharp');

/**
 * VDS Export Utility
 * Exports drawings as SVG/PNG and generates component libraries from canvas designs
 */
class VDSExporter {
  constructor(projectPath = process.cwd()) {
    this.projectPath = projectPath;
    this.designDataPath = path.join(projectPath, 'src/design/design-data.json');
    this.outputDir = path.join(projectPath, 'src/design/exports');
    this.componentsDir = path.join(projectPath, 'src/design/components');
  }

  /**
   * Main export function
   */
  async export(options = {}) {
    console.log('🎨 Exporting VDS designs...\n');

    try {
      // Ensure output directories exist
      this.ensureDirectories();

      // Load design data
      const designData = this.loadDesignData();

      // Export based on options
      if (options.svg !== false) {
        await this.exportSVG(designData);
      }

      if (options.png !== false) {
        await this.exportPNG(designData);
      }

      if (options.components !== false) {
        await this.generateComponents(designData);
      }

      if (options.tokens !== false) {
        await this.exportDesignTokens(designData);
      }

      if (options.figma !== false) {
        await this.exportFigmaTokens(designData);
      }

      console.log('✅ Export complete!\n');
      this.printExportSummary();

    } catch (error) {
      console.error('❌ Export failed:', error.message);
      process.exit(1);
    }
  }

  /**
   * Ensures output directories exist
   */
  ensureDirectories() {
    const dirs = [
      this.outputDir,
      path.join(this.outputDir, 'svg'),
      path.join(this.outputDir, 'png'),
      path.join(this.outputDir, 'tokens'),
      this.componentsDir
    ];

    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  /**
   * Loads design data from JSON file
   */
  loadDesignData() {
    if (!fs.existsSync(this.designDataPath)) {
      throw new Error('Design data file not found. Please create designs first.');
    }

    return JSON.parse(fs.readFileSync(this.designDataPath, 'utf8'));
  }

  /**
   * Exports designs as SVG files
   */
  async exportSVG(designData) {
    console.log('📄 Exporting SVG files...');

    const { canvas, elements } = designData;
    
    // Create full canvas SVG
    const fullSVG = this.createCanvasSVG(canvas, elements);
    const fullSVGPath = path.join(this.outputDir, 'svg', 'full-canvas.svg');
    fs.writeFileSync(fullSVGPath, fullSVG);

    // Export individual elements
    let elementCount = 0;
    elements.forEach((element, index) => {
      const elementSVG = this.createElementSVG(element, canvas);
      const elementPath = path.join(this.outputDir, 'svg', `element-${element.id || index}.svg`);
      fs.writeFileSync(elementPath, elementSVG);
      elementCount++;
    });

    console.log(`   ✓ Exported ${elementCount + 1} SVG files`);
  }

  /**
   * Creates SVG for the full canvas
   */
  createCanvasSVG(canvas, elements) {
    const { width, height, backgroundColor } = canvas;
    
    let svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="${backgroundColor || '#ffffff'}"/>
`;

    elements.forEach(element => {
      svg += this.elementToSVG(element);
    });

    svg += '</svg>';
    return svg;
  }

  /**
   * Creates SVG for individual element
   */
  createElementSVG(element, canvas) {
    const bounds = this.getElementBounds(element);
    const padding = 20;
    
    const width = bounds.width + (padding * 2);
    const height = bounds.height + (padding * 2);
    
    let svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="${canvas.backgroundColor || '#ffffff'}"/>
  <g transform="translate(${padding - bounds.x}, ${padding - bounds.y})">
`;

    svg += this.elementToSVG(element);
    svg += '  </g>\n</svg>';
    
    return svg;
  }

  /**
   * Converts element to SVG markup
   */
  elementToSVG(element) {
    switch (element.type) {
      case 'rectangle':
        return this.rectangleToSVG(element);
      case 'circle':
        return this.circleToSVG(element);
      case 'freehand':
        return this.freehandToSVG(element);
      case 'text':
        return this.textToSVG(element);
      default:
        return '';
    }
  }

  /**
   * Converts rectangle element to SVG
   */
  rectangleToSVG(element) {
    const { position, size, style } = element;
    const { x, y } = position;
    const { width, height } = size;
    const { fill, stroke, strokeWidth, borderRadius } = style;

    return `  <rect x="${x}" y="${y}" width="${width}" height="${height}" 
           fill="${fill || 'none'}" 
           stroke="${stroke || 'none'}" 
           stroke-width="${strokeWidth || 0}"
           rx="${borderRadius || 0}" />
`;
  }

  /**
   * Converts circle element to SVG
   */
  circleToSVG(element) {
    const { position, size, style } = element;
    const { x, y } = position;
    const { width } = size;
    const radius = width / 2;
    const { fill, stroke, strokeWidth } = style;

    return `  <circle cx="${x + radius}" cy="${y + radius}" r="${radius}"
           fill="${fill || 'none'}" 
           stroke="${stroke || 'none'}" 
           stroke-width="${strokeWidth || 0}" />
`;
  }

  /**
   * Converts freehand drawing to SVG
   */
  freehandToSVG(element) {
    const { path, style } = element;
    const { stroke, strokeWidth } = style;

    return `  <path d="${path}" 
           fill="none" 
           stroke="${stroke || '#000000'}" 
           stroke-width="${strokeWidth || 2}" 
           stroke-linecap="round" 
           stroke-linejoin="round" />
`;
  }

  /**
   * Converts text element to SVG
   */
  textToSVG(element) {
    const { position, text, style } = element;
    const { x, y } = position;
    const { fontSize, fontFamily, fill } = style;

    return `  <text x="${x}" y="${y}" 
           font-family="${fontFamily || 'Arial'}" 
           font-size="${fontSize || 16}" 
           fill="${fill || '#000000'}">${text}</text>
`;
  }

  /**
   * Exports designs as PNG files
   */
  async exportPNG(designData) {
    console.log('🖼️  Exporting PNG files...');

    const { canvas, elements } = designData;
    
    // Create canvas for rendering
    const canvasNode = createCanvas(canvas.width, canvas.height);
    const ctx = canvasNode.getContext('2d');

    // Fill background
    ctx.fillStyle = canvas.backgroundColor || '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Render elements
    elements.forEach(element => {
      this.renderElementToCanvas(ctx, element);
    });

    // Export full canvas
    const buffer = canvasNode.toBuffer('image/png');
    const fullPNGPath = path.join(this.outputDir, 'png', 'full-canvas.png');
    fs.writeFileSync(fullPNGPath, buffer);

    // Export individual elements
    let elementCount = 0;
    for (const element of elements) {
      await this.exportElementPNG(element, canvas);
      elementCount++;
    }

    console.log(`   ✓ Exported ${elementCount + 1} PNG files`);
  }

  /**
   * Renders element to canvas context
   */
  renderElementToCanvas(ctx, element) {
    switch (element.type) {
      case 'rectangle':
        this.renderRectangle(ctx, element);
        break;
      case 'circle':
        this.renderCircle(ctx, element);
        break;
      case 'freehand':
        this.renderFreehand(ctx, element);
        break;
      case 'text':
        this.renderText(ctx, element);
        break;
    }
  }

  /**
   * Renders rectangle to canvas
   */
  renderRectangle(ctx, element) {
    const { position, size, style } = element;
    const { x, y } = position;
    const { width, height } = size;
    const { fill, stroke, strokeWidth, borderRadius } = style;

    ctx.save();

    if (borderRadius) {
      this.roundRect(ctx, x, y, width, height, borderRadius);
    } else {
      ctx.rect(x, y, width, height);
    }

    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill();
    }

    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = strokeWidth || 1;
      ctx.stroke();
    }

    ctx.restore();
  }

  /**
   * Renders circle to canvas
   */
  renderCircle(ctx, element) {
    const { position, size, style } = element;
    const { x, y } = position;
    const { width } = size;
    const radius = width / 2;
    const { fill, stroke, strokeWidth } = style;

    ctx.save();
    ctx.beginPath();
    ctx.arc(x + radius, y + radius, radius, 0, 2 * Math.PI);

    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill();
    }

    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = strokeWidth || 1;
      ctx.stroke();
    }

    ctx.restore();
  }

  /**
   * Helper function to draw rounded rectangle
   */
  roundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  /**
   * Exports individual element as PNG
   */
  async exportElementPNG(element, canvasConfig) {
    const bounds = this.getElementBounds(element);
    const padding = 20;
    
    const width = bounds.width + (padding * 2);
    const height = bounds.height + (padding * 2);
    
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Fill background
    ctx.fillStyle = canvasConfig.backgroundColor || '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // Translate context to center element
    ctx.translate(padding - bounds.x, padding - bounds.y);
    
    // Render element
    this.renderElementToCanvas(ctx, element);

    // Export
    const buffer = canvas.toBuffer('image/png');
    const elementPath = path.join(this.outputDir, 'png', `element-${element.id || 'unknown'}.png`);
    fs.writeFileSync(elementPath, buffer);
  }

  /**
   * Gets bounding box of element
   */
  getElementBounds(element) {
    switch (element.type) {
      case 'rectangle':
        return {
          x: element.position.x,
          y: element.position.y,
          width: element.size.width,
          height: element.size.height
        };
      case 'circle':
        return {
          x: element.position.x,
          y: element.position.y,
          width: element.size.width,
          height: element.size.width
        };
      default:
        return { x: 0, y: 0, width: 100, height: 100 };
    }
  }

  /**
   * Generates React/HTML components from designs
   */
  async generateComponents(designData) {
    console.log('⚛️  Generating components...');

    const { elements, designTokens } = designData;
    let componentCount = 0;

    // Group elements that could be components
    const componentGroups = this.identifyComponents(elements);

    for (const group of componentGroups) {
      const component = this.generateComponent(group, designTokens);
      const componentPath = path.join(this.componentsDir, `${group.name}.jsx`);
      fs.writeFileSync(componentPath, component.jsx);

      // Generate CSS for component
      const cssPath = path.join(this.componentsDir, `${group.name}.css`);
      fs.writeFileSync(cssPath, component.css);

      componentCount++;
    }

    console.log(`   ✓ Generated ${componentCount} components`);
  }

  /**
   * Identifies potential components from elements
   */
  identifyComponents(elements) {
    const components = [];

    // Simple heuristic: rectangles with text could be buttons
    elements.forEach((element, index) => {
      if (element.type === 'rectangle') {
        components.push({
          name: `Button${index + 1}`,
          type: 'button',
          elements: [element]
        });
      }
    });

    return components;
  }

  /**
   * Generates React component code
   */
  generateComponent(group, designTokens) {
    const { name, type, elements } = group;
    
    if (type === 'button') {
      return this.generateButtonComponent(name, elements[0], designTokens);
    }

    return { jsx: '', css: '' };
  }

  /**
   * Generates button component
   */
  generateButtonComponent(name, element, designTokens) {
    const { style, size } = element;
    const className = name.toLowerCase();

    const jsx = `import React from 'react';
import './${name}.css';

interface ${name}Props {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary';
}

export const ${name}: React.FC<${name}Props> = ({ 
  children, 
  onClick, 
  disabled = false,
  variant = 'primary'
}) => {
  return (
    <button 
      className={\`${className} ${className}--\${variant}\`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
};

export default ${name};
`;

    const css = `.${className} {
  background: ${style.fill || 'var(--color-primary)'};
  color: white;
  border: ${style.stroke ? `${style.strokeWidth || 1}px solid ${style.stroke}` : 'none'};
  border-radius: ${style.borderRadius || 4}px;
  padding: var(--spacing-sm) var(--spacing-md);
  font-family: var(--font-family);
  font-size: var(--font-size-md);
  cursor: pointer;
  transition: all 0.2s ease;
  width: ${size.width}px;
  height: ${size.height}px;
}

.${className}:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}

.${className}:active {
  transform: translateY(0);
}

.${className}:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.${className}--secondary {
  background: var(--color-secondary);
}
`;

    return { jsx, css };
  }

  /**
   * Exports design tokens in various formats
   */
  async exportDesignTokens(designData) {
    console.log('🎨 Exporting design tokens...');

    const { designTokens } = designData;

    // CSS Custom Properties
    const cssTokens = this.generateCSSTokens(designTokens);
    const cssPath = path.join(this.outputDir, 'tokens', 'design-tokens.css');
    fs.writeFileSync(cssPath, cssTokens);

    // JSON format
    const jsonPath = path.join(this.outputDir, 'tokens', 'design-tokens.json');
    fs.writeFileSync(jsonPath, JSON.stringify(designTokens, null, 2));

    // Sass variables
    const sassTokens = this.generateSassTokens(designTokens);
    const sassPath = path.join(this.outputDir, 'tokens', 'design-tokens.scss');
    fs.writeFileSync(sassPath, sassTokens);

    console.log('   ✓ Exported design tokens in CSS, JSON, and Sass formats');
  }

  /**
   * Generates CSS custom properties from design tokens
   */
  generateCSSTokens(tokens) {
    let css = ':root {\n';

    // Colors
    if (tokens.colors) {
      css += '  /* Colors */\n';
      Object.entries(tokens.colors).forEach(([name, value]) => {
        css += `  --color-${name}: ${value};\n`;
      });
      css += '\n';
    }

    // Spacing
    if (tokens.spacing) {
      css += '  /* Spacing */\n';
      Object.entries(tokens.spacing).forEach(([name, value]) => {
        css += `  --spacing-${name}: ${value}px;\n`;
      });
      css += '\n';
    }

    // Typography
    if (tokens.typography) {
      css += '  /* Typography */\n';
      Object.entries(tokens.typography).forEach(([name, value]) => {
        if (typeof value === 'object') {
          Object.entries(value).forEach(([subName, subValue]) => {
            css += `  --${name}-${subName}: ${subValue};\n`;
          });
        } else {
          css += `  --${name}: ${value};\n`;
        }
      });
    }

    css += '}\n';
    return css;
  }

  /**
   * Generates Sass variables from design tokens
   */
  generateSassTokens(tokens) {
    let sass = '// Design Tokens\n\n';

    // Colors
    if (tokens.colors) {
      sass += '// Colors\n';
      Object.entries(tokens.colors).forEach(([name, value]) => {
        sass += `$color-${name}: ${value};\n`;
      });
      sass += '\n';
    }

    // Spacing
    if (tokens.spacing) {
      sass += '// Spacing\n';
      Object.entries(tokens.spacing).forEach(([name, value]) => {
        sass += `$spacing-${name}: ${value}px;\n`;
      });
      sass += '\n';
    }

    return sass;
  }

  /**
   * Exports Figma design tokens
   */
  async exportFigmaTokens(designData) {
    console.log('🎭 Exporting Figma tokens...');

    const { designTokens, colorPalette } = designData;

    const figmaTokens = {
      "global": {
        "colors": {},
        "spacing": {},
        "typography": {}
      }
    };

    // Convert colors
    if (colorPalette) {
      colorPalette.forEach(color => {
        figmaTokens.global.colors[color.name.toLowerCase()] = {
          "value": color.color,
          "type": "color",
          "description": color.usage
        };
      });
    }

    // Convert spacing
    if (designTokens.spacing) {
      Object.entries(designTokens.spacing).forEach(([name, value]) => {
        figmaTokens.global.spacing[name] = {
          "value": `${value}px`,
          "type": "spacing"
        };
      });
    }

    // Convert typography
    if (designTokens.typography) {
      Object.entries(designTokens.typography).forEach(([name, value]) => {
        figmaTokens.global.typography[name] = {
          "value": value,
          "type": "typography"
        };
      });
    }

    const figmaPath = path.join(this.outputDir, 'tokens', 'figma-tokens.json');
    fs.writeFileSync(figmaPath, JSON.stringify(figmaTokens, null, 2));

    console.log('   ✓ Exported Figma design tokens');
  }

  /**
   * Prints export summary
   */
  printExportSummary() {
    console.log(`
📁 Export Summary:

SVG Files: ${this.outputDir}/svg/
PNG Files: ${this.outputDir}/png/
Components: ${this.componentsDir}/
Design Tokens: ${this.outputDir}/tokens/

Generated files:
- full-canvas.svg/png (complete design)
- element-*.svg/png (individual elements)
- Button*.jsx/css (React components)
- design-tokens.css/scss/json (design tokens)
- figma-tokens.json (Figma compatible tokens)

Import components:
import { Button1 } from './src/design/components/Button1';

Use design tokens:
@import './src/design/exports/tokens/design-tokens.css';
`);
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];

  if (command === 'batch') {
    // Run batch export
    const VDSBatchExporter = require('./vds-batch-export.js');
    const batchExporter = new VDSBatchExporter();
    batchExporter.batchExport().catch(console.error);
  } else if (command === 'design-system') {
    // Generate complete design system
    const VDSDesignSystemGenerator = require('./vds-design-system.js');
    const generator = new VDSDesignSystemGenerator();
    generator.generateDesignSystem().catch(console.error);
  } else if (command === 'pipeline') {
    // Start asset pipeline
    const VDSAssetPipeline = require('./vds-pipeline.js');
    const pipeline = new VDSAssetPipeline();
    pipeline.start().catch(console.error);
  } else {
    // Standard export
    const options = {};

    // Parse CLI arguments
    args.forEach(arg => {
      if (arg === '--no-svg') options.svg = false;
      if (arg === '--no-png') options.png = false;
      if (arg === '--no-components') options.components = false;
      if (arg === '--no-tokens') options.tokens = false;
      if (arg === '--no-figma') options.figma = false;
    });

    if (args.length === 0 || args.includes('--help')) {
      console.log(`
🎨 VDS Export Utility

Usage:
  node vds-export.js [command] [options]

Commands:
  (default)        # Standard export (SVG, PNG, components, tokens)
  batch           # Batch export with optimization and multiple formats
  design-system   # Generate complete design system package
  pipeline        # Start automated asset pipeline

Options:
  --no-svg        # Skip SVG export
  --no-png        # Skip PNG export
  --no-components # Skip component generation
  --no-tokens     # Skip design tokens
  --no-figma      # Skip Figma tokens

Examples:
  node vds-export.js                    # Export everything
  node vds-export.js --no-png          # Export without PNG files
  node vds-export.js batch             # Run batch export
  node vds-export.js design-system     # Generate design system
  node vds-export.js pipeline          # Start watching for changes
`);
      process.exit(0);
    }

    const exporter = new VDSExporter();
    exporter.export(options).catch(console.error);
  }
}

module.exports = VDSExporter;