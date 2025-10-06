# Three-Way Sync User Guide

The heart of Visual Design Sync is its revolutionary three-way synchronization system that keeps your drawing canvas, VS Code editor, and live Chrome application perfectly synchronized in real-time.

## Understanding Three-Way Sync

### The Three Sync Points

1. **🎨 Drawing Canvas** - Visual design environment in VS Code
2. **💻 Code Editor** - Source files (CSS, JSX, JSON) in VS Code
3. **🌐 Live Browser** - Running application with DevTools integration

### Bidirectional Flow

Changes in any environment instantly propagate to the other two:

```
Drawing Canvas ←→ VS Code Editor ←→ Live Browser
      ↑                                    ↓
      └────────── Real-time Sync ──────────┘
```

## Sync Flow Examples

### 1. Canvas → Code → Browser Flow

**Scenario**: You draw a blue button in the canvas

1. **Canvas Action**: Draw rectangle with blue fill (#007bff)
2. **Code Generation**: 
   ```css
   .button-primary {
     background-color: #007bff;
     width: 120px;
     height: 40px;
     border-radius: 8px;
   }
   ```
3. **Browser Update**: Live application shows new blue button
4. **DevTools Reflection**: Chrome DevTools Elements panel shows updated styles

### 2. Code → Canvas → Browser Flow

**Scenario**: You edit CSS in VS Code

1. **Code Edit**: Change `background-color: #007bff` to `background-color: #28a745`
2. **Canvas Update**: Button rectangle changes from blue to green
3. **Browser Update**: Live application reflects green button
4. **DevTools Sync**: Elements panel shows updated color value

### 3. Browser → Code → Canvas Flow

**Scenario**: You modify styles in Chrome DevTools

1. **DevTools Edit**: Change background-color in Elements panel to red (#dc3545)
2. **Code Update**: VS Code CSS file updates automatically
3. **Canvas Update**: Drawing canvas shows red button
4. **Persistence**: Changes are saved to source files

## Sync Components in Detail

### Drawing Canvas Sync

**What Syncs**:
- Shape properties (size, position, colors)
- Text content and styling
- Layer visibility and order
- Color palette changes
- Design token modifications

**Sync Triggers**:
- Drawing new shapes
- Modifying existing elements
- Changing colors or styles
- Adding/removing layers
- Updating design tokens

**Generated Output**:
```css
/* From rectangle shape */
.card {
  width: 300px;
  height: 200px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 8px rgba(0,0,0,0.1);
}

/* From text element */
.card-title {
  font-size: 18px;
  font-weight: 600;
  color: #333;
  margin-bottom: 8px;
}
```

### Code Editor Sync

**What Syncs**:
- CSS property changes
- Component prop modifications
- Design data JSON updates
- File additions/deletions
- Import/export changes

**Monitored Files**:
- `*.css` - Stylesheet changes
- `*.jsx` - React component changes
- `design-data.json` - Canvas state changes
- `package.json` - Dependency changes

**Sync Behavior**:
```javascript
// File watcher detects changes
chokidar.watch(['src/**/*.css', 'src/**/*.jsx']).on('change', (path) => {
  // Parse file changes
  const changes = parseFileChanges(path);
  
  // Update canvas representation
  updateCanvasFromCode(changes);
  
  // Notify browser of changes
  broadcastToClients({ type: 'CODE_CHANGED', changes });
});
```

### Browser DevTools Sync

**What Syncs**:
- Element style modifications
- CSS rule additions/deletions
- Computed style changes
- React component prop changes
- Redux state modifications

**DevTools Integration**:
```javascript
// Chrome DevTools Protocol integration
chrome.devtools.panels.elements.onSelectionChanged.addListener(() => {
  // Capture element changes
  const element = chrome.devtools.inspectedWindow.eval('$0');
  
  // Extract style changes
  const styleChanges = extractStyleChanges(element);
  
  // Sync to VS Code and canvas
  syncToVSCode(styleChanges);
});
```

## Advanced Sync Features

### React DevTools Integration

**Component Props Sync**:
- Visual prop editing in canvas
- Props panel updates in React DevTools
- Real-time component re-rendering

**State Management Sync**:
- Redux DevTools integration
- Context API state visualization
- Hook state monitoring

### Performance Optimization

**Debounced Updates**:
```javascript
// Prevent excessive sync calls
const debouncedSync = debounce((changes) => {
  syncChanges(changes);
}, 100);
```

**Selective Sync**:
```javascript
// Only sync relevant changes
const shouldSync = (change) => {
  return change.type === 'style' || 
         change.type === 'component' ||
         change.type === 'design-token';
};
```

**Batch Operations**:
```javascript
// Batch multiple changes
const batchChanges = (changes) => {
  const batched = groupChangesByType(changes);
  return processBatch(batched);
};
```

## Sync Configuration

### WebSocket Settings

Configure sync server connection:

```json
{
  "vds": {
    "syncServer": {
      "port": 8080,
      "host": "localhost",
      "reconnectAttempts": 5,
      "reconnectDelay": 1000
    }
  }
}
```

### File Watching

Configure which files to monitor:

```json
{
  "vds": {
    "fileWatcher": {
      "include": ["src/**/*.css", "src/**/*.jsx", "src/**/*.json"],
      "exclude": ["node_modules/**", "dist/**"],
      "debounceDelay": 100
    }
  }
}
```

### Sync Filters

Control what changes sync:

```json
{
  "vds": {
    "syncFilters": {
      "canvas": ["shapes", "colors", "text", "layers"],
      "code": ["css", "jsx", "json"],
      "browser": ["styles", "props", "state"]
    }
  }
}
```

## Conflict Resolution

### Handling Simultaneous Changes

**Priority System**:
1. **User-initiated changes** (highest priority)
2. **File system changes** (medium priority)
3. **Automatic updates** (lowest priority)

**Conflict Detection**:
```javascript
const detectConflict = (change1, change2) => {
  return change1.target === change2.target && 
         change1.property === change2.property &&
         change1.timestamp - change2.timestamp < 1000;
};
```

**Resolution Strategies**:
- **Last Write Wins**: Most recent change takes precedence
- **User Preference**: User-initiated changes override automatic ones
- **Merge Strategy**: Combine non-conflicting changes

### Error Recovery

**Connection Loss**:
```javascript
// Automatic reconnection
const reconnect = () => {
  setTimeout(() => {
    if (websocket.readyState === WebSocket.CLOSED) {
      websocket = new WebSocket(serverUrl);
      setupEventHandlers();
    }
  }, reconnectDelay);
};
```

**Sync Failure**:
```javascript
// Retry failed operations
const retrySync = (operation, maxRetries = 3) => {
  return new Promise((resolve, reject) => {
    const attempt = (retryCount) => {
      operation()
        .then(resolve)
        .catch(error => {
          if (retryCount < maxRetries) {
            setTimeout(() => attempt(retryCount + 1), 1000);
          } else {
            reject(error);
          }
        });
    };
    attempt(0);
  });
};
```

## Monitoring and Debugging

### Sync Status Indicators

**VS Code Status Bar**:
- 🟢 Connected and syncing
- 🟡 Connected but sync paused
- 🔴 Disconnected or error
- ⚪ Sync disabled

**Canvas Indicators**:
- Real-time sync status overlay
- Change indicators on modified elements
- Conflict warnings and resolution options

### Debug Console

**Sync Event Logging**:
```javascript
// Enable debug logging
localStorage.setItem('vds-debug', 'true');

// View sync events
console.log('VDS Sync Events:', vds.getSyncHistory());
```

**Performance Metrics**:
```javascript
// Monitor sync performance
const metrics = vds.getPerformanceMetrics();
console.log('Sync latency:', metrics.averageLatency);
console.log('Events per second:', metrics.eventsPerSecond);
```

## Best Practices

### Optimal Sync Workflow

1. **Start with Canvas**: Begin visual design in drawing canvas
2. **Refine in Code**: Add logic and refinements in VS Code
3. **Test in Browser**: Validate behavior and interactions
4. **Iterate Visually**: Make adjustments back in canvas

### Performance Tips

- **Use Layers**: Organize complex designs in layers for better sync performance
- **Batch Changes**: Make multiple related changes before pausing
- **Optimize File Structure**: Keep related files together for faster watching
- **Monitor Network**: Ensure stable connection for remote development

### Collaboration Guidelines

- **Communicate Changes**: Let team members know when making major modifications
- **Use Version Control**: Commit frequently to track sync-generated changes
- **Test Sync Points**: Verify all three environments stay synchronized
- **Document Customizations**: Record any custom sync configurations

## Troubleshooting Sync Issues

### Common Problems

**Sync Not Working**:
1. Check WebSocket connection status
2. Verify sync server is running
3. Ensure file permissions allow modifications
4. Check for conflicting VS Code extensions

**Partial Sync**:
1. Review sync filter configuration
2. Check file watcher include/exclude patterns
3. Verify network connectivity for remote development
4. Look for JavaScript errors in browser console

**Performance Issues**:
1. Reduce sync frequency for large files
2. Optimize file watcher patterns
3. Close unnecessary browser tabs
4. Restart sync server if memory usage is high

### Getting Help

- **Debug Mode**: Enable verbose logging for detailed sync information
- **Community Support**: Join Discord for real-time help
- **GitHub Issues**: Report persistent sync problems
- **Documentation**: Check troubleshooting guides for specific scenarios

The three-way sync system is the foundation that makes VDS revolutionary. Understanding how it works will help you leverage its full power for seamless design-to-code workflows.