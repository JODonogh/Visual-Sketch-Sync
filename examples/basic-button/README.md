# Basic Button Component Example

This example demonstrates the fundamental VDS workflow: drawing a button shape in the canvas and watching it automatically generate React component code.

## What You'll Learn

- How to draw shapes that generate CSS classes
- Real-time synchronization between canvas and code
- Component registration and visual prop editing
- Basic three-way sync workflow

## Project Structure

```
basic-button/
├── src/
│   ├── components/
│   │   └── Button.jsx          # Generated button component
│   ├── styles/
│   │   └── button.css          # Generated button styles
│   └── design/
│       └── design-data.json    # Canvas drawing data
├── scripts/
│   └── vds-sync-server.js      # Three-way sync server
└── package.json                # Project configuration
```

## Step-by-Step Tutorial

### Step 1: Project Setup

1. Install dependencies:
```bash
npm install
```

2. Start the sync server:
```bash
npm run dev:sync
```

3. Open VS Code and activate the VDS drawing canvas

### Step 2: Draw Your First Button

1. **Open Drawing Canvas**: Click "VDS: Open Drawing Canvas" in VS Code command palette
2. **Select Rectangle Tool**: Choose the rectangle tool from the drawing toolbar
3. **Draw Button Shape**: 
   - Draw a rectangle approximately 120px × 40px
   - The shape will automatically appear in the canvas
4. **Set Button Properties**:
   - Fill color: `#007bff` (primary blue)
   - Border radius: `8px`
   - Border: `1px solid #0056b3`

### Step 3: Watch Code Generation

As you draw, watch these files update automatically:

**`src/styles/button.css`** - Generated CSS:
```css
.button-primary {
  width: 120px;
  height: 40px;
  background-color: #007bff;
  border: 1px solid #0056b3;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.button-primary:hover {
  background-color: #0056b3;
  transform: translateY(-1px);
}
```

**`src/components/Button.jsx`** - Generated React component:
```jsx
import React from 'react';
import '../styles/button.css';

export const Button = ({ 
  children = 'Click me',
  variant = 'primary',
  onClick,
  ...props 
}) => {
  return (
    <button 
      className={`button-${variant}`}
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  );
};
```

### Step 4: Test Three-Way Sync

1. **Canvas → Code**: Modify button color in canvas, see CSS update
2. **Code → Canvas**: Edit CSS file, see canvas shape update
3. **Live App → Code**: Use Chrome DevTools to modify button, see code update

### Step 5: Add Text and Styling

1. **Add Text Element**: Use text tool to add "Click me" label
2. **Position Text**: Center text within button rectangle
3. **Style Text**: Set font family, size, and color
4. **Watch Updates**: See CSS and component code update automatically

### Expected Results

After completing this tutorial, you should have:

- ✅ A functional button component generated from visual design
- ✅ CSS classes that match your drawn shapes
- ✅ Real-time sync between canvas, code, and live application
- ✅ Understanding of basic VDS workflow

## Next Steps

- Try the **Design System Dashboard** example for more complex layouts
- Explore **E-commerce Cards** for data-driven components
- Check out **Mobile Landing** for responsive design patterns

## Troubleshooting

**Canvas not updating when code changes?**
- Ensure sync server is running (`npm run dev:sync`)
- Check WebSocket connection in browser console

**Generated code not appearing?**
- Verify file permissions in project directory
- Check VS Code output panel for error messages

**Tablet/stylus not working?**
- Ensure Pointer Events API is supported in your browser
- Check tablet driver installation (Wacom) or Apple Pencil pairing