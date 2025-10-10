/**
 * Client-side Error Handler for VSS Drawing Canvas
 * 
 * Handles errors in the webview and communicates with the sync server
 */

// IIFE wrapper to prevent global conflicts
(function() {
    'use strict';
    
    // Check if CanvasErrorHandler already exists
    if (window.CanvasErrorHandler) {
        console.log('CanvasErrorHandler already exists, skipping redefinition');
        return;
    }

class CanvasErrorHandler {
  constructor(options = {}) {
    this.options = {
      enableLogging: true,
      enableRecovery: true,
      reportToServer: true,
      maxRetries: 3,
      ...options
    };
    
    this.ws = null;
    this.errorCounts = new Map();
    this.recoveryStrategies = new Map();
    
    this.setupRecoveryStrategies();
    this.setupGlobalErrorHandlers();
  }
  
  /**
   * Set WebSocket connection for server communication
   */
  setWebSocket(ws) {
    this.ws = ws;
  }
  
  /**
   * Setup recovery strategies for canvas-specific errors
   */
  setupRecoveryStrategies() {
    this.recoveryStrategies.set('CANVAS_CONTEXT_LOST', {
      strategy: 'recreate_context',
      message: 'Canvas context lost. Recreating canvas.',
      autoRecover: true
    });
    
    this.recoveryStrategies.set('DRAWING_ENGINE_ERROR', {
      strategy: 'reset_drawing_state',
      message: 'Drawing engine error. Resetting drawing state.',
      preserveCanvas: true
    });
    
    this.recoveryStrategies.set('PRESSURE_SENSOR_ERROR', {
      strategy: 'fallback_to_mouse',
      message: 'Pressure sensor error. Falling back to mouse input.',
      fallbackMode: 'mouse'
    });
    
    this.recoveryStrategies.set('COLOR_SYSTEM_ERROR', {
      strategy: 'reset_color_system',
      message: 'Color system error. Resetting to default colors.',
      defaultColor: '#000000'
    });
    
    this.recoveryStrategies.set('WEBSOCKET_CONNECTION_ERROR', {
      strategy: 'queue_operations',
      message: 'Connection lost. Operations will be queued until reconnection.',
      enableQueue: true
    });
    
    this.recoveryStrategies.set('SYNC_SERVER_UNAVAILABLE', {
      strategy: 'enable_offline_mode',
      message: 'Sync server is unavailable. Working in offline mode.',
      showRetryButton: true
    });
    
    this.recoveryStrategies.set('CHROME_DEVTOOLS_DISCONNECTED', {
      strategy: 'graceful_degradation',
      message: 'Chrome DevTools sync is unavailable. Canvas and VS Code sync will continue.',
      fallbackMode: 'no_devtools'
    });
    
    this.recoveryStrategies.set('FILE_SYNC_FAILED', {
      strategy: 'suggest_manual_save',
      message: 'File sync failed. Please save manually.',
      showSaveButton: true
    });
    
    this.recoveryStrategies.set('MEMORY_LIMIT_ERROR', {
      strategy: 'cleanup_resources',
      message: 'Memory limit reached. Cleaning up resources.',
      forceGC: true
    });
  }
  
  /**
   * Setup global error handlers for the webview
   */
  setupGlobalErrorHandlers() {
    // Handle JavaScript errors
    window.addEventListener('error', (event) => {
      this.handleError('JAVASCRIPT_ERROR', event.error, {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        message: event.message
      });
    });
    
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.handleError('UNHANDLED_PROMISE_REJECTION', event.reason, {
        promise: event.promise
      });
    });
    
    // Handle canvas context lost events
    const canvas = document.getElementById('drawing-canvas');
    if (canvas) {
      canvas.addEventListener('webglcontextlost', (event) => {
        event.preventDefault();
        this.handleError('CANVAS_CONTEXT_LOST', new Error('WebGL context lost'), {
          canvas: canvas.id
        });
      });
      
      canvas.addEventListener('contextlost', (event) => {
        event.preventDefault();
        this.handleError('CANVAS_CONTEXT_LOST', new Error('Canvas context lost'), {
          canvas: canvas.id
        });
      });
    }
  }
  
  /**
   * Main error handling method
   */
  async handleError(errorType, error, context = {}) {
    const errorInfo = {
      type: errorType,
      error: error instanceof Error ? error : new Error(error),
      context,
      timestamp: new Date().toISOString(),
      count: this.incrementErrorCount(errorType),
      userAgent: navigator.userAgent,
      url: window.location.href
    };
    
    // Log the error
    this.logError(errorInfo);
    
    // Report to server if enabled
    if (this.options.reportToServer && this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.reportErrorToServer(errorInfo);
    }
    
    // Show user notification
    this.showUserNotification(errorInfo);
    
    // Attempt recovery if enabled
    if (this.options.enableRecovery) {
      return await this.attemptRecovery(errorInfo);
    }
    
    return false;
  }
  
  /**
   * Attempt to recover from an error
   */
  async attemptRecovery(errorInfo) {
    const strategy = this.recoveryStrategies.get(errorInfo.type);
    
    if (!strategy) {
      this.log('warn', `No recovery strategy found for error type: ${errorInfo.type}`);
      return false;
    }
    
    try {
      switch (strategy.strategy) {
        case 'recreate_context':
          return await this.recreateCanvasContext(errorInfo, strategy);
          
        case 'reset_drawing_state':
          return this.resetDrawingState(errorInfo, strategy);
          
        case 'fallback_to_mouse':
          return this.fallbackToMouse(errorInfo, strategy);
          
        case 'reset_color_system':
          return this.resetColorSystem(errorInfo, strategy);
          
        case 'queue_operations':
          return this.enableOperationQueue(errorInfo, strategy);
          
        case 'cleanup_resources':
          return this.cleanupResources(errorInfo, strategy);
          
        case 'enable_offline_mode':
          return this.enableOfflineMode(errorInfo, strategy);
          
        case 'suggest_manual_save':
          return this.suggestManualSave(errorInfo, strategy);
          
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
   * Recreate canvas context
   */
  async recreateCanvasContext(errorInfo, strategy) {
    try {
      const canvas = document.getElementById('drawing-canvas');
      if (!canvas) return false;
      
      // Save current canvas data
      const imageData = canvas.toDataURL();
      
      // Recreate context
      const context = canvas.getContext('2d');
      if (!context) return false;
      
      // Restore canvas data
      const img = new Image();
      img.onload = () => {
        context.drawImage(img, 0, 0);
        this.showUserNotification({
          type: 'success',
          message: 'Canvas context restored successfully.'
        });
      };
      img.src = imageData;
      
      return true;
    } catch (error) {
      this.log('error', 'Failed to recreate canvas context:', error);
      return false;
    }
  }
  
  /**
   * Reset drawing state
   */
  resetDrawingState(errorInfo, strategy) {
    try {
      // Reset drawing tools to default state
      if (window.drawingEngine) {
        window.drawingEngine.resetToDefaults();
      }
      
      // Reset UI state
      const toolButtons = document.querySelectorAll('.tool-button');
      toolButtons.forEach(btn => btn.classList.remove('active'));
      
      const penBtn = document.querySelector('[data-tool="pen"]');
      if (penBtn) {
        penBtn.classList.add('active');
      }
      
      this.showUserNotification({
        type: 'info',
        message: strategy.message
      });
      
      return true;
    } catch (error) {
      this.log('error', 'Failed to reset drawing state:', error);
      return false;
    }
  }
  
  /**
   * Fallback to mouse input
   */
  fallbackToMouse(errorInfo, strategy) {
    try {
      // Disable pressure sensitivity
      if (window.drawingEngine) {
        window.drawingEngine.setPressureSensitivity(false);
      }
      
      // Update pressure indicator
      const pressureIndicator = document.getElementById('pressure-indicator');
      if (pressureIndicator) {
        pressureIndicator.classList.remove('active');
        pressureIndicator.querySelector('.pressure-label').textContent = 'Mouse Mode';
      }
      
      this.showUserNotification({
        type: 'warning',
        message: strategy.message
      });
      
      return true;
    } catch (error) {
      this.log('error', 'Failed to fallback to mouse:', error);
      return false;
    }
  }
  
  /**
   * Reset color system
   */
  resetColorSystem(errorInfo, strategy) {
    try {
      // Reset to default color
      const currentColor = document.getElementById('current-color');
      if (currentColor) {
        currentColor.style.backgroundColor = strategy.defaultColor;
      }
      
      // Reset color sliders
      const hueSlider = document.getElementById('hue-slider');
      const saturationSlider = document.getElementById('saturation-slider');
      const brightnessSlider = document.getElementById('brightness-slider');
      
      if (hueSlider) hueSlider.value = 0;
      if (saturationSlider) saturationSlider.value = 100;
      if (brightnessSlider) brightnessSlider.value = 0;
      
      // Reset color system
      if (window.colorSystem) {
        window.colorSystem.setColor(strategy.defaultColor);
      }
      
      this.showUserNotification({
        type: 'info',
        message: strategy.message
      });
      
      return true;
    } catch (error) {
      this.log('error', 'Failed to reset color system:', error);
      return false;
    }
  }
  
  /**
   * Enable operation queue for offline mode
   */
  enableOperationQueue(errorInfo, strategy) {
    try {
      // Initialize operation queue if not exists
      if (!window.operationQueue) {
        window.operationQueue = [];
      }
      
      // Show offline indicator
      this.showOfflineIndicator(true);
      
      this.showUserNotification({
        type: 'warning',
        message: strategy.message
      });
      
      return true;
    } catch (error) {
      this.log('error', 'Failed to enable operation queue:', error);
      return false;
    }
  }
  
  /**
   * Cleanup resources to free memory
   */
  cleanupResources(errorInfo, strategy) {
    try {
      // Clear undo/redo history
      if (window.canvasState) {
        window.canvasState.clearHistory();
      }
      
      // Clear cached images
      if (window.imageCache) {
        window.imageCache.clear();
      }
      
      // Force garbage collection if available
      if (strategy.forceGC && window.gc) {
        window.gc();
      }
      
      this.showUserNotification({
        type: 'info',
        message: strategy.message
      });
      
      return true;
    } catch (error) {
      this.log('error', 'Failed to cleanup resources:', error);
      return false;
    }
  }
  
  /**
   * Report error to sync server
   */
  reportErrorToServer(errorInfo) {
    try {
      this.ws.send(JSON.stringify({
        type: 'ERROR_REPORT',
        payload: {
          errorType: errorInfo.type,
          error: {
            message: errorInfo.error.message,
            stack: errorInfo.error.stack
          },
          context: errorInfo.context,
          timestamp: errorInfo.timestamp,
          count: errorInfo.count,
          userAgent: errorInfo.userAgent
        }
      }));
    } catch (sendError) {
      this.log('error', 'Failed to report error to server:', sendError);
    }
  }
  
  /**
   * Show user notification
   */
  showUserNotification(errorInfo) {
    // Create notification element if it doesn't exist
    let notificationContainer = document.getElementById('error-notifications');
    if (!notificationContainer) {
      notificationContainer = document.createElement('div');
      notificationContainer.id = 'error-notifications';
      notificationContainer.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        z-index: 10000;
        max-width: 350px;
      `;
      document.body.appendChild(notificationContainer);
    }
    
    // Create notification
    const notification = document.createElement('div');
    const type = errorInfo.type || 'error';
    const message = errorInfo.message || errorInfo.error?.message || 'An error occurred';
    const actions = errorInfo.actions || [];
    
    notification.style.cssText = `
      background: ${this.getNotificationColor(type)};
      color: white;
      padding: 12px;
      margin-bottom: 8px;
      border-radius: 4px;
      font-size: 12px;
      line-height: 1.4;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      animation: slideIn 0.3s ease-out;
    `;
    
    // Build action buttons HTML
    let actionsHTML = '';
    if (actions.length > 0) {
      actionsHTML = actions.map(action => 
        `<button class="action-button" data-action="${action.text}" 
                 style="background: rgba(255,255,255,0.3); border: none; color: white; padding: 4px 8px; border-radius: 2px; cursor: pointer; margin-right: 4px;">
          ${action.text}
        </button>`
      ).join('');
    }
    
    notification.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 4px;">${this.getNotificationTitle(type)}</div>
      <div style="margin-bottom: ${actions.length > 0 ? '8px' : '0'};">${message}</div>
      ${actions.length > 0 ? `<div style="margin-bottom: 8px;">${actionsHTML}</div>` : ''}
      <div style="text-align: right;">
        <button onclick="this.parentElement.parentElement.remove()" 
                style="background: rgba(255,255,255,0.2); border: none; color: white; padding: 4px 8px; border-radius: 2px; cursor: pointer;">
          Dismiss
        </button>
      </div>
    `;
    
    // Add event listeners for action buttons
    if (actions.length > 0) {
      const actionButtons = notification.querySelectorAll('.action-button');
      actionButtons.forEach((button, index) => {
        button.addEventListener('click', () => {
          try {
            actions[index].action();
          } catch (error) {
            this.log('error', 'Action button error:', error);
          }
        });
      });
    }
    
    notificationContainer.appendChild(notification);
    
    // Auto-remove after 15 seconds (longer for notifications with actions)
    const autoRemoveDelay = actions.length > 0 ? 15000 : 10000;
    setTimeout(() => {
      if (notification.parentElement) {
        notification.remove();
      }
    }, autoRemoveDelay);
  }
  
  /**
   * Show/hide offline indicator
   */
  showOfflineIndicator(show) {
    let indicator = document.getElementById('offline-indicator');
    
    if (show && !indicator) {
      indicator = document.createElement('div');
      indicator.id = 'offline-indicator';
      indicator.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: #ff6b6b;
        color: white;
        padding: 8px 16px;
        border-radius: 4px;
        font-size: 12px;
        z-index: 9999;
      `;
      indicator.textContent = 'Offline - Changes will be synced when connection is restored';
      document.body.appendChild(indicator);
    } else if (!show && indicator) {
      indicator.remove();
    }
  }
  
  /**
   * Get notification color based on type
   */
  getNotificationColor(type) {
    const colors = {
      error: '#dc3545',
      warning: '#ffc107',
      info: '#17a2b8',
      success: '#28a745'
    };
    return colors[type] || colors.error;
  }
  
  /**
   * Get notification title based on type
   */
  getNotificationTitle(type) {
    const titles = {
      error: 'Error',
      warning: 'Warning',
      info: 'Information',
      success: 'Success'
    };
    return titles[type] || titles.error;
  }
  
  /**
   * Increment error count
   */
  incrementErrorCount(errorType) {
    const current = this.errorCounts.get(errorType) || 0;
    const newCount = current + 1;
    this.errorCounts.set(errorType, newCount);
    return newCount;
  }
  
  /**
   * Log error
   */
  logError(errorInfo) {
    if (!this.options.enableLogging) return;
    
    const { type, error, context, count } = errorInfo;
    console.error(`[VSS Canvas Error] ${type} (${count}):`, error.message, {
      error: error.stack,
      context
    });
  }
  
  /**
   * Generic logging method
   */
  log(level, message, data = null) {
    if (!this.options.enableLogging) return;
    
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [VSS Canvas] [${level.toUpperCase()}] ${message}`;
    
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
   * Get error statistics
   */
  getErrorStats() {
    return {
      totalErrors: Array.from(this.errorCounts.values()).reduce((sum, count) => sum + count, 0),
      errorsByType: Object.fromEntries(this.errorCounts)
    };
  }
  
  /**
   * Clear error statistics
   */
  clearStats() {
    this.errorCounts.clear();
  }
  
  /**
   * Enable offline mode
   */
  enableOfflineMode(errorInfo, strategy) {
    try {
      // Initialize operation queue if not exists
      if (!window.operationQueue) {
        window.operationQueue = [];
      }
      
      // Show offline indicator
      this.showOfflineIndicator(true);
      
      // Show retry button if specified
      if (strategy.showRetryButton) {
        this.showRetryButton();
      }
      
      this.showUserNotification({
        type: 'warning',
        message: strategy.message,
        actions: strategy.showRetryButton ? [
          {
            text: 'Retry Connection',
            action: () => this.retryConnection()
          }
        ] : []
      });
      
      return true;
    } catch (error) {
      this.log('error', 'Failed to enable offline mode:', error);
      return false;
    }
  }
  
  /**
   * Suggest manual save
   */
  suggestManualSave(errorInfo, strategy) {
    try {
      this.showUserNotification({
        type: 'warning',
        message: strategy.message,
        actions: strategy.showSaveButton ? [
          {
            text: 'Save Manually',
            action: () => this.triggerManualSave()
          },
          {
            text: 'Export Canvas',
            action: () => this.exportCanvas()
          }
        ] : []
      });
      
      return true;
    } catch (error) {
      this.log('error', 'Failed to suggest manual save:', error);
      return false;
    }
  }
  
  /**
   * Show retry button
   */
  showRetryButton() {
    let retryButton = document.getElementById('connection-retry-button');
    
    if (!retryButton) {
      retryButton = document.createElement('button');
      retryButton.id = 'connection-retry-button';
      retryButton.textContent = 'Retry Connection';
      retryButton.style.cssText = `
        position: fixed;
        top: 10px;
        left: 50%;
        transform: translateX(-50%);
        background: #007acc;
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 4px;
        cursor: pointer;
        z-index: 10001;
        font-size: 12px;
      `;
      
      retryButton.onclick = () => {
        this.retryConnection();
        retryButton.remove();
      };
      
      document.body.appendChild(retryButton);
    }
  }
  
  /**
   * Retry connection to sync server
   */
  retryConnection() {
    try {
      this.log('info', 'Retrying connection to sync server...');
      
      // Hide offline indicator
      this.showOfflineIndicator(false);
      
      // Try to reconnect WebSocket
      if (window.connectToSyncServer) {
        window.connectToSyncServer();
      }
      
      // Show connecting message
      this.showUserNotification({
        type: 'info',
        message: 'Attempting to reconnect...'
      });
      
    } catch (error) {
      this.log('error', 'Failed to retry connection:', error);
      
      this.showUserNotification({
        type: 'error',
        message: 'Connection retry failed. Please check the sync server.'
      });
    }
  }
  
  /**
   * Trigger manual save
   */
  triggerManualSave() {
    try {
      if (window.canvasState && window.canvasState.exportData) {
        const data = window.canvasState.exportData();
        
        // Create download link
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `design-data-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        URL.revokeObjectURL(url);
        
        this.showUserNotification({
          type: 'success',
          message: 'Design data exported successfully.'
        });
      }
    } catch (error) {
      this.log('error', 'Failed to trigger manual save:', error);
      
      this.showUserNotification({
        type: 'error',
        message: 'Manual save failed. Please try again.'
      });
    }
  }
  
  /**
   * Export canvas as image
   */
  exportCanvas() {
    try {
      const canvas = document.getElementById('drawing-canvas');
      if (canvas) {
        const link = document.createElement('a');
        link.download = `canvas-export-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.png`;
        link.href = canvas.toDataURL();
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        this.showUserNotification({
          type: 'success',
          message: 'Canvas exported as image successfully.'
        });
      }
    } catch (error) {
      this.log('error', 'Failed to export canvas:', error);
      
      this.showUserNotification({
        type: 'error',
        message: 'Canvas export failed. Please try again.'
      });
    }
  }
}

// Expose CanvasErrorHandler to global scope
window.CanvasErrorHandler = CanvasErrorHandler;

// Auto-initialize if in browser environment
if (typeof window !== 'undefined') {
  // Initialize error handler when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      if (!window.canvasErrorHandler) {
        window.canvasErrorHandler = new CanvasErrorHandler();
      }
    });
  } else {
    if (!window.canvasErrorHandler) {
      window.canvasErrorHandler = new CanvasErrorHandler();
    }
  }
}

})(); // End of IIFE

// Export for module environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = window.CanvasErrorHandler;
}