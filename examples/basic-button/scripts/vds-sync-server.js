#!/usr/bin/env node

/**
 * VDS Sync Server for Basic Button Example
 * 
 * This server coordinates three-way synchronization between:
 * 1. Drawing canvas in VS Code webview
 * 2. Source code files (CSS, JSX)
 * 3. Live Chrome application
 */

const WebSocket = require('ws');
const chokidar = require('chokidar');
const fs = require('fs').promises;
const path = require('path');
const recast = require('recast');

class VDSSyncServer {
  constructor(port = 8080) {
    this.port = port;
    this.wss = null;
    this.fileWatcher = null;
    this.designDataPath = path.join(__dirname, '../src/design/design-data.json');
    this.cssPath = path.join(__dirname, '../src/styles/button.css');
  }

  async start() {
    console.log('🚀 Starting VDS Sync Server...');
    
    // Start WebSocket server
    this.wss = new WebSocket.Server({ port: this.port });
    console.log(`📡 WebSocket server listening on port ${this.port}`);

    // Set up WebSocket connections
    this.wss.on('connection', (ws) => {
      console.log('🔗 Client connected');
      
      ws.on('message', async (message) => {
        try {
          const data = JSON.parse(message);
          await this.handleMessage(data, ws);
        } catch (error) {
          console.error('❌ Error handling message:', error);
          ws.send(JSON.stringify({ type: 'ERROR', error: error.message }));
        }
      });

      ws.on('close', () => {
        console.log('🔌 Client disconnected');
      });

      // Send initial design data
      this.sendDesignData(ws);
    });

    // Set up file watchers
    this.setupFileWatchers();

    console.log('✅ VDS Sync Server ready!');
    console.log('📝 Watching files:');
    console.log(`   - ${this.designDataPath}`);
    console.log(`   - ${this.cssPath}`);
  }

  setupFileWatchers() {
    const watchPaths = [
      this.designDataPath,
      this.cssPath,
      path.join(__dirname, '../src/components/*.jsx')
    ];

    this.fileWatcher = chokidar.watch(watchPaths, {
      ignored: /node_modules/,
      persistent: true
    });

    this.fileWatcher.on('change', async (filePath) => {
      console.log(`📁 File changed: ${path.basename(filePath)}`);
      
      if (filePath === this.designDataPath) {
        await this.handleDesignDataChange();
      } else if (filePath === this.cssPath) {
        await this.handleCSSChange();
      }
    });
  }

  async handleMessage(data, ws) {
    console.log(`📨 Received: ${data.type}`);

    switch (data.type) {
      case 'SHAPE_DRAWN':
        await this.handleShapeDrawn(data.payload);
        break;
      
      case 'SHAPE_MODIFIED':
        await this.handleShapeModified(data.payload);
        break;
      
      case 'COLOR_CHANGED':
        await this.handleColorChanged(data.payload);
        break;
      
      case 'REQUEST_DESIGN_DATA':
        await this.sendDesignData(ws);
        break;
      
      default:
        console.log(`⚠️  Unknown message type: ${data.type}`);
    }
  }

  async handleShapeDrawn(payload) {
    try {
      // Update design data
      const designData = await this.loadDesignData();
      designData.elements.push(payload.element);
      await this.saveDesignData(designData);

      // Generate CSS for new shape
      if (payload.element.componentType === 'button') {
        await this.generateButtonCSS(payload.element);
      }

      // Notify all clients
      this.broadcast({
        type: 'DESIGN_UPDATED',
        payload: { element: payload.element }
      });

    } catch (error) {
      console.error('❌ Error handling shape drawn:', error);
    }
  }

  async handleShapeModified(payload) {
    try {
      const designData = await this.loadDesignData();
      const elementIndex = designData.elements.findIndex(el => el.id === payload.elementId);
      
      if (elementIndex !== -1) {
        designData.elements[elementIndex] = { ...designData.elements[elementIndex], ...payload.changes };
        await this.saveDesignData(designData);

        // Regenerate CSS if it's a button
        if (designData.elements[elementIndex].componentType === 'button') {
          await this.generateButtonCSS(designData.elements[elementIndex]);
        }

        this.broadcast({
          type: 'ELEMENT_MODIFIED',
          payload: { elementId: payload.elementId, changes: payload.changes }
        });
      }
    } catch (error) {
      console.error('❌ Error handling shape modified:', error);
    }
  }

  async generateButtonCSS(element) {
    const { style, props } = element;
    const variant = props?.variant || 'primary';
    
    let css = `
.button-${variant} {
  width: ${element.size.width}px;
  height: ${element.size.height}px;
  background-color: ${style.fill};
  border: ${style.strokeWidth}px solid ${style.stroke};
  border-radius: ${style.borderRadius}px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.button-${variant}:hover:not(:disabled) {
  background-color: ${this.darkenColor(style.fill, 0.1)};
  transform: translateY(-1px);
}
`;

    // Append to existing CSS file
    try {
      const existingCSS = await fs.readFile(this.cssPath, 'utf8');
      const updatedCSS = this.updateCSSRule(existingCSS, `.button-${variant}`, css);
      await fs.writeFile(this.cssPath, updatedCSS);
      console.log(`✅ Generated CSS for button variant: ${variant}`);
    } catch (error) {
      console.error('❌ Error generating CSS:', error);
    }
  }

  updateCSSRule(existingCSS, selector, newRule) {
    // Simple CSS rule replacement
    const regex = new RegExp(`${selector.replace('.', '\\.')}\\s*{[^}]*}`, 'g');
    if (regex.test(existingCSS)) {
      return existingCSS.replace(regex, newRule.trim());
    } else {
      return existingCSS + '\n\n' + newRule.trim();
    }
  }

  darkenColor(color, amount) {
    // Simple color darkening utility
    const hex = color.replace('#', '');
    const r = Math.max(0, parseInt(hex.substr(0, 2), 16) - Math.round(255 * amount));
    const g = Math.max(0, parseInt(hex.substr(2, 2), 16) - Math.round(255 * amount));
    const b = Math.max(0, parseInt(hex.substr(4, 2), 16) - Math.round(255 * amount));
    
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }

  async loadDesignData() {
    try {
      const data = await fs.readFile(this.designDataPath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('❌ Error loading design data:', error);
      return { elements: [], layers: [], colorPalette: [] };
    }
  }

  async saveDesignData(data) {
    try {
      await fs.writeFile(this.designDataPath, JSON.stringify(data, null, 2));
      console.log('💾 Design data saved');
    } catch (error) {
      console.error('❌ Error saving design data:', error);
    }
  }

  async sendDesignData(ws) {
    try {
      const designData = await this.loadDesignData();
      ws.send(JSON.stringify({
        type: 'DESIGN_DATA',
        payload: designData
      }));
    } catch (error) {
      console.error('❌ Error sending design data:', error);
    }
  }

  async handleDesignDataChange() {
    const designData = await this.loadDesignData();
    this.broadcast({
      type: 'DESIGN_DATA_CHANGED',
      payload: designData
    });
  }

  async handleCSSChange() {
    try {
      const cssContent = await fs.readFile(this.cssPath, 'utf8');
      this.broadcast({
        type: 'CSS_CHANGED',
        payload: { css: cssContent }
      });
    } catch (error) {
      console.error('❌ Error handling CSS change:', error);
    }
  }

  broadcast(message) {
    this.wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
      }
    });
  }

  async stop() {
    console.log('🛑 Stopping VDS Sync Server...');
    
    if (this.fileWatcher) {
      await this.fileWatcher.close();
    }
    
    if (this.wss) {
      this.wss.close();
    }
    
    console.log('✅ Server stopped');
  }
}

// Start server if run directly
if (require.main === module) {
  const server = new VDSSyncServer();
  
  server.start().catch(error => {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  });

  // Graceful shutdown
  process.on('SIGINT', async () => {
    await server.stop();
    process.exit(0);
  });
}

module.exports = VDSSyncServer;