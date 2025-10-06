#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * VDS Setup Automation
 * Configures a project for Visual Design Sync with VS Code workspace settings,
 * dependencies, and sync server configuration
 */
class VDSSetup {
  constructor(projectPath = process.cwd()) {
    this.projectPath = projectPath;
    this.packageJsonPath = path.join(projectPath, 'package.json');
    this.vscodeDir = path.join(projectPath, '.vscode');
    this.scriptsDir = path.join(projectPath, 'scripts');
    this.srcDir = path.join(projectPath, 'src');
  }

  /**
   * Main setup function - runs the complete VDS project setup
   */
  async setup(options = {}) {
    console.log('🎨 Setting up Visual Design Sync (VDS) for your project...\n');

    try {
      // Check if this is a valid project directory
      this.validateProject();
      
      // Create necessary directories
      this.createDirectories();
      
      // Setup package.json with VDS scripts and dependencies
      this.setupPackageJson();
      
      // Create VS Code workspace configuration
      this.createVSCodeConfig();
      
      // Copy sync server template
      this.createSyncServer();
      
      // Create initial design data structure
      this.createDesignStructure();
      
      // Create project templates if requested
      if (options.createTemplates) {
        this.createProjectTemplates();
      }
      
      // Install dependencies unless skipped
      if (!options.skipInstall) {
        this.installDependencies();
      }
      
      console.log('✅ VDS setup complete!\n');
      this.printNextSteps();
      
    } catch (error) {
      console.error('❌ Setup failed:', error.message);
      process.exit(1);
    }
  }

  /**
   * Validates that this is a valid project directory
   */
  validateProject() {
    if (!fs.existsSync(this.packageJsonPath)) {
      throw new Error('No package.json found. Please run this in a Node.js project directory or run "npm init" first.');
    }
  }

  /**
   * Creates necessary directories for VDS
   */
  createDirectories() {
    const dirs = [
      this.vscodeDir,
      this.scriptsDir,
      path.join(this.srcDir, 'design'),
      path.join(this.srcDir, 'design', 'drawings'),
      path.join(this.srcDir, 'design', 'tokens'),
      path.join(this.srcDir, 'design', 'components')
    ];

    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`📁 Created directory: ${path.relative(this.projectPath, dir)}`);
      }
    });
  }

  /**
   * Updates package.json with VDS scripts and dependencies
   */
  setupPackageJson() {
    const packageJson = JSON.parse(fs.readFileSync(this.packageJsonPath, 'utf8'));
    
    // Add VDS scripts
    if (!packageJson.scripts) {
      packageJson.scripts = {};
    }

    const vdsScripts = {
      'dev:sync': 'node ./scripts/vds-sync-server.js',
      'dev:vds': 'concurrently "npm run dev" "npm run dev:sync"',
      'vds:setup': 'node ./scripts/vds-setup.js',
      'vds:export': 'node ./scripts/vds-export.js'
    };

    // Merge scripts, preserving existing ones
    Object.assign(packageJson.scripts, vdsScripts);

    // Add VDS dependencies
    if (!packageJson.devDependencies) {
      packageJson.devDependencies = {};
    }

    const vdsDependencies = {
      'concurrently': '^8.2.2',
      'ws': '^8.14.2',
      'chokidar': '^3.5.3',
      'recast': '^0.23.4',
      '@babel/parser': '^7.23.0',
      '@babel/traverse': '^7.23.0',
      'canvas': '^2.11.2',
      'sharp': '^0.32.6'
    };

    // Merge dependencies, preserving existing versions
    Object.keys(vdsDependencies).forEach(dep => {
      if (!packageJson.devDependencies[dep] && !packageJson.dependencies?.[dep]) {
        packageJson.devDependencies[dep] = vdsDependencies[dep];
      }
    });

    // Write updated package.json
    fs.writeFileSync(this.packageJsonPath, JSON.stringify(packageJson, null, 2));
    console.log('📦 Updated package.json with VDS scripts and dependencies');
  }

  /**
   * Creates VS Code workspace configuration for VDS
   */
  createVSCodeConfig() {
    // VS Code settings for VDS
    const settings = {
      "vds.enabled": true,
      "vds.syncServer.autoStart": true,
      "vds.syncServer.port": 3001,
      "vds.canvas.pressureSensitivity": true,
      "vds.canvas.tabletSupport": true,
      "vds.export.autoGenerate": true,
      "files.associations": {
        "design-data.json": "json",
        "*.vds": "json"
      },
      "emmet.includeLanguages": {
        "vds": "css"
      }
    };

    const settingsPath = path.join(this.vscodeDir, 'settings.json');
    let existingSettings = {};
    
    if (fs.existsSync(settingsPath)) {
      existingSettings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    }

    // Merge settings
    const mergedSettings = { ...existingSettings, ...settings };
    fs.writeFileSync(settingsPath, JSON.stringify(mergedSettings, null, 2));

    // VS Code tasks for VDS
    const tasks = {
      "version": "2.0.0",
      "tasks": [
        {
          "label": "Start VDS Sync Server",
          "type": "shell",
          "command": "npm",
          "args": ["run", "dev:sync"],
          "group": "build",
          "presentation": {
            "echo": true,
            "reveal": "always",
            "focus": false,
            "panel": "new"
          },
          "problemMatcher": []
        },
        {
          "label": "Start VDS Development",
          "type": "shell", 
          "command": "npm",
          "args": ["run", "dev:vds"],
          "group": {
            "kind": "build",
            "isDefault": true
          },
          "presentation": {
            "echo": true,
            "reveal": "always",
            "focus": false,
            "panel": "new"
          },
          "problemMatcher": []
        }
      ]
    };

    const tasksPath = path.join(this.vscodeDir, 'tasks.json');
    fs.writeFileSync(tasksPath, JSON.stringify(tasks, null, 2));

    // VS Code launch configuration for debugging
    const launch = {
      "version": "0.2.0",
      "configurations": [
        {
          "name": "Debug VDS Sync Server",
          "type": "node",
          "request": "launch",
          "program": "${workspaceFolder}/scripts/vds-sync-server.js",
          "console": "integratedTerminal",
          "env": {
            "NODE_ENV": "development"
          }
        }
      ]
    };

    const launchPath = path.join(this.vscodeDir, 'launch.json');
    fs.writeFileSync(launchPath, JSON.stringify(launch, null, 2));

    console.log('⚙️  Created VS Code workspace configuration');
  }

  /**
   * Creates the VDS sync server from template
   */
  createSyncServer() {
    const syncServerPath = path.join(this.scriptsDir, 'vds-sync-server.js');
    
    if (!fs.existsSync(syncServerPath)) {
      // Copy the existing sync server as template
      const templatePath = path.join(__dirname, 'vds-sync-server.js');
      if (fs.existsSync(templatePath)) {
        fs.copyFileSync(templatePath, syncServerPath);
      } else {
        // Create a basic sync server template
        this.createBasicSyncServer(syncServerPath);
      }
      console.log('🔄 Created VDS sync server');
    }
  }

  /**
   * Creates a basic sync server template if the main one doesn't exist
   */
  createBasicSyncServer(syncServerPath) {
    const syncServerTemplate = `const WebSocket = require('ws');
const chokidar = require('chokidar');
const fs = require('fs');
const path = require('path');

/**
 * VDS Sync Server - Coordinates three-way sync between canvas, code, and browser
 */
class VDSSyncServer {
  constructor(port = 3001) {
    this.port = port;
    this.wss = null;
    this.fileWatcher = null;
    this.designDataPath = path.join(process.cwd(), 'src/design/design-data.json');
  }

  start() {
    // Create WebSocket server
    this.wss = new WebSocket.Server({ port: this.port });
    
    this.wss.on('connection', (ws) => {
      console.log('VDS client connected');
      
      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message);
          this.handleMessage(data, ws);
        } catch (error) {
          console.error('Invalid message:', error);
        }
      });
      
      ws.on('close', () => {
        console.log('VDS client disconnected');
      });
    });

    // Watch for file changes
    this.setupFileWatcher();
    
    console.log(\`VDS Sync Server running on port \${this.port}\`);
  }

  handleMessage(data, ws) {
    // Handle different message types from canvas/editor
    switch (data.type) {
      case 'CANVAS_CHANGE':
        this.handleCanvasChange(data.payload);
        break;
      case 'CODE_CHANGE':
        this.handleCodeChange(data.payload);
        break;
      default:
        console.log('Unknown message type:', data.type);
    }
  }

  handleCanvasChange(payload) {
    // Update design data file
    this.updateDesignData(payload);
    
    // Broadcast to all clients
    this.broadcast({
      type: 'DESIGN_UPDATED',
      payload
    });
  }

  handleCodeChange(payload) {
    // Handle code changes and update canvas
    this.broadcast({
      type: 'CODE_UPDATED', 
      payload
    });
  }

  updateDesignData(data) {
    try {
      let designData = {};
      if (fs.existsSync(this.designDataPath)) {
        designData = JSON.parse(fs.readFileSync(this.designDataPath, 'utf8'));
      }
      
      // Merge new data
      Object.assign(designData, data);
      
      fs.writeFileSync(this.designDataPath, JSON.stringify(designData, null, 2));
    } catch (error) {
      console.error('Error updating design data:', error);
    }
  }

  setupFileWatcher() {
    this.fileWatcher = chokidar.watch(['src/**/*.css', 'src/**/*.js', 'src/**/*.jsx', 'src/**/*.ts', 'src/**/*.tsx'], {
      ignored: /node_modules/,
      persistent: true
    });

    this.fileWatcher.on('change', (filePath) => {
      console.log(\`File changed: \${filePath}\`);
      this.broadcast({
        type: 'FILE_CHANGED',
        payload: { filePath }
      });
    });
  }

  broadcast(message) {
    this.wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
      }
    });
  }

  stop() {
    if (this.fileWatcher) {
      this.fileWatcher.close();
    }
    if (this.wss) {
      this.wss.close();
    }
  }
}

// Start server if run directly
if (require.main === module) {
  const server = new VDSSyncServer();
  server.start();
  
  process.on('SIGINT', () => {
    console.log('Shutting down VDS sync server...');
    server.stop();
    process.exit(0);
  });
}

module.exports = VDSSyncServer;
`;

    fs.writeFileSync(syncServerPath, syncServerTemplate);
  }

  /**
   * Creates initial design data structure and files
   */
  createDesignStructure() {
    // Create initial design-data.json
    const designDataPath = path.join(this.srcDir, 'design', 'design-data.json');
    
    if (!fs.existsSync(designDataPath)) {
      const initialDesignData = {
        "version": "1.0.0",
        "canvas": {
          "width": 1920,
          "height": 1080,
          "backgroundColor": "#ffffff",
          "grid": { "size": 8, "visible": true }
        },
        "layers": [
          {
            "id": "layer_001",
            "name": "Background",
            "visible": true,
            "locked": false,
            "elements": []
          }
        ],
        "elements": [],
        "colorPalette": [
          { "name": "Primary", "color": "#007bff", "usage": "buttons" },
          { "name": "Secondary", "color": "#6c757d", "usage": "text" },
          { "name": "Success", "color": "#28a745", "usage": "success states" },
          { "name": "Warning", "color": "#ffc107", "usage": "warnings" },
          { "name": "Danger", "color": "#dc3545", "usage": "errors" }
        ],
        "designTokens": {
          "spacing": { "xs": 4, "sm": 8, "md": 16, "lg": 24, "xl": 32 },
          "colors": { 
            "primary": "#007bff", 
            "secondary": "#6c757d",
            "success": "#28a745",
            "warning": "#ffc107", 
            "danger": "#dc3545"
          },
          "typography": {
            "fontFamily": "system-ui, -apple-system, sans-serif",
            "fontSize": { "sm": 14, "md": 16, "lg": 18, "xl": 24 }
          }
        }
      };

      fs.writeFileSync(designDataPath, JSON.stringify(initialDesignData, null, 2));
    }

    // Create initial design tokens CSS
    const tokensPath = path.join(this.srcDir, 'design', 'tokens', 'design-tokens.css');
    
    if (!fs.existsSync(tokensPath)) {
      const tokensCSS = `:root {
  /* Colors */
  --color-primary: #007bff;
  --color-secondary: #6c757d;
  --color-success: #28a745;
  --color-warning: #ffc107;
  --color-danger: #dc3545;
  
  /* Spacing */
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --spacing-xl: 32px;
  
  /* Typography */
  --font-family: system-ui, -apple-system, sans-serif;
  --font-size-sm: 14px;
  --font-size-md: 16px;
  --font-size-lg: 18px;
  --font-size-xl: 24px;
}

/* VDS Generated Styles */
.vds-button {
  background: var(--color-primary);
  color: white;
  border: none;
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: 4px;
  font-family: var(--font-family);
  font-size: var(--font-size-md);
  cursor: pointer;
}

.vds-card {
  background: white;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: var(--spacing-md);
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}
`;

      fs.writeFileSync(tokensPath, tokensCSS);
    }

    console.log('🎨 Created initial design structure and tokens');
  }

  /**
   * Installs VDS dependencies
   */
  installDependencies() {
    console.log('📦 Installing VDS dependencies...');
    
    try {
      execSync('npm install', { 
        cwd: this.projectPath,
        stdio: 'inherit'
      });
      console.log('✅ Dependencies installed successfully');
    } catch (error) {
      console.warn('⚠️  Could not install dependencies automatically. Please run "npm install" manually.');
    }
  }

  /**
   * Creates project templates for different use cases
   */
  createProjectTemplates() {
    const templatesDir = path.join(this.scriptsDir, 'templates');
    
    if (!fs.existsSync(templatesDir)) {
      fs.mkdirSync(templatesDir, { recursive: true });
    }

    // Create component template
    const componentTemplate = `import React from 'react';
import { useVDS } from '../hooks/useVDS';
import './{{ComponentName}}.css';

interface {{ComponentName}}Props {
  children?: React.ReactNode;
  vdsId?: string;
  [key: string]: any;
}

export const {{ComponentName}}: React.FC<{{ComponentName}}Props> = ({ 
  children, 
  vdsId,
  ...props 
}) => {
  const { props: vdsProps } = useVDS(vdsId);
  
  return (
    <div 
      className="{{componentName}}"
      style={vdsProps.style}
      {...vdsProps}
      {...props}
    >
      {children}
    </div>
  );
};

export default {{ComponentName}};
`;

    fs.writeFileSync(path.join(templatesDir, 'Component.jsx.template'), componentTemplate);

    // Create CSS template
    const cssTemplate = `.{{componentName}} {
  /* Generated from VDS canvas */
  /* Edit these styles or modify in the visual canvas */
}
`;

    fs.writeFileSync(path.join(templatesDir, 'Component.css.template'), cssTemplate);

    console.log('📄 Created project templates');
  }

  /**
   * Prints next steps for the user
   */
  printNextSteps() {
    console.log(`
🎉 VDS Setup Complete!

Next steps:
1. Open VS Code in this directory
2. Install the VDS extension from the marketplace
3. Run "npm run dev:vds" to start development with sync
4. Open the VDS drawing canvas from the Command Palette (Ctrl/Cmd+Shift+P)

Available commands:
- npm run dev:sync     # Start sync server only
- npm run dev:vds      # Start your app + sync server
- npm run vds:export   # Export designs as assets
- npm run vds:setup    # Re-run setup wizard

Setup utilities:
- node scripts/vds-wizard.js    # Interactive setup wizard
- node scripts/vds-templates.js # Create new VDS projects
- node scripts/vds-export.js    # Export designs and components

Files created:
- .vscode/settings.json  # VS Code configuration
- .vscode/tasks.json     # Build tasks
- .vscode/launch.json    # Debug configuration
- scripts/vds-sync-server.js  # Sync server
- scripts/vds-export.js       # Export utility
- scripts/vds-wizard.js       # Setup wizard
- scripts/templates/          # Component templates
- src/design/design-data.json # Design data
- src/design/tokens/design-tokens.css # Design tokens

Happy designing! 🎨
`);
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {
    skipInstall: args.includes('--skip-install'),
    createTemplates: args.includes('--templates') || args.includes('--with-templates'),
    wizard: args.includes('--wizard') || args.includes('--interactive')
  };

  if (options.wizard) {
    // Run interactive wizard
    const VDSWizard = require('./vds-wizard.js');
    const wizard = new VDSWizard();
    wizard.start().catch(console.error);
  } else {
    // Run automated setup
    const setup = new VDSSetup();
    setup.setup(options).catch(console.error);
  }
}

module.exports = VDSSetup;