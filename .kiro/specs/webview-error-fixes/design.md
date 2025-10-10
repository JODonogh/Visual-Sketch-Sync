# Design Document

## Overview

This design addresses critical webview errors in the VSS Drawing Canvas extension by implementing proper VS Code API management, Content Security Policy compliance, and resource loading strategies. The solution focuses on fixing initialization conflicts, security policy violations, and meta element parsing errors.

## Architecture

### Component Structure
```
WebviewErrorFixes
├── API Management
│   ├── VSCodeAPIManager (centralized API access)
│   ├── APIConflictResolver (prevents multiple acquisitions)
│   └── ScriptLoadingCoordinator (manages load order)
├── Security Compliance
│   ├── CSPManager (handles Content Security Policy)
│   ├── ResourceURIBuilder (creates proper vscode-resource URIs)
│   └── StylesheetLoader (CSP-compliant CSS loading)
├── HTML Structure
│   ├── MetaElementValidator (fixes parsing errors)
│   ├── HTMLStructureOptimizer (proper document structure)
│   └── ResourceReferenceManager (manages external references)
└── Error Recovery
    ├── InitializationRecovery (handles startup failures)
    ├── CSPViolationHandler (alternative loading strategies)
    └── DiagnosticLogger (detailed error reporting)
```

## Components and Interfaces

### 1. VS Code API Manager

**Purpose:** Centralize VS Code API access and prevent conflicts

**Interface:**
```javascript
class VSCodeAPIManager {
    static getInstance() // Singleton pattern
    getAPI() // Returns VS Code API instance
    isAPIAvailable() // Checks if API is ready
    onAPIReady(callback) // Registers callback for API availability
}
```

**Design Decisions:**
- Use singleton pattern to ensure single API acquisition
- Implement lazy loading with ready state checking
- Provide callback mechanism for API-dependent code
- Add error handling for API acquisition failures

### 2. CSP Manager

**Purpose:** Handle Content Security Policy compliance for resources

**Interface:**
```javascript
class CSPManager {
    buildResourceURI(relativePath) // Creates vscode-resource URI
    loadStylesheet(path) // Loads CSS with proper CSP compliance
    validateCSPDirectives() // Checks CSP meta tag syntax
    fixMetaElements() // Corrects meta element formatting
}
```

**Design Decisions:**
- Use vscode-resource scheme for all external resources
- Implement dynamic stylesheet loading to avoid CSP violations
- Fix meta element syntax by replacing semicolons with commas
- Add CSP directive validation and correction

### 3. Script Loading Coordinator

**Purpose:** Manage script loading order and dependencies

**Interface:**
```javascript
class ScriptLoadingCoordinator {
    loadScript(src, dependencies = []) // Loads script with dependency check
    registerDependency(name, checkFunction) // Registers dependency checker
    onAllScriptsLoaded(callback) // Callback when all scripts ready
    handleLoadingError(script, error) // Error recovery for failed loads
}
```

**Design Decisions:**
- Implement dependency-aware script loading
- Use Promise-based loading with proper error handling
- Add retry mechanisms for failed script loads
- Provide loading progress feedback

### 4. Resource URI Builder

**Purpose:** Create proper vscode-resource URIs for webview resources

**Interface:**
```javascript
class ResourceURIBuilder {
    static buildURI(extensionPath, relativePath) // Creates vscode-resource URI
    static validateURI(uri) // Validates URI format
    static encodePathSegments(path) // Properly encodes path components
}
```

**Design Decisions:**
- Use VS Code's webview.asWebviewUri() method when available
- Implement fallback URI construction for edge cases
- Add proper path encoding and validation
- Support both file and directory references

## Data Models

### API State Model
```javascript
{
    isAcquired: boolean,
    apiInstance: object | null,
    readyCallbacks: Function[],
    errorState: string | null,
    acquisitionAttempts: number
}
```

### Resource Loading State
```javascript
{
    loadedStylesheets: Set<string>,
    loadedScripts: Set<string>,
    failedResources: Map<string, Error>,
    cspViolations: Array<{resource: string, violation: string}>,
    loadingProgress: {total: number, loaded: number}
}
```

### Error Recovery State
```javascript
{
    recoveryAttempts: number,
    lastError: Error | null,
    recoveryStrategies: Array<{name: string, attempted: boolean, success: boolean}>,
    fallbackMode: boolean
}
```

## Error Handling

### VS Code API Conflict Resolution
- Detect existing API acquisition before attempting new acquisition
- Implement API sharing mechanism for multiple script dependencies
- Add graceful degradation when API is unavailable
- Provide clear error messages for API-related failures

### CSP Violation Recovery
- Implement alternative resource loading strategies
- Use inline styles as fallback for blocked external stylesheets
- Add dynamic style injection for critical CSS
- Provide user notification for persistent CSP issues

### Meta Element Parsing Fixes
- Automatically detect and fix semicolon separators in CSP directives
- Validate all meta elements during initialization
- Implement proper CSP directive formatting
- Add meta element syntax validation

### Script Loading Error Recovery
- Implement retry logic with exponential backoff
- Provide fallback implementations for critical scripts
- Add dependency resolution for missing scripts
- Log detailed loading failure information

## Testing Strategy

### Unit Tests
- Test VS Code API manager singleton behavior
- Verify CSP directive parsing and correction
- Test resource URI building with various paths
- Validate script loading coordination logic

### Integration Tests
- Test complete webview initialization sequence
- Verify CSP compliance with actual VS Code webview
- Test error recovery mechanisms end-to-end
- Validate resource loading under various conditions

### Error Simulation Tests
- Simulate VS Code API acquisition conflicts
- Test CSP violation scenarios and recovery
- Simulate script loading failures and recovery
- Test meta element parsing error conditions

## Implementation Approach

### Phase 1: API Conflict Resolution
1. Implement VSCodeAPIManager singleton
2. Add API conflict detection and prevention
3. Update all scripts to use centralized API access
4. Test API sharing across multiple scripts

### Phase 2: CSP Compliance
1. Fix meta element syntax in HTML
2. Implement proper vscode-resource URI usage
3. Add dynamic stylesheet loading mechanism
4. Test CSS loading without CSP violations

### Phase 3: Resource Loading Management
1. Implement ScriptLoadingCoordinator
2. Add dependency management for script loading
3. Create ResourceURIBuilder utility
4. Test proper loading order and error handling

### Phase 4: Error Recovery
1. Add comprehensive error logging
2. Implement recovery mechanisms for common failures
3. Create fallback strategies for critical functionality
4. Test error recovery under various failure conditions

### Phase 5: Validation and Testing
1. Validate all fixes with actual VS Code webview
2. Test error scenarios and recovery mechanisms
3. Verify CSP compliance and resource loading
4. Document troubleshooting procedures

This design provides a comprehensive solution for all identified webview errors while maintaining compatibility with VS Code's security model and providing robust error recovery mechanisms.