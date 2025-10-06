#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');
const VDSBatchExporter = require('./vds-batch-export.js');

/**
 * VDS Asset Pipeline
 * Automated asset pipeline that watches for design changes and triggers exports
 */
class VDSAssetPipeline {
  constructor(projectPath = process.cwd()) {
    this.projectPath = projectPath;
    this.batchExporter = new VDSBatchExporter(projectPath);
    this.designDataPath = path.join(projectPath, 'src/design/design-data.json');
    this.configPath = path.join(projectPath, 'vds-pipeline.config.json');
    this.isRunning = false;
    this.debounceTimer = null;
  }

  /**
   * Starts the automated asset pipeline
   */
  async start(options = {}) {
    console.log('🚀 Starting VDS Asset Pipeline...\n');

    try {
      // Load pipeline configuration
      const config = this.loadPipelineConfig();
      
      // Merge options with config
      this.config = { ...config, ...options };

      // Setup file watchers
      this.setupWatchers();

      // Setup build hooks
      this.setupBuildHooks();

      // Initial export if configured
      if (this.config.initialExport) {
        await this.runPipeline('initial');
      }

      this.isRunning = true;
      console.log('✅ VDS Asset Pipeline is running');
      console.log('   Watching for design changes...');
      console.log('   Press Ctrl+C to stop\n');

      // Keep process alive
      process.on('SIGINT', () => {
        this.stop();
      });

    } catch (error) {
      console.error('❌ Pipeline startup failed:', error.message);
      process.exit(1);
    }
  }

  /**
   * Stops the asset pipeline
   */
  stop() {
    console.log('\n🛑 Stopping VDS Asset Pipeline...');
    
    this.isRunning = false;
    
    if (this.designWatcher) {
      this.designWatcher.close();
    }
    
    if (this.codeWatcher) {
      this.codeWatcher.close();
    }

    console.log('✅ Pipeline stopped');
    process.exit(0);
  }

  /**
   * Loads pipeline configuration
   */
  loadPipelineConfig() {
    const defaultConfig = {
      watch: {
        designData: true,
        components: true,
        styles: true,
        debounceMs: 1000
      },
      triggers: {
        onDesignChange: ['export-assets', 'generate-components'],
        onComponentChange: ['update-exports'],
        onStyleChange: ['regenerate-tokens'],
        onBuild: ['export-all', 'optimize-assets']
      },
      export: {
        formats: ['svg', 'png'],
        components: true,
        tokens: true,
        optimization: true
      },
      buildIntegration: {
        webpack: false,
        vite: false,
        nextjs: false,
        copyToPublic: true
      },
      notifications: {
        console: true,
        desktop: false,
        webhook: null
      },
      initialExport: false
    };

    let config = defaultConfig;

    if (fs.existsSync(this.configPath)) {
      const userConfig = JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
      config = this.mergeDeep(config, userConfig);
    }

    return config;
  }

  /**
   * Sets up file watchers for different file types
   */
  setupWatchers() {
    // Watch design data changes
    if (this.config.watch.designData) {
      this.designWatcher = chokidar.watch(this.designDataPath, {
        persistent: true,
        ignoreInitial: true
      });

      this.designWatcher.on('change', () => {
        this.debounceExecution(() => {
          this.handleDesignChange();
        });
      });
    }

    // Watch component changes
    if (this.config.watch.components) {
      const componentsPath = path.join(this.projectPath, 'src/design/components');
      
      if (fs.existsSync(componentsPath)) {
        this.codeWatcher = chokidar.watch(path.join(componentsPath, '**/*'), {
          persistent: true,
          ignoreInitial: true
        });

        this.codeWatcher.on('change', (filePath) => {
          this.debounceExecution(() => {
            this.handleComponentChange(filePath);
          });
        });
      }
    }

    // Watch style changes
    if (this.config.watch.styles) {
      const stylesPath = path.join(this.projectPath, 'src/**/*.css');
      
      this.styleWatcher = chokidar.watch(stylesPath, {
        persistent: true,
        ignoreInitial: true
      });

      this.styleWatcher.on('change', (filePath) => {
        this.debounceExecution(() => {
          this.handleStyleChange(filePath);
        });
      });
    }
  }

  /**
   * Sets up build system hooks
   */
  setupBuildHooks() {
    // Check for package.json scripts and hook into them
    const packageJsonPath = path.join(this.projectPath, 'package.json');
    
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      
      // Add pre-build hook if not exists
      if (packageJson.scripts && !packageJson.scripts['prebuild']) {
        packageJson.scripts['prebuild'] = 'node scripts/vds-pipeline.js --build-hook';
        fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
        console.log('🔗 Added pre-build hook to package.json');
      }
    }
  }

  /**
   * Handles design data changes
   */
  async handleDesignChange() {
    console.log('🎨 Design change detected, running pipeline...');
    
    const triggers = this.config.triggers.onDesignChange;
    await this.runPipeline('design-change', triggers);
  }

  /**
   * Handles component file changes
   */
  async handleComponentChange(filePath) {
    console.log(`⚛️  Component change detected: ${path.basename(filePath)}`);
    
    const triggers = this.config.triggers.onComponentChange;
    await this.runPipeline('component-change', triggers);
  }

  /**
   * Handles style file changes
   */
  async handleStyleChange(filePath) {
    console.log(`🎨 Style change detected: ${path.basename(filePath)}`);
    
    const triggers = this.config.triggers.onStyleChange;
    await this.runPipeline('style-change', triggers);
  }

  /**
   * Runs the pipeline with specified triggers
   */
  async runPipeline(source, triggers = []) {
    const startTime = Date.now();
    
    try {
      for (const trigger of triggers) {
        await this.executeTrigger(trigger, source);
      }

      const duration = Date.now() - startTime;
      this.notify(`Pipeline completed in ${duration}ms`, 'success');

    } catch (error) {
      console.error(`❌ Pipeline failed: ${error.message}`);
      this.notify(`Pipeline failed: ${error.message}`, 'error');
    }
  }

  /**
   * Executes a specific trigger action
   */
  async executeTrigger(trigger, source) {
    switch (trigger) {
      case 'export-assets':
        await this.exportAssets();
        break;
      
      case 'generate-components':
        await this.generateComponents();
        break;
      
      case 'update-exports':
        await this.updateExports();
        break;
      
      case 'regenerate-tokens':
        await this.regenerateTokens();
        break;
      
      case 'export-all':
        await this.exportAll();
        break;
      
      case 'optimize-assets':
        await this.optimizeAssets();
        break;
      
      default:
        console.warn(`Unknown trigger: ${trigger}`);
    }
  }

  /**
   * Exports assets (SVG/PNG)
   */
  async exportAssets() {
    console.log('   📄 Exporting assets...');
    
    const options = {
      svg: this.config.export.formats.includes('svg'),
      png: this.config.export.formats.includes('png'),
      components: false,
      tokens: false
    };

    await this.batchExporter.batchExport(options);
  }

  /**
   * Generates components from designs
   */
  async generateComponents() {
    console.log('   ⚛️  Generating components...');
    
    const options = {
      svg: false,
      png: false,
      components: true,
      tokens: false
    };

    await this.batchExporter.batchExport(options);
  }

  /**
   * Updates existing exports
   */
  async updateExports() {
    console.log('   🔄 Updating exports...');
    
    // Re-export with current configuration
    await this.batchExporter.batchExport(this.config.export);
  }

  /**
   * Regenerates design tokens
   */
  async regenerateTokens() {
    console.log('   🎨 Regenerating design tokens...');
    
    const options = {
      svg: false,
      png: false,
      components: false,
      tokens: true
    };

    await this.batchExporter.batchExport(options);
  }

  /**
   * Exports everything
   */
  async exportAll() {
    console.log('   🚀 Exporting all assets...');
    
    await this.batchExporter.batchExport({
      ...this.config.export,
      svg: true,
      png: true,
      components: true,
      tokens: true
    });
  }

  /**
   * Optimizes exported assets
   */
  async optimizeAssets() {
    console.log('   ⚡ Optimizing assets...');
    
    const sharp = require('sharp');
    const outputDir = this.batchExporter.exporter.outputDir;

    // Optimize PNG files
    const pngDir = path.join(outputDir, 'png');
    if (fs.existsSync(pngDir)) {
      await this.optimizePNGFiles(pngDir);
    }

    // Optimize SVG files
    const svgDir = path.join(outputDir, 'svg');
    if (fs.existsSync(svgDir)) {
      await this.optimizeSVGFiles(svgDir);
    }
  }

  /**
   * Optimizes PNG files using Sharp
   */
  async optimizePNGFiles(directory) {
    const files = this.getAllFiles(directory, '.png');
    
    for (const file of files) {
      try {
        const optimized = await sharp(file)
          .png({ 
            quality: 90, 
            compressionLevel: 9,
            progressive: true
          })
          .toBuffer();
        
        fs.writeFileSync(file, optimized);
      } catch (error) {
        console.warn(`Failed to optimize ${file}: ${error.message}`);
      }
    }
  }

  /**
   * Optimizes SVG files
   */
  async optimizeSVGFiles(directory) {
    const files = this.getAllFiles(directory, '.svg');
    
    for (const file of files) {
      try {
        let content = fs.readFileSync(file, 'utf8');
        
        // Basic SVG optimization
        content = content.replace(/>\s+</g, '><'); // Remove whitespace between tags
        content = content.replace(/\s+/g, ' '); // Normalize whitespace
        content = content.replace(/<!--[\s\S]*?-->/g, ''); // Remove comments
        
        fs.writeFileSync(file, content);
      } catch (error) {
        console.warn(`Failed to optimize ${file}: ${error.message}`);
      }
    }
  }

  /**
   * Gets all files with specific extension recursively
   */
  getAllFiles(directory, extension) {
    const files = [];
    
    const scanDirectory = (dir) => {
      const items = fs.readdirSync(dir);
      
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          scanDirectory(fullPath);
        } else if (fullPath.endsWith(extension)) {
          files.push(fullPath);
        }
      }
    };

    if (fs.existsSync(directory)) {
      scanDirectory(directory);
    }

    return files;
  }

  /**
   * Debounces function execution
   */
  debounceExecution(fn) {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      fn();
    }, this.config.watch.debounceMs);
  }

  /**
   * Sends notifications
   */
  notify(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    
    if (this.config.notifications.console) {
      const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️';
      console.log(`${icon} [${timestamp}] ${message}`);
    }

    if (this.config.notifications.desktop) {
      // Desktop notification (would require additional setup)
      console.log(`Desktop notification: ${message}`);
    }

    if (this.config.notifications.webhook) {
      // Webhook notification (would require HTTP request)
      console.log(`Webhook notification: ${message}`);
    }
  }

  /**
   * Deep merges two objects
   */
  mergeDeep(target, source) {
    const output = Object.assign({}, target);
    
    if (this.isObject(target) && this.isObject(source)) {
      Object.keys(source).forEach(key => {
        if (this.isObject(source[key])) {
          if (!(key in target)) {
            Object.assign(output, { [key]: source[key] });
          } else {
            output[key] = this.mergeDeep(target[key], source[key]);
          }
        } else {
          Object.assign(output, { [key]: source[key] });
        }
      });
    }
    
    return output;
  }

  /**
   * Checks if value is an object
   */
  isObject(item) {
    return item && typeof item === 'object' && !Array.isArray(item);
  }

  /**
   * Creates default pipeline configuration file
   */
  createDefaultConfig() {
    const config = this.loadPipelineConfig();
    fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2));
    console.log(`📄 Created default pipeline config: ${this.configPath}`);
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];

  const pipeline = new VDSAssetPipeline();

  switch (command) {
    case 'start':
    case 'watch':
      pipeline.start().catch(console.error);
      break;
    
    case 'run':
      pipeline.runPipeline('manual', ['export-all']).then(() => {
        console.log('✅ Manual pipeline run completed');
        process.exit(0);
      }).catch(console.error);
      break;
    
    case 'config':
      pipeline.createDefaultConfig();
      break;
    
    case '--build-hook':
      // Called from build process
      pipeline.runPipeline('build', ['export-all', 'optimize-assets']).then(() => {
        process.exit(0);
      }).catch(() => {
        process.exit(1);
      });
      break;
    
    default:
      console.log(`
🚀 VDS Asset Pipeline

Usage:
  node vds-pipeline.js start     # Start watching for changes
  node vds-pipeline.js run       # Run pipeline once
  node vds-pipeline.js config    # Create default config file

The pipeline automatically:
- Watches for design changes
- Exports assets in multiple formats
- Generates components from designs
- Optimizes assets for production
- Integrates with build systems
`);
  }
}

module.exports = VDSAssetPipeline;