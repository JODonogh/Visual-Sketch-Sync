# Visual Sketch Sync Extension

Visual Sketch Sync - A VS Code extension that provides three-way synchronization between a drawing canvas, VS Code editor, and live Chrome application.

## Features

- **Pressure-sensitive drawing canvas** with support for Wacom tablets and Apple Pencil
- **Professional drawing tools** including brushes, pens, and shape tools
- **Three-way synchronization** between canvas, code, and live application
- **Cross-platform support** for desktop, iPad, and GitHub Codespaces
- **Real-time code generation** from visual designs
- **CRAP design principle helpers** and alignment guides

## Requirements

- VS Code 1.74.0 or higher
- Node.js for sync server functionality
- Chrome browser for live application sync

## Documentation

- **[Installation Guide](INSTALLATION.md)** - Detailed installation instructions and troubleshooting
- **[Quick Start Guide](docs/QUICK-START.md)** - Get up and running in 5 minutes
- **[User Guide](docs/USER-GUIDE.md)** - Complete feature documentation and workflows

## Installation

> **Note:** This extension is not yet published to the VS Code Marketplace. Use one of the methods below to install it locally.

For detailed installation instructions, see the **[Installation Guide](INSTALLATION.md)**.

### Method 1: Quick Development Testing (Recommended)

1. **Clone and build the extension:**

   ```bash
   git clone https://github.com/JODonogh/Visual-Sketch-Sync.git
   cd Visual-Sketch-Sync
   npm install
   npm run compile
   ```

2. **Run the extension:**

   - Open this project folder in VS Code
   - Press `F5` (or go to Run and Debug → "Run Extension")
   - A new "Extension Development Host" window will open with the extension loaded

3. **Start using the extension:**
   - In the Extension Development Host window, open any project folder
   - Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
   - Type "VSS: Open Drawing Canvas" and press Enter

### Method 2: Install as Local Extension

1. **Install the VS Code Extension CLI:**

   ```bash
   npm install -g @vscode/vsce
   ```

2. **Build and package the extension:**

   ```bash
   git clone https://github.com/JODonogh/Visual-Sketch-Sync.git
   cd Visual-Sketch-Sync
   npm install
   npm run compile
   vsce package
   ```

3. **Install the generated .vsix file:**

   ```bash
   code --install-extension visual-sketch-sync-0.1.0.vsix
   ```

   > **Note:** Run this command in your terminal, not in VS Code's integrated terminal

4. **Restart VS Code and use the extension:**
   - Open any project folder in VS Code
   - Press `Ctrl+Shift+P` and run "VSS: Open Drawing Canvas"

### Method 3: Manual Installation (Advanced)

> **⚠️ Warning:** This method can cause cyclic copy issues if not done correctly. Use the validation script first.

1. **Validate your setup:**

   ```bash
   git clone https://github.com/JODonogh/Visual-Sketch-Sync.git
   cd Visual-Sketch-Sync
   npm install
   npm run compile
   
   # Run validation script to check for issues
   node scripts/installation-validator.js
   ```

2. **Copy to VS Code extensions folder (safe method):**

   ```bash
   # Windows (using robocopy to avoid cyclic copies)
   mkdir "%USERPROFILE%\.vscode\extensions\visual-sketch-sync-0.1.0"
   robocopy "." "%USERPROFILE%\.vscode\extensions\visual-sketch-sync-0.1.0" /E /XD node_modules .git out\test coverage .nyc_output .vscode-test .vss-backups .vss-recovery-backups test-output tutorials examples docs generated-components marketplace .kiro /XF *.log *.tmp .DS_Store Thumbs.db *.vsix package-lock.json

   # macOS/Linux (using rsync with exclusions)
   mkdir -p ~/.vscode/extensions/visual-sketch-sync-0.1.0
   rsync -av --exclude-from=scripts/copy-exclude.txt . ~/.vscode/extensions/visual-sketch-sync-0.1.0
   ```

3. **Restart VS Code**

   > **Note:** The exclusion file prevents copying `node_modules/`, `.git/`, and other directories that can cause installation issues.

## Usage

For complete usage instructions, see the **[User Guide](docs/USER-GUIDE.md)**.

### Quick Start

1. **Install the extension** using one of the methods above
2. **Open Command Palette** (`Ctrl+Shift+P` / `Cmd+Shift+P`)
3. **Run "VSS: Open Drawing Canvas"** to open the drawing interface
4. **Start drawing** on the canvas to create your designs

For a step-by-step walkthrough, see the **[Quick Start Guide](docs/QUICK-START.md)**.

## Configuration

The extension can be configured through VS Code settings:

- `vss.canvas.width`: Default canvas width (default: 1920)
- `vss.canvas.height`: Default canvas height (default: 1080)
- `vss.tablet.pressureSensitivity`: Enable pressure sensitivity (default: true)
- `vss.sync.autoStart`: Auto-start sync server (default: true)
- `vss.sync.port`: Sync server WebSocket port (default: 3001)

## Troubleshooting

### Extension not appearing in Command Palette

1. Make sure the extension compiled successfully (`npm run compile`)
2. If using Method 1, ensure the Extension Development Host window is active
3. If using Method 2, restart VS Code after installation
4. Check the VS Code Developer Console (`Help > Toggle Developer Tools`) for errors

### Build errors

1. Ensure you have Node.js installed (version 16 or higher recommended)
2. Delete `node_modules` and `out` folders, then run:
   ```bash
   npm install
   npm run compile
   ```

### Extension commands not working

1. Check that you're in the correct VS Code window (Extension Development Host for Method 1)
2. Ensure you have a folder/workspace open in VS Code
3. Try reloading the window (`Ctrl+Shift+P` → "Developer: Reload Window")

### Cyclic copy errors during manual installation

If you encounter "cyclic copy" or "directory already exists" errors:

1. **Run the validation script first:**
   ```bash
   node scripts/installation-validator.js
   ```

2. **Common causes:**
   - Trying to copy from inside the VS Code extensions directory
   - Including `node_modules/` or `.git/` in the copy
   - Not using the exclusion file

3. **Solution:**
   - Use Method 1 (F5 Development) or Method 2 (VSIX) instead
   - If using manual installation, always use the exclusion file
   - Never run the copy command from inside `~/.vscode/extensions/`

4. **Clean up failed installation:**
   ```bash
   # Remove partial installation
   rm -rf ~/.vscode/extensions/visual-sketch-sync-0.1.0  # macOS/Linux
   rmdir /s "%USERPROFILE%\.vscode\extensions\visual-sketch-sync-0.1.0"  # Windows
   ```

## Development

This extension is built with TypeScript and uses the VS Code Extension API.

### Development

#### Building

```bash
npm install          # Install dependencies
npm run compile      # Compile TypeScript to JavaScript
npm run watch        # Watch for changes and auto-compile
```

#### Testing

```bash
npm run test                # Run all tests
npm run test:unit          # Run unit tests only
npm run test:integration   # Run integration tests
```

#### Debugging

- Press `F5` to launch Extension Development Host
- Set breakpoints in TypeScript source files
- Use VS Code's built-in debugger

## License

MIT License - see LICENSE file for details.
