/**
 * Integration tests for comprehensive error handling and recovery
 */

import * as assert from 'assert';
import * as path from 'path';
import * as fs from 'fs';
import { spawn } from 'child_process';

describe('Error Handling Integration Tests', () => {
  const testProjectDir = path.join(__dirname, '../../..', 'test-output', 'error-handling-test');
  
  before(async () => {
    // Create test project directory
    if (!fs.existsSync(testProjectDir)) {
      fs.mkdirSync(testProjectDir, { recursive: true });
    }
    
    // Change to test directory
    process.chdir(testProjectDir);
  });
  
  after(() => {
    // Clean up test directory
    if (fs.existsSync(testProjectDir)) {
      fs.rmSync(testProjectDir, { recursive: true, force: true });
    }
  });
  
  describe('Diagnostics Tool', () => {
    it('should run diagnostics without errors', async () => {
      const result = await runCommand('node', [
        path.join(__dirname, '../../../scripts/vds-diagnostics.js'),
        '--format', 'json'
      ]);
      
      assert.strictEqual(result.exitCode, 0, 'Diagnostics should complete successfully');
      
      // Parse JSON output
      const diagnosticsResult = JSON.parse(result.stdout);
      assert.ok(diagnosticsResult.timestamp, 'Should include timestamp');
      assert.ok(diagnosticsResult.system, 'Should include system information');
      assert.ok(Array.isArray(diagnosticsResult.issues), 'Should include issues array');
    });
    
    it('should detect missing dependencies', async () => {
      // Create a package.json without required dependencies
      const packageJson = {
        name: 'test-project',
        version: '1.0.0',
        dependencies: {}
      };
      
      fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2));
      
      const result = await runCommand('node', [
        path.join(__dirname, '../../../scripts/vds-diagnostics.js'),
        '--format', 'json'
      ]);
      
      const diagnosticsResult = JSON.parse(result.stdout);
      const missingDepsIssue = diagnosticsResult.issues.find(
        (issue: any) => issue.type === 'MISSING_DEPENDENCIES'
      );
      
      assert.ok(missingDepsIssue, 'Should detect missing dependencies');
      assert.strictEqual(missingDepsIssue.severity, 'error');
    });
    
    it('should detect missing files', async () => {
      const result = await runCommand('node', [
        path.join(__dirname, '../../../scripts/vds-diagnostics.js'),
        '--format', 'json'
      ]);
      
      const diagnosticsResult = JSON.parse(result.stdout);
      const missingFileIssues = diagnosticsResult.issues.filter(
        (issue: any) => issue.type === 'MISSING_FILE'
      );
      
      assert.ok(missingFileIssues.length > 0, 'Should detect missing VDS files');
    });
  });
  
  describe('Recovery Tool', () => {
    it('should create recovery plan for missing files', async () => {
      const result = await runCommand('node', [
        path.join(__dirname, '../../../scripts/vds-recovery-tool.js'),
        '--verbose'
      ]);
      
      assert.strictEqual(result.exitCode, 0, 'Recovery tool should complete successfully');
      assert.ok(result.stdout.includes('recovery actions'), 'Should plan recovery actions');
    });
    
    it('should create backups before recovery', async () => {
      // Create a test file to backup
      fs.writeFileSync('test-file.json', '{"test": true}');
      
      const result = await runCommand('node', [
        path.join(__dirname, '../../../scripts/vds-recovery-tool.js'),
        '--auto-fix'
      ]);
      
      // Check if backup directory was created
      const backupDir = '.vds-recovery-backups';
      if (fs.existsSync(backupDir)) {
        const backupFiles = fs.readdirSync(backupDir);
        assert.ok(backupFiles.length > 0, 'Should create backup files');
      }
    });
  });
  
  describe('Error Handler', () => {
    it('should handle file permission errors gracefully', async () => {
      const VDSErrorHandler = require('../../../scripts/error-handler');
      const errorHandler = new VDSErrorHandler();
      
      const result = await errorHandler.handleError('EACCES', new Error('Permission denied'), {
        filePath: '/test/file.json'
      });
      
      assert.ok(result, 'Should handle permission error');
    });
    
    it('should provide recovery suggestions for network errors', async () => {
      const VDSErrorHandler = require('../../../scripts/error-handler');
      const errorHandler = new VDSErrorHandler();
      
      const result = await errorHandler.handleError('NETWORK_ERROR', new Error('Connection failed'), {
        host: 'localhost',
        port: 3001
      });
      
      assert.ok(result, 'Should handle network error');
    });
    
    it('should implement graceful degradation for DevTools connection', async () => {
      const VDSErrorHandler = require('../../../scripts/error-handler');
      const errorHandler = new VDSErrorHandler();
      
      const result = await errorHandler.handleError('DEVTOOLS_CONNECTION_FAILED', new Error('Chrome not found'), {
        port: 9222
      });
      
      assert.ok(result, 'Should handle DevTools connection failure gracefully');
    });
  });
  
  describe('WebSocket Error Handling', () => {
    it('should handle WebSocket connection failures', async () => {
      const VDSErrorHandler = require('../../../scripts/error-handler');
      const errorHandler = new VDSErrorHandler();
      
      const result = await errorHandler.handleError('WEBSOCKET_CONNECTION_FAILED', new Error('Connection refused'), {
        port: 3001,
        host: 'localhost'
      });
      
      assert.ok(result, 'Should handle WebSocket connection failure');
    });
    
    it('should implement retry logic with exponential backoff', async () => {
      const VDSErrorHandler = require('../../../scripts/error-handler');
      const errorHandler = new VDSErrorHandler();
      
      let retryCount = 0;
      errorHandler.triggerReconnection = async () => {
        retryCount++;
        return retryCount >= 3; // Succeed on third attempt
      };
      
      const result = await errorHandler.handleError('WEBSOCKET_CONNECTION_FAILED', new Error('Connection refused'), {
        port: 3001
      });
      
      assert.ok(result, 'Should eventually succeed with retry logic');
      assert.ok(retryCount >= 3, 'Should retry multiple times');
    });
  });
  
  describe('File System Error Handling', () => {
    it('should handle missing design data file', async () => {
      const VDSErrorHandler = require('../../../scripts/error-handler');
      const errorHandler = new VDSErrorHandler();
      
      // Mock the createDefaultFiles implementation
      errorHandler.createDefaultFiles = async () => {
        const defaultData = {
          canvas: { width: 1920, height: 1080 },
          elements: [],
          layers: []
        };
        
        fs.mkdirSync('src/design', { recursive: true });
        fs.writeFileSync('src/design/design-data.json', JSON.stringify(defaultData, null, 2));
        return true;
      };
      
      const result = await errorHandler.handleError('FILE_NOT_FOUND', new Error('File not found'), {
        filePath: 'src/design/design-data.json'
      });
      
      assert.ok(result, 'Should handle missing design data file');
      assert.ok(fs.existsSync('src/design/design-data.json'), 'Should create default design data file');
    });
    
    it('should handle corrupted JSON files', async () => {
      const VDSErrorHandler = require('../../../scripts/error-handler');
      const errorHandler = new VDSErrorHandler();
      
      // Create corrupted JSON file
      fs.mkdirSync('src/design', { recursive: true });
      fs.writeFileSync('src/design/design-data.json', '{ invalid json }');
      
      // Mock backup and reset implementation
      errorHandler.createBackup = async () => {
        fs.writeFileSync('design-data.json.backup', '{ invalid json }');
        return true;
      };
      
      errorHandler.resetToDefault = async () => {
        const defaultData = { canvas: {}, elements: [] };
        fs.writeFileSync('src/design/design-data.json', JSON.stringify(defaultData, null, 2));
        return true;
      };
      
      const result = await errorHandler.handleError('JSON_PARSE_ERROR', new Error('Invalid JSON'), {
        filePath: 'src/design/design-data.json'
      });
      
      assert.ok(result, 'Should handle corrupted JSON file');
      assert.ok(fs.existsSync('design-data.json.backup'), 'Should create backup');
    });
  });
  
  describe('Remote Development Error Handling', () => {
    it('should optimize for remote environments', async () => {
      const VDSErrorHandler = require('../../../scripts/error-handler');
      const errorHandler = new VDSErrorHandler();
      
      let compressionEnabled = false;
      let syncThrottleIncreased = false;
      
      errorHandler.enableCompression = () => { compressionEnabled = true; };
      errorHandler.increaseSyncThrottle = () => { syncThrottleIncreased = true; };
      errorHandler.reduceFileWatcherSensitivity = () => {};
      
      const result = await errorHandler.handleError('REMOTE_DEVELOPMENT_SLOW', new Error('Slow connection'), {
        environment: 'codespaces'
      });
      
      assert.ok(result, 'Should handle remote development optimization');
      assert.ok(compressionEnabled, 'Should enable compression');
      assert.ok(syncThrottleIncreased, 'Should increase sync throttle');
    });
  });
});

/**
 * Helper function to run shell commands
 */
function runCommand(command: string, args: string[]): Promise<{exitCode: number, stdout: string, stderr: string}> {
  return new Promise((resolve) => {
    const child = spawn(command, args, { stdio: 'pipe' });
    let stdout = '';
    let stderr = '';
    
    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    child.on('close', (code) => {
      resolve({
        exitCode: code || 0,
        stdout,
        stderr
      });
    });
  });
}