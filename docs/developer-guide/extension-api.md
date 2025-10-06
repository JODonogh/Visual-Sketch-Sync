# VDS Extension API Reference

The Visual Design Sync extension provides a comprehensive API for customizing and extending the three-way synchronization system. This guide covers all available APIs for plugin development and customization.

## Core Extension API

### VDS Extension Context

The main extension context provides access to all VDS functionality:

```typescript
import { vds } from 'vds-extension-api';

// Get extension context
const context = vds.getContext();

// Access drawing canvas
const canvas = context.getDrawingCanvas();

// Access sync server
const syncServer = context.getSyncServer();

// Access code generator
const codeGenerator = context.getCodeGenerator();
```

### Extension Lifecycle

```typescript
interface VDSExtension {
  activate(context: vscode.ExtensionContext): void;
  deactivate(): void;
}

// Extension activation
export function activate(context: vscode.ExtensionContext) {
  // Initialize VDS
  const vdsContext = vds.initialize(context);
  
  // Register custom components
  vdsContext.registerComponent('custom-button', CustomButtonGenerator);
  
  // Set up event listeners
  vdsContext.onDrawingChange(handleDrawingChange);
  vdsContext.onCodeChange(handleCodeChange);
}
```

## Drawing Canvas API

### Canvas Management

```typescript
interface DrawingCanvas {
  // Canvas properties
  getSize(): { width: number; height: number };
  setSize(width: number, height: number): void;
  getBackgroundColor(): string;
  setBackgroundColor(color: string): void;
  
  // Element management
  addElement(element: CanvasElement): string;
  removeElement(elementId: string): void;
  updateElement(elementId: string, changes: Partial<CanvasElement>): void;
  getElement(elementId: string): CanvasElement | null;
  getAllElements(): CanvasElement[];
  
  // Layer management
  addLayer(layer: Layer): string;
  removeLayer(layerId: string): void;
  setLayerVisibility(layerId: string, visible: boolean): void;
  moveElementToLayer(elementId: string, layerId: string): void;
  
  // Selection and interaction
  selectElement(elementId: string): void;
  getSelectedElements(): string[];
  clearSelection(): void;
  
  // Undo/Redo
  undo(): void;
  redo(): void;
  getHistoryState(): HistoryState;
}
```

### Canvas Elements

```typescript
interface CanvasElement {
  id: string;
  type: 'rectangle' | 'circle' | 'line' | 'text' | 'path' | 'group';
  position: { x: number; y: number };
  size?: { width: number; height: number };
  style: ElementStyle;
  layerId: string;
  parentId?: string;
  children?: string[];
  metadata?: Record<string, any>;
}

interface ElementStyle {
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  borderRadius?: number;
  opacity?: number;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: number;
  textAlign?: 'left' | 'center' | 'right';
}
```

### Drawing Tools API

```typescript
interface DrawingTools {
  // Tool selection
  setActiveTool(tool: DrawingTool): void;
  getActiveTool(): DrawingTool;
  
  // Tool configuration
  setBrushSize(size: number): void;
  setBrushOpacity(opacity: number): void;
  setPressureSensitivity(enabled: boolean): void;
  
  // Custom tools
  registerTool(name: string, tool: CustomDrawingTool): void;
  unregisterTool(name: string): void;
}

interface CustomDrawingTool {
  name: string;
  icon: string;
  cursor: string;
  
  onPointerDown(event: PointerEvent): void;
  onPointerMove(event: PointerEvent): void;
  onPointerUp(event: PointerEvent): void;
  
  onActivate(): void;
  onDeactivate(): void;
}
```

## Sync Server API

### Server Management

```typescript
interface SyncServer {
  // Server lifecycle
  start(port?: number): Promise<void>;
  stop(): Promise<void>;
  isRunning(): boolean;
  getPort(): number;
  
  // Client management
  getConnectedClients(): WebSocketClient[];
  broadcastMessage(message: SyncMessage): void;
  sendToClient(clientId: string, message: SyncMessage): void;
  
  // Event handling
  onClientConnected(callback: (client: WebSocketClient) => void): void;
  onClientDisconnected(callback: (clientId: string) => void): void;
  onMessage(callback: (message: SyncMessage, clientId: string) => void): void;
  
  // File watching
  watchFiles(patterns: string[]): void;
  unwatchFiles(patterns: string[]): void;
  onFileChanged(callback: (filePath: string, changeType: string) => void): void;
}
```

### Sync Messages

```typescript
interface SyncMessage {
  type: string;
  payload: any;
  timestamp: number;
  clientId?: string;
  correlationId?: string;
}

// Common message types
type SyncMessageType = 
  | 'CANVAS_ELEMENT_ADDED'
  | 'CANVAS_ELEMENT_MODIFIED'
  | 'CANVAS_ELEMENT_REMOVED'
  | 'CODE_FILE_CHANGED'
  | 'BROWSER_STYLE_CHANGED'
  | 'DESIGN_TOKEN_UPDATED'
  | 'COMPONENT_REGISTERED';
```

### Custom Sync Handlers

```typescript
interface SyncHandler {
  messageType: string;
  handle(message: SyncMessage, context: SyncContext): Promise<void>;
}

// Register custom sync handler
syncServer.registerHandler({
  messageType: 'CUSTOM_COMPONENT_UPDATE',
  async handle(message, context) {
    const { componentId, changes } = message.payload;
    
    // Update canvas
    await context.canvas.updateElement(componentId, changes);
    
    // Generate code
    const code = await context.codeGenerator.generateComponent(componentId);
    
    // Write to file
    await context.fileSystem.writeFile('src/components/Custom.jsx', code);
    
    // Broadcast update
    context.broadcast({
      type: 'COMPONENT_CODE_GENERATED',
      payload: { componentId, code }
    });
  }
});
```

## Code Generation API

### Code Generators

```typescript
interface CodeGenerator {
  // CSS generation
  generateCSS(elements: CanvasElement[]): string;
  generateCSSClass(element: CanvasElement): string;
  generateDesignTokens(palette: ColorPalette): string;
  
  // Component generation
  generateReactComponent(element: CanvasElement): string;
  generateVueComponent(element: CanvasElement): string;
  generateHTMLTemplate(element: CanvasElement): string;
  
  // Custom generators
  registerGenerator(type: string, generator: CustomGenerator): void;
  unregisterGenerator(type: string): void;
}

interface CustomGenerator {
  name: string;
  fileExtension: string;
  
  generate(element: CanvasElement, options?: any): string;
  validate(element: CanvasElement): boolean;
  getDefaultOptions(): any;
}
```

### CSS Generation Customization

```typescript
// Custom CSS generator
class CustomButtonGenerator implements CustomGenerator {
  name = 'custom-button';
  fileExtension = 'css';
  
  generate(element: CanvasElement, options = {}): string {
    const { size, style } = element;
    const { variant = 'primary' } = options;
    
    return `
.button-${variant} {
  width: ${size.width}px;
  height: ${size.height}px;
  background: ${style.fill};
  border: ${style.strokeWidth}px solid ${style.stroke};
  border-radius: ${style.borderRadius}px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.button-${variant}:hover {
  background: ${this.darkenColor(style.fill, 0.1)};
  transform: translateY(-1px);
}
    `.trim();
  }
  
  validate(element: CanvasElement): boolean {
    return element.type === 'rectangle' && 
           element.metadata?.componentType === 'button';
  }
  
  getDefaultOptions() {
    return { variant: 'primary' };
  }
  
  private darkenColor(color: string, amount: number): string {
    // Color manipulation logic
    return color;
  }
}

// Register the generator
codeGenerator.registerGenerator('button', new CustomButtonGenerator());
```

### Component Generation Templates

```typescript
interface ComponentTemplate {
  name: string;
  framework: 'react' | 'vue' | 'angular' | 'html';
  
  generateComponent(element: CanvasElement, props: ComponentProps): string;
  generateProps(element: CanvasElement): ComponentProps;
  generateStyles(element: CanvasElement): string;
}

// React component template
class ReactButtonTemplate implements ComponentTemplate {
  name = 'react-button';
  framework = 'react' as const;
  
  generateComponent(element: CanvasElement, props: ComponentProps): string {
    const { name, propTypes, defaultProps } = props;
    
    return `
import React from 'react';
import './${name}.css';

export const ${name} = ({ 
  ${Object.keys(propTypes).join(', ')}
}) => {
  return (
    <button 
      className="button-${element.metadata?.variant || 'primary'}"
      onClick={onClick}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};

${name}.defaultProps = ${JSON.stringify(defaultProps, null, 2)};
    `.trim();
  }
  
  generateProps(element: CanvasElement): ComponentProps {
    return {
      name: 'Button',
      propTypes: {
        children: 'node',
        onClick: 'func',
        disabled: 'bool',
        variant: 'string'
      },
      defaultProps: {
        children: 'Click me',
        disabled: false,
        variant: element.metadata?.variant || 'primary'
      }
    };
  }
  
  generateStyles(element: CanvasElement): string {
    return codeGenerator.generateCSSClass(element);
  }
}
```

## Event System API

### Event Listeners

```typescript
interface EventSystem {
  // Canvas events
  onElementAdded(callback: (element: CanvasElement) => void): Disposable;
  onElementModified(callback: (elementId: string, changes: any) => void): Disposable;
  onElementRemoved(callback: (elementId: string) => void): Disposable;
  onSelectionChanged(callback: (selectedIds: string[]) => void): Disposable;
  
  // Code events
  onFileChanged(callback: (filePath: string, content: string) => void): Disposable;
  onCodeGenerated(callback: (filePath: string, code: string) => void): Disposable;
  
  // Sync events
  onSyncMessage(callback: (message: SyncMessage) => void): Disposable;
  onSyncError(callback: (error: Error) => void): Disposable;
  
  // Custom events
  emit(eventName: string, data: any): void;
  on(eventName: string, callback: (data: any) => void): Disposable;
  off(eventName: string, callback: Function): void;
}
```

### Custom Event Handlers

```typescript
// Listen for custom component creation
vds.events.on('custom-component-created', (data) => {
  const { componentType, element } = data;
  
  // Generate custom code
  const customCode = generateCustomComponent(componentType, element);
  
  // Write to file
  vds.fileSystem.writeFile(`src/components/${componentType}.jsx`, customCode);
  
  // Notify other systems
  vds.events.emit('component-code-generated', {
    componentType,
    filePath: `src/components/${componentType}.jsx`,
    code: customCode
  });
});
```

## Plugin Development

### Plugin Structure

```typescript
interface VDSPlugin {
  name: string;
  version: string;
  description: string;
  
  activate(context: VDSContext): void;
  deactivate(): void;
  
  // Optional lifecycle hooks
  onCanvasReady?(canvas: DrawingCanvas): void;
  onSyncServerReady?(server: SyncServer): void;
  onCodeGeneratorReady?(generator: CodeGenerator): void;
}

// Example plugin
export class CustomThemePlugin implements VDSPlugin {
  name = 'custom-theme-plugin';
  version = '1.0.0';
  description = 'Adds custom theme generation capabilities';
  
  activate(context: VDSContext) {
    // Register custom theme generator
    context.codeGenerator.registerGenerator('theme', new ThemeGenerator());
    
    // Add theme management UI
    context.ui.addPanel('theme-manager', new ThemeManagerPanel());
    
    // Listen for theme changes
    context.events.on('theme-changed', this.handleThemeChange);
  }
  
  deactivate() {
    // Cleanup
  }
  
  private handleThemeChange = (theme: Theme) => {
    // Generate theme CSS
    const css = this.generateThemeCSS(theme);
    
    // Update all components
    context.codeGenerator.regenerateAll();
  };
}
```

### Plugin Registration

```typescript
// Register plugin
vds.registerPlugin(new CustomThemePlugin());

// Plugin manifest (package.json)
{
  "name": "vds-custom-theme-plugin",
  "version": "1.0.0",
  "main": "dist/index.js",
  "vdsPlugin": {
    "entry": "dist/plugin.js",
    "dependencies": ["vds-core"],
    "permissions": ["file-system", "code-generation"]
  }
}
```

## Configuration API

### Extension Settings

```typescript
interface VDSConfiguration {
  // Canvas settings
  canvas: {
    defaultSize: { width: number; height: number };
    backgroundColor: string;
    gridSize: number;
    snapToGrid: boolean;
  };
  
  // Sync settings
  sync: {
    serverPort: number;
    reconnectAttempts: number;
    debounceDelay: number;
    enabledSyncTypes: string[];
  };
  
  // Code generation settings
  codeGeneration: {
    framework: 'react' | 'vue' | 'angular';
    cssFramework: 'vanilla' | 'tailwind' | 'styled-components';
    outputDirectory: string;
    fileNamingConvention: 'camelCase' | 'kebab-case' | 'PascalCase';
  };
  
  // Performance settings
  performance: {
    maxHistorySize: number;
    enableDebugLogging: boolean;
    syncBatchSize: number;
  };
}

// Access configuration
const config = vds.getConfiguration();

// Update configuration
vds.updateConfiguration({
  canvas: {
    defaultSize: { width: 1200, height: 800 }
  }
});

// Listen for configuration changes
vds.onConfigurationChanged((changes) => {
  console.log('Configuration updated:', changes);
});
```

## Error Handling and Debugging

### Error Handling

```typescript
interface VDSError extends Error {
  code: string;
  category: 'canvas' | 'sync' | 'codegen' | 'plugin';
  severity: 'info' | 'warning' | 'error' | 'critical';
  context?: any;
}

// Error handling
vds.onError((error: VDSError) => {
  console.error(`VDS Error [${error.category}]: ${error.message}`);
  
  // Handle specific error types
  switch (error.code) {
    case 'SYNC_CONNECTION_LOST':
      // Attempt reconnection
      vds.syncServer.reconnect();
      break;
      
    case 'CODE_GENERATION_FAILED':
      // Show user notification
      vscode.window.showErrorMessage(`Code generation failed: ${error.message}`);
      break;
  }
});
```

### Debug API

```typescript
interface DebugAPI {
  // Logging
  log(level: 'debug' | 'info' | 'warn' | 'error', message: string, data?: any): void;
  
  // Performance monitoring
  startTimer(name: string): void;
  endTimer(name: string): number;
  getPerformanceMetrics(): PerformanceMetrics;
  
  // State inspection
  getCanvasState(): any;
  getSyncState(): any;
  getPluginState(pluginName: string): any;
  
  // Event tracing
  enableEventTracing(): void;
  disableEventTracing(): void;
  getEventTrace(): EventTrace[];
}

// Enable debug mode
vds.debug.enableEventTracing();

// Log custom events
vds.debug.log('info', 'Custom component created', { componentId: 'btn-001' });

// Monitor performance
vds.debug.startTimer('code-generation');
await generateCode();
const duration = vds.debug.endTimer('code-generation');
```

This comprehensive API reference provides all the tools needed to extend and customize the Visual Design Sync extension for your specific needs.