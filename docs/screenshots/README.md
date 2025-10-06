# Screenshots Directory

This directory contains screenshots and visual documentation for the Visual Sketch Sync extension.

## Screenshot Guidelines

### Required Screenshots

#### Installation and Setup
- `installation-methods.png` - Comparison of installation methods
- `extension-list.png` - VSS in VS Code extensions list
- `command-palette.png` - VSS commands in Command Palette

#### Core Functionality
- `open-canvas.png` - Opening the drawing canvas
- `canvas-interface.png` - Main canvas interface with tools
- `drawing-example.png` - Example of drawing on canvas
- `webview-panel.png` - Canvas in VS Code webview panel

#### Commands and Features
- `system-diagnostics.png` - Diagnostics output example
- `settings-panel.png` - VSS settings in VS Code preferences
- `sync-server-status.png` - Sync server running status
- `export-design.png` - Design export functionality

#### Troubleshooting
- `developer-console.png` - VS Code Developer Console with VSS logs
- `error-recovery.png` - Recovery tool in action
- `performance-monitor.png` - System performance monitoring

### Screenshot Standards

#### Technical Requirements
- **Format**: PNG with transparency support
- **Resolution**: Minimum 1920x1080 for desktop screenshots
- **Quality**: High quality, no compression artifacts
- **File Size**: Keep under 500KB per image when possible

#### Content Guidelines
- **Clean Interface**: Hide personal information and irrelevant panels
- **Consistent Theme**: Use VS Code Dark+ theme for consistency
- **Clear Focus**: Highlight relevant UI elements
- **Readable Text**: Ensure all text is legible at documentation size

#### Naming Convention
- Use descriptive, kebab-case filenames
- Include context: `canvas-drawing-example.png`
- Version screenshots: `settings-v0.1.0.png`
- Group by feature: `sync-server-start.png`

### Creating Screenshots

#### Setup for Screenshots
1. **Use clean VS Code workspace** with minimal extensions
2. **Set consistent window size** (1920x1080 recommended)
3. **Use Dark+ theme** for consistency
4. **Clear terminal/output** panels of irrelevant content
5. **Hide personal information** (file paths, usernames)

#### Tools and Techniques
- **Built-in tools**: Use OS screenshot tools (Snipping Tool, Screenshot.app)
- **Browser tools**: For webview screenshots, use browser dev tools
- **Annotation**: Add arrows, highlights, or callouts when helpful
- **Cropping**: Focus on relevant UI areas, remove empty space

### Screenshot Checklist

Before adding screenshots to documentation:

- [ ] Image is clear and high quality
- [ ] No personal or sensitive information visible
- [ ] Consistent with other documentation screenshots
- [ ] Properly sized for documentation context
- [ ] Filename follows naming convention
- [ ] Alt text provided in documentation
- [ ] Image adds value to documentation

### Placeholder Screenshots

Until actual screenshots are captured, documentation uses placeholder text:

```markdown
![Opening Drawing Canvas](screenshots/open-canvas.png)
*The drawing canvas opens as a webview panel in VS Code*
```

### Contributing Screenshots

When contributing screenshots:

1. **Follow guidelines** above for quality and consistency
2. **Test in documentation** to ensure proper display
3. **Provide alt text** describing the screenshot content
4. **Update this README** if adding new screenshot categories
5. **Optimize file size** while maintaining quality

### Screenshot Maintenance

Screenshots should be updated when:
- UI changes significantly
- New features are added
- VS Code interface updates
- Extension branding changes
- Documentation structure changes

---

**Note**: This directory currently contains placeholder references. Screenshots will be added as the extension UI stabilizes and key features are implemented.