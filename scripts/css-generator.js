/**
 * CSS Generator - Converts canvas shapes and design elements into CSS classes
 * Part of the VDS (Visual Design Sync) system
 */

class CSSGenerator {
  constructor(options = {}) {
    this.options = {
      useCustomProperties: true,
      generateResponsive: true,
      classPrefix: 'vds-',
      ...options
    };
  }

  /**
   * Convert a rectangle shape to CSS class
   * @param {Object} shape - Rectangle shape data
   * @returns {string} CSS class definition
   */
  rectangleToCSS(shape) {
    const { id, position, size, style } = shape;
    const className = `${this.options.classPrefix}rect-${id}`;
    
    let css = `.${className} {\n`;
    
    // Position and size
    css += `  width: ${size.width}px;\n`;
    css += `  height: ${size.height}px;\n`;
    
    // Background and border
    if (style.fill) {
      css += `  background-color: ${style.fill};\n`;
    }
    
    if (style.stroke) {
      css += `  border: ${style.strokeWidth || 1}px solid ${style.stroke};\n`;
    }
    
    if (style.borderRadius) {
      css += `  border-radius: ${style.borderRadius}px;\n`;
    }
    
    // Box model
    css += `  box-sizing: border-box;\n`;
    css += `  display: inline-block;\n`;
    
    css += `}\n`;
    
    return css;
  }

  /**
   * Convert a circle shape to CSS class
   * @param {Object} shape - Circle shape data
   * @returns {string} CSS class definition
   */
  circleToCSS(shape) {
    const { id, size, style } = shape;
    const className = `${this.options.classPrefix}circle-${id}`;
    const radius = Math.min(size.width, size.height) / 2;
    
    let css = `.${className} {\n`;
    css += `  width: ${radius * 2}px;\n`;
    css += `  height: ${radius * 2}px;\n`;
    css += `  border-radius: 50%;\n`;
    
    if (style.fill) {
      css += `  background-color: ${style.fill};\n`;
    }
    
    if (style.stroke) {
      css += `  border: ${style.strokeWidth || 1}px solid ${style.stroke};\n`;
    }
    
    css += `  box-sizing: border-box;\n`;
    css += `  display: inline-block;\n`;
    css += `}\n`;
    
    return css;
  }

  /**
   * Convert freehand drawing to CSS clip-path
   * @param {Object} drawing - Freehand drawing data
   * @returns {string} CSS class with clip-path
   */
  pathToCSS(drawing) {
    const { id, path, style } = drawing;
    const className = `${this.options.classPrefix}path-${id}`;
    
    // Convert SVG path to CSS clip-path polygon
    const clipPath = this.svgPathToClipPath(path);
    
    let css = `.${className} {\n`;
    css += `  clip-path: ${clipPath};\n`;
    
    if (style.fill) {
      css += `  background-color: ${style.fill};\n`;
    }
    
    css += `}\n`;
    
    return css;
  }

  /**
   * Generate layout CSS from element alignment
   * @param {Array} elements - Array of positioned elements
   * @returns {string} CSS for layout container
   */
  generateLayoutCSS(elements) {
    const layout = this.analyzeLayout(elements);
    const className = `${this.options.classPrefix}layout-${Date.now()}`;
    
    let css = `.${className} {\n`;
    
    if (layout.type === 'flexbox') {
      css += `  display: flex;\n`;
      css += `  flex-direction: ${layout.direction};\n`;
      css += `  justify-content: ${layout.justifyContent};\n`;
      css += `  align-items: ${layout.alignItems};\n`;
      css += `  gap: ${layout.gap}px;\n`;
    } else if (layout.type === 'grid') {
      css += `  display: grid;\n`;
      css += `  grid-template-columns: ${layout.columns};\n`;
      css += `  grid-template-rows: ${layout.rows};\n`;
      css += `  gap: ${layout.gap}px;\n`;
    }
    
    css += `}\n`;
    
    return css;
  }

  /**
   * Generate responsive CSS with breakpoints
   * @param {Array} breakpoints - Responsive breakpoint data
   * @returns {string} CSS with media queries
   */
  generateResponsiveCSS(breakpoints) {
    let css = '';
    
    breakpoints.forEach(bp => {
      css += `@media (max-width: ${bp.maxWidth}px) {\n`;
      
      bp.elements.forEach(element => {
        const elementCSS = this.elementToCSS(element);
        css += this.indentCSS(elementCSS, 2);
      });
      
      css += `}\n\n`;
    });
    
    return css;
  }

  /**
   * Analyze element positions to determine layout type
   * @param {Array} elements - Array of positioned elements
   * @returns {Object} Layout analysis result
   */
  analyzeLayout(elements) {
    if (elements.length < 2) {
      return { type: 'static' };
    }

    // Sort elements by position
    const sortedByX = [...elements].sort((a, b) => a.position.x - b.position.x);
    const sortedByY = [...elements].sort((a, b) => a.position.y - b.position.y);
    
    // Check for horizontal alignment (flexbox row)
    const horizontallyAligned = this.checkHorizontalAlignment(sortedByY);
    if (horizontallyAligned) {
      return {
        type: 'flexbox',
        direction: 'row',
        justifyContent: this.getJustifyContent(sortedByX),
        alignItems: 'center',
        gap: this.calculateGap(sortedByX, 'horizontal')
      };
    }
    
    // Check for vertical alignment (flexbox column)
    const verticallyAligned = this.checkVerticalAlignment(sortedByX);
    if (verticallyAligned) {
      return {
        type: 'flexbox',
        direction: 'column',
        justifyContent: this.getJustifyContent(sortedByY),
        alignItems: 'center',
        gap: this.calculateGap(sortedByY, 'vertical')
      };
    }
    
    // Check for grid layout
    const gridLayout = this.analyzeGridLayout(elements);
    if (gridLayout.isGrid) {
      return {
        type: 'grid',
        columns: gridLayout.columns,
        rows: gridLayout.rows,
        gap: gridLayout.gap
      };
    }
    
    return { type: 'absolute' };
  }

  /**
   * Check if elements are horizontally aligned
   * @param {Array} elements - Elements sorted by Y position
   * @returns {boolean} True if horizontally aligned
   */
  checkHorizontalAlignment(elements) {
    const tolerance = 10; // pixels
    const firstY = elements[0].position.y;
    
    return elements.every(el => 
      Math.abs(el.position.y - firstY) <= tolerance
    );
  }

  /**
   * Check if elements are vertically aligned
   * @param {Array} elements - Elements sorted by X position
   * @returns {boolean} True if vertically aligned
   */
  checkVerticalAlignment(elements) {
    const tolerance = 10; // pixels
    const firstX = elements[0].position.x;
    
    return elements.every(el => 
      Math.abs(el.position.x - firstX) <= tolerance
    );
  }

  /**
   * Determine justify-content value based on element distribution
   * @param {Array} elements - Sorted elements
   * @returns {string} CSS justify-content value
   */
  getJustifyContent(elements) {
    if (elements.length < 3) return 'flex-start';
    
    const gaps = [];
    for (let i = 1; i < elements.length; i++) {
      const prev = elements[i - 1];
      const curr = elements[i];
      const gap = curr.position.x - (prev.position.x + prev.size.width);
      gaps.push(gap);
    }
    
    const avgGap = gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length;
    const gapVariance = gaps.reduce((sum, gap) => sum + Math.pow(gap - avgGap, 2), 0) / gaps.length;
    
    // If gaps are consistent, likely space-between or space-around
    if (gapVariance < 100) {
      return avgGap > 20 ? 'space-between' : 'flex-start';
    }
    
    return 'flex-start';
  }

  /**
   * Calculate gap between elements
   * @param {Array} elements - Sorted elements
   * @param {string} direction - 'horizontal' or 'vertical'
   * @returns {number} Gap in pixels
   */
  calculateGap(elements, direction) {
    if (elements.length < 2) return 0;
    
    const gaps = [];
    for (let i = 1; i < elements.length; i++) {
      const prev = elements[i - 1];
      const curr = elements[i];
      
      let gap;
      if (direction === 'horizontal') {
        gap = curr.position.x - (prev.position.x + prev.size.width);
      } else {
        gap = curr.position.y - (prev.position.y + prev.size.height);
      }
      
      if (gap > 0) gaps.push(gap);
    }
    
    return gaps.length > 0 ? Math.round(gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length) : 0;
  }

  /**
   * Analyze if elements form a grid layout
   * @param {Array} elements - Array of elements
   * @returns {Object} Grid analysis result
   */
  analyzeGridLayout(elements) {
    // Simple grid detection - check for regular rows and columns
    const rows = this.groupByRows(elements);
    const cols = this.groupByColumns(elements);
    
    if (rows.length > 1 && cols.length > 1) {
      return {
        isGrid: true,
        columns: `repeat(${cols.length}, 1fr)`,
        rows: `repeat(${rows.length}, auto)`,
        gap: this.calculateGridGap(elements)
      };
    }
    
    return { isGrid: false };
  }

  /**
   * Group elements by rows based on Y position
   * @param {Array} elements - Array of elements
   * @returns {Array} Array of row groups
   */
  groupByRows(elements) {
    const tolerance = 20;
    const rows = [];
    
    elements.forEach(element => {
      const existingRow = rows.find(row => 
        Math.abs(row[0].position.y - element.position.y) <= tolerance
      );
      
      if (existingRow) {
        existingRow.push(element);
      } else {
        rows.push([element]);
      }
    });
    
    return rows;
  }

  /**
   * Group elements by columns based on X position
   * @param {Array} elements - Array of elements
   * @returns {Array} Array of column groups
   */
  groupByColumns(elements) {
    const tolerance = 20;
    const cols = [];
    
    elements.forEach(element => {
      const existingCol = cols.find(col => 
        Math.abs(col[0].position.x - element.position.x) <= tolerance
      );
      
      if (existingCol) {
        existingCol.push(element);
      } else {
        cols.push([element]);
      }
    });
    
    return cols;
  }

  /**
   * Calculate grid gap from element spacing
   * @param {Array} elements - Array of elements
   * @returns {number} Gap in pixels
   */
  calculateGridGap(elements) {
    const rows = this.groupByRows(elements);
    const gaps = [];
    
    // Calculate horizontal gaps
    rows.forEach(row => {
      const sortedRow = row.sort((a, b) => a.position.x - b.position.x);
      for (let i = 1; i < sortedRow.length; i++) {
        const prev = sortedRow[i - 1];
        const curr = sortedRow[i];
        const gap = curr.position.x - (prev.position.x + prev.size.width);
        if (gap > 0) gaps.push(gap);
      }
    });
    
    return gaps.length > 0 ? Math.round(gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length) : 16;
  }

  /**
   * Convert SVG path to CSS clip-path polygon
   * @param {string} svgPath - SVG path string
   * @returns {string} CSS clip-path value
   */
  svgPathToClipPath(svgPath) {
    // Simplified conversion - in practice would need full SVG path parser
    // For now, return a basic polygon
    return 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)';
  }

  /**
   * Convert any element to CSS
   * @param {Object} element - Element data
   * @returns {string} CSS class definition
   */
  elementToCSS(element) {
    switch (element.type) {
      case 'rectangle':
        return this.rectangleToCSS(element);
      case 'circle':
        return this.circleToCSS(element);
      case 'freehand':
        return this.pathToCSS(element);
      default:
        return '';
    }
  }

  /**
   * Indent CSS string
   * @param {string} css - CSS string
   * @param {number} spaces - Number of spaces to indent
   * @returns {string} Indented CSS
   */
  indentCSS(css, spaces) {
    const indent = ' '.repeat(spaces);
    return css.split('\n').map(line => line ? indent + line : line).join('\n');
  }
}

module.exports = CSSGenerator;