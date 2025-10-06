# Visual Sketch Sync - Installation Guide

This guide provides detailed installation instructions for the Visual Sketch Sync VS Code extension, including troubleshooting for common issues like cyclic copy errors.

## System Requirements

Before installing, ensure your system meets these requirements:

### Minimum Requirements
- **VS Code**: Version 1.74.0 or higher
- **Node.js**: Version 16.x or higher
- **npm**: Version 8.0 or higher
- **Operating System**: Windows 10+, macOS 10.15+, or Linux (Ubuntu 18.04+)
- **Memory**: 4GB RAM minimum, 8GB recommended
- **Storage**: 500MB free space for extension and dependencies

### Optional Dependencies
- **vsce**: For VSIX packaging (`npm install -g @vscode/vsce`)
- **Git**: For cloning the repository
- **Chrome/Edge**: For live preview and DevTools integration
- **Wacom/Apple Pencil**: For pressure-sensitive drawing (optional)

### Compatibility Notes
- **Windows**: Requires PowerShell 5.0+ or Command Prompt
- **macOS**: Requires Xcode Command Line Tools
- **Linux**: Requires build-essential package

## Quick Start (Recommended)

For most users, we recommend **Method 1** (Development Mode) as it's the safest and doesn't require complex installation steps.

## Installation Methods

### Method 1: Development Mode (Safest) ⭐

This method runs the extension in VS Code's Extension Development Host, which is perfect for testing and development.

```bash
# 1. Clone and build
git clone https://github.com/JODonogh/Visual-Sketch-Sync.git
cd Visual-Sketch-Sync
npm install
npm run compile

# 2. Open in VS Code and run
# - Open this folder in VS Code
# - Press F5 (or Run > Start Debugging)
# - A new "Extension Development Host" window opens
# - Use the extension in that window
```

**Pros:**
- ✅ No installation conflicts
- ✅ Easy to update and test changes
- ✅ No cyclic copy issues
- ✅ Built-in debugging support

**Cons:**
- ❌ Only works in Extension Development Host window
- ❌ Need to keep source folder

### Method 2: VSIX Package Installation (Recommended for Production)

This method creates a proper extension package that can be installed like any VS Code extension.

```bash
# 1. Build and package
git clone https://github.com/JODonogh/Visual-Sketch-Sync.git
cd Visual-Sketch-Sync
npm install
npm run compile
npm run package

# 2. Install the package
code --install-extension visual-sketch-sync-0.1.0.vsix

# 3. Restart VS Code
```

**Pros:**
- ✅ Works in all VS Code windows
- ✅ Proper extension installation
- ✅ Can be shared with others
- ✅ No cyclic copy issues

**Cons:**
- ❌ Need to rebuild package for updates
- ❌ Requires vsce tool

### Method 3: Manual Installation (Advanced Users Only)

⚠️ **Warning:** This method can cause cyclic copy issues if not done correctly. Only use if you understand the risks.

```bash
# 1. Validate your setup first
git clone https://github.com/JODonogh/Visual-Sketch-Sync.git
cd Visual-Sketch-Sync
npm install
npm run compile

# Run validation to check for potential issues
npm run validate-install

# 2. Manual copy with exclusions
# Windows (using robocopy for better path handling):
mkdir "%USERPROFILE%\.vscode\extensions\visual-sketch-sync-0.1.0"
robocopy "." "%USERPROFILE%\.vscode\extensions\visual-sketch-sync-0.1.0" /E /XD node_modules .git out\test coverage .nyc_output .vscode-test .vss-backups .vss-recovery-backups test-output tutorials examples docs generated-components marketplace .kiro /XF *.log *.tmp .DS_Store Thumbs.db *.vsix package-lock.json

# macOS/Linux (using rsync with exclusions):
mkdir -p ~/.vscode/extensions/visual-sketch-sync-0.1.0
rsync -av --exclude-from=scripts/copy-exclude.txt . ~/.vscode/extensions/visual-sketch-sync-0.1.0

# 3. Restart VS Code
```

## Validation and Troubleshooting

### Pre-Installation Validation

Always run the validation script before manual installation:

```bash
npm run validate-install
```

This script will:
- ✅ Check for cyclic reference issues
- ✅ Validate package.json structure
- ✅ Check for existing installations
- ✅ Verify build artifacts
- ✅ Generate safe installation commands

### Common Issues and Solutions

#### 1. "Command not found" errors

**Symptoms:**
- "VSS: Open Drawing Canvas" doesn't appear in Command Palette
- Extension seems installed but commands don't work

**Solutions:**
```bash
# Check if extension is properly compiled
npm run compile

# For Method 1: Make sure you're in Extension Development Host window
# For Method 2: Restart VS Code after installation
# For Method 3: Check installation directory and restart VS Code
```

#### 2. Cyclic copy errors

**Symptoms:**
- "Cannot copy directory into itself"
- "Cyclic copy operation detected"
- Installation hangs or fails

**Root Causes:**
- Running copy command from inside VS Code extensions directory
- Including `node_modules/` or `.git/` in copy operation
- Not using exclusion files

**Solutions:**
```bash
# 1. Clean up any partial installation
rm -rf ~/.vscode/extensions/visual-sketch-sync-0.1.0  # macOS/Linux
rmdir /s "%USERPROFILE%\.vscode\extensions\visual-sketch-sync-0.1.0"  # Windows

# 2. Use Method 1 or Method 2 instead of manual installation

# 3. If you must use manual installation, always use exclusion files:
npm run validate-install  # This creates the exclusion file
# Then follow Method 3 instructions exactly
```

#### 3. Build errors

**Symptoms:**
- TypeScript compilation errors
- Missing dependencies
- "Cannot find module" errors

**Solutions:**
```bash
# Clean rebuild
rm -rf node_modules out
npm install
npm run compile

# Check Node.js version (requires 16+)
node --version

# Check for TypeScript issues
npx tsc --noEmit
```

#### 4. Extension not loading

**Symptoms:**
- Extension appears in extensions list but doesn't work
- No commands in Command Palette
- Console errors about activation

**Solutions:**
```bash
# Check VS Code Developer Console (Help > Toggle Developer Tools)
# Look for activation errors

# Verify package.json main entry point exists
ls -la out/extension.js  # Should exist after npm run compile

# Try reloading VS Code window
# Ctrl+Shift+P > "Developer: Reload Window"
```

#### 5. Webview not displaying

**Symptoms:**
- Commands work but drawing canvas doesn't appear
- Webview shows blank or error page
- "Cannot load webview content" errors

**Solutions:**
```bash
# Check webview files exist
ls -la webview/index.html
ls -la webview/*.js

# Verify webview security settings
# Check VS Code settings for webview restrictions

# Try opening in different panel
# View > Explorer > VSS Drawing Canvas
```

#### 6. Performance issues

**Symptoms:**
- Slow drawing response
- High CPU usage
- Extension becomes unresponsive

**Solutions:**
```bash
# Check system resources
# Task Manager (Windows) or Activity Monitor (macOS)

# Reduce canvas size in settings
# File > Preferences > Settings > Extensions > Visual Sketch Sync

# Close other resource-intensive extensions
# Disable unnecessary VS Code extensions temporarily
```

#### 7. Permission errors

**Symptoms:**
- "Permission denied" during installation
- Cannot write to extensions directory
- File access errors

**Solutions:**
```bash
# Windows: Run VS Code as Administrator (temporarily)
# macOS/Linux: Check directory permissions
chmod 755 ~/.vscode/extensions

# Use VSIX installation method instead of manual copy
npm run package
code --install-extension visual-sketch-sync-0.1.0.vsix
```

## Installation Verification

After installation, verify the extension works properly:

### Step 1: Check Extension Installation
1. **Open Extensions view** (`Ctrl+Shift+X` / `Cmd+Shift+X`)
2. **Search for "Visual Sketch Sync"**
3. **Verify it appears** in installed extensions with version 0.1.0
4. **Check status** - should show "Enabled" (not "Disabled" or "Install")

### Step 2: Verify Commands Registration
1. **Open Command Palette** (`Ctrl+Shift+P` / `Cmd+Shift+P`)
2. **Type "VSS"** to filter commands
3. **Verify these commands appear:**
   - ✅ "VSS: Open Drawing Canvas"
   - ✅ "VSS: Start Sync Server" 
   - ✅ "VSS: Stop Sync Server"
   - ✅ "VSS: Run System Diagnostics"
   - ✅ "VSS: Export Design"
   - ✅ "VSS: Start Live Server Integration"
   - ✅ "VSS: Debug Chrome for VSS"

### Step 3: Test Core Functionality
1. **Run system diagnostics:**
   ```
   Ctrl+Shift+P > "VSS: Run System Diagnostics"
   ```
   - Should show system status and configuration
   - Look for any error messages in output

2. **Test drawing canvas:**
   ```
   Ctrl+Shift+P > "VSS: Open Drawing Canvas"
   ```
   - Canvas webview should open in sidebar or panel
   - Should display drawing area with basic tools
   - Try drawing a simple shape to test functionality

3. **Check webview integration:**
   - Canvas should respond to mouse/touch input
   - Status should show "Canvas Ready" or similar
   - No error messages in VS Code Developer Console

### Step 4: Validate File Structure
For development installations, verify these files exist:
```bash
# Check compiled extension
ls -la out/extension.js          # Main extension file
ls -la webview/index.html        # Webview HTML
ls -la package.json              # Extension manifest

# Check dependencies
npm list --depth=0               # Verify all dependencies installed
```

### Step 5: Test Error Handling
1. **Open VS Code Developer Console** (`Help > Toggle Developer Tools`)
2. **Run a VSS command** and check for errors
3. **Look for these indicators:**
   - ✅ No red error messages
   - ✅ Extension activation successful
   - ✅ Commands execute without throwing exceptions

### Verification Checklist
- [ ] Extension appears in Extensions list
- [ ] All VSS commands visible in Command Palette  
- [ ] "VSS: Run System Diagnostics" executes successfully
- [ ] "VSS: Open Drawing Canvas" opens webview
- [ ] Canvas responds to input (mouse/touch)
- [ ] No errors in Developer Console
- [ ] Extension version shows 0.1.0

## Uninstallation

### Method 1 (Development Mode)
- Simply close the Extension Development Host window
- No files to clean up

### Method 2 (VSIX Installation)
```bash
code --uninstall-extension kiro.visual-sketch-sync
```

### Method 3 (Manual Installation)
```bash
# Remove extension directory
rm -rf ~/.vscode/extensions/visual-sketch-sync-0.1.0  # macOS/Linux
rmdir /s "%USERPROFILE%\.vscode\extensions\visual-sketch-sync-0.1.0"  # Windows

# Restart VS Code
```

## Getting Help

If you encounter issues not covered here:

1. **Run diagnostics:**
   ```bash
   npm run validate-install
   npm run diagnostics
   ```

2. **Check the logs:**
   - VS Code Developer Console: `Help > Toggle Developer Tools`
   - Extension logs: Look for VSS-related errors

3. **Try a clean installation:**
   - Uninstall completely
   - Use Method 1 (Development Mode) for testing
   - If that works, try Method 2 (VSIX)

4. **Report issues:**
   - Include output from `npm run validate-install`
   - Include VS Code version and OS
   - Include any error messages from Developer Console

## Advanced Configuration

### Custom Installation Paths

For enterprise or custom setups:

```bash
# Custom extensions directory
code --extensions-dir /custom/path/extensions --install-extension visual-sketch-sync-0.1.0.vsix

# Portable VS Code
./VSCode-portable/code --install-extension visual-sketch-sync-0.1.0.vsix
```

### Development Setup

For contributors and advanced users:

```bash
# Development with hot reload
npm run watch  # Keeps TypeScript compiler running

# Run tests
npm run test

# Package for distribution
npm run package

# Lint and format
npm run lint
```

This installation guide should help you get Visual Sketch Sync running smoothly. Choose the method that best fits your needs and technical comfort level.