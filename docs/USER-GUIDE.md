# Visual Sketch Sync - User Guide

Welcome to Visual Sketch Sync! This guide will help you get started with the extension and understand its core features.

## Overview

Visual Sketch Sync (VSS) is a VS Code extension that provides a drawing canvas for creating visual designs and prototypes directly within your development environment. The extension enables seamless integration between visual design and code development.

## Getting Started

### Opening the Drawing Canvas

1. **Open Command Palette** (`Ctrl+Shift+P` / `Cmd+Shift+P`)
2. **Type "VSS"** to filter available commands
3. **Select "VSS: Open Drawing Canvas"**
4. The drawing canvas will open in the VS Code sidebar or panel

![Opening Drawing Canvas](screenshots/open-canvas.png)
*The drawing canvas opens as a webview panel in VS Code*

### First Steps

Once the canvas is open, you'll see:
- **Drawing area**: Main canvas for creating designs
- **Status indicator**: Shows canvas connection status
- **Basic drawing tools**: Mouse/touch drawing capabilities

## Core Features

### 1. Drawing Canvas

The drawing canvas provides a digital workspace for creating visual designs:

**Basic Drawing:**
- **Mouse drawing**: Click and drag to draw freehand lines
- **Touch support**: Works with touchscreens and tablets
- **Pressure sensitivity**: Supports Wacom tablets and Apple Pencil (when available)

**Canvas Controls:**
- **Clear canvas**: Right-click for context menu options
- **Zoom**: Use mouse wheel or pinch gestures
- **Pan**: Hold space and drag to move around the canvas

### 2. Available Commands

Access these commands through the Command Palette (`Ctrl+Shift+P`):

#### Core Commands
- **"VSS: Open Drawing Canvas"** - Opens the main drawing interface
- **"VSS: Run System Diagnostics"** - Checks extension health and configuration
- **"VSS: Export Design"** - Exports your drawings (when implemented)

#### Sync Commands  
- **"VSS: Start Sync Server"** - Starts the synchronization server
- **"VSS: Stop Sync Server"** - Stops the synchronization server
- **"VSS: Start Live Server Integration"** - Connects with Live Server extension

#### Development Commands
- **"VSS: Debug Chrome for VSS"** - Sets up Chrome debugging integration
- **"VSS: Capture DOM Tree from Chrome"** - Captures page structure
- **"VSS: Capture Stylesheets from Chrome"** - Extracts CSS from live pages

#### Utility Commands
- **"VSS: Clear Canvas History"** - Clears drawing history
- **"VSS: Export Error Logs"** - Exports diagnostic information
- **"VSS: Run Recovery Tool"** - Fixes common issues automatically

### 3. System Diagnostics

The diagnostics command helps you verify everything is working correctly:

1. **Run diagnostics**: `Ctrl+Shift+P` > "VSS: Run System Diagnostics"
2. **Check output**: View results in VS Code output panel
3. **Review status**: Look for any warnings or errors
4. **Follow recommendations**: Address any issues found

## Basic Workflows

### Workflow 1: Simple Drawing

1. **Open canvas**: Use "VSS: Open Drawing Canvas" command
2. **Start drawing**: Click and drag on the canvas
3. **Create shapes**: Draw rectangles, circles, or freehand designs
4. **Save work**: Your drawings are automatically saved to the workspace

### Workflow 2: Design Validation

1. **Create design**: Draw your interface mockup
2. **Run diagnostics**: Check system status with diagnostics command
3. **Export design**: Use export command to save your work
4. **Integrate with code**: Use sync features to connect with your codebase

### Workflow 3: Live Development

1. **Start sync server**: Use "VSS: Start Sync Server" command
2. **Open live server**: Use "VSS: Start Live Server Integration"
3. **Draw and code**: Make changes in both canvas and code editor
4. **See updates**: Changes sync between drawing and live application

## Settings and Configuration

### Extension Settings

Access VSS settings through VS Code preferences:

1. **Open Settings**: `File > Preferences > Settings` (or `Ctrl+,`)
2. **Search for "VSS"**: Filter to Visual Sketch Sync settings
3. **Configure options**:

#### Canvas Settings
- **Canvas Width**: Default canvas width (default: 1920px)
- **Canvas Height**: Default canvas height (default: 1080px)
- **Pressure Sensitivity**: Enable tablet/stylus pressure (default: true)

#### Sync Settings
- **Auto Start Sync**: Automatically start sync server (default: true)
- **Sync Port**: WebSocket port for sync server (default: 3001)
- **Auto Start Live Server**: Start Live Server automatically (default: false)

#### Chrome Integration
- **Debug Port**: Chrome remote debugging port (default: 9222)

### Workspace Configuration

VSS can be configured per workspace by creating a `.vscode/settings.json` file:

```json
{
  "vss.canvas.width": 1440,
  "vss.canvas.height": 900,
  "vss.tablet.pressureSensitivity": true,
  "vss.sync.autoStart": true,
  "vss.sync.port": 3001
}
```

## Tips and Best Practices

### Drawing Tips
- **Use consistent strokes**: Maintain steady hand movements for cleaner lines
- **Plan your layout**: Sketch rough layouts before detailed drawing
- **Use layers conceptually**: Group related elements together
- **Save frequently**: Use export commands to backup your work

### Performance Tips
- **Close unused panels**: Keep only necessary VS Code panels open
- **Reduce canvas size**: Use smaller canvas dimensions for better performance
- **Clear history**: Regularly clear canvas history to free memory
- **Monitor resources**: Check system resources if drawing becomes slow

### Integration Tips
- **Start simple**: Begin with basic drawings before complex designs
- **Use diagnostics**: Regularly run system diagnostics to catch issues early
- **Keep sync server running**: Leave sync server active for real-time updates
- **Coordinate with team**: Share settings and configurations across team members

## Keyboard Shortcuts

While VSS doesn't define custom shortcuts, you can use these VS Code shortcuts:

- **Open Command Palette**: `Ctrl+Shift+P` / `Cmd+Shift+P`
- **Toggle Sidebar**: `Ctrl+B` / `Cmd+B`
- **Toggle Panel**: `Ctrl+J` / `Cmd+J`
- **Focus on Editor**: `Ctrl+1` / `Cmd+1`
- **Developer Tools**: `F12` (for debugging webview issues)

## Troubleshooting Common Issues

### Canvas Not Appearing
**Problem**: Drawing canvas doesn't open when running the command
**Solutions**:
1. Check that extension is properly installed and enabled
2. Try reloading VS Code window (`Ctrl+Shift+P` > "Developer: Reload Window")
3. Check VS Code Developer Console for errors (`Help > Toggle Developer Tools`)

### Drawing Not Responsive
**Problem**: Canvas doesn't respond to mouse or touch input
**Solutions**:
1. Click directly on the canvas area to focus it
2. Check if other extensions are interfering
3. Try reducing canvas size in settings
4. Restart VS Code if issue persists

### Commands Not Found
**Problem**: VSS commands don't appear in Command Palette
**Solutions**:
1. Verify extension is installed and activated
2. Check extension status in Extensions view (`Ctrl+Shift+X`)
3. Run installation validation: `npm run validate-install`
4. Try reinstalling the extension

### Sync Server Issues
**Problem**: Sync server won't start or connect
**Solutions**:
1. Check if port 3001 is available (or configured port)
2. Run diagnostics to check server status
3. Try different port in settings
4. Check firewall settings

### Performance Problems
**Problem**: Extension runs slowly or uses too much memory
**Solutions**:
1. Reduce canvas dimensions in settings
2. Clear canvas history regularly
3. Close unnecessary VS Code panels and extensions
4. Check system resources and available memory

## Getting Help

### Built-in Help
- **System Diagnostics**: `Ctrl+Shift+P` > "VSS: Run System Diagnostics"
- **Error Logs**: `Ctrl+Shift+P` > "VSS: Export Error Logs"
- **Recovery Tool**: `Ctrl+Shift+P` > "VSS: Run Recovery Tool"

### Documentation
- **Installation Guide**: See `INSTALLATION.md` for setup help
- **Developer Console**: `Help > Toggle Developer Tools` for technical details
- **Extension Logs**: Check VS Code output panel for VSS messages

### Community Support
- **GitHub Issues**: Report bugs and request features
- **VS Code Marketplace**: Rate and review the extension
- **Documentation**: Check project documentation for detailed guides

## What's Next?

### Upcoming Features
- **Advanced drawing tools**: Shapes, text, and styling options
- **Component generation**: Convert drawings to React components
- **Design tokens**: Generate CSS variables from designs
- **Real-time collaboration**: Share canvases with team members

### Learning More
- **Explore examples**: Check the `examples/` directory for sample projects
- **Read documentation**: Browse `docs/` for detailed guides
- **Try tutorials**: Follow step-by-step tutorials for common workflows
- **Join community**: Connect with other users and contributors

---

**Happy designing!** Visual Sketch Sync bridges the gap between design and development, making it easier to create beautiful, functional interfaces directly in your development environment.