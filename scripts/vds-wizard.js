#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

/**
 * VDS Setup Wizard
 * Interactive setup wizard for first-time VDS users with guided configuration
 */
class VDSWizard {
  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    this.config = {
      projectType: null,
      framework: null,
      features: [],
      syncPort: 3001,
      autoStart: true,
      tabletSupport: true
    };
  }

  /**
   * Starts the interactive setup wizard
   */
  async start() {
    console.log(`
🎨 Welcome to Visual Design Sync (VDS) Setup Wizard!

This wizard will help you configure VDS for your project.
VDS enables real-time synchronization between visual design and code.

Let's get started! 🚀
`);

    try {
      await this.detectProject();
      await this.selectFramework();
      await this.selectFeatures();
      await this.configureSettings();
      await this.confirmSetup();
      await this.runSetup();
      
      console.log('\n✅ VDS setup completed successfully!');
      this.printNextSteps();
      
    } catch (error) {
      console.error('\n❌ Setup failed:', error.message);
    } finally {
      this.rl.close();
    }
  }

  /**
   * Detects existing project type
   */
  async detectProject() {
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      
      console.log(`📦 Detected existing project: ${packageJson.name || 'Unknown'}`);
      
      // Detect framework from dependencies
      const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
      
      if (deps.react) {
        this.config.framework = 'react';
        console.log('⚛️  Detected React framework');
      } else if (deps.next) {
        this.config.framework = 'nextjs';
        console.log('🔺 Detected Next.js framework');
      } else if (deps.vue) {
        this.config.framework = 'vue';
        console.log('💚 Detected Vue.js framework');
      }
      
      this.config.projectType = 'existing';
    } else {
      console.log('📁 No existing project detected');
      this.config.projectType = 'new';
    }
  }

  /**
   * Framework selection
   */
  async selectFramework() {
    if (this.config.framework) {
      const useDetected = await this.ask(`Use detected framework (${this.config.framework})? (y/n): `);
      if (useDetected.toLowerCase() !== 'y') {
        this.config.framework = null;
      }
    }

    if (!this.config.framework) {
      console.log('\n🔧 Select your framework:');
      console.log('1. React');
      console.log('2. Next.js');
      console.log('3. Vue.js');
      console.log('4. Vanilla JavaScript');
      console.log('5. Other/Custom');

      const choice = await this.ask('Enter your choice (1-5): ');
      
      switch (choice) {
        case '1':
          this.config.framework = 'react';
          break;
        case '2':
          this.config.framework = 'nextjs';
          break;
        case '3':
          this.config.framework = 'vue';
          break;
        case '4':
          this.config.framework = 'vanilla';
          break;
        case '5':
          this.config.framework = 'custom';
          break;
        default:
          throw new Error('Invalid framework selection');
      }
    }

    console.log(`✅ Framework: ${this.config.framework}`);
  }

  /**
   * Feature selection
   */
  async selectFeatures() {
    console.log('\n🎨 Select VDS features to enable:');
    
    const features = [
      { key: 'canvas', name: 'Drawing Canvas', description: 'Visual design canvas with tablet support' },
      { key: 'sync', name: 'Three-Way Sync', description: 'Real-time sync between canvas, code, and browser' },
      { key: 'components', name: 'Component Generation', description: 'Generate React/Vue components from designs' },
      { key: 'tokens', name: 'Design Tokens', description: 'CSS custom properties and design system tokens' },
      { key: 'export', name: 'Asset Export', description: 'Export designs as SVG/PNG and component libraries' },
      { key: 'devtools', name: 'DevTools Integration', description: 'Chrome DevTools and React DevTools sync' }
    ];

    for (const feature of features) {
      const enable = await this.ask(`Enable ${feature.name}? (${feature.description}) (y/n): `);
      if (enable.toLowerCase() === 'y') {
        this.config.features.push(feature.key);
      }
    }

    console.log(`✅ Selected features: ${this.config.features.join(', ')}`);
  }

  /**
   * Configuration settings
   */
  async configureSettings() {
    console.log('\n⚙️  Configure VDS settings:');

    // Sync server port
    const port = await this.ask(`Sync server port (default: ${this.config.syncPort}): `);
    if (port && !isNaN(port)) {
      this.config.syncPort = parseInt(port);
    }

    // Auto-start sync server
    const autoStart = await this.ask('Auto-start sync server with development? (y/n): ');
    this.config.autoStart = autoStart.toLowerCase() === 'y';

    // Tablet support
    if (this.config.features.includes('canvas')) {
      const tabletSupport = await this.ask('Enable tablet/stylus support (Wacom, Apple Pencil)? (y/n): ');
      this.config.tabletSupport = tabletSupport.toLowerCase() === 'y';
    }

    console.log('✅ Configuration completed');
  }

  /**
   * Confirmation before setup
   */
  async confirmSetup() {
    console.log('\n📋 Setup Summary:');
    console.log(`Project Type: ${this.config.projectType}`);
    console.log(`Framework: ${this.config.framework}`);
    console.log(`Features: ${this.config.features.join(', ')}`);
    console.log(`Sync Port: ${this.config.syncPort}`);
    console.log(`Auto-start: ${this.config.autoStart ? 'Yes' : 'No'}`);
    console.log(`Tablet Support: ${this.config.tabletSupport ? 'Yes' : 'No'}`);

    const confirm = await this.ask('\nProceed with setup? (y/n): ');
    if (confirm.toLowerCase() !== 'y') {
      throw new Error('Setup cancelled by user');
    }
  }

  /**
   * Runs the actual setup based on configuration
   */
  async runSetup() {
    console.log('\n🔧 Running VDS setup...');

    // Create VDS configuration
    await this.createVDSConfig();

    // Setup framework-specific files
    await this.setupFramework();

    // Install dependencies if needed
    await this.setupDependencies();

    // Create VS Code configuration
    await this.setupVSCode();

    console.log('🎨 VDS setup completed!');
  }

  /**
   * Creates VDS configuration file
   */
  async createVDSConfig() {
    const vdsConfig = {
      version: '1.0.0',
      framework: this.config.framework,
      features: this.config.features,
      sync: {
        port: this.config.syncPort,
        autoStart: this.config.autoStart
      },
      canvas: {
        tabletSupport: this.config.tabletSupport,
        pressureSensitivity: this.config.tabletSupport
      },
      export: {
        formats: ['svg', 'png'],
        components: this.config.features.includes('components'),
        tokens: this.config.features.includes('tokens')
      }
    };

    const configPath = path.join(process.cwd(), 'vds.config.json');
    fs.writeFileSync(configPath, JSON.stringify(vdsConfig, null, 2));
    console.log('   ✓ Created VDS configuration');
  }

  /**
   * Sets up framework-specific integration
   */
  async setupFramework() {
    const VDSSetup = require('./vds-setup.js');
    const setup = new VDSSetup();

    // Run basic setup
    setup.validateProject();
    setup.createDirectories();
    setup.setupPackageJson();
    setup.createSyncServer();
    setup.createDesignStructure();

    console.log('   ✓ Framework integration completed');
  }

  /**
   * Sets up project dependencies
   */
  async setupDependencies() {
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      
      // Add VDS-specific dependencies based on selected features
      if (!packageJson.devDependencies) {
        packageJson.devDependencies = {};
      }

      const baseDeps = {
        'concurrently': '^8.2.2',
        'ws': '^8.14.2',
        'chokidar': '^3.5.3'
      };

      if (this.config.features.includes('components') || this.config.features.includes('tokens')) {
        baseDeps['recast'] = '^0.23.4';
        baseDeps['@babel/parser'] = '^7.23.0';
      }

      if (this.config.features.includes('export')) {
        baseDeps['canvas'] = '^2.11.2';
        baseDeps['sharp'] = '^0.32.6';
      }

      Object.assign(packageJson.devDependencies, baseDeps);
      fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    }

    console.log('   ✓ Dependencies configured');
  }

  /**
   * Sets up VS Code workspace configuration
   */
  async setupVSCode() {
    const vscodeDir = path.join(process.cwd(), '.vscode');
    
    if (!fs.existsSync(vscodeDir)) {
      fs.mkdirSync(vscodeDir);
    }

    // VS Code settings
    const settings = {
      'vds.enabled': true,
      'vds.syncServer.autoStart': this.config.autoStart,
      'vds.syncServer.port': this.config.syncPort,
      'vds.canvas.tabletSupport': this.config.tabletSupport,
      'vds.canvas.pressureSensitivity': this.config.tabletSupport,
      'vds.features.components': this.config.features.includes('components'),
      'vds.features.tokens': this.config.features.includes('tokens'),
      'vds.features.export': this.config.features.includes('export'),
      'files.associations': {
        'vds.config.json': 'json',
        'design-data.json': 'json'
      }
    };

    const settingsPath = path.join(vscodeDir, 'settings.json');
    let existingSettings = {};
    
    if (fs.existsSync(settingsPath)) {
      existingSettings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    }

    const mergedSettings = { ...existingSettings, ...settings };
    fs.writeFileSync(settingsPath, JSON.stringify(mergedSettings, null, 2));

    console.log('   ✓ VS Code configuration created');
  }

  /**
   * Prints next steps for the user
   */
  printNextSteps() {
    console.log(`
🎉 VDS Setup Complete!

Your project is now configured for Visual Design Sync.

Next steps:
1. Install the VDS extension in VS Code
2. Run your development server:
   ${this.config.autoStart ? 'npm run dev:vds' : 'npm run dev (and npm run dev:sync in another terminal)'}
3. Open the VDS drawing canvas from VS Code Command Palette
4. Start designing visually!

Configuration saved to:
- vds.config.json (VDS settings)
- .vscode/settings.json (VS Code integration)
- package.json (updated with VDS scripts)

Available commands:
- npm run dev:sync     # Start VDS sync server
- npm run dev:vds      # Start development with VDS sync
- npm run vds:export   # Export designs as assets

Documentation: https://vds-docs.example.com
Support: https://github.com/vds/support

Happy designing! 🎨✨
`);
  }

  /**
   * Helper method for asking questions
   */
  ask(question) {
    return new Promise((resolve) => {
      this.rl.question(question, (answer) => {
        resolve(answer.trim());
      });
    });
  }
}

// CLI interface
if (require.main === module) {
  const wizard = new VDSWizard();
  wizard.start().catch(console.error);
}

module.exports = VDSWizard;