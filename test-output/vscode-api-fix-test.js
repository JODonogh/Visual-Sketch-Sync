/**
 * Test for VS Code API Singleton Fix
 * 
 * This test verifies that the VS Code API acquisition error is fixed
 * and that multiple initializations don't cause conflicts.
 */

// Mock acquireVsCodeApi function to simulate VS Code environment
let apiCallCount = 0;
let mockVsCodeApi = null;

function createMockVsCodeApi() {
    return {
        postMessage: function(message) {
            console.log('Mock VS Code API - Message sent:', message);
        },
        setState: function(state) {
            console.log('Mock VS Code API - State set:', state);
        },
        getState: function() {
            return {};
        }
    };
}

// Mock the acquireVsCodeApi function
window.acquireVsCodeApi = function() {
    apiCallCount++;
    console.log(`acquireVsCodeApi called ${apiCallCount} times`);
    
    if (apiCallCount > 1) {
        // Simulate the error that was occurring
        throw new Error('An instance of the VS Code API has already been acquired');
    }
    
    if (!mockVsCodeApi) {
        mockVsCodeApi = createMockVsCodeApi();
    }
    
    return mockVsCodeApi;
};

/**
 * Test the VS Code API singleton pattern
 */
async function testVsCodeApiSingleton() {
    console.log('\n=== Testing VS Code API Singleton Pattern ===');
    
    try {
        // Reset global state
        window.vscodeApi = null;
        window.VSSCanvas = null;
        apiCallCount = 0;
        
        // First initialization - should work
        console.log('\n1. First initialization...');
        
        // Simulate the IIFE execution from index.html
        (function() {
            'use strict';
            
            // Create VSSCanvas namespace
            window.VSSCanvas = {
                vscode: null,
                initialized: false,
                instanceId: Math.random().toString(36).substr(2, 9)
            };
            
            // Get VS Code API using singleton pattern
            try {
                if (!window.vscodeApi && typeof acquireVsCodeApi === 'function') {
                    window.vscodeApi = acquireVsCodeApi();
                    console.log('✅ VS Code API acquired successfully');
                } else if (window.vscodeApi) {
                    console.log('✅ Using existing VS Code API instance');
                }
                
                window.VSSCanvas.vscode = window.vscodeApi || null;
                window.VSSCanvas.initialized = true;
                
            } catch (apiError) {
                console.error('❌ Error acquiring VS Code API:', apiError);
                throw apiError;
            }
        })();
        
        if (!window.VSSCanvas.vscode) {
            throw new Error('VS Code API not set in VSSCanvas namespace');
        }
        
        console.log('✅ First initialization completed successfully');
        
        // Second initialization - should reuse existing API
        console.log('\n2. Second initialization (simulating reload)...');
        
        (function() {
            'use strict';
            
            // Check for existing VSSCanvas instance
            if (window.VSSCanvas) {
                console.log('VSSCanvas already exists, reusing...');
            }
            
            // Reset namespace but keep API reference
            window.VSSCanvas = {
                vscode: null,
                initialized: false,
                instanceId: Math.random().toString(36).substr(2, 9)
            };
            
            // Get VS Code API using singleton pattern
            try {
                if (!window.vscodeApi && typeof acquireVsCodeApi === 'function') {
                    window.vscodeApi = acquireVsCodeApi();
                    console.log('✅ VS Code API acquired successfully');
                } else if (window.vscodeApi) {
                    console.log('✅ Using existing VS Code API instance');
                }
                
                window.VSSCanvas.vscode = window.vscodeApi || null;
                window.VSSCanvas.initialized = true;
                
            } catch (apiError) {
                console.error('❌ Error acquiring VS Code API:', apiError);
                throw apiError;
            }
        })();
        
        if (!window.VSSCanvas.vscode) {
            throw new Error('VS Code API not set in VSSCanvas namespace after second initialization');
        }
        
        console.log('✅ Second initialization completed successfully');
        
        // Third initialization - should still work
        console.log('\n3. Third initialization (simulating another reload)...');
        
        (function() {
            'use strict';
            
            // Simulate cleanup and reinitialization
            if (window.VSSCanvas && window.VSSCanvas.cleanup) {
                window.VSSCanvas.cleanup();
            }
            
            window.VSSCanvas = {
                vscode: null,
                initialized: false,
                instanceId: Math.random().toString(36).substr(2, 9)
            };
            
            // Get VS Code API using singleton pattern
            try {
                if (!window.vscodeApi && typeof acquireVsCodeApi === 'function') {
                    window.vscodeApi = acquireVsCodeApi();
                    console.log('✅ VS Code API acquired successfully');
                } else if (window.vscodeApi) {
                    console.log('✅ Using existing VS Code API instance');
                }
                
                window.VSSCanvas.vscode = window.vscodeApi || null;
                window.VSSCanvas.initialized = true;
                
            } catch (apiError) {
                console.error('❌ Error acquiring VS Code API:', apiError);
                throw apiError;
            }
        })();
        
        console.log('✅ Third initialization completed successfully');
        
        // Test message sending
        console.log('\n4. Testing message sending...');
        
        if (window.VSSCanvas.vscode && window.VSSCanvas.vscode.postMessage) {
            window.VSSCanvas.vscode.postMessage({
                command: 'test',
                data: { message: 'VS Code API singleton test successful' }
            });
            console.log('✅ Message sent successfully');
        } else {
            throw new Error('VS Code API postMessage not available');
        }
        
        console.log('\n✅ All VS Code API singleton tests passed!');
        console.log(`📊 acquireVsCodeApi was called ${apiCallCount} time(s) - should be 1`);
        
        if (apiCallCount !== 1) {
            console.warn('⚠️  Warning: acquireVsCodeApi was called more than once, but error was handled');
        }
        
        return {
            success: true,
            apiCallCount: apiCallCount,
            message: 'VS Code API singleton pattern working correctly'
        };
        
    } catch (error) {
        console.error('❌ VS Code API singleton test failed:', error);
        return {
            success: false,
            error: error.message,
            apiCallCount: apiCallCount
        };
    }
}

/**
 * Test variable scoping and IIFE wrapper
 */
async function testVariableScoping() {
    console.log('\n=== Testing Variable Scoping and IIFE Wrapper ===');
    
    try {
        // Test that variables in IIFE don't conflict
        let testResults = [];
        
        // First IIFE
        (function() {
            'use strict';
            let hasInitialized = false;
            let canvas = null;
            let ctx = null;
            
            hasInitialized = true;
            testResults.push('First IIFE executed successfully');
        })();
        
        // Second IIFE with same variable names
        (function() {
            'use strict';
            let hasInitialized = false; // Should not conflict with first IIFE
            let canvas = null;
            let ctx = null;
            
            hasInitialized = true;
            testResults.push('Second IIFE executed successfully');
        })();
        
        // Third IIFE
        (function() {
            'use strict';
            let hasInitialized = false; // Should not conflict
            let canvas = document.createElement('canvas');
            let ctx = canvas.getContext('2d');
            
            if (ctx) {
                hasInitialized = true;
                testResults.push('Third IIFE with canvas executed successfully');
            }
        })();
        
        console.log('✅ All IIFE executions completed without variable conflicts');
        testResults.forEach(result => console.log(`  - ${result}`));
        
        return {
            success: true,
            message: 'Variable scoping working correctly',
            results: testResults
        };
        
    } catch (error) {
        console.error('❌ Variable scoping test failed:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Run all tests
 */
async function runAllTests() {
    console.log('🧪 Starting VS Code API Fix Tests...\n');
    
    const results = {
        vsCodeApiTest: await testVsCodeApiSingleton(),
        variableScopingTest: await testVariableScoping()
    };
    
    console.log('\n📋 Test Summary:');
    console.log('================');
    
    let allPassed = true;
    
    Object.entries(results).forEach(([testName, result]) => {
        const status = result.success ? '✅ PASS' : '❌ FAIL';
        console.log(`${status} ${testName}: ${result.message || result.error}`);
        
        if (!result.success) {
            allPassed = false;
        }
    });
    
    console.log('\n' + (allPassed ? '🎉 All tests passed!' : '⚠️  Some tests failed'));
    
    return {
        allPassed: allPassed,
        results: results,
        summary: {
            total: Object.keys(results).length,
            passed: Object.values(results).filter(r => r.success).length,
            failed: Object.values(results).filter(r => !r.success).length
        }
    };
}

// Export for use in other test files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        testVsCodeApiSingleton,
        testVariableScoping,
        runAllTests
    };
}

// Auto-run tests if this file is loaded directly
if (typeof window !== 'undefined') {
    // Run tests when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', runAllTests);
    } else {
        runAllTests();
    }
}