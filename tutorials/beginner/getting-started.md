# Getting Started with Visual Sketch Sync

Welcome to VSS! This tutorial will guide you through setting up your first project and understanding the core three-way synchronization workflow.

## What You'll Learn

- How to set up a VSS project from scratch
- Understanding the three-way sync between canvas, code, and browser
- Creating your first visual component
- Basic drawing tools and their generated code output

## Prerequisites

- VS Code installed
- Node.js 16+ installed
- VSS extension installed from VS Code Marketplace

## Step 1: Create Your First VSS Project

### 1.1 Initialize Project

Open VS Code and create a new folder for your project:

```bash
mkdir my-first-vss-project
cd my-first-vss-project
```

### 1.2 Set Up VSS

Open the Command Palette (`Cmd/Ctrl + Shift + P`) and run:

```
VSS: Initialize Project
```

This will:
- Create `package.json` with VSS dependencies
- Set up the `scripts/` directory with sync server
- Create initial project structure
- Install required npm packages

### 1.3 Start the Sync Server

Run the development command:

```bash
npm run start
```

This starts both your development server and the VSS sync server.

## Step 2: Open the Drawing Canvas

### 2.1 Activate VSS Extension

In VS Code, open the Command Palette and run:

```
VSS: Open Drawing Canvas
```

A new panel will open showing the drawing canvas interface.

### 2.2 Understand the Interface

The drawing canvas includes:

- **Toolbar**: Drawing tools (brush, shapes, text, selection)
- **Color Palette**: Color picker and swatch management
- **Layers Panel**: Layer management and visibility controls
- **Properties Panel**: Selected element properties and styling

### 2.3 Canvas Settings

Set up your canvas:
- **Size**: 800×600px (good for desktop components)
- **Grid**: Enable 8px grid for consistent spacing
- **Background**: White (#ffffff)

## Step 3: Draw Your First Component

### 3.1 Create a Simple Button

1. **Select Rectangle Tool**: Click the rectangle icon in the toolbar
2. **Draw Button Shape**: 
   - Click and drag to create a rectangle
   - Size: approximately 120×40px
   - Position: near the top-left of canvas

3. **Style the Button**:
   - **Fill Color**: Click color picker, choose blue (#007bff)
   - **Border**: Add 1px border in darker blue (#0056b3)
   - **Border Radius**: Set to 8px for rounded corners

### 3.2 Add Button Text

1. **Select Text Tool**: Click the 'T' icon in toolbar
2. **Add Text**: Click inside the button rectangle
3. **Type**: "Click me"
4. **Style Text**:
   - **Color**: White (#ffffff)
   - **Font Size**: 16px
   - **Font Weight**: 500 (medium)
   - **Alignment**: Center

### 3.3 Watch Code Generation

As you draw, watch these files appear in your project:

**`src/styles/components.css`**:
```css
.button-primary {
  width: 120px;
  height: 40px;
  background-color: #007bff;
  border: 1px solid #0056b3;
  border-radius: 8px;
  color: white;
  font-size: 16px;
  font-weight: 500;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s ease;
}

.button-primary:hover {
  background-color: #0056b3;
  transform: translateY(-1px);
}
```

**`src/components/Button.jsx`**:
```jsx
import React from 'react';
import '../styles/components.css';

export const Button = ({ children = 'Click me', onClick, ...props }) => {
  return (
    <button className="button-primary" onClick={onClick} {...props}>
      {children}
    </button>
  );
};
```

## Step 4: Test Three-Way Sync

Now let's test the three-way synchronization between canvas, code, and browser.

### 4.1 Canvas → Code Sync

1. **Modify in Canvas**: Change button color to green (#28a745)
2. **Watch Code Update**: See CSS file update automatically
3. **Check Browser**: Live preview updates with new color

### 4.2 Code → Canvas Sync

1. **Edit CSS File**: Open `src/styles/components.css`
2. **Change Color**: Modify `background-color` to red (#dc3545)
3. **Watch Canvas**: See button color update in drawing canvas
4. **Check Browser**: Live preview reflects the change

### 4.3 Browser → Code Sync

1. **Open DevTools**: Right-click button in browser, select "Inspect"
2. **Modify Style**: In Elements panel, change background-color
3. **Watch Updates**: See changes sync to VS Code and canvas

## Step 5: Understanding the Workflow

### The Three Sync Points

1. **Drawing Canvas** (Visual Design)
   - Professional drawing tools
   - Real-time visual feedback
   - Pressure-sensitive input support

2. **VS Code Editor** (Source Code)
   - Generated CSS and React components
   - Manual code editing and refinement
   - Version control integration

3. **Live Browser** (Running Application)
   - Real-time preview of changes
   - DevTools integration
   - User interaction testing

### Sync Flow Diagram

```
Drawing Canvas ←→ VS Code Editor ←→ Live Browser
      ↑                                    ↓
      └────────── WebSocket Sync ──────────┘
```

### When to Use Each Environment

**Use Drawing Canvas for**:
- Initial component design
- Visual exploration and iteration
- Color palette creation
- Layout and spacing decisions

**Use VS Code Editor for**:
- Adding component logic and props
- Refining generated CSS
- Adding animations and interactions
- Code review and version control

**Use Live Browser for**:
- Testing user interactions
- Responsive design testing
- Performance optimization
- Accessibility validation

## Step 6: Next Steps

Congratulations! You've created your first VSS component with three-way sync.

### Immediate Next Steps

1. **Try Different Shapes**: Create circles, lines, and complex paths
2. **Experiment with Colors**: Build a color palette and design tokens
3. **Add More Components**: Create cards, forms, and navigation elements

### Recommended Tutorials

- **[Basic Shape Drawing](./basic-shapes.md)** - Master all drawing tools
- **[Color Management](./colors.md)** - Advanced color workflows
- **[Component Creation](../intermediate/components.md)** - Build complex components

### Example Projects

- **[Basic Button](../../examples/basic-button/)** - Expand on this tutorial
- **[Design System Dashboard](../../examples/design-system-dashboard/)** - Complex layouts
- **[Mobile Landing](../../examples/mobile-landing/)** - Responsive design

## Troubleshooting

### Canvas Not Loading
- Ensure VSS extension is installed and activated
- Check that sync server is running (`npm run start`)
- Look for errors in VS Code Output panel

### Code Not Generating
- Verify file permissions in project directory
- Check WebSocket connection in browser console
- Ensure shapes are properly closed and styled

### Sync Not Working
- Restart the sync server (`npm run start`)
- Refresh the browser page
- Check for conflicting VS Code extensions

### Performance Issues
- Close unused VS Code panels and extensions
- Reduce canvas size for complex drawings
- Clear browser cache and restart

## Getting Help

- **Discord Community**: Join for live help and discussions
- **GitHub Issues**: Report bugs and request features
- **Documentation**: Check the full VSS documentation
- **Video Tutorials**: Watch our YouTube channel for visual guides

Ready to dive deeper? Continue with [Basic Shape Drawing](./basic-shapes.md) to master all the drawing tools!