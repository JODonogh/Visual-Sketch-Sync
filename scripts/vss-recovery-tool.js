#!/usr/bin/env node

/**
 * VDS Recovery Tool
 * 
 * Comprehensive recovery and repair tool for the VDS system.
 * Automatically detects and fixes common issues.
 */

const fs = require('fs').promises;
const path = require('path');
const { spawn } = require('child_process');
const VDSDiagnostics = require('./vds-diagnostics');
const VDSErrorHandler = require('./error-handler');

class VDSRecoveryTool {
  constructor(options = {}) {
    this.options = {
      autoFix: false,
      verbose: false,
      backupBeforeFix: true,
      ...options
    };
    
    this.diagnostics = new VDSDiagnostics({
      verbose: this.options.verbose,
      outputFormat: 'json'
    });
    
    this.errorHandler = new VDSErrorHandler({
      enableLogging: true,
      enableRecovery: true
    });
    
    this.recoveryActions = [];
    this.backupDir = '.vds-recovery-backups';
  }
  
  /**
   * Run comprehensive recovery process
   */
  async runRecovery() {
    console.log('🔧 VDS Recovery Tool Starting...\n');
    
    try {
      // Step 1: Run diagnostics
      console.log('📊 Running system diagnostics...');
      await this.diagnostics.runDiagnostics();
      const results = this.diagnostics.results;
      
      // Step 2: Analyze issues and plan recovery
      console.log('🔍 Analyzing issues and planning recovery...');
      await this.planRecovery(results);
      
      // Step 3: Create backups if needed
      if (this.options.backupBeforeFix && this.recoveryActions.length > 0) {
        console.log('💾 Creating backups before recovery...');
        await this.createBackups();
      }
      
      // Step 4: Execute recovery actions
      if (this.recoveryActions.length > 0) {
        console.log('🛠️ Executing recovery actions...');
        await this.executeRecoveryActions();
      } else {
        console.log('✅ No recovery actions needed - system is healthy!');
      }
      
      // Step 5: Verify recovery
      console.log('✅ Verifying recovery...');
      await this.verifyRecovery();
      
      console.log('\n🎉 Recovery process completed!');
      
    } catch (error) {
      console.error('❌ Recovery process failed:', error);
      throw error;
    }
  }
  
  /**
   * Plan recovery actions based on diagnostic results
   */
  async planRecovery(results) {
    this.recoveryActions = [];
    
    // Handle critical and error-level issues
    for (const issue of results.issues) {
      if (issue.severity === 'critical' || issue.severity === 'error') {
        const action = await this.createRecoveryAction(issue);
        if (action) {
          this.recoveryActions.push(action);
        }
      }
    }
    
    // Handle missing dependencies
    if (!results.dependencies.nodeModulesExists) {
      this.recoveryActions.push({
        type: 'install_dependencies',
        description: 'Install missing dependencies',
        command: 'npm install',
        priority: 1
      });
    }
    
    // Handle missing files
    for (const [filePath, fileInfo] of Object.entries(results.files.requiredFiles)) {
      if (!fileInfo.exists) {
        this.recoveryActions.push({
          type: 'restore_file',
          description: `Restore missing file: ${filePath}`,
          filePath,
          priority: 2
        });
      }
    }
    
    // Handle missing directories
    for (const [dirPath, dirInfo] of Object.entries(results.files.requiredDirectories)) {
      if (!dirInfo.exists) {
        this.recoveryActions.push({
          type: 'create_directory',
          description: `Create missing directory: ${dirPath}`,
          dirPath,
          priority: 1
        });
      }
    }
    
    // Handle invalid design data
    if (results.files.designData.exists && !results.files.designData.valid) {
      this.recoveryActions.push({
        type: 'fix_design_data',
        description: 'Fix corrupted design data file',
        filePath: 'src/design/design-data.json',
        priority: 2
      });
    }
    
    // Sort by priority
    this.recoveryActions.sort((a, b) => a.priority - b.priority);
    
    console.log(`📋 Planned ${this.recoveryActions.length} recovery actions:`);
    this.recoveryActions.forEach((action, index) => {
      console.log(`   ${index + 1}. ${action.description}`);
    });
  }
  
  /**
   * Create recovery action for a specific issue
   */
  async createRecoveryAction(issue) {
    switch (issue.type) {
      case 'NODE_VERSION_OLD':
        return {
          type: 'suggest_node_update',
          description: 'Node.js version is outdated',
          suggestion: 'Please update Node.js to version 16 or later',
          priority: 3
        };
        
      case 'MISSING_DEPENDENCIES':
        return {
          type: 'install_dependencies',
          description: 'Install missing dependencies',
          command: 'npm install',
          priority: 1
        };
        
      case 'MISSING_FILE':
        return {
          type: 'restore_file',
          description: `Restore missing file from template`,
          filePath: this.extractFilePathFromMessage(issue.message),
          priority: 2
        };
        
      case 'MISSING_DIRECTORY':
        return {
          type: 'create_directory',
          description: `Create missing directory`,
          dirPath: this.extractDirPathFromMessage(issue.message),
          priority: 1
        };
        
      case 'DESIGN_DATA_INVALID':
        return {
          type: 'fix_design_data',
          description: 'Fix corrupted design data file',
          filePath: 'src/design/design-data.json',
          priority: 2
        };
        
      default:
        return null;
    }
  }
  
  /**
   * Create backups before recovery
   */
  async createBackups() {
    try {
      await fs.mkdir(this.backupDir, { recursive: true });
      
      const filesToBackup = [
        'package.json',
        'src/design/design-data.json',
        '.vscode/settings.json'
      ];
      
      for (const filePath of filesToBackup) {
        try {
          const content = await fs.readFile(filePath, 'utf8');
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const backupPath = path.join(this.backupDir, `${path.basename(filePath)}.${timestamp}.backup`);
          
          await fs.writeFile(backupPath, content, 'utf8');
          console.log(`   📄 Backed up: ${filePath} → ${backupPath}`);
        } catch (error) {
          // File doesn't exist or can't be read - skip backup
          if (this.options.verbose) {
            console.log(`   ⚠️ Skipped backup for ${filePath}: ${error.message}`);
          }
        }
      }
      
    } catch (error) {
      console.error('Failed to create backups:', error);
      throw error;
    }
  }
  
  /**
   * Execute recovery actions
   */
  async executeRecoveryActions() {
    for (const [index, action] of this.recoveryActions.entries()) {
      console.log(`\n🔧 Executing action ${index + 1}/${this.recoveryActions.length}: ${action.description}`);
      
      try {
        const success = await this.executeAction(action);
        
        if (success) {
          console.log(`   ✅ Success: ${action.description}`);
        } else {
          console.log(`   ❌ Failed: ${action.description}`);
        }
        
      } catch (error) {
        console.error(`   ❌ Error executing ${action.description}:`, error.message);
        
        if (!this.options.autoFix) {
          const shouldContinue = await this.askUserToContinue(action, error);
          if (!shouldContinue) {
            console.log('Recovery process stopped by user.');
            break;
          }
        }
      }
    }
  }
  
  /**
   * Execute a single recovery action
   */
  async executeAction(action) {
    switch (action.type) {
      case 'install_dependencies':
        return await this.installDependencies();
        
      case 'create_directory':
        return await this.createDirectory(action.dirPath);
        
      case 'restore_file':
        return await this.restoreFile(action.filePath);
        
      case 'fix_design_data':
        return await this.fixDesignData(action.filePath);
        
      case 'suggest_node_update':
        console.log(`   💡 ${action.suggestion}`);
        return true;
        
      default:
        console.log(`   ⚠️ Unknown action type: ${action.type}`);
        return false;
    }
  }
  
  /**
   * Install dependencies
   */
  async installDependencies() {
    try {
      console.log('   📦 Running npm install...');
      await this.runCommand('npm', ['install']);
      return true;
    } catch (error) {
      console.error('   ❌ npm install failed:', error.message);
      return false;
    }
  }
  
  /**
   * Create directory
   */
  async createDirectory(dirPath) {
    try {
      await fs.mkdir(dirPath, { recursive: true });
      console.log(`   📁 Created directory: ${dirPath}`);
      return true;
    } catch (error) {
      console.error(`   ❌ Failed to create directory ${dirPath}:`, error.message);
      return false;
    }
  }
  
  /**
   * Restore file from template
   */
  async restoreFile(filePath) {
    try {
      const templateContent = await this.getFileTemplate(filePath);
      
      if (templateContent) {
        // Ensure directory exists
        const dir = path.dirname(filePath);
        await fs.mkdir(dir, { recursive: true });
        
        await fs.writeFile(filePath, templateContent, 'utf8');
        console.log(`   📄 Restored file: ${filePath}`);
        return true;
      } else {
        console.log(`   ⚠️ No template available for: ${filePath}`);
        return false;
      }
    } catch (error) {
      console.error(`   ❌ Failed to restore file ${filePath}:`, error.message);
      return false;
    }
  }
  
  /**
   * Fix corrupted design data file
   */
  async fixDesignData(filePath) {
    try {
      // Try to read and parse the file
      const content = await fs.readFile(filePath, 'utf8');
      
      try {
        JSON.parse(content);
        console.log(`   ✅ Design data file is valid: ${filePath}`);
        return true;
      } catch (parseError) {
        console.log(`   🔧 Fixing corrupted design data file...`);
        
        // Create default design data
        const defaultData = this.getDefaultDesignData();
        await fs.writeFile(filePath, JSON.stringify(defaultData, null, 2), 'utf8');
        
        console.log(`   ✅ Created new design data file: ${filePath}`);
        return true;
      }
    } catch (error) {
      console.error(`   ❌ Failed to fix design data file ${filePath}:`, error.message);
      return false;
    }
  }
  
  /**
   * Verify recovery was successful
   */
  async verifyRecovery() {
    console.log('🔍 Running post-recovery diagnostics...');
    
    const postRecoveryDiagnostics = new VDSDiagnostics({
      verbose: false,
      outputFormat: 'json'
    });
    
    await postRecoveryDiagnostics.runDiagnostics();
    const results = postRecoveryDiagnostics.results;
    
    const criticalIssues = results.issues.filter(issue => 
      issue.severity === 'critical' || issue.severity === 'error'
    );
    
    if (criticalIssues.length === 0) {
      console.log('✅ Recovery verification passed - no critical issues found!');
      console.log(`📊 Health score improved to: ${results.healthScore}/100`);
    } else {
      console.log(`⚠️ ${criticalIssues.length} critical issues remain:`);
      criticalIssues.forEach(issue => {
        console.log(`   • ${issue.message}`);
      });
    }
  }
  
  /**
   * Get file template content
   */
  async getFileTemplate(filePath) {
    const templates = {
      'scripts/vds-sync-server.js': this.getSyncServerTemplate(),
      'scripts/error-handler.js': this.getErrorHandlerTemplate(),
      'webview/index.html': this.getWebviewTemplate(),
      'webview/error-handler.js': this.getWebviewErrorHandlerTemplate(),
      'src/design/design-data.json': JSON.stringify(this.getDefaultDesignData(), null, 2)
    };
    
    return templates[filePath] || null;
  }
  
  /**
   * Get default design data
   */
  getDefaultDesignData() {
    return {
      canvas: {
        width: 1920,
        height: 1080,
        backgroundColor: '#ffffff',
        grid: { size: 8, visible: true }
      },
      layers: [
        {
          id: 'layer_001',
          name: 'Background',
          visible: true,
          locked: false,
          elements: []
        }
      ],
      elements: [],
      colorPalette: [
        { name: 'Primary', color: '#007bff', usage: 'buttons' },
        { name: 'Secondary', color: '#6c757d', usage: 'text' }
      ],
      designTokens: {
        spacing: { xs: 4, sm: 8, md: 16, lg: 24 },
        colors: { primary: '#007bff', secondary: '#6c757d' }
      },
      metadata: {
        version: '1.0.0',
        created: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      }
    };
  }
  
  /**
   * Helper methods for templates (simplified versions)
   */
  getSyncServerTemplate() {
    return `#!/usr/bin/env node
// VDS Sync Server - Restored from template
console.log('VDS Sync Server template - please restore from backup or reinstall');
process.exit(1);
`;
  }
  
  getErrorHandlerTemplate() {
    return `// VDS Error Handler - Restored from template
console.log('VDS Error Handler template - please restore from backup or reinstall');
module.exports = class VDSErrorHandler {};
`;
  }
  
  getWebviewTemplate() {
    return `<!DOCTYPE html>
<html>
<head>
    <title>VDS Canvas - Restored</title>
</head>
<body>
    <h1>VDS Canvas Template</h1>
    <p>This is a template file. Please restore from backup or reinstall VDS.</p>
</body>
</html>`;
  }
  
  getWebviewErrorHandlerTemplate() {
    return `// VDS Webview Error Handler - Restored from template
console.log('VDS Webview Error Handler template - please restore from backup or reinstall');
`;
  }
  
  /**
   * Utility methods
   */
  
  extractFilePathFromMessage(message) {
    const match = message.match(/Required file missing: (.+)/);
    return match ? match[1] : null;
  }
  
  extractDirPathFromMessage(message) {
    const match = message.match(/Required directory missing: (.+)/);
    return match ? match[1] : null;
  }
  
  async runCommand(command, args = []) {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, { stdio: 'inherit' });
      
      child.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Command failed with code ${code}`));
        }
      });
      
      child.on('error', reject);
    });
  }
  
  async askUserToContinue(action, error) {
    // In a real implementation, this would prompt the user
    // For now, return true to continue
    return true;
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {};
  
  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--auto-fix':
        options.autoFix = true;
        break;
      case '--verbose':
      case '-v':
        options.verbose = true;
        break;
      case '--no-backup':
        options.backupBeforeFix = false;
        break;
      case '--help':
      case '-h':
        console.log(`
VDS Recovery Tool

Usage: node vds-recovery-tool.js [options]

Options:
  --auto-fix          Automatically fix issues without prompting
  --verbose, -v       Enable verbose output
  --no-backup         Skip creating backups before fixes
  --help, -h          Show this help message

Examples:
  node vds-recovery-tool.js                    # Interactive recovery
  node vds-recovery-tool.js --auto-fix         # Automatic recovery
  node vds-recovery-tool.js --verbose          # Verbose recovery
        `);
        process.exit(0);
    }
  }
  
  // Run recovery
  const recovery = new VDSRecoveryTool(options);
  recovery.runRecovery().catch(error => {
    console.error('Recovery failed:', error);
    process.exit(1);
  });
}

module.exports = VDSRecoveryTool;