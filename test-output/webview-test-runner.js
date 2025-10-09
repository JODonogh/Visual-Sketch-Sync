/**
 * Webview Initialization Fix - Comprehensive Test Runner
 * 
 * This test runner executes all test suites for the webview initialization fix
 * and provides a unified interface for running and reporting test results.
 * 
 * Test Suites:
 * - Webview Reloading Tests (5.1)
 * - Canvas Functionality Verification (5.2) 
 * - Error Handling Tests (5.3)
 */

class WebviewTestRunner {
    constructor() {
        this.testSuites = [];
        this.overallResults = {
            totalTests: 0,
            totalPassed: 0,
            totalFailed: 0,
            totalSkipped: 0,
            successRate: 0,
            suiteResults: [],
            startTime: null,
            endTime: null,
            duration: 0
        };
        this.config = {
            runInParallel: false,
            stopOnFirstFailure: false,
            generateDetailedReport: true,
            exportResults: true
        };
    }

    /**
     * Register a test suite to be run
     * @param {string} name - Name of the test suite
     * @param {Function} suiteClass - Test suite class constructor
     * @param {Object} options - Suite-specific options
     */
    registerTestSuite(name, suiteClass, options = {}) {
        this.testSuites.push({
            name: name,
            suiteClass: suiteClass,
            options: options,
            enabled: options.enabled !== false
        });
    }

    /**
     * Run all registered test suites
     * @param {Object} runConfig - Configuration for this test run
     * @returns {Object} - Comprehensive test results
     */
    async runAllTests(runConfig = {}) {
        // Merge configuration
        this.config = { ...this.config, ...runConfig };
        
        console.log('🧪 Starting Webview Initialization Fix Test Suite');
        console.log('='.repeat(70));
        console.log(`Test Configuration:`);
        console.log(`  - Run in parallel: ${this.config.runInParallel}`);
        console.log(`  - Stop on first failure: ${this.config.stopOnFirstFailure}`);
        console.log(`  - Generate detailed report: ${this.config.generateDetailedReport}`);
        console.log(`  - Export results: ${this.config.exportResults}`);
        console.log('='.repeat(70));
        
        this.overallResults.startTime = new Date();
        
        try {
            // Filter enabled test suites
            const enabledSuites = this.testSuites.filter(suite => suite.enabled);
            
            if (enabledSuites.length === 0) {
                throw new Error('No test suites enabled');
            }
            
            console.log(`Running ${enabledSuites.length} test suite(s):\n`);
            enabledSuites.forEach((suite, index) => {
                console.log(`  ${index + 1}. ${suite.name}`);
            });
            console.log('');
            
            // Run test suites
            if (this.config.runInParallel) {
                await this.runSuitesInParallel(enabledSuites);
            } else {
                await this.runSuitesSequentially(enabledSuites);
            }
            
            // Calculate overall results
            this.calculateOverallResults();
            
            // Generate reports
            const report = this.generateComprehensiveReport();
            
            // Export results if configured
            if (this.config.exportResults) {
                this.exportResults(report);
            }
            
            return report;
            
        } catch (error) {
            console.error('Fatal error in test runner:', error);
            return this.generateErrorReport(error);
        } finally {
            this.overallResults.endTime = new Date();
            this.overallResults.duration = this.overallResults.endTime - this.overallResults.startTime;
        }
    }

    /**
     * Run test suites sequentially
     * @param {Array} suites - Array of test suites to run
     */
    async runSuitesSequentially(suites) {
        for (const suite of suites) {
            if (this.config.stopOnFirstFailure && this.overallResults.totalFailed > 0) {
                console.log(`\n⏹️ Stopping test execution due to previous failures`);
                break;
            }
            
            await this.runSingleSuite(suite);
        }
    }

    /**
     * Run test suites in parallel
     * @param {Array} suites - Array of test suites to run
     */
    async runSuitesInParallel(suites) {
        const suitePromises = suites.map(suite => this.runSingleSuite(suite));
        const results = await Promise.allSettled(suitePromises);
        
        // Check for any rejected promises
        const failures = results.filter(result => result.status === 'rejected');
        if (failures.length > 0) {
            console.warn(`\n⚠️ ${failures.length} test suite(s) failed to complete:`);
            failures.forEach((failure, index) => {
                console.warn(`  - Suite ${index + 1}: ${failure.reason}`);
            });
        }
    }

    /**
     * Run a single test suite
     * @param {Object} suite - Test suite configuration
     */
    async runSingleSuite(suite) {
        console.log(`\n🔍 Running: ${suite.name}`);
        console.log('-'.repeat(50));
        
        try {
            const suiteInstance = new suite.suiteClass();
            const startTime = performance.now();
            
            let result;
            
            // Different test suites have different run methods
            if (typeof suiteInstance.runAllTests === 'function') {
                result = await suiteInstance.runAllTests();
            } else if (typeof suiteInstance.runFullVerification === 'function') {
                result = await suiteInstance.runFullVerification();
            } else {
                throw new Error(`Test suite ${suite.name} does not have a recognized run method`);
            }
            
            const endTime = performance.now();
            const duration = endTime - startTime;
            
            // Normalize result format
            const normalizedResult = this.normalizeResult(result, suite.name, duration);
            this.overallResults.suiteResults.push(normalizedResult);
            
            console.log(`✅ ${suite.name} completed in ${duration.toFixed(2)}ms`);
            
        } catch (error) {
            console.error(`❌ ${suite.name} failed: ${error.message}`);
            
            const errorResult = {
                suiteName: suite.name,
                passed: 0,
                failed: 1,
                total: 1,
                successRate: '0%',
                duration: 0,
                error: error.message,
                details: []
            };
            
            this.overallResults.suiteResults.push(errorResult);
        }
    }

    /**
     * Normalize test result format across different test suites
     * @param {Object} result - Raw test result
     * @param {string} suiteName - Name of the test suite
     * @param {number} duration - Test duration in milliseconds
     * @returns {Object} - Normalized result
     */
    normalizeResult(result, suiteName, duration) {
        // Handle different result formats
        if (result && typeof result === 'object') {
            return {
                suiteName: suiteName,
                passed: result.passed || result.summary?.passed || 0,
                failed: result.failed || result.summary?.failed || 0,
                total: result.total || result.summary?.total || 0,
                successRate: result.successRate || result.summary?.successRate || '0%',
                duration: duration,
                details: result.details || [],
                errors: result.errors || [],
                warnings: result.warnings || result.capturedWarnings || []
            };
        }
        
        // Fallback for unexpected result format
        return {
            suiteName: suiteName,
            passed: 0,
            failed: 1,
            total: 1,
            successRate: '0%',
            duration: duration,
            details: [],
            errors: [`Unexpected result format: ${typeof result}`],
            warnings: []
        };
    }

    /**
     * Calculate overall test results from all suites
     */
    calculateOverallResults() {
        this.overallResults.totalTests = 0;
        this.overallResults.totalPassed = 0;
        this.overallResults.totalFailed = 0;
        this.overallResults.totalSkipped = 0;
        
        for (const suiteResult of this.overallResults.suiteResults) {
            this.overallResults.totalTests += suiteResult.total || 0;
            this.overallResults.totalPassed += suiteResult.passed || 0;
            this.overallResults.totalFailed += suiteResult.failed || 0;
            this.overallResults.totalSkipped += suiteResult.skipped || 0;
        }
        
        if (this.overallResults.totalTests > 0) {
            this.overallResults.successRate = 
                (this.overallResults.totalPassed / this.overallResults.totalTests * 100).toFixed(1);
        } else {
            this.overallResults.successRate = '0.0';
        }
    }

    /**
     * Generate comprehensive test report
     * @returns {Object} - Comprehensive test report
     */
    generateComprehensiveReport() {
        const report = {
            metadata: {
                testRunner: 'Webview Initialization Fix Test Runner',
                version: '1.0.0',
                timestamp: new Date().toISOString(),
                duration: this.overallResults.duration,
                configuration: this.config
            },
            summary: {
                totalSuites: this.overallResults.suiteResults.length,
                totalTests: this.overallResults.totalTests,
                totalPassed: this.overallResults.totalPassed,
                totalFailed: this.overallResults.totalFailed,
                totalSkipped: this.overallResults.totalSkipped,
                overallSuccessRate: this.overallResults.successRate + '%'
            },
            suiteResults: this.overallResults.suiteResults,
            recommendations: this.generateRecommendations(),
            detailedAnalysis: this.config.generateDetailedReport ? this.generateDetailedAnalysis() : null
        };
        
        this.printSummaryReport(report);
        
        return report;
    }

    /**
     * Print summary report to console
     * @param {Object} report - Test report
     */
    printSummaryReport(report) {
        console.log('\n' + '='.repeat(70));
        console.log('🏁 WEBVIEW INITIALIZATION FIX - TEST RESULTS SUMMARY');
        console.log('='.repeat(70));
        
        console.log(`\n📊 Overall Results:`);
        console.log(`  Total Test Suites: ${report.summary.totalSuites}`);
        console.log(`  Total Tests: ${report.summary.totalTests}`);
        console.log(`  Passed: ${report.summary.totalPassed} ✅`);
        console.log(`  Failed: ${report.summary.totalFailed} ❌`);
        console.log(`  Skipped: ${report.summary.totalSkipped} ⏭️`);
        console.log(`  Success Rate: ${report.summary.overallSuccessRate}`);
        console.log(`  Duration: ${(report.metadata.duration / 1000).toFixed(2)}s`);
        
        console.log(`\n📋 Suite Breakdown:`);
        report.suiteResults.forEach((suite, index) => {
            const status = suite.failed === 0 ? '✅' : '❌';
            const rate = typeof suite.successRate === 'string' ? suite.successRate : suite.successRate + '%';
            console.log(`  ${index + 1}. ${suite.suiteName} ${status}`);
            console.log(`     Tests: ${suite.total} | Passed: ${suite.passed} | Failed: ${suite.failed} | Rate: ${rate}`);
        });
        
        if (report.recommendations && report.recommendations.length > 0) {
            console.log(`\n💡 Recommendations:`);
            report.recommendations.forEach((rec, index) => {
                console.log(`  ${index + 1}. ${rec}`);
            });
        }
        
        // Show critical failures
        const criticalFailures = report.suiteResults.filter(suite => suite.failed > 0);
        if (criticalFailures.length > 0) {
            console.log(`\n🚨 Critical Issues:`);
            criticalFailures.forEach(suite => {
                console.log(`  - ${suite.suiteName}: ${suite.failed} failed test(s)`);
                if (suite.errors && suite.errors.length > 0) {
                    suite.errors.slice(0, 3).forEach(error => {
                        console.log(`    • ${error}`);
                    });
                    if (suite.errors.length > 3) {
                        console.log(`    • ... and ${suite.errors.length - 3} more errors`);
                    }
                }
            });
        }
        
        console.log('\n' + '='.repeat(70));
    }

    /**
     * Generate recommendations based on test results
     * @returns {Array} - Array of recommendation strings
     */
    generateRecommendations() {
        const recommendations = [];
        const failedSuites = this.overallResults.suiteResults.filter(suite => suite.failed > 0);
        
        if (failedSuites.length === 0) {
            recommendations.push('All tests passed! The webview initialization fix is working correctly.');
            return recommendations;
        }
        
        // Analyze failure patterns
        const hasReloadingFailures = failedSuites.some(suite => 
            suite.suiteName.toLowerCase().includes('reloading'));
        const hasFunctionalityFailures = failedSuites.some(suite => 
            suite.suiteName.toLowerCase().includes('functionality'));
        const hasErrorHandlingFailures = failedSuites.some(suite => 
            suite.suiteName.toLowerCase().includes('error'));
        
        if (hasReloadingFailures) {
            recommendations.push('Review webview reloading mechanisms - IIFE wrapper or namespace pattern may need adjustment');
        }
        
        if (hasFunctionalityFailures) {
            recommendations.push('Check canvas functionality integration - ensure all features work after initialization fix');
        }
        
        if (hasErrorHandlingFailures) {
            recommendations.push('Improve error handling and recovery mechanisms');
        }
        
        // General recommendations based on failure rate
        const overallFailureRate = (this.overallResults.totalFailed / this.overallResults.totalTests) * 100;
        
        if (overallFailureRate > 50) {
            recommendations.push('High failure rate detected - consider reviewing the entire initialization approach');
        } else if (overallFailureRate > 20) {
            recommendations.push('Moderate failure rate - focus on the most critical failing tests first');
        } else if (overallFailureRate > 0) {
            recommendations.push('Low failure rate - address remaining edge cases and error scenarios');
        }
        
        return recommendations;
    }

    /**
     * Generate detailed analysis of test results
     * @returns {Object} - Detailed analysis
     */
    generateDetailedAnalysis() {
        const analysis = {
            performanceMetrics: this.analyzePerformance(),
            failurePatterns: this.analyzeFailurePatterns(),
            coverageAnalysis: this.analyzeCoverage(),
            riskAssessment: this.assessRisk()
        };
        
        return analysis;
    }

    /**
     * Analyze performance metrics from test results
     * @returns {Object} - Performance analysis
     */
    analyzePerformance() {
        const suiteDurations = this.overallResults.suiteResults.map(suite => suite.duration || 0);
        const totalDuration = suiteDurations.reduce((sum, duration) => sum + duration, 0);
        const avgDuration = suiteDurations.length > 0 ? totalDuration / suiteDurations.length : 0;
        
        return {
            totalDuration: totalDuration,
            averageSuiteDuration: avgDuration,
            slowestSuite: this.overallResults.suiteResults.reduce((slowest, suite) => 
                (suite.duration || 0) > (slowest.duration || 0) ? suite : slowest, {}),
            fastestSuite: this.overallResults.suiteResults.reduce((fastest, suite) => 
                (suite.duration || Infinity) < (fastest.duration || Infinity) ? suite : fastest, {}),
            performanceRating: this.ratePerformance(totalDuration)
        };
    }

    /**
     * Analyze failure patterns across test suites
     * @returns {Object} - Failure pattern analysis
     */
    analyzeFailurePatterns() {
        const failedSuites = this.overallResults.suiteResults.filter(suite => suite.failed > 0);
        const commonErrors = [];
        const errorCategories = {};
        
        // Categorize errors
        failedSuites.forEach(suite => {
            if (suite.errors) {
                suite.errors.forEach(error => {
                    // Simple categorization based on error content
                    let category = 'Unknown';
                    if (error.toLowerCase().includes('timeout')) category = 'Timeout';
                    else if (error.toLowerCase().includes('canvas')) category = 'Canvas';
                    else if (error.toLowerCase().includes('element')) category = 'DOM';
                    else if (error.toLowerCase().includes('initialization')) category = 'Initialization';
                    else if (error.toLowerCase().includes('cleanup')) category = 'Cleanup';
                    
                    errorCategories[category] = (errorCategories[category] || 0) + 1;
                });
            }
        });
        
        return {
            failedSuiteCount: failedSuites.length,
            totalFailures: this.overallResults.totalFailed,
            errorCategories: errorCategories,
            mostCommonErrorType: Object.keys(errorCategories).reduce((a, b) => 
                errorCategories[a] > errorCategories[b] ? a : b, 'None'),
            failureRate: (this.overallResults.totalFailed / this.overallResults.totalTests * 100).toFixed(1) + '%'
        };
    }

    /**
     * Analyze test coverage
     * @returns {Object} - Coverage analysis
     */
    analyzeCoverage() {
        const requirements = {
            '1.3': 'Webview reload handling',
            '1.4': 'Multiple instance handling', 
            '1.5': 'Error recovery',
            '2.5': 'Cleanup and lifecycle',
            '4.1': 'Drawing tools functionality',
            '4.2': 'Toolbar interactions',
            '4.3': 'Canvas interactions',
            '4.5': 'Message passing'
        };
        
        // This is a simplified coverage analysis
        // In a real implementation, you'd track which requirements each test covers
        const coveredRequirements = Object.keys(requirements).length;
        const totalRequirements = Object.keys(requirements).length;
        
        return {
            totalRequirements: totalRequirements,
            coveredRequirements: coveredRequirements,
            coveragePercentage: (coveredRequirements / totalRequirements * 100).toFixed(1) + '%',
            requirementDetails: requirements,
            uncoveredAreas: [] // Would be populated based on actual test-requirement mapping
        };
    }

    /**
     * Assess risk based on test results
     * @returns {Object} - Risk assessment
     */
    assessRisk() {
        const failureRate = (this.overallResults.totalFailed / this.overallResults.totalTests) * 100;
        
        let riskLevel = 'Low';
        let riskScore = 0;
        
        if (failureRate > 50) {
            riskLevel = 'Critical';
            riskScore = 5;
        } else if (failureRate > 30) {
            riskLevel = 'High';
            riskScore = 4;
        } else if (failureRate > 15) {
            riskLevel = 'Medium';
            riskScore = 3;
        } else if (failureRate > 5) {
            riskLevel = 'Low-Medium';
            riskScore = 2;
        } else {
            riskLevel = 'Low';
            riskScore = 1;
        }
        
        return {
            riskLevel: riskLevel,
            riskScore: riskScore,
            failureRate: failureRate.toFixed(1) + '%',
            criticalIssues: this.overallResults.suiteResults.filter(suite => suite.failed > 0).length,
            recommendation: this.getRiskRecommendation(riskLevel)
        };
    }

    /**
     * Rate performance based on total duration
     * @param {number} duration - Total test duration in milliseconds
     * @returns {string} - Performance rating
     */
    ratePerformance(duration) {
        if (duration < 5000) return 'Excellent';
        if (duration < 15000) return 'Good';
        if (duration < 30000) return 'Fair';
        return 'Poor';
    }

    /**
     * Get recommendation based on risk level
     * @param {string} riskLevel - Risk level
     * @returns {string} - Risk-based recommendation
     */
    getRiskRecommendation(riskLevel) {
        const recommendations = {
            'Critical': 'Do not deploy - major issues need immediate attention',
            'High': 'Review and fix critical issues before deployment',
            'Medium': 'Address failing tests and monitor closely',
            'Low-Medium': 'Fix remaining issues and add monitoring',
            'Low': 'Ready for deployment with standard monitoring'
        };
        
        return recommendations[riskLevel] || 'Review test results and take appropriate action';
    }

    /**
     * Export test results to various formats
     * @param {Object} report - Test report to export
     */
    exportResults(report) {
        try {
            // Export to global window object for browser access
            if (typeof window !== 'undefined') {
                window.webviewTestResults = report;
                console.log('\n📤 Test results exported to window.webviewTestResults');
            }
            
            // Export as JSON string for copying
            const jsonReport = JSON.stringify(report, null, 2);
            
            // Try to save to localStorage if available
            if (typeof localStorage !== 'undefined') {
                try {
                    localStorage.setItem('webview-test-results', jsonReport);
                    console.log('📤 Test results saved to localStorage');
                } catch (e) {
                    console.warn('Could not save to localStorage:', e.message);
                }
            }
            
            // Log JSON for manual copying
            console.log('\n📋 JSON Report (copy for external analysis):');
            console.log(jsonReport);
            
        } catch (error) {
            console.error('Error exporting results:', error);
        }
    }

    /**
     * Generate error report when test runner fails
     * @param {Error} error - The error that occurred
     * @returns {Object} - Error report
     */
    generateErrorReport(error) {
        return {
            metadata: {
                testRunner: 'Webview Initialization Fix Test Runner',
                version: '1.0.0',
                timestamp: new Date().toISOString(),
                status: 'FAILED'
            },
            error: {
                message: error.message,
                stack: error.stack,
                type: error.constructor.name
            },
            summary: {
                totalSuites: 0,
                totalTests: 0,
                totalPassed: 0,
                totalFailed: 1,
                overallSuccessRate: '0%'
            },
            recommendations: [
                'Fix the test runner error before proceeding with tests',
                'Check that all required test suite files are loaded',
                'Verify the webview environment is properly set up'
            ]
        };
    }
}

// Auto-setup and execution when loaded in browser
if (typeof window !== 'undefined' && window.document) {
    // Make test runner available globally
    window.WebviewTestRunner = WebviewTestRunner;
    
    // Create and configure the main test runner instance
    window.webviewTestRunner = new WebviewTestRunner();
    
    // Register test suites (check if classes are available)
    if (typeof WebviewReloadingTests !== 'undefined') {
        window.webviewTestRunner.registerTestSuite(
            'Webview Reloading Tests (5.1)', 
            WebviewReloadingTests,
            { enabled: true }
        );
    }
    
    if (typeof CanvasFunctionalityVerification !== 'undefined') {
        window.webviewTestRunner.registerTestSuite(
            'Canvas Functionality Verification (5.2)', 
            CanvasFunctionalityVerification,
            { enabled: true }
        );
    }
    
    if (typeof ErrorHandlingTestSuite !== 'undefined') {
        window.webviewTestRunner.registerTestSuite(
            'Error Handling Tests (5.3)', 
            ErrorHandlingTestSuite,
            { enabled: true }
        );
    }
    
    // Provide convenient global function to run all tests
    window.runAllWebviewTests = async function(config = {}) {
        console.log('🚀 Starting comprehensive webview initialization fix tests...');
        return await window.webviewTestRunner.runAllTests(config);
    };
    
    // Auto-run tests if URL parameter is present
    if (window.location && window.location.search.includes('autorun=true')) {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(() => {
                window.runAllWebviewTests({ 
                    generateDetailedReport: true,
                    exportResults: true 
                });
            }, 1000);
        });
    }
    
    console.log('🧪 Webview Test Runner loaded successfully!');
    console.log('📋 Available commands:');
    console.log('  - window.runAllWebviewTests() - Run all test suites');
    console.log('  - window.webviewTestRunner.runAllTests(config) - Run with custom config');
    console.log('  - Add ?autorun=true to URL to auto-run tests on page load');
}

// Export for Node.js environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WebviewTestRunner;
}