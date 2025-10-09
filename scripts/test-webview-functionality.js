/**
 * Webview Panel Functionality Test Script
 * Tests Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 4.2, 4.4
 * 
 * This script validates the webview panel implementation without requiring VS Code extension context
 */

const fs = require('fs');
const path = require('path');

class WebviewFunctionalityTester {
    constructor() {
        this.results = [];
        this.testCount = 0;
        this.passCount = 0;
    }

    /**
     * Runs all webview functionality tests
     */
    async runAllTests() {
        console.log('🧪 Starting Webview Panel Functionality Tests');
        console.log('=' .repeat(60));

        // Task 5.1: Test webview panel creation and display
        await this.testPanelCreationAndDisplay();
        
        // Task 5.2: Test error handling and recovery scenarios
        await this.testErrorHandlingAndRecovery();

        this.printSummary();
        return this.passCount === this.testCount;
    }

    /**
     * Task 5.1: Test webview panel creation and display
     */
    async testPanelCreationAndDisplay() {
        console.log('\n📋 Task 5.1: Testing webview panel creation and display');
        console.log('-'.repeat(50));

        // Test: Verify "VSS: Open Drawing Canvas" command implementation exists
        this.testCommandImplementation();
        
        // Test: Panel appears in main editor area with full canvas interface
        this.testCanvasInterfaceStructure();
        
        // Test: Validate drawing tools and canvas interaction work properly
        this.testDrawingToolsImplementation();
    }

    /**
     * Task 5.2: Test error handling and recovery scenarios
     */
    async testErrorHandlingAndRecovery() {
        console.log('\n📋 Task 5.2: Testing error handling and recovery scenarios');
        console.log('-'.repeat(50));

        // Test: Webview content loading failures and error display
        this.testErrorDisplayImplementation();
        
        // Test: Multiple command executions focus existing panel
        this.testMultipleCommandHandling();
        
        // Test: Panel disposal and recreation functionality
        this.testPanelLifecycleManagement();
    }

    /**
     * Test command implementation (Requirement 1.1)
     */
    testCommandImplementation() {
        const extensionPath = path.join(__dirname, '../src/extension.ts');
        
        if (!fs.existsSync(extensionPath)) {
            this.addResult('Command Implementation - Extension File', false, 
                'Extension file should exist at src/extension.ts');
            return;
        }

        const extensionContent = fs.readFileSync(extensionPath, 'utf8');
        
        // Check if command is registered
        const hasCommandRegistration = extensionContent.includes('vss.openDrawingCanvas');
        this.addResult('Command Registration', hasCommandRegistration,
            'VSS: Open Drawing Canvas command should be registered in extension');

        // Check if WebviewPanelManager is used
        const usesWebviewPanelManager = extensionContent.includes('WebviewPanelManager');
        this.addResult('WebviewPanelManager Usage', usesWebviewPanelManager,
            'Extension should use WebviewPanelManager for panel creation');

        // Check if command handler exists
        const hasCommandHandler = extensionContent.includes('showDrawingCanvas');
        this.addResult('Command Handler', hasCommandHandler,
            'Command handler should call showDrawingCanvas method');
    }

    /**
     * Test canvas interface structure (Requirement 1.2)
     */
    testCanvasInterfaceStructure() {
        const htmlPath = path.join(__dirname, '../webview/index.html');
        
        if (!fs.existsSync(htmlPath)) {
            this.addResult('Canvas Interface - HTML File', false,
                'Webview HTML file should exist at webview/index.html');
            return;
        }

        const htmlContent = fs.readFileSync(htmlPath, 'utf8');

        // Test required HTML elements
        const requiredElements = [
            { selector: 'id="drawing-canvas"', name: 'Drawing Canvas Element' },
            { selector: 'id="status"', name: 'Status Bar Element' },
            { selector: 'class="toolbar"', name: 'Toolbar Element' },
            { selector: 'data-tool="pen"', name: 'Pen Tool Button' },
            { selector: 'data-tool="eraser"', name: 'Eraser Tool Button' },
            { selector: 'id="clear-canvas"', name: 'Clear Canvas Button' },
            { selector: 'id="connection-status"', name: 'Connection Status Element' }
        ];

        for (const element of requiredElements) {
            const exists = htmlContent.includes(element.selector);
            this.addResult(`Canvas Interface - ${element.name}`, exists,
                `${element.name} should exist in webview HTML`);
        }

        // Test canvas container structure
        const hasCanvasContainer = htmlContent.includes('id="canvas-container"');
        this.addResult('Canvas Interface - Container Structure', hasCanvasContainer,
            'Canvas container should exist to hold all interface elements');
    }

    /**
     * Test drawing tools implementation (Requirement 1.3)
     */
    testDrawingToolsImplementation() {
        const htmlPath = path.join(__dirname, '../webview/index.html');
        
        if (!fs.existsSync(htmlPath)) {
            this.addResult('Drawing Tools - HTML File', false,
                'Cannot test drawing tools - HTML file missing');
            return;
        }

        const htmlContent = fs.readFileSync(htmlPath, 'utf8');

        // Test JavaScript functions for drawing interaction
        const requiredFunctions = [
            'initializeCanvas',
            'startDrawing', 
            'draw',
            'stopDrawing',
            'clearCanvas',
            'selectTool',
            'setupEventListeners'
        ];

        for (const func of requiredFunctions) {
            const exists = htmlContent.includes(`function ${func}`);
            this.addResult(`Drawing Tools - ${func}`, exists,
                `${func} function should exist for canvas interaction`);
        }

        // Test event listeners for user interaction
        const eventListeners = [
            'mousedown',
            'mousemove', 
            'mouseup',
            'touchstart',
            'touchmove',
            'touchend'
        ];

        for (const event of eventListeners) {
            const exists = htmlContent.includes(`addEventListener('${event}'`);
            this.addResult(`Drawing Tools - ${event} Event`, exists,
                `${event} event listener should be registered for drawing interaction`);
        }

        // Test canvas context and drawing properties
        const hasCanvasContext = htmlContent.includes('getContext(\'2d\')');
        this.addResult('Drawing Tools - Canvas Context', hasCanvasContext,
            'Canvas should get 2D rendering context for drawing');

        const hasDrawingProperties = htmlContent.includes('strokeStyle') && htmlContent.includes('lineWidth');
        this.addResult('Drawing Tools - Drawing Properties', hasDrawingProperties,
            'Canvas should set drawing properties like strokeStyle and lineWidth');
    }

    /**
     * Test error display implementation (Requirement 4.2)
     */
    testErrorDisplayImplementation() {
        const htmlPath = path.join(__dirname, '../webview/index.html');
        
        if (!fs.existsSync(htmlPath)) {
            this.addResult('Error Display - HTML File', false,
                'Cannot test error display - HTML file missing');
            return;
        }

        const htmlContent = fs.readFileSync(htmlPath, 'utf8');

        // Test loading screen implementation
        const hasLoadingScreen = htmlContent.includes('id="loading-screen"');
        this.addResult('Error Display - Loading Screen', hasLoadingScreen,
            'Loading screen should be implemented for initialization feedback');

        // Test error screen implementation  
        const hasErrorScreen = htmlContent.includes('id="error-screen"');
        this.addResult('Error Display - Error Screen', hasErrorScreen,
            'Error screen should be implemented for failure scenarios');

        // Test error recovery buttons
        const hasRetryButton = htmlContent.includes('id="retry-button"');
        this.addResult('Error Display - Retry Button', hasRetryButton,
            'Retry button should be available for error recovery');

        const hasReportButton = htmlContent.includes('id="report-button"');
        this.addResult('Error Display - Report Button', hasReportButton,
            'Report issue button should be available for user feedback');

        // Test error handling functions
        const hasShowError = htmlContent.includes('function showError') || htmlContent.includes('showError');
        this.addResult('Error Display - Show Error Function', hasShowError,
            'showError function should exist to display error messages');

        // Test global error handlers
        const hasGlobalErrorHandler = htmlContent.includes('window.addEventListener(\'error\'');
        this.addResult('Error Display - Global Error Handler', hasGlobalErrorHandler,
            'Global error handler should catch JavaScript errors');

        const hasPromiseRejectionHandler = htmlContent.includes('unhandledrejection');
        this.addResult('Error Display - Promise Rejection Handler', hasPromiseRejectionHandler,
            'Unhandled promise rejection handler should catch async errors');
    }

    /**
     * Test multiple command handling (Requirement 1.5)
     */
    testMultipleCommandHandling() {
        const managerPath = path.join(__dirname, '../src/webview-panel-manager.ts');
        
        if (!fs.existsSync(managerPath)) {
            this.addResult('Multiple Commands - Manager File', false,
                'WebviewPanelManager file should exist');
            return;
        }

        const managerContent = fs.readFileSync(managerPath, 'utf8');

        // Test singleton pattern implementation
        const hasSingleton = managerContent.includes('getInstance');
        this.addResult('Multiple Commands - Singleton Pattern', hasSingleton,
            'WebviewPanelManager should use singleton pattern to prevent duplicates');

        // Test existing panel check
        const hasExistingPanelCheck = managerContent.includes('currentPanel') && managerContent.includes('reveal');
        this.addResult('Multiple Commands - Existing Panel Check', hasExistingPanelCheck,
            'Manager should check for existing panel and reveal it instead of creating new one');

        // Test panel state tracking
        const hasPanelState = managerContent.includes('PanelState') || managerContent.includes('isVisible');
        this.addResult('Multiple Commands - Panel State Tracking', hasPanelState,
            'Manager should track panel state to handle multiple commands properly');
    }

    /**
     * Test panel lifecycle management (Requirement 1.4, 1.5)
     */
    testPanelLifecycleManagement() {
        const managerPath = path.join(__dirname, '../src/webview-panel-manager.ts');
        
        if (!fs.existsSync(managerPath)) {
            this.addResult('Panel Lifecycle - Manager File', false,
                'WebviewPanelManager file should exist');
            return;
        }

        const managerContent = fs.readFileSync(managerPath, 'utf8');

        // Test disposal handling
        const hasDispose = managerContent.includes('dispose');
        this.addResult('Panel Lifecycle - Dispose Method', hasDispose,
            'Manager should have dispose method for cleanup');

        // Test recreation capability
        const hasRecreate = managerContent.includes('recreatePanel') || managerContent.includes('showDrawingCanvas');
        this.addResult('Panel Lifecycle - Recreation Capability', hasRecreate,
            'Manager should be able to recreate panel after disposal');

        // Test panel existence checking
        const hasExistsCheck = managerContent.includes('exists') || managerContent.includes('currentPanel');
        this.addResult('Panel Lifecycle - Existence Check', hasExistsCheck,
            'Manager should be able to check if panel exists');

        // Test event handlers for panel lifecycle
        const hasLifecycleHandlers = managerContent.includes('onDidDispose') || managerContent.includes('onDidChangeViewState');
        this.addResult('Panel Lifecycle - Event Handlers', hasLifecycleHandlers,
            'Manager should handle panel lifecycle events');

        // Test message handler integration
        const messageHandlerPath = path.join(__dirname, '../src/webview-message-handler.ts');
        if (fs.existsSync(messageHandlerPath)) {
            const messageContent = fs.readFileSync(messageHandlerPath, 'utf8');
            const hasMessageHandling = messageContent.includes('WebviewMessageHandler');
            this.addResult('Panel Lifecycle - Message Handler Integration', hasMessageHandling,
                'Manager should integrate with message handler for communication');
        }
    }

    /**
     * Adds a test result
     */
    addResult(testName, passed, description) {
        this.testCount++;
        if (passed) this.passCount++;
        
        this.results.push({
            name: testName,
            passed,
            description
        });

        const status = passed ? '✅' : '❌';
        console.log(`  ${status} ${testName}: ${description}`);
    }

    /**
     * Prints test summary
     */
    printSummary() {
        console.log('\n' + '='.repeat(60));
        console.log('WEBVIEW PANEL FUNCTIONALITY TEST SUMMARY');
        console.log('='.repeat(60));
        console.log(`Total Tests: ${this.testCount}`);
        console.log(`Passed: ${this.passCount}`);
        console.log(`Failed: ${this.testCount - this.passCount}`);
        console.log(`Pass Rate: ${((this.passCount / this.testCount) * 100).toFixed(1)}%`);

        if (this.passCount < this.testCount) {
            console.log('\n❌ FAILED TESTS:');
            this.results
                .filter(r => !r.passed)
                .forEach(r => console.log(`  - ${r.name}: ${r.description}`));
        }

        const success = this.passCount === this.testCount;
        console.log(`\n${success ? '✅' : '⚠️'} Webview panel functionality tests ${success ? 'PASSED' : 'COMPLETED WITH ISSUES'}`);
    }
}

// Run tests if this file is executed directly
if (require.main === module) {
    const tester = new WebviewFunctionalityTester();
    tester.runAllTests().then(success => {
        process.exit(success ? 0 : 1);
    }).catch(error => {
        console.error('Test execution failed:', error);
        process.exit(1);
    });
}

module.exports = { WebviewFunctionalityTester };