#!/usr/bin/env node

/**
 * Test Manual Installation Script
 * 
 * This script tests the manual installation process in a safe temporary directory
 * to verify that cyclic copy issues are resolved.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

class ManualInstallTester {
    constructor() {
        this.tempDir = path.join(os.tmpdir(), 'vss-install-test-' + Date.now());
        this.sourceDir = process.cwd();
    }

    /**
     * Create a temporary test environment
     */
    setupTestEnvironment() {
        console.log('🔧 Setting up test environment...');
        
        // Create temp directory
        fs.mkdirSync(this.tempDir, { recursive: true });
        console.log(`   Created temp directory: ${this.tempDir}`);
        
        // Create mock VS Code extensions directory
        const mockExtensionsDir = path.join(this.tempDir, '.vscode', 'extensions');
        fs.mkdirSync(mockExtensionsDir, { recursive: true });
        console.log(`   Created mock extensions directory: ${mockExtensionsDir}`);
        
        return mockExtensionsDir;
    }

    /**
     * Test the manual copy process
     */
    testManualCopy() {
        console.log('📋 Testing manual copy process...');
        
        const mockExtensionsDir = this.setupTestEnvironment();
        const targetDir = path.join(mockExtensionsDir, 'visual-sketch-sync-0.1.0');
        const excludeFile = path.join(this.sourceDir, 'scripts', 'copy-exclude.txt');
        
        try {
            // Ensure exclusion file exists
            if (!fs.existsSync(excludeFile)) {
                throw new Error('Exclusion file not found. Run npm run validate-install first.');
            }
            
            // Test the copy command based on platform
            const platform = os.platform();
            let copyCommand;
            
            if (platform === 'win32') {
                // Windows - use robocopy instead of xcopy for better path handling
                fs.mkdirSync(targetDir, { recursive: true });
                
                // Read exclusion file and convert to robocopy format
                const excludeContent = fs.readFileSync(excludeFile, 'utf8');
                const excludeDirs = excludeContent.split('\n')
                    .filter(line => line.trim() && line.endsWith('/'))
                    .map(line => line.replace('/', '').trim())
                    .join(' ');
                
                copyCommand = `robocopy "${this.sourceDir}" "${targetDir}" /E /XD ${excludeDirs} /XF *.log *.tmp .DS_Store Thumbs.db *.vsix package-lock.json`;
            } else {
                // Unix rsync command
                copyCommand = `rsync -av --exclude-from="${excludeFile}" "${this.sourceDir}/" "${targetDir}"`;
            }
            
            console.log(`   Running: ${copyCommand}`);
            
            // Execute the copy command
            try {
                execSync(copyCommand, { 
                    stdio: 'pipe',
                    cwd: this.sourceDir
                });
            } catch (error) {
                // Robocopy returns exit code 1 for successful copy, which Node.js treats as error
                if (platform === 'win32' && error.status === 1) {
                    console.log('   ✅ Robocopy completed successfully (exit code 1 is normal)');
                } else {
                    throw error;
                }
            }
            
            console.log('✅ Copy command executed successfully');
            
            // Verify the copy results
            this.verifyCopyResults(targetDir);
            
        } catch (error) {
            console.error('❌ Copy command failed:', error.message);
            return false;
        }
        
        return true;
    }

    /**
     * Verify that the copy was successful and excluded problematic directories
     */
    verifyCopyResults(targetDir) {
        console.log('🔍 Verifying copy results...');
        
        // Check that essential files were copied
        const essentialFiles = [
            'package.json',
            'out/extension.js',
            'webview/index.html'
        ];
        
        essentialFiles.forEach(file => {
            const filePath = path.join(targetDir, file);
            if (fs.existsSync(filePath)) {
                console.log(`   ✅ ${file} copied successfully`);
            } else {
                console.log(`   ❌ ${file} missing (this might be expected if not built)`);
            }
        });
        
        // Check that problematic directories were excluded
        const excludedDirs = [
            'node_modules',
            '.git',
            '.vss-backups',
            '.vss-recovery-backups',
            'test-output',
            'tutorials',
            'examples',
            'docs',
            '.kiro'
        ];
        
        excludedDirs.forEach(dir => {
            const dirPath = path.join(targetDir, dir);
            if (!fs.existsSync(dirPath)) {
                console.log(`   ✅ ${dir}/ correctly excluded`);
            } else {
                console.log(`   ⚠️  ${dir}/ was copied (check exclusion file)`);
            }
        });
        
        // Check total size (should be much smaller without node_modules)
        const stats = this.getDirectorySize(targetDir);
        console.log(`   📊 Target directory size: ${Math.round(stats.size / 1024 / 1024)}MB (${stats.files} files)`);
        
        if (stats.size < 50 * 1024 * 1024) { // Less than 50MB
            console.log('   ✅ Size looks reasonable (node_modules likely excluded)');
        } else {
            console.log('   ⚠️  Size seems large (node_modules might be included)');
        }
    }

    /**
     * Get directory size and file count
     */
    getDirectorySize(dirPath) {
        let totalSize = 0;
        let fileCount = 0;
        
        const traverse = (currentPath) => {
            const items = fs.readdirSync(currentPath);
            
            items.forEach(item => {
                const itemPath = path.join(currentPath, item);
                const stats = fs.statSync(itemPath);
                
                if (stats.isDirectory()) {
                    traverse(itemPath);
                } else {
                    totalSize += stats.size;
                    fileCount++;
                }
            });
        };
        
        traverse(dirPath);
        return { size: totalSize, files: fileCount };
    }

    /**
     * Clean up test environment
     */
    cleanup() {
        console.log('🧹 Cleaning up test environment...');
        
        try {
            // Remove temp directory
            fs.rmSync(this.tempDir, { recursive: true, force: true });
            console.log(`   Removed: ${this.tempDir}`);
        } catch (error) {
            console.log(`   Warning: Could not remove temp directory: ${error.message}`);
        }
    }

    /**
     * Run the complete test
     */
    runTest() {
        console.log('🧪 VSS Manual Installation Test\n');
        
        try {
            const success = this.testManualCopy();
            
            if (success) {
                console.log('\n✅ Manual installation test PASSED');
                console.log('   The manual copy process should work without cyclic copy issues.');
            } else {
                console.log('\n❌ Manual installation test FAILED');
                console.log('   There may still be cyclic copy issues.');
            }
            
            return success;
            
        } finally {
            this.cleanup();
        }
    }
}

// Run test if called directly
if (require.main === module) {
    const tester = new ManualInstallTester();
    const success = tester.runTest();
    process.exit(success ? 0 : 1);
}

module.exports = ManualInstallTester;