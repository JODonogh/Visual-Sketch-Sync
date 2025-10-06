#!/usr/bin/env node

/**
 * Test script for VSS error handling and user feedback
 * Tests error scenarios and user feedback mechanisms
 */

const fs = require('fs');
const path = require('path');

class ErrorHandlingTester {
    constructor() {
        this.extensionPath = path.join(__dirname, '..', 'src', 'extension.ts');
        this.webviewPath = path.join(__dirname, '..', 'webview', 'index.html');
        this.results = {
            extensionErrorHandling: { passed: 0, failed: 0, errors: [] },
            webviewErrorHandling: { passed: 0, failed: 0, errors: [] },
            userFeedback: { passed: 0, failed: 0, errors: [] },
            logging: { passed: 0, failed: 0, errors: [] },
            errors: [],
            warnings: []
        };
    }

    async runTests() {
        console.log('🧪 VSS Error Handling & User Feedback Test Suite');
        console.log('================================================\n');

        try {
            // Test 1: Extension error handling
            console.log('🛡️  Test 1: Validating extension error handling...');
            this.validateExtensionErrorHandling();
            
            // Test 2: Webview error handling
            console.log('\n🖼️  Test 2: Validating webview error handling...');
            this.validateWebviewErrorHandling();
            
            // Test 3: User feedback mechanisms
            console.log('\n💬 Test 3: Validating user feedback mechanisms...');
            this.validateUserFeedback();
            
            // Test 4: Logging and diagnostics
            console.log('\n📝 Test 4: Validating logging and diagnostics...');
            this.validateLogging();
            
            // Generate report
            this.generateReport();
            
        } catch (error) {
            console.error('❌ Test suite failed:', error.message);
            this.results.errors.push(`Test suite failure: ${error.message}`);
        }
    }

    validateExtensionErrorHandling() {
        try {
            const extensionContent = fs.readFileSync(this.extensionPath, 'utf8');
            
            // Check for try-catch blocks in critical functions
            const tryCatchCount = (extensionContent.match(/try\s*{/g) || []).length;
            const catchCount = (extensionContent.match(/catch\s*\(/g) || []).length;
            
            if (tryCatchCount >= 3 && catchCount >= 3) {
                console.log(`   ✅ Adequate try-catch blocks found (${tryCatchCount} try, ${catchCount} catch)`);
                this.results.extensionErrorHandling.passed++;
            } else {
                console.log(`   ❌ Insufficient error handling (${tryCatchCount} try, ${catchCount} catch)`);
                this.results.extensionErrorHandling.failed++;
                this.results.extensionErrorHandling.errors.push('Insufficient try-catch blocks');
            }
            
            // Check for activation error handling
            if (extensionContent.includes('activate') && extensionContent.includes('catch')) {
                console.log('   ✅ Activation error handling found');
                this.results.extensionErrorHandling.passed++;
            } else {
                console.log('   ❌ Activation error handling missing');
                this.results.extensionErrorHandling.failed++;
                this.results.extensionErrorHandling.errors.push('Missing activation error handling');
            }
            
            // Check for command error handling
            if (extensionContent.includes('createCommandHandler') && extensionContent.includes('catch')) {
                console.log('   ✅ Command error handling found');
                this.results.extensionErrorHandling.passed++;
            } else {
                console.log('   ❌ Command error handling missing');
                this.results.extensionErrorHandling.failed++;
                this.results.extensionErrorHandling.errors.push('Missing command error handling');
            }
            
            // Check for webview error handling
            if (extensionContent.includes('resolveWebviewView') && extensionContent.includes('catch')) {
                console.log('   ✅ Webview error handling found');
                this.results.extensionErrorHandling.passed++;
            } else {
                console.log('   ❌ Webview error handling missing');
                this.results.extensionErrorHandling.failed++;
                this.results.extensionErrorHandling.errors.push('Missing webview error handling');
            }
            
            // Check for warning handler
            if (extensionContent.includes('WarningHandler')) {
                console.log('   ✅ Warning handler class found');
                this.results.extensionErrorHandling.passed++;
            } else {
                console.log('   ❌ Warning handler class missing');
                this.results.extensionErrorHandling.failed++;
                this.results.extensionErrorHandling.errors.push('Missing warning handler class');
            }
            
            // Check for SQLite warning suppression
            if (extensionContent.includes('SQLite') && extensionContent.includes('suppress')) {
                console.log('   ✅ SQLite warning suppression found');
                this.results.extensionErrorHandling.passed++;
            } else {
                console.log('   ⚠️  SQLite warning suppression not detected');
                this.results.warnings.push('SQLite warning suppression not detected');
            }
            
        } catch (error) {
            this.results.extensionErrorHandling.errors.push(`Extension error handling validation failed: ${error.message}`);
            console.log(`   ❌ Extension error handling validation failed: ${error.message}`);
        }
    }

    validateWebviewErrorHandling() {
        try {
            const webviewContent = fs.readFileSync(this.webviewPath, 'utf8');
            
            // Extract JavaScript content
            const scriptMatch = webviewContent.match(/<script>([\s\S]*?)<\/script>/);
            if (!scriptMatch) {
                console.log('   ❌ No JavaScript found in webview');
                this.results.webviewErrorHandling.failed++;
                return;
            }
            
            const jsContent = scriptMatch[1];
            
            // Check for try-catch blocks
            const tryCatchCount = (jsContent.match(/try\s*{/g) || []).length;
            const catchCount = (jsContent.match(/catch\s*\(/g) || []).length;
            
            if (tryCatchCount >= 2 && catchCount >= 2) {
                console.log(`   ✅ Try-catch blocks found in webview (${tryCatchCount} try, ${catchCount} catch)`);
                this.results.webviewErrorHandling.passed++;
            } else {
                console.log(`   ⚠️  Limited try-catch blocks in webview (${tryCatchCount} try, ${catchCount} catch)`);
                this.results.warnings.push('Limited try-catch blocks in webview');
            }
            
            // Check for window error handler
            if (jsContent.includes('window.addEventListener') && jsContent.includes('error')) {
                console.log('   ✅ Global error handler found');
                this.results.webviewErrorHandling.passed++;
            } else {
                console.log('   ❌ Global error handler missing');
                this.results.webviewErrorHandling.failed++;
                this.results.webviewErrorHandling.errors.push('Missing global error handler');
            }
            
            // Check for unhandled promise rejection handler
            if (jsContent.includes('unhandledrejection')) {
                console.log('   ✅ Unhandled promise rejection handler found');
                this.results.webviewErrorHandling.passed++;
            } else {
                console.log('   ❌ Unhandled promise rejection handler missing');
                this.results.webviewErrorHandling.failed++;
                this.results.webviewErrorHandling.errors.push('Missing unhandled promise rejection handler');
            }
            
            // Check for canvas initialization error handling
            if (jsContent.includes('initializeCanvas') && jsContent.includes('catch')) {
                console.log('   ✅ Canvas initialization error handling found');
                this.results.webviewErrorHandling.passed++;
            } else {
                console.log('   ⚠️  Canvas initialization error handling not detected');
                this.results.warnings.push('Canvas initialization error handling not detected');
            }
            
            // Check for message sending error handling
            if (jsContent.includes('sendMessage') && jsContent.includes('catch')) {
                console.log('   ✅ Message sending error handling found');
                this.results.webviewErrorHandling.passed++;
            } else {
                console.log('   ⚠️  Message sending error handling not detected');
                this.results.warnings.push('Message sending error handling not detected');
            }
            
        } catch (error) {
            this.results.webviewErrorHandling.errors.push(`Webview error handling validation failed: ${error.message}`);
            console.log(`   ❌ Webview error handling validation failed: ${error.message}`);
        }
    }

    validateUserFeedback() {
        try {
            const extensionContent = fs.readFileSync(this.extensionPath, 'utf8');
            
            // Check for VS Code notification methods
            const notificationMethods = [
                'showInformationMessage',
                'showWarningMessage', 
                'showErrorMessage'
            ];
            
            notificationMethods.forEach(method => {
                const count = (extensionContent.match(new RegExp(method, 'g')) || []).length;
                if (count >= 2) {
                    console.log(`   ✅ ${method} used adequately (${count} times)`);
                    this.results.userFeedback.passed++;
                } else if (count >= 1) {
                    console.log(`   ⚠️  ${method} used sparingly (${count} times)`);
                    this.results.warnings.push(`${method} used sparingly`);
                } else {
                    console.log(`   ❌ ${method} not found`);
                    this.results.userFeedback.failed++;
                    this.results.userFeedback.errors.push(`Missing ${method}`);
                }
            });
            
            // Check for user action buttons in error messages
            if (extensionContent.includes('Retry') || extensionContent.includes('Show Details')) {
                console.log('   ✅ User action buttons found in error messages');
                this.results.userFeedback.passed++;
            } else {
                console.log('   ❌ User action buttons missing in error messages');
                this.results.userFeedback.failed++;
                this.results.userFeedback.errors.push('Missing user action buttons in error messages');
            }
            
            // Check for success feedback
            if (extensionContent.includes('successfully') || extensionContent.includes('completed')) {
                console.log('   ✅ Success feedback messages found');
                this.results.userFeedback.passed++;
            } else {
                console.log('   ❌ Success feedback messages missing');
                this.results.userFeedback.failed++;
                this.results.userFeedback.errors.push('Missing success feedback messages');
            }
            
            // Check for progress indicators
            if (extensionContent.includes('starting') || extensionContent.includes('loading')) {
                console.log('   ✅ Progress indicators found');
                this.results.userFeedback.passed++;
            } else {
                console.log('   ⚠️  Progress indicators not detected');
                this.results.warnings.push('Progress indicators not detected');
            }
            
            // Check for help/documentation links
            if (extensionContent.includes('Learn More') || extensionContent.includes('Report Issue')) {
                console.log('   ✅ Help/documentation links found');
                this.results.userFeedback.passed++;
            } else {
                console.log('   ❌ Help/documentation links missing');
                this.results.userFeedback.failed++;
                this.results.userFeedback.errors.push('Missing help/documentation links');
            }
            
        } catch (error) {
            this.results.userFeedback.errors.push(`User feedback validation failed: ${error.message}`);
            console.log(`   ❌ User feedback validation failed: ${error.message}`);
        }
    }

    validateLogging() {
        try {
            const extensionContent = fs.readFileSync(this.extensionPath, 'utf8');
            
            // Check for logging class
            if (extensionContent.includes('class VSSLogger')) {
                console.log('   ✅ VSSLogger class found');
                this.results.logging.passed++;
            } else {
                console.log('   ❌ VSSLogger class missing');
                this.results.logging.failed++;
                this.results.logging.errors.push('Missing VSSLogger class');
            }
            
            // Check for different log levels
            const logLevels = ['info', 'warn', 'error', 'debug'];
            logLevels.forEach(level => {
                if (extensionContent.includes(`logger.${level}`) || extensionContent.includes(`log('${level}'`)) {
                    console.log(`   ✅ ${level} logging found`);
                    this.results.logging.passed++;
                } else {
                    console.log(`   ❌ ${level} logging missing`);
                    this.results.logging.failed++;
                    this.results.logging.errors.push(`Missing ${level} logging`);
                }
            });
            
            // Check for log export functionality
            if (extensionContent.includes('exportLogs') || extensionContent.includes('exportDiagnosticLogs')) {
                console.log('   ✅ Log export functionality found');
                this.results.logging.passed++;
            } else {
                console.log('   ❌ Log export functionality missing');
                this.results.logging.failed++;
                this.results.logging.errors.push('Missing log export functionality');
            }
            
            // Check for diagnostic information
            if (extensionContent.includes('showEnhancedDiagnostics') || extensionContent.includes('diagnostics')) {
                console.log('   ✅ Diagnostic functionality found');
                this.results.logging.passed++;
            } else {
                console.log('   ❌ Diagnostic functionality missing');
                this.results.logging.failed++;
                this.results.logging.errors.push('Missing diagnostic functionality');
            }
            
            // Check for performance monitoring
            if (extensionContent.includes('memoryUsage') || extensionContent.includes('performance')) {
                console.log('   ✅ Performance monitoring found');
                this.results.logging.passed++;
            } else {
                console.log('   ⚠️  Performance monitoring not detected');
                this.results.warnings.push('Performance monitoring not detected');
            }
            
            // Check for health checks
            if (extensionContent.includes('healthCheck') || extensionContent.includes('performHealthCheck')) {
                console.log('   ✅ Health check functionality found');
                this.results.logging.passed++;
            } else {
                console.log('   ⚠️  Health check functionality not detected');
                this.results.warnings.push('Health check functionality not detected');
            }
            
        } catch (error) {
            this.results.logging.errors.push(`Logging validation failed: ${error.message}`);
            console.log(`   ❌ Logging validation failed: ${error.message}`);
        }
    }

    generateReport() {
        console.log('\n📊 Error Handling & User Feedback Test Results');
        console.log('===============================================');
        
        const categories = ['extensionErrorHandling', 'webviewErrorHandling', 'userFeedback', 'logging'];
        let totalPassed = 0;
        let totalFailed = 0;
        let totalErrors = 0;
        
        categories.forEach(category => {
            const result = this.results[category];
            const categoryName = category
                .replace(/([A-Z])/g, ' $1')
                .replace(/^./, str => str.toUpperCase())
                .replace('Error Handling', 'Error Handling');
            
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
        
        // Overall status
        const isSuccess = totalFailed === 0 && totalErrors === 0;
        const hasMinorIssues = this.results.warnings.length > 0;
        
        console.log('\n' + '='.repeat(60));
        if (isSuccess && !hasMinorIssues) {
            console.log('🎉 ALL ERROR HANDLING TESTS PASSED - Robust error handling implemented!');
        } else if (isSuccess && hasMinorIssues) {
            console.log('✅ ERROR HANDLING TESTS PASSED - Minor improvements recommended');
        } else {
            console.log('❌ ERROR HANDLING TESTS FAILED - Issues found in error handling');
            console.log('   Please fix the errors above and run the test again.');
        }
        console.log('='.repeat(60));
        
        return isSuccess;
    }
}

// Run the tests if this script is executed directly
if (require.main === module) {
    const tester = new ErrorHandlingTester();
    tester.runTests().then(() => {
        process.exit(0);
    }).catch(error => {
        console.error('Test execution failed:', error);
        process.exit(1);
    });
}

module.exports = ErrorHandlingTester;