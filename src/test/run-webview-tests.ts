import * as path from 'path';
import Mocha from 'mocha';
import * as glob from 'glob';

/**
 * Test runner for webview panel functionality tests
 * Executes tests for Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 4.2, 4.4
 */
export function runWebviewTests(): Promise<void> {
    return new Promise((resolve, reject) => {
        // Create the mocha test runner
        const mocha = new Mocha({
            ui: 'tdd',
            color: true,
            timeout: 10000, // 10 second timeout for tests
            reporter: 'spec'
        });

        const testsRoot = path.resolve(__dirname);

        // Add test files
        const testFiles = [
            'webview-panel.test.js',
            'webview-error-handling.test.js'
        ];

        console.log('Starting webview panel functionality tests...');
        console.log('Test files to execute:', testFiles);

        // Add each test file to mocha
        testFiles.forEach(file => {
            const testPath = path.resolve(testsRoot, file);
            try {
                mocha.addFile(testPath);
                console.log(`Added test file: ${testPath}`);
            } catch (error) {
                console.warn(`Could not add test file ${testPath}:`, error);
            }
        });

        try {
            // Run the tests
            mocha.run((failures: number) => {
                if (failures > 0) {
                    console.error(`${failures} test(s) failed`);
                    reject(new Error(`${failures} test(s) failed`));
                } else {
                    console.log('All webview tests passed!');
                    resolve();
                }
            });
        } catch (err) {
            console.error('Error running tests:', err);
            reject(err);
        }
    });
}

/**
 * Manual test execution function for development
 */
export async function runManualWebviewTests(): Promise<void> {
    console.log('='.repeat(60));
    console.log('WEBVIEW PANEL FUNCTIONALITY TESTS');
    console.log('='.repeat(60));
    
    try {
        await runWebviewTests();
        console.log('\n✅ All webview panel tests completed successfully!');
    } catch (error) {
        console.error('\n❌ Webview panel tests failed:', error);
        throw error;
    }
}

// If this file is run directly, execute the tests
if (require.main === module) {
    runManualWebviewTests().catch(error => {
        console.error('Test execution failed:', error);
        process.exit(1);
    });
}