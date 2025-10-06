/**
 * DevTools Bridge Script
 * 
 * This script can be injected into a web page to capture DevTools changes
 * and send them to the VDS Sync Server for the DevTools → Code → Canvas flow.
 * 
 * Usage:
 * 1. Include this script in your React application
 * 2. It will automatically detect DevTools changes and sync them
 */

class DevToolsBridge {
  constructor(options = {}) {
    this.syncServerUrl = options.syncServerUrl || 'ws://localhost:3001';
    this.ws = null;
    this.connected = false;
    this.observers = [];
    
    this.init();
  }
  
  async init() {
    console.log('🔧 Initializing DevTools Bridge...');
    
    // Connect to sync server
    await this.connectToSyncServer();
    
    // Set up DOM observers
    this.setupDOMObserver();
    
    // Set up React DevTools integration
    this.setupReactDevToolsIntegration();
    
    // Set up Redux DevTools integration
    this.setupReduxDevToolsIntegration();
    
    console.log('✅ DevTools Bridge initialized');
  }
  
  async connectToSyncServer() {
    try {
      this.ws = new WebSocket(this.syncServerUrl);
      
      this.ws.onopen = () => {
        console.log('🔌 Connected to VDS Sync Server');
        this.connected = true;
        
        // Send initial connection message
        this.sendToSyncServer({
          type: 'CLIENT_CONNECTED',
          payload: {
            clientType: 'devtools-bridge',
            capabilities: ['devtools-sync', 'react-devtools', 'redux-devtools']
          }
        });
      };
      
      this.ws.onclose = () => {
        console.log('🔌 Disconnected from VDS Sync Server');
        this.connected = false;
        
        // Attempt to reconnect after 3 seconds
        setTimeout(() => {
          this.connectToSyncServer();
        }, 3000);
      };
      
      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
      
    } catch (error) {
      console.error('Failed to connect to sync server:', error);
    }
  }
  
  sendToSyncServer(message) {
    if (this.connected && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }
  
  setupDOMObserver() {
    // Create a MutationObserver to watch for DOM changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes') {
          this.handleAttributeChange(mutation);
        } else if (mutation.type === 'childList') {
          this.handleChildListChange(mutation);
        }
      });
    });
    
    // Start observing
    observer.observe(document.body, {
      attributes: true,
      attributeOldValue: true,
      childList: true,
      subtree: true,
      attributeFilter: ['style', 'class']
    });
    
    this.observers.push(observer);
    console.log('👂 DOM observer set up');
  }
  
  handleAttributeChange(mutation) {
    const { target, attributeName, oldValue } = mutation;
    const newValue = target.getAttribute(attributeName);
    
    // Only process if value actually changed
    if (oldValue !== newValue) {
      console.log(`🔧 Attribute changed: ${attributeName} = ${newValue}`);
      
      // Send to sync server
      this.sendToSyncServer({
        type: 'DEVTOOLS_DOM_ATTRIBUTE_CHANGED',
        payload: {
          nodeId: this.getNodeId(target),
          attributeName,
          oldValue,
          newValue,
          timestamp: Date.now()
        }
      });
    }
  }
  
  handleChildListChange(mutation) {
    // Handle DOM structure changes
    if (mutation.addedNodes.length > 0 || mutation.removedNodes.length > 0) {
      console.log('🔧 DOM structure changed');
      
      this.sendToSyncServer({
        type: 'DEVTOOLS_DOM_STRUCTURE_CHANGED',
        payload: {
          addedNodes: mutation.addedNodes.length,
          removedNodes: mutation.removedNodes.length,
          timestamp: Date.now()
        }
      });
    }
  }
  
  setupReactDevToolsIntegration() {
    // Hook into React DevTools if available
    if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
      const hook = window.__REACT_DEVTOOLS_GLOBAL_HOOK__;
      
      // Listen for React DevTools events
      hook.onCommitFiberRoot = (id, root, priorityLevel) => {
        console.log('⚛️ React component updated');
        
        // Extract component information
        const componentInfo = this.extractReactComponentInfo(root);
        
        if (componentInfo) {
          this.sendToSyncServer({
            type: 'DEVTOOLS_REACT_COMPONENT_UPDATED',
            payload: {
              ...componentInfo,
              timestamp: Date.now()
            }
          });
        }
      };
      
      console.log('⚛️ React DevTools integration set up');
    } else {
      console.log('⚠️ React DevTools not detected');
    }
  }
  
  setupReduxDevToolsIntegration() {
    // Hook into Redux DevTools if available
    if (window.__REDUX_DEVTOOLS_EXTENSION__) {
      console.log('🔄 Redux DevTools detected');
      
      // Try to hook into Redux store
      const originalDispatch = window.store?.dispatch;
      
      if (originalDispatch) {
        window.store.dispatch = (action) => {
          console.log('🔄 Redux action dispatched:', action.type);
          
          // Send to sync server
          this.sendToSyncServer({
            type: 'DEVTOOLS_REDUX_ACTION',
            payload: {
              action,
              state: window.store.getState(),
              timestamp: Date.now()
            }
          });
          
          return originalDispatch(action);
        };
        
        console.log('🔄 Redux DevTools integration set up');
      }
    } else {
      console.log('⚠️ Redux DevTools not detected');
    }
  }
  
  extractReactComponentInfo(fiberRoot) {
    try {
      // This is a simplified extraction - in production you'd need more sophisticated fiber traversal
      const current = fiberRoot.current;
      
      if (current && current.child) {
        const component = current.child;
        
        return {
          componentName: component.type?.name || 'Unknown',
          props: component.memoizedProps || {},
          state: component.memoizedState || {},
          key: component.key
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error extracting React component info:', error);
      return null;
    }
  }
  
  getNodeId(element) {
    // Generate a unique ID for DOM elements
    if (!element._vdsNodeId) {
      element._vdsNodeId = `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    return element._vdsNodeId;
  }
  
  // Public API for manual DevTools integration
  notifyStyleChange(element, property, value) {
    this.sendToSyncServer({
      type: 'DEVTOOLS_MANUAL_STYLE_CHANGE',
      payload: {
        nodeId: this.getNodeId(element),
        property,
        value,
        timestamp: Date.now()
      }
    });
  }
  
  notifyPropsChange(componentId, props) {
    this.sendToSyncServer({
      type: 'DEVTOOLS_REACT_PROPS_CHANGED',
      payload: {
        componentId,
        props,
        timestamp: Date.now()
      }
    });
  }
  
  destroy() {
    // Clean up observers
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
    
    // Close WebSocket connection
    if (this.ws) {
      this.ws.close();
    }
    
    console.log('🔧 DevTools Bridge destroyed');
  }
}

// Auto-initialize if in browser environment
if (typeof window !== 'undefined') {
  window.DevToolsBridge = DevToolsBridge;
  
  // Auto-start the bridge
  window.addEventListener('load', () => {
    if (!window.vdsDevToolsBridge) {
      window.vdsDevToolsBridge = new DevToolsBridge();
    }
  });
}

// Export for Node.js environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DevToolsBridge;
}