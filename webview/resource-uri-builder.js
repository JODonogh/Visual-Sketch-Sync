/**
 * ResourceURIBuilder - Utility class for creating proper vscode-resource URIs
 * Handles conversion of relative paths to VS Code webview-compatible URIs
 */
class ResourceURIBuilder {
    constructor() {
        this.vscodeApi = null;
        this.extensionUri = null;
        this.webview = null;
        this.initialized = false;
    }

    /**
     * Initialize the ResourceURIBuilder with VS Code API and extension context
     * @param {object} vscodeApi - The VS Code API instance
     * @param {object} extensionUri - The extension URI from VS Code
     * @param {object} webview - The webview instance
     */
    initialize(vscodeApi, extensionUri, webview) {
        this.vscodeApi = vscodeApi;
        this.extensionUri = extensionUri;
        this.webview = webview;
        this.initialized = true;
        
        console.log('ResourceURIBuilder initialized with VS Code API');
    }

    /**
     * Build a proper vscode-resource URI from a relative path
     * @param {string} relativePath - Path relative to the webview directory
     * @returns {string} - Properly formatted vscode-resource URI
     */
    buildURI(relativePath) {
        if (!this.initialized) {
            console.warn('ResourceURIBuilder not initialized, using fallback URI construction');
            return this.buildFallbackURI(relativePath);
        }

        try {
            // Remove leading slash if present
            const cleanPath = relativePath.startsWith('/') ? relativePath.slice(1) : relativePath;
            
            // Use VS Code's webview URI conversion if available
            if (this.webview && this.webview.asWebviewUri) {
                const resourceUri = this.vscodeApi.Uri.joinPath(this.extensionUri, 'webview', cleanPath);
                return this.webview.asWebviewUri(resourceUri).toString();
            }
            
            // Fallback to manual URI construction
            return this.buildFallbackURI(cleanPath);
            
        } catch (error) {
            console.error('Error building resource URI:', error);
            return this.buildFallbackURI(relativePath);
        }
    }

    /**
     * Build a fallback vscode-resource URI when VS Code API is not available
     * @param {string} relativePath - Path relative to the webview directory
     * @returns {string} - Fallback vscode-resource URI
     */
    buildFallbackURI(relativePath) {
        // Remove leading slash if present
        const cleanPath = relativePath.startsWith('/') ? relativePath.slice(1) : relativePath;
        
        // Encode path segments properly
        const encodedPath = this.encodePathSegments(cleanPath);
        
        // Construct vscode-resource URI manually
        return `vscode-resource:/webview/${encodedPath}`;
    }

    /**
     * Properly encode path segments for URI usage
     * @param {string} path - The path to encode
     * @returns {string} - Encoded path
     */
    encodePathSegments(path) {
        return path.split('/').map(segment => encodeURIComponent(segment)).join('/');
    }

    /**
     * Validate that a URI is properly formatted
     * @param {string} uri - The URI to validate
     * @returns {boolean} - True if URI is valid
     */
    static validateURI(uri) {
        try {
            // Check if it's a valid vscode-resource URI
            if (uri.startsWith('vscode-resource:')) {
                return true;
            }
            
            // Check if it's a valid data URI
            if (uri.startsWith('data:')) {
                return true;
            }
            
            // Check if it's a valid blob URI
            if (uri.startsWith('blob:')) {
                return true;
            }
            
            // For other URIs, try to parse them
            new URL(uri);
            return true;
        } catch (error) {
            console.warn('Invalid URI format:', uri, error);
            return false;
        }
    }

    /**
     * Convert all script src attributes in the document to use proper URIs
     */
    updateScriptSources() {
        const scripts = document.querySelectorAll('script[src]');
        let updatedCount = 0;
        
        scripts.forEach(script => {
            const currentSrc = script.getAttribute('src');
            
            // Skip if already using vscode-resource or other valid schemes
            if (currentSrc.startsWith('vscode-resource:') || 
                currentSrc.startsWith('data:') || 
                currentSrc.startsWith('blob:')) {
                return;
            }
            
            // Convert relative paths to vscode-resource URIs
            if (!currentSrc.startsWith('http://') && !currentSrc.startsWith('https://')) {
                const newSrc = this.buildURI(currentSrc);
                script.setAttribute('src', newSrc);
                updatedCount++;
                console.log(`Updated script src: ${currentSrc} -> ${newSrc}`);
            }
        });
        
        console.log(`Updated ${updatedCount} script sources to use vscode-resource URIs`);
        return updatedCount;
    }

    /**
     * Convert all CSS link href attributes in the document to use proper URIs
     */
    updateStylesheetSources() {
        const links = document.querySelectorAll('link[rel="stylesheet"][href]');
        let updatedCount = 0;
        
        links.forEach(link => {
            const currentHref = link.getAttribute('href');
            
            // Skip if already using vscode-resource or other valid schemes
            if (currentHref.startsWith('vscode-resource:') || 
                currentHref.startsWith('data:') || 
                currentHref.startsWith('blob:')) {
                return;
            }
            
            // Convert relative paths to vscode-resource URIs
            if (!currentHref.startsWith('http://') && !currentHref.startsWith('https://')) {
                const newHref = this.buildURI(currentHref);
                link.setAttribute('href', newHref);
                updatedCount++;
                console.log(`Updated stylesheet href: ${currentHref} -> ${newHref}`);
            }
        });
        
        console.log(`Updated ${updatedCount} stylesheet sources to use vscode-resource URIs`);
        return updatedCount;
    }

    /**
     * Update all resource references in the document
     */
    updateAllResourceReferences() {
        if (!this.initialized) {
            console.warn('ResourceURIBuilder not initialized, skipping resource updates');
            return { scripts: 0, stylesheets: 0 };
        }
        
        const scriptUpdates = this.updateScriptSources();
        const stylesheetUpdates = this.updateStylesheetSources();
        
        return {
            scripts: scriptUpdates,
            stylesheets: stylesheetUpdates,
            total: scriptUpdates + stylesheetUpdates
        };
    }

    /**
     * Create a new script element with proper vscode-resource URI
     * @param {string} src - The script source path
     * @param {object} options - Additional options for the script element
     * @returns {HTMLScriptElement} - The created script element
     */
    createScriptElement(src, options = {}) {
        const script = document.createElement('script');
        script.src = this.buildURI(src);
        
        // Apply additional options
        if (options.async !== undefined) script.async = options.async;
        if (options.defer !== undefined) script.defer = options.defer;
        if (options.type) script.type = options.type;
        if (options.onload) script.onload = options.onload;
        if (options.onerror) script.onerror = options.onerror;
        
        return script;
    }

    /**
     * Create a new link element for stylesheets with proper vscode-resource URI
     * @param {string} href - The stylesheet href path
     * @param {object} options - Additional options for the link element
     * @returns {HTMLLinkElement} - The created link element
     */
    createStylesheetElement(href, options = {}) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = this.buildURI(href);
        
        // Apply additional options
        if (options.media) link.media = options.media;
        if (options.onload) link.onload = options.onload;
        if (options.onerror) link.onerror = options.onerror;
        
        return link;
    }
}

// Create global instance
window.ResourceURIBuilder = ResourceURIBuilder;

// Export for module usage if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ResourceURIBuilder;
}