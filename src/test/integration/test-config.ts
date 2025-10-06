/**
 * Test Configuration for Integration Tests
 * Provides common test utilities and configuration
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export interface TestConfig {
    timeout: number;
    retries: number;
    workspace: vscode.WorkspaceFolder;
    extensionId: string;
}

export class TestHelper {
    static async getTestConfig(): Promise<TestConfig> {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            throw new Error('No workspace folder available for testing');
        }

        return {
            timeout: 10000,
            retries: 3,
            workspace: workspaceFolders[0],
            extensionId: 'kiro.vds-design-canvas'
        };
    }

    static async ensureExtensionActive(extensionId: string): Promise<vscode.Extension<any>> {
        const extension = vscode.extensions.getExtension(extensionId);
        if (!extension) {
            throw new Error(`Extension ${extensionId} not found`);
        }

        if (!extension.isActive) {
            await extension.activate();
        }

        return extension;
    }

    static createTestFile(workspace: vscode.WorkspaceFolder, relativePath: string, content: string): string {
        const fullPath = path.join(workspace.uri.fsPath, relativePath);
        const dir = path.dirname(fullPath);
        
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        
        fs.writeFileSync(fullPath, content);
        return fullPath;
    }

    static cleanupTestFile(filePath: string): void {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    }

    static async waitForCondition(
        condition: () => boolean | Promise<boolean>,
        timeout: number = 5000,
        interval: number = 100
    ): Promise<void> {
        const startTime = Date.now();
        
        while (Date.now() - startTime < timeout) {
            const result = await condition();
            if (result) {
                return;
            }
            await new Promise(resolve => setTimeout(resolve, interval));
        }
        
        throw new Error(`Condition not met within ${timeout}ms`);
    }

    static mockWebSocketMessage(type: string, payload: any): string {
        return JSON.stringify({
            type,
            payload,
            timestamp: Date.now()
        });
    }

    static validateWebSocketMessage(message: string): { type: string; payload: any; timestamp: number } {
        try {
            const parsed = JSON.parse(message);
            if (!parsed.type || !parsed.timestamp) {
                throw new Error('Invalid message format');
            }
            return parsed;
        } catch (error) {
            throw new Error(`Failed to parse WebSocket message: ${error}`);
        }
    }
}

export const TEST_CONSTANTS = {
    SYNC_SERVER_PORT: 3001,
    WEBVIEW_TIMEOUT: 5000,
    FILE_WATCHER_DELAY: 200,
    CHROME_DEBUG_PORT: 9222,
    TEST_WORKSPACE_NAME: 'vds-test-workspace'
};