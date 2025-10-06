/**
 * Component Template Generator
 * Creates React/HTML component templates from complex designs using AST manipulation
 * Part of the VDS (Visual Design Sync) system
 */

const ASTEngine = require('./ast-engine');
const fs = require('fs').promises;
const path = require('path');

class ComponentGenerator {
  constructor(options = {}) {
    this.options = {
      outputDir: 'src/components',
      framework: 'react', // 'react', 'vue', 'html'
      typescript: false,
      includeStyles: true,
      styleFormat: 'css', // 'css', 'scss', 'styled-components'
      ...options
    };
    
    this.astEngine = new ASTEngine(options.astEngine);
  }

  /**
   * Create button component from rectangle + text design
   * @param {Object} shape - Rectangle shape data
   * @param {Object} text - Text element data (optional)
   * @returns {Object} Generated component info
   */
  async createButtonComponent(shape, text = null) {
    const componentName = `Button${this.capitalizeFirst(shape.id || 'Component')}`;
    
    const componentData = {
      name: componentName,
      type: 'button',
      props: this.extractButtonProps(shape, text),
      styles: this.extractButtonStyles(shape, text),
      template: this.generateButtonTemplate(shape, text)
    };
    
    return await this.generateComponent(componentData);
  }

  /**
   * Create card component from grouped elements
   * @param {Array} elements - Array of grouped elements
   * @returns {Object} Generated component info
   */
  async createCardComponent(elements) {
    const componentName = `Card${Date.now().toString().slice(-6)}`;
    
    const componentData = {
      name: componentName,
      type: 'card',
      props: this.extractCardProps(elements),
      styles: this.extractCardStyles(elements),
      template: this.generateCardTemplate(elements)
    };
    
    return await this.generateComponent(componentData);
  }

  /**
   * Create layout component from element structure
   * @param {Object} structure - Layout structure data
   * @returns {Object} Generated component info
   */
  async createLayoutComponent(structure) {
    const componentName = `Layout${this.capitalizeFirst(structure.type)}`;
    
    const componentData = {
      name: componentName,
      type: 'layout',
      props: this.extractLayoutProps(structure),
      styles: this.extractLayoutStyles(structure),
      template: this.generateLayoutTemplate(structure)
    };
    
    return await this.generateComponent(componentData);
  }

  /**
   * Generate React component
   * @param {Object} componentData - Component data
   * @returns {Object} Generated component files
   */
  async generateReactComponent(componentData) {
    const { name, props, styles, template } = componentData;
    
    // Generate component file
    let componentCode = '';
    
    if (this.options.typescript) {
      componentCode += this.generateReactTypeScriptComponent(componentData);
    } else {
      componentCode += this.generateReactJavaScriptComponent(componentData);
    }
    
    // Generate style file
    let styleCode = '';
    if (this.options.includeStyles) {
      switch (this.options.styleFormat) {
        case 'styled-components':
          styleCode = this.generateStyledComponents(componentData);
          break;
        case 'scss':
          styleCode = this.generateSCSSStyles(componentData);
          break;
        default:
          styleCode = this.generateCSSStyles(componentData);
      }
    }
    
    return {
      component: {
        fileName: `${name}.${this.options.typescript ? 'tsx' : 'jsx'}`,
        content: componentCode
      },
      styles: styleCode ? {
        fileName: `${name}.${this.options.styleFormat === 'styled-components' ? 'js' : this.options.styleFormat}`,
        content: styleCode
      } : null,
      props: componentData.props
    };
  }

  /**
   * Generate Vue component
   * @param {Object} componentData - Component data
   * @returns {Object} Generated component files
   */
  async generateVueComponent(componentData) {
    const { name, props, styles, template } = componentData;
    
    let vueCode = '<template>\n';
    vueCode += `  ${template.vue}\n`;
    vueCode += '</template>\n\n';
    
    vueCode += '<script>\n';
    vueCode += `export default {\n`;
    vueCode += `  name: '${name}',\n`;
    vueCode += `  props: {\n`;
    
    Object.entries(props).forEach(([propName, propConfig]) => {
      vueCode += `    ${propName}: {\n`;
      vueCode += `      type: ${propConfig.type},\n`;
      if (propConfig.default !== undefined) {
        vueCode += `      default: ${JSON.stringify(propConfig.default)},\n`;
      }
      vueCode += `    },\n`;
    });
    
    vueCode += `  }\n`;
    vueCode += `};\n`;
    vueCode += '</script>\n\n';
    
    if (this.options.includeStyles) {
      vueCode += '<style scoped>\n';
      vueCode += styles.css;
      vueCode += '\n</style>\n';
    }
    
    return {
      component: {
        fileName: `${name}.vue`,
        content: vueCode
      },
      props: componentData.props
    };
  }

  /**
   * Generate HTML template
   * @param {Object} componentData - Component data
   * @returns {Object} Generated template files
   */
  async generateHTMLTemplate(componentData) {
    const htmlContent = this.astEngine.generateHTMLTemplate(componentData, {
      templateName: componentData.name,
      includeStyles: this.options.includeStyles
    });
    
    const cssContent = this.options.includeStyles ? 
      this.generateCSSStyles(componentData) : '';
    
    return {
      template: {
        fileName: `${componentData.name.toLowerCase()}.html`,
        content: htmlContent
      },
      styles: cssContent ? {
        fileName: 'styles.css',
        content: cssContent
      } : null,
      props: componentData.props
    };
  }

  /**
   * Main component generation method
   * @param {Object} componentData - Component data
   * @returns {Object} Generated component info
   */
  async generateComponent(componentData) {
    let result;
    
    switch (this.options.framework) {
      case 'react':
        result = await this.generateReactComponent(componentData);
        break;
      case 'vue':
        result = await this.generateVueComponent(componentData);
        break;
      case 'html':
        result = await this.generateHTMLTemplate(componentData);
        break;
      default:
        throw new Error(`Unsupported framework: ${this.options.framework}`);
    }
    
    // Write files to disk
    await this.writeComponentFiles(result);
    
    return {
      ...result,
      name: componentData.name,
      type: componentData.type,
      framework: this.options.framework
    };
  }

  /**
   * Extract button props from shape and text
   * @param {Object} shape - Rectangle shape
   * @param {Object} text - Text element
   * @returns {Object} Button props configuration
   */
  extractButtonProps(shape, text) {
    const props = {
      children: {
        type: 'ReactNode',
        default: text ? text.content : 'Button',
        description: 'Button content'
      },
      variant: {
        type: 'string',
        default: 'primary',
        description: 'Button variant'
      },
      size: {
        type: 'string',
        default: 'medium',
        description: 'Button size'
      },
      disabled: {
        type: 'boolean',
        default: false,
        description: 'Disabled state'
      },
      onClick: {
        type: 'function',
        description: 'Click handler'
      }
    };
    
    // Add custom props based on shape properties
    if (shape.style.borderRadius) {
      props.rounded = {
        type: 'boolean',
        default: true,
        description: 'Rounded corners'
      };
    }
    
    return props;
  }

  /**
   * Extract button styles from shape and text
   * @param {Object} shape - Rectangle shape
   * @param {Object} text - Text element
   * @returns {Object} Button styles
   */
  extractButtonStyles(shape, text) {
    const styles = {
      css: '',
      variables: {}
    };
    
    const className = `.${(shape.id || 'component').toLowerCase()}-button`;
    
    styles.css += `${className} {\n`;
    styles.css += `  display: inline-flex;\n`;
    styles.css += `  align-items: center;\n`;
    styles.css += `  justify-content: center;\n`;
    styles.css += `  border: none;\n`;
    styles.css += `  cursor: pointer;\n`;
    styles.css += `  transition: all 0.2s ease;\n`;
    
    if (shape.size) {
      styles.css += `  min-width: ${shape.size.width}px;\n`;
      styles.css += `  min-height: ${shape.size.height}px;\n`;
    }
    
    if (shape.style.fill) {
      styles.css += `  background-color: ${shape.style.fill};\n`;
      styles.variables.backgroundColor = shape.style.fill;
    }
    
    if (shape.style.borderRadius) {
      styles.css += `  border-radius: ${shape.style.borderRadius}px;\n`;
      styles.variables.borderRadius = `${shape.style.borderRadius}px`;
    }
    
    if (text && text.style) {
      if (text.style.textColor) {
        styles.css += `  color: ${text.style.textColor};\n`;
        styles.variables.textColor = text.style.textColor;
      }
      if (text.style.fontSize) {
        styles.css += `  font-size: ${text.style.fontSize}px;\n`;
        styles.variables.fontSize = `${text.style.fontSize}px`;
      }
      if (text.style.fontWeight) {
        styles.css += `  font-weight: ${text.style.fontWeight};\n`;
        styles.variables.fontWeight = text.style.fontWeight;
      }
    }
    
    styles.css += `}\n\n`;
    
    // Add hover state
    styles.css += `${className}:hover {\n`;
    styles.css += `  transform: translateY(-1px);\n`;
    styles.css += `  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);\n`;
    styles.css += `}\n\n`;
    
    // Add disabled state
    styles.css += `${className}:disabled {\n`;
    styles.css += `  opacity: 0.6;\n`;
    styles.css += `  cursor: not-allowed;\n`;
    styles.css += `  transform: none;\n`;
    styles.css += `}\n`;
    
    return styles;
  }

  /**
   * Generate button template
   * @param {Object} shape - Rectangle shape
   * @param {Object} text - Text element
   * @returns {Object} Button templates
   */
  generateButtonTemplate(shape, text) {
    const className = `${(shape.id || 'component').toLowerCase()}-button`;
    
    return {
      react: `<button className={\`${className} \${className}\`} onClick={onClick} disabled={disabled}>{children}</button>`,
      vue: `<button :class="['${className}', variant]" @click="$emit('click')" :disabled="disabled"><slot>{{ children }}</slot></button>`,
      html: `<button class="${className}">${text ? text.content : 'Button'}</button>`
    };
  }

  /**
   * Extract card props from elements
   * @param {Array} elements - Card elements
   * @returns {Object} Card props configuration
   */
  extractCardProps(elements) {
    return {
      children: {
        type: 'ReactNode',
        description: 'Card content'
      },
      padding: {
        type: 'string',
        default: 'medium',
        description: 'Card padding'
      },
      shadow: {
        type: 'boolean',
        default: true,
        description: 'Drop shadow'
      },
      rounded: {
        type: 'boolean',
        default: true,
        description: 'Rounded corners'
      }
    };
  }

  /**
   * Extract card styles from elements
   * @param {Array} elements - Card elements
   * @returns {Object} Card styles
   */
  extractCardStyles(elements) {
    const styles = {
      css: '',
      variables: {}
    };
    
    const className = '.card-component';
    
    styles.css += `${className} {\n`;
    styles.css += `  display: flex;\n`;
    styles.css += `  flex-direction: column;\n`;
    styles.css += `  background-color: white;\n`;
    styles.css += `  border-radius: 8px;\n`;
    styles.css += `  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);\n`;
    styles.css += `  padding: 16px;\n`;
    styles.css += `}\n`;
    
    return styles;
  }

  /**
   * Generate card template
   * @param {Array} elements - Card elements
   * @returns {Object} Card templates
   */
  generateCardTemplate(elements) {
    return {
      react: `<div className="card-component">{children}</div>`,
      vue: `<div class="card-component"><slot></slot></div>`,
      html: `<div class="card-component">Card Content</div>`
    };
  }

  /**
   * Extract layout props from structure
   * @param {Object} structure - Layout structure
   * @returns {Object} Layout props configuration
   */
  extractLayoutProps(structure) {
    const props = {
      children: {
        type: 'ReactNode',
        description: 'Layout content'
      }
    };
    
    if (structure.type === 'flexbox') {
      props.direction = {
        type: 'string',
        default: structure.direction || 'row',
        description: 'Flex direction'
      };
      props.justify = {
        type: 'string',
        default: structure.justifyContent || 'flex-start',
        description: 'Justify content'
      };
      props.align = {
        type: 'string',
        default: structure.alignItems || 'stretch',
        description: 'Align items'
      };
    } else if (structure.type === 'grid') {
      props.columns = {
        type: 'string',
        default: structure.columns || 'auto',
        description: 'Grid columns'
      };
      props.rows = {
        type: 'string',
        default: structure.rows || 'auto',
        description: 'Grid rows'
      };
    }
    
    return props;
  }

  /**
   * Extract layout styles from structure
   * @param {Object} structure - Layout structure
   * @returns {Object} Layout styles
   */
  extractLayoutStyles(structure) {
    const styles = {
      css: '',
      variables: {}
    };
    
    const className = `.layout-${structure.type}`;
    
    styles.css += `${className} {\n`;
    
    if (structure.type === 'flexbox') {
      styles.css += `  display: flex;\n`;
      styles.css += `  flex-direction: ${structure.direction || 'row'};\n`;
      styles.css += `  justify-content: ${structure.justifyContent || 'flex-start'};\n`;
      styles.css += `  align-items: ${structure.alignItems || 'stretch'};\n`;
      if (structure.gap) {
        styles.css += `  gap: ${structure.gap}px;\n`;
      }
    } else if (structure.type === 'grid') {
      styles.css += `  display: grid;\n`;
      styles.css += `  grid-template-columns: ${structure.columns || 'auto'};\n`;
      styles.css += `  grid-template-rows: ${structure.rows || 'auto'};\n`;
      if (structure.gap) {
        styles.css += `  gap: ${structure.gap}px;\n`;
      }
    }
    
    styles.css += `}\n`;
    
    return styles;
  }

  /**
   * Generate layout template
   * @param {Object} structure - Layout structure
   * @returns {Object} Layout templates
   */
  generateLayoutTemplate(structure) {
    const className = `layout-${structure.type}`;
    
    return {
      react: `<div className="${className}">{children}</div>`,
      vue: `<div class="${className}"><slot></slot></div>`,
      html: `<div class="${className}">Layout Content</div>`
    };
  }

  /**
   * Generate React TypeScript component
   * @param {Object} componentData - Component data
   * @returns {string} TypeScript component code
   */
  generateReactTypeScriptComponent(componentData) {
    const { name, props, template } = componentData;
    
    let code = `import React from 'react';\n`;
    
    if (this.options.includeStyles && this.options.styleFormat === 'css') {
      code += `import './${name}.css';\n`;
    }
    
    code += `\n`;
    
    // Generate interface
    code += `interface ${name}Props {\n`;
    Object.entries(props).forEach(([propName, propConfig]) => {
      const optional = propConfig.default !== undefined ? '?' : '';
      code += `  ${propName}${optional}: ${this.mapTypeToTypeScript(propConfig.type)};\n`;
    });
    code += `}\n\n`;
    
    // Generate component
    code += `const ${name}: React.FC<${name}Props> = ({\n`;
    Object.keys(props).forEach(propName => {
      const defaultValue = props[propName].default;
      if (defaultValue !== undefined) {
        code += `  ${propName} = ${JSON.stringify(defaultValue)},\n`;
      } else {
        code += `  ${propName},\n`;
      }
    });
    code += `}) => {\n`;
    code += `  return (\n`;
    code += `    ${template.react}\n`;
    code += `  );\n`;
    code += `};\n\n`;
    code += `export default ${name};\n`;
    
    return code;
  }

  /**
   * Generate React JavaScript component
   * @param {Object} componentData - Component data
   * @returns {string} JavaScript component code
   */
  generateReactJavaScriptComponent(componentData) {
    const { name, props, template } = componentData;
    
    let code = `import React from 'react';\n`;
    
    if (this.options.includeStyles && this.options.styleFormat === 'css') {
      code += `import './${name}.css';\n`;
    }
    
    code += `\n`;
    
    // Generate component
    code += `const ${name} = ({\n`;
    Object.keys(props).forEach(propName => {
      const defaultValue = props[propName].default;
      if (defaultValue !== undefined) {
        code += `  ${propName} = ${JSON.stringify(defaultValue)},\n`;
      } else {
        code += `  ${propName},\n`;
      }
    });
    code += `}) => {\n`;
    code += `  return (\n`;
    code += `    ${template.react}\n`;
    code += `  );\n`;
    code += `};\n\n`;
    code += `export default ${name};\n`;
    
    return code;
  }

  /**
   * Generate CSS styles
   * @param {Object} componentData - Component data
   * @returns {string} CSS code
   */
  generateCSSStyles(componentData) {
    return componentData.styles.css || '';
  }

  /**
   * Generate SCSS styles
   * @param {Object} componentData - Component data
   * @returns {string} SCSS code
   */
  generateSCSSStyles(componentData) {
    // Convert CSS to SCSS with variables
    let scss = '';
    
    if (componentData.styles.variables) {
      Object.entries(componentData.styles.variables).forEach(([name, value]) => {
        scss += `$${name}: ${value};\n`;
      });
      scss += '\n';
    }
    
    scss += componentData.styles.css || '';
    
    return scss;
  }

  /**
   * Generate styled-components
   * @param {Object} componentData - Component data
   * @returns {string} Styled-components code
   */
  generateStyledComponents(componentData) {
    const { name, styles } = componentData;
    
    let code = `import styled from 'styled-components';\n\n`;
    
    code += `export const Styled${name} = styled.div\`\n`;
    
    // Convert CSS to styled-components template literal
    const css = styles.css.replace(/\.[^{]+\s*{([^}]*)}/g, '$1');
    code += css;
    
    code += `\`;\n`;
    
    return code;
  }

  /**
   * Write component files to disk
   * @param {Object} componentFiles - Generated component files
   */
  async writeComponentFiles(componentFiles) {
    try {
      // Ensure output directory exists
      await fs.mkdir(this.options.outputDir, { recursive: true });
      
      // Write component file
      if (componentFiles.component) {
        const componentPath = path.join(this.options.outputDir, componentFiles.component.fileName);
        await fs.writeFile(componentPath, componentFiles.component.content, 'utf8');
        console.log(`Generated component: ${componentPath}`);
      }
      
      // Write styles file
      if (componentFiles.styles) {
        const stylesPath = path.join(this.options.outputDir, componentFiles.styles.fileName);
        await fs.writeFile(stylesPath, componentFiles.styles.content, 'utf8');
        console.log(`Generated styles: ${stylesPath}`);
      }
      
    } catch (error) {
      console.error('Error writing component files:', error);
      throw error;
    }
  }

  /**
   * Utility methods
   */

  capitalizeFirst(str) {
    if (!str || typeof str !== 'string') return 'Component';
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  mapTypeToTypeScript(type) {
    const typeMap = {
      'string': 'string',
      'number': 'number',
      'boolean': 'boolean',
      'function': '() => void',
      'ReactNode': 'React.ReactNode'
    };
    
    return typeMap[type] || 'any';
  }
}

module.exports = ComponentGenerator;