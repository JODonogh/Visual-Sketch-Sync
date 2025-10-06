/**
 * CSS-to-Canvas Conversion Engine
 * Converts CSS files to canvas elements and updates canvas when CSS changes
 * Part of the VDS (Visual Design Sync) system
 */

const CSSParser = require('./css-parser');
const fs = require('fs').promises;
const path = require('path');
const chokidar = require('chokidar');

class CSSToCanvasEngine {
  constructor(options = {}) {
    this.options = {
      watchPaths: ['src/**/*.css', 'styles/**/*.css'],
      canvasDataPath: 'src/design/design-data.json',
      updateCanvas: true,
      preservePositions: true,
      ...options
    };
    
    this.cssParser = new CSSParser(options.cssParser);
    this.fileWatcher = null;
    this.isWatching = false;
    this.updateCallbacks = [];
  }

  /**
   * Convert CSS files to canvas elements
   * @param {Array} cssFiles - Array of CSS file paths
   * @returns {Object} Canvas data with converted elements
   */
  async convertCSSToCanvas(cssFiles) {
    try {
      const allElements = [];
      const designTokens = {};
      
      // Process each CSS file
      for (const filePath of cssFiles) {
        console.log(`Processing CSS file: ${filePath}`);
        
        const elements = await this.cssParser.parseCSSFile(filePath);
        const tokens = await this.extractTokensFromFile(filePath);
        
        // Add source file information to elements
        elements.forEach(element => {
          element.sourceFile = filePath;
          element.lastModified = new Date().toISOString();
        });
        
        allElements.push(...elements);
        Object.assign(designTokens, tokens);
      }
      
      // Analyze layout relationships
      const layoutAnalysis = this.analyzeLayoutRelationships(allElements);
      
      // Generate canvas data structure
      const canvasData = this.generateCanvasData(allElements, designTokens, layoutAnalysis);
      
      return canvasData;
    } catch (error) {
      console.error('Error converting CSS to canvas:', error);
      throw error;
    }
  }

  /**
   * Extract design tokens from CSS file
   * @param {string} filePath - CSS file path
   * @returns {Object} Extracted design tokens
   */
  async extractTokensFromFile(filePath) {
    try {
      const cssContent = await fs.readFile(filePath, 'utf8');
      return this.cssParser.extractDesignTokens(cssContent);
    } catch (error) {
      console.error(`Error extracting tokens from ${filePath}:`, error);
      return {};
    }
  }

  /**
   * Analyze layout relationships between elements
   * @param {Array} elements - Array of canvas elements
   * @returns {Object} Layout analysis results
   */
  analyzeLayoutRelationships(elements) {
    const analysis = {
      containers: [],
      groups: [],
      hierarchies: []
    };
    
    // Find container elements (flex/grid)
    const containers = elements.filter(el => 
      el.layout && (el.layout.type === 'flexbox' || el.layout.type === 'grid')
    );
    
    analysis.containers = containers.map(container => ({
      id: container.id,
      type: container.layout.type,
      selector: container.cssSelector,
      properties: container.layout,
      children: this.findChildElements(container, elements)
    }));
    
    // Group elements by proximity and visual similarity
    analysis.groups = this.groupElementsByProximity(elements);
    
    // Build hierarchy based on CSS selectors
    analysis.hierarchies = this.buildSelectorHierarchy(elements);
    
    return analysis;
  }

  /**
   * Find child elements for a container
   * @param {Object} container - Container element
   * @param {Array} elements - All elements
   * @returns {Array} Child elements
   */
  findChildElements(container, elements) {
    // Simple heuristic: elements with selectors that are children of container selector
    const containerSelector = container.cssSelector.replace(/^\./, '');
    
    return elements.filter(el => {
      if (el.id === container.id) return false;
      
      // Check if selector suggests parent-child relationship
      return el.cssSelector.includes(containerSelector) && 
             el.cssSelector !== container.cssSelector;
    });
  }

  /**
   * Group elements by visual proximity
   * @param {Array} elements - Array of elements
   * @returns {Array} Element groups
   */
  groupElementsByProximity(elements) {
    const groups = [];
    const processed = new Set();
    
    elements.forEach(element => {
      if (processed.has(element.id)) return;
      
      const group = {
        id: `group_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        elements: [element],
        bounds: this.getElementBounds(element)
      };
      
      // Find nearby elements
      elements.forEach(other => {
        if (other.id === element.id || processed.has(other.id)) return;
        
        if (this.areElementsNearby(element, other)) {
          group.elements.push(other);
          group.bounds = this.expandBounds(group.bounds, this.getElementBounds(other));
        }
      });
      
      // Only create group if it has multiple elements
      if (group.elements.length > 1) {
        group.elements.forEach(el => processed.add(el.id));
        groups.push(group);
      }
    });
    
    return groups;
  }

  /**
   * Build hierarchy based on CSS selectors
   * @param {Array} elements - Array of elements
   * @returns {Array} Hierarchy tree
   */
  buildSelectorHierarchy(elements) {
    const hierarchy = [];
    const selectorMap = new Map();
    
    // Create map of selectors to elements
    elements.forEach(element => {
      selectorMap.set(element.cssSelector, element);
    });
    
    // Build tree structure based on selector specificity and nesting
    elements.forEach(element => {
      const parents = this.findParentSelectors(element.cssSelector, selectorMap);
      
      if (parents.length === 0) {
        // Root level element
        hierarchy.push({
          element,
          children: this.findChildrenInHierarchy(element, elements)
        });
      }
    });
    
    return hierarchy;
  }

  /**
   * Find parent selectors for a given selector
   * @param {string} selector - CSS selector
   * @param {Map} selectorMap - Map of selectors to elements
   * @returns {Array} Parent elements
   */
  findParentSelectors(selector, selectorMap) {
    const parents = [];
    
    // Simple heuristic: look for selectors that this one extends
    for (const [parentSelector] of selectorMap) {
      if (parentSelector !== selector && selector.includes(parentSelector)) {
        parents.push(selectorMap.get(parentSelector));
      }
    }
    
    return parents;
  }

  /**
   * Find children in hierarchy for an element
   * @param {Object} element - Parent element
   * @param {Array} elements - All elements
   * @returns {Array} Child elements
   */
  findChildrenInHierarchy(element, elements) {
    return elements.filter(other => 
      other.id !== element.id && 
      other.cssSelector.includes(element.cssSelector.replace(/^\./, ''))
    );
  }

  /**
   * Generate canvas data structure from elements
   * @param {Array} elements - Canvas elements
   * @param {Object} designTokens - Design tokens
   * @param {Object} layoutAnalysis - Layout analysis
   * @returns {Object} Canvas data
   */
  generateCanvasData(elements, designTokens, layoutAnalysis) {
    // Position elements based on layout analysis
    const positionedElements = this.positionElements(elements, layoutAnalysis);
    
    // Create layers from groups and containers
    const layers = this.createLayersFromAnalysis(layoutAnalysis);
    
    // Extract color palette from design tokens and element styles
    const colorPalette = this.extractColorPalette(elements, designTokens);
    
    return {
      canvas: {
        width: 1920,
        height: 1080,
        backgroundColor: '#ffffff',
        grid: { size: 8, visible: true }
      },
      layers,
      elements: positionedElements,
      colorPalette,
      designTokens,
      layoutAnalysis,
      metadata: {
        generatedFrom: 'css',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      }
    };
  }

  /**
   * Position elements based on layout analysis
   * @param {Array} elements - Canvas elements
   * @param {Object} layoutAnalysis - Layout analysis
   * @returns {Array} Positioned elements
   */
  positionElements(elements, layoutAnalysis) {
    const positioned = [...elements];
    let currentY = 50;
    const spacing = 100;
    
    // Position containers first
    layoutAnalysis.containers.forEach((container, index) => {
      const containerElement = positioned.find(el => el.id === container.id);
      if (containerElement) {
        containerElement.position = { x: 50, y: currentY };
        currentY += containerElement.size.height + spacing;
        
        // Position children relative to container
        this.positionContainerChildren(containerElement, container.children, positioned);
      }
    });
    
    // Position ungrouped elements
    positioned.forEach(element => {
      if (!element.position || (element.position.x === 0 && element.position.y === 0)) {
        element.position = { x: 50 + (Math.random() * 200), y: currentY };
        currentY += element.size.height + 50;
      }
    });
    
    return positioned;
  }

  /**
   * Position children within a container
   * @param {Object} container - Container element
   * @param {Array} children - Child elements
   * @param {Array} allElements - All positioned elements
   */
  positionContainerChildren(container, children, allElements) {
    const containerLayout = container.layout;
    let currentX = container.position.x + 20;
    let currentY = container.position.y + 20;
    
    children.forEach((child, index) => {
      const childElement = allElements.find(el => el.id === child.id);
      if (!childElement) return;
      
      if (containerLayout.type === 'flexbox') {
        if (containerLayout.direction === 'row') {
          childElement.position = { x: currentX, y: currentY };
          currentX += childElement.size.width + 20;
        } else {
          childElement.position = { x: currentX, y: currentY };
          currentY += childElement.size.height + 20;
        }
      } else if (containerLayout.type === 'grid') {
        // Simple grid positioning
        const cols = 3; // Simplified
        const col = index % cols;
        const row = Math.floor(index / cols);
        
        childElement.position = {
          x: currentX + (col * (childElement.size.width + 20)),
          y: currentY + (row * (childElement.size.height + 20))
        };
      }
    });
  }

  /**
   * Create layers from layout analysis
   * @param {Object} layoutAnalysis - Layout analysis
   * @returns {Array} Canvas layers
   */
  createLayersFromAnalysis(layoutAnalysis) {
    const layers = [
      {
        id: 'layer_background',
        name: 'Background',
        visible: true,
        locked: false,
        elements: []
      }
    ];
    
    // Create layer for each container
    layoutAnalysis.containers.forEach((container, index) => {
      layers.push({
        id: `layer_container_${index}`,
        name: `Container: ${container.type}`,
        visible: true,
        locked: false,
        elements: [container.id, ...container.children.map(c => c.id)]
      });
    });
    
    // Create layers for groups
    layoutAnalysis.groups.forEach((group, index) => {
      layers.push({
        id: `layer_group_${index}`,
        name: `Group ${index + 1}`,
        visible: true,
        locked: false,
        elements: group.elements.map(el => el.id)
      });
    });
    
    return layers;
  }

  /**
   * Extract color palette from elements and tokens
   * @param {Array} elements - Canvas elements
   * @param {Object} designTokens - Design tokens
   * @returns {Array} Color palette
   */
  extractColorPalette(elements, designTokens) {
    const colors = new Set();
    const palette = [];
    
    // Extract colors from design tokens
    Object.entries(designTokens.colors || {}).forEach(([name, value]) => {
      if (!colors.has(value)) {
        colors.add(value);
        palette.push({
          name: name.replace(/^--\w+-color-/, ''),
          color: value,
          usage: 'token'
        });
      }
    });
    
    // Extract colors from element styles
    elements.forEach(element => {
      if (element.style.fill && !colors.has(element.style.fill)) {
        colors.add(element.style.fill);
        palette.push({
          name: `color-${palette.length + 1}`,
          color: element.style.fill,
          usage: 'background'
        });
      }
      
      if (element.style.stroke && !colors.has(element.style.stroke)) {
        colors.add(element.style.stroke);
        palette.push({
          name: `color-${palette.length + 1}`,
          color: element.style.stroke,
          usage: 'border'
        });
      }
      
      if (element.style.textColor && !colors.has(element.style.textColor)) {
        colors.add(element.style.textColor);
        palette.push({
          name: `color-${palette.length + 1}`,
          color: element.style.textColor,
          usage: 'text'
        });
      }
    });
    
    return palette;
  }

  /**
   * Start watching CSS files for changes
   * @param {Function} callback - Callback function for updates
   */
  startWatching(callback) {
    if (this.isWatching) {
      console.log('Already watching CSS files');
      return;
    }
    
    this.updateCallbacks.push(callback);
    
    this.fileWatcher = chokidar.watch(this.options.watchPaths, {
      ignored: /node_modules/,
      persistent: true
    });
    
    this.fileWatcher.on('change', async (filePath) => {
      console.log(`CSS file changed: ${filePath}`);
      await this.handleCSSFileChange(filePath);
    });
    
    this.fileWatcher.on('add', async (filePath) => {
      console.log(`CSS file added: ${filePath}`);
      await this.handleCSSFileChange(filePath);
    });
    
    this.isWatching = true;
    console.log('Started watching CSS files:', this.options.watchPaths);
  }

  /**
   * Stop watching CSS files
   */
  stopWatching() {
    if (this.fileWatcher) {
      this.fileWatcher.close();
      this.fileWatcher = null;
    }
    
    this.isWatching = false;
    this.updateCallbacks = [];
    console.log('Stopped watching CSS files');
  }

  /**
   * Handle CSS file change event
   * @param {string} filePath - Changed file path
   */
  async handleCSSFileChange(filePath) {
    try {
      console.log(`🎨 Processing CSS changes in: ${filePath}`);
      
      // Load current canvas data
      const currentCanvasData = await this.loadCanvasData();
      
      // Parse the changed CSS file to get new elements
      const newElements = await this.cssParser.parseCSSFile(filePath);
      
      // Merge new elements with existing ones, preserving positions and IDs
      const updatedElements = this.mergeElements(
        currentCanvasData.elements || [], 
        newElements, 
        filePath
      );
      
      // Re-analyze layout relationships with updated elements
      const layoutAnalysis = this.analyzeLayoutRelationships(updatedElements);
      
      // Extract updated design tokens
      const designTokens = await this.extractTokensFromFile(filePath);
      
      // Update color palette
      const colorPalette = this.extractColorPalette(updatedElements, designTokens);
      
      // Update canvas data
      const updatedCanvasData = {
        ...currentCanvasData,
        elements: updatedElements,
        colorPalette: this.mergeColorPalettes(currentCanvasData.colorPalette || [], colorPalette),
        designTokens: { ...currentCanvasData.designTokens, ...designTokens },
        layoutAnalysis,
        metadata: {
          ...currentCanvasData.metadata,
          lastUpdated: new Date().toISOString(),
          updatedFrom: filePath,
          changeType: 'css-file-change'
        }
      };
      
      // Save updated canvas data
      if (this.options.updateCanvas) {
        await this.saveCanvasData(updatedCanvasData);
      }
      
      // Notify callbacks with detailed change information
      this.updateCallbacks.forEach(callback => {
        callback(updatedCanvasData, {
          filePath,
          changeType: 'css-update',
          newElements: newElements.length,
          updatedElements: updatedElements.length,
          timestamp: Date.now()
        });
      });
      
      console.log(`✅ Canvas updated from CSS changes: ${newElements.length} elements processed`);
      
    } catch (error) {
      console.error(`❌ Error handling CSS file change for ${filePath}:`, error);
      
      // Notify callbacks about the error
      this.updateCallbacks.forEach(callback => {
        callback(null, {
          filePath,
          changeType: 'error',
          error: error.message,
          timestamp: Date.now()
        });
      });
    }
  }

  /**
   * Merge new elements with existing ones, preserving important data
   * @param {Array} existingElements - Current canvas elements
   * @param {Array} newElements - New elements from CSS
   * @param {string} sourceFile - Source CSS file path
   * @returns {Array} Merged elements
   */
  mergeElements(existingElements, newElements, sourceFile) {
    const merged = [...existingElements];
    
    newElements.forEach(newElement => {
      // Try to find existing element by CSS selector or ID
      const existingIndex = merged.findIndex(existing => 
        existing.cssSelector === newElement.cssSelector ||
        (existing.sourceFile === sourceFile && existing.id === newElement.id)
      );
      
      if (existingIndex >= 0) {
        // Update existing element, preserve position and canvas-specific data
        const existing = merged[existingIndex];
        merged[existingIndex] = {
          ...newElement,
          id: existing.id, // Keep original ID
          position: existing.position || newElement.position, // Preserve position
          layerId: existing.layerId || newElement.layerId, // Preserve layer assignment
          canvasMetadata: existing.canvasMetadata, // Preserve canvas-specific metadata
          lastModified: new Date().toISOString()
        };
      } else {
        // Add new element
        newElement.sourceFile = sourceFile;
        newElement.lastModified = new Date().toISOString();
        merged.push(newElement);
      }
    });
    
    // Remove elements that no longer exist in the CSS file
    const elementsFromFile = merged.filter(el => el.sourceFile !== sourceFile);
    const updatedElementsFromFile = newElements.map(newEl => {
      const existing = merged.find(el => 
        el.cssSelector === newEl.cssSelector || 
        (el.sourceFile === sourceFile && el.id === newEl.id)
      );
      return existing || newEl;
    });
    
    return [...elementsFromFile, ...updatedElementsFromFile];
  }

  /**
   * Merge color palettes, avoiding duplicates
   * @param {Array} existingPalette - Current color palette
   * @param {Array} newPalette - New colors from CSS
   * @returns {Array} Merged palette
   */
  mergeColorPalettes(existingPalette, newPalette) {
    const merged = [...existingPalette];
    const existingColors = new Set(existingPalette.map(c => c.color));
    
    newPalette.forEach(newColor => {
      if (!existingColors.has(newColor.color)) {
        merged.push(newColor);
        existingColors.add(newColor.color);
      }
    });
    
    return merged;
  }

  /**
   * Load current canvas data
   * @returns {Object} Canvas data
   */
  async loadCanvasData() {
    try {
      const data = await fs.readFile(this.options.canvasDataPath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      // Return default canvas data if file doesn't exist
      return {
        canvas: { width: 1920, height: 1080, backgroundColor: '#ffffff' },
        layers: [],
        elements: [],
        colorPalette: [],
        designTokens: {}
      };
    }
  }

  /**
   * Save canvas data to file
   * @param {Object} canvasData - Canvas data to save
   */
  async saveCanvasData(canvasData) {
    try {
      // Ensure directory exists
      const dir = path.dirname(this.options.canvasDataPath);
      await fs.mkdir(dir, { recursive: true });
      
      // Write canvas data
      await fs.writeFile(
        this.options.canvasDataPath, 
        JSON.stringify(canvasData, null, 2), 
        'utf8'
      );
      
      console.log(`Canvas data updated: ${this.options.canvasDataPath}`);
    } catch (error) {
      console.error('Error saving canvas data:', error);
      throw error;
    }
  }

  /**
   * Utility methods for element positioning and analysis
   */

  getElementBounds(element) {
    return {
      x: element.position.x,
      y: element.position.y,
      width: element.size.width,
      height: element.size.height
    };
  }

  areElementsNearby(element1, element2, threshold = 50) {
    const bounds1 = this.getElementBounds(element1);
    const bounds2 = this.getElementBounds(element2);
    
    const distance = Math.sqrt(
      Math.pow(bounds1.x - bounds2.x, 2) + 
      Math.pow(bounds1.y - bounds2.y, 2)
    );
    
    return distance <= threshold;
  }

  expandBounds(bounds1, bounds2) {
    return {
      x: Math.min(bounds1.x, bounds2.x),
      y: Math.min(bounds1.y, bounds2.y),
      width: Math.max(bounds1.x + bounds1.width, bounds2.x + bounds2.width) - Math.min(bounds1.x, bounds2.x),
      height: Math.max(bounds1.y + bounds1.height, bounds2.y + bounds2.height) - Math.min(bounds1.y, bounds2.y)
    };
  }
}

module.exports = CSSToCanvasEngine;