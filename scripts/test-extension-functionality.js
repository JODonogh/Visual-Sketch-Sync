#!/usr/bin/env node

/**
 * Comprehensive test suite for VSS extension functionality
 * Runs all individual test suites and provides a consolidated report
 */

const CommandRegistrationTester = require('./test-command-registration');
const WebviewFunctionalityTester = require('./test-webview-functionality');
const ErrorHandlingTester = require('./test-error-handling');
const InstallationMethodsTester = require('./test-installation-methods');

class ExtensionFunctionalityTester {
    constructor() {
        this.results = {
            commandRegistration: null,
            webviewFunctionality: null,
            errorHandling: null,
            installationMethods: null,
            overallSuccess: false,
            totalTests: 0,
            passedTests: 0,
            failedTests: 0,
            warnings: 0
        };
    }

    async runAllTests() {
        console.log('🚀 VSS Extension Functionality - Comprehensive Test Suite');
        console.log('========================================================\n');
        
        const startTime = Date.now();
        
        try {
            // Test Suite 1: Command Registration
            console.log('🔧 Running Command Registration Tests...');
            console.log('─'.repeat(50));
            const commandTester = new CommandRegistrationTester();
            await commandTester.runTests();
            this.results.commandRegistration = this.extractResults(commandTester.results);
            
            console.log('\n' + '═'.repeat(60) + '\n');
            
            // Test Suite 2: Webview Functionality
            console.log('🖼️  Running Webview Functionality Tests...');
            console.log('─'.repeat(50));
            const webviewTester = new WebviewFunctionalityTester();
            await webviewTester.runTests();
            this.results.webviewFunctionality = this.extractWebviewResults(webviewTester.results);
            
            console.log('\n' + '═'.repeat(60) + '\n');
            
            // Test Suite 3: Error Handling
            console.log('🛡️  Running Error Handling Tests...');
            console.log('─'.repeat(50));
            const errorTester = new ErrorHandlingTester();
            await errorTester.runTests();
            this.results.errorHandling = this.extractErrorHandlingResults(errorTester.results);
            
            console.log('\n' + '═'.repeat(60) + '\n');
            
            // Test Suite 4: Installation Methods
            console.log('📦 Running Installation Methods Tests...');
            console.log('─'.repeat(50));
            const installTester = new InstallationMethodsTester();
            await installTester.runTests();
            this.results.installationMethods = this.extractInstallationResults(installTester.results);
            
            // Generate comprehensive report
            const duration = Date.now() - startTime;
            this.generateComprehensiveReport(duration);
            
        } catch (error) {
            console.error('❌ Comprehensive test suite failed:', error.message);
            process.exit(1);
        }
    }

    extractResults(results) {
        return {
            totalCommands: results.totalCommands || 0,
            registeredCommands: results.registeredCommands || 0,
            missingCommands: results.missingCommands?.length || 0,
            errors: results.errors?.length || 0,
            warnings: results.warnings?.length || 0,
            success: (results.errors?.length || 0) === 0 && (results.missingCommands?.length || 0) === 0
        };
    }

    extractWebviewResults(results) {
        const totalPassed = Object.values(results).reduce((sum, category) => {
            return sum + (category.passed || 0);
        }, 0);
        const totalFailed = Object.values(results).reduce((sum, category) => {
            return sum + (category.failed || 0);
        }, 0);
        const totalErrors = Object.values(results).reduce((sum, category) => {
            return sum + (category.errors?.length || 0);
        }, 0);
        
        return {
            totalPassed,
            totalFailed,
            totalErrors,
            warnings: results.warnings?.length || 0,
            success: totalFailed === 0 && totalErrors === 0
        };
    }

    extractErrorHandlingResults(results) {
        const totalPassed = Object.values(results).reduce((sum, category) => {
            if (category.passed !== undefined) {
                return sum + category.passed;
            }
            return sum;
        }, 0);
        const totalFailed = Object.values(results).reduce((sum, category) => {
            if (category.failed !== undefined) {
                return sum + category.failed;
            }
            return sum;
        }, 0);
        const totalErrors = Object.values(results).reduce((sum, category) => {
            if (category.errors?.length !== undefined) {
                return sum + category.errors.length;
            }
            return sum;
        }, 0);
        
        return {
            totalPassed,
            totalFailed,
            totalErrors,
            warnings: results.warnings?.length || 0,
            success: totalFailed === 0 && totalErrors === 0
        };
    }

    extractInstallationResults(results) {
        const totalPassed = Object.values(results).reduce((sum, category) => {
            if (category.passed !== undefined) {
                return sum + category.passed;
            }
            return sum;
        }, 0);
        const totalFailed = Object.values(results).reduce((sum, category) => {
            if (category.failed !== undefined) {
                return sum + category.failed;
            }
            return sum;
        }, 0);
        const totalErrors = Object.values(results).reduce((sum, category) => {
            if (category.errors?.length !== undefined) {
                return sum + category.errors.length;
            }
            return sum;
        }, 0);
        
        return {
            totalPassed,
            totalFailed,
            totalErrors,
            warnings: results.warnings?.length || 0,
            success: totalFailed === 0 && totalErrors === 0
        };
    }

    generateComprehensiveReport(duration) {
        console.log('\n' + '🎯 COMPREHENSIVE TEST RESULTS SUMMARY'.padStart(50));
        console.log('═'.repeat(80));
        
        // Individual test suite results
        console.log('\n📊 Test Suite Results:');
        console.log('─'.repeat(30));
        
        const suites = [
            { name: 'Command Registration', result: this.results.commandRegistration },
            { name: 'Webview Functionality', result: this.results.webviewFunctionality },
            { name: 'Error Handling', result: this.results.errorHandling },
            { name: 'Installation Methods', result: this.results.installationMethods }
        ];
        
        let overallSuccess = true;
        let totalPassed = 0;
        let totalFailed = 0;
        let totalErrors = 0;
        let totalWarnings = 0;
        
        suites.forEach(suite => {
            const status = suite.result.success ? '✅ PASS' : '❌ FAIL';
            console.log(`${suite.name.padEnd(25)} ${status}`);
            
            if (suite.result.totalPassed !== undefined) {
                totalPassed += suite.result.totalPassed;
            }
            if (suite.result.totalFailed !== undefined) {
                totalFailed += suite.result.totalFailed;
            }
            if (suite.result.totalErrors !== undefined) {
                totalErrors += suite.result.totalErrors;
            }
            if (suite.result.warnings !== undefined) {
                totalWarnings += suite.result.warnings;
            }
            
            if (!suite.result.success) {
                overallSuccess = false;
            }
        });
        
        // Detailed statistics
        console.log('\n📈 Detailed Statistics:');
        console.log('─'.repeat(30));
        console.log(`Total Tests Passed:     ${totalPassed}`);
        console.log(`Total Tests Failed:     ${totalFailed}`);
        console.log(`Total Errors:           ${totalErrors}`);
        console.log(`Total Warnings:         ${totalWarnings}`);
        console.log(`Test Duration:          ${(duration / 1000).toFixed(2)}s`);
        
        // Command registration specific
        if (this.results.commandRegistration) {
            console.log('\n🔧 Command Registration Details:');
            console.log(`  Commands in package.json: ${this.results.commandRegistration.totalCommands}`);
            console.log(`  Commands registered:      ${this.results.commandRegistration.registeredCommands}`);
            console.log(`  Missing registrations:    ${this.results.commandRegistration.missingCommands}`);
        }
        
        // Requirements validation
        console.log('\n✅ Requirements Validation:');
        console.log('─'.repeat(30));
        
        const requirements = [
            {
                id: '1.1, 1.2, 1.3',
                description: 'Command registration and webview functionality',
                status: this.results.commandRegistration?.success && this.results.webviewFunctionality?.success
            },
            {
                id: '2.1, 2.2, 2.3, 2.4',
                description: 'Installation methods and packaging',
                status: this.results.installationMethods?.success
            },
            {
                id: '1.4, 2.5',
                description: 'Error handling and user feedback',
                status: this.results.errorHandling?.success
            }
        ];
        
        requirements.forEach(req => {
            const status = req.status ? '✅ SATISFIED' : '❌ NOT SATISFIED';
            console.log(`Requirement ${req.id}: ${status}`);
            console.log(`  ${req.description}`);
        });
        
        // Final verdict
        console.log('\n' + '═'.repeat(80));
        if (overallSuccess && totalWarnings === 0) {
            console.log('🎉 ALL TESTS PASSED - EXTENSION FULLY FUNCTIONAL!');
            console.log('   The VSS extension is ready for use and distribution.');
            console.log('   All commands are registered, webview works correctly,');
            console.log('   error handling is robust, and installation methods are validated.');
        } else if (overallSuccess && totalWarnings > 0) {
            console.log('✅ TESTS PASSED WITH MINOR ISSUES');
            console.log(`   ${totalWarnings} warnings found - consider addressing for optimal experience.`);
            console.log('   Extension is functional but has room for improvement.');
        } else {
            console.log('❌ TESTS FAILED - ISSUES REQUIRE ATTENTION');
            console.log(`   ${totalFailed} failed tests and ${totalErrors} errors found.`);
            console.log('   Please address the issues above before using the extension.');
        }
        
        // Next steps
        console.log('\n📋 Next Steps:');
        console.log('─'.repeat(15));
        if (overallSuccess) {
            console.log('1. ✅ Extension is ready for testing in VS Code');
            console.log('2. ✅ Use F5 to launch Extension Development Host');
            console.log('3. ✅ Test "VSS: Open Drawing Canvas" command');
            console.log('4. ✅ Create VSIX package for distribution if needed');
        } else {
            console.log('1. ❌ Fix failed tests and errors identified above');
            console.log('2. ❌ Re-run test suite to verify fixes');
            console.log('3. ❌ Address any remaining warnings');
            console.log('4. ❌ Proceed with testing only after all tests pass');
        }
        
        console.log('═'.repeat(80));
        
        this.results.overallSuccess = overallSuccess;
        this.results.totalTests = totalPassed + totalFailed;
        this.results.passedTests = totalPassed;
        this.results.failedTests = totalFailed;
        this.results.warnings = totalWarnings;
        
        return overallSuccess;
    }
}

// Run the comprehensive test suite if this script is executed directly
if (require.main === module) {
    const tester = new ExtensionFunctionalityTester();
    tester.runAllTests().then(() => {
        const exitCode = tester.results.overallSuccess ? 0 : 1;
        process.exit(exitCode);
    }).catch(error => {
        console.error('Comprehensive test execution failed:', error);
        process.exit(1);
    });
}

module.exports = ExtensionFunctionalityTester;