#!/usr/bin/env node

/**
 * VDS Sync Server - Three-way synchronization coordinator
 * 
 * This server coordinates changes between:
 * 1. Drawing Canvas (VS Code webview)
 * 2. VS Code Editor (file system)
 * 3. Chrome Application (via DevTools Protocol)
 * 
 * Features:
 * - WebSocket server for real-time communication
 * - File system watcher for monitoring code changes
 * - Process lifecycle management
 * - Cross-platform support (desktop, iPad, Codespaces)
 */

const WebSocket = require('ws');
const chokidar = require('chokidar');
const fs = require('fs').promises;
const path = require('path');
const { EventEmitter } = require('events');
const CSSToCanvasEngine = require('./css-to-canvas-engine');
const VDSErrorHandler = require('./error-handler');

class VDSSyncServer extends EventEmitter {
  constructor(options = {}) {
    super();
    
    // Initialize error handler first
    this.errorHandler = new VDSErrorHandler({
      enableLogging: true,
      enableRecovery: true,
      maxRetries: 3,
      retryDelay: 1000,
      logLevel: options.logLevel || 'info'
    });
    
    // Setup error handler implementations
    this.setupErrorHandlerImplementations();
    
    // Detect environment
    this.environment = this.detectEnvironment();
    
    this.config = {
      port: options.port || process.env.VDS_SYNC_PORT || 3001,
      host: this.getOptimalHost(options.host),
      watchPaths: options.watchPaths || ['src/**/*.{js,jsx,ts,tsx,css,scss,json}'],
      designDataPath: options.designDataPath || 'src/design/design-data.json',
      // Remote development optimizations
      syncThrottle: this.environment.isRemote ? 1000 : 100, // Slower sync for remote
      maxFileSize: this.environment.isRemote ? 1024 * 1024 : 5 * 1024 * 1024, // 1MB vs 5MB
      enableCompression: this.environment.isRemote,
      ...options
    };
    
    this.wss = null;
    this.fileWatcher = null;
    this.clients = new Set();
    this.isRunning = false;
    this.connectionRetries = 0;
    this.maxConnectionRetries = 5;
    
    // Initialize CSS-to-Canvas engine
    this.cssToCanvasEngine = new CSSToCanvasEngine({
      watchPaths: this.config.watchPaths.filter(p => p.includes('.css')),
      canvasDataPath: this.config.designDataPath,
      updateCanvas: true
    });
    
    // Chrome DevTools integration
    this.devToolsClient = null;
    this.devToolsConnected = false;
    this.devToolsPort = options.devToolsPort || 9222;
    
    // Bind methods to preserve context
    this.handleConnection = this.handleConnection.bind(this);
    this.handleFileChange = this.handleFileChange.bind(this);
    this.handleMessage = this.handleMessage.bind(this);
    this.shutdown = this.shutdown.bind(this);
    
    // Throttling for remote environments
    this.lastSyncTime = 0;
    this.pendingSync = null;
    
    // Setup graceful shutdown with error handling
    process.on('SIGINT', this.shutdown);
    process.on('SIGTERM', this.shutdown);
    process.on('uncaughtException', (error) => {
      this.errorHandler.handleError('UNCAUGHT_EXCEPTION', error, { critical: true });
      this.shutdown();
    });
    
    process.on('unhandledRejection', (reason, promise) => {
      this.errorHandler.handleError('UNHANDLED_REJECTION', reason, { 
        critical: true, 
        context: { promise } 
      });
    });
    
    // Additional cleanup for remote environments
    this.healthServer = null;
  }
  
  /**
   * Setup error handler implementations specific to sync server
   */
  setupErrorHandlerImplementations() {
    // Implement reconnection for WebSocket
    this.errorHandler.triggerReconnection = async (errorInfo) => {
      try {
        if (this.wss) {
          this.wss.close();
        }
        await this.startWebSocketServer();
        return true;
      } catch (error) {
        return false;
      }
    };
    
    // Implement default file creation
    this.errorHandler.createDefaultFiles = async (errorInfo) => {
      try {
        await this.ensureDesignDataFile();
        return true;
      } catch (error) {
        return false;
      }
    };
    
    // Implement backup creation
    this.errorHandler.createBackup = async (errorInfo) => {
      try {
        const backupDir = '.vds-backups';
        await fs.mkdir(backupDir, { recursive: true });
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileName = path.basename(this.config.designDataPath);
        const backupPath = path.join(backupDir, `${fileName}.${timestamp}.backup`);
        
        const content = await fs.readFile(this.config.designDataPath, 'utf8');
        await fs.writeFile(backupPath, content, 'utf8');
        
        console.log(`Created backup: ${backupPath}`);
        return true;
      } catch (error) {
        return false;
      }
    };
    
    // Implement reset to default
    this.errorHandler.resetToDefault = async (errorInfo) => {
      try {
        const defaultData = this.getDefaultDesignData();
        await this.saveDesignData(defaultData);
        return true;
      } catch (error) {
        return false;
      }
    };
    
    // Implement operation retry
    this.errorHandler.retryOperation = async (errorInfo) => {
      try {
        // Retry based on error context
        if (errorInfo.context && errorInfo.context.operation) {
          switch (errorInfo.context.operation) {
            case 'file_read':
              await fs.readFile(errorInfo.context.filePath, 'utf8');
              return true;
            case 'file_write':
              await fs.writeFile(errorInfo.context.filePath, errorInfo.context.content, 'utf8');
              return true;
            case 'websocket_connect':
              return await this.restartWebSocketServer();
            case 'devtools_connect':
              return await this.reconnectDevTools();
            default:
              return false;
          }
        }
        return false;
      } catch (error) {
        return false;
      }
    };
    
    // Implement sync server control
    this.errorHandler.stopSyncServer = async () => {
      try {
        if (this.wss) {
          this.wss.close();
        }
        if (this.fileWatcher) {
          await this.fileWatcher.close();
        }
        return true;
      } catch (error) {
        return false;
      }
    };
    
    this.errorHandler.startSyncServer = async () => {
      try {
        await this.startWebSocketServer();
        await this.startFileWatcher();
        return true;
      } catch (error) {
        return false;
      }
    };
    
    // Implement remote optimization
    this.errorHandler.enableCompression = () => {
      this.config.enableCompression = true;
      console.log('📦 Compression enabled for remote development');
    };
    
    this.errorHandler.increaseSyncThrottle = () => {
      this.config.syncThrottle = Math.max(this.config.syncThrottle * 2, 2000);
      console.log(`⏱️ Sync throttle increased to ${this.config.syncThrottle}ms for remote development`);
    };
    
    this.errorHandler.reduceFileWatcherSensitivity = () => {
      if (this.fileWatcher) {
        // Increase stabilityThreshold for remote environments
        this.fileWatcher.options.awaitWriteFinish.stabilityThreshold = 500;
        console.log('👀 File watcher sensitivity reduced for remote development');
      }
    };
  }
  
  /**
   * Detect the current environment (local, Codespaces, remote)
   */
  detectEnvironment() {
    const env = {
      isCodespaces: !!(process.env.CODESPACES || process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN),
      isContainer: !!(process.env.CONTAINER || process.env.DOCKER_CONTAINER),
      isRemote: !!(process.env.SSH_CLIENT || process.env.SSH_TTY || process.env.REMOTE_CONTAINERS),
      isVSCodeWeb: !!(process.env.VSCODE_WEB || process.env.BROWSER_ENV),
      platform: process.platform,
      nodeVersion: process.version
    };
    
    // Additional remote detection
    env.isRemote = env.isRemote || env.isCodespaces || env.isContainer || env.isVSCodeWeb;
    
    console.log('🌍 Environment detected:', env);
    return env;
  }
  
  /**
   * Get optimal host configuration based on environment
   */
  getOptimalHost(providedHost) {
    if (providedHost) return providedHost;
    
    if (this.environment.isCodespaces) {
      // In Codespaces, bind to all interfaces for port forwarding
      return '0.0.0.0';
    } else if (this.environment.isContainer) {
      // In containers, bind to all interfaces
      return '0.0.0.0';
    } else if (this.environment.isRemote) {
      // In other remote environments, bind to all interfaces
      return '0.0.0.0';
    }
    
    // Local development
    return 'localhost';
  }
  
  /**
   * Configure server for remote environments
   */
  configureForRemoteEnvironment() {
    if (this.environment.isCodespaces) {
      console.log('🚀 Configuring for GitHub Codespaces');
      
      // Set up port forwarding hints
      const port = this.config.port;
      console.log(`📡 Codespaces port forwarding: https://${process.env.CODESPACE_NAME}-${port}.${process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}`);
      
      // Optimize for network latency
      this.config.syncThrottle = Math.max(this.config.syncThrottle, 2000);
      this.config.enableCompression = true;
      
    } else if (this.environment.isContainer) {
      console.log('🐳 Configuring for container environment');
      
      // Container-specific optimizations
      this.config.maxFileSize = 512 * 1024; // 512KB limit
      this.config.enableCompression = true;
      
    } else if (this.environment.isRemote) {
      console.log('🌐 Configuring for remote development');
      
      // General remote optimizations
      this.config.syncThrottle = Math.max(this.config.syncThrottle, 1500);
      this.config.enableCompression = true;
    }
  }
  
  /**
   * Start the sync server
   */
  async start() {
    try {
      console.log(`🚀 Starting VDS Sync Server on ${this.config.host}:${this.config.port}`);
      
      // Configure for remote environments
      this.configureForRemoteEnvironment();
      
      // Initialize WebSocket server
      await this.startWebSocketServer();
      
      // Initialize file system watcher
      await this.startFileWatcher();
      
      // Initialize CSS-to-Canvas engine
      await this.initializeCSSToCanvasEngine();
      
      // Initialize Chrome DevTools connection
      await this.initializeDevToolsConnection();
      
      // Ensure design data file exists
      await this.ensureDesignDataFile();
      
      this.isRunning = true;
      this.startTime = Date.now();
      
      console.log('✅ VDS Sync Server started successfully');
      console.log(`📡 WebSocket server listening on ws://${this.config.host}:${this.config.port}`);
      console.log(`👀 Watching files: ${this.config.watchPaths.join(', ')}`);
      
      // Log environment-specific information
      if (this.environment.isCodespaces) {
        console.log(`🚀 GitHub Codespaces detected - optimized for remote development`);
        console.log(`🌐 Access via: https://${process.env.CODESPACE_NAME}-${this.config.port}.${process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}`);
      } else if (this.environment.isContainer) {
        console.log(`🐳 Container environment detected - optimized for containerized deployment`);
      } else if (this.environment.isRemote) {
        console.log(`🌐 Remote environment detected - optimized for network efficiency`);
      }
      
      // Start health check server for remote environments
      if (this.environment.isRemote) {
        this.startHealthCheckServer();
      }
      
      this.emit('started');
      
    } catch (error) {
      console.error('❌ Failed to start VDS Sync Server:', error);
      throw error;
    }
  }
  
  /**
   * Start WebSocket server for real-time communication
   */
  async startWebSocketServer() {
    return new Promise((resolve, reject) => {
      try {
        this.wss = new WebSocket.Server({
          port: this.config.port,
          host: this.config.host,
          // Enable compression for remote environments
          perMessageDeflate: this.config.enableCompression ? {
            zlibDeflateOptions: {
              level: 6,
              chunkSize: 1024
            },
            threshold: 1024,
            concurrencyLimit: 10
          } : false
        });
        
        this.wss.on('connection', this.handleConnection);
        
        this.wss.on('listening', () => {
          console.log(`📡 WebSocket server listening on port ${this.config.port}`);
          this.connectionRetries = 0; // Reset retry count on successful start
          resolve();
        });
        
        this.wss.on('error', async (error) => {
          console.error('WebSocket server error:', error);
          
          // Handle specific error types
          if (error.code === 'EADDRINUSE') {
            await this.errorHandler.handleError('PORT_IN_USE', error, {
              port: this.config.port,
              suggestions: [
                `Port ${this.config.port} is already in use`,
                'Try stopping other VDS instances',
                'Use a different port with --port option'
              ]
            });
          } else if (error.code === 'EACCES') {
            await this.errorHandler.handleError('PORT_PERMISSION_DENIED', error, {
              port: this.config.port,
              suggestions: [
                'Permission denied for port access',
                'Try using a port number above 1024',
                'Run with administrator privileges if needed'
              ]
            });
          } else {
            await this.errorHandler.handleError('WEBSOCKET_SERVER_ERROR', error, {
              port: this.config.port,
              host: this.config.host
            });
          }
          
          reject(error);
        });
        
      } catch (error) {
        this.errorHandler.handleError('WEBSOCKET_SETUP_ERROR', error, {
          port: this.config.port,
          host: this.config.host
        });
        reject(error);
      }
    });
  }
  
  /**
   * Handle new WebSocket connections
   */
  handleConnection(ws, request) {
    const clientId = this.generateClientId();
    ws.clientId = clientId;
    
    console.log(`🔌 Client connected: ${clientId} from ${request.socket.remoteAddress}`);
    this.clients.add(ws);
    
    // Send welcome message with server info
    this.sendToClient(ws, {
      type: 'SERVER_CONNECTED',
      payload: {
        clientId,
        serverVersion: '0.1.0',
        capabilities: ['file-sync', 'canvas-sync', 'devtools-sync']
      }
    });
    
    // Handle messages from client
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        this.handleMessage(ws, message);
      } catch (error) {
        console.error('Invalid message from client:', error);
        this.sendToClient(ws, {
          type: 'ERROR',
          payload: { message: 'Invalid JSON message' }
        });
      }
    });
    
    // Handle client disconnect
    ws.on('close', () => {
      console.log(`🔌 Client disconnected: ${clientId}`);
      this.clients.delete(ws);
    });
    
    // Handle client errors
    ws.on('error', (error) => {
      console.error(`Client error (${clientId}):`, error);
      this.clients.delete(ws);
    });
  }
  
  /**
   * Handle messages from WebSocket clients with comprehensive error handling
   */
  async handleMessage(ws, message) {
    const { type, payload } = message;
    
    try {
      // Validate message structure
      if (!type) {
        throw new Error('Message type is required');
      }
      
      // Log message for debugging
      this.errorHandler.log('debug', `Handling message: ${type}`, { payload });
      
      switch (type) {
        case 'CANVAS_SHAPE_DRAWN':
          await this.handleCanvasShapeDrawn(payload);
          this.broadcastToOthers(ws, message);
          break;
          
        case 'CANVAS_SHAPE_UPDATED':
          await this.handleCanvasShapeUpdated(payload);
          this.broadcastToOthers(ws, message);
          break;
          
        case 'CANVAS_SHAPE_DELETED':
          await this.handleCanvasShapeDeleted(payload);
          this.broadcastToOthers(ws, message);
          break;
          
        case 'REQUEST_DESIGN_DATA':
          await this.sendDesignData(ws);
          break;
          
        case 'REQUEST_CSS_SYNC':
          await this.handleCSSSync(payload);
          break;
          
        case 'CSS_FILE_UPDATED':
          await this.handleManualCSSUpdate(payload);
          break;
          
        case 'DEVTOOLS_REACT_PROPS_CHANGED':
          await this.handleReactPropsChange(payload);
          break;
          
        case 'DEVTOOLS_REDUX_ACTION':
          await this.handleReduxAction(payload);
          break;
          
        case 'PING':
          this.sendToClient(ws, { type: 'PONG', payload: { timestamp: Date.now() } });
          break;
          
        case 'ERROR_REPORT':
          // Handle client-side error reports
          await this.handleClientErrorReport(payload);
          break;
          
        default:
          const unknownTypeError = new Error(`Unknown message type: ${type}`);
          await this.errorHandler.handleError('UNKNOWN_MESSAGE_TYPE', unknownTypeError, {
            messageType: type,
            clientId: ws.clientId
          });
          
          this.sendToClient(ws, {
            type: 'ERROR',
            payload: { 
              message: `Unknown message type: ${type}`,
              code: 'UNKNOWN_MESSAGE_TYPE'
            }
          });
      }
    } catch (error) {
      // Handle message processing errors
      await this.errorHandler.handleError('MESSAGE_PROCESSING_ERROR', error, {
        messageType: type,
        clientId: ws.clientId,
        payload: payload
      });
      
      this.sendToClient(ws, {
        type: 'ERROR',
        payload: { 
          message: `Error processing ${type}: ${error.message}`,
          code: 'MESSAGE_PROCESSING_ERROR',
          messageType: type
        }
      });
    }
  }
  
  /**
   * Handle client-side error reports
   */
  async handleClientErrorReport(payload) {
    try {
      const { errorType, error, context } = payload;
      
      await this.errorHandler.handleError(`CLIENT_${errorType}`, error, {
        ...context,
        source: 'client'
      });
      
      // Broadcast error to other clients for awareness
      this.broadcast({
        type: 'CLIENT_ERROR_REPORTED',
        payload: {
          errorType,
          timestamp: Date.now(),
          context: context
        }
      });
      
    } catch (reportError) {
      console.error('Error handling client error report:', reportError);
    }
  }
  
  /**
   * Restart WebSocket server
   */
  async restartWebSocketServer() {
    try {
      console.log('🔄 Restarting WebSocket server...');
      
      if (this.wss) {
        this.wss.close();
        this.wss = null;
      }
      
      await this.delay(1000); // Wait for cleanup
      await this.startWebSocketServer();
      
      console.log('✅ WebSocket server restarted successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to restart WebSocket server:', error);
      return false;
    }
  }
  
  /**
   * Reconnect to Chrome DevTools
   */
  async reconnectDevTools() {
    try {
      console.log('🔄 Reconnecting to Chrome DevTools...');
      
      if (this.devToolsClient) {
        this.devToolsClient.close();
        this.devToolsClient = null;
      }
      
      this.devToolsConnected = false;
      
      await this.delay(2000); // Wait for Chrome to be ready
      await this.initializeDevToolsConnection();
      
      if (this.devToolsConnected) {
        console.log('✅ Chrome DevTools reconnected successfully');
        return true;
      } else {
        console.log('⚠️ Chrome DevTools reconnection failed, continuing without DevTools sync');
        return false;
      }
    } catch (error) {
      console.error('❌ Failed to reconnect to Chrome DevTools:', error);
      return false;
    }
  }
  
  /**
   * Enable graceful degradation mode
   */
  enableGracefulDegradation(mode) {
    console.log(`🛡️ Enabling graceful degradation mode: ${mode}`);
    
    switch (mode) {
      case 'no_devtools':
        this.devToolsConnected = false;
        this.broadcast({
          type: 'DEVTOOLS_UNAVAILABLE',
          payload: {
            message: 'Chrome DevTools sync is unavailable. Canvas and VS Code sync will continue to work.',
            timestamp: Date.now()
          }
        });
        break;
        
      case 'no_file_sync':
        this.config.enableFileSync = false;
        this.broadcast({
          type: 'FILE_SYNC_UNAVAILABLE',
          payload: {
            message: 'File sync is unavailable. Manual refresh may be required.',
            timestamp: Date.now()
          }
        });
        break;
        
      case 'offline':
        this.config.enableNetworkSync = false;
        this.broadcast({
          type: 'OFFLINE_MODE',
          payload: {
            message: 'Operating in offline mode. Changes will be queued until connection is restored.',
            timestamp: Date.now()
          }
        });
        break;
        
      default:
        console.log(`Unknown degradation mode: ${mode}`);
    }
  }
  
  /**
   * Handle network connectivity issues
   */
  async handleNetworkConnectivityIssue(error) {
    console.log('🌐 Network connectivity issue detected:', error.message);
    
    // Check if we're in a remote environment
    if (this.environment.isRemote) {
      await this.errorHandler.handleError('REMOTE_NETWORK_ISSUE', error, {
        environment: this.environment,
        suggestions: [
          'Check internet connection',
          'Verify port forwarding in remote environment',
          'Try restarting the remote development session'
        ]
      });
    } else {
      await this.errorHandler.handleError('LOCAL_NETWORK_ISSUE', error, {
        suggestions: [
          'Check local network connection',
          'Verify firewall settings',
          'Try restarting the sync server'
        ]
      });
    }
    
    // Enable offline mode
    this.enableGracefulDegradation('offline');
  }
  
  /**
   * Handle file permission issues
   */
  async handleFilePermissionIssue(filePath, error) {
    console.log(`📁 File permission issue for ${filePath}:`, error.message);
    
    const errorCode = error.code || 'UNKNOWN';
    
    await this.errorHandler.handleError(errorCode, error, {
      filePath,
      operation: 'file_access',
      suggestions: this.getFilePermissionSuggestions(errorCode, filePath)
    });
  }
  
  /**
   * Get file permission suggestions based on error code
   */
  getFilePermissionSuggestions(errorCode, filePath) {
    const suggestions = [];
    
    switch (errorCode) {
      case 'EACCES':
        suggestions.push(`Check permissions for ${filePath}`);
        suggestions.push('Ensure VS Code has write access to the project directory');
        suggestions.push('Close the file if it\'s open in another application');
        break;
        
      case 'ENOENT':
        suggestions.push(`Create missing directory: mkdir -p ${path.dirname(filePath)}`);
        suggestions.push('Verify the file path is correct');
        break;
        
      case 'ENOSPC':
        suggestions.push('Free up disk space');
        suggestions.push('Clear temporary files and caches');
        break;
        
      case 'EMFILE':
      case 'ENFILE':
        suggestions.push('Too many open files - restart VS Code');
        suggestions.push('Increase system file descriptor limits');
        break;
        
      default:
        suggestions.push('Check file system permissions and availability');
        suggestions.push('Try restarting VS Code');
    }
    
    return suggestions;
  }
  
  /**
   * Utility method for delays
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * Start file system watcher
   */
  async startFileWatcher() {
    try {
      this.fileWatcher = chokidar.watch(this.config.watchPaths, {
        ignored: /(^|[\/\\])\../, // ignore dotfiles
        persistent: true,
        ignoreInitial: true,
        awaitWriteFinish: {
          stabilityThreshold: 100,
          pollInterval: 50
        }
      });
      
      this.fileWatcher
        .on('change', (filePath) => this.handleFileChange('change', filePath))
        .on('add', (filePath) => this.handleFileChange('add', filePath))
        .on('unlink', (filePath) => this.handleFileChange('unlink', filePath))
        .on('error', (error) => console.error('File watcher error:', error));
      
      console.log('👀 File system watcher started');
      
    } catch (error) {
      console.error('Failed to start file watcher:', error);
      throw error;
    }
  }
  
  /**
   * Initialize CSS-to-Canvas engine
   */
  async initializeCSSToCanvasEngine() {
    try {
      // Set up callback for canvas updates
      this.cssToCanvasEngine.updateCallbacks.push((canvasData, changeInfo) => {
        if (canvasData) {
          this.broadcast({
            type: 'CANVAS_UPDATED_FROM_CSS',
            payload: {
              canvasData,
              changeInfo,
              timestamp: Date.now()
            }
          });
        } else if (changeInfo && changeInfo.error) {
          this.broadcast({
            type: 'CSS_PARSE_ERROR',
            payload: {
              error: changeInfo.error,
              filePath: changeInfo.filePath,
              timestamp: Date.now()
            }
          });
        }
      });
      
      console.log('🎨 CSS-to-Canvas engine initialized');
    } catch (error) {
      console.error('Failed to initialize CSS-to-Canvas engine:', error);
      throw error;
    }
  }

  /**
   * Handle file system changes - Part of VS Code Editor → Canvas → Live App sync flow
   * Optimized for remote environments with throttling
   */
  async handleFileChange(eventType, filePath) {
    console.log(`📁 File ${eventType}: ${filePath} - Starting VS Code → Canvas → Live App sync`);
    
    // Throttle file changes in remote environments
    if (this.environment.isRemote) {
      const now = Date.now();
      if (now - this.lastSyncTime < this.config.syncThrottle) {
        // Debounce rapid file changes
        if (this.pendingSync) {
          clearTimeout(this.pendingSync);
        }
        
        this.pendingSync = setTimeout(() => {
          this.handleFileChangeImmediate(eventType, filePath);
        }, this.config.syncThrottle);
        
        return;
      }
      
      this.lastSyncTime = now;
    }
    
    await this.handleFileChangeImmediate(eventType, filePath);
  }
  
  /**
   * Handle file change immediately (internal method)
   */
  async handleFileChangeImmediate(eventType, filePath) {
    try {
      // Special handling for design data file
      if (filePath.endsWith('design-data.json')) {
        await this.handleDesignDataChange(eventType, filePath);
        return;
      }
      
      // Special handling for CSS files - VS Code Editor → Canvas sync
      if (filePath.endsWith('.css') || filePath.endsWith('.scss')) {
        await this.handleCSSFileChange(eventType, filePath);
        return;
      }
      
      // Handle JavaScript/TypeScript files - VS Code Editor → Live App sync
      if (filePath.endsWith('.js') || filePath.endsWith('.jsx') || 
          filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
        await this.handleJSFileChange(eventType, filePath);
        return;
      }
      
      // Handle other file types
      const fileInfo = await this.getFileInfo(filePath);
      
      this.broadcast({
        type: 'FILE_CHANGED',
        payload: {
          eventType,
          filePath,
          fileInfo,
          timestamp: Date.now()
        }
      });
      
    } catch (error) {
      console.error(`Error handling file change for ${filePath}:`, error);
    }
  }

  /**
   * Handle CSS file changes and update canvas - VS Code Editor → Canvas sync flow
   */
  async handleCSSFileChange(eventType, filePath) {
    console.log(`🎨 CSS file ${eventType}: ${filePath} - VS Code Editor → Canvas sync`);
    
    try {
      if (eventType === 'change' || eventType === 'add') {
        // Step 1: Parse CSS changes and convert to canvas elements
        await this.cssToCanvasEngine.handleCSSFileChange(filePath);
        
        // Step 2: Trigger live app hot reload (handled by existing file watcher)
        console.log(`✅ VS Code Editor → Canvas sync completed for: ${filePath}`);
        
        // Step 3: Notify Chrome DevTools of changes (if connected)
        await this.notifyDevToolsOfCSSChange(filePath);
        
      } else if (eventType === 'unlink') {
        // Handle CSS file deletion
        await this.handleCSSFileDeleted(filePath);
      }
      
      // Broadcast the file change event to all clients
      const fileInfo = await this.getFileInfo(filePath);
      
      this.broadcast({
        type: 'CSS_FILE_CHANGED',
        payload: {
          eventType,
          filePath,
          fileInfo,
          syncFlow: 'vscode-to-canvas-to-liveapp',
          timestamp: Date.now()
        }
      });
      
    } catch (error) {
      console.error(`Error handling CSS file change for ${filePath}:`, error);
      
      this.broadcast({
        type: 'CSS_PARSE_ERROR',
        payload: {
          error: error.message,
          filePath,
          eventType,
          timestamp: Date.now()
        }
      });
    }
  }

  /**
   * Handle CSS file deletion
   */
  async handleCSSFileDeleted(filePath) {
    try {
      const designData = await this.loadDesignData();
      
      // Remove elements that came from the deleted CSS file
      if (designData.elements) {
        const originalCount = designData.elements.length;
        designData.elements = designData.elements.filter(el => el.sourceFile !== filePath);
        const removedCount = originalCount - designData.elements.length;
        
        if (removedCount > 0) {
          designData.metadata = {
            ...designData.metadata,
            lastUpdated: new Date().toISOString(),
            updatedFrom: `deleted:${filePath}`,
            changeType: 'css-file-deleted'
          };
          
          await this.saveDesignData(designData);
          
          this.broadcast({
            type: 'CANVAS_UPDATED_FROM_CSS',
            payload: {
              canvasData: designData,
              changeInfo: {
                filePath,
                changeType: 'css-file-deleted',
                removedElements: removedCount,
                timestamp: Date.now()
              }
            }
          });
          
          console.log(`🗑️ Removed ${removedCount} elements from deleted CSS file: ${filePath}`);
        }
      }
    } catch (error) {
      console.error(`Error handling CSS file deletion for ${filePath}:`, error);
    }
  }
  
  /**
   * Handle design data file changes
   */
  async handleDesignDataChange(eventType, filePath) {
    if (eventType === 'change') {
      try {
        const designData = await this.loadDesignData();
        
        this.broadcast({
          type: 'DESIGN_DATA_UPDATED',
          payload: {
            designData,
            timestamp: Date.now()
          }
        });
        
      } catch (error) {
        console.error('Error loading updated design data:', error);
      }
    }
  }
  
  /**
   * Handle canvas shape drawn event - Part of Canvas → Code → Live App sync flow
   */
  async handleCanvasShapeDrawn(payload) {
    try {
      console.log('🎨 Canvas shape drawn, starting sync flow:', payload.type);
      
      const designData = await this.loadDesignData();
      
      // Add new shape to design data
      if (!designData.elements) {
        designData.elements = [];
      }
      
      const newElement = {
        id: payload.elementId,
        type: payload.type,
        position: payload.position,
        size: payload.size,
        style: payload.style,
        layerId: payload.layerId || 'layer_001',
        timestamp: Date.now(),
        sourceType: 'canvas'
      };
      
      designData.elements.push(newElement);
      
      // Update metadata
      designData.metadata = {
        ...designData.metadata,
        lastUpdated: new Date().toISOString(),
        updatedFrom: 'canvas',
        changeType: 'shape-drawn'
      };
      
      await this.saveDesignData(designData);
      
      // Step 1: Generate CSS from canvas changes
      await this.generateCSSFromCanvasChange(newElement, designData);
      
      // Step 2: Trigger live app reload (handled by file watcher)
      console.log('✅ Canvas → Code sync completed');
      
    } catch (error) {
      console.error('Error handling canvas shape drawn:', error);
      throw error;
    }
  }
  
  /**
   * Handle canvas shape updated event - Part of Canvas → Code → Live App sync flow
   */
  async handleCanvasShapeUpdated(payload) {
    try {
      console.log('🎨 Canvas shape updated, starting sync flow:', payload.elementId);
      
      const designData = await this.loadDesignData();
      
      if (designData.elements) {
        const elementIndex = designData.elements.findIndex(el => el.id === payload.elementId);
        if (elementIndex !== -1) {
          const oldElement = designData.elements[elementIndex];
          
          // Update existing element
          const updatedElement = {
            ...oldElement,
            ...payload,
            timestamp: Date.now(),
            sourceType: 'canvas'
          };
          
          designData.elements[elementIndex] = updatedElement;
          
          // Update metadata
          designData.metadata = {
            ...designData.metadata,
            lastUpdated: new Date().toISOString(),
            updatedFrom: 'canvas',
            changeType: 'shape-updated'
          };
          
          await this.saveDesignData(designData);
          
          // Step 1: Update CSS from canvas changes
          await this.updateCSSFromCanvasChange(updatedElement, oldElement, designData);
          
          // Step 2: Trigger live app reload (handled by file watcher)
          console.log('✅ Canvas → Code sync completed');
        }
      }
      
    } catch (error) {
      console.error('Error handling canvas shape updated:', error);
      throw error;
    }
  }
  
  /**
   * Handle canvas shape deleted event
   */
  async handleCanvasShapeDeleted(payload) {
    try {
      const designData = await this.loadDesignData();
      
      if (designData.elements) {
        designData.elements = designData.elements.filter(el => el.id !== payload.elementId);
        await this.saveDesignData(designData);
      }
      
    } catch (error) {
      console.error('Error handling canvas shape deleted:', error);
      throw error;
    }
  }
  
  /**
   * Send design data to a specific client
   */
  async sendDesignData(ws) {
    try {
      const designData = await this.loadDesignData();
      
      this.sendToClient(ws, {
        type: 'DESIGN_DATA_RESPONSE',
        payload: { designData }
      });
      
    } catch (error) {
      console.error('Error sending design data:', error);
      this.sendToClient(ws, {
        type: 'ERROR',
        payload: { message: 'Failed to load design data' }
      });
    }
  }
  
  /**
   * Load design data from file with comprehensive error handling
   */
  async loadDesignData() {
    try {
      const data = await fs.readFile(this.config.designDataPath, 'utf8');
      
      try {
        return JSON.parse(data);
      } catch (parseError) {
        // Handle JSON parse errors
        await this.errorHandler.handleError('JSON_PARSE_ERROR', parseError, {
          filePath: this.config.designDataPath,
          operation: 'parse_design_data'
        });
        
        // Return default data as fallback
        return this.getDefaultDesignData();
      }
      
    } catch (error) {
      if (error.code === 'ENOENT') {
        // File doesn't exist, handle gracefully
        await this.errorHandler.handleError('FILE_NOT_FOUND', error, {
          filePath: this.config.designDataPath,
          operation: 'load_design_data'
        });
        return this.getDefaultDesignData();
      } else if (error.code === 'EACCES') {
        // Permission denied
        await this.errorHandler.handleError('FILE_PERMISSION_ERROR', error, {
          filePath: this.config.designDataPath,
          operation: 'read_design_data'
        });
        throw error;
      } else {
        // Other file system errors
        await this.errorHandler.handleError('FILE_SYSTEM_ERROR', error, {
          filePath: this.config.designDataPath,
          operation: 'load_design_data'
        });
        throw error;
      }
    }
  }
  
  /**
   * Save design data to file with comprehensive error handling
   */
  async saveDesignData(designData) {
    try {
      // Validate design data before saving
      if (!designData || typeof designData !== 'object') {
        throw new Error('Invalid design data: must be an object');
      }
      
      // Ensure directory exists
      const dir = path.dirname(this.config.designDataPath);
      await fs.mkdir(dir, { recursive: true });
      
      // Create backup before overwriting
      try {
        await fs.access(this.config.designDataPath);
        await this.errorHandler.createBackup({ context: { filePath: this.config.designDataPath } });
      } catch (accessError) {
        // File doesn't exist yet, no backup needed
      }
      
      // Write file with pretty formatting
      const jsonContent = JSON.stringify(designData, null, 2);
      await fs.writeFile(this.config.designDataPath, jsonContent, 'utf8');
      
      console.log(`✅ Design data saved to ${this.config.designDataPath}`);
      
    } catch (error) {
      if (error.code === 'EACCES') {
        await this.errorHandler.handleError('FILE_PERMISSION_ERROR', error, {
          filePath: this.config.designDataPath,
          operation: 'write_design_data'
        });
      } else if (error.code === 'ENOSPC') {
        await this.errorHandler.handleError('DISK_FULL_ERROR', error, {
          filePath: this.config.designDataPath,
          operation: 'write_design_data'
        });
      } else {
        await this.errorHandler.handleError('FILE_WRITE_ERROR', error, {
          filePath: this.config.designDataPath,
          operation: 'save_design_data'
        });
      }
      
      console.error('Error saving design data:', error);
      throw error;
    }
  }
  
  /**
   * Ensure design data file exists with default structure
   */
  async ensureDesignDataFile() {
    try {
      await fs.access(this.config.designDataPath);
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.log('📄 Creating default design data file');
        await this.saveDesignData(this.getDefaultDesignData());
      }
    }
  }
  
  /**
   * Get default design data structure
   */
  getDefaultDesignData() {
    return {
      canvas: {
        width: 1920,
        height: 1080,
        backgroundColor: "#ffffff",
        grid: { size: 8, visible: true }
      },
      layers: [
        {
          id: "layer_001",
          name: "Background",
          visible: true,
          locked: false,
          elements: []
        }
      ],
      elements: [],
      colorPalette: [
        { name: "Primary", color: "#007bff", usage: "buttons" },
        { name: "Secondary", color: "#6c757d", usage: "text" }
      ],
      designTokens: {
        spacing: { xs: 4, sm: 8, md: 16, lg: 24 },
        colors: { primary: "#007bff", secondary: "#6c757d" }
      },
      metadata: {
        version: "1.0.0",
        created: new Date().toISOString(),
        lastModified: new Date().toISOString()
      }
    };
  }
  
  /**
   * Get file information for change events
   */
  async getFileInfo(filePath) {
    try {
      const stats = await fs.stat(filePath);
      const ext = path.extname(filePath);
      
      // Check file size limits for remote environments
      if (this.environment.isRemote && stats.size > this.config.maxFileSize) {
        console.warn(`⚠️ File ${filePath} (${stats.size} bytes) exceeds size limit for remote environment`);
        return {
          size: stats.size,
          modified: stats.mtime.toISOString(),
          extension: ext,
          type: this.getFileType(ext),
          oversized: true,
          sizeLimit: this.config.maxFileSize
        };
      }
      
      return {
        size: stats.size,
        modified: stats.mtime.toISOString(),
        extension: ext,
        type: this.getFileType(ext),
        oversized: false
      };
    } catch (error) {
      return null;
    }
  }
  
  /**
   * Determine file type from extension
   */
  getFileType(extension) {
    const typeMap = {
      '.js': 'javascript',
      '.jsx': 'javascript',
      '.ts': 'typescript',
      '.tsx': 'typescript',
      '.css': 'stylesheet',
      '.scss': 'stylesheet',
      '.json': 'data'
    };
    
    return typeMap[extension] || 'unknown';
  }
  
  /**
   * Send message to specific client with compression optimization
   */
  sendToClient(ws, message) {
    if (ws.readyState === WebSocket.OPEN) {
      const messageStr = JSON.stringify(message);
      
      // For large messages in remote environments, add metadata
      if (this.environment.isRemote && messageStr.length > 10000) {
        const compressedMessage = {
          ...message,
          metadata: {
            originalSize: messageStr.length,
            compressed: true,
            timestamp: Date.now(),
            environment: 'remote'
          }
        };
        ws.send(JSON.stringify(compressedMessage));
      } else {
        ws.send(messageStr);
      }
    }
  }
  
  /**
   * Broadcast message to all connected clients
   */
  broadcast(message) {
    this.clients.forEach(client => {
      this.sendToClient(client, message);
    });
  }
  
  /**
   * Broadcast message to all clients except sender
   */
  broadcastToOthers(sender, message) {
    this.clients.forEach(client => {
      if (client !== sender) {
        this.sendToClient(client, message);
      }
    });
  }
  
  /**
   * Generate unique client ID
   */
  generateClientId() {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * Handle CSS sync request
   */
  async handleCSSSync(payload) {
    try {
      const { cssFiles } = payload;
      
      if (cssFiles && cssFiles.length > 0) {
        console.log(`🔄 Manual CSS sync requested for ${cssFiles.length} files`);
        
        // Convert CSS files to canvas data
        const canvasData = await this.cssToCanvasEngine.convertCSSToCanvas(cssFiles);
        
        // Save updated canvas data
        await this.saveDesignData(canvasData);
        
        // Broadcast update to all clients
        this.broadcast({
          type: 'CANVAS_UPDATED_FROM_CSS',
          payload: {
            canvasData,
            changeInfo: {
              changeType: 'manual-css-sync',
              processedFiles: cssFiles,
              timestamp: Date.now()
            }
          }
        });
        
        console.log(`✅ Manual CSS sync completed for ${cssFiles.length} files`);
      }
    } catch (error) {
      console.error('Error handling CSS sync:', error);
      
      this.broadcast({
        type: 'CSS_SYNC_ERROR',
        payload: {
          error: error.message,
          timestamp: Date.now()
        }
      });
    }
  }

  /**
   * Handle manual CSS update
   */
  async handleManualCSSUpdate(payload) {
    try {
      const { filePath, cssContent } = payload;
      
      if (filePath && cssContent) {
        console.log(`📝 Manual CSS update for: ${filePath}`);
        
        // Write CSS content to file
        await fs.writeFile(filePath, cssContent, 'utf8');
        
        // Trigger CSS-to-Canvas conversion
        await this.cssToCanvasEngine.handleCSSFileChange(filePath);
        
        console.log(`✅ Manual CSS update completed for: ${filePath}`);
      }
    } catch (error) {
      console.error('Error handling manual CSS update:', error);
      
      this.broadcast({
        type: 'CSS_UPDATE_ERROR',
        payload: {
          error: error.message,
          filePath: payload.filePath,
          timestamp: Date.now()
        }
      });
    }
  }

  /**
   * Start health check HTTP server for remote environments
   */
  startHealthCheckServer() {
    const http = require('http');
    const healthPort = this.config.port + 1;
    
    const healthServer = http.createServer((req, res) => {
      res.writeHead(200, { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      });
      
      const status = this.getStatus();
      res.end(JSON.stringify({
        ...status,
        environment: this.environment,
        timestamp: new Date().toISOString()
      }, null, 2));
    });
    
    healthServer.listen(healthPort, this.config.host, () => {
      console.log(`🏥 Health check server listening on ${this.config.host}:${healthPort}`);
      
      if (this.environment.isCodespaces) {
        console.log(`🏥 Health check URL: https://${process.env.CODESPACE_NAME}-${healthPort}.${process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}`);
      }
    });
    
    this.healthServer = healthServer;
  }
  
  /**
   * Get server status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      port: this.config.port,
      host: this.config.host,
      connectedClients: this.clients.size,
      watchedPaths: this.config.watchPaths,
      cssToCanvasEnabled: !!this.cssToCanvasEngine,
      uptime: this.isRunning ? Date.now() - this.startTime : 0,
      environment: this.environment,
      config: {
        syncThrottle: this.config.syncThrottle,
        maxFileSize: this.config.maxFileSize,
        enableCompression: this.config.enableCompression
      }
    };
  }
  
  /**
   * Generate CSS from canvas changes - Canvas → Code sync flow
   */
  async generateCSSFromCanvasChange(element, designData) {
    try {
      const CanvasToCSSEngine = require('./canvas-to-css-engine');
      const canvasToCSSEngine = new CanvasToCSSEngine({
        outputDir: 'src/styles',
        generateTokens: true,
        generateComponents: true
      });
      
      // Generate CSS for the new element
      const elementCSS = this.generateElementCSS(element);
      
      // Update components.css file
      const componentsPath = 'src/styles/components.css';
      await this.updateOrCreateCSSFile(componentsPath, elementCSS, element.id);
      
      // Update design tokens if color palette changed
      if (element.style && element.style.fill && !this.colorExistsInPalette(element.style.fill, designData)) {
        await this.updateColorPalette(element.style.fill, designData);
        await this.regenerateDesignTokens(designData);
      }
      
      console.log(`🎨 Generated CSS for element: ${element.id}`);
      
      // Broadcast CSS update to all clients
      this.broadcast({
        type: 'CSS_GENERATED_FROM_CANVAS',
        payload: {
          elementId: element.id,
          cssPath: componentsPath,
          css: elementCSS,
          timestamp: Date.now()
        }
      });
      
    } catch (error) {
      console.error('Error generating CSS from canvas change:', error);
      throw error;
    }
  }

  /**
   * Update CSS from canvas changes - Canvas → Code sync flow
   */
  async updateCSSFromCanvasChange(updatedElement, oldElement, designData) {
    try {
      // Generate updated CSS for the element
      const elementCSS = this.generateElementCSS(updatedElement);
      
      // Update components.css file
      const componentsPath = 'src/styles/components.css';
      await this.updateOrCreateCSSFile(componentsPath, elementCSS, updatedElement.id);
      
      console.log(`🎨 Updated CSS for element: ${updatedElement.id}`);
      
      // Broadcast CSS update to all clients
      this.broadcast({
        type: 'CSS_UPDATED_FROM_CANVAS',
        payload: {
          elementId: updatedElement.id,
          cssPath: componentsPath,
          css: elementCSS,
          timestamp: Date.now()
        }
      });
      
    } catch (error) {
      console.error('Error updating CSS from canvas change:', error);
      throw error;
    }
  }

  /**
   * Generate CSS for a single element
   */
  generateElementCSS(element) {
    const className = `vds-${element.type}-${element.id}`;
    let css = `/* Generated from canvas element: ${element.id} */\n`;
    css += `.${className} {\n`;
    
    // Position and size
    if (element.position) {
      css += `  position: absolute;\n`;
      css += `  left: ${element.position.x}px;\n`;
      css += `  top: ${element.position.y}px;\n`;
    }
    
    if (element.size) {
      css += `  width: ${element.size.width}px;\n`;
      css += `  height: ${element.size.height}px;\n`;
    }
    
    // Style properties
    if (element.style) {
      if (element.style.fill) {
        css += `  background-color: ${element.style.fill};\n`;
      }
      
      if (element.style.stroke) {
        css += `  border: ${element.style.strokeWidth || 1}px solid ${element.style.stroke};\n`;
      }
      
      if (element.style.borderRadius) {
        css += `  border-radius: ${element.style.borderRadius}px;\n`;
      }
      
      if (element.style.opacity !== undefined) {
        css += `  opacity: ${element.style.opacity};\n`;
      }
    }
    
    // Element-specific properties
    switch (element.type) {
      case 'rectangle':
        css += `  display: block;\n`;
        if (element.hasText) {
          css += `  display: flex;\n`;
          css += `  align-items: center;\n`;
          css += `  justify-content: center;\n`;
          css += `  cursor: pointer;\n`;
        }
        break;
      case 'circle':
        css += `  border-radius: 50%;\n`;
        css += `  display: block;\n`;
        break;
      case 'text':
        css += `  display: inline-block;\n`;
        if (element.style.fontSize) css += `  font-size: ${element.style.fontSize}px;\n`;
        if (element.style.fontWeight) css += `  font-weight: ${element.style.fontWeight};\n`;
        if (element.style.color) css += `  color: ${element.style.color};\n`;
        break;
    }
    
    css += `}\n\n`;
    
    // Add hover states for interactive elements
    if (element.type === 'rectangle' && element.hasText) {
      css += `.${className}:hover {\n`;
      css += `  transform: translateY(-1px);\n`;
      css += `  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);\n`;
      css += `}\n\n`;
    }
    
    return css;
  }
  
  /**
   * Graceful shutdown
   */
  async shutdown() {
    if (!this.isRunning) return;
    
    console.log('🛑 Shutting down VDS Sync Server...');
    this.isRunning = false;
    
    try {
      // Close WebSocket server
      if (this.wss) {
        this.wss.close();
        console.log('📡 WebSocket server closed');
      }
      
      // Close health check server
      if (this.healthServer) {
        this.healthServer.close();
        console.log('🏥 Health check server closed');
      }
      
      // Close file watcher
      if (this.fileWatcher) {
        await this.fileWatcher.close();
        console.log('👀 File watcher closed');
      }
      
      // Close DevTools connection
      if (this.devToolsClient) {
        await this.devToolsClient.close();
        console.log('🔧 DevTools connection closed');
      }
      
      console.log('✅ VDS Sync Server shutdown complete');
      process.exit(0);
      
    } catch (error) {
      console.error('❌ Error during shutdown:', error);
      process.exit(1);
    }
  }

  /**
   * Update or create CSS file with element styles
   */
  async updateOrCreateCSSFile(filePath, elementCSS, elementId) {
    try {
      let existingCSS = '';
      
      try {
        existingCSS = await fs.readFile(filePath, 'utf8');
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
        // File doesn't exist, will create new
        existingCSS = '/* Generated Component Styles */\n\n';
      }
      
      // Remove existing CSS for this element if it exists
      const elementRegex = new RegExp(`/\\* Generated from canvas element: ${elementId} \\*/[\\s\\S]*?(?=\\/\\*|$)`, 'g');
      existingCSS = existingCSS.replace(elementRegex, '');
      
      // Add new CSS
      const updatedCSS = existingCSS.trim() + '\n\n' + elementCSS;
      
      // Ensure directory exists
      const dir = path.dirname(filePath);
      await fs.mkdir(dir, { recursive: true });
      
      // Write updated CSS
      await fs.writeFile(filePath, updatedCSS, 'utf8');
      
      console.log(`📝 Updated CSS file: ${filePath}`);
      
    } catch (error) {
      console.error('Error updating CSS file:', error);
      throw error;
    }
  }

  /**
   * Check if color exists in palette
   */
  colorExistsInPalette(color, designData) {
    if (!designData.colorPalette) return false;
    return designData.colorPalette.some(paletteColor => paletteColor.color === color);
  }

  /**
   * Update color palette with new color
   */
  async updateColorPalette(color, designData) {
    if (!designData.colorPalette) {
      designData.colorPalette = [];
    }
    
    const colorName = this.generateColorName(color);
    designData.colorPalette.push({
      name: colorName,
      color: color,
      usage: 'auto-generated',
      timestamp: Date.now()
    });
    
    await this.saveDesignData(designData);
  }

  /**
   * Generate a name for a color
   */
  generateColorName(color) {
    const colorNames = {
      '#ff0000': 'Red',
      '#00ff00': 'Green', 
      '#0000ff': 'Blue',
      '#ffff00': 'Yellow',
      '#ff00ff': 'Magenta',
      '#00ffff': 'Cyan',
      '#000000': 'Black',
      '#ffffff': 'White'
    };
    
    return colorNames[color.toLowerCase()] || `Color-${color.substring(1)}`;
  }

  /**
   * Regenerate design tokens from updated palette
   */
  async regenerateDesignTokens(designData) {
    try {
      const TokenGenerator = require('./token-generator');
      const tokenGenerator = new TokenGenerator();
      
      const tokens = tokenGenerator.generateAllTokens(designData);
      
      // Update design tokens CSS
      const tokensPath = 'src/styles/design-tokens.css';
      await fs.writeFile(tokensPath, tokens.css, 'utf8');
      
      console.log('🎨 Regenerated design tokens');
      
    } catch (error) {
      console.error('Error regenerating design tokens:', error);
    }
  }

  /**
   * Handle JavaScript/TypeScript file changes - VS Code Editor → Live App sync flow
   */
  async handleJSFileChange(eventType, filePath) {
    console.log(`⚡ JS/TS file ${eventType}: ${filePath} - VS Code Editor → Live App sync`);
    
    try {
      if (eventType === 'change' || eventType === 'add') {
        // Step 1: Parse JS/TS changes for component updates
        const componentInfo = await this.parseJSFileForComponents(filePath);
        
        // Step 2: Update design data if component props changed
        if (componentInfo && componentInfo.hasDesignProps) {
          await this.updateDesignDataFromComponent(componentInfo, filePath);
        }
        
        // Step 3: Trigger live app hot reload (handled by existing file watcher)
        console.log(`✅ VS Code Editor → Live App sync completed for: ${filePath}`);
        
        // Step 4: Notify React/Redux DevTools of changes (if connected)
        await this.notifyDevToolsOfJSChange(filePath, componentInfo);
      }
      
      // Broadcast the file change event
      const fileInfo = await this.getFileInfo(filePath);
      
      this.broadcast({
        type: 'JS_FILE_CHANGED',
        payload: {
          eventType,
          filePath,
          fileInfo,
          syncFlow: 'vscode-to-liveapp',
          timestamp: Date.now()
        }
      });
      
    } catch (error) {
      console.error(`Error handling JS file change for ${filePath}:`, error);
      
      this.broadcast({
        type: 'JS_PARSE_ERROR',
        payload: {
          error: error.message,
          filePath,
          eventType,
          timestamp: Date.now()
        }
      });
    }
  }

  /**
   * Parse JavaScript/TypeScript file for component information
   */
  async parseJSFileForComponents(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      
      // Simple regex-based parsing for React components
      // In a production system, you'd use a proper AST parser
      const componentRegex = /(?:function|const|class)\s+(\w+).*?(?:React\.Component|FC|FunctionComponent)/g;
      const propsRegex = /interface\s+(\w+Props)\s*{([^}]+)}/g;
      const useKiroRegex = /useKiroData\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g;
      
      const components = [];
      let match;
      
      // Find React components
      while ((match = componentRegex.exec(content)) !== null) {
        components.push({
          name: match[1],
          type: 'react-component'
        });
      }
      
      // Find component props interfaces
      const propsInterfaces = [];
      while ((match = propsRegex.exec(content)) !== null) {
        propsInterfaces.push({
          name: match[1],
          properties: match[2]
        });
      }
      
      // Find useKiroData hooks (indicates design-connected components)
      const kiroConnections = [];
      while ((match = useKiroRegex.exec(content)) !== null) {
        kiroConnections.push({
          componentId: match[1]
        });
      }
      
      return {
        filePath,
        components,
        propsInterfaces,
        kiroConnections,
        hasDesignProps: kiroConnections.length > 0,
        timestamp: Date.now()
      };
      
    } catch (error) {
      console.error('Error parsing JS file:', error);
      return null;
    }
  }

  /**
   * Update design data from component changes
   */
  async updateDesignDataFromComponent(componentInfo, filePath) {
    try {
      const designData = await this.loadDesignData();
      
      // Update component metadata in design data
      if (!designData.components) {
        designData.components = [];
      }
      
      // Update or add component information
      for (const kiroConnection of componentInfo.kiroConnections) {
        const existingIndex = designData.components.findIndex(c => c.id === kiroConnection.componentId);
        
        const componentData = {
          id: kiroConnection.componentId,
          filePath: filePath,
          components: componentInfo.components,
          propsInterfaces: componentInfo.propsInterfaces,
          lastUpdated: new Date().toISOString(),
          sourceType: 'vscode-editor'
        };
        
        if (existingIndex !== -1) {
          designData.components[existingIndex] = componentData;
        } else {
          designData.components.push(componentData);
        }
      }
      
      // Update metadata
      designData.metadata = {
        ...designData.metadata,
        lastUpdated: new Date().toISOString(),
        updatedFrom: 'vscode-editor',
        changeType: 'component-updated'
      };
      
      await this.saveDesignData(designData);
      
      console.log(`📝 Updated design data from component changes in: ${filePath}`);
      
    } catch (error) {
      console.error('Error updating design data from component:', error);
    }
  }

  /**
   * Notify Chrome DevTools of CSS changes
   */
  async notifyDevToolsOfCSSChange(filePath) {
    try {
      // This would integrate with VS Code's Chrome debugger
      // For now, we'll broadcast the event for potential DevTools integration
      this.broadcast({
        type: 'DEVTOOLS_CSS_CHANGE_NOTIFICATION',
        payload: {
          filePath,
          changeType: 'css-file-updated',
          timestamp: Date.now()
        }
      });
      
      console.log(`🔧 Notified DevTools of CSS change: ${filePath}`);
      
    } catch (error) {
      console.error('Error notifying DevTools of CSS change:', error);
    }
  }

  /**
   * Notify Chrome DevTools of JavaScript changes
   */
  async notifyDevToolsOfJSChange(filePath, componentInfo) {
    try {
      // This would integrate with React/Redux DevTools
      // For now, we'll broadcast the event for potential DevTools integration
      this.broadcast({
        type: 'DEVTOOLS_JS_CHANGE_NOTIFICATION',
        payload: {
          filePath,
          componentInfo,
          changeType: 'js-file-updated',
          timestamp: Date.now()
        }
      });
      
      console.log(`🔧 Notified DevTools of JS change: ${filePath}`);
      
    } catch (error) {
      console.error('Error notifying DevTools of JS change:', error);
    }
  }

  /**
   * Initialize Chrome DevTools Protocol connection
   */
  async initializeDevToolsConnection() {
    try {
      console.log('🔧 Attempting to connect to Chrome DevTools...');
      
      // Try to connect to Chrome DevTools Protocol
      // This requires Chrome to be running with --remote-debugging-port=9222
      const CDP = await this.loadCDPModule();
      
      if (CDP) {
        this.devToolsClient = await CDP({ port: this.devToolsPort });
        
        // Enable necessary domains
        const { Runtime, DOM, CSS, Page } = this.devToolsClient;
        await Runtime.enable();
        await DOM.enable();
        await CSS.enable();
        await Page.enable();
        
        // Set up event listeners for DevTools changes
        this.setupDevToolsEventListeners();
        
        this.devToolsConnected = true;
        console.log('✅ Connected to Chrome DevTools Protocol');
        
        this.broadcast({
          type: 'DEVTOOLS_CONNECTED',
          payload: {
            port: this.devToolsPort,
            timestamp: Date.now()
          }
        });
        
      } else {
        console.log('⚠️ Chrome DevTools Protocol not available - continuing without DevTools integration');
      }
      
    } catch (error) {
      console.log('⚠️ Could not connect to Chrome DevTools:', error.message);
      console.log('💡 To enable DevTools integration, start Chrome with: --remote-debugging-port=9222');
      this.devToolsConnected = false;
    }
  }

  /**
   * Load Chrome DevTools Protocol module
   */
  async loadCDPModule() {
    try {
      // Try to require chrome-remote-interface
      return require('chrome-remote-interface');
    } catch (error) {
      console.log('📦 chrome-remote-interface not installed - DevTools integration disabled');
      console.log('💡 Install with: npm install chrome-remote-interface');
      return null;
    }
  }

  /**
   * Set up Chrome DevTools event listeners
   */
  setupDevToolsEventListeners() {
    if (!this.devToolsClient) return;
    
    const { Runtime, DOM, CSS } = this.devToolsClient;
    
    // Listen for CSS style changes in DevTools
    CSS.styleSheetChanged(async (params) => {
      console.log('🔧 CSS changed in DevTools:', params.styleSheetId);
      await this.handleDevToolsCSSChange(params);
    });
    
    // Listen for DOM modifications in DevTools
    DOM.attributeModified(async (params) => {
      console.log('🔧 DOM attribute modified in DevTools:', params.name);
      await this.handleDevToolsDOMChange(params);
    });
    
    // Listen for style attribute changes
    DOM.inlineStyleInvalidated(async (params) => {
      console.log('🔧 Inline style changed in DevTools');
      await this.handleDevToolsInlineStyleChange(params);
    });
    
    console.log('👂 DevTools event listeners set up');
  }

  /**
   * Handle CSS changes from Chrome DevTools - DevTools → Code → Canvas sync flow
   */
  async handleDevToolsCSSChange(params) {
    try {
      console.log('🔧 DevTools CSS change detected - starting DevTools → Code → Canvas sync');
      
      if (!this.devToolsClient) return;
      
      const { CSS } = this.devToolsClient;
      
      // Get the updated stylesheet content
      const styleSheetInfo = await CSS.getStyleSheetText({ styleSheetId: params.styleSheetId });
      
      if (styleSheetInfo && styleSheetInfo.text) {
        // Step 1: Update CSS files in VS Code
        const cssFilePath = await this.findCSSFileForStyleSheet(params.styleSheetId);
        
        if (cssFilePath) {
          await this.updateCSSFileFromDevTools(cssFilePath, styleSheetInfo.text);
          
          // Step 2: Trigger Canvas update (handled by file watcher)
          console.log('✅ DevTools → Code → Canvas sync completed');
          
          // Broadcast the change
          this.broadcast({
            type: 'DEVTOOLS_CSS_UPDATED',
            payload: {
              styleSheetId: params.styleSheetId,
              filePath: cssFilePath,
              syncFlow: 'devtools-to-code-to-canvas',
              timestamp: Date.now()
            }
          });
        }
      }
      
    } catch (error) {
      console.error('Error handling DevTools CSS change:', error);
    }
  }

  /**
   * Handle DOM changes from Chrome DevTools
   */
  async handleDevToolsDOMChange(params) {
    try {
      console.log('🔧 DevTools DOM change detected:', params.name, '=', params.value);
      
      if (!this.devToolsClient) return;
      
      // Handle style attribute changes
      if (params.name === 'style') {
        await this.handleDevToolsStyleAttributeChange(params);
      }
      
      // Handle class attribute changes
      if (params.name === 'class') {
        await this.handleDevToolsClassAttributeChange(params);
      }
      
    } catch (error) {
      console.error('Error handling DevTools DOM change:', error);
    }
  }

  /**
   * Handle inline style changes from DevTools
   */
  async handleDevToolsInlineStyleChange(params) {
    try {
      console.log('🔧 DevTools inline style change detected');
      
      // This would update the corresponding canvas elements
      // For now, we'll broadcast the event
      this.broadcast({
        type: 'DEVTOOLS_INLINE_STYLE_CHANGED',
        payload: {
          nodeIds: params.nodeIds,
          syncFlow: 'devtools-to-canvas',
          timestamp: Date.now()
        }
      });
      
    } catch (error) {
      console.error('Error handling DevTools inline style change:', error);
    }
  }

  /**
   * Handle style attribute changes from DevTools
   */
  async handleDevToolsStyleAttributeChange(params) {
    try {
      // Parse the style attribute value
      const styleValue = params.value;
      const styleProperties = this.parseInlineStyles(styleValue);
      
      // Update design data with the style changes
      await this.updateDesignDataFromDevToolsStyles(params.nodeId, styleProperties);
      
      console.log('📝 Updated design data from DevTools style changes');
      
    } catch (error) {
      console.error('Error handling DevTools style attribute change:', error);
    }
  }

  /**
   * Handle class attribute changes from DevTools
   */
  async handleDevToolsClassAttributeChange(params) {
    try {
      const classValue = params.value;
      const classNames = classValue.split(/\s+/).filter(Boolean);
      
      // Update design data with class changes
      await this.updateDesignDataFromDevToolsClasses(params.nodeId, classNames);
      
      console.log('📝 Updated design data from DevTools class changes');
      
    } catch (error) {
      console.error('Error handling DevTools class attribute change:', error);
    }
  }

  /**
   * Find CSS file corresponding to a DevTools stylesheet ID
   */
  async findCSSFileForStyleSheet(styleSheetId) {
    try {
      if (!this.devToolsClient) return null;
      
      const { CSS } = this.devToolsClient;
      
      // Get stylesheet info
      const styleSheetInfo = await CSS.getStyleSheetText({ styleSheetId });
      
      // Try to match with local CSS files
      // This is a simplified approach - in production you'd need more sophisticated matching
      const cssFiles = ['src/styles/components.css', 'src/styles/design-tokens.css', 'src/styles/utilities.css'];
      
      for (const filePath of cssFiles) {
        try {
          const fileContent = await fs.readFile(filePath, 'utf8');
          
          // Simple content matching - in production you'd use source maps
          if (this.cssContentMatches(fileContent, styleSheetInfo.text)) {
            return filePath;
          }
        } catch (error) {
          // File doesn't exist, continue
        }
      }
      
      // Default to components.css if no match found
      return 'src/styles/components.css';
      
    } catch (error) {
      console.error('Error finding CSS file for stylesheet:', error);
      return null;
    }
  }

  /**
   * Check if CSS content matches (simplified)
   */
  cssContentMatches(fileContent, devToolsContent) {
    // Remove whitespace and comments for comparison
    const normalize = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ').trim();
    
    const normalizedFile = normalize(fileContent);
    const normalizedDevTools = normalize(devToolsContent);
    
    // Check if DevTools content is a subset of file content
    return normalizedFile.includes(normalizedDevTools) || normalizedDevTools.includes(normalizedFile);
  }

  /**
   * Update CSS file from DevTools changes
   */
  async updateCSSFileFromDevTools(filePath, newContent) {
    try {
      // Ensure directory exists
      const dir = path.dirname(filePath);
      await fs.mkdir(dir, { recursive: true });
      
      // Write updated CSS content
      await fs.writeFile(filePath, newContent, 'utf8');
      
      console.log(`📝 Updated CSS file from DevTools: ${filePath}`);
      
    } catch (error) {
      console.error('Error updating CSS file from DevTools:', error);
      throw error;
    }
  }

  /**
   * Parse inline styles string into object
   */
  parseInlineStyles(styleString) {
    const styles = {};
    
    if (!styleString) return styles;
    
    const declarations = styleString.split(';').filter(Boolean);
    
    for (const declaration of declarations) {
      const [property, value] = declaration.split(':').map(s => s.trim());
      if (property && value) {
        styles[property] = value;
      }
    }
    
    return styles;
  }

  /**
   * Update design data from DevTools style changes
   */
  async updateDesignDataFromDevToolsStyles(nodeId, styleProperties) {
    try {
      const designData = await this.loadDesignData();
      
      // Find or create element for this node
      let element = designData.elements.find(el => el.devToolsNodeId === nodeId);
      
      if (!element) {
        // Create new element from DevTools change
        element = {
          id: `devtools_element_${nodeId}_${Date.now()}`,
          type: 'devtools-element',
          devToolsNodeId: nodeId,
          style: {},
          position: { x: 0, y: 0 },
          size: { width: 100, height: 100 },
          layerId: 'layer_001',
          sourceType: 'devtools',
          timestamp: Date.now()
        };
        
        designData.elements.push(element);
      }
      
      // Update element styles
      Object.assign(element.style, this.convertDevToolsStylesToCanvas(styleProperties));
      element.timestamp = Date.now();
      
      // Update metadata
      designData.metadata = {
        ...designData.metadata,
        lastUpdated: new Date().toISOString(),
        updatedFrom: 'devtools',
        changeType: 'style-updated'
      };
      
      await this.saveDesignData(designData);
      
      // Broadcast canvas update
      this.broadcast({
        type: 'CANVAS_UPDATED_FROM_DEVTOOLS',
        payload: {
          canvasData: designData,
          elementId: element.id,
          styleProperties,
          timestamp: Date.now()
        }
      });
      
    } catch (error) {
      console.error('Error updating design data from DevTools styles:', error);
    }
  }

  /**
   * Update design data from DevTools class changes
   */
  async updateDesignDataFromDevToolsClasses(nodeId, classNames) {
    try {
      const designData = await this.loadDesignData();
      
      // Find element for this node
      let element = designData.elements.find(el => el.devToolsNodeId === nodeId);
      
      if (element) {
        element.classNames = classNames;
        element.timestamp = Date.now();
        
        // Update metadata
        designData.metadata = {
          ...designData.metadata,
          lastUpdated: new Date().toISOString(),
          updatedFrom: 'devtools',
          changeType: 'class-updated'
        };
        
        await this.saveDesignData(designData);
        
        // Broadcast canvas update
        this.broadcast({
          type: 'CANVAS_UPDATED_FROM_DEVTOOLS',
          payload: {
            canvasData: designData,
            elementId: element.id,
            classNames,
            timestamp: Date.now()
          }
        });
      }
      
    } catch (error) {
      console.error('Error updating design data from DevTools classes:', error);
    }
  }

  /**
   * Convert DevTools CSS properties to canvas-compatible format
   */
  convertDevToolsStylesToCanvas(styleProperties) {
    const canvasStyle = {};
    
    // Map common CSS properties to canvas properties
    const propertyMap = {
      'background-color': 'fill',
      'border-color': 'stroke',
      'border-width': 'strokeWidth',
      'border-radius': 'borderRadius',
      'opacity': 'opacity',
      'color': 'color',
      'font-size': 'fontSize',
      'font-weight': 'fontWeight'
    };
    
    for (const [cssProperty, value] of Object.entries(styleProperties)) {
      const canvasProperty = propertyMap[cssProperty];
      if (canvasProperty) {
        canvasStyle[canvasProperty] = this.convertCSSValueToCanvas(cssProperty, value);
      }
    }
    
    return canvasStyle;
  }

  /**
   * Convert CSS value to canvas-compatible value
   */
  convertCSSValueToCanvas(property, value) {
    // Remove 'px' suffix for numeric values
    if (value.endsWith('px')) {
      return parseInt(value);
    }
    
    // Convert color values
    if (property.includes('color') || property === 'background-color') {
      return value; // Keep color as-is for now
    }
    
    return value;
  }

  /**
   * Handle React props changes from DevTools - DevTools → Code → Canvas sync flow
   */
  async handleReactPropsChange(payload) {
    try {
      console.log('⚛️ React props changed in DevTools:', payload.componentName);
      
      const { componentName, componentId, props, filePath } = payload;
      
      // Step 1: Update design data with new props
      const designData = await this.loadDesignData();
      
      // Find or create component in design data
      if (!designData.components) {
        designData.components = [];
      }
      
      let component = designData.components.find(c => c.id === componentId);
      
      if (!component) {
        component = {
          id: componentId,
          name: componentName,
          filePath: filePath,
          props: {},
          sourceType: 'react-devtools',
          timestamp: Date.now()
        };
        designData.components.push(component);
      }
      
      // Update component props
      component.props = { ...component.props, ...props };
      component.timestamp = Date.now();
      
      // Update metadata
      designData.metadata = {
        ...designData.metadata,
        lastUpdated: new Date().toISOString(),
        updatedFrom: 'react-devtools',
        changeType: 'react-props-updated'
      };
      
      await this.saveDesignData(designData);
      
      // Step 2: Update corresponding canvas elements
      await this.updateCanvasFromReactProps(componentId, props, designData);
      
      // Step 3: Update code files if needed
      if (filePath) {
        await this.updateCodeFromReactProps(filePath, componentId, props);
      }
      
      console.log('✅ React DevTools → Code → Canvas sync completed');
      
      // Broadcast the change
      this.broadcast({
        type: 'REACT_PROPS_UPDATED',
        payload: {
          componentId,
          componentName,
          props,
          syncFlow: 'react-devtools-to-code-to-canvas',
          timestamp: Date.now()
        }
      });
      
    } catch (error) {
      console.error('Error handling React props change:', error);
    }
  }

  /**
   * Handle Redux actions from DevTools
   */
  async handleReduxAction(payload) {
    try {
      console.log('🔄 Redux action dispatched in DevTools:', payload.action.type);
      
      const { action, state, componentId } = payload;
      
      // Update design data with Redux state changes
      const designData = await this.loadDesignData();
      
      if (!designData.redux) {
        designData.redux = {
          actions: [],
          state: {}
        };
      }
      
      // Store action history
      designData.redux.actions.push({
        ...action,
        timestamp: Date.now(),
        componentId
      });
      
      // Keep only last 50 actions
      if (designData.redux.actions.length > 50) {
        designData.redux.actions = designData.redux.actions.slice(-50);
      }
      
      // Update state
      designData.redux.state = state;
      
      // Update metadata
      designData.metadata = {
        ...designData.metadata,
        lastUpdated: new Date().toISOString(),
        updatedFrom: 'redux-devtools',
        changeType: 'redux-action'
      };
      
      await this.saveDesignData(designData);
      
      console.log('✅ Redux DevTools sync completed');
      
      // Broadcast the change
      this.broadcast({
        type: 'REDUX_ACTION_SYNCED',
        payload: {
          action,
          state,
          componentId,
          timestamp: Date.now()
        }
      });
      
    } catch (error) {
      console.error('Error handling Redux action:', error);
    }
  }

  /**
   * Update canvas elements from React props changes
   */
  async updateCanvasFromReactProps(componentId, props, designData) {
    try {
      // Find canvas elements associated with this component
      const componentElements = designData.elements.filter(el => 
        el.componentId === componentId || el.reactComponentId === componentId
      );
      
      for (const element of componentElements) {
        // Update element properties based on React props
        if (props.style) {
          element.style = { ...element.style, ...this.convertReactPropsToCanvasStyle(props.style) };
        }
        
        if (props.className) {
          element.classNames = props.className.split(/\s+/).filter(Boolean);
        }
        
        if (props.children && typeof props.children === 'string') {
          element.text = props.children;
        }
        
        element.timestamp = Date.now();
      }
      
      await this.saveDesignData(designData);
      
      // Broadcast canvas update
      this.broadcast({
        type: 'CANVAS_UPDATED_FROM_REACT_PROPS',
        payload: {
          canvasData: designData,
          componentId,
          props,
          timestamp: Date.now()
        }
      });
      
    } catch (error) {
      console.error('Error updating canvas from React props:', error);
    }
  }

  /**
   * Update code files from React props changes
   */
  async updateCodeFromReactProps(filePath, componentId, props) {
    try {
      // This would use AST manipulation to update the component file
      // For now, we'll just log the change
      console.log(`📝 Would update ${filePath} with new props for ${componentId}:`, props);
      
      // In a full implementation, you would:
      // 1. Parse the React component file with @babel/parser
      // 2. Find the component definition
      // 3. Update default props or prop types
      // 4. Write back the updated file with recast
      
    } catch (error) {
      console.error('Error updating code from React props:', error);
    }
  }

  /**
   * Convert React props style object to canvas style format
   */
  convertReactPropsToCanvasStyle(reactStyle) {
    const canvasStyle = {};
    
    const propertyMap = {
      backgroundColor: 'fill',
      borderColor: 'stroke',
      borderWidth: 'strokeWidth',
      borderRadius: 'borderRadius',
      opacity: 'opacity',
      color: 'color',
      fontSize: 'fontSize',
      fontWeight: 'fontWeight'
    };
    
    for (const [reactProp, value] of Object.entries(reactStyle)) {
      const canvasProp = propertyMap[reactProp] || reactProp;
      canvasStyle[canvasProp] = value;
    }
    
    return canvasStyle;
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    if (!this.isRunning) return;
    
    console.log('🛑 Shutting down VDS Sync Server...');
    this.isRunning = false;
    
    try {
      // Close WebSocket server
      if (this.wss) {
        this.clients.forEach(client => {
          this.sendToClient(client, {
            type: 'SERVER_SHUTDOWN',
            payload: { message: 'Server is shutting down' }
          });
          client.close();
        });
        
        await new Promise((resolve) => {
          this.wss.close(resolve);
        });
      }
      
      // Close file watcher
      if (this.fileWatcher) {
        await this.fileWatcher.close();
      }
      
      console.log('✅ VDS Sync Server shut down gracefully');
      this.emit('shutdown');
      
    } catch (error) {
      console.error('Error during shutdown:', error);
    }
    
    process.exit(0);
  }
}

// CLI interface when run directly
if (require.main === module) {
  const args = process.argv.slice(2);
  const config = {};
  
  // Parse command line arguments
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i];
    const value = args[i + 1];
    
    switch (key) {
      case '--port':
        config.port = parseInt(value);
        break;
      case '--host':
        config.host = value;
        break;
      case '--design-data':
        config.designDataPath = value;
        break;
    }
  }
  
  const server = new VDSSyncServer(config);
  
  server.start().catch(error => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
}

module.exports = VDSSyncServer;