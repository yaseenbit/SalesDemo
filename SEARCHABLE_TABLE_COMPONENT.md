# SearchableTable Component Documentation

## Overview

The `SearchableTable` component provides a reusable search interface similar to React Semantic UI's search component. It displays a textbox input that filters a list of items in real-time, displaying matching results in a styled table below.

## Features

✅ **Real-time filtering** - Results update as the user types
✅ **Customizable columns** - Define which fields to display and how to render them
✅ **Multi-field search** - Search across multiple item properties
✅ **Custom rendering** - Optional custom render functions for columns
✅ **Item selection callback** - Handle item selection with `onItemSelect` prop
✅ **Configurable UI text** - Placeholder, empty message, and result counts
✅ **Sticky header** - Table header remains visible when scrolling
✅ **Max results** - Limit the number of displayed results to improve performance
✅ **Responsive design** - Works on desktop and mobile
✅ **Accessible** - Proper ARIA labels and semantic HTML

## Component API

### Props

```typescript
interface SearchableTableProps<TItem extends object> {
  items: TItem[];
  columns: SearchableTableColumn<TItem>[];
  searchFields: string[];
  placeholder?: string;
  emptyMessage?: string;
  maxResults?: number;
  onItemSelect?: (item: TItem) => void;
}
```

### Props Description

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `items` | `TItem[]` | Yes | Array of items to search and display |
| `columns` | `SearchableTableColumn<TItem>[]` | Yes | Column definitions for the results table |
| `searchFields` | `string[]` | Yes | Field names to search across |
| `placeholder` | `string` | No | Input placeholder text (default: "Search items...") |
| `emptyMessage` | `string` | No | Message when no results found (default: "No items found.") |
| `maxResults` | `number` | No | Maximum results to display (default: 50) |
| `onItemSelect` | `(item: TItem) => void` | No | Callback when user clicks a result row |

### SearchableTableColumn Interface

```typescript
interface SearchableTableColumn<TItem extends object> {
  key: string;
  label: string;
  width?: string;
  render?: (value: any, item: TItem) => React.ReactNode;
}
```

| Property | Type | Description |
|----------|------|-------------|
| `key` | `string` | Field name in the item object |
| `label` | `string` | Column header text |
| `width` | `string` | Optional CSS width value (e.g., "150px") |
| `render` | `(value, item) => React.ReactNode` | Optional custom render function |

## Usage Example

### Basic Usage with Product Catalog

```typescript
import { SearchableTable, type SearchableTableColumn } from '../components/SearchableTable';
import { productCatalog } from '../data/catalog';

export function MyComponent() {
  const columns: SearchableTableColumn<typeof productCatalog[0]>[] = [
    { key: 'barcode', label: 'Barcode', width: '150px' },
    { key: 'name', label: 'Product Name' },
    { key: 'unitPrice', label: 'Unit Price', width: '120px' },
  ];

  return (
    <SearchableTable
      items={productCatalog}
      columns={columns}
      searchFields={['barcode', 'name']}
      placeholder="Search by barcode or product name..."
      onItemSelect={(item) => console.log('Selected:', item)}
    />
  );
}
```

### Advanced Usage with Custom Rendering

```typescript
const columns: SearchableTableColumn<CatalogItem>[] = [
  {
    key: 'barcode',
    label: 'Barcode',
    width: '150px',
    render: (value) => <code>{value}</code>,
  },
  {
    key: 'name',
    label: 'Product Name',
    render: (value, item) => (
      <div>
        <strong>{value}</strong>
        <br />
        <small>{item.category}</small>
      </div>
    ),
  },
  {
    key: 'unitPrice',
    label: 'Unit Price',
    width: '120px',
    render: (value) => `$${value.toFixed(2)}`,
  },
  {
    key: 'stock',
    label: 'In Stock',
    width: '100px',
    render: (value) => (
      <span style={{ color: value > 0 ? 'green' : 'red' }}>
        {value > 0 ? '✓ Yes' : '✗ No'}
      </span>
    ),
  },
];

return (
  <SearchableTable
    items={inventory}
    columns={columns}
    searchFields={['barcode', 'name', 'category']}
    placeholder="Search inventory..."
    maxResults={100}
    onItemSelect={(item) => {
      // Handle item selection (e.g., add to order)
      addToCart(item);
    }}
  />
);
```

## Styling

The component uses CSS modules with design tokens:

- `.searchableTableContainer` - Main wrapper
- `.searchBox` - Input area
- `.searchInput` - Text input field
- `.tableWrapper` - Scrollable table container
- `.resultsTable` - Results table
- `.resultRow` - Individual row (clickable with hover/active states)
- `.emptyState` - Empty state message
- `.resultCount` - Result count footer

All styles use CSS variables for consistency:
- `--border` - Border color
- `--panel` - Panel background
- `--text` - Text color
- `--muted` - Muted text color
- `--primary` - Primary brand color

## Behavior

### Search Flow
1. User types in the search input
2. Component filters items based on `searchFields`
3. Results display in a table below the input
4. Matching results are limited to `maxResults`
5. User can click any row to trigger `onItemSelect`

### Empty Results
- If no items match the search, a styled empty state displays
- Shows the `emptyMessage` text
- User can clear input or modify search terms

### Result Count
- Displayed below the table
- Shows "Showing X of Y items" format
- Only visible when there are results

### Performance
- `useMemo` hook optimizes filtering
- Results capped at `maxResults` (default: 50)
- No debouncing needed - filtering is instant and lightweight

## Integration Examples

### In an Order Form
```typescript
const handleProductSelect = (product: CatalogItem) => {
  addLineItem({
    sku: product.barcode,
    description: product.name,
    unitPrice: product.unitPrice,
  });
};

return (
  <div>
    <h3>Add Product to Order</h3>
    <SearchableTable
      items={productCatalog}
      columns={productColumns}
      searchFields={['barcode', 'name']}
      onItemSelect={handleProductSelect}
    />
  </div>
);
```

### In a Lookup/Reference List
```typescript
return (
  <div>
    <h3>Customer Lookup</h3>
    <SearchableTable
      items={customerList}
      columns={customerColumns}
      searchFields={['id', 'name', 'email']}
      placeholder="Search by ID, name, or email..."
      maxResults={20}
      onItemSelect={(customer) => loadCustomerDetails(customer.id)}
    />
  </div>
);
```

## Styling Customization

To customize colors, update CSS variables in your theme:

```css
:root {
  --border: #d8def8;
  --panel: #ffffff;
  --text: #172343;
  --muted: #5f6b96;
  --primary: #5c6cff;
}
```

Or override specific class styles:

```css
.searchInput {
  max-width: 600px; /* Make input wider */
  border-radius: 8px; /* Adjust border radius */
}

.resultsTable {
  max-height: 600px; /* Taller scroll area */
}
```

## Accessibility

- Input has `aria-label` for screen readers
- Semantic HTML table structure
- Keyboard navigation supported (Tab through rows)
- High color contrast for visibility
- Clear empty state messaging

## Common Use Cases

1. **Product Search** - Find products by barcode or name
2. **Customer Lookup** - Find customers by ID or email
3. **Category Filter** - Search and browse categories
4. **Inventory Search** - Find items in stock
5. **Reference Picker** - Select from predefined lists

## Performance Considerations

- For lists with 1000+ items, consider:
  - Increasing `maxResults` cap
  - Implementing virtual scrolling (future enhancement)
  - Server-side filtering for very large datasets
- Current implementation handles 100-500 items smoothly
- Filtering is O(n) which is efficient for typical use cases

## Browser Support

- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support
- Mobile browsers: Full support (responsive)

