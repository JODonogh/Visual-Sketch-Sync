# VDS Design Canvas Extension

Visual Design Sync - A VS Code extension that provides three-way synchronization between a drawing canvas, VS Code editor, and live Chrome application.

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

## Installation

1. Install the extension from the VS Code Marketplace
2. Open a project folder in VS Code
3. Run the command "VDS: Open Drawing Canvas" to get started

## Usage

### Opening the Drawing Canvas

1. Open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
2. Run "VDS: Open Drawing Canvas"
3. The drawing canvas will open in a new panel

### Starting the Sync Server

1. Run "VDS: Start Sync Server" from the Command Palette
2. The sync server will start and enable three-way synchronization
3. Open your application in Chrome to see live updates

## Configuration

The extension can be configured through VS Code settings:

- `vds.canvas.width`: Default canvas width (default: 1920)
- `vds.canvas.height`: Default canvas height (default: 1080)
- `vds.tablet.pressureSensitivity`: Enable pressure sensitivity (default: true)
- `vds.sync.autoStart`: Auto-start sync server (default: true)
- `vds.sync.port`: Sync server WebSocket port (default: 3001)

## Development

This extension is built with TypeScript and uses the VS Code Extension API.

### Building

```bash
npm install
npm run compile
```

### Testing

```bash
npm run test
```

## License

MIT License - see LICENSE file for details.