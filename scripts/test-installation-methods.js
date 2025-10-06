#!/usr/bin/env node

/**
 * Test script for VSS installation methods validation
 * Tests F5 development mode, VSIX packaging, and manual installation
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');

class InstallationMethodsTester {
    constructor() {
        this.projectRoot = path.join(__dirname, '..');
        this.results = {
            f5Development: { passed: 0, failed: 0, errors: [] },
            vsixPackaging: { passed: 0, failed: 0, errors: [] },
            manualInstallation: { passed: 0, failed: 0, errors: [] },
            packageValidation: { passed: 0, failed: 0, errors: [] },
            errors: [],
            warnings: []
        };
    }

    async runTests() {
        console.log('🧪 VSS Installation Methods Test Suite');
        console.log('======================================\n');

        try {
            // Test 1: Package validation
            console.log('📦 Test 1: Validating package configuration...');
            this.validatePackageConfiguration();
            
            // Test 2: F5 development mode prerequisites
            console.log('\n🔧 Test 2: Validating F5 development mode prerequisites...');
            this.validateF5Development();
            
            // Test 3: VSIX packaging
            console.log('\n📦 Test 3: Validating VSIX packaging...');
            await this.validateVSIXPackaging();
            
            // Test 4: Manual installation validation
            console.log('\n📁 Test 4: Validating manual installation method...');
            this.validateManualInstallation();
            
            // Generate report
            this.generateReport();
            
        } catch (error) {
            console.error('❌ Test suite failed:', error.message);
            this.results.errors.push(`Test suite failure: ${error.message}`);
        }
    }

    validatePackageConfiguration() {
        try {
            const packageJsonPath = path.join(this.projectRoot, 'package.json');
            const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
            
            // Check required fields for VS Code extension
            const requiredFields = [
                'name', 'displayName', 'description', 'version', 'publisher',
                'engines', 'categories', 'activationEvents', 'main', 'contributes'
            ];
            
            requiredFields.forEach(field => {
                if (packageJson[field]) {
                    console.log(`   ✅ Required field '${field}' present`);
                    this.results.packageValidation.passed++;
                } else {
                    console.log(`   ❌ Required field '${field}' missing`);
                    this.results.packageValidation.failed++;
                    this.results.packageValidation.errors.push(`Missing required field: ${field}`);
                }
            });
            
            // Check VS Code engine version
            if (packageJson.engines && packageJson.engines.vscode) {
                const vscodeVersion = packageJson.engines.vscode;
                console.log(`   ✅ VS Code engine version specified: ${vscodeVersion}`);
                this.results.packageValidation.passed++;
                
                // Validate version format
                if (vscodeVersion.match(/^\^?\d+\.\d+\.\d+$/)) {
                    console.log('   ✅ VS Code version format is valid');
                    this.results.packageValidation.passed++;
                } else {
                    console.log('   ⚠️  VS Code version format may be invalid');
                    this.results.warnings.push('VS Code version format may be invalid');
                }
            } else {
                console.log('   ❌ VS Code engine version missing');
                this.results.packageValidation.failed++;
                this.results.packageValidation.errors.push('Missing VS Code engine version');
            }
            
            // Check main entry point
            if (packageJson.main) {
                const mainPath = path.join(this.projectRoot, packageJson.main);
                const expectedPath = path.join(this.projectRoot, 'out', 'extension.js');
                
                if (packageJson.main === './out/extension.js') {
                    console.log('   ✅ Main entry point correctly configured');
                    this.results.packageValidation.passed++;
                } else {
                    console.log(`   ⚠️  Main entry point: ${packageJson.main} (expected: ./out/extension.js)`);
                    this.results.warnings.push('Main entry point may not match compiled output');
                }
            }
            
            // Check scripts for compilation and packaging
            const requiredScripts = ['compile', 'package'];
            if (packageJson.scripts) {
                requiredScripts.forEach(script => {
                    if (packageJson.scripts[script]) {
                        console.log(`   ✅ Script '${script}' found`);
                        this.results.packageValidation.passed++;
                    } else {
                        console.log(`   ❌ Script '${script}' missing`);
                        this.results.packageValidation.failed++;
                        this.results.packageValidation.errors.push(`Missing script: ${script}`);
                    }
                });
            }
            
        } catch (error) {
            this.results.packageValidation.errors.push(`Package validation failed: ${error.message}`);
            console.log(`   ❌ Package validation failed: ${error.message}`);
        }
    }

    validateF5Development() {
        try {
            // Check for TypeScript configuration
            const tsconfigPath = path.join(this.projectRoot, 'tsconfig.json');
            if (fs.existsSync(tsconfigPath)) {
                console.log('   ✅ TypeScript configuration found');
                this.results.f5Development.passed++;
                
                const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'));
                if (tsconfig.compilerOptions && tsconfig.compilerOptions.outDir) {
                    console.log(`   ✅ Output directory configured: ${tsconfig.compilerOptions.outDir}`);
                    this.results.f5Development.passed++;
                } else {
                    console.log('   ⚠️  Output directory not explicitly configured');
                    this.results.warnings.push('TypeScript output directory not explicitly configured');
                }
            } else {
                console.log('   ❌ TypeScript configuration missing');
                this.results.f5Development.failed++;
                this.results.f5Development.errors.push('Missing tsconfig.json');
            }
            
            // Check for VS Code launch configuration
            const launchConfigPath = path.join(this.projectRoot, '.vscode', 'launch.json');
            if (fs.existsSync(launchConfigPath)) {
                console.log('   ✅ VS Code launch configuration found');
                this.results.f5Development.passed++;
                
                try {
                    const launchConfig = JSON.parse(fs.readFileSync(launchConfigPath, 'utf8'));
                    const extensionConfig = launchConfig.configurations?.find(config => 
                        config.type === 'extensionHost' || config.name?.includes('Extension')
                    );
                    
                    if (extensionConfig) {
                        console.log('   ✅ Extension Host configuration found');
                        this.results.f5Development.passed++;
                    } else {
                        console.log('   ⚠️  Extension Host configuration not found');
                        this.results.warnings.push('Extension Host configuration not found in launch.json');
                    }
                } catch (parseError) {
                    console.log('   ⚠️  Launch configuration parse error');
                    this.results.warnings.push('Launch configuration parse error');
                }
            } else {
                console.log('   ⚠️  VS Code launch configuration missing (F5 may still work with defaults)');
                this.results.warnings.push('VS Code launch configuration missing');
            }
            
            // Check for source files
            const srcPath = path.join(this.projectRoot, 'src');
            if (fs.existsSync(srcPath)) {
                console.log('   ✅ Source directory found');
                this.results.f5Development.passed++;
                
                const extensionTsPath = path.join(srcPath, 'extension.ts');
                if (fs.existsSync(extensionTsPath)) {
                    console.log('   ✅ Extension entry point found');
                    this.results.f5Development.passed++;
                } else {
                    console.log('   ❌ Extension entry point missing');
                    this.results.f5Development.failed++;
                    this.results.f5Development.errors.push('Missing src/extension.ts');
                }
            } else {
                console.log('   ❌ Source directory missing');
                this.results.f5Development.failed++;
                this.results.f5Development.errors.push('Missing src directory');
            }
            
            // Check if compilation works
            try {
                console.log('   🔄 Testing TypeScript compilation...');
                execSync('npm run compile', { 
                    cwd: this.projectRoot, 
                    stdio: 'pipe',
                    timeout: 30000 
                });
                console.log('   ✅ TypeScript compilation successful');
                this.results.f5Development.passed++;
                
                // Check if compiled output exists
                const outPath = path.join(this.projectRoot, 'out', 'extension.js');
                if (fs.existsSync(outPath)) {
                    console.log('   ✅ Compiled extension output found');
                    this.results.f5Development.passed++;
                } else {
                    console.log('   ❌ Compiled extension output missing');
                    this.results.f5Development.failed++;
                    this.results.f5Development.errors.push('Compiled extension output missing');
                }
            } catch (compileError) {
                console.log('   ❌ TypeScript compilation failed');
                this.results.f5Development.failed++;
                this.results.f5Development.errors.push(`TypeScript compilation failed: ${compileError.message}`);
            }
            
        } catch (error) {
            this.results.f5Development.errors.push(`F5 development validation failed: ${error.message}`);
            console.log(`   ❌ F5 development validation failed: ${error.message}`);
        }
    }

    async validateVSIXPackaging() {
        try {
            // Check if vsce is available
            try {
                const vsceVersion = execSync('vsce --version', { 
                    stdio: 'pipe',
                    timeout: 10000 
                }).toString().trim();
                console.log(`   ✅ vsce tool available (version: ${vsceVersion})`);
                this.results.vsixPackaging.passed++;
            } catch (vsceError) {
                console.log('   ❌ vsce tool not available');
                this.results.vsixPackaging.failed++;
                this.results.vsixPackaging.errors.push('vsce tool not available - install with: npm install -g vsce');
                return; // Can't continue without vsce
            }
            
            // Check .vscodeignore file
            const vscodeignorePath = path.join(this.projectRoot, '.vscodeignore');
            if (fs.existsSync(vscodeignorePath)) {
                console.log('   ✅ .vscodeignore file found');
                this.results.vsixPackaging.passed++;
                
                const vscodeignoreContent = fs.readFileSync(vscodeignorePath, 'utf8');
                const importantExclusions = ['node_modules', 'src/', '.git', '*.ts'];
                const missingExclusions = importantExclusions.filter(exclusion => 
                    !vscodeignoreContent.includes(exclusion)
                );
                
                if (missingExclusions.length === 0) {
                    console.log('   ✅ .vscodeignore has appropriate exclusions');
                    this.results.vsixPackaging.passed++;
                } else {
                    console.log(`   ⚠️  .vscodeignore missing exclusions: ${missingExclusions.join(', ')}`);
                    this.results.warnings.push(`Missing .vscodeignore exclusions: ${missingExclusions.join(', ')}`);
                }
            } else {
                console.log('   ⚠️  .vscodeignore file missing (may include unnecessary files)');
                this.results.warnings.push('.vscodeignore file missing');
            }
            
            // Test VSIX packaging (dry run)
            try {
                console.log('   🔄 Testing VSIX packaging (dry run)...');
                const packageOutput = execSync('vsce package --no-dependencies', { 
                    cwd: this.projectRoot, 
                    stdio: 'pipe',
                    timeout: 60000 
                }).toString();
                
                console.log('   ✅ VSIX packaging successful');
                this.results.vsixPackaging.passed++;
                
                // Check if VSIX file was created
                const packageJson = JSON.parse(fs.readFileSync(path.join(this.projectRoot, 'package.json'), 'utf8'));
                const expectedVsixName = `${packageJson.name}-${packageJson.version}.vsix`;
                const vsixPath = path.join(this.projectRoot, expectedVsixName);
                
                if (fs.existsSync(vsixPath)) {
                    console.log(`   ✅ VSIX file created: ${expectedVsixName}`);
                    this.results.vsixPackaging.passed++;
                    
                    // Get file size
                    const stats = fs.statSync(vsixPath);
                    const fileSizeMB = (stats.size / 1024 / 1024).toFixed(2);
                    console.log(`   📊 VSIX file size: ${fileSizeMB} MB`);
                    
                    if (stats.size > 50 * 1024 * 1024) { // > 50MB
                        console.log('   ⚠️  VSIX file is quite large (>50MB)');
                        this.results.warnings.push('VSIX file is quite large');
                    }
                    
                    // Clean up test VSIX file
                    try {
                        fs.unlinkSync(vsixPath);
                        console.log('   🧹 Test VSIX file cleaned up');
                    } catch (cleanupError) {
                        console.log('   ⚠️  Could not clean up test VSIX file');
                    }
                } else {
                    console.log('   ❌ VSIX file not found after packaging');
                    this.results.vsixPackaging.failed++;
                    this.results.vsixPackaging.errors.push('VSIX file not created');
                }
                
            } catch (packageError) {
                console.log('   ❌ VSIX packaging failed');
                this.results.vsixPackaging.failed++;
                this.results.vsixPackaging.errors.push(`VSIX packaging failed: ${packageError.message}`);
            }
            
            // Check package.json scripts for packaging
            const packageJson = JSON.parse(fs.readFileSync(path.join(this.projectRoot, 'package.json'), 'utf8'));
            if (packageJson.scripts && packageJson.scripts.package) {
                console.log('   ✅ Package script found in package.json');
                this.results.vsixPackaging.passed++;
            } else {
                console.log('   ⚠️  Package script not found in package.json');
                this.results.warnings.push('Package script not found in package.json');
            }
            
        } catch (error) {
            this.results.vsixPackaging.errors.push(`VSIX packaging validation failed: ${error.message}`);
            console.log(`   ❌ VSIX packaging validation failed: ${error.message}`);
        }
    }

    validateManualInstallation() {
        try {
            // Check for installation validator script
            const validatorPath = path.join(this.projectRoot, 'scripts', 'installation-validator.js');
            if (fs.existsSync(validatorPath)) {
                console.log('   ✅ Installation validator script found');
                this.results.manualInstallation.passed++;
            } else {
                console.log('   ❌ Installation validator script missing');
                this.results.manualInstallation.failed++;
                this.results.manualInstallation.errors.push('Missing installation validator script');
            }
            
            // Check for manual installation test script
            const testManualPath = path.join(this.projectRoot, 'scripts', 'test-manual-install.js');
            if (fs.existsSync(testManualPath)) {
                console.log('   ✅ Manual installation test script found');
                this.results.manualInstallation.passed++;
            } else {
                console.log('   ❌ Manual installation test script missing');
                this.results.manualInstallation.failed++;
                this.results.manualInstallation.errors.push('Missing manual installation test script');
            }
            
            // Check for installation documentation
            const installationMdPath = path.join(this.projectRoot, 'INSTALLATION.md');
            if (fs.existsSync(installationMdPath)) {
                console.log('   ✅ Installation documentation found');
                this.results.manualInstallation.passed++;
                
                const installContent = fs.readFileSync(installationMdPath, 'utf8');
                const requiredSections = ['F5 Development', 'VSIX', 'Manual'];
                const missingSections = requiredSections.filter(section => 
                    !installContent.toLowerCase().includes(section.toLowerCase())
                );
                
                if (missingSections.length === 0) {
                    console.log('   ✅ All installation methods documented');
                    this.results.manualInstallation.passed++;
                } else {
                    console.log(`   ⚠️  Missing documentation for: ${missingSections.join(', ')}`);
                    this.results.warnings.push(`Missing installation documentation: ${missingSections.join(', ')}`);
                }
            } else {
                console.log('   ❌ Installation documentation missing');
                this.results.manualInstallation.failed++;
                this.results.manualInstallation.errors.push('Missing INSTALLATION.md');
            }
            
            // Check for cyclic copy prevention
            const packageJson = JSON.parse(fs.readFileSync(path.join(this.projectRoot, 'package.json'), 'utf8'));
            if (packageJson.scripts && packageJson.scripts['validate-install']) {
                console.log('   ✅ Installation validation script found');
                this.results.manualInstallation.passed++;
            } else {
                console.log('   ⚠️  Installation validation script not found in package.json');
                this.results.warnings.push('Installation validation script not found');
            }
            
            // Test installation validator if available
            try {
                console.log('   🔄 Testing installation validator...');
                const validatorOutput = execSync('node scripts/installation-validator.js', { 
                    cwd: this.projectRoot, 
                    stdio: 'pipe',
                    timeout: 30000 
                }).toString();
                
                console.log('   ✅ Installation validator runs successfully');
                this.results.manualInstallation.passed++;
            } catch (validatorError) {
                console.log('   ⚠️  Installation validator failed or not available');
                this.results.warnings.push('Installation validator failed or not available');
            }
            
            // Check for common installation issues prevention
            const gitignorePath = path.join(this.projectRoot, '.gitignore');
            if (fs.existsSync(gitignorePath)) {
                const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
                if (gitignoreContent.includes('node_modules') && gitignoreContent.includes('out/')) {
                    console.log('   ✅ .gitignore properly configured');
                    this.results.manualInstallation.passed++;
                } else {
                    console.log('   ⚠️  .gitignore may not exclude all necessary files');
                    this.results.warnings.push('.gitignore may not exclude all necessary files');
                }
            } else {
                console.log('   ⚠️  .gitignore file missing');
                this.results.warnings.push('.gitignore file missing');
            }
            
        } catch (error) {
            this.results.manualInstallation.errors.push(`Manual installation validation failed: ${error.message}`);
            console.log(`   ❌ Manual installation validation failed: ${error.message}`);
        }
    }

    generateReport() {
        console.log('\n📊 Installation Methods Test Results');
        console.log('====================================');
        
        const categories = ['packageValidation', 'f5Development', 'vsixPackaging', 'manualInstallation'];
        let totalPassed = 0;
        let totalFailed = 0;
        let totalErrors = 0;
        
        categories.forEach(category => {
            const result = this.results[category];
            const categoryName = category
                .replace(/([A-Z])/g, ' $1')
                .replace(/^./, str => str.toUpperCase())
                .replace('Vsix', 'VSIX')
                .replace('F5', 'F5');
            
            console.log(`\n${categoryName}:`);
            console.log(`  ✅ Passed: ${result.passed}`);
            console.log(`  ❌ Failed: ${result.failed}`);
            
            if (result.errors.length > 0) {
                console.log(`  Errors:`);
                result.errors.forEach(error => {
                    console.log(`    - ${error}`);
                });
            }
            
            totalPassed += result.passed;
            totalFailed += result.failed;
            totalErrors += result.errors.length;
        });
        
        console.log(`\nOverall Statistics:`);
        console.log(`  Total Passed: ${totalPassed}`);
        console.log(`  Total Failed: ${totalFailed}`);
        console.log(`  Total Errors: ${totalErrors}`);
        console.log(`  Warnings: ${this.results.warnings.length}`);
        
        if (this.results.warnings.length > 0) {
            console.log('\n⚠️  Warnings:');
            this.results.warnings.forEach(warning => {
                console.log(`   - ${warning}`);
            });
        }
        
        // Installation method recommendations
        console.log('\n📋 Installation Method Recommendations:');
        console.log('=====================================');
        
        if (this.results.f5Development.failed === 0) {
            console.log('✅ F5 Development Mode: Ready for development');
        } else {
            console.log('❌ F5 Development Mode: Issues found - fix compilation errors');
        }
        
        if (this.results.vsixPackaging.failed === 0) {
            console.log('✅ VSIX Packaging: Ready for distribution');
        } else {
            console.log('❌ VSIX Packaging: Issues found - install vsce and fix packaging errors');
        }
        
        if (this.results.manualInstallation.failed === 0) {
            console.log('✅ Manual Installation: Documentation and validation ready');
        } else {
            console.log('❌ Manual Installation: Issues found - improve documentation and validation');
        }
        
        // Overall status
        const isSuccess = totalFailed === 0 && totalErrors === 0;
        const hasMinorIssues = this.results.warnings.length > 0;
        
        console.log('\n' + '='.repeat(60));
        if (isSuccess && !hasMinorIssues) {
            console.log('🎉 ALL INSTALLATION TESTS PASSED - All installation methods ready!');
        } else if (isSuccess && hasMinorIssues) {
            console.log('✅ INSTALLATION TESTS PASSED - Minor improvements recommended');
        } else {
            console.log('❌ INSTALLATION TESTS FAILED - Issues found in installation methods');
            console.log('   Please fix the errors above and run the test again.');
        }
        console.log('='.repeat(60));
        
        return isSuccess;
    }
}

// Run the tests if this script is executed directly
if (require.main === module) {
    const tester = new InstallationMethodsTester();
    tester.runTests().then(() => {
        process.exit(0);
    }).catch(error => {
        console.error('Test execution failed:', error);
        process.exit(1);
    });
}

module.exports = InstallationMethodsTester;