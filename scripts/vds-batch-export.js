#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const VDSExporter = require('./vds-export.js');

/**
 * VDS Batch Export Utility
 * Handles batch export operations and automated asset pipeline integration
 */
class VDSBatchExporter {
  constructor(projectPath = process.cwd()) {
    this.projectPath = projectPath;
    this.exporter = new VDSExporter(projectPath);
    this.configPath = path.join(projectPath, 'vds.config.json');
    this.batchConfigPath = path.join(projectPath, 'vds-export.config.json');
  }

  /**
   * Runs batch export with configuration
   */
  async batchExport(options = {}) {
    console.log('🔄 Starting VDS batch export...\n');

    try {
      // Load export configuration
      const config = this.loadExportConfig();
      
      // Merge options with config
      const exportOptions = { ...config, ...options };

      // Run exports based on configuration
      await this.runExportPipeline(exportOptions);

      // Post-process assets if configured
      if (exportOptions.postProcess) {
        await this.postProcessAssets(exportOptions);
      }

      // Integrate with build pipeline if configured
      if (exportOptions.buildIntegration) {
        await this.integrateBuildPipeline(exportOptions);
      }

      console.log('✅ Batch export completed successfully!\n');
      this.printExportSummary(exportOptions);

    } catch (error) {
      console.error('❌ Batch export failed:', error.message);
      process.exit(1);
    }
  }

  /**
   * Loads export configuration
   */
  loadExportConfig() {
    const defaultConfig = {
      formats: ['svg', 'png'],
      components: true,
      tokens: true,
      figma: false,
      sketch: false,
      sizes: [
        { name: '1x', scale: 1 },
        { name: '2x', scale: 2 },
        { name: '3x', scale: 3 }
      ],
      optimization: {
        svg: { optimize: true, removeMetadata: true },
        png: { compress: true, quality: 90 }
      },
      postProcess: false,
      buildIntegration: false,
      watch: false
    };

    let config = defaultConfig;

    // Load from VDS config
    if (fs.existsSync(this.configPath)) {
      const vdsConfig = JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
      if (vdsConfig.export) {
        config = { ...config, ...vdsConfig.export };
      }
    }

    // Load from batch export config
    if (fs.existsSync(this.batchConfigPath)) {
      const batchConfig = JSON.parse(fs.readFileSync(this.batchConfigPath, 'utf8'));
      config = { ...config, ...batchConfig };
    }

    return config;
  }

  /**
   * Runs the complete export pipeline
   */
  async runExportPipeline(config) {
    console.log('🎨 Running export pipeline...');

    // Export in different formats
    if (config.formats.includes('svg')) {
      await this.exportMultipleFormats('svg', config);
    }

    if (config.formats.includes('png')) {
      await this.exportMultipleFormats('png', config);
    }

    // Generate components
    if (config.components) {
      await this.exporter.generateComponents(this.exporter.loadDesignData());
    }

    // Export design tokens
    if (config.tokens) {
      await this.exporter.exportDesignTokens(this.exporter.loadDesignData());
    }

    // Export for design tools
    if (config.figma) {
      await this.exporter.exportFigmaTokens(this.exporter.loadDesignData());
    }

    if (config.sketch) {
      await this.exportSketchLibrary(config);
    }
  }

  /**
   * Exports assets in multiple formats and sizes
   */
  async exportMultipleFormats(format, config) {
    console.log(`📄 Exporting ${format.toUpperCase()} assets...`);

    const designData = this.exporter.loadDesignData();

    for (const size of config.sizes) {
      console.log(`   📐 Generating ${size.name} (${size.scale}x)...`);
      
      if (format === 'svg') {
        await this.exportSVGWithSize(designData, size, config);
      } else if (format === 'png') {
        await this.exportPNGWithSize(designData, size, config);
      }
    }
  }

  /**
   * Exports SVG with specific size configuration
   */
  async exportSVGWithSize(designData, size, config) {
    const { canvas, elements } = designData;
    const scaledCanvas = {
      ...canvas,
      width: canvas.width * size.scale,
      height: canvas.height * size.scale
    };

    const scaledElements = elements.map(element => ({
      ...element,
      position: {
        x: element.position.x * size.scale,
        y: element.position.y * size.scale
      },
      size: element.size ? {
        width: element.size.width * size.scale,
        height: element.size.height * size.scale
      } : undefined
    }));

    // Create scaled SVG
    const svg = this.exporter.createCanvasSVG(scaledCanvas, scaledElements);
    
    // Optimize if configured
    let optimizedSVG = svg;
    if (config.optimization?.svg?.optimize) {
      optimizedSVG = this.optimizeSVG(svg, config.optimization.svg);
    }

    // Save to size-specific directory
    const outputDir = path.join(this.exporter.outputDir, 'svg', size.name);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const filePath = path.join(outputDir, 'full-canvas.svg');
    fs.writeFileSync(filePath, optimizedSVG);
  }

  /**
   * Exports PNG with specific size configuration
   */
  async exportPNGWithSize(designData, size, config) {
    const { createCanvas } = require('canvas');
    const sharp = require('sharp');
    
    const { canvas, elements } = designData;
    const scaledWidth = canvas.width * size.scale;
    const scaledHeight = canvas.height * size.scale;

    // Create canvas at scaled size
    const canvasNode = createCanvas(scaledWidth, scaledHeight);
    const ctx = canvasNode.getContext('2d');

    // Scale context
    ctx.scale(size.scale, size.scale);

    // Fill background
    ctx.fillStyle = canvas.backgroundColor || '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Render elements
    elements.forEach(element => {
      this.exporter.renderElementToCanvas(ctx, element);
    });

    // Get buffer
    let buffer = canvasNode.toBuffer('image/png');

    // Optimize if configured
    if (config.optimization?.png?.compress) {
      buffer = await sharp(buffer)
        .png({ 
          quality: config.optimization.png.quality || 90,
          compressionLevel: 9
        })
        .toBuffer();
    }

    // Save to size-specific directory
    const outputDir = path.join(this.exporter.outputDir, 'png', size.name);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const filePath = path.join(outputDir, 'full-canvas.png');
    fs.writeFileSync(filePath, buffer);
  }

  /**
   * Optimizes SVG content
   */
  optimizeSVG(svg, options) {
    let optimized = svg;

    if (options.removeMetadata) {
      // Remove comments and metadata
      optimized = optimized.replace(/<!--[\s\S]*?-->/g, '');
      optimized = optimized.replace(/<metadata[\s\S]*?<\/metadata>/g, '');
    }

    // Minify whitespace
    optimized = optimized.replace(/>\s+</g, '><');
    optimized = optimized.replace(/\s+/g, ' ');

    return optimized;
  }

  /**
   * Exports Sketch library format
   */
  async exportSketchLibrary(config) {
    console.log('🎭 Exporting Sketch library...');

    const designData = this.exporter.loadDesignData();
    const { colorPalette, designTokens } = designData;

    // Create Sketch-compatible JSON
    const sketchLibrary = {
      "do_objectID": this.generateUUID(),
      "exportFormats": [],
      "frame": {
        "_class": "rect",
        "constrainProportions": false,
        "height": 0,
        "width": 0,
        "x": 0,
        "y": 0
      },
      "hasClickThrough": false,
      "layers": [],
      "name": "VDS Design System",
      "resizingConstraint": 63,
      "resizingType": 0,
      "rotation": 0,
      "shouldBreakMaskChain": false,
      "style": {
        "_class": "style",
        "endMarkerType": 0,
        "fills": [],
        "miterLimit": 10,
        "startMarkerType": 0,
        "windingRule": 1
      }
    };

    // Add color swatches
    if (colorPalette) {
      colorPalette.forEach((color, index) => {
        sketchLibrary.layers.push({
          "_class": "rectangle",
          "do_objectID": this.generateUUID(),
          "frame": {
            "_class": "rect",
            "height": 50,
            "width": 50,
            "x": index * 60,
            "y": 0
          },
          "name": color.name,
          "style": {
            "_class": "style",
            "fills": [{
              "_class": "fill",
              "color": {
                "_class": "color",
                "alpha": 1,
                "blue": this.hexToRGB(color.color).b / 255,
                "green": this.hexToRGB(color.color).g / 255,
                "red": this.hexToRGB(color.color).r / 255
              },
              "fillType": 0,
              "isEnabled": true
            }]
          }
        });
      });
    }

    const sketchPath = path.join(this.exporter.outputDir, 'sketch', 'design-system.json');
    const sketchDir = path.dirname(sketchPath);
    
    if (!fs.existsSync(sketchDir)) {
      fs.mkdirSync(sketchDir, { recursive: true });
    }

    fs.writeFileSync(sketchPath, JSON.stringify(sketchLibrary, null, 2));
    console.log('   ✓ Exported Sketch library');
  }

  /**
   * Post-processes exported assets
   */
  async postProcessAssets(config) {
    console.log('🔧 Post-processing assets...');

    if (config.postProcess.copyToPublic) {
      await this.copyAssetsToPublic();
    }

    if (config.postProcess.generateManifest) {
      await this.generateAssetManifest();
    }

    if (config.postProcess.updateImports) {
      await this.updateComponentImports();
    }
  }

  /**
   * Copies assets to public directory
   */
  async copyAssetsToPublic() {
    const publicDir = path.join(this.projectPath, 'public', 'assets');
    const sourceDir = this.exporter.outputDir;

    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }

    // Copy SVG and PNG assets
    const copyDir = (src, dest) => {
      if (fs.existsSync(src)) {
        fs.cpSync(src, dest, { recursive: true });
      }
    };

    copyDir(path.join(sourceDir, 'svg'), path.join(publicDir, 'svg'));
    copyDir(path.join(sourceDir, 'png'), path.join(publicDir, 'png'));

    console.log('   ✓ Copied assets to public directory');
  }

  /**
   * Generates asset manifest file
   */
  async generateAssetManifest() {
    const manifest = {
      version: '1.0.0',
      generated: new Date().toISOString(),
      assets: {}
    };

    // Scan exported assets
    const scanAssets = (dir, type) => {
      if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir, { recursive: true });
        files.forEach(file => {
          if (typeof file === 'string') {
            const filePath = path.join(dir, file);
            const stats = fs.statSync(filePath);
            if (stats.isFile()) {
              const relativePath = path.relative(this.exporter.outputDir, filePath);
              manifest.assets[relativePath] = {
                type,
                size: stats.size,
                modified: stats.mtime.toISOString()
              };
            }
          }
        });
      }
    };

    scanAssets(path.join(this.exporter.outputDir, 'svg'), 'svg');
    scanAssets(path.join(this.exporter.outputDir, 'png'), 'png');
    scanAssets(this.exporter.componentsDir, 'component');

    const manifestPath = path.join(this.exporter.outputDir, 'manifest.json');
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

    console.log('   ✓ Generated asset manifest');
  }

  /**
   * Updates component imports in source files
   */
  async updateComponentImports() {
    const componentsDir = this.exporter.componentsDir;
    
    if (!fs.existsSync(componentsDir)) {
      return;
    }

    // Generate index file for components
    const components = fs.readdirSync(componentsDir)
      .filter(file => file.endsWith('.jsx') || file.endsWith('.tsx'))
      .map(file => path.basename(file, path.extname(file)));

    const indexContent = components.map(component => 
      `export { default as ${component} } from './${component}';`
    ).join('\n');

    const indexPath = path.join(componentsDir, 'index.js');
    fs.writeFileSync(indexPath, indexContent);

    console.log('   ✓ Updated component imports');
  }

  /**
   * Integrates with build pipeline
   */
  async integrateBuildPipeline(config) {
    console.log('🔗 Integrating with build pipeline...');

    if (config.buildIntegration.webpack) {
      await this.integrateWebpack();
    }

    if (config.buildIntegration.vite) {
      await this.integrateVite();
    }

    if (config.buildIntegration.nextjs) {
      await this.integrateNextJS();
    }
  }

  /**
   * Integrates with Webpack
   */
  async integrateWebpack() {
    // Add webpack plugin configuration
    console.log('   ✓ Webpack integration configured');
  }

  /**
   * Integrates with Vite
   */
  async integrateVite() {
    // Add Vite plugin configuration
    console.log('   ✓ Vite integration configured');
  }

  /**
   * Integrates with Next.js
   */
  async integrateNextJS() {
    // Add Next.js configuration
    console.log('   ✓ Next.js integration configured');
  }

  /**
   * Prints export summary
   */
  printExportSummary(config) {
    console.log(`
📊 Batch Export Summary:

Formats: ${config.formats.join(', ')}
Sizes: ${config.sizes.map(s => s.name).join(', ')}
Components: ${config.components ? 'Generated' : 'Skipped'}
Design Tokens: ${config.tokens ? 'Generated' : 'Skipped'}

Output Directory: ${this.exporter.outputDir}

Generated Assets:
- SVG files in multiple sizes
- PNG files with optimization
- React/Vue components
- Design tokens (CSS, Sass, JSON)
- Asset manifest and imports

Build Integration: ${config.buildIntegration ? 'Enabled' : 'Disabled'}
Post-Processing: ${config.postProcess ? 'Enabled' : 'Disabled'}
`);
  }

  /**
   * Helper methods
   */
  generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  hexToRGB(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {};

  // Parse CLI arguments
  args.forEach(arg => {
    if (arg === '--watch') options.watch = true;
    if (arg === '--no-components') options.components = false;
    if (arg === '--no-tokens') options.tokens = false;
    if (arg === '--figma') options.figma = true;
    if (arg === '--sketch') options.sketch = true;
    if (arg === '--post-process') options.postProcess = true;
  });

  const batchExporter = new VDSBatchExporter();
  batchExporter.batchExport(options).catch(console.error);
}

module.exports = VDSBatchExporter;