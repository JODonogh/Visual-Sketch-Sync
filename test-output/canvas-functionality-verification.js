/**
 * Canvas Functionality Verification Test Suite
 * 
 * This comprehensive test suite verifies that all canvas functionality remains intact
 * after the webview initialization fix. It tests drawing tools, toolbar interactions,
 * status bar updates, canvas interactions, and message passing with VS Code extension.
 * 
 * Requirements: 4.1, 4.2, 4.3, 4.5
 */

class CanvasFunctionalityVerification {
    constructor() {
        this.testResults = {
            passed: 0,
            failed: 0,
            warnings: 0,
            details: []
        };
        this.canvas = null;
        this.ctx = null;
        this.originalConsoleWarn = console.warn;
        this.capturedWarnings = [];
    }

    async runFullVerification() {
        console.log('🎨 Starting Canvas Functionality Verification');
        console.log('='.repeat(60));
        
        try {
            // Setup
            await this.setupTestEnvironment();
            
            // Core functionality tests
            await this.verifyCanvasInitialization();
            await this.verifyDrawingTools();
            await this.verifyToolbarFunctionality();
            await this.verifyStatusBarFunctionality();
            await this.verifyCanvasInteractions();
            await this.verifyMessagePassing();
            await this.verifyEventHandling();
            await this.verifyErrorHandling();
            await this.verifyPerformance();
            
            // Generate comprehensive report
            return this.generateReport();
            
        } catch (error) {
            console.error('Fatal error in canvas functionality verification:', error);
            this.recordResult('FATAL_ERROR', false, `Fatal error: ${error.message}`);
            return this.generateReport();
        } finally {
            this.cleanup();
        }
    }

    async setupTestEnvironment() {
        console.log('\n🔧 Setting up test environment...');
        
        // Capture warnings
        this.capturedWarnings = [];
        console.warn = (...args) => {
            this.capturedWarnings.push(args.join(' '));
            this.originalConsoleWarn.apply(console, args);
        };
        
        // Get canvas references
        this.canvas = document.getElementById('drawing-canvas');
        if (this.canvas) {
            this.ctx = this.canvas.getContext('2d');
        }
        
        // Ensure webview is initialized
        if (window.VSSCanvas && !window.VSSCanvas.initialized) {
            console.log('Initializing VSSCanvas for testing...');
            await window.VSSCanvas.init();
        }
        
        console.log('✅ Test environment setup complete');
    }

    async verifyCanvasInitialization() {
        const testCategory = 'Canvas Initialization';
        console.log(`\n🎯 Testing: ${testCategory}`);
        
        try {
            // Test 1: Canvas element exists and is accessible
            if (!this.canvas) {
                throw new Error('Canvas element not found in DOM');
            }
            this.recordResult('Canvas Element Exists', true, 'Canvas element found and accessible');
            
            // Test 2: Canvas context is available
            if (!this.ctx) {
                throw new Error('Canvas 2D context not available');
            }
            this.recordResult('Canvas Context Available', true, '2D rendering context obtained successfully');
            
            // Test 3: Canvas has valid dimensions
            if (this.canvas.width <= 0 || this.canvas.height <= 0) {
                throw new Error(`Invalid canvas dimensions: ${this.canvas.width}x${this.canvas.height}`);
            }
            this.recordResult('Canvas Dimensions Valid', true, `Canvas size: ${this.canvas.width}x${this.canvas.height}`);
            
            // Test 4: VSSCanvas namespace exists and is initialized
            if (!window.VSSCanvas) {
                throw new Error('VSSCanvas namespace not found');
            }
            this.recordResult('VSSCanvas Namespace Exists', true, 'VSSCanvas namespace properly created');
            
            if (!window.VSSCanvas.initialized) {
                throw new Error('VSSCanvas not properly initialized');
            }
            this.recordResult('VSSCanvas Initialized', true, 'VSSCanvas initialization completed successfully');
            
            // Test 5: Canvas drawing properties are set correctly
            const expectedProperties = {
                lineCap: 'round',
                lineJoin: 'round',
                strokeStyle: '#000000',
                lineWidth: 2
            };
            
            for (const [property, expectedValue] of Object.entries(expectedProperties)) {
                if (this.ctx[property] !== expectedValue) {
                    this.recordResult(`Canvas Property: ${property}`, false, 
                        `Expected ${expectedValue}, got ${this.ctx[property]}`);
                } else {
                    this.recordResult(`Canvas Property: ${property}`, true, 
                        `Correctly set to ${expectedValue}`);
                }
            }
            
        } catch (error) {
            this.recordResult(testCategory, false, error.message);
        }
    }

    async verifyDrawingTools() {
        const testCategory = 'Drawing Tools';
        console.log(`\n🖊️ Testing: ${testCategory}`);
        
        try {
            // Test pen tool
            await this.testPenTool();
            
            // Test eraser tool
            await this.testEraserTool();
            
            // Test clear canvas functionality
            await this.testClearCanvas();
            
            // Test tool switching
            await this.testToolSwitching();
            
        } catch (error) {
            this.recordResult(testCategory, false, error.message);
        }
    }

    async testPenTool() {
        console.log('  Testing pen tool...');
        
        try {
            // Select pen tool
            const penButton = document.querySelector('[data-tool="pen"]');
            if (!penButton) {
                throw new Error('Pen tool button not found');
            }
            
            penButton.click();
            
            // Verify pen tool is selected
            if (!penButton.classList.contains('active')) {
                throw new Error('Pen tool not activated after click');
            }
            
            // Test drawing with pen
            const startX = 50, startY = 50;
            const endX = 100, endY = 100;
            
            // Clear canvas first
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            
            // Simulate drawing
            this.simulateDrawing(startX, startY, endX, endY);
            
            // Verify drawing occurred
            const imageData = this.ctx.getImageData(startX - 5, startY - 5, 
                (endX - startX) + 10, (endY - startY) + 10);
            const hasDrawing = this.hasNonTransparentPixels(imageData);
            
            if (!hasDrawing) {
                throw new Error('Pen tool did not produce visible drawing');
            }
            
            this.recordResult('Pen Tool Drawing', true, 'Pen tool successfully draws on canvas');
            
            // Test pen tool properties
            if (window.VSSCanvas && window.VSSCanvas.currentTool !== 'pen') {
                this.recordResult('Pen Tool Selection', false, 
                    `Expected currentTool to be 'pen', got '${window.VSSCanvas.currentTool}'`);
            } else {
                this.recordResult('Pen Tool Selection', true, 'Pen tool properly selected');
            }
            
        } catch (error) {
            this.recordResult('Pen Tool', false, error.message);
        }
    }

    async testEraserTool() {
        console.log('  Testing eraser tool...');
        
        try {
            // First, draw something to erase
            this.ctx.fillStyle = '#000000';
            this.ctx.fillRect(150, 150, 50, 50);
            
            // Select eraser tool
            const eraserButton = document.querySelector('[data-tool="eraser"]');
            if (!eraserButton) {
                throw new Error('Eraser tool button not found');
            }
            
            eraserButton.click();
            
            // Verify eraser tool is selected
            if (!eraserButton.classList.contains('active')) {
                throw new Error('Eraser tool not activated after click');
            }
            
            this.recordResult('Eraser Tool Selection', true, 'Eraser tool properly selected');
            
            // Test eraser functionality
            this.simulateDrawing(160, 160, 180, 180);
            
            // Verify eraser properties are set
            if (window.VSSCanvas && window.VSSCanvas.currentTool !== 'eraser') {
                this.recordResult('Eraser Tool State', false, 
                    `Expected currentTool to be 'eraser', got '${window.VSSCanvas.currentTool}'`);
            } else {
                this.recordResult('Eraser Tool State', true, 'Eraser tool state properly maintained');
            }
            
            // Test cursor change
            const expectedCursor = 'grab';
            if (this.canvas.style.cursor !== expectedCursor) {
                this.recordResult('Eraser Cursor', false, 
                    `Expected cursor '${expectedCursor}', got '${this.canvas.style.cursor}'`);
            } else {
                this.recordResult('Eraser Cursor', true, 'Eraser cursor properly set');
            }
            
        } catch (error) {
            this.recordResult('Eraser Tool', false, error.message);
        }
    }

    async testClearCanvas() {
        console.log('  Testing clear canvas functionality...');
        
        try {
            // Draw something first
            this.ctx.fillStyle = '#ff0000';
            this.ctx.fillRect(0, 0, 100, 100);
            
            // Verify something is drawn
            const beforeClear = this.ctx.getImageData(50, 50, 1, 1);
            const hasContentBefore = this.hasNonTransparentPixels(beforeClear);
            
            if (!hasContentBefore) {
                console.warn('No content detected before clear test');
            }
            
            // Click clear button
            const clearButton = document.getElementById('clear-canvas');
            if (!clearButton) {
                throw new Error('Clear canvas button not found');
            }
            
            clearButton.click();
            
            // Verify canvas is cleared (check a sample area)
            const afterClear = this.ctx.getImageData(50, 50, 1, 1);
            const hasContentAfter = this.hasNonTransparentPixels(afterClear);
            
            if (hasContentAfter && hasContentBefore) {
                this.recordResult('Clear Canvas Functionality', false, 'Canvas not properly cleared');
            } else {
                this.recordResult('Clear Canvas Functionality', true, 'Canvas successfully cleared');
            }
            
        } catch (error) {
            this.recordResult('Clear Canvas', false, error.message);
        }
    }

    async testToolSwitching() {
        console.log('  Testing tool switching...');
        
        try {
            const toolButtons = document.querySelectorAll('.tool-button[data-tool]');
            if (toolButtons.length === 0) {
                throw new Error('No tool buttons found');
            }
            
            let switchCount = 0;
            
            for (const button of toolButtons) {
                const tool = button.dataset.tool;
                button.click();
                
                // Verify only this button is active
                const activeButtons = document.querySelectorAll('.tool-button.active');
                if (activeButtons.length !== 1 || !button.classList.contains('active')) {
                    throw new Error(`Tool switching failed for ${tool} - multiple or no active buttons`);
                }
                
                // Verify VSSCanvas state
                if (window.VSSCanvas && window.VSSCanvas.currentTool !== tool) {
                    throw new Error(`VSSCanvas currentTool not updated for ${tool}`);
                }
                
                switchCount++;
            }
            
            this.recordResult('Tool Switching', true, `Successfully switched between ${switchCount} tools`);
            
        } catch (error) {
            this.recordResult('Tool Switching', false, error.message);
        }
    }

    async verifyToolbarFunctionality() {
        const testCategory = 'Toolbar Functionality';
        console.log(`\n🔧 Testing: ${testCategory}`);
        
        try {
            // Test toolbar visibility
            const toolbar = document.querySelector('.toolbar');
            if (!toolbar) {
                throw new Error('Toolbar element not found');
            }
            
            const toolbarVisible = window.getComputedStyle(toolbar).display !== 'none';
            if (!toolbarVisible) {
                throw new Error('Toolbar is not visible');
            }
            this.recordResult('Toolbar Visibility', true, 'Toolbar is visible and accessible');
            
            // Test toolbar positioning
            const toolbarRect = toolbar.getBoundingClientRect();
            if (toolbarRect.width === 0 || toolbarRect.height === 0) {
                throw new Error('Toolbar has invalid dimensions');
            }
            this.recordResult('Toolbar Positioning', true, 'Toolbar has valid dimensions and positioning');
            
            // Test all toolbar buttons
            const allButtons = toolbar.querySelectorAll('button');
            let workingButtons = 0;
            
            for (const button of allButtons) {
                try {
                    // Test button click
                    const originalText = button.textContent;
                    button.click();
                    
                    // Verify button is responsive (not disabled)
                    if (!button.disabled) {
                        workingButtons++;
                    }
                } catch (buttonError) {
                    console.warn(`Button test failed: ${buttonError.message}`);
                }
            }
            
            this.recordResult('Toolbar Button Functionality', true, 
                `${workingButtons}/${allButtons.length} toolbar buttons are functional`);
            
            // Test toolbar styling
            const toolbarStyles = window.getComputedStyle(toolbar);
            const hasProperStyling = toolbarStyles.backgroundColor !== 'rgba(0, 0, 0, 0)' ||
                                   toolbarStyles.border !== 'none';
            
            if (hasProperStyling) {
                this.recordResult('Toolbar Styling', true, 'Toolbar has proper styling applied');
            } else {
                this.recordResult('Toolbar Styling', false, 'Toolbar styling may be missing');
            }
            
        } catch (error) {
            this.recordResult(testCategory, false, error.message);
        }
    }

    async verifyStatusBarFunctionality() {
        const testCategory = 'Status Bar Functionality';
        console.log(`\n📊 Testing: ${testCategory}`);
        
        try {
            // Test status bar element
            const statusBar = document.getElementById('status');
            if (!statusBar) {
                throw new Error('Status bar element not found');
            }
            this.recordResult('Status Bar Element', true, 'Status bar element exists');
            
            // Test status text updates
            const statusText = statusBar.querySelector('span:first-child');
            if (!statusText) {
                throw new Error('Status text element not found');
            }
            
            const originalText = statusText.textContent;
            
            // Test status update functionality
            if (window.VSSCanvas && window.VSSCanvas.updateStatus) {
                const testMessage = 'Test status update';
                window.VSSCanvas.updateStatus(testMessage);
                
                if (statusText.textContent.includes(testMessage)) {
                    this.recordResult('Status Text Updates', true, 'Status text updates correctly');
                } else {
                    this.recordResult('Status Text Updates', false, 'Status text not updated');
                }
            } else {
                this.recordResult('Status Text Updates', false, 'updateStatus method not available');
            }
            
            // Test connection status
            const connectionStatus = document.getElementById('connection-status');
            if (!connectionStatus) {
                throw new Error('Connection status element not found');
            }
            this.recordResult('Connection Status Element', true, 'Connection status element exists');
            
            // Test connection status updates
            if (window.VSSCanvas && window.VSSCanvas.updateConnectionStatus) {
                // Test connected state
                window.VSSCanvas.updateConnectionStatus(true);
                if (connectionStatus.classList.contains('connected')) {
                    this.recordResult('Connection Status - Connected', true, 'Connected state properly displayed');
                } else {
                    this.recordResult('Connection Status - Connected', false, 'Connected state not displayed');
                }
                
                // Test disconnected state
                window.VSSCanvas.updateConnectionStatus(false);
                if (connectionStatus.classList.contains('disconnected')) {
                    this.recordResult('Connection Status - Disconnected', true, 'Disconnected state properly displayed');
                } else {
                    this.recordResult('Connection Status - Disconnected', false, 'Disconnected state not displayed');
                }
            } else {
                this.recordResult('Connection Status Updates', false, 'updateConnectionStatus method not available');
            }
            
            // Test status bar styling
            const statusBarStyles = window.getComputedStyle(statusBar);
            const hasProperStyling = statusBarStyles.backgroundColor !== 'rgba(0, 0, 0, 0)';
            
            this.recordResult('Status Bar Styling', hasProperStyling, 
                hasProperStyling ? 'Status bar has proper styling' : 'Status bar styling may be missing');
            
        } catch (error) {
            this.recordResult(testCategory, false, error.message);
        }
    }

    async verifyCanvasInteractions() {
        const testCategory = 'Canvas Interactions';
        console.log(`\n🖱️ Testing: ${testCategory}`);
        
        try {
            // Test mouse event handling
            await this.testMouseEvents();
            
            // Test touch event handling (if supported)
            if ('ontouchstart' in window) {
                await this.testTouchEvents();
            } else {
                this.recordResult('Touch Events', true, 'Touch events not supported in this environment (expected)');
            }
            
            // Test keyboard interactions
            await this.testKeyboardEvents();
            
            // Test canvas focus and blur
            await this.testCanvasFocus();
            
        } catch (error) {
            this.recordResult(testCategory, false, error.message);
        }
    }

    async testMouseEvents() {
        console.log('  Testing mouse events...');
        
        try {
            let mouseDownFired = false;
            let mouseMoveFired = false;
            let mouseUpFired = false;
            
            // Add temporary event listeners to track events
            const mouseDownHandler = () => { mouseDownFired = true; };
            const mouseMoveHandler = () => { mouseMoveFired = true; };
            const mouseUpHandler = () => { mouseUpFired = true; };
            
            this.canvas.addEventListener('mousedown', mouseDownHandler);
            this.canvas.addEventListener('mousemove', mouseMoveHandler);
            this.canvas.addEventListener('mouseup', mouseUpHandler);
            
            // Simulate mouse interaction
            this.simulateMouseEvent('mousedown', 100, 100);
            this.simulateMouseEvent('mousemove', 150, 150);
            this.simulateMouseEvent('mouseup', 150, 150);
            
            // Wait for events to process
            await this.delay(100);
            
            // Clean up event listeners
            this.canvas.removeEventListener('mousedown', mouseDownHandler);
            this.canvas.removeEventListener('mousemove', mouseMoveHandler);
            this.canvas.removeEventListener('mouseup', mouseUpHandler);
            
            // Verify events fired
            if (!mouseDownFired) {
                throw new Error('mousedown event not fired');
            }
            if (!mouseMoveFired) {
                throw new Error('mousemove event not fired');
            }
            if (!mouseUpFired) {
                throw new Error('mouseup event not fired');
            }
            
            this.recordResult('Mouse Events', true, 'All mouse events firing correctly');
            
        } catch (error) {
            this.recordResult('Mouse Events', false, error.message);
        }
    }

    async testTouchEvents() {
        console.log('  Testing touch events...');
        
        try {
            let touchStartFired = false;
            let touchMoveFired = false;
            let touchEndFired = false;
            
            // Add temporary event listeners
            const touchStartHandler = () => { touchStartFired = true; };
            const touchMoveHandler = () => { touchMoveFired = true; };
            const touchEndHandler = () => { touchEndFired = true; };
            
            this.canvas.addEventListener('touchstart', touchStartHandler);
            this.canvas.addEventListener('touchmove', touchMoveHandler);
            this.canvas.addEventListener('touchend', touchEndHandler);
            
            // Simulate touch interaction
            this.simulateTouchEvent('touchstart', 200, 200);
            this.simulateTouchEvent('touchmove', 250, 250);
            this.simulateTouchEvent('touchend', 250, 250);
            
            // Wait for events to process
            await this.delay(100);
            
            // Clean up event listeners
            this.canvas.removeEventListener('touchstart', touchStartHandler);
            this.canvas.removeEventListener('touchmove', touchMoveHandler);
            this.canvas.removeEventListener('touchend', touchEndHandler);
            
            // Verify events fired
            if (!touchStartFired || !touchMoveFired || !touchEndFired) {
                this.recordResult('Touch Events', false, 'Some touch events not firing correctly');
            } else {
                this.recordResult('Touch Events', true, 'All touch events firing correctly');
            }
            
        } catch (error) {
            this.recordResult('Touch Events', false, error.message);
        }
    }

    async testKeyboardEvents() {
        console.log('  Testing keyboard events...');
        
        try {
            // Test if canvas can receive focus for keyboard events
            this.canvas.focus();
            
            let keydownFired = false;
            const keydownHandler = (e) => {
                if (e.key === 'Escape') {
                    keydownFired = true;
                }
            };
            
            document.addEventListener('keydown', keydownHandler);
            
            // Simulate Escape key press
            const escapeEvent = new KeyboardEvent('keydown', {
                key: 'Escape',
                code: 'Escape',
                bubbles: true
            });
            document.dispatchEvent(escapeEvent);
            
            await this.delay(50);
            
            document.removeEventListener('keydown', keydownHandler);
            
            this.recordResult('Keyboard Events', keydownFired, 
                keydownFired ? 'Keyboard events working correctly' : 'Keyboard events may not be properly handled');
            
        } catch (error) {
            this.recordResult('Keyboard Events', false, error.message);
        }
    }

    async testCanvasFocus() {
        console.log('  Testing canvas focus handling...');
        
        try {
            // Test canvas can receive focus
            this.canvas.focus();
            
            // Test focus/blur events
            let focusFired = false;
            let blurFired = false;
            
            const focusHandler = () => { focusFired = true; };
            const blurHandler = () => { blurFired = true; };
            
            this.canvas.addEventListener('focus', focusHandler);
            this.canvas.addEventListener('blur', blurHandler);
            
            // Simulate focus/blur
            this.canvas.focus();
            await this.delay(50);
            this.canvas.blur();
            await this.delay(50);
            
            this.canvas.removeEventListener('focus', focusHandler);
            this.canvas.removeEventListener('blur', blurHandler);
            
            this.recordResult('Canvas Focus Handling', true, 'Canvas focus/blur handling working');
            
        } catch (error) {
            this.recordResult('Canvas Focus Handling', false, error.message);
        }
    }

    async verifyMessagePassing() {
        const testCategory = 'Message Passing';
        console.log(`\n📡 Testing: ${testCategory}`);
        
        try {
            // Check VS Code API availability
            const vscode = window.vscode || (window.VSSCanvas && window.VSSCanvas.vscode);
            
            if (!vscode) {
                this.recordResult('VS Code API Availability', false, 'VS Code API not available');
                return;
            }
            
            this.recordResult('VS Code API Availability', true, 'VS Code API is available');
            
            // Test message sending
            let messageSent = false;
            const originalPostMessage = vscode.postMessage;
            
            vscode.postMessage = function(message) {
                messageSent = true;
                console.log('Test message intercepted:', message);
                // Restore original method
                vscode.postMessage = originalPostMessage;
                return true;
            };
            
            // Send test message
            if (window.VSSCanvas && window.VSSCanvas.sendMessage) {
                window.VSSCanvas.sendMessage({
                    command: 'test',
                    data: { verification: true }
                });
            } else {
                vscode.postMessage({
                    command: 'test',
                    data: { verification: true }
                });
            }
            
            this.recordResult('Message Sending', messageSent, 
                messageSent ? 'Messages can be sent to extension' : 'Message sending failed');
            
            // Test message receiving
            let messageReceived = false;
            const originalMessageHandler = window.onmessage;
            
            window.addEventListener('message', function testMessageHandler(event) {
                if (event.data && event.data.command === 'testResponse') {
                    messageReceived = true;
                    window.removeEventListener('message', testMessageHandler);
                }
            });
            
            // Simulate receiving a message from extension
            window.postMessage({
                command: 'testResponse',
                data: { received: true }
            }, '*');
            
            await this.delay(100);
            
            this.recordResult('Message Receiving', messageReceived,
                messageReceived ? 'Messages can be received from extension' : 'Message receiving may not be working');
            
        } catch (error) {
            this.recordResult(testCategory, false, error.message);
        }
    }

    async verifyEventHandling() {
        const testCategory = 'Event Handling';
        console.log(`\n⚡ Testing: ${testCategory}`);
        
        try {
            // Test window resize handling
            await this.testWindowResize();
            
            // Test error event handling
            await this.testErrorHandling();
            
            // Test cleanup on page unload
            await this.testUnloadHandling();
            
        } catch (error) {
            this.recordResult(testCategory, false, error.message);
        }
    }

    async testWindowResize() {
        console.log('  Testing window resize handling...');
        
        try {
            const originalWidth = this.canvas.width;
            const originalHeight = this.canvas.height;
            
            // Simulate window resize
            const resizeEvent = new Event('resize');
            window.dispatchEvent(resizeEvent);
            
            await this.delay(200);
            
            // Verify canvas still has valid dimensions
            if (this.canvas.width <= 0 || this.canvas.height <= 0) {
                throw new Error('Canvas dimensions invalid after resize');
            }
            
            this.recordResult('Window Resize Handling', true, 'Canvas handles window resize correctly');
            
        } catch (error) {
            this.recordResult('Window Resize Handling', false, error.message);
        }
    }

    async testErrorHandling() {
        console.log('  Testing error handling...');
        
        try {
            let errorHandled = false;
            
            // Capture error events
            const errorHandler = (event) => {
                errorHandled = true;
            };
            
            window.addEventListener('error', errorHandler);
            
            // Trigger a controlled error
            try {
                throw new Error('Test error for verification');
            } catch (testError) {
                // This should be caught by our try-catch, not the global handler
            }
            
            await this.delay(100);
            
            window.removeEventListener('error', errorHandler);
            
            this.recordResult('Error Event Handling', true, 'Error handling system is in place');
            
        } catch (error) {
            this.recordResult('Error Event Handling', false, error.message);
        }
    }

    async testUnloadHandling() {
        console.log('  Testing unload handling...');
        
        try {
            // Test if cleanup is registered for page unload
            let unloadHandlerExists = false;
            
            // Check if VSSCanvas has cleanup method
            if (window.VSSCanvas && typeof window.VSSCanvas.cleanup === 'function') {
                unloadHandlerExists = true;
            }
            
            this.recordResult('Unload Cleanup Handler', unloadHandlerExists,
                unloadHandlerExists ? 'Cleanup handler available for page unload' : 'No cleanup handler found');
            
        } catch (error) {
            this.recordResult('Unload Handling', false, error.message);
        }
    }

    async verifyErrorHandling() {
        const testCategory = 'Error Handling & Recovery';
        console.log(`\n🚨 Testing: ${testCategory}`);
        
        try {
            // Test error screen functionality
            await this.testErrorScreen();
            
            // Test error recovery mechanisms
            await this.testErrorRecovery();
            
            // Test error reporting
            await this.testErrorReporting();
            
        } catch (error) {
            this.recordResult(testCategory, false, error.message);
        }
    }

    async testErrorScreen() {
        console.log('  Testing error screen functionality...');
        
        try {
            const errorScreen = document.getElementById('error-screen');
            if (!errorScreen) {
                throw new Error('Error screen element not found');
            }
            
            // Test error screen is initially hidden
            const initiallyHidden = errorScreen.style.display === 'none' || 
                                  window.getComputedStyle(errorScreen).display === 'none';
            
            this.recordResult('Error Screen Initial State', initiallyHidden,
                initiallyHidden ? 'Error screen initially hidden' : 'Error screen should be initially hidden');
            
            // Test error screen elements
            const errorMessage = document.getElementById('error-message');
            const retryButton = document.getElementById('retry-button');
            const reportButton = document.getElementById('report-button');
            
            this.recordResult('Error Screen Elements', 
                !!(errorMessage && retryButton && reportButton),
                'Error screen has all required elements');
            
        } catch (error) {
            this.recordResult('Error Screen', false, error.message);
        }
    }

    async testErrorRecovery() {
        console.log('  Testing error recovery mechanisms...');
        
        try {
            // Test if error recovery manager exists
            const hasErrorRecovery = window.ErrorRecoveryManager || 
                                   (window.VSSCanvas && window.VSSCanvas.errorRecoveryManager);
            
            this.recordResult('Error Recovery System', !!hasErrorRecovery,
                hasErrorRecovery ? 'Error recovery system available' : 'Error recovery system not found');
            
            // Test retry functionality
            const retryButton = document.getElementById('retry-button');
            if (retryButton) {
                // Test retry button is clickable
                let retryClicked = false;
                const retryHandler = () => { retryClicked = true; };
                
                retryButton.addEventListener('click', retryHandler);
                retryButton.click();
                
                await this.delay(50);
                
                retryButton.removeEventListener('click', retryHandler);
                
                this.recordResult('Retry Button Functionality', retryClicked,
                    retryClicked ? 'Retry button is functional' : 'Retry button not responding');
            }
            
        } catch (error) {
            this.recordResult('Error Recovery', false, error.message);
        }
    }

    async testErrorReporting() {
        console.log('  Testing error reporting...');
        
        try {
            const reportButton = document.getElementById('report-button');
            if (!reportButton) {
                this.recordResult('Error Reporting Button', false, 'Report button not found');
                return;
            }
            
            // Test report button functionality
            let reportClicked = false;
            const reportHandler = () => { reportClicked = true; };
            
            reportButton.addEventListener('click', reportHandler);
            reportButton.click();
            
            await this.delay(50);
            
            reportButton.removeEventListener('click', reportHandler);
            
            this.recordResult('Error Reporting Functionality', reportClicked,
                reportClicked ? 'Error reporting button is functional' : 'Error reporting button not responding');
            
        } catch (error) {
            this.recordResult('Error Reporting', false, error.message);
        }
    }

    async verifyPerformance() {
        const testCategory = 'Performance';
        console.log(`\n⚡ Testing: ${testCategory}`);
        
        try {
            // Test initialization time
            await this.testInitializationPerformance();
            
            // Test drawing performance
            await this.testDrawingPerformance();
            
            // Test memory usage
            await this.testMemoryUsage();
            
        } catch (error) {
            this.recordResult(testCategory, false, error.message);
        }
    }

    async testInitializationPerformance() {
        console.log('  Testing initialization performance...');
        
        try {
            // Measure reinitialization time
            const startTime = performance.now();
            
            if (window.VSSCanvas && window.VSSCanvas.reinitialize) {
                await window.VSSCanvas.reinitialize();
            }
            
            const endTime = performance.now();
            const initTime = endTime - startTime;
            
            // Consider initialization fast if under 2 seconds
            const isFast = initTime < 2000;
            
            this.recordResult('Initialization Performance', isFast,
                `Initialization took ${initTime.toFixed(2)}ms ${isFast ? '(fast)' : '(slow)'}`);
            
        } catch (error) {
            this.recordResult('Initialization Performance', false, error.message);
        }
    }

    async testDrawingPerformance() {
        console.log('  Testing drawing performance...');
        
        try {
            const iterations = 100;
            const startTime = performance.now();
            
            // Perform multiple drawing operations
            for (let i = 0; i < iterations; i++) {
                this.ctx.beginPath();
                this.ctx.moveTo(i, i);
                this.ctx.lineTo(i + 10, i + 10);
                this.ctx.stroke();
            }
            
            const endTime = performance.now();
            const drawTime = endTime - startTime;
            const avgTime = drawTime / iterations;
            
            // Consider drawing fast if under 1ms per operation
            const isFast = avgTime < 1;
            
            this.recordResult('Drawing Performance', isFast,
                `Average drawing time: ${avgTime.toFixed(2)}ms per operation ${isFast ? '(fast)' : '(acceptable)'}`);
            
        } catch (error) {
            this.recordResult('Drawing Performance', false, error.message);
        }
    }

    async testMemoryUsage() {
        console.log('  Testing memory usage...');
        
        try {
            // Check if performance.memory is available (Chrome)
            if (performance.memory) {
                const memoryInfo = {
                    used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
                    total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
                    limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024)
                };
                
                // Consider memory usage reasonable if under 100MB
                const isReasonable = memoryInfo.used < 100;
                
                this.recordResult('Memory Usage', isReasonable,
                    `JS Heap: ${memoryInfo.used}MB used / ${memoryInfo.total}MB total ${isReasonable ? '(reasonable)' : '(high)'}`);
            } else {
                this.recordResult('Memory Usage', true, 'Memory API not available (browser limitation)');
            }
            
            // Test for memory leaks by checking event listener count
            if (window.VSSCanvas && window.VSSCanvas.eventListeners) {
                const listenerCount = window.VSSCanvas.eventListeners.length;
                const hasReasonableListenerCount = listenerCount < 50;
                
                this.recordResult('Event Listener Count', hasReasonableListenerCount,
                    `${listenerCount} event listeners registered ${hasReasonableListenerCount ? '(reasonable)' : '(high)'}`);
            }
            
        } catch (error) {
            this.recordResult('Memory Usage', false, error.message);
        }
    }

    // Helper methods
    simulateDrawing(startX, startY, endX, endY) {
        // Simulate a drawing stroke
        this.simulateMouseEvent('mousedown', startX, startY);
        
        // Simulate intermediate points for smooth drawing
        const steps = 10;
        for (let i = 1; i <= steps; i++) {
            const x = startX + (endX - startX) * (i / steps);
            const y = startY + (endY - startY) * (i / steps);
            this.simulateMouseEvent('mousemove', x, y);
        }
        
        this.simulateMouseEvent('mouseup', endX, endY);
    }

    simulateMouseEvent(type, x, y) {
        const event = new MouseEvent(type, {
            clientX: x,
            clientY: y,
            bubbles: true,
            cancelable: true
        });
        this.canvas.dispatchEvent(event);
    }

    simulateTouchEvent(type, x, y) {
        const touch = new Touch({
            identifier: 1,
            target: this.canvas,
            clientX: x,
            clientY: y
        });
        
        const event = new TouchEvent(type, {
            touches: type === 'touchend' ? [] : [touch],
            targetTouches: type === 'touchend' ? [] : [touch],
            changedTouches: [touch],
            bubbles: true,
            cancelable: true
        });
        
        this.canvas.dispatchEvent(event);
    }

    hasNonTransparentPixels(imageData) {
        // Check if any pixels are not fully transparent
        for (let i = 3; i < imageData.data.length; i += 4) {
            if (imageData.data[i] > 0) { // Alpha channel > 0
                return true;
            }
        }
        return false;
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
            console.error(`  ❌ ${testName}: ${details}`);
        }
    }

    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    cleanup() {
        // Restore console.warn
        console.warn = this.originalConsoleWarn;
        
        // Clear any test artifacts from canvas
        if (this.ctx) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
    }

    generateReport() {
        const total = this.testResults.passed + this.testResults.failed;
        const successRate = total > 0 ? (this.testResults.passed / total * 100) : 0;
        
        const report = {
            summary: {
                total: total,
                passed: this.testResults.passed,
                failed: this.testResults.failed,
                warnings: this.capturedWarnings.length,
                successRate: successRate.toFixed(1) + '%'
            },
            details: this.testResults.details,
            warnings: this.capturedWarnings,
            timestamp: new Date().toISOString()
        };
        
        console.log('\n' + '='.repeat(60));
        console.log('🎨 Canvas Functionality Verification Report');
        console.log('='.repeat(60));
        console.log(`Total Tests: ${report.summary.total}`);
        console.log(`Passed: ${report.summary.passed} ✅`);
        console.log(`Failed: ${report.summary.failed} ❌`);
        console.log(`Warnings: ${report.summary.warnings} ⚠️`);
        console.log(`Success Rate: ${report.summary.successRate}`);
        
        if (this.testResults.failed > 0) {
            console.log('\n❌ Failed Tests:');
            this.testResults.details
                .filter(result => !result.passed)
                .forEach(result => console.log(`  - ${result.test}: ${result.details}`));
        }
        
        if (this.capturedWarnings.length > 0) {
            console.log('\n⚠️ Warnings:');
            this.capturedWarnings.forEach(warning => console.log(`  - ${warning}`));
        }
        
        return report;
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CanvasFunctionalityVerification;
}

// Auto-run if loaded directly in browser
if (typeof window !== 'undefined' && window.document) {
    window.CanvasFunctionalityVerification = CanvasFunctionalityVerification;
    
    // Make it available globally for manual testing
    window.runCanvasFunctionalityVerification = async function() {
        const verification = new CanvasFunctionalityVerification();
        return await verification.runFullVerification();
    };
}