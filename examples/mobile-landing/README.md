# Mobile-First Landing Page Example

This example demonstrates creating a responsive landing page optimized for tablet/stylus input and mobile-first development using Apple Pencil and cross-platform workflows.

## What You'll Learn

- Mobile-first responsive design through visual tools
- Apple Pencil and Wacom tablet workflow optimization
- Cross-platform development (iPad + GitHub Codespaces)
- Touch gesture support and tablet-specific interactions

## Project Structure

```
mobile-landing/
├── src/
│   ├── components/
│   │   ├── Hero.jsx             # Generated hero section
│   │   ├── FeatureCards.jsx     # Generated feature grid
│   │   ├── Testimonials.jsx     # Generated testimonial carousel
│   │   └── ContactForm.jsx      # Generated contact form
│   ├── styles/
│   │   ├── mobile-first.css     # Generated responsive styles
│   │   ├── tablet-optimized.css # Tablet-specific styles
│   │   └── touch-interactions.css # Touch gesture styles
│   └── design/
│       └── design-data.json     # Mobile-optimized design data
├── scripts/
│   └── vds-sync-server.js       # Cross-platform sync server
└── package.json
```

## Step-by-Step Tutorial

### Step 1: Set Up Cross-Platform Environment

#### Option A: iPad + GitHub Codespaces
1. **Open GitHub Codespaces** on iPad
2. **Install VS Code iOS app** or use browser version
3. **Connect Apple Pencil** and ensure pressure sensitivity works
4. **Start VDS extension** and verify drawing canvas responds to Pencil

#### Option B: Desktop + Wacom Tablet
1. **Install Wacom drivers** and configure pressure sensitivity
2. **Open VS Code** with VDS extension
3. **Test tablet input** in drawing canvas
4. **Verify multi-touch gestures** work properly

### Step 2: Design Mobile-First Layout

1. **Start with Mobile Canvas** (375×812px - iPhone dimensions):
   - Create hero section with large heading and CTA button
   - Design feature cards in single column layout
   - Add testimonial section with swipe indicators
   - Create simple contact form with large touch targets

2. **Use Apple Pencil for Precision**:
   - Draw precise UI elements with pressure sensitivity
   - Use tilt for shading and texture effects
   - Leverage palm rejection for natural drawing

3. **Add Touch Interaction Zones**:
   - Ensure buttons are minimum 44×44px (Apple guidelines)
   - Add swipe gesture areas for carousel navigation
   - Design pull-to-refresh indicators

### Step 3: Create Responsive Breakpoints

1. **Tablet Layout** (768×1024px):
   - Expand to two-column feature grid
   - Increase hero section padding and font sizes
   - Add sidebar navigation option
   - Optimize for landscape orientation

2. **Desktop Layout** (1200×800px):
   - Three-column feature grid
   - Horizontal navigation bar
   - Larger hero with background image
   - Multi-column contact form

3. **Watch CSS Generation**:
   ```css
   /* Generated mobile-first CSS */
   .hero {
     padding: 2rem 1rem;
     text-align: center;
   }
   
   @media (min-width: 768px) {
     .hero {
       padding: 4rem 2rem;
       text-align: left;
     }
   }
   
   @media (min-width: 1200px) {
     .hero {
       padding: 6rem 4rem;
       display: flex;
       align-items: center;
     }
   }
   ```

### Step 4: Implement Touch Gestures

1. **Swipe Navigation**:
   - Draw swipe indicators for testimonial carousel
   - Add momentum scrolling for feature cards
   - Implement pull-to-refresh for dynamic content

2. **Pinch-to-Zoom Support**:
   - Enable zooming for image galleries
   - Add zoom controls for accessibility
   - Prevent zoom on form inputs

3. **Touch Feedback**:
   - Add haptic feedback indicators in design
   - Create visual press states for buttons
   - Design loading states for touch interactions

### Step 5: Cross-Platform Optimization

1. **GitHub Codespaces Integration**:
   - Configure remote development environment
   - Set up port forwarding for sync server
   - Enable live preview on iPad browser

2. **Performance Optimization**:
   - Optimize images for mobile bandwidth
   - Implement lazy loading for below-fold content
   - Add service worker for offline functionality

3. **Testing Across Devices**:
   - Test on actual iOS devices
   - Verify Android compatibility
   - Check desktop browser support

## Expected Results

After completing this tutorial, you should have:

- ✅ Fully responsive landing page designed mobile-first
- ✅ Apple Pencil/Wacom tablet optimized workflow
- ✅ Cross-platform development setup (iPad + Codespaces)
- ✅ Touch gesture support and mobile interactions
- ✅ Real-time sync across all device types

## Apple Pencil Workflow Features

### Pressure Sensitivity
```javascript
// Generated from pressure-sensitive drawing
.brush-stroke {
  stroke-width: var(--pressure-width);
  opacity: var(--pressure-opacity);
  filter: blur(var(--pressure-blur));
}

// Pressure values: 0.0 (light) to 1.0 (full pressure)
```

### Tilt Detection
```javascript
// Tilt angle affects brush shape and shading
.tilt-effect {
  transform: skew(var(--tilt-x), var(--tilt-y));
  box-shadow: var(--tilt-shadow);
}
```

### Palm Rejection
- Automatic palm detection prevents accidental touches
- Only Apple Pencil input registers in drawing canvas
- Multi-touch gestures work alongside Pencil drawing

## Cross-Platform Sync Features

### iPad + Codespaces Workflow
1. **Design on iPad**: Use Apple Pencil for visual design
2. **Code in Codespaces**: VS Code running in cloud environment
3. **Preview on Device**: Live reload works on iPad browser
4. **Sync Everything**: Changes sync between iPad, cloud, and desktop

### Remote Development Setup
```json
// .devcontainer/devcontainer.json
{
  "name": "VDS Mobile Development",
  "image": "node:18",
  "forwardPorts": [3000, 8080],
  "postCreateCommand": "npm install",
  "customizations": {
    "vscode": {
      "extensions": [
        "vds.visual-design-sync",
        "ms-vscode.live-server"
      ]
    }
  }
}
```

## Mobile-First CSS Generation

### Responsive Grid System
```css
/* Generated from visual grid design */
.grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
  padding: 1rem;
}

@media (min-width: 768px) {
  .grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 2rem;
    padding: 2rem;
  }
}

@media (min-width: 1200px) {
  .grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 3rem;
    padding: 3rem;
  }
}
```

### Touch-Optimized Components
```css
/* Generated from touch target design */
.touch-button {
  min-height: 44px;
  min-width: 44px;
  padding: 12px 24px;
  font-size: 16px; /* Prevents zoom on iOS */
  border-radius: 8px;
  touch-action: manipulation;
}

.swipe-area {
  touch-action: pan-x;
  -webkit-overflow-scrolling: touch;
  scroll-snap-type: x mandatory;
}
```

## Performance Optimizations

### Image Optimization
```jsx
// Generated responsive image component
export const ResponsiveImage = ({ src, alt, sizes }) => {
  return (
    <picture>
      <source 
        media="(max-width: 768px)" 
        srcSet={`${src}?w=400 1x, ${src}?w=800 2x`} 
      />
      <source 
        media="(min-width: 769px)" 
        srcSet={`${src}?w=800 1x, ${src}?w=1600 2x`} 
      />
      <img 
        src={`${src}?w=800`} 
        alt={alt}
        loading="lazy"
        decoding="async"
      />
    </picture>
  );
};
```

### Service Worker Integration
```javascript
// Generated PWA features
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js')
    .then(registration => {
      console.log('SW registered:', registration);
    });
}
```

## Accessibility Features

### Screen Reader Support
- Semantic HTML structure generated from visual hierarchy
- ARIA labels automatically added to interactive elements
- Focus management for keyboard navigation

### High Contrast Mode
- Automatic color contrast checking
- High contrast theme variants
- Reduced motion preferences support

## Testing Strategy

### Device Testing
- iOS Safari (iPhone, iPad)
- Android Chrome (various screen sizes)
- Desktop browsers (Chrome, Firefox, Safari, Edge)

### Performance Testing
- Lighthouse mobile scores
- Core Web Vitals optimization
- Network throttling simulation

## Next Steps

- Explore **Design System Dashboard** for component libraries
- Try **E-commerce Cards** for data-driven components
- Check out **Basic Button** for simpler workflows

## Troubleshooting

**Apple Pencil not working?**
- Ensure Pencil is paired with iPad
- Check battery level and charging
- Verify Pointer Events API support in browser

**Codespaces sync issues?**
- Check port forwarding configuration
- Verify WebSocket connection status
- Ensure firewall allows connections

**Touch gestures not responsive?**
- Check touch-action CSS properties
- Verify event listeners are properly attached
- Test on actual devices, not just browser dev tools