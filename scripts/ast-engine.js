/**
 * AST Manipulation Engine
 * Safe, format-preserving code generation and updates using @babel/parser and recast
 * Part of the VDS (Visual Design Sync) system
 */

const fs = require('fs').promises;
const path = require('path');
const recast = require('recast');
const parser = require('@babel/parser');
const VDSErrorHandler = require('./error-handler');

class ASTEngine {
  constructor(options = {}) {
    this.options = {
      preserveFormatting: true,
      createBackups: true,
      backupDir: '.vds-backups',
      ...options
    };
    
    // Initialize error handler
    this.errorHandler = new VDSErrorHandler({
      enableLogging: true,
      enableRecovery: true,
      logLevel: options.logLevel || 'info'
    });
    
    // Configure parser options for recast
    this.parserOptions = {
      parser: {
        parse: (source) => parser.parse(source, {
          sourceType: 'module',
          allowImportExportEverywhere: true,
          plugins: [
            'jsx',
            'typescript',
            'decorators-legacy',
            'classProperties',
            'objectRestSpread',
            'asyncGenerators',
            'functionBind',
            'exportDefaultFrom',
            'exportNamespaceFrom',
            'dynamicImport'
          ]
        })
      }
    };
  }

  /**
   * Parse design data JSON file with comprehensive error handling
   * @param {string} filePath - Path to design-data.json
   * @returns {Object} Parsed design data
   */
  async parseDesignData(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      
      // Validate file content
      if (!content.trim()) {
        await this.errorHandler.handleError('EMPTY_FILE_ERROR', new Error('Design data file is empty'), {
          filePath,
          operation: 'parse_design_data'
        });
        throw new Error('Design data file is empty');
      }
      
      // First try direct JSON parsing for better reliability
      let data;
      try {
        data = JSON.parse(content);
        
        // Validate parsed data structure
        if (!this.validateDesignDataStructure(data)) {
          await this.errorHandler.handleError('INVALID_DATA_STRUCTURE', new Error('Invalid design data structure'), {
            filePath,
            operation: 'validate_design_data'
          });
        }
        
        return {
          data,
          filePath,
          originalContent: content,
          isDirectJSON: true
        };
      } catch (jsonError) {
        // Log JSON parsing failure and attempt AST parsing
        await this.errorHandler.handleError('JSON_PARSE_ERROR', jsonError, {
          filePath,
          operation: 'direct_json_parse',
          fallback: 'ast_parsing'
        });
        
        console.log('Direct JSON parsing failed, using AST parsing...');
      }
      
      // Use recast to parse JSON while preserving formatting
      try {
        const ast = recast.parse(`const data = ${content}`, this.parserOptions);
        
        // Extract the JSON object
        const objectExpression = ast.program.body[0].declarations[0].init;
        
        return {
          ast,
          data: this.astToObject(objectExpression),
          filePath,
          originalContent: content,
          isDirectJSON: false
        };
      } catch (astError) {
        await this.errorHandler.handleError('AST_PARSE_ERROR', astError, {
          filePath,
          operation: 'ast_parse',
          originalError: astError.message
        });
        throw astError;
      }
      
    } catch (error) {
      if (error.code === 'ENOENT') {
        await this.errorHandler.handleError('FILE_NOT_FOUND', error, {
          filePath,
          operation: 'read_design_data'
        });
      } else if (error.code === 'EACCES') {
        await this.errorHandler.handleError('FILE_PERMISSION_ERROR', error, {
          filePath,
          operation: 'read_design_data'
        });
      } else {
        await this.errorHandler.handleError('FILE_READ_ERROR', error, {
          filePath,
          operation: 'parse_design_data'
        });
      }
      
      console.error(`Error parsing design data from ${filePath}:`, error);
      throw error;
    }
  }
  
  /**
   * Validate design data structure
   * @param {Object} data - Design data to validate
   * @returns {boolean} Whether the structure is valid
   */
  validateDesignDataStructure(data) {
    if (!data || typeof data !== 'object') {
      return false;
    }
    
    // Check for required top-level properties
    const requiredProperties = ['canvas', 'elements'];
    for (const prop of requiredProperties) {
      if (!(prop in data)) {
        this.errorHandler.log('warn', `Missing required property: ${prop}`);
        return false;
      }
    }
    
    // Validate canvas structure
    if (!data.canvas || typeof data.canvas !== 'object') {
      this.errorHandler.log('warn', 'Invalid canvas structure');
      return false;
    }
    
    // Validate elements array
    if (!Array.isArray(data.elements)) {
      this.errorHandler.log('warn', 'Elements must be an array');
      return false;
    }
    
    return true;
  }

  /**
   * Update component property in design data
   * @param {string} filePath - Path to design-data.json
   * @param {string} componentId - Component ID to update
   * @param {string} propKey - Property key to update (supports nested like 'style.fill')
   * @param {*} value - New value
   * @returns {Object} Updated design data
   */
  async updateComponentProp(filePath, componentId, propKey, value) {
    try {
      // Create backup if enabled
      if (this.options.createBackups) {
        await this.createBackup(filePath);
      }
      
      const designData = await this.parseDesignData(filePath);
      
      // Use direct object manipulation for better reliability
      if (designData.isDirectJSON) {
        const component = designData.data.elements?.find(el => el.id === componentId);
        if (!component) {
          throw new Error(`Component with ID ${componentId} not found`);
        }
        
        // Handle nested property paths (e.g., 'style.fill')
        this.updateNestedPropertyInObject(component, propKey, value);
        
        // Write back to file with proper JSON formatting
        await this.writeDesignData(filePath, designData.data);
      } else {
        // Fallback to AST manipulation
        const componentNode = this.findComponentInAST(designData.ast, componentId);
        
        if (!componentNode) {
          throw new Error(`Component with ID ${componentId} not found`);
        }
        
        // Handle nested property paths (e.g., 'style.fill')
        if (propKey.includes('.')) {
          this.updateNestedPropertyInNode(componentNode, propKey, value);
        } else {
          this.updatePropertyInNode(componentNode, propKey, value);
        }
        
        // Generate updated code
        const updatedCode = recast.print(designData.ast).code;
        
        // Extract just the JSON part (remove the "const data = " wrapper)
        const jsonMatch = updatedCode.match(/const data = ([\s\S]*)/);
        const updatedJSON = jsonMatch ? jsonMatch[1] : updatedCode;
        
        // Write back to file
        await fs.writeFile(filePath, updatedJSON, 'utf8');
      }
      
      console.log(`Updated component ${componentId} property ${propKey} in ${filePath}`);
      
      return {
        componentId,
        propKey,
        value,
        filePath
      };
    } catch (error) {
      console.error('Error updating component property:', error);
      throw error;
    }
  }

  /**
   * Add new component to design data
   * @param {string} filePath - Path to design-data.json
   * @param {string} parentId - Parent component ID
   * @param {Object} componentData - New component data
   * @returns {Object} Added component info
   */
  async addComponent(filePath, parentId, componentData) {
    try {
      if (this.options.createBackups) {
        await this.createBackup(filePath);
      }
      
      const designData = await this.parseDesignData(filePath);
      
      // Use direct object manipulation for better reliability
      if (designData.isDirectJSON) {
        // Check if component already exists to prevent duplicates
        const existingComponent = designData.data.elements?.find(el => el.id === componentData.id);
        if (existingComponent) {
          console.log(`Component ${componentData.id} already exists, skipping addition`);
          return componentData;
        }
        
        // Ensure elements array exists
        if (!designData.data.elements) {
          designData.data.elements = [];
        }
        
        // Add component to elements array
        designData.data.elements.push(componentData);
        
        // Write back to file with proper JSON formatting
        await this.writeDesignData(filePath, designData.data);
      } else {
        // Fallback to AST manipulation
        const existingComponent = this.findComponentInAST(designData.ast, componentData.id);
        if (existingComponent) {
          console.log(`Component ${componentData.id} already exists, skipping addition`);
          return componentData;
        }
        
        // Find the elements array in the AST
        const elementsArray = this.findElementsArrayInAST(designData.ast);
        
        if (!elementsArray) {
          throw new Error('Elements array not found in design data');
        }
        
        // Create new component AST node
        const componentNode = this.objectToAST(componentData);
        
        // Add to elements array
        elementsArray.elements.push(componentNode);
        
        // Generate and write updated code with better formatting
        const updatedCode = recast.print(designData.ast, {
          tabWidth: 2,
          useTabs: false,
          quote: 'double'
        }).code;
        
        const jsonMatch = updatedCode.match(/const data = ([\s\S]*)/);
        const updatedJSON = jsonMatch ? jsonMatch[1] : updatedCode;
        
        await fs.writeFile(filePath, updatedJSON, 'utf8');
      }
      
      console.log(`Added component ${componentData.id} to ${filePath}`);
      
      return componentData;
    } catch (error) {
      console.error('Error adding component:', error);
      throw error;
    }
  }

  /**
   * Remove component from design data
   * @param {string} filePath - Path to design-data.json
   * @param {string} componentId - Component ID to remove
   * @returns {boolean} Success status
   */
  async removeComponent(filePath, componentId) {
    try {
      if (this.options.createBackups) {
        await this.createBackup(filePath);
      }
      
      const designData = await this.parseDesignData(filePath);
      
      // Use direct object manipulation for better reliability
      if (designData.isDirectJSON) {
        if (!designData.data.elements || !Array.isArray(designData.data.elements)) {
          throw new Error('Elements array not found in design data');
        }
        
        const initialLength = designData.data.elements.length;
        designData.data.elements = designData.data.elements.filter(element => element.id !== componentId);
        
        if (designData.data.elements.length === initialLength) {
          throw new Error(`Component with ID ${componentId} not found`);
        }
        
        // Write back to file with proper JSON formatting
        await this.writeDesignData(filePath, designData.data);
      } else {
        // Fallback to AST manipulation
        const elementsArray = this.findElementsArrayInAST(designData.ast);
        
        if (!elementsArray) {
          throw new Error('Elements array not found in design data');
        }
        
        const initialLength = elementsArray.elements.length;
        elementsArray.elements = elementsArray.elements.filter(element => {
          const idProp = this.findPropertyInNode(element, 'id');
          return !idProp || idProp.value.value !== componentId;
        });
        
        if (elementsArray.elements.length === initialLength) {
          throw new Error(`Component with ID ${componentId} not found`);
        }
        
        // Generate and write updated code
        const updatedCode = recast.print(designData.ast).code;
        const jsonMatch = updatedCode.match(/const data = ([\s\S]*)/);
        const updatedJSON = jsonMatch ? jsonMatch[1] : updatedCode;
        
        await fs.writeFile(filePath, updatedJSON, 'utf8');
      }
      
      console.log(`Removed component ${componentId} from ${filePath}`);
      
      return true;
    } catch (error) {
      console.error('Error removing component:', error);
      throw error;
    }
  }

  /**
   * Write design data to file with format preservation
   * @param {string} filePath - Path to design-data.json
   * @param {Object} data - Design data object
   * @returns {boolean} Success status
   */
  async writeDesignData(filePath, data) {
    try {
      if (this.options.createBackups) {
        await this.createBackup(filePath);
      }
      
      // Use direct JSON formatting for better readability
      const formattedJSON = JSON.stringify(data, null, 2);
      
      // Ensure directory exists
      const dir = path.dirname(filePath);
      await fs.mkdir(dir, { recursive: true });
      
      // Write to file
      await fs.writeFile(filePath, formattedJSON, 'utf8');
      
      console.log(`Wrote design data to ${filePath}`);
      
      return true;
    } catch (error) {
      console.error('Error writing design data:', error);
      throw error;
    }
  }

  /**
   * Update CSS file with AST manipulation
   * @param {string} filePath - Path to CSS file
   * @param {Object} updates - CSS updates to apply
   * @returns {boolean} Success status
   */
  async updateCSSFile(filePath, updates) {
    try {
      if (this.options.createBackups) {
        await this.createBackup(filePath);
      }
      
      let cssContent = '';
      
      try {
        cssContent = await fs.readFile(filePath, 'utf8');
      } catch (error) {
        // File doesn't exist, create new
        console.log(`Creating new CSS file: ${filePath}`);
      }
      
      // Apply updates to CSS content
      let updatedCSS = cssContent;
      
      Object.entries(updates).forEach(([selector, properties]) => {
        updatedCSS = this.updateCSSRule(updatedCSS, selector, properties);
      });
      
      // Write updated CSS
      await fs.writeFile(filePath, updatedCSS, 'utf8');
      
      console.log(`Updated CSS file: ${filePath}`);
      
      return true;
    } catch (error) {
      console.error('Error updating CSS file:', error);
      throw error;
    }
  }

  /**
   * Generate React component from design data
   * @param {Object} componentData - Component design data
   * @param {Object} options - Generation options
   * @returns {string} Generated React component code
   */
  generateReactComponent(componentData, options = {}) {
    const {
      componentName = 'GeneratedComponent',
      typescript = false,
      includeStyles = true
    } = options;
    
    // Build component template
    let componentCode = '';
    
    if (typescript) {
      componentCode += `import React from 'react';\n\n`;
      componentCode += `interface ${componentName}Props {\n`;
      componentCode += `  className?: string;\n`;
      componentCode += `  children?: React.ReactNode;\n`;
      componentCode += `}\n\n`;
      componentCode += `const ${componentName}: React.FC<${componentName}Props> = ({ className, children }) => {\n`;
    } else {
      componentCode += `import React from 'react';\n\n`;
      componentCode += `const ${componentName} = ({ className, children }) => {\n`;
    }
    
    // Generate JSX based on component data
    const jsx = this.generateJSXFromDesignData(componentData);
    
    componentCode += `  return (\n`;
    componentCode += `    ${jsx}\n`;
    componentCode += `  );\n`;
    componentCode += `};\n\n`;
    componentCode += `export default ${componentName};\n`;
    
    // Parse and format with recast
    try {
      const ast = recast.parse(componentCode, this.parserOptions);
      
      return recast.print(ast).code;
    } catch (error) {
      console.error('Error formatting generated component:', error);
      return componentCode;
    }
  }

  /**
   * Generate HTML template from design data
   * @param {Object} componentData - Component design data
   * @param {Object} options - Generation options
   * @returns {string} Generated HTML template
   */
  generateHTMLTemplate(componentData, options = {}) {
    const {
      templateName = 'generated-template',
      includeStyles = true
    } = options;
    
    let html = `<!DOCTYPE html>\n`;
    html += `<html lang="en">\n`;
    html += `<head>\n`;
    html += `  <meta charset="UTF-8">\n`;
    html += `  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n`;
    html += `  <title>${templateName}</title>\n`;
    
    if (includeStyles) {
      html += `  <link rel="stylesheet" href="styles.css">\n`;
    }
    
    html += `</head>\n`;
    html += `<body>\n`;
    
    // Generate HTML from design data
    const bodyHTML = this.generateHTMLFromDesignData(componentData);
    html += `  ${bodyHTML}\n`;
    
    html += `</body>\n`;
    html += `</html>\n`;
    
    return html;
  }

  /**
   * Helper methods for AST manipulation
   */

  /**
   * Find component in AST by ID
   * @param {Object} ast - AST object
   * @param {string} componentId - Component ID to find
   * @returns {Object|null} Component AST node
   */
  findComponentInAST(ast, componentId) {
    const elementsArray = this.findElementsArrayInAST(ast);
    
    if (!elementsArray) return null;
    
    return elementsArray.elements.find(element => {
      const idProp = this.findPropertyInNode(element, 'id');
      return idProp && idProp.value.value === componentId;
    });
  }

  /**
   * Find elements array in design data AST
   * @param {Object} ast - AST object
   * @returns {Object|null} Elements array node
   */
  findElementsArrayInAST(ast) {
    const dataObject = ast.program.body[0].declarations[0].init;
    
    if (dataObject.type !== 'ObjectExpression') return null;
    
    const elementsProperty = dataObject.properties.find(prop => 
      prop.key.name === 'elements' || prop.key.value === 'elements'
    );
    
    return elementsProperty ? elementsProperty.value : null;
  }

  /**
   * Find property in AST node
   * @param {Object} node - AST node
   * @param {string} propertyName - Property name to find
   * @returns {Object|null} Property node
   */
  findPropertyInNode(node, propertyName) {
    if (node.type !== 'ObjectExpression') return null;
    
    return node.properties.find(prop => 
      (prop.key.name === propertyName) || 
      (prop.key.value === propertyName)
    );
  }

  /**
   * Update property in AST node
   * @param {Object} node - AST node
   * @param {string} propertyName - Property name
   * @param {*} value - New value
   */
  updatePropertyInNode(node, propertyName, value) {
    const property = this.findPropertyInNode(node, propertyName);
    
    if (property) {
      property.value = this.valueToAST(value);
    } else {
      // Add new property
      node.properties.push({
        type: 'Property',
        key: { type: 'Identifier', name: propertyName },
        value: this.valueToAST(value),
        kind: 'init'
      });
    }
  }

  /**
   * Update nested property in AST node (e.g., 'style.fill')
   * @param {Object} node - AST node
   * @param {string} propertyPath - Nested property path
   * @param {*} value - New value
   */
  updateNestedPropertyInNode(node, propertyPath, value) {
    const pathParts = propertyPath.split('.');
    let currentNode = node;
    
    // Navigate to the parent of the target property
    for (let i = 0; i < pathParts.length - 1; i++) {
      const partName = pathParts[i];
      let property = this.findPropertyInNode(currentNode, partName);
      
      if (!property) {
        // Create the nested object if it doesn't exist
        property = {
          type: 'Property',
          key: { type: 'Identifier', name: partName },
          value: { type: 'ObjectExpression', properties: [] },
          kind: 'init'
        };
        currentNode.properties.push(property);
      }
      
      // Ensure the property value is an object
      if (property.value.type !== 'ObjectExpression') {
        property.value = { type: 'ObjectExpression', properties: [] };
      }
      
      currentNode = property.value;
    }
    
    // Update the final property
    const finalPropertyName = pathParts[pathParts.length - 1];
    this.updatePropertyInNode(currentNode, finalPropertyName, value);
  }

  /**
   * Update nested property in plain JavaScript object (e.g., 'style.fill')
   * @param {Object} obj - JavaScript object
   * @param {string} propertyPath - Nested property path
   * @param {*} value - New value
   */
  updateNestedPropertyInObject(obj, propertyPath, value) {
    const pathParts = propertyPath.split('.');
    let current = obj;
    
    // Navigate to the parent of the target property
    for (let i = 0; i < pathParts.length - 1; i++) {
      const partName = pathParts[i];
      
      if (!current[partName] || typeof current[partName] !== 'object') {
        current[partName] = {};
      }
      
      current = current[partName];
    }
    
    // Set the final property
    const finalPropertyName = pathParts[pathParts.length - 1];
    current[finalPropertyName] = value;
  }

  /**
   * Convert JavaScript value to AST node
   * @param {*} value - JavaScript value
   * @returns {Object} AST node
   */
  valueToAST(value) {
    if (typeof value === 'string') {
      return { type: 'Literal', value };
    } else if (typeof value === 'number') {
      return { type: 'Literal', value };
    } else if (typeof value === 'boolean') {
      return { type: 'Literal', value };
    } else if (value === null) {
      return { type: 'Literal', value: null };
    } else if (Array.isArray(value)) {
      return {
        type: 'ArrayExpression',
        elements: value.map(item => this.valueToAST(item))
      };
    } else if (typeof value === 'object') {
      return this.objectToAST(value);
    }
    
    return { type: 'Literal', value: null };
  }

  /**
   * Convert object to AST ObjectExpression
   * @param {Object} obj - JavaScript object
   * @returns {Object} AST ObjectExpression
   */
  objectToAST(obj) {
    return {
      type: 'ObjectExpression',
      properties: Object.entries(obj).map(([key, value]) => ({
        type: 'Property',
        key: { type: 'Identifier', name: key },
        value: this.valueToAST(value),
        kind: 'init'
      }))
    };
  }

  /**
   * Convert AST node to JavaScript value
   * @param {Object} node - AST node
   * @returns {*} JavaScript value
   */
  astToObject(node) {
    switch (node.type) {
      case 'Literal':
        return node.value;
      case 'ArrayExpression':
        return node.elements.map(element => this.astToObject(element));
      case 'ObjectExpression':
        const obj = {};
        node.properties.forEach(prop => {
          const key = prop.key.name || prop.key.value;
          obj[key] = this.astToObject(prop.value);
        });
        return obj;
      default:
        return null;
    }
  }

  /**
   * Update CSS rule in content
   * @param {string} cssContent - CSS content
   * @param {string} selector - CSS selector
   * @param {Object} properties - CSS properties to update
   * @returns {string} Updated CSS content
   */
  updateCSSRule(cssContent, selector, properties) {
    const ruleRegex = new RegExp(`(${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\{)([^}]*)(\\})`, 'g');
    
    return cssContent.replace(ruleRegex, (match, opening, existing, closing) => {
      let updatedProperties = existing;
      
      Object.entries(properties).forEach(([prop, value]) => {
        const propRegex = new RegExp(`${prop}\\s*:[^;]*;?`, 'g');
        const newDeclaration = `  ${prop}: ${value};`;
        
        if (propRegex.test(updatedProperties)) {
          updatedProperties = updatedProperties.replace(propRegex, newDeclaration);
        } else {
          updatedProperties += `\n${newDeclaration}`;
        }
      });
      
      return opening + updatedProperties + closing;
    });
  }

  /**
   * Generate JSX from design data
   * @param {Object} componentData - Component design data
   * @returns {string} JSX string
   */
  generateJSXFromDesignData(componentData) {
    const { type, style, size } = componentData;
    
    const className = `vds-${type}-${componentData.id}`;
    
    switch (type) {
      case 'rectangle':
        return `<div className="${className}">{children}</div>`;
      case 'circle':
        return `<div className="${className}"></div>`;
      case 'text':
        return `<span className="${className}">{children || 'Text Content'}</span>`;
      default:
        return `<div className="${className}">{children}</div>`;
    }
  }

  /**
   * Generate HTML from design data
   * @param {Object} componentData - Component design data
   * @returns {string} HTML string
   */
  generateHTMLFromDesignData(componentData) {
    const { type, style, size } = componentData;
    
    const className = `vds-${type}-${componentData.id}`;
    
    switch (type) {
      case 'rectangle':
        return `<div class="${className}">Content</div>`;
      case 'circle':
        return `<div class="${className}"></div>`;
      case 'text':
        return `<span class="${className}">Text Content</span>`;
      default:
        return `<div class="${className}">Content</div>`;
    }
  }

  /**
   * Clean and format design data file
   * @param {string} filePath - Path to design-data.json
   * @returns {boolean} Success status
   */
  async cleanAndFormatDesignData(filePath) {
    try {
      const designData = await this.parseDesignData(filePath);
      
      // Clean the data object (remove duplicates, fix formatting)
      const cleanedData = this.cleanDesignDataObject(designData.data);
      
      // Write back with proper formatting
      await this.writeDesignData(filePath, cleanedData);
      
      console.log(`Cleaned and formatted design data: ${filePath}`);
      return true;
    } catch (error) {
      console.error('Error cleaning design data:', error);
      throw error;
    }
  }

  /**
   * Clean design data object (remove duplicates, etc.)
   * @param {Object} data - Design data object
   * @returns {Object} Cleaned data object
   */
  cleanDesignDataObject(data) {
    const cleaned = { ...data };
    
    if (cleaned.elements && Array.isArray(cleaned.elements)) {
      // Remove duplicate elements based on ID
      const seenIds = new Set();
      cleaned.elements = cleaned.elements.filter(element => {
        if (seenIds.has(element.id)) {
          return false;
        }
        seenIds.add(element.id);
        return true;
      });
    }
    
    return cleaned;
  }

  /**
   * Create backup of file
   * @param {string} filePath - File to backup
   */
  async createBackup(filePath) {
    try {
      const backupDir = this.options.backupDir;
      await fs.mkdir(backupDir, { recursive: true });
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = path.basename(filePath);
      const backupPath = path.join(backupDir, `${fileName}.${timestamp}.backup`);
      
      const content = await fs.readFile(filePath, 'utf8');
      await fs.writeFile(backupPath, content, 'utf8');
      
      console.log(`Created backup: ${backupPath}`);
    } catch (error) {
      console.error('Error creating backup:', error);
      // Don't throw - backup failure shouldn't stop the operation
    }
  }
}

module.exports = ASTEngine;