# Visual Sketch Sync - Quick Start Guide

Get up and running with Visual Sketch Sync in just a few minutes!

## 5-Minute Quick Start

### Step 1: Verify Installation (30 seconds)

1. **Open VS Code**
2. **Open Command Palette**: `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (macOS)
3. **Type "VSS"** - you should see Visual Sketch Sync commands
4. **Look for**: "VSS: Open Drawing Canvas" in the list

✅ **Success**: Commands appear → Extension is installed correctly  
❌ **Problem**: No commands → See [Installation Guide](../INSTALLATION.md)

### Step 2: Open Drawing Canvas (30 seconds)

1. **Run command**: `Ctrl+Shift+P` > "VSS: Open Drawing Canvas"
2. **Canvas opens**: Look for drawing area in VS Code sidebar or panel
3. **Check status**: Should show "Canvas Ready" or similar message

✅ **Success**: Canvas appears with drawing area  
❌ **Problem**: Canvas doesn't open → Try reloading VS Code window

### Step 3: Test Basic Drawing (1 minute)

1. **Click on canvas**: Make sure it's focused
2. **Draw something**: Click and drag to create lines
3. **Try different areas**: Draw shapes, lines, or freehand designs
4. **Check responsiveness**: Drawing should appear immediately

✅ **Success**: You can draw on the canvas  
❌ **Problem**: No drawing response → Check troubleshooting below

### Step 4: Run System Check (1 minute)

1. **Open Command Palette**: `Ctrl+Shift+P`
2. **Run diagnostics**: "VSS: Run System Diagnostics"
3. **Check output**: Look at VS Code output panel for results
4. **Review status**: Should show system health information

✅ **Success**: Diagnostics show no critical errors  
❌ **Problem**: Errors reported → Follow diagnostic recommendations

### Step 5: Explore Commands (2 minutes)

Try these essential commands:

1. **"VSS: Start Sync Server"** - Starts background sync service
2. **"VSS: Export Design"** - Saves your drawings
3. **"VSS: Clear Canvas History"** - Clears drawing history
4. **"VSS: Run Recovery Tool"** - Fixes common issues

## Your First Drawing Project

### Create a Simple Button Design

1. **Open canvas**: `Ctrl+Shift+P` > "VSS: Open Drawing Canvas"

2. **Draw button shape**:
   - Draw a rectangle for the button background
   - Add text area inside for button label
   - Draw border or shadow effects

3. **Add details**:
   - Draw different button states (hover, active)
   - Add icons or decorative elements
   - Create variations (primary, secondary)

4. **Save your work**:
   - Use `Ctrl+Shift+P` > "VSS: Export Design"
   - Your drawing is automatically saved to workspace

### Next Steps

- **Explore settings**: `File > Preferences > Settings` > search "VSS"
- **Try sync features**: Start sync server and live server integration
- **Read full guide**: Check [User Guide](./USER-GUIDE.md) for detailed features

## Common Quick Start Issues

### Issue: Commands Not Found
**Symptoms**: VSS commands don't appear in Command Palette
**Quick Fix**:
```bash
# Check extension status
Ctrl+Shift+X > Search "Visual Sketch Sync"
# Should show "Enabled" status

# If not installed, see INSTALLATION.md
```

### Issue: Canvas Won't Open
**Symptoms**: Command runs but no canvas appears
**Quick Fix**:
```bash
# Reload VS Code window
Ctrl+Shift+P > "Developer: Reload Window"

# Check for errors
Help > Toggle Developer Tools > Console tab
```

### Issue: Drawing Not Working
**Symptoms**: Canvas opens but drawing doesn't respond
**Quick Fix**:
```bash
# Click directly on canvas to focus it
# Try different mouse buttons
# Check if touchscreen/tablet drivers are working
```

### Issue: Performance Problems
**Symptoms**: Slow response or high CPU usage
**Quick Fix**:
```bash
# Reduce canvas size
File > Preferences > Settings > Extensions > Visual Sketch Sync
# Set smaller width/height values

# Close other extensions temporarily
```

## Quick Reference

### Essential Commands
| Command | Purpose |
|---------|---------|
| `VSS: Open Drawing Canvas` | Opens main drawing interface |
| `VSS: Run System Diagnostics` | Checks system health |
| `VSS: Start Sync Server` | Enables sync features |
| `VSS: Export Design` | Saves drawings |

### Keyboard Shortcuts
| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+P` | Open Command Palette |
| `Ctrl+B` | Toggle Sidebar |
| `Ctrl+J` | Toggle Panel |
| `F12` | Developer Tools (for debugging) |

### Settings Locations
- **Global Settings**: `File > Preferences > Settings`
- **Workspace Settings**: `.vscode/settings.json`
- **Extension Settings**: Search "VSS" in settings

## What's Working Now

✅ **Currently Available**:
- Drawing canvas with basic mouse/touch input
- Command registration and execution
- System diagnostics and health checks
- Basic webview integration
- Settings and configuration
- Error handling and recovery tools

🚧 **In Development**:
- Advanced drawing tools (shapes, text, colors)
- Real-time sync with code editor
- Component generation from drawings
- Chrome DevTools integration
- Design token generation

## Need Help?

### Quick Help
1. **Run diagnostics**: `Ctrl+Shift+P` > "VSS: Run System Diagnostics"
2. **Check logs**: `Help > Toggle Developer Tools` > Console
3. **Try recovery**: `Ctrl+Shift+P` > "VSS: Run Recovery Tool"

### Documentation
- **[Installation Guide](../INSTALLATION.md)** - Detailed setup instructions
- **[User Guide](./USER-GUIDE.md)** - Complete feature documentation
- **[Troubleshooting](../INSTALLATION.md#troubleshooting)** - Common issues and solutions

### Support
- **GitHub Issues**: Report bugs and request features
- **VS Code Marketplace**: Extension page and reviews
- **Developer Console**: Technical debugging information

---

**Congratulations!** You're now ready to start creating visual designs with Visual Sketch Sync. Explore the full [User Guide](./USER-GUIDE.md) to learn about advanced features and workflows.