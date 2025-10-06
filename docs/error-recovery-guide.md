# VDS Error Recovery Guide

This guide helps you troubleshoot and recover from common errors in the VDS (Visual Design Sync) system.

## Quick Diagnostics

Run the built-in diagnostics tool to identify issues:

```bash
npm run diagnostics
```

For detailed JSON output:
```bash
npm run test:diagnostics
```

## Automatic Recovery

Use the recovery tool to automatically fix common issues:

```bash
# Interactive recovery (recommended)
npm run recovery

# Automatic recovery (fixes issues without prompting)
npm run recovery:auto

# Quick health check
npm run health-check
```

The recovery tool will:
- ✅ Detect and fix missing files and directories
- ✅ Install missing dependencies
- ✅ Repair corrupted configuration files
- ✅ Create backups before making changes
- ✅ Verify fixes were successful

## Common Error Types and Solutions

### 1. Connection Errors

#### WebSocket Connection Failed
**Symptoms:** Canvas doesn't sync with code changes, "Connection lost" messages

**Solutions:**
1. Check if sync server is running:
   ```bash
   node scripts/vds-sync-server.js
   ```

2. Verify port availability:
   ```bash
   netstat -an | grep 3001
   ```

3. Try different port:
   ```bash
   node scripts/vds-sync-server.js --port 3002
   ```

4. Check firewall settings (Windows/Mac)

#### Chrome DevTools Connection Failed
**Symptoms:** DevTools changes don't sync to canvas/code

**Solutions:**
1. Start Chrome with remote debugging:
   ```bash
   # Windows
   chrome.exe --remote-debugging-port=9222
   
   # Mac
   /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222
   
   # Linux
   google-chrome --remote-debugging-port=9222
   ```

2. Verify Chrome is accessible:
   - Open http://localhost:9222 in browser
   - Should show DevTools protocol page

3. Check Chrome version compatibility

### 2. File System Errors

#### Permission Denied (EACCES)
**Symptoms:** Cannot save design data, file write errors

**Solutions:**
1. Check file permissions:
   ```bash
   ls -la src/design/design-data.json
   ```

2. Fix permissions:
   ```bash
   chmod 644 src/design/design-data.json
   chmod 755 src/design/
   ```

3. Run VS Code as administrator (Windows) or with sudo (Linux/Mac) if needed

#### File Not Found (ENOENT)
**Symptoms:** Design data file missing, sync errors

**Solutions:**
1. Create missing directories:
   ```bash
   mkdir -p src/design
   ```

2. Initialize default design data:
   ```bash
   node -e "
   const fs = require('fs');
   const defaultData = {
     canvas: { width: 1920, height: 1080, backgroundColor: '#ffffff' },
     elements: [],
     layers: [{ id: 'layer_001', name: 'Background', visible: true }]
   };
   fs.writeFileSync('src/design/design-data.json', JSON.stringify(defaultData, null, 2));
   console.log('Created default design data file');
   "
   ```

#### Disk Full (ENOSPC)
**Symptoms:** Cannot save files, write operations fail

**Solutions:**
1. Check disk space:
   ```bash
   df -h
   ```

2. Clean up temporary files:
   ```bash
   rm -rf .vds-backups/*.backup
   rm -rf node_modules/.cache
   ```

3. Clear VS Code cache (if needed)

### 3. Parsing Errors

#### JSON Parse Error
**Symptoms:** Invalid design data, sync failures

**Solutions:**
1. Validate JSON syntax:
   ```bash
   node -e "JSON.parse(require('fs').readFileSync('src/design/design-data.json', 'utf8'))"
   ```

2. Restore from backup:
   ```bash
   cp .vds-backups/design-data.json.*.backup src/design/design-data.json
   ```

3. Reset to default (last resort):
   ```bash
   mv src/design/design-data.json src/design/design-data.json.broken
   # Then create new default file (see File Not Found solution)
   ```

#### AST Parse Error
**Symptoms:** Code generation fails, component creation errors

**Solutions:**
1. Check file encoding (should be UTF-8)
2. Remove special characters from design data
3. Validate component structure

### 4. Canvas Errors

#### Canvas Context Lost
**Symptoms:** Drawing stops working, blank canvas

**Solutions:**
1. Refresh the webview panel in VS Code
2. Restart VS Code extension
3. Check browser console for WebGL errors
4. Disable hardware acceleration if needed

#### Pressure Sensitivity Not Working
**Symptoms:** Tablet/stylus input not detected

**Solutions:**
1. Check tablet drivers are installed
2. Verify tablet is detected by system
3. Test in other applications first
4. Restart VS Code
5. Check browser compatibility (Chrome/Edge recommended)

#### Memory Limit Exceeded
**Symptoms:** Canvas becomes slow, browser crashes

**Solutions:**
1. Clear canvas history:
   - Use Ctrl+Shift+P → "VDS: Clear Canvas History"

2. Reduce canvas size in settings

3. Close other browser tabs/applications

4. Restart VS Code

### 5. Dependency Errors

#### Missing Dependencies
**Symptoms:** Module not found errors, sync server won't start

**Solutions:**
1. Install missing dependencies:
   ```bash
   npm install
   ```

2. Check for peer dependency issues:
   ```bash
   npm ls
   ```

3. Clear npm cache and reinstall:
   ```bash
   npm cache clean --force
   rm -rf node_modules package-lock.json
   npm install
   ```

#### Version Conflicts
**Symptoms:** Compatibility errors, unexpected behavior

**Solutions:**
1. Update to latest versions:
   ```bash
   npm update
   ```

2. Check for security vulnerabilities:
   ```bash
   npm audit
   npm audit fix
   ```

3. Use exact versions in package.json if needed

### 6. Environment-Specific Issues

#### GitHub Codespaces
**Common Issues:**
- Port forwarding not working
- Slow sync performance
- Memory limitations

**Solutions:**
1. Ensure port 3001 is forwarded publicly
2. Increase sync throttle in remote environments
3. Use smaller canvas sizes
4. Close unused browser tabs

#### iPad/Mobile VS Code
**Common Issues:**
- Touch input not working
- Pressure sensitivity unavailable
- Performance issues

**Solutions:**
1. Enable touch events in browser
2. Use Apple Pencil for best experience
3. Reduce canvas complexity
4. Use Safari or Chrome browser

#### Windows Subsystem for Linux (WSL)
**Common Issues:**
- File permission problems
- Path resolution issues
- Chrome access problems

**Solutions:**
1. Use WSL 2 for better performance
2. Install Chrome in WSL or use Windows Chrome
3. Check file system permissions
4. Use Windows paths for Chrome executable

## Recovery Procedures

### Complete System Reset

If multiple errors persist, perform a complete reset:

1. **Backup current work:**
   ```bash
   cp -r src/design/ backup-design-$(date +%Y%m%d)
   ```

2. **Stop all VDS processes:**
   ```bash
   pkill -f vds-sync-server
   ```

3. **Clear all caches:**
   ```bash
   rm -rf .vds-backups/
   rm -rf node_modules/
   rm -rf out/
   ```

4. **Reinstall dependencies:**
   ```bash
   npm install
   ```

5. **Restart VS Code completely**

6. **Test with minimal setup:**
   - Create new design file
   - Test basic drawing
   - Verify sync functionality

### Backup and Restore

#### Create Manual Backup
```bash
# Create timestamped backup
mkdir -p backups
cp -r src/design/ backups/design-$(date +%Y%m%d-%H%M%S)
cp package.json backups/
cp -r .vscode/ backups/ 2>/dev/null || true
```

#### Restore from Backup
```bash
# List available backups
ls -la backups/

# Restore specific backup
cp -r backups/design-20241006-143000/ src/design/
```

#### Automatic Backup Recovery
VDS automatically creates backups before major operations. To restore:

```bash
# List automatic backups
ls -la .vds-backups/

# Restore latest backup
cp .vds-backups/design-data.json.$(ls -t .vds-backups/ | head -1) src/design/design-data.json
```

## Prevention Tips

### Regular Maintenance
1. **Run diagnostics weekly:**
   ```bash
   npm run diagnostics
   ```

2. **Keep dependencies updated:**
   ```bash
   npm update
   npm audit
   ```

3. **Monitor disk space and memory usage**

4. **Create regular backups of design files**

### Best Practices
1. **Save work frequently** - VDS auto-saves, but manual saves are recommended
2. **Use version control** - Commit design files to Git
3. **Test in simple scenarios first** - Before complex designs
4. **Monitor browser console** - Check for JavaScript errors
5. **Keep Chrome updated** - For DevTools compatibility

### Performance Optimization
1. **Limit canvas size** - Use reasonable dimensions
2. **Reduce layer count** - Merge layers when possible
3. **Clear history periodically** - Prevent memory buildup
4. **Close unused browser tabs** - Free up system resources
5. **Use SSD storage** - For better file I/O performance

## Getting Help

### Debug Information Collection

When reporting issues, collect this information:

1. **Run diagnostics:**
   ```bash
   npm run diagnostics --format json > diagnostics.json
   ```

2. **Check error logs:**
   ```bash
   # VS Code logs
   # Help → Toggle Developer Tools → Console

   # Sync server logs
   node scripts/vds-sync-server.js --verbose

   # Browser console logs
   # F12 → Console tab
   ```

3. **System information:**
   ```bash
   node --version
   npm --version
   code --version
   ```

### Support Channels

1. **GitHub Issues** - For bugs and feature requests
2. **VS Code Extension Marketplace** - For extension-specific issues
3. **Documentation** - Check docs/ directory for detailed guides
4. **Community Forums** - For general questions and tips

### Emergency Contacts

For critical production issues:
- Create GitHub issue with "urgent" label
- Include full diagnostic output
- Provide steps to reproduce
- Attach relevant log files

## Troubleshooting Checklist

Before reporting issues, verify:

- [ ] Diagnostics tool shows no critical errors
- [ ] All dependencies are installed (`npm ls`)
- [ ] VS Code is up to date
- [ ] Chrome/browser is up to date
- [ ] File permissions are correct
- [ ] Sufficient disk space available
- [ ] No firewall blocking ports 3001/9222
- [ ] Design data file is valid JSON
- [ ] Sync server starts without errors
- [ ] WebSocket connection works
- [ ] Basic drawing functionality works

If all items are checked and issues persist, collect debug information and seek support.