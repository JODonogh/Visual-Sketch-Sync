#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const VDSExporter = require('./vds-export.js');

/**
 * VDS Design System Generator
 * Creates complete design system exports compatible with various design tools and frameworks
 */
class VDSDesignSystemGenerator {
  constructor(projectPath = process.cwd()) {
    this.projectPath = projectPath;
    this.exporter = new VDSExporter(projectPath);
    this.designSystemDir = path.join(projectPath, 'design-system');
  }

  /**
   * Generates a complete design system package
   */
  async generateDesignSystem(options = {}) {
    console.log('🎨 Generating VDS Design System...\n');

    try {
      // Create design system directory structure
      this.createDesignSystemStructure();

      // Load design data
      const designData = this.exporter.loadDesignData();

      // Generate design tokens
      await this.generateDesignTokens(designData, options);

      // Generate component library
      await this.generateComponentLibrary(designData, options);

      // Generate documentation
      await this.generateDocumentation(designData, options);

      // Generate tool-specific exports
      await this.generateToolExports(designData, options);

      // Create package files
      await this.createPackageFiles(options);

      console.log('✅ Design system generated successfully!\n');
      this.printDesignSystemInfo();

    } catch (error) {
      console.error('❌ Design system generation failed:', error.message);
      process.exit(1);
    }
  }

  /**
   * Creates the design system directory structure
   */
  createDesignSystemStructure() {
    const dirs = [
      this.designSystemDir,
      path.join(this.designSystemDir, 'tokens'),
      path.join(this.designSystemDir, 'components'),
      path.join(this.designSystemDir, 'assets'),
      path.join(this.designSystemDir, 'docs'),
      path.join(this.designSystemDir, 'exports'),
      path.join(this.designSystemDir, 'exports', 'figma'),
      path.join(this.designSystemDir, 'exports', 'sketch'),
      path.join(this.designSystemDir, 'exports', 'adobe-xd'),
      path.join(this.designSystemDir, 'exports', 'storybook')
    ];

    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });

    console.log('📁 Created design system structure');
  }

  /**
   * Generates comprehensive design tokens
   */
  async generateDesignTokens(designData, options) {
    console.log('🎨 Generating design tokens...');

    const { designTokens, colorPalette } = designData;

    // Enhanced design tokens with semantic naming
    const enhancedTokens = this.enhanceDesignTokens(designTokens, colorPalette);

    // Generate tokens in multiple formats
    await this.generateTokenFormats(enhancedTokens);

    console.log('   ✓ Design tokens generated');
  }

  /**
   * Enhances design tokens with semantic naming and categories
   */
  enhanceDesignTokens(tokens, colorPalette) {
    const enhanced = {
      color: {
        primitive: {},
        semantic: {},
        component: {}
      },
      spacing: {
        primitive: tokens.spacing || {},
        semantic: {},
        component: {}
      },
      typography: {
        primitive: tokens.typography || {},
        semantic: {},
        component: {}
      },
      elevation: {
        primitive: {},
        semantic: {}
      },
      motion: {
        duration: {},
        easing: {}
      }
    };

    // Process color palette into primitive colors
    if (colorPalette) {
      colorPalette.forEach(color => {
        const name = color.name.toLowerCase().replace(/\s+/g, '-');
        enhanced.color.primitive[name] = {
          value: color.color,
          description: color.usage
        };
      });
    }

    // Generate semantic color tokens
    enhanced.color.semantic = {
      'text-primary': { value: '{color.primitive.primary}', description: 'Primary text color' },
      'text-secondary': { value: '{color.primitive.secondary}', description: 'Secondary text color' },
      'background-primary': { value: '#ffffff', description: 'Primary background color' },
      'background-secondary': { value: '#f8f9fa', description: 'Secondary background color' },
      'border-default': { value: '#e9ecef', description: 'Default border color' },
      'surface-raised': { value: '#ffffff', description: 'Raised surface color' }
    };

    // Generate component-specific tokens
    enhanced.color.component = {
      'button-primary-bg': { value: '{color.primitive.primary}', description: 'Primary button background' },
      'button-primary-text': { value: '#ffffff', description: 'Primary button text' },
      'card-background': { value: '{color.semantic.surface-raised}', description: 'Card background color' },
      'input-border': { value: '{color.semantic.border-default}', description: 'Input border color' }
    };

    // Generate semantic spacing tokens
    enhanced.spacing.semantic = {
      'component-padding': { value: '{spacing.primitive.md}', description: 'Standard component padding' },
      'section-gap': { value: '{spacing.primitive.xl}', description: 'Gap between sections' },
      'inline-gap': { value: '{spacing.primitive.sm}', description: 'Gap between inline elements' }
    };

    // Generate elevation tokens
    enhanced.elevation.primitive = {
      'none': { value: 'none', description: 'No elevation' },
      'sm': { value: '0 1px 2px rgba(0, 0, 0, 0.05)', description: 'Small elevation' },
      'md': { value: '0 4px 6px rgba(0, 0, 0, 0.1)', description: 'Medium elevation' },
      'lg': { value: '0 10px 15px rgba(0, 0, 0, 0.1)', description: 'Large elevation' },
      'xl': { value: '0 20px 25px rgba(0, 0, 0, 0.15)', description: 'Extra large elevation' }
    };

    // Generate motion tokens
    enhanced.motion.duration = {
      'fast': { value: '150ms', description: 'Fast animation duration' },
      'normal': { value: '300ms', description: 'Normal animation duration' },
      'slow': { value: '500ms', description: 'Slow animation duration' }
    };

    enhanced.motion.easing = {
      'ease-in': { value: 'cubic-bezier(0.4, 0, 1, 1)', description: 'Ease in timing function' },
      'ease-out': { value: 'cubic-bezier(0, 0, 0.2, 1)', description: 'Ease out timing function' },
      'ease-in-out': { value: 'cubic-bezier(0.4, 0, 0.2, 1)', description: 'Ease in-out timing function' }
    };

    return enhanced;
  }

  /**
   * Generates design tokens in multiple formats
   */
  async generateTokenFormats(tokens) {
    const tokensDir = path.join(this.designSystemDir, 'tokens');

    // JSON format (Design Tokens Community Group standard)
    const jsonTokens = this.convertToJSONFormat(tokens);
    fs.writeFileSync(path.join(tokensDir, 'tokens.json'), JSON.stringify(jsonTokens, null, 2));

    // CSS Custom Properties
    const cssTokens = this.convertToCSSFormat(tokens);
    fs.writeFileSync(path.join(tokensDir, 'tokens.css'), cssTokens);

    // Sass variables
    const sassTokens = this.convertToSassFormat(tokens);
    fs.writeFileSync(path.join(tokensDir, 'tokens.scss'), sassTokens);

    // JavaScript/TypeScript
    const jsTokens = this.convertToJSFormat(tokens);
    fs.writeFileSync(path.join(tokensDir, 'tokens.js'), jsTokens);
    fs.writeFileSync(path.join(tokensDir, 'tokens.ts'), this.convertToTSFormat(tokens));

    // Style Dictionary format
    const styleDictionaryTokens = this.convertToStyleDictionaryFormat(tokens);
    fs.writeFileSync(path.join(tokensDir, 'style-dictionary.json'), JSON.stringify(styleDictionaryTokens, null, 2));
  }

  /**
   * Converts tokens to Design Tokens Community Group JSON format
   */
  convertToJSONFormat(tokens) {
    const flattenTokens = (obj, prefix = '') => {
      const result = {};
      
      Object.entries(obj).forEach(([key, value]) => {
        const tokenName = prefix ? `${prefix}.${key}` : key;
        
        if (value.value !== undefined) {
          result[tokenName] = {
            value: value.value,
            type: this.inferTokenType(key, value),
            description: value.description
          };
        } else if (typeof value === 'object') {
          Object.assign(result, flattenTokens(value, tokenName));
        }
      });
      
      return result;
    };

    return flattenTokens(tokens);
  }

  /**
   * Converts tokens to CSS Custom Properties format
   */
  convertToCSSFormat(tokens) {
    let css = ':root {\n';
    
    const processTokens = (obj, prefix = '') => {
      Object.entries(obj).forEach(([key, value]) => {
        if (value.value !== undefined) {
          const cssVar = `--${prefix ? prefix + '-' : ''}${key}`.replace(/\./g, '-');
          css += `  ${cssVar}: ${this.resolveCSSValue(value.value)};\n`;
        } else if (typeof value === 'object') {
          processTokens(value, prefix ? `${prefix}-${key}` : key);
        }
      });
    };

    processTokens(tokens);
    css += '}\n';
    
    return css;
  }

  /**
   * Converts tokens to Sass variables format
   */
  convertToSassFormat(tokens) {
    let sass = '// Design Tokens\n\n';
    
    const processTokens = (obj, prefix = '') => {
      Object.entries(obj).forEach(([key, value]) => {
        if (value.value !== undefined) {
          const sassVar = `$${prefix ? prefix + '-' : ''}${key}`.replace(/\./g, '-');
          sass += `${sassVar}: ${this.resolveCSSValue(value.value)};\n`;
        } else if (typeof value === 'object') {
          sass += `\n// ${key.charAt(0).toUpperCase() + key.slice(1)}\n`;
          processTokens(value, prefix ? `${prefix}-${key}` : key);
        }
      });
    };

    processTokens(tokens);
    
    return sass;
  }

  /**
   * Converts tokens to JavaScript format
   */
  convertToJSFormat(tokens) {
    const js = `// Design Tokens
export const tokens = ${JSON.stringify(this.flattenForJS(tokens), null, 2)};

export default tokens;
`;
    
    return js;
  }

  /**
   * Converts tokens to TypeScript format
   */
  convertToTSFormat(tokens) {
    const flattened = this.flattenForJS(tokens);
    
    let ts = `// Design Tokens
export interface DesignTokens {\n`;
    
    Object.keys(flattened).forEach(key => {
      ts += `  '${key}': string;\n`;
    });
    
    ts += `}\n\n`;
    ts += `export const tokens: DesignTokens = ${JSON.stringify(flattened, null, 2)};\n\n`;
    ts += `export default tokens;\n`;
    
    return ts;
  }

  /**
   * Converts tokens to Style Dictionary format
   */
  convertToStyleDictionaryFormat(tokens) {
    return {
      source: ['tokens/**/*.json'],
      platforms: {
        css: {
          transformGroup: 'css',
          buildPath: 'build/css/',
          files: [{
            destination: 'variables.css',
            format: 'css/variables'
          }]
        },
        js: {
          transformGroup: 'js',
          buildPath: 'build/js/',
          files: [{
            destination: 'tokens.js',
            format: 'javascript/es6'
          }]
        }
      },
      tokens
    };
  }

  /**
   * Generates component library
   */
  async generateComponentLibrary(designData, options) {
    console.log('⚛️  Generating component library...');

    // Generate base components
    await this.generateBaseComponents();

    // Generate component documentation
    await this.generateComponentDocs();

    // Generate Storybook stories
    if (options.storybook !== false) {
      await this.generateStorybookStories();
    }

    console.log('   ✓ Component library generated');
  }

  /**
   * Generates base component templates
   */
  async generateBaseComponents() {
    const componentsDir = path.join(this.designSystemDir, 'components');

    // Button component
    const buttonComponent = `import React from 'react';
import { tokens } from '../tokens/tokens';
import './Button.css';

export interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  onClick?: () => void;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  onClick
}) => {
  return (
    <button
      className={\`ds-button ds-button--\${variant} ds-button--\${size}\`}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
};

export default Button;
`;

    fs.writeFileSync(path.join(componentsDir, 'Button.tsx'), buttonComponent);

    // Button styles
    const buttonStyles = `.ds-button {
  font-family: var(--typography-primitive-fontFamily);
  font-weight: 500;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: all var(--motion-duration-fast) var(--motion-easing-ease-out);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.ds-button--primary {
  background: var(--color-component-button-primary-bg);
  color: var(--color-component-button-primary-text);
}

.ds-button--secondary {
  background: var(--color-primitive-secondary);
  color: white;
}

.ds-button--outline {
  background: transparent;
  color: var(--color-primitive-primary);
  border: 1px solid var(--color-primitive-primary);
}

.ds-button--sm {
  padding: var(--spacing-primitive-xs) var(--spacing-primitive-sm);
  font-size: 14px;
}

.ds-button--md {
  padding: var(--spacing-primitive-sm) var(--spacing-primitive-md);
  font-size: 16px;
}

.ds-button--lg {
  padding: var(--spacing-primitive-md) var(--spacing-primitive-lg);
  font-size: 18px;
}

.ds-button:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: var(--elevation-primitive-md);
}

.ds-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
`;

    fs.writeFileSync(path.join(componentsDir, 'Button.css'), buttonStyles);

    // Component index
    const componentIndex = `export { Button } from './Button';
export type { ButtonProps } from './Button';
`;

    fs.writeFileSync(path.join(componentsDir, 'index.ts'), componentIndex);
  }

  /**
   * Generates component documentation
   */
  async generateComponentDocs() {
    const docsDir = path.join(this.designSystemDir, 'docs');

    const componentDocs = `# Component Library

## Button

The Button component is a fundamental interactive element in the design system.

### Usage

\`\`\`tsx
import { Button } from '@your-org/design-system';

function App() {
  return (
    <Button variant="primary" onClick={() => console.log('clicked')}>
      Click me
    </Button>
  );
}
\`\`\`

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| children | ReactNode | - | Button content |
| variant | 'primary' \\| 'secondary' \\| 'outline' | 'primary' | Button style variant |
| size | 'sm' \\| 'md' \\| 'lg' | 'md' | Button size |
| disabled | boolean | false | Whether button is disabled |
| onClick | () => void | - | Click handler |

### Examples

#### Variants
\`\`\`tsx
<Button variant="primary">Primary</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="outline">Outline</Button>
\`\`\`

#### Sizes
\`\`\`tsx
<Button size="sm">Small</Button>
<Button size="md">Medium</Button>
<Button size="lg">Large</Button>
\`\`\`
`;

    fs.writeFileSync(path.join(docsDir, 'components.md'), componentDocs);
  }

  /**
   * Generates Storybook stories
   */
  async generateStorybookStories() {
    const storybookDir = path.join(this.designSystemDir, 'exports', 'storybook');

    const buttonStory = `import type { Meta, StoryObj } from '@storybook/react';
import { Button } from '../components/Button';

const meta: Meta<typeof Button> = {
  title: 'Components/Button',
  component: Button,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: ['primary', 'secondary', 'outline'],
    },
    size: {
      control: { type: 'select' },
      options: ['sm', 'md', 'lg'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: {
    children: 'Button',
    variant: 'primary',
  },
};

export const Secondary: Story = {
  args: {
    children: 'Button',
    variant: 'secondary',
  },
};

export const Outline: Story = {
  args: {
    children: 'Button',
    variant: 'outline',
  },
};

export const Small: Story = {
  args: {
    children: 'Button',
    size: 'sm',
  },
};

export const Large: Story = {
  args: {
    children: 'Button',
    size: 'lg',
  },
};
`;

    fs.writeFileSync(path.join(storybookDir, 'Button.stories.ts'), buttonStory);
  }

  /**
   * Generates documentation
   */
  async generateDocumentation(designData, options) {
    console.log('📚 Generating documentation...');

    const docsDir = path.join(this.designSystemDir, 'docs');

    // Main README
    const readme = `# VDS Design System

A comprehensive design system generated from Visual Design Sync.

## Installation

\`\`\`bash
npm install @your-org/design-system
\`\`\`

## Usage

### Design Tokens

Import design tokens in your CSS:

\`\`\`css
@import '@your-org/design-system/tokens/tokens.css';
\`\`\`

Or use in JavaScript:

\`\`\`js
import { tokens } from '@your-org/design-system/tokens';
\`\`\`

### Components

\`\`\`tsx
import { Button } from '@your-org/design-system';

function App() {
  return <Button variant="primary">Hello World</Button>;
}
\`\`\`

## Design Tokens

- **Colors**: Semantic color palette with primitive and component tokens
- **Spacing**: Consistent spacing scale for layouts and components
- **Typography**: Font families, sizes, and weights
- **Elevation**: Box shadow tokens for depth and hierarchy
- **Motion**: Animation duration and easing functions

## Components

- **Button**: Primary interactive element
- More components coming soon...

## Development

This design system is generated from VDS (Visual Design Sync) and automatically updated when designs change.

Generated on: ${new Date().toISOString()}
`;

    fs.writeFileSync(path.join(docsDir, 'README.md'), readme);

    // Design tokens documentation
    const tokensDocs = `# Design Tokens

Design tokens are the visual design atoms of the design system — specifically, they are named entities that store visual design attributes.

## Token Categories

### Color Tokens

#### Primitive Colors
Base color palette that forms the foundation of the design system.

#### Semantic Colors
Colors with specific meaning and usage context.

#### Component Colors
Colors specific to individual components.

### Spacing Tokens

Consistent spacing scale used throughout the design system.

### Typography Tokens

Font families, sizes, weights, and line heights.

### Elevation Tokens

Box shadow values for creating depth and hierarchy.

### Motion Tokens

Animation durations and easing functions for consistent motion design.

## Usage

### CSS Custom Properties

\`\`\`css
.my-component {
  color: var(--color-text-primary);
  background: var(--color-background-primary);
  padding: var(--spacing-component-padding);
  box-shadow: var(--elevation-primitive-md);
}
\`\`\`

### JavaScript/TypeScript

\`\`\`js
import { tokens } from '@your-org/design-system/tokens';

const styles = {
  color: tokens['color.text.primary'],
  background: tokens['color.background.primary'],
  padding: tokens['spacing.component.padding']
};
\`\`\`
`;

    fs.writeFileSync(path.join(docsDir, 'tokens.md'), tokensDocs);

    console.log('   ✓ Documentation generated');
  }

  /**
   * Generates tool-specific exports
   */
  async generateToolExports(designData, options) {
    console.log('🛠️  Generating tool exports...');

    // Figma tokens
    await this.exporter.exportFigmaTokens(designData);
    const figmaTokensPath = path.join(this.exporter.outputDir, 'tokens', 'figma-tokens.json');
    const designSystemFigmaPath = path.join(this.designSystemDir, 'exports', 'figma', 'tokens.json');
    
    if (fs.existsSync(figmaTokensPath)) {
      fs.copyFileSync(figmaTokensPath, designSystemFigmaPath);
    }

    // Adobe XD tokens (simplified format)
    const adobeXDTokens = this.generateAdobeXDTokens(designData);
    fs.writeFileSync(
      path.join(this.designSystemDir, 'exports', 'adobe-xd', 'tokens.json'),
      JSON.stringify(adobeXDTokens, null, 2)
    );

    console.log('   ✓ Tool exports generated');
  }

  /**
   * Generates Adobe XD compatible tokens
   */
  generateAdobeXDTokens(designData) {
    const { colorPalette, designTokens } = designData;
    
    const adobeTokens = {
      version: '1.0',
      colors: [],
      characterStyles: [],
      gradients: []
    };

    // Convert colors
    if (colorPalette) {
      colorPalette.forEach(color => {
        adobeTokens.colors.push({
          name: color.name,
          value: color.color,
          type: 'color'
        });
      });
    }

    return adobeTokens;
  }

  /**
   * Creates package files
   */
  async createPackageFiles(options) {
    console.log('📦 Creating package files...');

    // Package.json
    const packageJson = {
      name: '@your-org/design-system',
      version: '1.0.0',
      description: 'Design system generated from VDS',
      main: 'components/index.js',
      types: 'components/index.d.ts',
      files: [
        'components/',
        'tokens/',
        'assets/',
        'docs/'
      ],
      scripts: {
        build: 'tsc',
        storybook: 'storybook dev -p 6006',
        'build-storybook': 'storybook build'
      },
      peerDependencies: {
        react: '>=16.8.0',
        'react-dom': '>=16.8.0'
      },
      devDependencies: {
        '@storybook/react': '^7.0.0',
        '@storybook/react-vite': '^7.0.0',
        typescript: '^5.0.0'
      },
      keywords: ['design-system', 'vds', 'components', 'tokens'],
      author: 'VDS Generated',
      license: 'MIT'
    };

    fs.writeFileSync(
      path.join(this.designSystemDir, 'package.json'),
      JSON.stringify(packageJson, null, 2)
    );

    // TypeScript config
    const tsConfig = {
      compilerOptions: {
        target: 'es5',
        lib: ['dom', 'dom.iterable', 'es6'],
        allowJs: true,
        skipLibCheck: true,
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        strict: true,
        forceConsistentCasingInFileNames: true,
        moduleResolution: 'node',
        resolveJsonModule: true,
        isolatedModules: true,
        noEmit: true,
        jsx: 'react-jsx',
        declaration: true,
        outDir: 'dist'
      },
      include: ['components/**/*', 'tokens/**/*'],
      exclude: ['node_modules', 'dist', 'storybook-static']
    };

    fs.writeFileSync(
      path.join(this.designSystemDir, 'tsconfig.json'),
      JSON.stringify(tsConfig, null, 2)
    );

    console.log('   ✓ Package files created');
  }

  /**
   * Helper methods
   */
  inferTokenType(key, value) {
    if (key.includes('color') || typeof value.value === 'string' && value.value.startsWith('#')) {
      return 'color';
    }
    if (key.includes('spacing') || key.includes('size')) {
      return 'dimension';
    }
    if (key.includes('font')) {
      return 'fontFamily';
    }
    if (key.includes('duration')) {
      return 'duration';
    }
    return 'other';
  }

  resolveCSSValue(value) {
    // Resolve token references like {color.primitive.primary}
    if (typeof value === 'string' && value.startsWith('{') && value.endsWith('}')) {
      const tokenPath = value.slice(1, -1);
      return `var(--${tokenPath.replace(/\./g, '-')})`;
    }
    return value;
  }

  flattenForJS(obj, prefix = '') {
    const result = {};
    
    Object.entries(obj).forEach(([key, value]) => {
      const newKey = prefix ? `${prefix}.${key}` : key;
      
      if (value.value !== undefined) {
        result[newKey] = value.value;
      } else if (typeof value === 'object') {
        Object.assign(result, this.flattenForJS(value, newKey));
      }
    });
    
    return result;
  }

  /**
   * Prints design system information
   */
  printDesignSystemInfo() {
    console.log(`
🎨 Design System Generated!

📁 Location: ${this.designSystemDir}

📦 Package Structure:
├── tokens/           # Design tokens in multiple formats
├── components/       # React component library
├── assets/          # Generated assets (SVG, PNG)
├── docs/            # Documentation
└── exports/         # Tool-specific exports
    ├── figma/       # Figma design tokens
    ├── sketch/      # Sketch library
    ├── adobe-xd/    # Adobe XD tokens
    └── storybook/   # Storybook stories

🚀 Next Steps:
1. cd design-system
2. npm install
3. npm run build
4. npm run storybook (to view components)

📚 Documentation: ./design-system/docs/README.md
🎭 Storybook: npm run storybook
📦 Publish: npm publish (after configuring registry)
`);
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {};

  // Parse CLI arguments
  args.forEach(arg => {
    if (arg === '--no-storybook') options.storybook = false;
    if (arg === '--figma-only') options.figmaOnly = true;
    if (arg === '--components-only') options.componentsOnly = true;
  });

  const generator = new VDSDesignSystemGenerator();
  generator.generateDesignSystem(options).catch(console.error);
}

module.exports = VDSDesignSystemGenerator;