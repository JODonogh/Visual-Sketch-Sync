#!/usr/bin/env node

/**
 * Test script for VSS command registration and execution
 * Tests all commands declared in package.json to ensure they are properly registered
 */

const fs = require('fs');
const path = require('path');

class CommandRegistrationTester {
    constructor() {
        this.packageJsonPath = path.join(__dirname, '..', 'package.json');
        this.extensionPath = path.join(__dirname, '..', 'src', 'extension.ts');
        this.results = {
            totalCommands: 0,
            registeredCommands: 0,
            missingCommands: [],
            errors: [],
            warnings: []
        };
    }

    async runTests() {
        console.log('🧪 VSS Command Registration Test Suite');
        console.log('=====================================\n');

        try {
            // Test 1: Verify package.json commands exist
            console.log('📋 Test 1: Analyzing package.json commands...');
            const packageCommands = this.getPackageJsonCommands();
            console.log(`   Found ${packageCommands.length} commands declared in package.json`);
            
            // Test 2: Verify extension.ts command registration
            console.log('\n🔧 Test 2: Analyzing extension.ts command registration...');
            const registeredCommands = this.getRegisteredCommands();
            console.log(`   Found ${registeredCommands.length} commands registered in extension.ts`);
            
            // Test 3: Compare and validate
            console.log('\n✅ Test 3: Validating command registration completeness...');
            this.validateCommandRegistration(packageCommands, registeredCommands);
            
            // Test 4: Check webview provider registration
            console.log('\n🖼️  Test 4: Validating webview provider registration...');
            this.validateWebviewProvider();
            
            // Test 5: Check activation events
            console.log('\n🚀 Test 5: Validating activation events...');
            this.validateActivationEvents();
            
            // Generate report
            this.generateReport();
            
        } catch (error) {
            console.error('❌ Test suite failed:', error.message);
            this.results.errors.push(`Test suite failure: ${error.message}`);
        }
    }

    getPackageJsonCommands() {
        try {
            const packageJson = JSON.parse(fs.readFileSync(this.packageJsonPath, 'utf8'));
            const commands = packageJson.contributes?.commands || [];
            
            this.results.totalCommands = commands.length;
            
            console.log('   Commands declared in package.json:');
            commands.forEach(cmd => {
                console.log(`   - ${cmd.command}: "${cmd.title}"`);
            });
            
            return commands.map(cmd => cmd.command);
        } catch (error) {
            this.results.errors.push(`Failed to read package.json: ${error.message}`);
            return [];
        }
    }

    getRegisteredCommands() {
        try {
            const extensionContent = fs.readFileSync(this.extensionPath, 'utf8');
            
            // Extract command registrations using regex
            const commandRegex = /vscode\.commands\.registerCommand\s*\(\s*['"`]([^'"`]+)['"`]/g;
            const createCommandHandlerRegex = /createCommandHandler\s*\(\s*['"`]([^'"`]+)['"`]/g;
            
            const registeredCommands = new Set();
            
            // Find direct command registrations
            let match;
            while ((match = commandRegex.exec(extensionContent)) !== null) {
                registeredCommands.add(match[1]);
            }
            
            // Find commands registered through createCommandHandler
            while ((match = createCommandHandlerRegex.exec(extensionContent)) !== null) {
                registeredCommands.add(match[1]);
            }
            
            const commandArray = Array.from(registeredCommands);
            
            console.log('   Commands registered in extension.ts:');
            commandArray.forEach(cmd => {
                console.log(`   - ${cmd}`);
            });
            
            this.results.registeredCommands = commandArray.length;
            return commandArray;
            
        } catch (error) {
            this.results.errors.push(`Failed to read extension.ts: ${error.message}`);
            return [];
        }
    }

    validateCommandRegistration(packageCommands, registeredCommands) {
        const missingCommands = packageCommands.filter(cmd => !registeredCommands.includes(cmd));
        const extraCommands = registeredCommands.filter(cmd => !packageCommands.includes(cmd));
        
        if (missingCommands.length === 0) {
            console.log('   ✅ All package.json commands are registered in extension.ts');
        } else {
            console.log('   ❌ Missing command registrations:');
            missingCommands.forEach(cmd => {
                console.log(`      - ${cmd}`);
                this.results.missingCommands.push(cmd);
            });
        }
        
        if (extraCommands.length > 0) {
            console.log('   ⚠️  Extra commands registered (not in package.json):');
            extraCommands.forEach(cmd => {
                console.log(`      - ${cmd}`);
                this.results.warnings.push(`Extra command registered: ${cmd}`);
            });
        }
        
        // Check for specific critical commands
        const criticalCommands = ['vss.openDrawingCanvas', 'vss.startSyncServer', 'vss.exportDesign'];
        const missingCritical = criticalCommands.filter(cmd => !registeredCommands.includes(cmd));
        
        if (missingCritical.length > 0) {
            console.log('   🚨 Missing critical commands:');
            missingCritical.forEach(cmd => {
                console.log(`      - ${cmd}`);
                this.results.errors.push(`Critical command missing: ${cmd}`);
            });
        }
    }

    validateWebviewProvider() {
        try {
            const extensionContent = fs.readFileSync(this.extensionPath, 'utf8');
            
            // Check for webview provider registration
            const webviewProviderRegex = /registerWebviewViewProvider\s*\(\s*['"`]([^'"`]+)['"`]/;
            const match = webviewProviderRegex.exec(extensionContent);
            
            if (match) {
                console.log(`   ✅ Webview provider registered: ${match[1]}`);
                
                // Check if DrawingCanvasProvider class exists
                if (extensionContent.includes('class DrawingCanvasProvider')) {
                    console.log('   ✅ DrawingCanvasProvider class found');
                } else {
                    this.results.errors.push('DrawingCanvasProvider class not found');
                    console.log('   ❌ DrawingCanvasProvider class not found');
                }
                
                // Check for resolveWebviewView method
                if (extensionContent.includes('resolveWebviewView')) {
                    console.log('   ✅ resolveWebviewView method found');
                } else {
                    this.results.errors.push('resolveWebviewView method not found');
                    console.log('   ❌ resolveWebviewView method not found');
                }
                
            } else {
                this.results.errors.push('Webview provider registration not found');
                console.log('   ❌ Webview provider registration not found');
            }
            
        } catch (error) {
            this.results.errors.push(`Webview validation failed: ${error.message}`);
        }
    }

    validateActivationEvents() {
        try {
            const packageJson = JSON.parse(fs.readFileSync(this.packageJsonPath, 'utf8'));
            const activationEvents = packageJson.activationEvents || [];
            
            console.log('   Activation events:');
            activationEvents.forEach(event => {
                console.log(`   - ${event}`);
            });
            
            // Check for critical activation events
            const requiredEvents = ['onCommand:vss.openDrawingCanvas'];
            const missingEvents = requiredEvents.filter(event => !activationEvents.includes(event));
            
            if (missingEvents.length === 0) {
                console.log('   ✅ All required activation events present');
            } else {
                console.log('   ❌ Missing activation events:');
                missingEvents.forEach(event => {
                    console.log(`      - ${event}`);
                    this.results.errors.push(`Missing activation event: ${event}`);
                });
            }
            
        } catch (error) {
            this.results.errors.push(`Activation events validation failed: ${error.message}`);
        }
    }

    generateReport() {
        console.log('\n📊 Test Results Summary');
        console.log('=======================');
        
        console.log(`Total commands in package.json: ${this.results.totalCommands}`);
        console.log(`Commands registered in extension: ${this.results.registeredCommands}`);
        console.log(`Missing registrations: ${this.results.missingCommands.length}`);
        console.log(`Errors: ${this.results.errors.length}`);
        console.log(`Warnings: ${this.results.warnings.length}`);
        
        if (this.results.errors.length > 0) {
            console.log('\n❌ Errors:');
            this.results.errors.forEach(error => {
                console.log(`   - ${error}`);
            });
        }
        
        if (this.results.warnings.length > 0) {
            console.log('\n⚠️  Warnings:');
            this.results.warnings.forEach(warning => {
                console.log(`   - ${warning}`);
            });
        }
        
        if (this.results.missingCommands.length > 0) {
            console.log('\n🔧 Missing Command Registrations:');
            this.results.missingCommands.forEach(cmd => {
                console.log(`   - Add: createCommandHandler('${cmd}', async () => { /* implementation */ })`);
            });
        }
        
        // Overall status
        const isSuccess = this.results.errors.length === 0 && this.results.missingCommands.length === 0;
        
        console.log('\n' + '='.repeat(50));
        if (isSuccess) {
            console.log('🎉 ALL TESTS PASSED - Command registration is complete!');
        } else {
            console.log('❌ TESTS FAILED - Issues found in command registration');
            console.log('   Please fix the errors above and run the test again.');
        }
        console.log('='.repeat(50));
        
        return isSuccess;
    }
}

// Run the tests if this script is executed directly
if (require.main === module) {
    const tester = new CommandRegistrationTester();
    tester.runTests().then(() => {
        process.exit(0);
    }).catch(error => {
        console.error('Test execution failed:', error);
        process.exit(1);
    });
}

module.exports = CommandRegistrationTester;