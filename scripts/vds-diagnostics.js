#!/usr/bin/env node

/**
 * VDS Diagnostics Tool
 * 
 * Comprehensive diagnostic and troubleshooting tool for the VDS system.
 * Checks system health, identifies common issues, and provides solutions.
 */

const fs = require('fs').promises;
const path = require('path');
const { spawn } = require('child_process');
const os = require('os');

class VDSDiagnostics {
  constructor(options = {}) {
    this.options = {
      verbose: false,
      outputFormat: 'console', // 'console', 'json', 'markdown'
      checkNetwork: true,
      checkFiles: true,
      checkDependencies: true,
      ...options
    };
    
    this.results = {
      timestamp: new Date().toISOString(),
      system: {},
      dependencies: {},
      files: {},
      network: {},
      issues: [],
      suggestions: []
    };
  }
  
  /**
   * Run comprehensive diagnostics
   */
  async runDiagnostics() {
    console.log('🔍 Running VDS System Diagnostics...\n');
    
    try {
      // System information
      await this.checkSystemInfo();
      
      // Check dependencies
      if (this.options.checkDependencies) {
        await this.checkDependencies();
      }
      
      // Check file structure
      if (this.options.checkFiles) {
        await this.checkFileStructure();
      }
      
      // Check network connectivity
      if (this.options.checkNetwork) {
        await this.checkNetworkConnectivity();
      }
      
      // Check VS Code environment
      await this.checkVSCodeEnvironment();
      
      // Check Chrome/DevTools availability
      await this.checkChromeAvailability();
      
      // Analyze results and generate suggestions
      this.analyzeResults();
      
      // Output results
      this.outputResults();
      
    } catch (error) {
      console.error('❌ Diagnostics failed:', error);
      this.results.issues.push({
        type: 'DIAGNOSTIC_ERROR',
        severity: 'critical',
        message: `Diagnostics failed: ${error.message}`,
        suggestion: 'Please report this issue to the VDS team'
      });
    }
  }
  
  /**
   * Check system information
   */
  async checkSystemInfo() {
    console.log('📊 Checking system information...');
    
    this.results.system = {
      platform: os.platform(),
      arch: os.arch(),
      nodeVersion: process.version,
      totalMemory: Math.round(os.totalmem() / 1024 / 1024 / 1024) + ' GB',
      freeMemory: Math.round(os.freemem() / 1024 / 1024 / 1024) + ' GB',
      cpus: os.cpus().length,
      uptime: Math.round(os.uptime() / 3600) + ' hours'
    };
    
    // Check Node.js version
    const nodeVersion = process.version.substring(1); // Remove 'v' prefix
    const [major] = nodeVersion.split('.').map(Number);
    
    if (major < 16) {
      this.results.issues.push({
        type: 'NODE_VERSION_OLD',
        severity: 'warning',
        message: `Node.js version ${process.version} is outdated`,
        suggestion: 'Update to Node.js 16 or later for better performance and security'
      });
    }
    
    // Check available memory
    const freeMemoryGB = os.freemem() / 1024 / 1024 / 1024;
    if (freeMemoryGB < 1) {
      this.results.issues.push({
        type: 'LOW_MEMORY',
        severity: 'warning',
        message: `Low available memory: ${freeMemoryGB.toFixed(1)} GB`,
        suggestion: 'Close other applications to free up memory for VDS'
      });
    }
    
    console.log('✅ System information collected');
  }
  
  /**
   * Check dependencies
   */
  async checkDependencies() {
    console.log('📦 Checking dependencies...');
    
    const requiredDependencies = [
      'ws',
      'chokidar',
      'recast',
      '@babel/parser'
    ];
    
    const devDependencies = [
      'typescript',
      '@types/node',
      '@types/vscode'
    ];
    
    try {
      // Check package.json
      const packageJsonPath = path.join(process.cwd(), 'package.json');
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
      
      this.results.dependencies.packageJson = {
        name: packageJson.name,
        version: packageJson.version,
        dependencies: packageJson.dependencies || {},
        devDependencies: packageJson.devDependencies || {}
      };
      
      // Check required dependencies
      const missingDeps = [];
      for (const dep of requiredDependencies) {
        if (!packageJson.dependencies || !packageJson.dependencies[dep]) {
          missingDeps.push(dep);
        }
      }
      
      if (missingDeps.length > 0) {
        this.results.issues.push({
          type: 'MISSING_DEPENDENCIES',
          severity: 'error',
          message: `Missing required dependencies: ${missingDeps.join(', ')}`,
          suggestion: `Run: npm install ${missingDeps.join(' ')}`
        });
      }
      
      // Check if node_modules exists
      try {
        await fs.access(path.join(process.cwd(), 'node_modules'));
        this.results.dependencies.nodeModulesExists = true;
      } catch (error) {
        this.results.dependencies.nodeModulesExists = false;
        this.results.issues.push({
          type: 'NODE_MODULES_MISSING',
          severity: 'error',
          message: 'node_modules directory not found',
          suggestion: 'Run: npm install'
        });
      }
      
    } catch (error) {
      this.results.issues.push({
        type: 'PACKAGE_JSON_ERROR',
        severity: 'error',
        message: `Cannot read package.json: ${error.message}`,
        suggestion: 'Ensure you are in a valid VDS project directory'
      });
    }
    
    console.log('✅ Dependencies checked');
  }
  
  /**
   * Check file structure
   */
  async checkFileStructure() {
    console.log('📁 Checking file structure...');
    
    const requiredFiles = [
      'scripts/vds-sync-server.js',
      'scripts/ast-engine.js',
      'scripts/error-handler.js',
      'webview/index.html',
      'webview/error-handler.js'
    ];
    
    const requiredDirectories = [
      'scripts',
      'webview',
      'src/design'
    ];
    
    this.results.files = {
      requiredFiles: {},
      requiredDirectories: {},
      designData: {}
    };
    
    // Check required files
    for (const file of requiredFiles) {
      try {
        const stats = await fs.stat(file);
        this.results.files.requiredFiles[file] = {
          exists: true,
          size: stats.size,
          modified: stats.mtime.toISOString()
        };
      } catch (error) {
        this.results.files.requiredFiles[file] = { exists: false };
        this.results.issues.push({
          type: 'MISSING_FILE',
          severity: 'error',
          message: `Required file missing: ${file}`,
          suggestion: 'Reinstall VDS or restore missing files'
        });
      }
    }
    
    // Check required directories
    for (const dir of requiredDirectories) {
      try {
        await fs.access(dir);
        this.results.files.requiredDirectories[dir] = { exists: true };
      } catch (error) {
        this.results.files.requiredDirectories[dir] = { exists: false };
        this.results.issues.push({
          type: 'MISSING_DIRECTORY',
          severity: 'warning',
          message: `Required directory missing: ${dir}`,
          suggestion: `Create directory: mkdir -p ${dir}`
        });
      }
    }
    
    // Check design data file
    const designDataPath = 'src/design/design-data.json';
    try {
      const content = await fs.readFile(designDataPath, 'utf8');
      const data = JSON.parse(content);
      
      this.results.files.designData = {
        exists: true,
        size: content.length,
        elements: data.elements ? data.elements.length : 0,
        layers: data.layers ? data.layers.length : 0,
        valid: true
      };
    } catch (error) {
      if (error.code === 'ENOENT') {
        this.results.files.designData = { exists: false };
        this.results.issues.push({
          type: 'DESIGN_DATA_MISSING',
          severity: 'info',
          message: 'Design data file not found',
          suggestion: 'File will be created automatically when you start drawing'
        });
      } else {
        this.results.files.designData = { exists: true, valid: false, error: error.message };
        this.results.issues.push({
          type: 'DESIGN_DATA_INVALID',
          severity: 'error',
          message: `Invalid design data file: ${error.message}`,
          suggestion: 'Backup and recreate the design data file'
        });
      }
    }
    
    console.log('✅ File structure checked');
  }
  
  /**
   * Check network connectivity
   */
  async checkNetworkConnectivity() {
    console.log('🌐 Checking network connectivity...');
    
    this.results.network = {
      localhost: false,
      defaultPort: false,
      internetAccess: false
    };
    
    // Check localhost connectivity
    try {
      const response = await this.checkPort('localhost', 3001);
      this.results.network.localhost = true;
      this.results.network.defaultPort = response;
    } catch (error) {
      this.results.network.localhost = false;
    }
    
    // Check internet access (for remote development)
    try {
      await this.checkInternetAccess();
      this.results.network.internetAccess = true;
    } catch (error) {
      this.results.network.internetAccess = false;
      this.results.issues.push({
        type: 'NO_INTERNET_ACCESS',
        severity: 'warning',
        message: 'No internet access detected',
        suggestion: 'Internet access is required for remote development and updates'
      });
    }
    
    console.log('✅ Network connectivity checked');
  }
  
  /**
   * Check VS Code environment
   */
  async checkVSCodeEnvironment() {
    console.log('🔧 Checking VS Code environment...');
    
    this.results.vscode = {
      detected: false,
      version: null,
      extensions: []
    };
    
    // Check if running in VS Code
    if (process.env.VSCODE_PID || process.env.TERM_PROGRAM === 'vscode') {
      this.results.vscode.detected = true;
    }
    
    // Check for VS Code in PATH
    try {
      const vscodeVersion = await this.runCommand('code', ['--version']);
      this.results.vscode.version = vscodeVersion.split('\n')[0];
    } catch (error) {
      this.results.issues.push({
        type: 'VSCODE_NOT_IN_PATH',
        severity: 'warning',
        message: 'VS Code not found in PATH',
        suggestion: 'Add VS Code to your PATH or install VS Code'
      });
    }
    
    console.log('✅ VS Code environment checked');
  }
  
  /**
   * Check Chrome availability
   */
  async checkChromeAvailability() {
    console.log('🌐 Checking Chrome availability...');
    
    this.results.chrome = {
      detected: false,
      version: null,
      debugPort: false
    };
    
    // Check for Chrome in common locations
    const chromePaths = this.getChromePaths();
    
    for (const chromePath of chromePaths) {
      try {
        await fs.access(chromePath);
        this.results.chrome.detected = true;
        
        // Try to get Chrome version
        try {
          const version = await this.runCommand(chromePath, ['--version']);
          this.results.chrome.version = version.trim();
        } catch (versionError) {
          // Version check failed, but Chrome exists
        }
        
        break;
      } catch (error) {
        // Chrome not found at this path
      }
    }
    
    if (!this.results.chrome.detected) {
      this.results.issues.push({
        type: 'CHROME_NOT_FOUND',
        severity: 'warning',
        message: 'Chrome browser not found',
        suggestion: 'Install Google Chrome for DevTools integration'
      });
    }
    
    // Check if Chrome debug port is available
    try {
      await this.checkPort('localhost', 9222);
      this.results.chrome.debugPort = true;
    } catch (error) {
      this.results.chrome.debugPort = false;
    }
    
    console.log('✅ Chrome availability checked');
  }
  
  /**
   * Analyze results and generate suggestions
   */
  analyzeResults() {
    console.log('🔍 Analyzing results...');
    
    // Count issues by severity
    const issueCounts = {
      critical: 0,
      error: 0,
      warning: 0,
      info: 0
    };
    
    this.results.issues.forEach(issue => {
      issueCounts[issue.severity]++;
    });
    
    // Generate overall health score
    let healthScore = 100;
    healthScore -= issueCounts.critical * 30;
    healthScore -= issueCounts.error * 20;
    healthScore -= issueCounts.warning * 10;
    healthScore -= issueCounts.info * 5;
    
    this.results.healthScore = Math.max(0, healthScore);
    this.results.issueCounts = issueCounts;
    
    // Generate suggestions based on common patterns
    if (issueCounts.error > 0) {
      this.results.suggestions.push({
        type: 'CRITICAL_ISSUES',
        message: 'Critical issues detected that may prevent VDS from working properly',
        action: 'Resolve all error-level issues before using VDS'
      });
    }
    
    if (!this.results.dependencies.nodeModulesExists) {
      this.results.suggestions.push({
        type: 'INSTALL_DEPENDENCIES',
        message: 'Dependencies not installed',
        action: 'Run "npm install" to install required dependencies'
      });
    }
    
    if (!this.results.chrome.detected) {
      this.results.suggestions.push({
        type: 'INSTALL_CHROME',
        message: 'Chrome browser not detected',
        action: 'Install Google Chrome for full DevTools integration'
      });
    }
    
    console.log('✅ Analysis complete');
  }
  
  /**
   * Output results in specified format
   */
  outputResults() {
    console.log('\n📋 Diagnostic Results\n');
    
    switch (this.options.outputFormat) {
      case 'json':
        console.log(JSON.stringify(this.results, null, 2));
        break;
        
      case 'markdown':
        this.outputMarkdown();
        break;
        
      default:
        this.outputConsole();
    }
  }
  
  /**
   * Output results to console
   */
  outputConsole() {
    // Health score
    const healthEmoji = this.results.healthScore >= 80 ? '🟢' : 
                       this.results.healthScore >= 60 ? '🟡' : '🔴';
    console.log(`${healthEmoji} Overall Health Score: ${this.results.healthScore}/100\n`);
    
    // System info
    console.log('💻 System Information:');
    console.log(`   Platform: ${this.results.system.platform} (${this.results.system.arch})`);
    console.log(`   Node.js: ${this.results.system.nodeVersion}`);
    console.log(`   Memory: ${this.results.system.freeMemory} free of ${this.results.system.totalMemory}`);
    console.log(`   CPUs: ${this.results.system.cpus}\n`);
    
    // Issues
    if (this.results.issues.length > 0) {
      console.log('⚠️  Issues Found:');
      this.results.issues.forEach((issue, index) => {
        const emoji = {
          critical: '🚨',
          error: '❌',
          warning: '⚠️',
          info: 'ℹ️'
        }[issue.severity];
        
        console.log(`   ${emoji} ${issue.message}`);
        if (issue.suggestion) {
          console.log(`      💡 ${issue.suggestion}`);
        }
        console.log();
      });
    } else {
      console.log('✅ No issues found!\n');
    }
    
    // Suggestions
    if (this.results.suggestions.length > 0) {
      console.log('💡 Suggestions:');
      this.results.suggestions.forEach(suggestion => {
        console.log(`   • ${suggestion.message}`);
        console.log(`     Action: ${suggestion.action}\n`);
      });
    }
    
    // Summary
    console.log('📊 Summary:');
    console.log(`   Critical: ${this.results.issueCounts.critical}`);
    console.log(`   Errors: ${this.results.issueCounts.error}`);
    console.log(`   Warnings: ${this.results.issueCounts.warning}`);
    console.log(`   Info: ${this.results.issueCounts.info}`);
  }
  
  /**
   * Output results as markdown
   */
  outputMarkdown() {
    console.log('# VDS Diagnostic Report\n');
    console.log(`**Generated:** ${this.results.timestamp}`);
    console.log(`**Health Score:** ${this.results.healthScore}/100\n`);
    
    console.log('## System Information\n');
    console.log(`- **Platform:** ${this.results.system.platform} (${this.results.system.arch})`);
    console.log(`- **Node.js:** ${this.results.system.nodeVersion}`);
    console.log(`- **Memory:** ${this.results.system.freeMemory} free of ${this.results.system.totalMemory}`);
    console.log(`- **CPUs:** ${this.results.system.cpus}\n`);
    
    if (this.results.issues.length > 0) {
      console.log('## Issues\n');
      this.results.issues.forEach(issue => {
        console.log(`### ${issue.severity.toUpperCase()}: ${issue.message}\n`);
        if (issue.suggestion) {
          console.log(`**Suggestion:** ${issue.suggestion}\n`);
        }
      });
    }
    
    if (this.results.suggestions.length > 0) {
      console.log('## Recommendations\n');
      this.results.suggestions.forEach(suggestion => {
        console.log(`- **${suggestion.message}**`);
        console.log(`  - Action: ${suggestion.action}\n`);
      });
    }
  }
  
  /**
   * Helper methods
   */
  
  async checkPort(host, port) {
    return new Promise((resolve, reject) => {
      const net = require('net');
      const socket = new net.Socket();
      
      socket.setTimeout(3000);
      
      socket.on('connect', () => {
        socket.destroy();
        resolve(true);
      });
      
      socket.on('timeout', () => {
        socket.destroy();
        reject(new Error('Timeout'));
      });
      
      socket.on('error', (error) => {
        reject(error);
      });
      
      socket.connect(port, host);
    });
  }
  
  async checkInternetAccess() {
    const https = require('https');
    
    return new Promise((resolve, reject) => {
      const req = https.request({
        hostname: 'www.google.com',
        port: 443,
        path: '/',
        method: 'HEAD',
        timeout: 5000
      }, (res) => {
        resolve(true);
      });
      
      req.on('error', reject);
      req.on('timeout', () => reject(new Error('Timeout')));
      req.end();
    });
  }
  
  async runCommand(command, args = []) {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, { stdio: 'pipe' });
      let output = '';
      let error = '';
      
      child.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      child.stderr.on('data', (data) => {
        error += data.toString();
      });
      
      child.on('close', (code) => {
        if (code === 0) {
          resolve(output);
        } else {
          reject(new Error(error || `Command failed with code ${code}`));
        }
      });
      
      child.on('error', reject);
    });
  }
  
  getChromePaths() {
    const platform = os.platform();
    
    switch (platform) {
      case 'win32':
        return [
          'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
          'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
          path.join(os.homedir(), 'AppData\\Local\\Google\\Chrome\\Application\\chrome.exe')
        ];
        
      case 'darwin':
        return [
          '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
          path.join(os.homedir(), 'Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
        ];
        
      case 'linux':
        return [
          '/usr/bin/google-chrome',
          '/usr/bin/google-chrome-stable',
          '/usr/bin/chromium-browser',
          '/snap/bin/chromium'
        ];
        
      default:
        return [];
    }
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {};
  
  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--verbose':
      case '-v':
        options.verbose = true;
        break;
      case '--format':
      case '-f':
        options.outputFormat = args[++i];
        break;
      case '--no-network':
        options.checkNetwork = false;
        break;
      case '--no-files':
        options.checkFiles = false;
        break;
      case '--no-deps':
        options.checkDependencies = false;
        break;
      case '--help':
      case '-h':
        console.log(`
VDS Diagnostics Tool

Usage: node vds-diagnostics.js [options]

Options:
  --verbose, -v       Enable verbose output
  --format, -f        Output format (console, json, markdown)
  --no-network        Skip network connectivity checks
  --no-files          Skip file structure checks
  --no-deps           Skip dependency checks
  --help, -h          Show this help message
        `);
        process.exit(0);
    }
  }
  
  // Run diagnostics
  const diagnostics = new VDSDiagnostics(options);
  diagnostics.runDiagnostics().catch(error => {
    console.error('Diagnostics failed:', error);
    process.exit(1);
  });
}

module.exports = VDSDiagnostics;