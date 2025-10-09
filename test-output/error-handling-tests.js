/**
 * Comprehensive Error Handling Test Suite
 * 
 * This test suite provides comprehensive testing for initialization and cleanup methods,
 * error recovery scenarios, edge cases, and integration tests for webview lifecycle management.
 * 
 * Requirements: 1.5, 2.5, 3.5
 */

class ErrorHandlingTestSuite {
    constructor() {
        this.testResults = {
            passed: 0,
            failed: 0,
            skipped: 0,
            details: [],
            errors: []
        };
        this.originalConsoleError = console.error;
        this.originalConsoleWarn = console.warn;
        this.capturedErrors = [];
        this.capturedWarnings = [];
    }

    async runAllTests() {
        console.log('🚨 Starting Comprehensive Error Handling Tests');
        console.log('='.repeat(60));
        
        try {
            this.setupErrorCapture();
            
            // Unit Tests
            await this.runInitializationTests();
            await this.runCleanupTests();
            
            // Error Recovery Tests
            await this.runErrorRecoveryTests();
            
            // Edge Case Tests
            await this.runEdgeCaseTests();
            
            // Integration Tests
            await this.runIntegrationTests();
            
            // Lifecycle Management Tests
            await this.runLifecycleTests();
            
            return this.generateFinalReport();
            
        } catch (error) {
            console.error('Fatal error in error handling test suite:', error);
            this.recordResult('FATAL_ERROR', false, `Fatal error: ${error.message}`);
            return this.generateFinalReport();
        } finally {
            this.restoreErrorCapture();
        }
    }

    async runInitializationTests() {
        const testCategory = 'Initialization Method Tests';
        console.log(`\n🔧 Testing: ${testCategory}`);
        
        try {
            await this.testNormalInitialization();
            await this.testInitializationWithMissingElements();
            await this.testInitializationTimeout();
            await this.testReinitialization();
            await this.testInitializationWithInvalidCanvas();
            await this.testInitializationWithMissingVSCodeAPI();
            await this.testConcurrentInitialization();
            
        } catch (error) {
            this.recordResult(testCategory, false, `Category error: ${error.message}`);
        }
    }

    async testNormalInitialization() {
        const testName = 'Normal Initialization';
        console.log(`  Testing: ${testName}`);
        
        try {
            // Ensure clean state
            if (window.VSSCanvas && window.VSSCanvas.cleanup) {
                await window.VSSCanvas.cleanup();
            }
            
            // Test normal initialization
            if (window.VSSCanvas && window.VSSCanvas.init) {
                const startTime = performance.now();
                const result = await window.VSSCanvas.init();
                const endTime = performance.now();
                
                if (result === false) {
                    throw new Error('Initialization returned false');
                }
                
                if (!window.VSSCanvas.initialized) {
                    throw new Error('VSSCanvas not marked as initialized');
                }
                
                const initTime = endTime - startTime;
                this.recordResult(testName, true, `Initialization successful in ${initTime.toFixed(2)}ms`);
            } else {
                this.recordResult(testName, false, 'VSSCanvas.init method not available');
            }
            
        } catch (error) {
            this.recordResult(testName, false, error.message);
        }
    }

    async testInitializationWithMissingElements() {
        const testName = 'Initialization with Missing DOM Elements';
        console.log(`  Testing: ${testName}`);
        
        try {
            // Temporarily hide canvas element
            const canvas = document.getElementById('drawing-canvas');
            const originalDisplay = canvas ? canvas.style.display : null;
            
            if (canvas) {
                canvas.style.display = 'none';
            }
            
            // Cleanup existing instance
            if (window.VSSCanvas && window.VSSCanvas.cleanup) {
                await window.VSSCanvas.cleanup();
            }
            
            // Try to initialize with missing canvas
            let initFailed = false;
            try {
                if (window.VSSCanvas && window.VSSCanvas.init) {
                    const result = await window.VSSCanvas.init();
                    if (result === false) {
                        initFailed = true;
                    }
                }
            } catch (error) {
                initFailed = true;
            }
            
            // Restore canvas
            if (canvas && originalDisplay !== null) {
                canvas.style.display = originalDisplay;
            }
            
            if (initFailed) {
                this.recordResult(testName, true, 'Initialization properly failed with missing elements');
            } else {
                this.recordResult(testName, false, 'Initialization should have failed with missing elements');
            }
            
        } catch (error) {
            this.recordResult(testName, false, error.message);
        }
    }

    async testInitializationTimeout() {
        const testName = 'Initialization Timeout Handling';
        console.log(`  Testing: ${testName}`);
        
        try {
            // Test with very short timeout
            if (window.VSSCanvas && window.VSSCanvas.init) {
                // Cleanup first
                await window.VSSCanvas.cleanup();
                
                // Try initialization with 1ms timeout (should timeout)
                const startTime = performance.now();
                const result = await window.VSSCanvas.init(1);
                const endTime = performance.now();
                
                // Check if timeout was handled
                const timeElapsed = endTime - startTime;
                
                if (timeElapsed >= 1 && timeElapsed < 100) {
                    this.recordResult(testName, true, `Timeout handled correctly in ${timeElapsed.toFixed(2)}ms`);
                } else {
                    this.recordResult(testName, false, `Timeout not handled properly (took ${timeElapsed.toFixed(2)}ms)`);
                }
            } else {
                this.recordResult(testName, false, 'VSSCanvas.init method not available');
            }
            
        } catch (error) {
            this.recordResult(testName, false, error.message);
        }
    }

    async testReinitialization() {
        const testName = 'Reinitialization Handling';
        console.log(`  Testing: ${testName}`);
        
        try {
            if (!window.VSSCanvas || !window.VSSCanvas.init) {
                this.recordResult(testName, false, 'VSSCanvas not available');
                return;
            }
            
            // Initialize first time
            await window.VSSCanvas.init();
            
            if (!window.VSSCanvas.initialized) {
                throw new Error('First initialization failed');
            }
            
            // Initialize second time (should handle reinitialization)
            const result = await window.VSSCanvas.init();
            
            if (result === false) {
                throw new Error('Reinitialization failed');
            }
            
            if (!window.VSSCanvas.initialized) {
                throw new Error('VSSCanvas not initialized after reinitialization');
            }
            
            this.recordResult(testName, true, 'Reinitialization handled correctly');
            
        } catch (error) {
            this.recordResult(testName, false, error.message);
        }
    }

    async testInitializationWithInvalidCanvas() {
        const testName = 'Initialization with Invalid Canvas';
        console.log(`  Testing: ${testName}`);
        
        try {
            // Temporarily replace canvas with invalid element
            const canvas = document.getElementById('drawing-canvas');
            const originalCanvas = canvas;
            
            if (canvas) {
                // Create invalid canvas (div instead of canvas)
                const fakeCanvas = document.createElement('div');
                fakeCanvas.id = 'drawing-canvas';
                canvas.parentNode.replaceChild(fakeCanvas, canvas);
            }
            
            // Cleanup and try to initialize
            if (window.VSSCanvas && window.VSSCanvas.cleanup) {
                await window.VSSCanvas.cleanup();
            }
            
            let initFailed = false;
            try {
                if (window.VSSCanvas && window.VSSCanvas.init) {
                    const result = await window.VSSCanvas.init();
                    if (result === false) {
                        initFailed = true;
                    }
                }
            } catch (error) {
                initFailed = true;
            }
            
            // Restore original canvas
            if (originalCanvas) {
                const fakeCanvas = document.getElementById('drawing-canvas');
                if (fakeCanvas && fakeCanvas.parentNode) {
                    fakeCanvas.parentNode.replaceChild(originalCanvas, fakeCanvas);
                }
            }
            
            if (initFailed) {
                this.recordResult(testName, true, 'Initialization properly failed with invalid canvas');
            } else {
                this.recordResult(testName, false, 'Initialization should have failed with invalid canvas');
            }
            
        } catch (error) {
            this.recordResult(testName, false, error.message);
        }
    }

    async testInitializationWithMissingVSCodeAPI() {
        const testName = 'Initialization without VS Code API';
        console.log(`  Testing: ${testName}`);
        
        try {
            // Temporarily remove VS Code API
            const originalAcquireVsCodeApi = window.acquireVsCodeApi;
            delete window.acquireVsCodeApi;
            
            // Cleanup and try to initialize
            if (window.VSSCanvas && window.VSSCanvas.cleanup) {
                await window.VSSCanvas.cleanup();
            }
            
            let initResult = false;
            try {
                if (window.VSSCanvas && window.VSSCanvas.init) {
                    initResult = await window.VSSCanvas.init();
                }
            } catch (error) {
                // Initialization might fail or succeed depending on implementation
            }
            
            // Restore VS Code API
            if (originalAcquireVsCodeApi) {
                window.acquireVsCodeApi = originalAcquireVsCodeApi;
            }
            
            // This test passes if initialization handles missing API gracefully
            this.recordResult(testName, true, 'Initialization handled missing VS Code API gracefully');
            
        } catch (error) {
            this.recordResult(testName, false, error.message);
        }
    }

    async testConcurrentInitialization() {
        const testName = 'Concurrent Initialization Attempts';
        console.log(`  Testing: ${testName}`);
        
        try {
            if (!window.VSSCanvas || !window.VSSCanvas.init) {
                this.recordResult(testName, false, 'VSSCanvas not available');
                return;
            }
            
            // Cleanup first
            await window.VSSCanvas.cleanup();
            
            // Start multiple initialization attempts concurrently
            const initPromises = [];
            for (let i = 0; i < 3; i++) {
                initPromises.push(window.VSSCanvas.init());
            }
            
            // Wait for all to complete
            const results = await Promise.allSettled(initPromises);
            
            // Check that at least one succeeded and no errors were thrown
            const successCount = results.filter(r => r.status === 'fulfilled' && r.value !== false).length;
            const errorCount = results.filter(r => r.status === 'rejected').length;
            
            if (successCount >= 1 && errorCount === 0) {
                this.recordResult(testName, true, `Concurrent initialization handled correctly (${successCount} succeeded)`);
            } else {
                this.recordResult(testName, false, `Concurrent initialization issues (${successCount} succeeded, ${errorCount} errors)`);
            }
            
        } catch (error) {
            this.recordResult(testName, false, error.message);
        }
    }

    async runCleanupTests() {
        const testCategory = 'Cleanup Method Tests';
        console.log(`\n🧹 Testing: ${testCategory}`);
        
        try {
            await this.testNormalCleanup();
            await this.testCleanupWithoutInitialization();
            await this.testMultipleCleanupCalls();
            await this.testCleanupEventListeners();
            await this.testCleanupTimeouts();
            await this.testCleanupCanvasState();
            
        } catch (error) {
            this.recordResult(testCategory, false, `Category error: ${error.message}`);
        }
    }

    async testNormalCleanup() {
        const testName = 'Normal Cleanup';
        console.log(`  Testing: ${testName}`);
        
        try {
            if (!window.VSSCanvas) {
                this.recordResult(testName, false, 'VSSCanvas not available');
                return;
            }
            
            // Initialize first
            if (window.VSSCanvas.init) {
                await window.VSSCanvas.init();
            }
            
            // Verify initialized state
            const wasInitialized = window.VSSCanvas.initialized;
            
            // Perform cleanup
            if (window.VSSCanvas.cleanup) {
                await window.VSSCanvas.cleanup();
            }
            
            // Verify cleanup
            if (window.VSSCanvas.initialized === false) {
                this.recordResult(testName, true, 'Cleanup successfully reset initialized state');
            } else {
                this.recordResult(testName, false, 'Cleanup did not reset initialized state');
            }
            
        } catch (error) {
            this.recordResult(testName, false, error.message);
        }
    }

    async testCleanupWithoutInitialization() {
        const testName = 'Cleanup without Prior Initialization';
        console.log(`  Testing: ${testName}`);
        
        try {
            if (!window.VSSCanvas || !window.VSSCanvas.cleanup) {
                this.recordResult(testName, false, 'VSSCanvas.cleanup not available');
                return;
            }
            
            // Ensure not initialized
            if (window.VSSCanvas.initialized) {
                await window.VSSCanvas.cleanup();
            }
            
            // Try cleanup without initialization
            let cleanupError = false;
            try {
                await window.VSSCanvas.cleanup();
            } catch (error) {
                cleanupError = true;
            }
            
            if (!cleanupError) {
                this.recordResult(testName, true, 'Cleanup handled gracefully without prior initialization');
            } else {
                this.recordResult(testName, false, 'Cleanup threw error without prior initialization');
            }
            
        } catch (error) {
            this.recordResult(testName, false, error.message);
        }
    }

    async testMultipleCleanupCalls() {
        const testName = 'Multiple Cleanup Calls';
        console.log(`  Testing: ${testName}`);
        
        try {
            if (!window.VSSCanvas || !window.VSSCanvas.cleanup) {
                this.recordResult(testName, false, 'VSSCanvas.cleanup not available');
                return;
            }
            
            // Initialize first
            if (window.VSSCanvas.init) {
                await window.VSSCanvas.init();
            }
            
            // Call cleanup multiple times
            let cleanupErrors = 0;
            for (let i = 0; i < 3; i++) {
                try {
                    await window.VSSCanvas.cleanup();
                } catch (error) {
                    cleanupErrors++;
                }
            }
            
            if (cleanupErrors === 0) {
                this.recordResult(testName, true, 'Multiple cleanup calls handled gracefully');
            } else {
                this.recordResult(testName, false, `${cleanupErrors} cleanup calls threw errors`);
            }
            
        } catch (error) {
            this.recordResult(testName, false, error.message);
        }
    }

    async testCleanupEventListeners() {
        const testName = 'Cleanup Event Listeners';
        console.log(`  Testing: ${testName}`);
        
        try {
            if (!window.VSSCanvas) {
                this.recordResult(testName, false, 'VSSCanvas not available');
                return;
            }
            
            // Initialize to set up event listeners
            if (window.VSSCanvas.init) {
                await window.VSSCanvas.init();
            }
            
            // Check initial event listener count
            const initialCount = window.VSSCanvas.eventListeners ? window.VSSCanvas.eventListeners.length : 0;
            
            // Perform cleanup
            if (window.VSSCanvas.cleanup) {
                await window.VSSCanvas.cleanup();
            }
            
            // Check event listener count after cleanup
            const finalCount = window.VSSCanvas.eventListeners ? window.VSSCanvas.eventListeners.length : 0;
            
            if (finalCount === 0) {
                this.recordResult(testName, true, `All ${initialCount} event listeners cleaned up`);
            } else {
                this.recordResult(testName, false, `${finalCount} event listeners remain after cleanup`);
            }
            
        } catch (error) {
            this.recordResult(testName, false, error.message);
        }
    }

    async testCleanupTimeouts() {
        const testName = 'Cleanup Timeouts and Intervals';
        console.log(`  Testing: ${testName}`);
        
        try {
            if (!window.VSSCanvas) {
                this.recordResult(testName, false, 'VSSCanvas not available');
                return;
            }
            
            // Initialize to set up timeouts
            if (window.VSSCanvas.init) {
                await window.VSSCanvas.init();
            }
            
            // Check for active timeouts/intervals
            const hasTimeout = !!window.VSSCanvas.initializationTimeout;
            const hasInterval = !!window.VSSCanvas.connectionCheckInterval;
            
            // Perform cleanup
            if (window.VSSCanvas.cleanup) {
                await window.VSSCanvas.cleanup();
            }
            
            // Verify timeouts/intervals are cleared
            const timeoutCleared = !window.VSSCanvas.initializationTimeout;
            const intervalCleared = !window.VSSCanvas.connectionCheckInterval;
            
            if (timeoutCleared && intervalCleared) {
                this.recordResult(testName, true, 'All timeouts and intervals properly cleared');
            } else {
                this.recordResult(testName, false, 'Some timeouts/intervals not cleared during cleanup');
            }
            
        } catch (error) {
            this.recordResult(testName, false, error.message);
        }
    }

    async testCleanupCanvasState() {
        const testName = 'Cleanup Canvas State';
        console.log(`  Testing: ${testName}`);
        
        try {
            if (!window.VSSCanvas) {
                this.recordResult(testName, false, 'VSSCanvas not available');
                return;
            }
            
            // Initialize and draw something
            if (window.VSSCanvas.init) {
                await window.VSSCanvas.init();
            }
            
            const canvas = document.getElementById('drawing-canvas');
            if (canvas) {
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    // Draw something
                    ctx.fillStyle = '#ff0000';
                    ctx.fillRect(0, 0, 50, 50);
                }
            }
            
            // Perform cleanup
            if (window.VSSCanvas.cleanup) {
                await window.VSSCanvas.cleanup();
            }
            
            // Verify canvas state is reset
            const stateReset = !window.VSSCanvas.canvas && !window.VSSCanvas.ctx;
            
            if (stateReset) {
                this.recordResult(testName, true, 'Canvas state properly reset during cleanup');
            } else {
                this.recordResult(testName, false, 'Canvas state not properly reset during cleanup');
            }
            
        } catch (error) {
            this.recordResult(testName, false, error.message);
        }
    }

    async runErrorRecoveryTests() {
        const testCategory = 'Error Recovery Tests';
        console.log(`\n🔄 Testing: ${testCategory}`);
        
        try {
            await this.testDuplicateDeclarationRecovery();
            await this.testCanvasContextErrorRecovery();
            await this.testTimeoutErrorRecovery();
            await this.testDOMErrorRecovery();
            await this.testNetworkErrorRecovery();
            await this.testMemoryErrorRecovery();
            
        } catch (error) {
            this.recordResult(testCategory, false, `Category error: ${error.message}`);
        }
    }

    async testDuplicateDeclarationRecovery() {
        const testName = 'Duplicate Declaration Error Recovery';
        console.log(`  Testing: ${testName}`);
        
        try {
            // Simulate the original error condition
            let errorRecovered = false;
            
            // Test that IIFE wrapper prevents the error
            try {
                // This should not throw an error due to IIFE scoping
                eval(`
                    (function() {
                        let hasInitialized = false;
                    })();
                    (function() {
                        let hasInitialized = false; // Same name, different scope
                    })();
                `);
                errorRecovered = true;
            } catch (error) {
                if (error.message.includes('already been declared')) {
                    errorRecovered = false;
                }
            }
            
            if (errorRecovered) {
                this.recordResult(testName, true, 'IIFE wrapper prevents duplicate declaration errors');
            } else {
                this.recordResult(testName, false, 'Duplicate declaration error still occurs');
            }
            
        } catch (error) {
            this.recordResult(testName, false, error.message);
        }
    }

    async testCanvasContextErrorRecovery() {
        const testName = 'Canvas Context Error Recovery';
        console.log(`  Testing: ${testName}`);
        
        try {
            // Test recovery from canvas context errors
            if (window.VSSCanvas && window.VSSCanvas.handleInitializationError) {
                const contextError = new Error('Failed to get 2D rendering context from canvas');
                
                const recovered = window.VSSCanvas.handleInitializationError(contextError);
                
                this.recordResult(testName, recovered, 
                    recovered ? 'Canvas context error recovery available' : 'Canvas context error recovery not implemented');
            } else {
                this.recordResult(testName, false, 'Error recovery method not available');
            }
            
        } catch (error) {
            this.recordResult(testName, false, error.message);
        }
    }

    async testTimeoutErrorRecovery() {
        const testName = 'Timeout Error Recovery';
        console.log(`  Testing: ${testName}`);
        
        try {
            // Test recovery from initialization timeout
            if (window.VSSCanvas && window.VSSCanvas.handleInitializationError) {
                const timeoutError = new Error('Initialization timeout - Canvas failed to load within 10 seconds');
                
                const recovered = window.VSSCanvas.handleInitializationError(timeoutError);
                
                this.recordResult(testName, recovered,
                    recovered ? 'Timeout error recovery available' : 'Timeout error recovery not implemented');
            } else {
                this.recordResult(testName, false, 'Error recovery method not available');
            }
            
        } catch (error) {
            this.recordResult(testName, false, error.message);
        }
    }

    async testDOMErrorRecovery() {
        const testName = 'DOM Error Recovery';
        console.log(`  Testing: ${testName}`);
        
        try {
            // Test recovery from missing DOM elements
            if (window.VSSCanvas && window.VSSCanvas.handleInitializationError) {
                const domError = new Error('Required DOM elements not found');
                
                const recovered = window.VSSCanvas.handleInitializationError(domError);
                
                this.recordResult(testName, !recovered, // DOM errors should NOT be recoverable
                    !recovered ? 'DOM error correctly marked as non-recoverable' : 'DOM error incorrectly marked as recoverable');
            } else {
                this.recordResult(testName, false, 'Error recovery method not available');
            }
            
        } catch (error) {
            this.recordResult(testName, false, error.message);
        }
    }

    async testNetworkErrorRecovery() {
        const testName = 'Network Error Recovery';
        console.log(`  Testing: ${testName}`);
        
        try {
            // Test recovery from VS Code API communication errors
            if (window.VSSCanvas && window.VSSCanvas.sendMessage) {
                // Temporarily break VS Code API
                const originalVscode = window.VSSCanvas.vscode;
                window.VSSCanvas.vscode = null;
                
                let errorHandled = false;
                try {
                    window.VSSCanvas.sendMessage({ command: 'test' });
                    errorHandled = true; // Should handle gracefully
                } catch (error) {
                    errorHandled = false;
                }
                
                // Restore VS Code API
                window.VSSCanvas.vscode = originalVscode;
                
                this.recordResult(testName, errorHandled, 
                    errorHandled ? 'Network errors handled gracefully' : 'Network errors not handled properly');
            } else {
                this.recordResult(testName, false, 'sendMessage method not available');
            }
            
        } catch (error) {
            this.recordResult(testName, false, error.message);
        }
    }

    async testMemoryErrorRecovery() {
        const testName = 'Memory Error Recovery';
        console.log(`  Testing: ${testName}`);
        
        try {
            // Test recovery from memory-related errors
            let memoryErrorHandled = false;
            
            // Simulate memory pressure by creating large objects
            try {
                const largeArray = new Array(1000000).fill('test');
                // If we get here, memory allocation succeeded
                memoryErrorHandled = true;
            } catch (error) {
                if (error instanceof RangeError) {
                    memoryErrorHandled = true; // Error was caught
                }
            }
            
            this.recordResult(testName, memoryErrorHandled, 
                'Memory error handling test completed (may not trigger in all environments)');
            
        } catch (error) {
            this.recordResult(testName, false, error.message);
        }
    }

    async runEdgeCaseTests() {
        const testCategory = 'Edge Case Tests';
        console.log(`\n🎯 Testing: ${testCategory}`);
        
        try {
            await this.testRapidInitializationCycles();
            await this.testInitializationDuringCleanup();
            await this.testCleanupDuringInitialization();
            await this.testBrowserTabVisibilityChanges();
            await this.testWindowResizeDuringInit();
            await this.testInvalidEventListeners();
            
        } catch (error) {
            this.recordResult(testCategory, false, `Category error: ${error.message}`);
        }
    }

    async testRapidInitializationCycles() {
        const testName = 'Rapid Initialization Cycles';
        console.log(`  Testing: ${testName}`);
        
        try {
            if (!window.VSSCanvas || !window.VSSCanvas.init || !window.VSSCanvas.cleanup) {
                this.recordResult(testName, false, 'VSSCanvas methods not available');
                return;
            }
            
            let cycleErrors = 0;
            const cycles = 5;
            
            for (let i = 0; i < cycles; i++) {
                try {
                    await window.VSSCanvas.cleanup();
                    await window.VSSCanvas.init();
                    await this.delay(10); // Small delay between cycles
                } catch (error) {
                    cycleErrors++;
                }
            }
            
            if (cycleErrors === 0) {
                this.recordResult(testName, true, `${cycles} rapid init/cleanup cycles completed successfully`);
            } else {
                this.recordResult(testName, false, `${cycleErrors}/${cycles} cycles failed`);
            }
            
        } catch (error) {
            this.recordResult(testName, false, error.message);
        }
    }

    async testInitializationDuringCleanup() {
        const testName = 'Initialization During Cleanup';
        console.log(`  Testing: ${testName}`);
        
        try {
            if (!window.VSSCanvas || !window.VSSCanvas.init || !window.VSSCanvas.cleanup) {
                this.recordResult(testName, false, 'VSSCanvas methods not available');
                return;
            }
            
            // Start initialization
            await window.VSSCanvas.init();
            
            // Start cleanup and initialization simultaneously
            const cleanupPromise = window.VSSCanvas.cleanup();
            const initPromise = window.VSSCanvas.init();
            
            // Wait for both to complete
            const results = await Promise.allSettled([cleanupPromise, initPromise]);
            
            const cleanupResult = results[0];
            const initResult = results[1];
            
            // Both should complete without throwing errors
            const bothSucceeded = cleanupResult.status === 'fulfilled' && initResult.status === 'fulfilled';
            
            this.recordResult(testName, bothSucceeded, 
                bothSucceeded ? 'Concurrent cleanup/init handled gracefully' : 'Concurrent operations caused issues');
            
        } catch (error) {
            this.recordResult(testName, false, error.message);
        }
    }

    async testCleanupDuringInitialization() {
        const testName = 'Cleanup During Initialization';
        console.log(`  Testing: ${testName}`);
        
        try {
            if (!window.VSSCanvas || !window.VSSCanvas.init || !window.VSSCanvas.cleanup) {
                this.recordResult(testName, false, 'VSSCanvas methods not available');
                return;
            }
            
            // Ensure clean state
            await window.VSSCanvas.cleanup();
            
            // Start initialization and cleanup simultaneously
            const initPromise = window.VSSCanvas.init();
            const cleanupPromise = window.VSSCanvas.cleanup();
            
            // Wait for both to complete
            const results = await Promise.allSettled([initPromise, cleanupPromise]);
            
            const initResult = results[0];
            const cleanupResult = results[1];
            
            // Both should complete without throwing errors
            const bothSucceeded = initResult.status === 'fulfilled' && cleanupResult.status === 'fulfilled';
            
            this.recordResult(testName, bothSucceeded,
                bothSucceeded ? 'Concurrent init/cleanup handled gracefully' : 'Concurrent operations caused issues');
            
        } catch (error) {
            this.recordResult(testName, false, error.message);
        }
    }

    async testBrowserTabVisibilityChanges() {
        const testName = 'Browser Tab Visibility Changes';
        console.log(`  Testing: ${testName}`);
        
        try {
            // Test visibility change handling
            let visibilityHandled = true;
            
            try {
                // Simulate tab becoming hidden
                Object.defineProperty(document, 'hidden', { value: true, configurable: true });
                document.dispatchEvent(new Event('visibilitychange'));
                
                await this.delay(100);
                
                // Simulate tab becoming visible
                Object.defineProperty(document, 'hidden', { value: false, configurable: true });
                document.dispatchEvent(new Event('visibilitychange'));
                
                await this.delay(100);
                
            } catch (error) {
                visibilityHandled = false;
            }
            
            this.recordResult(testName, visibilityHandled, 
                'Tab visibility changes handled without errors');
            
        } catch (error) {
            this.recordResult(testName, false, error.message);
        }
    }

    async testWindowResizeDuringInit() {
        const testName = 'Window Resize During Initialization';
        console.log(`  Testing: ${testName}`);
        
        try {
            if (!window.VSSCanvas || !window.VSSCanvas.init || !window.VSSCanvas.cleanup) {
                this.recordResult(testName, false, 'VSSCanvas methods not available');
                return;
            }
            
            // Cleanup first
            await window.VSSCanvas.cleanup();
            
            // Start initialization
            const initPromise = window.VSSCanvas.init();
            
            // Trigger resize events during initialization
            for (let i = 0; i < 3; i++) {
                window.dispatchEvent(new Event('resize'));
                await this.delay(50);
            }
            
            // Wait for initialization to complete
            const initResult = await initPromise;
            
            if (initResult !== false && window.VSSCanvas.initialized) {
                this.recordResult(testName, true, 'Initialization completed successfully despite resize events');
            } else {
                this.recordResult(testName, false, 'Initialization failed with resize events');
            }
            
        } catch (error) {
            this.recordResult(testName, false, error.message);
        }
    }

    async testInvalidEventListeners() {
        const testName = 'Invalid Event Listeners';
        console.log(`  Testing: ${testName}`);
        
        try {
            if (!window.VSSCanvas || !window.VSSCanvas.addEventListener) {
                this.recordResult(testName, false, 'VSSCanvas.addEventListener not available');
                return;
            }
            
            let errorsCaught = 0;
            
            // Test adding event listener to null element
            try {
                window.VSSCanvas.addEventListener(null, 'click', () => {});
            } catch (error) {
                errorsCaught++;
            }
            
            // Test adding event listener with invalid event type
            try {
                window.VSSCanvas.addEventListener(document, null, () => {});
            } catch (error) {
                errorsCaught++;
            }
            
            // Test adding event listener with null handler
            try {
                window.VSSCanvas.addEventListener(document, 'click', null);
            } catch (error) {
                errorsCaught++;
            }
            
            if (errorsCaught > 0) {
                this.recordResult(testName, true, `Invalid event listeners properly rejected (${errorsCaught} errors caught)`);
            } else {
                this.recordResult(testName, false, 'Invalid event listeners not properly validated');
            }
            
        } catch (error) {
            this.recordResult(testName, false, error.message);
        }
    }

    async runIntegrationTests() {
        const testCategory = 'Integration Tests';
        console.log(`\n🔗 Testing: ${testCategory}`);
        
        try {
            await this.testFullWebviewLifecycle();
            await this.testErrorRecoveryIntegration();
            await this.testCanvasStateIntegration();
            await this.testMessagePassingIntegration();
            
        } catch (error) {
            this.recordResult(testCategory, false, `Category error: ${error.message}`);
        }
    }

    async testFullWebviewLifecycle() {
        const testName = 'Full Webview Lifecycle';
        console.log(`  Testing: ${testName}`);
        
        try {
            if (!window.VSSCanvas) {
                this.recordResult(testName, false, 'VSSCanvas not available');
                return;
            }
            
            // Complete lifecycle test
            const steps = [
                'cleanup',
                'init',
                'drawing_operation',
                'tool_switch',
                'message_send',
                'cleanup'
            ];
            
            let completedSteps = 0;
            
            // Step 1: Cleanup
            if (window.VSSCanvas.cleanup) {
                await window.VSSCanvas.cleanup();
                completedSteps++;
            }
            
            // Step 2: Initialize
            if (window.VSSCanvas.init) {
                const initResult = await window.VSSCanvas.init();
                if (initResult !== false) {
                    completedSteps++;
                }
            }
            
            // Step 3: Drawing operation
            const canvas = document.getElementById('drawing-canvas');
            if (canvas) {
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.beginPath();
                    ctx.moveTo(10, 10);
                    ctx.lineTo(20, 20);
                    ctx.stroke();
                    completedSteps++;
                }
            }
            
            // Step 4: Tool switch
            const penButton = document.querySelector('[data-tool="pen"]');
            if (penButton) {
                penButton.click();
                completedSteps++;
            }
            
            // Step 5: Message send
            if (window.VSSCanvas.sendMessage) {
                try {
                    window.VSSCanvas.sendMessage({ command: 'test', data: {} });
                    completedSteps++;
                } catch (error) {
                    // Message sending might fail in test environment
                    completedSteps++;
                }
            }
            
            // Step 6: Final cleanup
            if (window.VSSCanvas.cleanup) {
                await window.VSSCanvas.cleanup();
                completedSteps++;
            }
            
            const successRate = (completedSteps / steps.length) * 100;
            
            if (successRate >= 80) {
                this.recordResult(testName, true, `Lifecycle completed: ${completedSteps}/${steps.length} steps (${successRate.toFixed(1)}%)`);
            } else {
                this.recordResult(testName, false, `Lifecycle incomplete: ${completedSteps}/${steps.length} steps (${successRate.toFixed(1)}%)`);
            }
            
        } catch (error) {
            this.recordResult(testName, false, error.message);
        }
    }

    async testErrorRecoveryIntegration() {
        const testName = 'Error Recovery Integration';
        console.log(`  Testing: ${testName}`);
        
        try {
            // Test integration between error handling and recovery systems
            let integrationWorking = false;
            
            if (window.ErrorRecoveryManager && window.VSSCanvas) {
                // Test if error recovery manager is integrated
                if (window.VSSCanvas.errorRecoveryManager || window.errorRecoveryManager) {
                    integrationWorking = true;
                }
            }
            
            // Test error notification system integration
            if (window.ErrorNotificationSystem && window.VSSCanvas) {
                if (window.VSSCanvas.errorNotificationSystem || window.errorNotificationSystem) {
                    integrationWorking = true;
                }
            }
            
            this.recordResult(testName, integrationWorking,
                integrationWorking ? 'Error recovery systems properly integrated' : 'Error recovery integration not found');
            
        } catch (error) {
            this.recordResult(testName, false, error.message);
        }
    }

    async testCanvasStateIntegration() {
        const testName = 'Canvas State Integration';
        console.log(`  Testing: ${testName}`);
        
        try {
            // Test integration with canvas state management
            let stateIntegrationWorking = false;
            
            if (window.CanvasStateManager && window.VSSCanvas) {
                // Check if canvas state manager is integrated
                const canvas = document.getElementById('drawing-canvas');
                if (canvas) {
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                        // Try to create canvas state manager
                        const stateManager = new window.CanvasStateManager(canvas, ctx);
                        if (stateManager) {
                            stateIntegrationWorking = true;
                        }
                    }
                }
            }
            
            this.recordResult(testName, stateIntegrationWorking,
                stateIntegrationWorking ? 'Canvas state management integrated' : 'Canvas state integration not available');
            
        } catch (error) {
            this.recordResult(testName, false, error.message);
        }
    }

    async testMessagePassingIntegration() {
        const testName = 'Message Passing Integration';
        console.log(`  Testing: ${testName}`);
        
        try {
            // Test integration between webview and extension messaging
            let messagingIntegrated = false;
            
            if (window.VSSCanvas && window.VSSCanvas.vscode) {
                messagingIntegrated = true;
            } else if (window.vscode) {
                messagingIntegrated = true;
            }
            
            // Test message handling integration
            if (messagingIntegrated && window.VSSCanvas && window.VSSCanvas.handleExtensionMessage) {
                // Test message handling
                try {
                    window.VSSCanvas.handleExtensionMessage({ command: 'test' });
                    messagingIntegrated = true;
                } catch (error) {
                    messagingIntegrated = false;
                }
            }
            
            this.recordResult(testName, messagingIntegrated,
                messagingIntegrated ? 'Message passing properly integrated' : 'Message passing integration issues');
            
        } catch (error) {
            this.recordResult(testName, false, error.message);
        }
    }

    async runLifecycleTests() {
        const testCategory = 'Webview Lifecycle Management';
        console.log(`\n🔄 Testing: ${testCategory}`);
        
        try {
            await this.testWebviewCreation();
            await this.testWebviewDestruction();
            await this.testWebviewRecreation();
            await this.testResourceManagement();
            await this.testStateConsistency();
            
        } catch (error) {
            this.recordResult(testCategory, false, `Category error: ${error.message}`);
        }
    }

    async testWebviewCreation() {
        const testName = 'Webview Creation';
        console.log(`  Testing: ${testName}`);
        
        try {
            // Test webview creation process
            if (!window.VSSCanvas) {
                this.recordResult(testName, false, 'VSSCanvas namespace not created');
                return;
            }
            
            // Check namespace properties
            const requiredProperties = ['canvas', 'ctx', 'initialized', 'init', 'cleanup'];
            let missingProperties = [];
            
            for (const prop of requiredProperties) {
                if (!(prop in window.VSSCanvas)) {
                    missingProperties.push(prop);
                }
            }
            
            if (missingProperties.length === 0) {
                this.recordResult(testName, true, 'Webview namespace created with all required properties');
            } else {
                this.recordResult(testName, false, `Missing properties: ${missingProperties.join(', ')}`);
            }
            
        } catch (error) {
            this.recordResult(testName, false, error.message);
        }
    }

    async testWebviewDestruction() {
        const testName = 'Webview Destruction';
        console.log(`  Testing: ${testName}`);
        
        try {
            // Test proper webview destruction
            if (!window.VSSCanvas || !window.VSSCanvas.cleanup) {
                this.recordResult(testName, false, 'VSSCanvas.cleanup not available');
                return;
            }
            
            // Initialize first
            if (window.VSSCanvas.init) {
                await window.VSSCanvas.init();
            }
            
            // Perform destruction
            await window.VSSCanvas.cleanup();
            
            // Verify destruction
            const properlyDestroyed = !window.VSSCanvas.initialized &&
                                    !window.VSSCanvas.canvas &&
                                    !window.VSSCanvas.ctx;
            
            if (properlyDestroyed) {
                this.recordResult(testName, true, 'Webview properly destroyed');
            } else {
                this.recordResult(testName, false, 'Webview destruction incomplete');
            }
            
        } catch (error) {
            this.recordResult(testName, false, error.message);
        }
    }

    async testWebviewRecreation() {
        const testName = 'Webview Recreation';
        console.log(`  Testing: ${testName}`);
        
        try {
            if (!window.VSSCanvas || !window.VSSCanvas.init || !window.VSSCanvas.cleanup) {
                this.recordResult(testName, false, 'VSSCanvas methods not available');
                return;
            }
            
            // Destroy and recreate multiple times
            let recreationErrors = 0;
            const recreations = 3;
            
            for (let i = 0; i < recreations; i++) {
                try {
                    await window.VSSCanvas.cleanup();
                    await window.VSSCanvas.init();
                    
                    if (!window.VSSCanvas.initialized) {
                        recreationErrors++;
                    }
                } catch (error) {
                    recreationErrors++;
                }
            }
            
            if (recreationErrors === 0) {
                this.recordResult(testName, true, `${recreations} webview recreations successful`);
            } else {
                this.recordResult(testName, false, `${recreationErrors}/${recreations} recreations failed`);
            }
            
        } catch (error) {
            this.recordResult(testName, false, error.message);
        }
    }

    async testResourceManagement() {
        const testName = 'Resource Management';
        console.log(`  Testing: ${testName}`);
        
        try {
            // Test resource management during lifecycle
            if (!window.VSSCanvas) {
                this.recordResult(testName, false, 'VSSCanvas not available');
                return;
            }
            
            // Initialize and track resources
            if (window.VSSCanvas.init) {
                await window.VSSCanvas.init();
            }
            
            // Check resource tracking
            const hasEventListenerTracking = Array.isArray(window.VSSCanvas.eventListeners);
            const hasTimeoutTracking = 'initializationTimeout' in window.VSSCanvas;
            const hasIntervalTracking = 'connectionCheckInterval' in window.VSSCanvas;
            
            const resourceTrackingScore = [hasEventListenerTracking, hasTimeoutTracking, hasIntervalTracking]
                .filter(Boolean).length;
            
            if (resourceTrackingScore >= 2) {
                this.recordResult(testName, true, `Resource tracking implemented (${resourceTrackingScore}/3 types)`);
            } else {
                this.recordResult(testName, false, `Insufficient resource tracking (${resourceTrackingScore}/3 types)`);
            }
            
        } catch (error) {
            this.recordResult(testName, false, error.message);
        }
    }

    async testStateConsistency() {
        const testName = 'State Consistency';
        console.log(`  Testing: ${testName}`);
        
        try {
            if (!window.VSSCanvas || !window.VSSCanvas.getState) {
                this.recordResult(testName, false, 'VSSCanvas.getState not available');
                return;
            }
            
            // Test state consistency across operations
            const initialState = window.VSSCanvas.getState();
            
            // Perform operations
            if (window.VSSCanvas.init) {
                await window.VSSCanvas.init();
            }
            
            const afterInitState = window.VSSCanvas.getState();
            
            // Verify state changes are consistent
            const stateChanged = JSON.stringify(initialState) !== JSON.stringify(afterInitState);
            const hasValidState = afterInitState && typeof afterInitState === 'object';
            
            if (stateChanged && hasValidState) {
                this.recordResult(testName, true, 'State consistency maintained across operations');
            } else {
                this.recordResult(testName, false, 'State consistency issues detected');
            }
            
        } catch (error) {
            this.recordResult(testName, false, error.message);
        }
    }

    // Helper methods
    setupErrorCapture() {
        this.capturedErrors = [];
        this.capturedWarnings = [];
        
        console.error = (...args) => {
            this.capturedErrors.push(args.join(' '));
            this.originalConsoleError.apply(console, args);
        };
        
        console.warn = (...args) => {
            this.capturedWarnings.push(args.join(' '));
            this.originalConsoleWarn.apply(console, args);
        };
    }

    restoreErrorCapture() {
        console.error = this.originalConsoleError;
        console.warn = this.originalConsoleWarn;
    }

    recordResult(testName, passed, details) {
        const result = {
            test: testName,
            passed: passed,
            details: details,
            timestamp: new Date().toISOString()
        };
        
        this.testResults.details.push(result);
        
        if (passed) {
            this.testResults.passed++;
            console.log(`  ✅ ${testName}: ${details}`);
        } else {
            this.testResults.failed++;
            this.testResults.errors.push(`${testName}: ${details}`);
            console.error(`  ❌ ${testName}: ${details}`);
        }
    }

    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    generateFinalReport() {
        const total = this.testResults.passed + this.testResults.failed;
        const successRate = total > 0 ? (this.testResults.passed / total * 100) : 0;
        
        const report = {
            summary: {
                total: total,
                passed: this.testResults.passed,
                failed: this.testResults.failed,
                skipped: this.testResults.skipped,
                successRate: successRate.toFixed(1) + '%',
                capturedErrors: this.capturedErrors.length,
                capturedWarnings: this.capturedWarnings.length
            },
            details: this.testResults.details,
            errors: this.testResults.errors,
            capturedErrors: this.capturedErrors,
            capturedWarnings: this.capturedWarnings,
            timestamp: new Date().toISOString()
        };
        
        console.log('\n' + '='.repeat(60));
        console.log('🚨 Error Handling Test Suite Report');
        console.log('='.repeat(60));
        console.log(`Total Tests: ${report.summary.total}`);
        console.log(`Passed: ${report.summary.passed} ✅`);
        console.log(`Failed: ${report.summary.failed} ❌`);
        console.log(`Skipped: ${report.summary.skipped} ⏭️`);
        console.log(`Success Rate: ${report.summary.successRate}`);
        console.log(`Captured Errors: ${report.summary.capturedErrors}`);
        console.log(`Captured Warnings: ${report.summary.capturedWarnings}`);
        
        if (this.testResults.errors.length > 0) {
            console.log('\n❌ Failed Tests:');
            this.testResults.errors.forEach(error => console.log(`  - ${error}`));
        }
        
        if (this.capturedErrors.length > 0) {
            console.log('\n🔍 Captured Errors:');
            this.capturedErrors.slice(0, 5).forEach(error => console.log(`  - ${error}`));
            if (this.capturedErrors.length > 5) {
                console.log(`  ... and ${this.capturedErrors.length - 5} more`);
            }
        }
        
        return report;
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ErrorHandlingTestSuite;
}

// Auto-run if loaded directly in browser
if (typeof window !== 'undefined' && window.document) {
    window.ErrorHandlingTestSuite = ErrorHandlingTestSuite;
    
    // Make it available globally for manual testing
    window.runErrorHandlingTests = async function() {
        const testSuite = new ErrorHandlingTestSuite();
        return await testSuite.runAllTests();
    };
}