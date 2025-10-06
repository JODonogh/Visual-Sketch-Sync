#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * VDS Project Templates
 * Creates pre-configured project templates for different frameworks and use cases
 */
class VDSTemplates {
  constructor() {
    this.templates = {
      'react': {
        name: 'React + VDS',
        description: 'React application with VDS integration',
        dependencies: ['react', 'react-dom', '@vitejs/plugin-react'],
        devDependencies: ['vite', '@types/react', '@types/react-dom'],
        scripts: {
          'dev': 'vite',
          'build': 'vite build',
          'preview': 'vite preview'
        }
      },
      'nextjs': {
        name: 'Next.js + VDS',
        description: 'Next.js application with VDS integration',
        dependencies: ['next', 'react', 'react-dom'],
        devDependencies: ['@types/node', '@types/react', '@types/react-dom', 'typescript'],
        scripts: {
          'dev': 'next dev',
          'build': 'next build',
          'start': 'next start'
        }
      },
      'vue': {
        name: 'Vue + VDS',
        description: 'Vue.js application with VDS integration',
        dependencies: ['vue'],
        devDependencies: ['@vitejs/plugin-vue', 'vite'],
        scripts: {
          'dev': 'vite',
          'build': 'vite build',
          'preview': 'vite preview'
        }
      },
      'vanilla': {
        name: 'Vanilla JS + VDS',
        description: 'Plain JavaScript with VDS integration',
        dependencies: [],
        devDependencies: ['vite'],
        scripts: {
          'dev': 'vite',
          'build': 'vite build',
          'preview': 'vite preview'
        }
      }
    };
  }

  /**
   * Creates a new VDS project from template
   */
  async create(templateName, projectName, options = {}) {
    console.log(`🎨 Creating VDS project: ${projectName}\n`);

    const template = this.templates[templateName];
    if (!template) {
      throw new Error(`Template "${templateName}" not found. Available: ${Object.keys(this.templates).join(', ')}`);
    }

    const projectPath = path.join(process.cwd(), projectName);

    try {
      // Create project directory
      this.createProjectDirectory(projectPath, projectName);

      // Generate package.json
      this.generatePackageJson(projectPath, projectName, template);

      // Create framework-specific files
      await this.createFrameworkFiles(projectPath, templateName, options);

      // Setup VDS configuration
      await this.setupVDS(projectPath);

      // Install dependencies
      if (!options.skipInstall) {
        this.installDependencies(projectPath);
      }

      console.log('✅ VDS project created successfully!\n');
      this.printProjectInfo(projectName, templateName);

    } catch (error) {
      console.error('❌ Project creation failed:', error.message);
      process.exit(1);
    }
  }

  /**
   * Lists available templates
   */
  listTemplates() {
    console.log('📋 Available VDS Templates:\n');

    Object.entries(this.templates).forEach(([key, template]) => {
      console.log(`${key.padEnd(10)} - ${template.description}`);
    });

    console.log('\nUsage: npm create vds-project <template> <project-name>');
    console.log('Example: npm create vds-project react my-design-app');
  }

  /**
   * Creates project directory
   */
  createProjectDirectory(projectPath, projectName) {
    if (fs.existsSync(projectPath)) {
      throw new Error(`Directory "${projectName}" already exists`);
    }

    fs.mkdirSync(projectPath, { recursive: true });
    console.log(`📁 Created project directory: ${projectName}`);
  }

  /**
   * Generates package.json for the project
   */
  generatePackageJson(projectPath, projectName, template) {
    const packageJson = {
      name: projectName,
      version: '0.1.0',
      private: true,
      type: 'module',
      scripts: {
        ...template.scripts,
        'dev:sync': 'node ./scripts/vds-sync-server.js',
        'dev:vds': `concurrently "npm run dev" "npm run dev:sync"`,
        'vds:setup': 'node ./scripts/vds-setup.js',
        'vds:export': 'node ./scripts/vds-export.js'
      },
      dependencies: {
        ...this.arrayToObject(template.dependencies, 'latest')
      },
      devDependencies: {
        ...this.arrayToObject(template.devDependencies, 'latest'),
        'concurrently': '^8.2.2',
        'ws': '^8.14.2',
        'chokidar': '^3.5.3',
        'recast': '^0.23.4',
        '@babel/parser': '^7.23.0',
        '@babel/traverse': '^7.23.0',
        'canvas': '^2.11.2',
        'sharp': '^0.32.6'
      }
    };

    const packagePath = path.join(projectPath, 'package.json');
    fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));
    console.log('📦 Generated package.json');
  }

  /**
   * Creates framework-specific files
   */
  async createFrameworkFiles(projectPath, templateName, options) {
    switch (templateName) {
      case 'react':
        await this.createReactFiles(projectPath, options);
        break;
      case 'nextjs':
        await this.createNextJSFiles(projectPath, options);
        break;
      case 'vue':
        await this.createVueFiles(projectPath, options);
        break;
      case 'vanilla':
        await this.createVanillaFiles(projectPath, options);
        break;
    }
  }

  /**
   * Creates React project files
   */
  async createReactFiles(projectPath, options) {
    console.log('⚛️  Creating React files...');

    // Create directories
    const dirs = ['src', 'src/components', 'src/hooks', 'src/styles', 'public'];
    dirs.forEach(dir => {
      fs.mkdirSync(path.join(projectPath, dir), { recursive: true });
    });

    // Vite config
    const viteConfig = `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true
  }
})
`;
    fs.writeFileSync(path.join(projectPath, 'vite.config.js'), viteConfig);

    // HTML template
    const indexHtml = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>VDS React App</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
`;
    fs.writeFileSync(path.join(projectPath, 'index.html'), indexHtml);

    // Main entry point
    const mainJsx = `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './styles/index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
`;
    fs.writeFileSync(path.join(projectPath, 'src/main.jsx'), mainJsx);

    // App component
    const appJsx = `import React from 'react'
import { VDSProvider } from './hooks/useVDS'
import Button from './components/Button'
import './styles/App.css'

function App() {
  return (
    <VDSProvider>
      <div className="app">
        <header className="app-header">
          <h1>VDS React App</h1>
          <p>Design visually, code seamlessly</p>
        </header>
        
        <main className="app-main">
          <section className="demo-section">
            <h2>VDS Components</h2>
            <div className="component-grid">
              <Button vds-id="demo-button-1">Primary Button</Button>
              <Button vds-id="demo-button-2" variant="secondary">Secondary Button</Button>
            </div>
          </section>
        </main>
      </div>
    </VDSProvider>
  )
}

export default App
`;
    fs.writeFileSync(path.join(projectPath, 'src/App.jsx'), appJsx);

    // VDS Hook
    const vdsHook = `import React, { createContext, useContext, useEffect, useState } from 'react';

const VDSContext = createContext();

export function VDSProvider({ children }) {
  const [designData, setDesignData] = useState({});
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Connect to VDS sync server
    const ws = new WebSocket('ws://localhost:3001');
    
    ws.onopen = () => {
      console.log('Connected to VDS sync server');
      setIsConnected(true);
    };
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'DESIGN_UPDATED') {
        setDesignData(prev => ({ ...prev, ...data.payload }));
      }
    };
    
    ws.onclose = () => {
      console.log('Disconnected from VDS sync server');
      setIsConnected(false);
    };

    return () => ws.close();
  }, []);

  return (
    <VDSContext.Provider value={{ designData, isConnected }}>
      {children}
    </VDSContext.Provider>
  );
}

export function useVDS(componentId) {
  const context = useContext(VDSContext);
  if (!context) {
    throw new Error('useVDS must be used within a VDSProvider');
  }
  
  const { designData, isConnected } = context;
  const componentData = designData[componentId] || {};
  
  return {
    props: componentData,
    isConnected,
    updateProp: (key, value) => {
      // Send update to sync server
      if (isConnected) {
        const ws = new WebSocket('ws://localhost:3001');
        ws.onopen = () => {
          ws.send(JSON.stringify({
            type: 'PROP_UPDATE',
            payload: { componentId, key, value }
          }));
          ws.close();
        };
      }
    }
  };
}
`;
    fs.writeFileSync(path.join(projectPath, 'src/hooks/useVDS.js'), vdsHook);

    // Button component
    const buttonComponent = `import React from 'react';
import { useVDS } from '../hooks/useVDS';

function Button({ children, variant = 'primary', ...props }) {
  const vdsId = props['vds-id'];
  const { props: vdsProps } = useVDS(vdsId);
  
  // Merge VDS props with component props
  const mergedProps = {
    variant,
    ...vdsProps,
    ...props
  };

  return (
    <button 
      className={\`btn btn--\${mergedProps.variant}\`}
      style={vdsProps.style}
      {...mergedProps}
    >
      {children}
    </button>
  );
}

export default Button;
`;
    fs.writeFileSync(path.join(projectPath, 'src/components/Button.jsx'), buttonComponent);

    // CSS files
    const indexCSS = `/* VDS React App Styles */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: system-ui, -apple-system, sans-serif;
  line-height: 1.6;
  color: #333;
}

#root {
  min-height: 100vh;
}
`;
    fs.writeFileSync(path.join(projectPath, 'src/styles/index.css'), indexCSS);

    const appCSS = `.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.app-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 2rem;
  text-align: center;
}

.app-header h1 {
  font-size: 2.5rem;
  margin-bottom: 0.5rem;
}

.app-main {
  flex: 1;
  padding: 2rem;
}

.demo-section {
  max-width: 800px;
  margin: 0 auto;
}

.component-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-top: 1rem;
}

/* Button Styles */
.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 0.5rem;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn--primary {
  background: #007bff;
  color: white;
}

.btn--primary:hover {
  background: #0056b3;
  transform: translateY(-1px);
}

.btn--secondary {
  background: #6c757d;
  color: white;
}

.btn--secondary:hover {
  background: #545b62;
  transform: translateY(-1px);
}
`;
    fs.writeFileSync(path.join(projectPath, 'src/styles/App.css'), appCSS);
  }

  /**
   * Creates Next.js project files
   */
  async createNextJSFiles(projectPath, options) {
    console.log('🔺 Creating Next.js files...');

    // Create directories
    const dirs = ['pages', 'components', 'styles', 'public', 'hooks'];
    dirs.forEach(dir => {
      fs.mkdirSync(path.join(projectPath, dir), { recursive: true });
    });

    // Next.js config
    const nextConfig = `/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
}

module.exports = nextConfig
`;
    fs.writeFileSync(path.join(projectPath, 'next.config.js'), nextConfig);

    // Pages
    const indexPage = `import Head from 'next/head'
import { VDSProvider } from '../hooks/useVDS'
import Button from '../components/Button'
import styles from '../styles/Home.module.css'

export default function Home() {
  return (
    <VDSProvider>
      <div className={styles.container}>
        <Head>
          <title>VDS Next.js App</title>
          <meta name="description" content="Visual Design Sync with Next.js" />
          <link rel="icon" href="/favicon.ico" />
        </Head>

        <main className={styles.main}>
          <h1 className={styles.title}>
            Welcome to <span className={styles.highlight}>VDS</span>
          </h1>

          <p className={styles.description}>
            Design visually, code seamlessly with Next.js
          </p>

          <div className={styles.grid}>
            <Button vds-id="home-button-1">Get Started</Button>
            <Button vds-id="home-button-2" variant="secondary">Learn More</Button>
          </div>
        </main>
      </div>
    </VDSProvider>
  )
}
`;
    fs.writeFileSync(path.join(projectPath, 'pages/index.js'), indexPage);

    // App component
    const appPage = `import '../styles/globals.css'

export default function App({ Component, pageProps }) {
  return <Component {...pageProps} />
}
`;
    fs.writeFileSync(path.join(projectPath, 'pages/_app.js'), appPage);

    // Copy VDS hook and Button component (similar to React)
    // ... (similar to React implementation)
  }

  /**
   * Creates Vue project files
   */
  async createVueFiles(projectPath, options) {
    console.log('💚 Creating Vue files...');
    // Implementation for Vue template
  }

  /**
   * Creates Vanilla JS project files
   */
  async createVanillaFiles(projectPath, options) {
    console.log('🟨 Creating Vanilla JS files...');
    // Implementation for Vanilla JS template
  }

  /**
   * Sets up VDS configuration using existing setup script
   */
  async setupVDS(projectPath) {
    console.log('🎨 Setting up VDS configuration...');

    const VDSSetup = require('./vds-setup.js');
    const setup = new VDSSetup(projectPath);
    
    // Run VDS setup without installing dependencies (we'll do that separately)
    setup.createDirectories();
    setup.createVSCodeConfig();
    setup.createSyncServer();
    setup.createDesignStructure();
  }

  /**
   * Installs project dependencies
   */
  installDependencies(projectPath) {
    console.log('📦 Installing dependencies...');
    
    try {
      execSync('npm install', { 
        cwd: projectPath,
        stdio: 'inherit'
      });
      console.log('✅ Dependencies installed successfully');
    } catch (error) {
      console.warn('⚠️  Could not install dependencies automatically. Please run "npm install" in the project directory.');
    }
  }

  /**
   * Converts array to object with default value
   */
  arrayToObject(arr, defaultValue) {
    return arr.reduce((obj, key) => {
      obj[key] = defaultValue;
      return obj;
    }, {});
  }

  /**
   * Prints project creation summary
   */
  printProjectInfo(projectName, templateName) {
    console.log(`
🎉 VDS ${this.templates[templateName].name} project created!

📁 Project: ${projectName}
🎨 Template: ${templateName}

Next steps:
1. cd ${projectName}
2. npm run dev:vds
3. Open VS Code and install the VDS extension
4. Start designing!

Available commands:
- npm run dev        # Start development server
- npm run dev:sync   # Start VDS sync server only  
- npm run dev:vds    # Start both dev server and VDS sync
- npm run vds:export # Export designs as assets
- npm run build      # Build for production

Happy designing! 🎨✨
`);
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const [command, templateName, projectName] = args;

  const templates = new VDSTemplates();

  if (command === 'list' || !command) {
    templates.listTemplates();
  } else if (command === 'create') {
    if (!templateName || !projectName) {
      console.error('Usage: node vds-templates.js create <template> <project-name>');
      process.exit(1);
    }
    
    const options = {
      skipInstall: args.includes('--skip-install')
    };
    
    templates.create(templateName, projectName, options).catch(console.error);
  } else {
    console.error('Unknown command. Use "create" or "list"');
    process.exit(1);
  }
}

module.exports = VDSTemplates;