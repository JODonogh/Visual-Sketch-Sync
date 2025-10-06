#!/usr/bin/env node

/**
 * VSS Installation Validator
 * 
 * This script validates VS Code extension installation and identifies
 * potential cyclic copy issues that can occur during manual installation.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

class InstallationValidator {
    constructor() {
        this.errors = [];
        this.warnings = [];
        this.info = [];
    }

    /**
     * Get VS Code extensions directory based on platform
     */
    getVSCodeExtensionsDir() {
        const platform = os.platform();
        const homeDir = os.homedir();
        
        switch (platform) {
            case 'win32':
                return path.join(homeDir, '.vscode', 'extensions');
            case 'darwin':
                return path.join(homeDir, '.vscode', 'extensions');
            case 'linux':
                return path.join(homeDir, '.vscode', 'extensions');
            default:
                throw new Error(`Unsupported platform: ${platform}`);
        }
    }

    /**
     * Check if current directory has cyclic references that would cause issues
     */
    checkForCyclicReferences() {
        const currentDir = process.cwd();
        const problematicPaths = [
            'node_modules',
            '.git',
            'out',
            '.vscode-test',
            '.nyc_output',
            'coverage',
            '.vss-backups',
            '.vss-recovery-backups'
        ];

        this.info.push('Checking for cyclic reference issues...');

        problematicPaths.forEach(dirName => {
            const dirPath = path.join(currentDir, dirName);
            if (fs.existsSync(dirPath)) {
                const stats = fs.statSync(dirPath);
                if (stats.isDirectory()) {
                    this.warnings.push(`Found ${dirName}/ - this should be excluded from manual copy`);
                }
            }
        });

        // Check if we're inside a VS Code extensions directory (would cause cyclic copy)
        if (currentDir.includes('.vscode' + path.sep + 'extensions')) {
            this.errors.push('ERROR: You are running this from inside VS Code extensions directory!');
            this.errors.push('This will cause cyclic copy issues. Please run from the source directory.');
            return false;
        }

        return true;
    }

    /**
     * Validate package.json structure
     */
    validatePackageJson() {
        const packagePath = path.join(process.cwd(), 'package.json');
        
        if (!fs.existsSync(packagePath)) {
            this.errors.push('package.json not found');
            return false;
        }

        try {
            const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
            
            // Check required fields for VS Code extension
            const requiredFields = ['name', 'version', 'engines', 'main', 'contributes'];
            requiredFields.forEach(field => {
                if (!packageJson[field]) {
                    this.errors.push(`Missing required field in package.json: ${field}`);
                }
            });

            // Check VS Code engine version
            if (packageJson.engines && packageJson.engines.vscode) {
                this.info.push(`VS Code engine requirement: ${packageJson.engines.vscode}`);
            }

            // Check main entry point
            if (packageJson.main) {
                const mainPath = path.join(process.cwd(), packageJson.main);
                if (!fs.existsSync(mainPath)) {
                    this.errors.push(`Main entry point not found: ${packageJson.main}`);
                    this.info.push('Run "npm run compile" to build the extension');
                }
            }

            return this.errors.length === 0;
        } catch (error) {
            this.errors.push(`Invalid package.json: ${error.message}`);
            return false;
        }
    }

    /**
     * Check if extension is already installed
     */
    checkExistingInstallation() {
        try {
            const extensionsDir = this.getVSCodeExtensionsDir();
            const extensionDir = path.join(extensionsDir, 'visual-sketch-sync-0.1.0');
            
            if (fs.existsSync(extensionDir)) {
                this.warnings.push(`Extension already installed at: ${extensionDir}`);
                this.info.push('You may need to uninstall the existing version first');
                return true;
            }
            
            return false;
        } catch (error) {
            this.warnings.push(`Could not check existing installation: ${error.message}`);
            return false;
        }
    }

    /**
     * Validate VSIX file if it exists
     */
    validateVSIX() {
        const vsixPath = path.join(process.cwd(), 'visual-sketch-sync-0.1.0.vsix');
        
        if (fs.existsSync(vsixPath)) {
            const stats = fs.statSync(vsixPath);
            this.info.push(`VSIX file found: ${vsixPath} (${Math.round(stats.size / 1024)}KB)`);
            
            // Check if VSIX is recent (within last hour)
            const ageMinutes = (Date.now() - stats.mtime.getTime()) / (1000 * 60);
            if (ageMinutes > 60) {
                this.warnings.push('VSIX file is older than 1 hour - consider rebuilding with "npm run package"');
            }
            
            return true;
        }
        
        this.info.push('No VSIX file found - run "npm run package" to create one');
        return false;
    }

    /**
     * Generate safe installation commands
     */
    generateSafeInstallCommands() {
        const commands = {
            development: [
                '# Method 1: Development Mode (Safest)',
                'cd /path/to/Visual-Sketch-Sync',
                'npm install',
                'npm run compile',
                '# Open VS Code in this directory and press F5'
            ],
            vsix: [
                '# Method 2: VSIX Installation (Recommended)',
                'cd /path/to/Visual-Sketch-Sync',
                'npm install',
                'npm run compile',
                'npm run package',
                'code --install-extension visual-sketch-sync-0.1.0.vsix'
            ],
            manual: [
                '# Method 3: Manual Installation (Advanced)',
                '# WARNING: This method can cause cyclic copy issues if not done correctly',
                '',
                '# Step 1: Build the extension',
                'cd /path/to/Visual-Sketch-Sync',
                'npm install',
                'npm run compile',
                '',
                '# Step 2: Create clean copy (excludes problematic directories)',
                this.generateCleanCopyCommand(),
                '',
                '# Step 3: Restart VS Code'
            ]
        };

        return commands;
    }

    /**
     * Generate platform-specific clean copy command
     */
    generateCleanCopyCommand() {
        const platform = os.platform();
        const extensionsDir = this.getVSCodeExtensionsDir();
        const targetDir = path.join(extensionsDir, 'visual-sketch-sync-0.1.0');

        switch (platform) {
            case 'win32':
                return [
                    `mkdir "${targetDir}"`,
                    `robocopy "." "${targetDir}" /E /XD node_modules .git out\\test coverage .nyc_output .vscode-test .vss-backups .vss-recovery-backups test-output tutorials examples docs generated-components marketplace .kiro /XF *.log *.tmp .DS_Store Thumbs.db *.vsix package-lock.json yarn.lock .eslintrc.json tsconfig.json`
                ].join('\n');
            case 'darwin':
            case 'linux':
                return [
                    `mkdir -p "${targetDir}"`,
                    `rsync -av --exclude-from=scripts/copy-exclude.txt . "${targetDir}"`
                ].join('\n');
            default:
                return '# Manual copy required - see documentation';
        }
    }

    /**
     * Create exclusion file for safe copying
     */
    createCopyExclusionFile() {
        const excludeList = [
            'node_modules/',
            '.git/',
            'out/test/',
            'coverage/',
            '.nyc_output/',
            '.vscode-test/',
            '.vss-backups/',
            '.vss-recovery-backups/',
            'test-output/',
            'tutorials/',
            'examples/',
            'docs/',
            'generated-components/',
            'marketplace/',
            '.kiro/',
            '*.log',
            '*.tmp',
            '.DS_Store',
            'Thumbs.db'
        ];

        const excludeFilePath = path.join(process.cwd(), 'scripts', 'copy-exclude.txt');
        
        // Ensure scripts directory exists
        const scriptsDir = path.dirname(excludeFilePath);
        if (!fs.existsSync(scriptsDir)) {
            fs.mkdirSync(scriptsDir, { recursive: true });
        }

        fs.writeFileSync(excludeFilePath, excludeList.join('\n'));
        this.info.push(`Created exclusion file: ${excludeFilePath}`);
    }

    /**
     * Run complete validation
     */
    validate() {
        console.log('🔍 VSS Installation Validator\n');

        // Run all validation checks
        this.checkForCyclicReferences();
        this.validatePackageJson();
        this.checkExistingInstallation();
        this.validateVSIX();
        this.createCopyExclusionFile();

        // Display results
        if (this.errors.length > 0) {
            console.log('❌ ERRORS:');
            this.errors.forEach(error => console.log(`   ${error}`));
            console.log('');
        }

        if (this.warnings.length > 0) {
            console.log('⚠️  WARNINGS:');
            this.warnings.forEach(warning => console.log(`   ${warning}`));
            console.log('');
        }

        if (this.info.length > 0) {
            console.log('ℹ️  INFO:');
            this.info.forEach(info => console.log(`   ${info}`));
            console.log('');
        }

        // Show installation methods
        console.log('📋 SAFE INSTALLATION METHODS:\n');
        const commands = this.generateSafeInstallCommands();
        
        Object.entries(commands).forEach(([method, cmdList]) => {
            console.log(cmdList.join('\n'));
            console.log('');
        });

        // Final recommendation
        if (this.errors.length === 0) {
            console.log('✅ No critical issues found. You can proceed with installation.');
            console.log('   Recommended: Use Method 1 (Development Mode) or Method 2 (VSIX)');
        } else {
            console.log('❌ Critical issues found. Please fix errors before installation.');
        }

        return this.errors.length === 0;
    }
}

// Run validation if called directly
if (require.main === module) {
    const validator = new InstallationValidator();
    const success = validator.validate();
    process.exit(success ? 0 : 1);
}

module.exports = InstallationValidator;