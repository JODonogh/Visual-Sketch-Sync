# E-commerce Product Cards Example

This example demonstrates creating data-driven product cards through visual design with Redux DevTools integration and dynamic state management.

## What You'll Learn

- Data-driven component design with dynamic content
- Redux DevTools integration for state management
- Real-time prop editing through visual interface
- Complex component composition and layout

## Project Structure

```
ecommerce-cards/
├── src/
│   ├── components/
│   │   ├── ProductCard.jsx      # Generated product card component
│   │   ├── ProductGrid.jsx      # Generated grid layout component
│   │   ├── PriceTag.jsx        # Generated price component
│   │   └── RatingStars.jsx     # Generated rating component
│   ├── store/
│   │   ├── store.js            # Redux store configuration
│   │   ├── productSlice.js     # Product state management
│   │   └── cartSlice.js        # Shopping cart state
│   ├── styles/
│   │   ├── product-cards.css   # Generated card styles
│   │   └── grid-layout.css     # Generated grid styles
│   └── design/
│       └── design-data.json    # Product card design data
├── scripts/
│   └── vds-sync-server.js      # Redux-aware sync server
└── package.json
```

## Step-by-Step Tutorial

### Step 1: Design the Product Card Layout

1. **Create Card Container**: 
   - Draw rectangle 280×400px with rounded corners (12px)
   - Add subtle shadow for elevation
   - Set background color to white (#ffffff)

2. **Add Product Image Area**:
   - Rectangle 280×200px at top of card
   - Light gray background (#f8f9fa) as placeholder
   - 8px border radius on top corners only

3. **Design Content Area**:
   - Product title area: 16px padding, bold text
   - Price section: Flexbox layout with original/sale prices
   - Rating stars: 5-star rating component
   - Add to cart button: Primary button style

### Step 2: Create Dynamic Data Binding

1. **Set Up Component Props**:
   - Product ID, name, price, salePrice, rating, imageUrl
   - Inventory status, category, brand
   - Cart quantity and availability

2. **Configure Redux Integration**:
   - Connect card to product state slice
   - Add cart actions for add/remove items
   - Set up real-time price updates

3. **Enable Visual Prop Editing**:
   - Click on price text to edit values
   - Modify colors and see Redux state update
   - Change button text and see component props update

### Step 3: Build the Product Grid

1. **Design Grid Layout**:
   - Responsive grid: 4 columns desktop, 2 tablet, 1 mobile
   - 24px gaps between cards
   - Auto-fit layout with minimum card width

2. **Add Filter Controls**:
   - Category filter buttons
   - Price range slider
   - Sort dropdown (price, rating, name)

3. **Implement Pagination**:
   - Load more button
   - Infinite scroll option
   - Items per page selector

### Step 4: Redux DevTools Integration

1. **State Visualization**:
   - See product data in Redux DevTools
   - Watch state changes as you modify visual design
   - Time-travel debugging with design changes

2. **Action Dispatching**:
   - Visual interactions dispatch Redux actions
   - Cart updates reflect in DevTools
   - Filter changes update store state

3. **Real-time Sync**:
   - Redux state changes update visual design
   - Visual design changes dispatch actions
   - Three-way sync: Canvas ↔ Code ↔ Redux Store

### Step 5: Advanced Features

1. **Dynamic Theming**:
   - Switch between light/dark themes
   - Brand color customization
   - Seasonal theme variations

2. **A/B Testing Setup**:
   - Multiple card design variants
   - Performance tracking integration
   - Conversion rate optimization

3. **Accessibility Features**:
   - Screen reader support
   - Keyboard navigation
   - High contrast mode

## Expected Results

After completing this tutorial, you should have:

- ✅ Fully functional e-commerce product cards
- ✅ Redux store integration with real-time sync
- ✅ Responsive grid layout with filtering
- ✅ Visual prop editing through drawing canvas
- ✅ Redux DevTools integration for state debugging

## Generated Components

### ProductCard Component
```jsx
import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { addToCart, removeFromCart } from '../store/cartSlice';

export const ProductCard = ({ productId }) => {
  const product = useSelector(state => 
    state.products.items.find(p => p.id === productId)
  );
  const cartQuantity = useSelector(state => 
    state.cart.items[productId]?.quantity || 0
  );
  const dispatch = useDispatch();

  const handleAddToCart = () => {
    dispatch(addToCart({ productId, quantity: 1 }));
  };

  return (
    <div className="product-card">
      <div className="product-image">
        <img src={product.imageUrl} alt={product.name} />
        {product.salePrice && (
          <div className="sale-badge">Sale</div>
        )}
      </div>
      
      <div className="product-content">
        <h3 className="product-title">{product.name}</h3>
        
        <div className="product-price">
          {product.salePrice ? (
            <>
              <span className="sale-price">${product.salePrice}</span>
              <span className="original-price">${product.price}</span>
            </>
          ) : (
            <span className="price">${product.price}</span>
          )}
        </div>
        
        <div className="product-rating">
          <RatingStars rating={product.rating} />
          <span className="rating-count">({product.reviewCount})</span>
        </div>
        
        <button 
          className="add-to-cart-btn"
          onClick={handleAddToCart}
          disabled={!product.inStock}
        >
          {cartQuantity > 0 ? `In Cart (${cartQuantity})` : 'Add to Cart'}
        </button>
      </div>
    </div>
  );
};
```

### Redux Store Integration
```javascript
// Generated Redux slice from visual design
const productSlice = createSlice({
  name: 'products',
  initialState: {
    items: [],
    filters: {
      category: 'all',
      priceRange: [0, 1000],
      sortBy: 'name'
    },
    loading: false
  },
  reducers: {
    updateProductPrice: (state, action) => {
      const { productId, price } = action.payload;
      const product = state.items.find(p => p.id === productId);
      if (product) {
        product.price = price;
      }
    },
    updateProductStyle: (state, action) => {
      // Visual design changes update product display properties
      const { productId, styleChanges } = action.payload;
      // Update visual properties that affect component rendering
    }
  }
});
```

## Redux DevTools Features

### State Inspection
- View complete product catalog state
- Inspect individual product properties
- Monitor cart state changes in real-time

### Action Monitoring
- Track visual design changes as Redux actions
- See prop updates dispatch to store
- Monitor performance of state updates

### Time Travel Debugging
- Revert design changes through Redux DevTools
- Step through visual modifications
- Compare different design states

## Integration Patterns

### React + Redux
```jsx
// Visual prop changes dispatch Redux actions
const handleVisualPropChange = (componentId, propName, value) => {
  dispatch(updateComponentProp({ componentId, propName, value }));
};

// Redux state changes update visual design
useEffect(() => {
  const unsubscribe = store.subscribe(() => {
    const state = store.getState();
    updateVisualDesign(state.products.items);
  });
  return unsubscribe;
}, []);
```

### Real-time Price Updates
```javascript
// Price changes in visual design update Redux store
const handlePriceChange = (productId, newPrice) => {
  // Update visual design
  updateProductCardPrice(productId, newPrice);
  
  // Dispatch Redux action
  dispatch(updateProductPrice({ productId, price: newPrice }));
  
  // Sync with backend API
  api.updateProduct(productId, { price: newPrice });
};
```

## Performance Optimization

- **Memoized Components**: Prevent unnecessary re-renders
- **Virtual Scrolling**: Handle large product catalogs
- **Image Lazy Loading**: Optimize initial page load
- **State Normalization**: Efficient Redux store structure

## Next Steps

- Try **Mobile Landing** for responsive design patterns
- Explore tablet-specific workflows with Apple Pencil
- Check out **Basic Button** for simpler component examples

## Troubleshooting

**Redux DevTools not connecting?**
- Ensure Redux DevTools extension is installed
- Check that store is configured with devtools enhancer
- Verify WebSocket connection to sync server

**Visual changes not updating Redux state?**
- Check action dispatching in sync server
- Verify reducer logic for visual prop updates
- Look for middleware blocking actions