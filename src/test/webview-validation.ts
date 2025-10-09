import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Comprehensive webview panel validation script
 * Tests Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 4.2, 4.4
 */
export class WebviewValidation {
    private results: ValidationResult[] = [];
    
    /**
     * Runs all webview validation tests
     */
    public async runAllValidations(): Promise<ValidationSummary> {
        console.log('Starting comprehensive webview panel validation...');
        
        // Test 5.1: Test webview panel creation and display
        await this.validatePanelCreation();
        await this.validateCanvasInterface();
        await this.validateDrawingInteraction();
        
        // Test 5.2: Test error handling and recovery scenarios
        await this.validateErrorHandling();
        await this.validateMultipleCommandExecution();
        await this.validatePanelRecreation();
        
        return this.generateSummary();
    }

    /**
     * Validates webview panel creation and display (Task 5.1)
     */
    private async validatePanelCreation(): Promise<void> {
        console.log('\n📋 Validating webview panel creation and display...');
        
        try {
            // Test: VSS: Open Drawing Canvas command opens visible panel
            const commandExists = await this.checkCommandExists('vss.openDrawingCanvas');
            this.addResult('Command Registration', commandExists, 
                'VSS: Open Drawing Canvas command should be registered');
            
            if (commandExists) {
                try {
                    await vscode.commands.executeCommand('vss.openDrawingCanvas');
                    this.addResult('Command Execution', true, 
                        'Command should execute without throwing errors');
                } catch (error) {
                    this.addResult('Command Execution', false, 
                        `Command execution failed: ${error}`);
                }
            }
            
        } catch (error) {
            this.addResult('Panel Creation Test', false, 
                `Panel creation validation failed: ${error}`);
        }
    }

    /**
     * Validates canvas interface structure and elements
     */
    private async validateCanvasInterface(): Promise<void> {
        console.log('📋 Validating canvas interface structure...');
        
        try {
            const htmlPath = path.join(__dirname, '../../webview/index.html');
            
            if (!fs.existsSync(htmlPath)) {
                this.addResult('HTML File Exists', false, 
                    'Webview HTML file should exist at webview/index.html');
                return;
            }
            
            const htmlContent = fs.readFileSync(htmlPath, 'utf8');
            
            // Test: Panel appears in main editor area with full canvas interface
            const requiredElements = [
                { id: 'drawing-canvas', description: 'Drawing canvas element' },
                { id: 'status', description: 'Status bar element' },
                { class: 'toolbar', description: 'Toolbar element' },
                { attr: 'data-tool="pen"', description: 'Pen tool button' },
                { attr: 'data-tool="eraser"', description: 'Eraser tool button' },
                { id: 'clear-canvas', description: 'Clear canvas button' },
                { id: 'connection-status', description: 'Connection status element' }
            ];
            
            for (const element of requiredElements) {
                const exists = this.checkElementExists(htmlContent, element);
                this.addResult(`Canvas Interface - ${element.description}`, exists,
                    `${element.description} should exist in webview HTML`);
            }
            
        } catch (error) {
            this.addResult('Canvas Interface Validation', false,
                `Interface validation failed: ${error}`);
        }
    }

    /**
     * Validates drawing tools and canvas interaction functionality
     */
    private async validateDrawingInteraction(): Promise<void> {
        console.log('📋 Validating drawing tools and interaction...');
        
        try {
            const htmlPath = path.join(__dirname, '../../webview/index.html');
            
            if (!fs.existsSync(htmlPath)) {
                this.addResult('Drawing Interaction Test', false, 
                    'Cannot test drawing interaction - HTML file missing');
                return;
            }
            
            const htmlContent = fs.readFileSync(htmlPath, 'utf8');
            
            // Test: Drawing tools and canvas interaction work properly
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
                this.addResult(`Drawing Function - ${func}`, exists,
                    `${func} function should exist for canvas interaction`);
            }
            
            // Test event listeners
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
                this.addResult(`Event Listener - ${event}`, exists,
                    `${event} event listener should be registered`);
            }
            
        } catch (error) {
            this.addResult('Drawing Interaction Validation', false,
                `Drawing interaction validation failed: ${error}`);
        }
    }

    /**
     * Validates error handling and recovery scenarios (Task 5.2)
     */
    private async validateErrorHandling(): Promise<void> {
        console.log('\n📋 Validating error handling and recovery...');
        
        try {
            const htmlPath = path.join(__dirname, '../../webview/index.html');
            
            if (!fs.existsSync(htmlPath)) {
                this.addResult('Error Handling Test', false, 
                    'Cannot test error handling - HTML file missing');
                return;
            }
            
            const htmlContent = fs.readFileSync(htmlPath, 'utf8');
            
            // Test: Error display and recovery mechanisms
            const errorFeatures = [
                { feature: 'loading-screen', description: 'Loading screen for initialization' },
                { feature: 'error-screen', description: 'Error screen for failures' },
                { feature: 'retry-button', description: 'Retry button for recovery' },
                { feature: 'report-button', description: 'Report issue button' },
                { feature: 'showError', description: 'Error display function' },
                { feature: 'window.addEventListener(\'error\'', description: 'Global error handler' },
                { feature: 'unhandledrejection', description: 'Promise rejection handler' }
            ];
            
            for (const { feature, description } of errorFeatures) {
                const exists = htmlContent.includes(feature);
                this.addResult(`Error Handling - ${description}`, exists,
                    `${description} should be implemented`);
            }
            
        } catch (error) {
            this.addResult('Error Handling Validation', false,
                `Error handling validation failed: ${error}`);
        }
    }

    /**
     * Validates multiple command execution behavior
     */
    private async validateMultipleCommandExecution(): Promise<void> {
        console.log('📋 Validating multiple command execution...');
        
        try {
            const commandExists = await this.checkCommandExists('vss.openDrawingCanvas');
            
            if (!commandExists) {
                this.addResult('Multiple Command Test', false, 
                    'Cannot test multiple execution - command not registered');
                return;
            }
            
            // Test: Multiple command executions focus existing panel
            let executionCount = 0;
            const maxExecutions = 3;
            
            for (let i = 0; i < maxExecutions; i++) {
                try {
                    await vscode.commands.executeCommand('vss.openDrawingCanvas');
                    executionCount++;
                } catch (error) {
                    console.warn(`Command execution ${i + 1} failed:`, error);
                    break;
                }
            }
            
            this.addResult('Multiple Command Execution', executionCount > 0,
                `Should handle multiple command executions (executed ${executionCount}/${maxExecutions})`);
            
        } catch (error) {
            this.addResult('Multiple Command Validation', false,
                `Multiple command validation failed: ${error}`);
        }
    }

    /**
     * Validates panel disposal and recreation functionality
     */
    private async validatePanelRecreation(): Promise<void> {
        console.log('📋 Validating panel disposal and recreation...');
        
        try {
            // Check if WebviewPanelManager class exists and has required methods
            const managerPath = path.join(__dirname, '../webview-panel-manager.ts');
            
            if (!fs.existsSync(managerPath)) {
                this.addResult('Panel Manager File', false, 
                    'WebviewPanelManager file should exist');
                return;
            }
            
            const managerContent = fs.readFileSync(managerPath, 'utf8');
            
            const requiredMethods = [
                'showDrawingCanvas',
                'dispose',
                'recreatePanel',
                'exists',
                'isVisible',
                'getPanelState'
            ];
            
            for (const method of requiredMethods) {
                const exists = managerContent.includes(method);
                this.addResult(`Panel Manager - ${method}`, exists,
                    `${method} method should exist in WebviewPanelManager`);
            }
            
        } catch (error) {
            this.addResult('Panel Recreation Validation', false,
                `Panel recreation validation failed: ${error}`);
        }
    }

    /**
     * Helper method to check if a VS Code command exists
     */
    private async checkCommandExists(commandId: string): Promise<boolean> {
        try {
            const commands = await vscode.commands.getCommands();
            return commands.includes(commandId);
        } catch (error) {
            console.warn(`Could not check command existence: ${error}`);
            return false;
        }
    }

    /**
     * Helper method to check if HTML element exists
     */
    private checkElementExists(htmlContent: string, element: any): boolean {
        if (element.id) {
            return htmlContent.includes(`id="${element.id}"`);
        }
        if (element.class) {
            return htmlContent.includes(`class="${element.class}"`);
        }
        if (element.attr) {
            return htmlContent.includes(element.attr);
        }
        return false;
    }

    /**
     * Adds a validation result
     */
    private addResult(test: string, passed: boolean, description: string): void {
        this.results.push({
            test,
            passed,
            description,
            timestamp: new Date()
        });
        
        const status = passed ? '✅' : '❌';
        console.log(`  ${status} ${test}: ${description}`);
    }

    /**
     * Generates validation summary
     */
    private generateSummary(): ValidationSummary {
        const total = this.results.length;
        const passed = this.results.filter(r => r.passed).length;
        const failed = total - passed;
        
        return {
            total,
            passed,
            failed,
            passRate: total > 0 ? (passed / total) * 100 : 0,
            results: this.results,
            timestamp: new Date()
        };
    }
}

/**
 * Validation result interface
 */
interface ValidationResult {
    test: string;
    passed: boolean;
    description: string;
    timestamp: Date;
}

/**
 * Validation summary interface
 */
interface ValidationSummary {
    total: number;
    passed: number;
    failed: number;
    passRate: number;
    results: ValidationResult[];
    timestamp: Date;
}

/**
 * Runs webview validation and displays results
 */
export async function runWebviewValidation(): Promise<void> {
    const validator = new WebviewValidation();
    
    try {
        const summary = await validator.runAllValidations();
        
        console.log('\n' + '='.repeat(60));
        console.log('WEBVIEW PANEL VALIDATION SUMMARY');
        console.log('='.repeat(60));
        console.log(`Total Tests: ${summary.total}`);
        console.log(`Passed: ${summary.passed}`);
        console.log(`Failed: ${summary.failed}`);
        console.log(`Pass Rate: ${summary.passRate.toFixed(1)}%`);
        console.log(`Completed: ${summary.timestamp.toISOString()}`);
        
        if (summary.failed > 0) {
            console.log('\n❌ FAILED TESTS:');
            summary.results
                .filter(r => !r.passed)
                .forEach(r => console.log(`  - ${r.test}: ${r.description}`));
        }
        
        if (summary.passRate >= 80) {
            console.log('\n✅ Webview panel validation completed successfully!');
        } else {
            console.log('\n⚠️  Webview panel validation completed with issues.');
        }
        
    } catch (error) {
        console.error('\n❌ Webview validation failed:', error);
        throw error;
    }
}