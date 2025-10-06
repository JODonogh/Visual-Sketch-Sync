/**
 * Command to run integration tests from VS Code
 */

import * as vscode from 'vscode';
import { runIntegrationTests } from './integration-test-runner';

export function registerTestCommand(context: vscode.ExtensionContext): void {
    const testCommand = vscode.commands.registerCommand('vds.runIntegrationTests', async () => {
        const outputChannel = vscode.window.createOutputChannel('VDS Integration Tests');
        outputChannel.show();
        
        // Redirect console.log to output channel
        const originalLog = console.log;
        console.log = (message: string) => {
            outputChannel.appendLine(message);
            originalLog(message);
        };
        
        try {
            outputChannel.appendLine('Starting VDS Integration Tests...');
            await runIntegrationTests();
            outputChannel.appendLine('Integration tests completed.');
        } catch (error) {
            outputChannel.appendLine(`Integration tests failed: ${error}`);
        } finally {
            // Restore original console.log
            console.log = originalLog;
        }
    });
    
    context.subscriptions.push(testCommand);
}