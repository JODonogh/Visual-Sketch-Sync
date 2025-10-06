/**
 * Comprehensive Error Handler for VDS System
 * 
 * Provides centralized error handling, recovery mechanisms, and user-friendly error reporting
 * for the three-way sync system (Canvas ↔ VS Code ↔ Chrome)
 */

class VDSErrorHandler {
  constructor(options = {}) {
    this.options = {
      enableLogging: true,
      enableRecovery: true,
      maxRetries: 3,
      retryDelay: 1000,
      logLevel: 'info', // 'debug', 'info', 'warn', 'error'
      ...options
    };
    
    this.errorCounts = new Map();
    this.recoveryStrategies = new Map();
    this.listeners = new Set();
    
    this.setupRecoveryStrategies();
    this.setupGlobalErrorHandlers();
  }
  
  /**
   * Setup recovery strategies for different error types
   */
  setupRecoveryStrategies() {
    // WebSocket connection errors
    this.recoveryStrategies.set('WEBSOCKET_CONNECTION_FAILED', {
      strategy: 'reconnect',
      maxRetries: 5,
      retryDelay: 2000,
      exponentialBackoff: true
    });
    
    this.recoveryStrategies.set('PORT_IN_USE', {
      strategy: 'suggest_solution',
      message: 'Port is already in use. Please try a different port.',
      suggestions: [
        'Stop other VDS instances running on this port',
        'Use a different port with --port option',
        'Check for other applications using the port with: netstat -an | grep PORT'
      ],
      autoRetryWithDifferentPort: true
    });
    
    this.recoveryStrategies.set('PORT_PERMISSION_DENIED', {
      strategy: 'suggest_solution',
      message: 'Permission denied for port access.',
      suggestions: [
        'Try using a port number above 1024',
        'Run VS Code as administrator (Windows) or with sudo (Linux/Mac)',
        'Check firewall settings'
      ]
    });
    
    // File system errors
    this.recoveryStrategies.set('FILE_PERMISSION_ERROR', {
      strategy: 'suggest_solution',
      message: 'File permission denied. Please check file permissions and try again.',
      suggestions: [
        'Check if the file is open in another application',
        'Verify you have write permissions to the directory',
        'Try running VS Code as administrator (Windows) or with sudo (Linux/Mac)'
      ]
    });
    
    this.recoveryStrategies.set('EACCES', {
      strategy: 'suggest_solution',
      message: 'Access denied to file or directory.',
      suggestions: [
        'Check file permissions: ls -la (Linux/Mac) or icacls (Windows)',
        'Ensure VS Code has write access to the project directory',
        'Close the file if it\'s open in another application'
      ]
    });
    
    this.recoveryStrategies.set('ENOENT', {
      strategy: 'create_default',
      message: 'File or directory not found. Creating default structure.',
      autoRecover: true
    });
    
    this.recoveryStrategies.set('ENOSPC', {
      strategy: 'suggest_solution',
      message: 'No space left on device.',
      suggestions: [
        'Free up disk space by deleting unnecessary files',
        'Clear temporary files and caches',
        'Move project to a drive with more space'
      ]
    });
    
    this.recoveryStrategies.set('FILE_NOT_FOUND', {
      strategy: 'create_default',
      message: 'File not found. Creating default file structure.',
      autoRecover: true
    });
    
    this.recoveryStrategies.set('FILE_LOCK_ERROR', {
      strategy: 'retry_with_backoff',
      message: 'File is locked by another process. Retrying...',
      maxRetries: 5,
      retryDelay: 500,
      exponentialBackoff: true
    });
    
    // Parse errors
    this.recoveryStrategies.set('JSON_PARSE_ERROR', {
      strategy: 'backup_and_reset',
      message: 'Invalid JSON detected. Creating backup and resetting to default.',
      createBackup: true
    });
    
    this.recoveryStrategies.set('SYNTAX_ERROR', {
      strategy: 'backup_and_reset',
      message: 'Syntax error in configuration file. Creating backup and resetting.',
      createBackup: true
    });
    
    // Chrome DevTools errors
    this.recoveryStrategies.set('DEVTOOLS_CONNECTION_FAILED', {
      strategy: 'graceful_degradation',
      message: 'Chrome DevTools connection failed. Continuing without DevTools sync.',
      fallbackMode: 'no_devtools'
    });
    
    this.recoveryStrategies.set('CHROME_NOT_FOUND', {
      strategy: 'suggest_solution',
      message: 'Chrome browser not found.',
      suggestions: [
        'Install Google Chrome for DevTools integration',
        'Start Chrome with remote debugging: chrome --remote-debugging-port=9222',
        'Check Chrome installation path'
      ]
    });
    
    this.recoveryStrategies.set('CHROME_DEBUG_PORT_UNAVAILABLE', {
      strategy: 'suggest_solution',
      message: 'Chrome debug port is not accessible.',
      suggestions: [
        'Start Chrome with: chrome --remote-debugging-port=9222',
        'Check if port 9222 is blocked by firewall',
        'Verify Chrome is running with debug flags'
      ]
    });
    
    // Network errors
    this.recoveryStrategies.set('NETWORK_ERROR', {
      strategy: 'retry_with_backoff',
      maxRetries: 3,
      retryDelay: 1000,
      exponentialBackoff: true
    });
    
    this.recoveryStrategies.set('CONNECTION_TIMEOUT', {
      strategy: 'retry_with_backoff',
      message: 'Connection timeout. Retrying with longer timeout...',
      maxRetries: 3,
      retryDelay: 2000,
      exponentialBackoff: true
    });
    
    this.recoveryStrategies.set('DNS_RESOLUTION_FAILED', {
      strategy: 'suggest_solution',
      message: 'DNS resolution failed.',
      suggestions: [
        'Check internet connection',
        'Try using IP address instead of hostname',
        'Check DNS settings'
      ]
    });
    
    // Canvas rendering errors
    this.recoveryStrategies.set('CANVAS_RENDER_ERROR', {
      strategy: 'reset_canvas',
      message: 'Canvas rendering error. Resetting canvas state.',
      preserveData: true
    });
    
    this.recoveryStrategies.set('WEBGL_CONTEXT_LOST', {
      strategy: 'reset_canvas',
      message: 'WebGL context lost. Recreating canvas.',
      preserveData: true,
      fallbackToCanvas2D: true
    });
    
    this.recoveryStrategies.set('OUT_OF_MEMORY', {
      strategy: 'cleanup_and_retry',
      message: 'Out of memory. Cleaning up resources and retrying.',
      forceGarbageCollection: true,
      clearCaches: true
    });
    
    // Sync server errors
    this.recoveryStrategies.set('SYNC_SERVER_CRASHED', {
      strategy: 'restart_server',
      message: 'Sync server crashed. Restarting...',
      maxRetries: 3,
      retryDelay: 2000
    });
    
    this.recoveryStrategies.set('WEBSOCKET_DISCONNECTED', {
      strategy: 'reconnect',
      message: 'WebSocket disconnected. Attempting to reconnect...',
      maxRetries: 10,
      retryDelay: 1000,
      exponentialBackoff: true
    });
    
    // Environment-specific errors
    this.recoveryStrategies.set('CODESPACES_PORT_FORWARDING_FAILED', {
      strategy: 'suggest_solution',
      message: 'GitHub Codespaces port forwarding failed.',
      suggestions: [
        'Check port forwarding settings in Codespaces',
        'Ensure port visibility is set to public',
        'Try restarting the Codespace'
      ]
    });
    
    this.recoveryStrategies.set('REMOTE_DEVELOPMENT_SLOW', {
      strategy: 'optimize_for_remote',
      message: 'Remote development detected. Optimizing for network efficiency.',
      enableCompression: true,
      increaseSyncThrottle: true,
      reduceFileWatcherSensitivity: true
    });
  }
  
  /**
   * Setup global error handlers
   */
  setupGlobalErrorHandlers() {
    // Handle uncaught exceptions
    if (typeof process !== 'undefined') {
      process.on('uncaughtException', (error) => {
        this.handleError('UNCAUGHT_EXCEPTION', error, { critical: true });
      });
      
      process.on('unhandledRejection', (reason, promise) => {
        this.handleError('UNHANDLED_REJECTION', reason, { 
          critical: true, 
          context: { promise } 
        });
      });
    }
    
    // Handle browser errors
    if (typeof window !== 'undefined') {
      window.addEventListener('error', (event) => {
        this.handleError('BROWSER_ERROR', event.error, {
          context: {
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno
          }
        });
      });
      
      window.addEventListener('unhandledrejection', (event) => {
        this.handleError('UNHANDLED_PROMISE_REJECTION', event.reason, {
          critical: true
        });
      });
    }
  }
  
  /**
   * Main error handling method
   * @param {string} errorType - Type of error
   * @param {Error|string} error - Error object or message
   * @param {Object} context - Additional context information
   * @returns {Promise<boolean>} - Whether error was handled successfully
   */
  async handleError(errorType, error, context = {}) {
    const errorInfo = {
      type: errorType,
      error: error instanceof Error ? error : new Error(error),
      context,
      timestamp: new Date().toISOString(),
      count: this.incrementErrorCount(errorType)
    };
    
    // Log the error
    this.logError(errorInfo);
    
    // Notify listeners
    this.notifyListeners(errorInfo);
    
    // Attempt recovery if enabled
    if (this.options.enableRecovery) {
      return await this.attemptRecovery(errorInfo);
    }
    
    return false;
  }
  
  /**
   * Attempt to recover from an error
   * @param {Object} errorInfo - Error information
   * @returns {Promise<boolean>} - Whether recovery was successful
   */
  async attemptRecovery(errorInfo) {
    const strategy = this.recoveryStrategies.get(errorInfo.type);
    
    if (!strategy) {
      this.log('warn', `No recovery strategy found for error type: ${errorInfo.type}`);
      return false;
    }
    
    try {
      switch (strategy.strategy) {
        case 'reconnect':
          return await this.handleReconnectStrategy(errorInfo, strategy);
          
        case 'suggest_solution':
          return this.handleSuggestSolutionStrategy(errorInfo, strategy);
          
        case 'create_default':
          return await this.handleCreateDefaultStrategy(errorInfo, strategy);
          
        case 'backup_and_reset':
          return await this.handleBackupAndResetStrategy(errorInfo, strategy);
          
        case 'graceful_degradation':
          return this.handleGracefulDegradationStrategy(errorInfo, strategy);
          
        case 'retry_with_backoff':
          return await this.handleRetryWithBackoffStrategy(errorInfo, strategy);
          
        case 'reset_canvas':
          return await this.handleResetCanvasStrategy(errorInfo, strategy);
          
        case 'cleanup_and_retry':
          return await this.handleCleanupAndRetryStrategy(errorInfo, strategy);
          
        case 'restart_server':
          return await this.handleRestartServerStrategy(errorInfo, strategy);
          
        case 'optimize_for_remote':
          return this.handleOptimizeForRemoteStrategy(errorInfo, strategy);
          
        default:
          this.log('warn', `Unknown recovery strategy: ${strategy.strategy}`);
          return false;
      }
    } catch (recoveryError) {
      this.log('error', `Recovery failed for ${errorInfo.type}:`, recoveryError);
      return false;
    }
  }
  
  /**
   * Handle reconnection strategy
   */
  async handleReconnectStrategy(errorInfo, strategy) {
    const maxRetries = strategy.maxRetries || this.options.maxRetries;
    let retryDelay = strategy.retryDelay || this.options.retryDelay;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      this.log('info', `Reconnection attempt ${attempt}/${maxRetries} for ${errorInfo.type}`);
      
      try {
        // Wait before retry
        await this.delay(retryDelay);
        
        // Attempt reconnection (this would be implemented by the calling code)
        const success = await this.triggerReconnection(errorInfo);
        
        if (success) {
          this.log('info', `Reconnection successful after ${attempt} attempts`);
          return true;
        }
        
      } catch (retryError) {
        this.log('warn', `Reconnection attempt ${attempt} failed:`, retryError);
      }
      
      // Exponential backoff
      if (strategy.exponentialBackoff) {
        retryDelay *= 2;
      }
    }
    
    this.log('error', `All reconnection attempts failed for ${errorInfo.type}`);
    return false;
  }
  
  /**
   * Handle suggest solution strategy
   */
  handleSuggestSolutionStrategy(errorInfo, strategy) {
    const userMessage = {
      type: 'error_with_suggestions',
      title: 'Error Occurred',
      message: strategy.message,
      suggestions: strategy.suggestions || [],
      errorType: errorInfo.type,
      canRetry: true
    };
    
    this.notifyUser(userMessage);
    return true; // Consider handled since we provided user guidance
  }
  
  /**
   * Handle create default strategy
   */
  async handleCreateDefaultStrategy(errorInfo, strategy) {
    try {
      this.log('info', `Creating default file structure for ${errorInfo.type}`);
      
      // This would be implemented by the calling code
      const success = await this.createDefaultFiles(errorInfo);
      
      if (success) {
        this.notifyUser({
          type: 'info',
          title: 'Files Created',
          message: strategy.message || 'Default files have been created.'
        });
        return true;
      }
      
      return false;
    } catch (createError) {
      this.log('error', 'Failed to create default files:', createError);
      return false;
    }
  }
  
  /**
   * Handle backup and reset strategy
   */
  async handleBackupAndResetStrategy(errorInfo, strategy) {
    try {
      if (strategy.createBackup) {
        await this.createBackup(errorInfo);
      }
      
      await this.resetToDefault(errorInfo);
      
      this.notifyUser({
        type: 'warning',
        title: 'File Reset',
        message: strategy.message || 'File has been reset to default state.'
      });
      
      return true;
    } catch (resetError) {
      this.log('error', 'Failed to backup and reset:', resetError);
      return false;
    }
  }
  
  /**
   * Handle graceful degradation strategy
   */
  handleGracefulDegradationStrategy(errorInfo, strategy) {
    this.log('info', `Enabling fallback mode: ${strategy.fallbackMode}`);
    
    // Set fallback mode (this would be implemented by the calling code)
    this.setFallbackMode(strategy.fallbackMode);
    
    this.notifyUser({
      type: 'warning',
      title: 'Reduced Functionality',
      message: strategy.message || 'Some features are temporarily unavailable.'
    });
    
    return true;
  }
  
  /**
   * Handle retry with backoff strategy
   */
  async handleRetryWithBackoffStrategy(errorInfo, strategy) {
    const maxRetries = strategy.maxRetries || this.options.maxRetries;
    let retryDelay = strategy.retryDelay || this.options.retryDelay;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      this.log('info', `Retry attempt ${attempt}/${maxRetries} for ${errorInfo.type}`);
      
      try {
        await this.delay(retryDelay);
        
        // Retry the operation (this would be implemented by the calling code)
        const success = await this.retryOperation(errorInfo);
        
        if (success) {
          this.log('info', `Operation successful after ${attempt} attempts`);
          return true;
        }
        
      } catch (retryError) {
        this.log('warn', `Retry attempt ${attempt} failed:`, retryError);
      }
      
      // Exponential backoff
      if (strategy.exponentialBackoff) {
        retryDelay *= 2;
      }
    }
    
    return false;
  }
  
  /**
   * Handle reset canvas strategy
   */
  async handleResetCanvasStrategy(errorInfo, strategy) {
    try {
      if (strategy.preserveData) {
        await this.preserveCanvasData(errorInfo);
      }
      
      await this.resetCanvas(errorInfo);
      
      this.notifyUser({
        type: 'info',
        title: 'Canvas Reset',
        message: strategy.message || 'Canvas has been reset.'
      });
      
      return true;
    } catch (resetError) {
      this.log('error', 'Failed to reset canvas:', resetError);
      return false;
    }
  }
  
  /**
   * Handle cleanup and retry strategy
   */
  async handleCleanupAndRetryStrategy(errorInfo, strategy) {
    try {
      this.log('info', 'Cleaning up resources before retry...');
      
      // Force garbage collection if available
      if (strategy.forceGarbageCollection && global.gc) {
        global.gc();
      }
      
      // Clear caches
      if (strategy.clearCaches) {
        await this.clearSystemCaches();
      }
      
      // Wait a moment for cleanup to complete
      await this.delay(1000);
      
      // Retry the operation
      const success = await this.retryOperation(errorInfo);
      
      if (success) {
        this.notifyUser({
          type: 'success',
          title: 'Recovery Successful',
          message: 'Resources cleaned up and operation completed successfully.'
        });
        return true;
      }
      
      return false;
    } catch (cleanupError) {
      this.log('error', 'Failed to cleanup and retry:', cleanupError);
      return false;
    }
  }
  
  /**
   * Handle restart server strategy
   */
  async handleRestartServerStrategy(errorInfo, strategy) {
    try {
      this.log('info', 'Restarting sync server...');
      
      // Stop current server
      await this.stopSyncServer();
      
      // Wait before restart
      await this.delay(strategy.retryDelay || 2000);
      
      // Start server again
      const success = await this.startSyncServer();
      
      if (success) {
        this.notifyUser({
          type: 'success',
          title: 'Server Restarted',
          message: 'Sync server has been restarted successfully.'
        });
        return true;
      }
      
      return false;
    } catch (restartError) {
      this.log('error', 'Failed to restart server:', restartError);
      return false;
    }
  }
  
  /**
   * Handle optimize for remote strategy
   */
  handleOptimizeForRemoteStrategy(errorInfo, strategy) {
    try {
      this.log('info', 'Optimizing for remote development environment...');
      
      const optimizations = [];
      
      if (strategy.enableCompression) {
        this.enableCompression();
        optimizations.push('Enabled compression');
      }
      
      if (strategy.increaseSyncThrottle) {
        this.increaseSyncThrottle();
        optimizations.push('Increased sync throttle');
      }
      
      if (strategy.reduceFileWatcherSensitivity) {
        this.reduceFileWatcherSensitivity();
        optimizations.push('Reduced file watcher sensitivity');
      }
      
      this.notifyUser({
        type: 'info',
        title: 'Remote Optimization',
        message: `Applied optimizations: ${optimizations.join(', ')}`
      });
      
      return true;
    } catch (optimizeError) {
      this.log('error', 'Failed to optimize for remote:', optimizeError);
      return false;
    }
  }
  
  /**
   * Increment error count for tracking
   */
  incrementErrorCount(errorType) {
    const current = this.errorCounts.get(errorType) || 0;
    const newCount = current + 1;
    this.errorCounts.set(errorType, newCount);
    return newCount;
  }
  
  /**
   * Log error with appropriate level
   */
  logError(errorInfo) {
    const { type, error, context, count } = errorInfo;
    
    let logLevel = 'error';
    if (count > 5) {
      logLevel = 'error'; // Frequent errors are critical
    } else if (context.critical) {
      logLevel = 'error';
    } else {
      logLevel = 'warn';
    }
    
    this.log(logLevel, `[${type}] ${error.message}`, {
      error: error.stack,
      context,
      count
    });
  }
  
  /**
   * Generic logging method
   */
  log(level, message, data = null) {
    if (!this.options.enableLogging) return;
    
    const logLevels = { debug: 0, info: 1, warn: 2, error: 3 };
    const currentLevel = logLevels[this.options.logLevel] || 1;
    const messageLevel = logLevels[level] || 1;
    
    if (messageLevel < currentLevel) return;
    
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
    
    switch (level) {
      case 'debug':
        console.debug(logMessage, data);
        break;
      case 'info':
        console.info(logMessage, data);
        break;
      case 'warn':
        console.warn(logMessage, data);
        break;
      case 'error':
        console.error(logMessage, data);
        break;
      default:
        console.log(logMessage, data);
    }
  }
  
  /**
   * Notify error listeners
   */
  notifyListeners(errorInfo) {
    this.listeners.forEach(listener => {
      try {
        listener(errorInfo);
      } catch (listenerError) {
        console.error('Error in error listener:', listenerError);
      }
    });
  }
  
  /**
   * Notify user with error message
   */
  notifyUser(message) {
    // This would be implemented by the calling code to show user notifications
    this.log('info', `User notification: ${message.title} - ${message.message}`);
    
    // Emit event for UI to handle
    if (typeof window !== 'undefined' && window.postMessage) {
      window.postMessage({
        type: 'vds_error_notification',
        payload: message
      }, '*');
    }
  }
  
  /**
   * Add error listener
   */
  addListener(listener) {
    this.listeners.add(listener);
  }
  
  /**
   * Remove error listener
   */
  removeListener(listener) {
    this.listeners.delete(listener);
  }
  
  /**
   * Get error statistics
   */
  getErrorStats() {
    return {
      totalErrors: Array.from(this.errorCounts.values()).reduce((sum, count) => sum + count, 0),
      errorsByType: Object.fromEntries(this.errorCounts),
      mostFrequentError: this.getMostFrequentError()
    };
  }
  
  /**
   * Get most frequent error type
   */
  getMostFrequentError() {
    let maxCount = 0;
    let mostFrequent = null;
    
    for (const [type, count] of this.errorCounts) {
      if (count > maxCount) {
        maxCount = count;
        mostFrequent = type;
      }
    }
    
    return mostFrequent ? { type: mostFrequent, count: maxCount } : null;
  }
  
  /**
   * Clear error statistics
   */
  clearStats() {
    this.errorCounts.clear();
  }
  
  /**
   * Utility method for delays
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  // Placeholder methods that would be implemented by the calling code
  async triggerReconnection(errorInfo) {
    // Implementation would depend on the specific connection type
    throw new Error('triggerReconnection not implemented');
  }
  
  async createDefaultFiles(errorInfo) {
    // Implementation would create default project files
    throw new Error('createDefaultFiles not implemented');
  }
  
  async createBackup(errorInfo) {
    // Implementation would create file backups
    throw new Error('createBackup not implemented');
  }
  
  async resetToDefault(errorInfo) {
    // Implementation would reset files to default state
    throw new Error('resetToDefault not implemented');
  }
  
  setFallbackMode(mode) {
    // Implementation would set system to fallback mode
    this.log('info', `Fallback mode set to: ${mode}`);
  }
  
  async retryOperation(errorInfo) {
    // Implementation would retry the failed operation
    throw new Error('retryOperation not implemented');
  }
  
  async preserveCanvasData(errorInfo) {
    // Implementation would preserve canvas data before reset
    throw new Error('preserveCanvasData not implemented');
  }
  
  async resetCanvas(errorInfo) {
    // Implementation would reset canvas state
    throw new Error('resetCanvas not implemented');
  }
  
  async clearSystemCaches() {
    // Implementation would clear system caches
    this.log('info', 'Clearing system caches...');
  }
  
  async stopSyncServer() {
    // Implementation would stop the sync server
    throw new Error('stopSyncServer not implemented');
  }
  
  async startSyncServer() {
    // Implementation would start the sync server
    throw new Error('startSyncServer not implemented');
  }
  
  enableCompression() {
    // Implementation would enable compression
    this.log('info', 'Compression enabled for remote development');
  }
  
  increaseSyncThrottle() {
    // Implementation would increase sync throttle
    this.log('info', 'Sync throttle increased for remote development');
  }
  
  reduceFileWatcherSensitivity() {
    // Implementation would reduce file watcher sensitivity
    this.log('info', 'File watcher sensitivity reduced for remote development');
  }
}

module.exports = VDSErrorHandler;