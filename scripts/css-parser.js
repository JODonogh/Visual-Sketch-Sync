/**
 * CSS Parser - Extracts visual properties from CSS and converts to canvas shapes
 * Part of the VDS (Visual Design Sync) system
 */

const fs = require('fs').promises;
const path = require('path');

class CSSParser {
  constructor(options = {}) {
    this.options = {
      classPrefix: 'vds-',
      supportedProperties: [
        'width', 'height', 'min-width', 'min-height', 'max-width', 'max-height',
        'background-color', 'background-image', 'background-size', 'background-position',
        'border', 'border-radius', 'border-color', 'border-width', 'border-style',
        'border-top', 'border-right', 'border-bottom', 'border-left',
        'color', 'font-size', 'font-weight', 'font-family', 'line-height', 'text-align',
        'padding', 'margin', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
        'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
        'display', 'flex-direction', 'justify-content', 'align-items', 'flex-wrap',
        'grid-template-columns', 'grid-template-rows', 'grid-gap', 'gap',
        'position', 'top', 'right', 'bottom', 'left', 'z-index',
        'transform', 'transform-origin', 'transition', 'animation',
        'box-shadow', 'text-shadow', 'opacity', 'visibility', 'overflow',
        'cursor', 'pointer-events'
      ],
      parseMediaQueries: true,
      parseCustomProperties: true,
      parseNestedRules: true,
      ...options
    };
  }

  /**
   * Parse CSS file and extract visual elements
   * @param {string} filePath - Path to CSS file
   * @returns {Array} Array of canvas elements
   */
  async parseCSSFile(filePath) {
    try {
      const cssContent = await fs.readFile(filePath, 'utf8');
      return this.parseCSSContent(cssContent);
    } catch (error) {
      console.error(`Error reading CSS file ${filePath}:`, error);
      return [];
    }
  }

  /**
   * Parse CSS content string and extract visual elements
   * @param {string} cssContent - CSS content string
   * @returns {Array} Array of canvas elements
   */
  parseCSSContent(cssContent) {
    const elements = [];
    const rules = this.extractCSSRules(cssContent);
    
    rules.forEach(rule => {
      const element = this.cssRuleToCanvasElement(rule);
      if (element) {
        elements.push(element);
      }
    });
    
    return elements;
  }

  /**
   * Extract CSS rules from content
   * @param {string} cssContent - CSS content
   * @returns {Array} Array of CSS rule objects
   */
  extractCSSRules(cssContent) {
    const rules = [];
    
    // Remove comments
    const cleanCSS = cssContent.replace(/\/\*[\s\S]*?\*\//g, '');
    
    // Handle nested rules and media queries
    const processedCSS = this.preprocessCSS(cleanCSS);
    
    // Match CSS rules with improved regex that handles nested braces
    const ruleRegex = /([^{}]+)\s*\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g;
    let match;
    
    while ((match = ruleRegex.exec(processedCSS)) !== null) {
      const selector = match[1].trim();
      const content = match[2].trim();
      
      // Handle media queries and other at-rules
      if (selector.startsWith('@media')) {
        const mediaRules = this.parseMediaQuery(selector, content);
        rules.push(...mediaRules);
        continue;
      }
      
      // Skip other at-rules for now
      if (selector.startsWith('@')) continue;
      
      // Check if content contains nested rules (for CSS-in-JS or preprocessors)
      if (content.includes('{')) {
        const nestedRules = this.parseNestedRules(selector, content);
        rules.push(...nestedRules);
      } else {
        const properties = this.parseDeclarations(content);
        
        // Only include rules with visual properties
        if (this.hasVisualProperties(properties)) {
          rules.push({
            selector,
            properties,
            specificity: this.calculateSpecificity(selector),
            mediaQuery: null
          });
        }
      }
    }
    
    return rules;
  }

  /**
   * Preprocess CSS to handle special cases
   * @param {string} css - CSS content
   * @returns {string} Preprocessed CSS
   */
  preprocessCSS(css) {
    // Handle CSS custom properties (variables)
    let processed = css;
    
    // Extract and store custom properties
    const customProps = {};
    const customPropRegex = /--([^:]+):\s*([^;]+);/g;
    let match;
    
    while ((match = customPropRegex.exec(css)) !== null) {
      customProps[`--${match[1].trim()}`] = match[2].trim();
    }
    
    // Replace var() references with actual values
    Object.entries(customProps).forEach(([prop, value]) => {
      const varRegex = new RegExp(`var\\(\\s*${prop.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\)`, 'g');
      processed = processed.replace(varRegex, value);
    });
    
    return processed;
  }

  /**
   * Parse media query rules
   * @param {string} mediaSelector - Media query selector
   * @param {string} content - Media query content
   * @returns {Array} Array of rules within media query
   */
  parseMediaQuery(mediaSelector, content) {
    const rules = [];
    const mediaCondition = mediaSelector.replace('@media', '').trim();
    
    const ruleRegex = /([^{}]+)\s*\{([^{}]*)\}/g;
    let match;
    
    while ((match = ruleRegex.exec(content)) !== null) {
      const selector = match[1].trim();
      const declarations = match[2].trim();
      const properties = this.parseDeclarations(declarations);
      
      if (this.hasVisualProperties(properties)) {
        rules.push({
          selector,
          properties,
          specificity: this.calculateSpecificity(selector),
          mediaQuery: mediaCondition
        });
      }
    }
    
    return rules;
  }

  /**
   * Parse nested CSS rules
   * @param {string} parentSelector - Parent selector
   * @param {string} content - Content with nested rules
   * @returns {Array} Array of flattened rules
   */
  parseNestedRules(parentSelector, content) {
    const rules = [];
    
    // Extract direct properties first
    const directProps = this.extractDirectProperties(content);
    if (Object.keys(directProps).length > 0 && this.hasVisualProperties(directProps)) {
      rules.push({
        selector: parentSelector,
        properties: directProps,
        specificity: this.calculateSpecificity(parentSelector),
        mediaQuery: null
      });
    }
    
    // Extract nested rules
    const nestedRegex = /([^{}]+)\s*\{([^{}]*)\}/g;
    let match;
    
    while ((match = nestedRegex.exec(content)) !== null) {
      const nestedSelector = match[1].trim();
      const nestedDeclarations = match[2].trim();
      const nestedProperties = this.parseDeclarations(nestedDeclarations);
      
      if (this.hasVisualProperties(nestedProperties)) {
        // Combine parent and nested selectors
        const fullSelector = this.combineSelectors(parentSelector, nestedSelector);
        
        rules.push({
          selector: fullSelector,
          properties: nestedProperties,
          specificity: this.calculateSpecificity(fullSelector),
          mediaQuery: null
        });
      }
    }
    
    return rules;
  }

  /**
   * Extract direct properties from content that may have nested rules
   * @param {string} content - CSS content
   * @returns {Object} Direct properties
   */
  extractDirectProperties(content) {
    const properties = {};
    const lines = content.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.includes('{') && !trimmed.includes('}')) {
        const colonIndex = trimmed.indexOf(':');
        if (colonIndex > 0) {
          const property = trimmed.substring(0, colonIndex).trim();
          const value = trimmed.substring(colonIndex + 1).replace(';', '').trim();
          
          if (this.options.supportedProperties.includes(property)) {
            properties[property] = value;
          }
        }
      }
    }
    
    return properties;
  }

  /**
   * Combine parent and nested selectors
   * @param {string} parent - Parent selector
   * @param {string} nested - Nested selector
   * @returns {string} Combined selector
   */
  combineSelectors(parent, nested) {
    // Handle & reference in nested selector
    if (nested.includes('&')) {
      return nested.replace(/&/g, parent);
    }
    
    // Handle pseudo-classes and pseudo-elements
    if (nested.startsWith(':')) {
      return parent + nested;
    }
    
    // Default: descendant selector
    return `${parent} ${nested}`;
  }

  /**
   * Check if properties contain visual properties worth converting
   * @param {Object} properties - CSS properties
   * @returns {boolean} True if has visual properties
   */
  hasVisualProperties(properties) {
    const visualProps = [
      'width', 'height', 'background-color', 'background-image', 'border', 
      'border-radius', 'color', 'font-size', 'box-shadow', 'transform',
      'border-width', 'border-color', 'border-style', 'opacity'
    ];
    
    return Object.keys(properties).some(prop => visualProps.includes(prop));
  }

  /**
   * Parse CSS declarations into property object
   * @param {string} declarations - CSS declarations string
   * @returns {Object} Properties object
   */
  parseDeclarations(declarations) {
    const properties = {};
    
    const declarationRegex = /([^:;]+):\s*([^;]+)/g;
    let match;
    
    while ((match = declarationRegex.exec(declarations)) !== null) {
      const property = match[1].trim();
      const value = match[2].trim();
      
      if (this.options.supportedProperties.includes(property)) {
        properties[property] = value;
      }
    }
    
    return properties;
  }

  /**
   * Convert CSS rule to canvas element
   * @param {Object} rule - CSS rule object
   * @returns {Object|null} Canvas element or null
   */
  cssRuleToCanvasElement(rule) {
    const { selector, properties } = rule;
    
    // Determine element type from CSS properties
    const elementType = this.determineElementType(properties);
    if (!elementType) return null;
    
    // Extract element ID from selector if it's a VDS-generated class
    const elementId = this.extractElementId(selector);
    
    const element = {
      id: elementId || this.generateElementId(),
      type: elementType,
      position: { x: 0, y: 0 }, // Will be updated by layout analysis
      size: this.extractSize(properties),
      style: this.extractStyle(properties),
      cssSelector: selector,
      cssProperties: properties
    };
    
    // Add layout information if present
    const layoutInfo = this.extractLayoutInfo(properties);
    if (layoutInfo) {
      element.layout = layoutInfo;
    }
    
    return element;
  }

  /**
   * Determine canvas element type from CSS properties
   * @param {Object} properties - CSS properties
   * @returns {string|null} Element type or null
   */
  determineElementType(properties) {
    // Check for circular elements
    if (properties['border-radius'] === '50%' || 
        (properties['border-radius'] && properties.width === properties.height)) {
      return 'circle';
    }
    
    // Check for layout containers
    if (properties.display === 'flex' || properties.display === 'grid') {
      return 'container';
    }
    
    // Check for text elements
    if (properties['font-size'] || properties['font-weight'] || properties['font-family'] || properties.color) {
      return 'text';
    }
    
    // Check for image elements
    if (properties['background-image'] && properties['background-image'] !== 'none') {
      return 'image';
    }
    
    // Check for line elements (thin rectangles)
    if (this.isLineElement(properties)) {
      return 'line';
    }
    
    // Check for rectangular elements
    if (properties.width || properties.height || properties['background-color'] || 
        properties.border || properties['border-width']) {
      return 'rectangle';
    }
    
    return null;
  }

  /**
   * Check if element should be treated as a line
   * @param {Object} properties - CSS properties
   * @returns {boolean} True if element is line-like
   */
  isLineElement(properties) {
    const width = this.parseCSSValue(properties.width || '0');
    const height = this.parseCSSValue(properties.height || '0');
    
    // Consider it a line if one dimension is much smaller than the other
    if (width.unit === 'px' && height.unit === 'px') {
      const ratio = Math.max(width.value, height.value) / Math.min(width.value, height.value);
      return ratio > 10 && Math.min(width.value, height.value) <= 5;
    }
    
    return false;
  }

  /**
   * Extract element ID from CSS selector
   * @param {string} selector - CSS selector
   * @returns {string|null} Element ID or null
   */
  extractElementId(selector) {
    // Match VDS-generated class names
    const vdsClassRegex = new RegExp(`\\.${this.options.classPrefix}(\\w+)-(\\w+)`);
    const match = selector.match(vdsClassRegex);
    
    if (match) {
      return match[2]; // Return the ID part
    }
    
    // Try to extract from ID selector
    const idMatch = selector.match(/#([a-zA-Z0-9_-]+)/);
    if (idMatch) {
      return idMatch[1];
    }
    
    return null;
  }

  /**
   * Generate unique element ID
   * @returns {string} Generated ID
   */
  generateElementId() {
    return 'css_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Extract size information from CSS properties
   * @param {Object} properties - CSS properties
   * @returns {Object} Size object
   */
  extractSize(properties) {
    const size = { width: 100, height: 100 }; // Default size
    
    if (properties.width) {
      const width = this.parseCSSValue(properties.width);
      if (width.unit === 'px') {
        size.width = width.value;
      }
    }
    
    if (properties.height) {
      const height = this.parseCSSValue(properties.height);
      if (height.unit === 'px') {
        size.height = height.value;
      }
    }
    
    return size;
  }

  /**
   * Extract style information from CSS properties
   * @param {Object} properties - CSS properties
   * @returns {Object} Style object
   */
  extractStyle(properties) {
    const style = {};
    
    // Background properties
    if (properties['background-color']) {
      style.fill = properties['background-color'];
    }
    
    if (properties['background-image'] && properties['background-image'] !== 'none') {
      style.backgroundImage = this.parseBackgroundImage(properties['background-image']);
    }
    
    if (properties['background-size']) {
      style.backgroundSize = properties['background-size'];
    }
    
    if (properties['background-position']) {
      style.backgroundPosition = properties['background-position'];
    }
    
    // Border properties
    if (properties.border) {
      const border = this.parseBorderShorthand(properties.border);
      style.stroke = border.color;
      style.strokeWidth = border.width;
      style.strokeStyle = border.style;
    } else {
      if (properties['border-color']) {
        style.stroke = properties['border-color'];
      }
      if (properties['border-width']) {
        const width = this.parseCSSValue(properties['border-width']);
        if (width.unit === 'px') {
          style.strokeWidth = width.value;
        }
      }
      if (properties['border-style']) {
        style.strokeStyle = properties['border-style'];
      }
    }
    
    // Border radius
    if (properties['border-radius']) {
      if (properties['border-radius'] === '50%') {
        style.borderRadius = 'circle';
      } else {
        const radius = this.parseCSSValue(properties['border-radius']);
        if (radius.unit === 'px') {
          style.borderRadius = radius.value;
        } else if (radius.unit === '%') {
          style.borderRadius = `${radius.value}%`;
        }
      }
    }
    
    // Box shadow
    if (properties['box-shadow'] && properties['box-shadow'] !== 'none') {
      style.boxShadow = this.parseBoxShadow(properties['box-shadow']);
    }
    
    // Transform properties
    if (properties.transform && properties.transform !== 'none') {
      style.transform = this.parseTransform(properties.transform);
    }
    
    // Opacity
    if (properties.opacity && properties.opacity !== '1') {
      style.opacity = parseFloat(properties.opacity);
    }
    
    // Text properties
    if (properties.color) {
      style.textColor = properties.color;
    }
    
    if (properties['font-size']) {
      const fontSize = this.parseCSSValue(properties['font-size']);
      if (fontSize.unit === 'px') {
        style.fontSize = fontSize.value;
      } else if (fontSize.unit === 'em' || fontSize.unit === 'rem') {
        // Convert em/rem to approximate px (assuming 16px base)
        style.fontSize = fontSize.value * 16;
      }
    }
    
    if (properties['font-weight']) {
      style.fontWeight = properties['font-weight'];
    }
    
    if (properties['font-family']) {
      style.fontFamily = properties['font-family'].replace(/['"]/g, '');
    }
    
    if (properties['text-align']) {
      style.textAlign = properties['text-align'];
    }
    
    if (properties['line-height']) {
      style.lineHeight = properties['line-height'];
    }
    
    // Spacing properties
    if (properties.padding) {
      style.padding = this.parseSpacing(properties.padding);
    }
    
    if (properties.margin) {
      style.margin = this.parseSpacing(properties.margin);
    }
    
    return style;
  }

  /**
   * Parse background image URL
   * @param {string} backgroundImage - CSS background-image value
   * @returns {string} Parsed image URL
   */
  parseBackgroundImage(backgroundImage) {
    const urlMatch = backgroundImage.match(/url\(['"]?([^'"]+)['"]?\)/);
    return urlMatch ? urlMatch[1] : backgroundImage;
  }

  /**
   * Parse box shadow property
   * @param {string} boxShadow - CSS box-shadow value
   * @returns {Object} Parsed shadow object
   */
  parseBoxShadow(boxShadow) {
    // Simple parsing for basic box shadows
    const parts = boxShadow.split(/\s+/);
    const shadow = {
      offsetX: 0,
      offsetY: 0,
      blurRadius: 0,
      spreadRadius: 0,
      color: 'rgba(0, 0, 0, 0.1)'
    };
    
    let partIndex = 0;
    
    // Parse numeric values
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const value = this.parseCSSValue(part);
      
      if (value.unit === 'px' && partIndex < 4) {
        switch (partIndex) {
          case 0: shadow.offsetX = value.value; break;
          case 1: shadow.offsetY = value.value; break;
          case 2: shadow.blurRadius = value.value; break;
          case 3: shadow.spreadRadius = value.value; break;
        }
        partIndex++;
      } else if (part.match(/^#|rgb|hsl|rgba|hsla/)) {
        shadow.color = part;
      }
    }
    
    return shadow;
  }

  /**
   * Parse transform property
   * @param {string} transform - CSS transform value
   * @returns {Object} Parsed transform object
   */
  parseTransform(transform) {
    const transforms = {};
    
    // Parse translate
    const translateMatch = transform.match(/translate\(([^)]+)\)/);
    if (translateMatch) {
      const values = translateMatch[1].split(',').map(v => this.parseCSSValue(v.trim()));
      transforms.translateX = values[0]?.value || 0;
      transforms.translateY = values[1]?.value || 0;
    }
    
    // Parse rotate
    const rotateMatch = transform.match(/rotate\(([^)]+)\)/);
    if (rotateMatch) {
      const value = this.parseCSSValue(rotateMatch[1]);
      transforms.rotate = value.unit === 'deg' ? value.value : 0;
    }
    
    // Parse scale
    const scaleMatch = transform.match(/scale\(([^)]+)\)/);
    if (scaleMatch) {
      const values = scaleMatch[1].split(',').map(v => parseFloat(v.trim()));
      transforms.scaleX = values[0] || 1;
      transforms.scaleY = values[1] || values[0] || 1;
    }
    
    return transforms;
  }

  /**
   * Parse spacing properties (padding, margin)
   * @param {string} spacing - CSS spacing value
   * @returns {Object} Parsed spacing object
   */
  parseSpacing(spacing) {
    const values = spacing.split(/\s+/).map(v => this.parseCSSValue(v));
    
    // CSS shorthand: top, right, bottom, left
    switch (values.length) {
      case 1:
        return { top: values[0].value, right: values[0].value, bottom: values[0].value, left: values[0].value };
      case 2:
        return { top: values[0].value, right: values[1].value, bottom: values[0].value, left: values[1].value };
      case 3:
        return { top: values[0].value, right: values[1].value, bottom: values[2].value, left: values[1].value };
      case 4:
        return { top: values[0].value, right: values[1].value, bottom: values[2].value, left: values[3].value };
      default:
        return { top: 0, right: 0, bottom: 0, left: 0 };
    }
  }

  /**
   * Extract layout information from CSS properties
   * @param {Object} properties - CSS properties
   * @returns {Object|null} Layout information or null
   */
  extractLayoutInfo(properties) {
    const layout = {};
    
    if (properties.display === 'flex') {
      layout.type = 'flexbox';
      layout.direction = properties['flex-direction'] || 'row';
      layout.justifyContent = properties['justify-content'] || 'flex-start';
      layout.alignItems = properties['align-items'] || 'stretch';
      return layout;
    }
    
    if (properties.display === 'grid') {
      layout.type = 'grid';
      layout.columns = properties['grid-template-columns'] || 'auto';
      layout.rows = properties['grid-template-rows'] || 'auto';
      return layout;
    }
    
    return null;
  }

  /**
   * Parse CSS value with unit
   * @param {string} value - CSS value string
   * @returns {Object} Parsed value object
   */
  parseCSSValue(value) {
    const match = value.match(/^(-?\d*\.?\d+)(\w*)$/);
    
    if (match) {
      return {
        value: parseFloat(match[1]),
        unit: match[2] || ''
      };
    }
    
    return { value: 0, unit: '' };
  }

  /**
   * Parse border shorthand property
   * @param {string} border - Border shorthand value
   * @returns {Object} Parsed border object
   */
  parseBorderShorthand(border) {
    const parts = border.split(/\s+/);
    const result = { width: 1, style: 'solid', color: '#000000' };
    
    parts.forEach(part => {
      if (part.match(/^\d+px$/)) {
        result.width = parseInt(part);
      } else if (part.match(/^(solid|dashed|dotted)$/)) {
        result.style = part;
      } else if (part.match(/^#[0-9a-fA-F]{3,6}$/) || 
                 part.match(/^rgb/) || 
                 part.match(/^hsl/) ||
                 part.match(/^[a-zA-Z]+$/)) {
        result.color = part;
      }
    });
    
    return result;
  }

  /**
   * Calculate CSS selector specificity
   * @param {string} selector - CSS selector
   * @returns {number} Specificity score
   */
  calculateSpecificity(selector) {
    let specificity = 0;
    
    // Count IDs
    specificity += (selector.match(/#/g) || []).length * 100;
    
    // Count classes, attributes, and pseudo-classes
    specificity += (selector.match(/\.|:|\[/g) || []).length * 10;
    
    // Count elements and pseudo-elements
    specificity += (selector.match(/^[a-zA-Z]|::/g) || []).length * 1;
    
    return specificity;
  }

  /**
   * Update canvas elements when CSS changes
   * @param {string} filePath - Path to changed CSS file
   * @param {Array} currentElements - Current canvas elements
   * @returns {Array} Updated canvas elements
   */
  async updateElementsFromCSS(filePath, currentElements) {
    try {
      const newElements = await this.parseCSSFile(filePath);
      
      // Merge with existing elements, preserving positions and canvas metadata
      const updatedElements = [...currentElements];
      
      newElements.forEach(newElement => {
        const existingIndex = updatedElements.findIndex(
          el => el.cssSelector === newElement.cssSelector ||
               (el.sourceFile === filePath && el.id === newElement.id)
        );
        
        if (existingIndex >= 0) {
          // Update existing element, preserve important canvas data
          const existing = updatedElements[existingIndex];
          updatedElements[existingIndex] = {
            ...newElement,
            id: existing.id, // Keep original canvas ID
            position: existing.position || newElement.position,
            layerId: existing.layerId || newElement.layerId,
            canvasMetadata: existing.canvasMetadata,
            sourceFile: filePath,
            lastUpdated: new Date().toISOString()
          };
        } else {
          // Add new element with source tracking
          newElement.sourceFile = filePath;
          newElement.lastUpdated = new Date().toISOString();
          updatedElements.push(newElement);
        }
      });
      
      return updatedElements;
    } catch (error) {
      console.error('Error updating elements from CSS:', error);
      return currentElements;
    }
  }

  /**
   * Parse CSS content and return detailed change information
   * @param {string} cssContent - CSS content
   * @param {Array} previousElements - Previous elements for comparison
   * @returns {Object} Detailed change information
   */
  parseWithChangeDetection(cssContent, previousElements = []) {
    const newElements = this.parseCSSContent(cssContent);
    const changes = {
      added: [],
      modified: [],
      removed: [],
      unchanged: []
    };
    
    // Create maps for efficient lookup
    const previousMap = new Map(previousElements.map(el => [el.cssSelector, el]));
    const newMap = new Map(newElements.map(el => [el.cssSelector, el]));
    
    // Find added and modified elements
    newElements.forEach(newElement => {
      const previous = previousMap.get(newElement.cssSelector);
      
      if (!previous) {
        changes.added.push(newElement);
      } else if (this.hasElementChanged(previous, newElement)) {
        changes.modified.push({
          previous,
          current: newElement,
          changes: this.getElementChanges(previous, newElement)
        });
      } else {
        changes.unchanged.push(newElement);
      }
    });
    
    // Find removed elements
    previousElements.forEach(prevElement => {
      if (!newMap.has(prevElement.cssSelector)) {
        changes.removed.push(prevElement);
      }
    });
    
    return {
      elements: newElements,
      changes,
      summary: {
        total: newElements.length,
        added: changes.added.length,
        modified: changes.modified.length,
        removed: changes.removed.length,
        unchanged: changes.unchanged.length
      }
    };
  }

  /**
   * Check if an element has changed between versions
   * @param {Object} previous - Previous element
   * @param {Object} current - Current element
   * @returns {boolean} True if element has changed
   */
  hasElementChanged(previous, current) {
    // Compare key properties that affect visual representation
    const compareProps = ['size', 'style', 'type'];
    
    return compareProps.some(prop => {
      return JSON.stringify(previous[prop]) !== JSON.stringify(current[prop]);
    });
  }

  /**
   * Get detailed changes between two elements
   * @param {Object} previous - Previous element
   * @param {Object} current - Current element
   * @returns {Object} Detailed changes
   */
  getElementChanges(previous, current) {
    const changes = {};
    
    // Size changes
    if (JSON.stringify(previous.size) !== JSON.stringify(current.size)) {
      changes.size = {
        from: previous.size,
        to: current.size
      };
    }
    
    // Style changes
    if (JSON.stringify(previous.style) !== JSON.stringify(current.style)) {
      changes.style = {
        from: previous.style,
        to: current.style,
        properties: this.getStylePropertyChanges(previous.style, current.style)
      };
    }
    
    // Type changes (rare but possible)
    if (previous.type !== current.type) {
      changes.type = {
        from: previous.type,
        to: current.type
      };
    }
    
    return changes;
  }

  /**
   * Get changes in style properties
   * @param {Object} previousStyle - Previous style
   * @param {Object} currentStyle - Current style
   * @returns {Object} Style property changes
   */
  getStylePropertyChanges(previousStyle, currentStyle) {
    const changes = {};
    const allProps = new Set([...Object.keys(previousStyle), ...Object.keys(currentStyle)]);
    
    allProps.forEach(prop => {
      const prevValue = previousStyle[prop];
      const currValue = currentStyle[prop];
      
      if (prevValue !== currValue) {
        changes[prop] = {
          from: prevValue,
          to: currValue
        };
      }
    });
    
    return changes;
  }

  /**
   * Extract design tokens from CSS custom properties
   * @param {string} cssContent - CSS content
   * @returns {Object} Extracted design tokens
   */
  extractDesignTokens(cssContent) {
    const tokens = {
      colors: {},
      spacing: {},
      typography: {}
    };
    
    // Match CSS custom properties
    const customPropRegex = /--([^:]+):\s*([^;]+)/g;
    let match;
    
    while ((match = customPropRegex.exec(cssContent)) !== null) {
      const name = match[1].trim();
      const value = match[2].trim();
      
      // Categorize tokens
      if (name.includes('color')) {
        tokens.colors[name] = value;
      } else if (name.includes('spacing') || name.includes('size')) {
        tokens.spacing[name] = value;
      } else if (name.includes('font')) {
        tokens.typography[name] = value;
      }
    }
    
    return tokens;
  }
}

module.exports = CSSParser;