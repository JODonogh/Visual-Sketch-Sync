#!/usr/bin/env node

/**
 * Test script for VSS webview functionality
 * Tests webview HTML, JavaScript, and communication capabilities
 */

const fs = require('fs');
const path = require('path');

class WebviewFunctionalityTester {
    constructor() {
        this.webviewPath = path.join(__dirname, '..', 'webview', 'index.html');
        this.results = {
            htmlStructure: { passed: 0, failed: 0, errors: [] },
            javascript: { passed: 0, failed: 0, errors: [] },
            styling: { passed: 0, failed: 0, errors: [] },
            communication: { passed: 0, failed: 0, errors: [] },
            errors: [],
            warnings: []
        };
    }

    async runTests() {
        console.log('🧪 VSS Webview Functionality Test Suite');
        console.log('=======================================\n');

        try {
            // Test 1: HTML Structure validation
            console.log('📄 Test 1: Validating HTML structure...');
            this.validateHTMLStructure();
            
            // Test 2: JavaScript functionality
            console.log('\n🔧 Test 2: Validating JavaScript functionality...');
            this.validateJavaScript();
            
            // Test 3: CSS styling
            console.log('\n🎨 Test 3: Validating CSS styling...');
            this.validateCSS();
            
            // Test 4: VS Code communication
            console.log('\n📡 Test 4: Validating VS Code communication...');
            this.validateCommunication();
            
            // Generate report
            this.generateReport();
            
        } catch (error) {
            console.error('❌ Test suite failed:', error.message);
            this.results.errors.push(`Test suite failure: ${error.message}`);
        }
    }

    validateHTMLStructure() {
        try {
            const htmlContent = fs.readFileSync(this.webviewPath, 'utf8');
            
            // Check for required HTML elements
            const requiredElements = [
                { element: 'canvas', id: 'drawing-canvas', description: 'Main drawing canvas' },
                { element: 'div', id: 'status', description: 'Status display' },
                { element: 'div', id: 'canvas-container', description: 'Canvas container' },
                { element: 'div', class: 'toolbar', description: 'Drawing toolbar' }
            ];
            
            requiredElements.forEach(req => {
                const selector = req.id ? `id="${req.id}"` : `class="${req.class}"`;
                const regex = new RegExp(`<${req.element}[^>]*${selector}[^>]*>`, 'i');
                
                if (regex.test(htmlContent)) {
                    console.log(`   ✅ ${req.description} found`);
                    this.results.htmlStructure.passed++;
                } else {
                    console.log(`   ❌ ${req.description} missing`);
                    this.results.htmlStructure.failed++;
                    this.results.htmlStructure.errors.push(`Missing ${req.description}`);
                }
            });
            
            // Check for Content Security Policy
            if (htmlContent.includes('Content-Security-Policy')) {
                console.log('   ✅ Content Security Policy found');
                this.results.htmlStructure.passed++;
            } else {
                console.log('   ❌ Content Security Policy missing');
                this.results.htmlStructure.failed++;
                this.results.htmlStructure.errors.push('Missing Content Security Policy');
            }
            
            // Check for viewport meta tag
            if (htmlContent.includes('viewport')) {
                console.log('   ✅ Viewport meta tag found');
                this.results.htmlStructure.passed++;
            } else {
                console.log('   ⚠️  Viewport meta tag missing (recommended for mobile)');
                this.results.warnings.push('Viewport meta tag missing');
            }
            
        } catch (error) {
            this.results.htmlStructure.errors.push(`HTML validation failed: ${error.message}`);
            console.log(`   ❌ HTML validation failed: ${error.message}`);
        }
    }

    validateJavaScript() {
        try {
            const htmlContent = fs.readFileSync(this.webviewPath, 'utf8');
            
            // Extract JavaScript content
            const scriptMatch = htmlContent.match(/<script>([\s\S]*?)<\/script>/);
            if (!scriptMatch) {
                console.log('   ❌ No JavaScript found in webview');
                this.results.javascript.failed++;
                return;
            }
            
            const jsContent = scriptMatch[1];
            
            // Check for required JavaScript functions
            const requiredFunctions = [
                'initializeCanvas',
                'setupEventListeners',
                'setupMessagePassing',
                'startDrawing',
                'draw',
                'stopDrawing',
                'clearCanvas',
                'sendMessage'
            ];
            
            requiredFunctions.forEach(func => {
                const regex = new RegExp(`function\\s+${func}\\s*\\(|${func}\\s*[=:]\\s*function|${func}\\s*\\(`, 'i');
                if (regex.test(jsContent)) {
                    console.log(`   ✅ Function ${func} found`);
                    this.results.javascript.passed++;
                } else {
                    console.log(`   ❌ Function ${func} missing`);
                    this.results.javascript.failed++;
                    this.results.javascript.errors.push(`Missing function: ${func}`);
                }
            });
            
            // Check for VS Code API usage
            if (jsContent.includes('acquireVsCodeApi')) {
                console.log('   ✅ VS Code API acquisition found');
                this.results.javascript.passed++;
            } else {
                console.log('   ❌ VS Code API acquisition missing');
                this.results.javascript.failed++;
                this.results.javascript.errors.push('Missing VS Code API acquisition');
            }
            
            // Check for event listeners
            const eventListeners = ['mousedown', 'mousemove', 'mouseup', 'touchstart', 'touchmove'];
            eventListeners.forEach(event => {
                if (jsContent.includes(`'${event}'`) || jsContent.includes(`"${event}"`)) {
                    console.log(`   ✅ Event listener for ${event} found`);
                    this.results.javascript.passed++;
                } else {
                    console.log(`   ⚠️  Event listener for ${event} missing`);
                    this.results.warnings.push(`Missing ${event} event listener`);
                }
            });
            
            // Check for error handling
            if (jsContent.includes('try') && jsContent.includes('catch')) {
                console.log('   ✅ Error handling found');
                this.results.javascript.passed++;
            } else {
                console.log('   ⚠️  Error handling missing or limited');
                this.results.warnings.push('Limited error handling in JavaScript');
            }
            
        } catch (error) {
            this.results.javascript.errors.push(`JavaScript validation failed: ${error.message}`);
            console.log(`   ❌ JavaScript validation failed: ${error.message}`);
        }
    }

    validateCSS() {
        try {
            const htmlContent = fs.readFileSync(this.webviewPath, 'utf8');
            
            // Extract CSS content
            const styleMatch = htmlContent.match(/<style>([\s\S]*?)<\/style>/);
            if (!styleMatch) {
                console.log('   ❌ No CSS found in webview');
                this.results.styling.failed++;
                return;
            }
            
            const cssContent = styleMatch[1];
            
            // Check for required CSS selectors
            const requiredSelectors = [
                '#canvas-container',
                '#drawing-canvas',
                '#status',
                '.toolbar',
                '.tool-button'
            ];
            
            requiredSelectors.forEach(selector => {
                const regex = new RegExp(`${selector.replace('#', '\\#').replace('.', '\\.')}\\s*{`, 'i');
                if (regex.test(cssContent)) {
                    console.log(`   ✅ CSS selector ${selector} found`);
                    this.results.styling.passed++;
                } else {
                    console.log(`   ❌ CSS selector ${selector} missing`);
                    this.results.styling.failed++;
                    this.results.styling.errors.push(`Missing CSS selector: ${selector}`);
                }
            });
            
            // Check for responsive design
            if (cssContent.includes('flex') || cssContent.includes('grid')) {
                console.log('   ✅ Flexible layout found');
                this.results.styling.passed++;
            } else {
                console.log('   ⚠️  No flexible layout detected');
                this.results.warnings.push('No flexible layout (flex/grid) detected');
            }
            
            // Check for dark theme support
            if (cssContent.includes('#1e1e1e') || cssContent.includes('dark')) {
                console.log('   ✅ Dark theme styling found');
                this.results.styling.passed++;
            } else {
                console.log('   ⚠️  Dark theme styling not detected');
                this.results.warnings.push('Dark theme styling not detected');
            }
            
            // Check for touch-friendly design
            if (cssContent.includes('touch-action') || cssContent.includes('user-select')) {
                console.log('   ✅ Touch-friendly CSS found');
                this.results.styling.passed++;
            } else {
                console.log('   ⚠️  Touch-friendly CSS not detected');
                this.results.warnings.push('Touch-friendly CSS not detected');
            }
            
        } catch (error) {
            this.results.styling.errors.push(`CSS validation failed: ${error.message}`);
            console.log(`   ❌ CSS validation failed: ${error.message}`);
        }
    }

    validateCommunication() {
        try {
            const htmlContent = fs.readFileSync(this.webviewPath, 'utf8');
            
            // Extract JavaScript content for communication analysis
            const scriptMatch = htmlContent.match(/<script>([\s\S]*?)<\/script>/);
            if (!scriptMatch) {
                console.log('   ❌ No JavaScript found for communication analysis');
                this.results.communication.failed++;
                return;
            }
            
            const jsContent = scriptMatch[1];
            
            // Check for message sending capability
            if (jsContent.includes('vscode.postMessage')) {
                console.log('   ✅ Message sending capability found');
                this.results.communication.passed++;
            } else {
                console.log('   ❌ Message sending capability missing');
                this.results.communication.failed++;
                this.results.communication.errors.push('Missing message sending capability');
            }
            
            // Check for message receiving capability
            if (jsContent.includes('window.addEventListener') && jsContent.includes('message')) {
                console.log('   ✅ Message receiving capability found');
                this.results.communication.passed++;
            } else {
                console.log('   ❌ Message receiving capability missing');
                this.results.communication.failed++;
                this.results.communication.errors.push('Missing message receiving capability');
            }
            
            // Check for specific message types
            const messageTypes = ['canvasReady', 'drawingStarted', 'drawing', 'drawingEnded', 'toolChanged'];
            messageTypes.forEach(msgType => {
                if (jsContent.includes(msgType)) {
                    console.log(`   ✅ Message type '${msgType}' found`);
                    this.results.communication.passed++;
                } else {
                    console.log(`   ⚠️  Message type '${msgType}' not found`);
                    this.results.warnings.push(`Message type '${msgType}' not found`);
                }
            });
            
            // Check for error handling in communication
            if (jsContent.includes('try') && jsContent.includes('postMessage')) {
                console.log('   ✅ Communication error handling found');
                this.results.communication.passed++;
            } else {
                console.log('   ⚠️  Communication error handling missing');
                this.results.warnings.push('Communication error handling missing');
            }
            
        } catch (error) {
            this.results.communication.errors.push(`Communication validation failed: ${error.message}`);
            console.log(`   ❌ Communication validation failed: ${error.message}`);
        }
    }

    generateReport() {
        console.log('\n📊 Webview Test Results Summary');
        console.log('===============================');
        
        const categories = ['htmlStructure', 'javascript', 'styling', 'communication'];
        let totalPassed = 0;
        let totalFailed = 0;
        let totalErrors = 0;
        
        categories.forEach(category => {
            const result = this.results[category];
            const categoryName = category.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
            
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
        
        console.log('\n' + '='.repeat(50));
        if (isSuccess && !hasMinorIssues) {
            console.log('🎉 ALL WEBVIEW TESTS PASSED - Webview is fully functional!');
        } else if (isSuccess && hasMinorIssues) {
            console.log('✅ WEBVIEW TESTS PASSED - Minor improvements recommended');
        } else {
            console.log('❌ WEBVIEW TESTS FAILED - Issues found in webview implementation');
            console.log('   Please fix the errors above and run the test again.');
        }
        console.log('='.repeat(50));
        
        return isSuccess;
    }
}

// Run the tests if this script is executed directly
if (require.main === module) {
    const tester = new WebviewFunctionalityTester();
    tester.runTests().then(() => {
        process.exit(0);
    }).catch(error => {
        console.error('Test execution failed:', error);
        process.exit(1);
    });
}

module.exports = WebviewFunctionalityTester;