# VSS Integration Tests

This directory contains comprehensive integration tests for the VSS (Visual Sketch Sync) extension, covering VS Code API usage, Chrome DevTools Protocol integration, and cross-platform compatibility.

## Test Structure

### Integration Tests (`integration/`)

- **`vscode-api.test.ts`** - Tests VS Code API integration including:
  - Extension lifecycle (activation, deactivation)
  - Webview communication and message passing
  - File system watcher integration
  - Command registration and execution
  - Configuration management
  - Task provider integration
  - Error handling and recovery

- **`chrome-devtools.test.ts`** - Tests Chrome DevTools Protocol integration including:
  - Debug session detection and management
  - DevTools Protocol command handling
  - DOM change detection and capture
  - Style modification detection
  - React DevTools integration
  - Redux DevTools integration
  - WebSocket communication for DevTools events
  - Error handling for DevTools disconnection

- **`cross-platform.test.ts`** - Tests cross-platform compatibility including:
  - Platform detection (desktop, web, Codespaces)
  - File system operations across platforms
  - Webview support in different environments
  - Input device handling (mouse, touch, stylus, tablets)
  - Network configuration for different platforms
  - Performance optimizations per platform
  - Environment variable handling

### Test Configuration

- **`test-config.ts`** - Common test utilities and configuration
- **`runTest.ts`** - Test runner configuration
- **`suite/index.ts`** - Mocha test suite configuration

## Running Tests

### Prerequisites

1. Install dependencies:
   ```bash
   npm install
   ```

2. Compile TypeScript:
   ```bash
   npm run compile
   ```

### Running All Integration Tests

```bash
npm run test
```

### Running Specific Test Suites

```bash
# Run only VS Code API tests
npm run test -- --grep "VS Code API"

# Run only Chrome DevTools tests
npm run test -- --grep "Chrome DevTools"

# Run only cross-platform tests
npm run test -- --grep "Cross-Platform"
```

### Running Tests in VS Code

1. Open the project in VS Code
2. Go to Run and Debug (Ctrl+Shift+D)
3. Select "Extension Tests" configuration
4. Press F5 to run tests

## Test Coverage

The integration tests cover the following requirements from the specification:

### Requirement 1.1 & 1.2 - VS Code Extension Foundation
- ✅ Extension activation and lifecycle
- ✅ Command registration and execution
- ✅ Webview creation and management
- ✅ Cross-platform compatibility detection

### Requirement 3.1 & 3.2 - Three-Way Sync Integration
- ✅ File system watcher setup and monitoring
- ✅ WebSocket communication for sync server
- ✅ VS Code API integrations (Debug, Task, Terminal APIs)
- ✅ Chrome DevTools Protocol integration

### Cross-Platform Testing
- ✅ Desktop VS Code (Windows, Mac, Linux)
- ✅ VS Code Web (browser-based)
- ✅ GitHub Codespaces compatibility
- ✅ Input device support (tablets, stylus)

## Test Environment Setup

### For Desktop Testing
- Requires VS Code desktop installation
- Tests file system operations, webview creation, debug sessions

### For Web/Codespaces Testing
- Tests run in VS Code web environment
- Limited file system access (as expected)
- WebSocket connections may require different configuration

### Mock Objects and Stubs

The tests use various mock objects to simulate:
- Chrome DevTools Protocol messages
- WebSocket connections
- File system events
- Debug sessions
- DOM and style changes

## Continuous Integration

These tests are designed to run in CI environments:

```yaml
# Example GitHub Actions workflow
- name: Run Integration Tests
  run: |
    npm ci
    npm run compile
    xvfb-run -a npm run test
```

## Troubleshooting

### Common Issues

1. **Extension not found**: Ensure the extension is properly compiled and the extension ID matches
2. **Workspace folder missing**: Tests require an open workspace folder
3. **Timeout errors**: Increase timeout values in test configuration for slower environments
4. **WebSocket connection failures**: Expected in test environment without running sync server

### Debug Mode

Run tests with debug output:
```bash
DEBUG=* npm run test
```

### Test Isolation

Each test suite properly cleans up resources:
- Disposes webview panels
- Closes WebSocket connections
- Removes temporary files
- Unregisters event listeners

## Contributing

When adding new integration tests:

1. Follow the existing test structure and naming conventions
2. Use the `TestHelper` utilities for common operations
3. Ensure proper cleanup in `teardown` methods
4. Add appropriate timeout values for async operations
5. Include both positive and negative test cases
6. Test error handling and edge cases

## Performance Considerations

- Tests are designed to run efficiently in CI environments
- File system operations use temporary files that are cleaned up
- WebSocket connections are mocked to avoid network dependencies
- Timeouts are configured appropriately for different platforms