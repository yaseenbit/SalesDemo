# Combobox Column - Implementation & Usage Guide

## Overview

A new **combobox** column type has been added to `EditableGridTable` using React Bootstrap Typeahead control with built-in filtering. Parent views pass the items array, display field, optional filter field, and optional row mappings.

## Features

- ✅ React Bootstrap Typeahead control with autocomplete
- ✅ Configurable item list from parent view
- ✅ Basic filtering by displayField or custom filterField
- ✅ Optional row field mappings for multi-field updates
- ✅ Clear button to reset selection
- ✅ Keyboard navigation (Arrow keys, Enter, Escape)
- ✅ Inline rendering within grid cells

## Quick Start

### Column Type Definition

```typescript
interface EditableGridComboboxColumn<TRow extends object, TOption extends PopupOptionRecord = PopupOptionRecord>
  extends EditableGridBaseColumn<TRow> {
  kind: 'combobox';
  onValueChange: (row: TRow, nextValue: string, rowIndex: number) => TRow;
  onCellKeyDown?: EditableGridCellKeyDownHandler<TRow>;
  options: TOption[];                          // Items array from parent
  optionIdKey: string;                         // Unique identifier field key
  displayField: string;                        // Field to display in dropdown
  filterField?: string;                        // Field to filter by (defaults to displayField)
  rowMappings?: readonly ComboboxRowMapping[]; // Optional: map multiple fields
}
```

## Usage Example

### Basic Combobox (Single Field Update)

```typescript
interface Product {
  id: string;
  name: string;
  sku: string;
}

const productList: Product[] = [
  { id: '1', name: 'Wireless Mouse', sku: 'MOUSE-001' },
  { id: '2', name: 'Keyboard', sku: 'KB-001' },
];

const productComboboxColumn: EditableGridColumn<SalesOrderItem> = {
  kind: 'combobox',
  key: 'productName',
  header: 'Product',
  width: '200px',
  placeholder: 'Select a product',
  getValue: (row) => row.description,
  onValueChange: (row, nextValue) => ({
    ...row,
    description: nextValue,
  }),
  options: productList,
  optionIdKey: 'id',
  displayField: 'name',
  filterField: 'name', // Optional: filter by name field
};
```

### Advanced Combobox (Multi-Field Update with Mappings)

```typescript
interface ProductOption {
  id: string;
  name: string;
  sku: string;
  unitPrice: number;
}

const productsWithPrice: ProductOption[] = [
  { id: '1', name: 'Wireless Mouse', sku: 'MOUSE-001', unitPrice: 22.5 },
  { id: '2', name: 'Keyboard', sku: 'KB-001', unitPrice: 89.99 },
];

const advancedProductCombobox: EditableGridColumn<SalesOrderItem> = {
  kind: 'combobox',
  key: 'productName',
  header: 'Product',
  width: '200px',
  placeholder: 'Search product...',
  getValue: (row) => row.description,
  onValueChange: (row, nextValue) => ({
    ...row,
    description: nextValue,
  }),
  options: productsWithPrice,
  optionIdKey: 'id',
  displayField: 'name',
  filterField: 'name',
  // When selection is made, map these fields from option to row
  rowMappings: [
    { rowField: 'description', optionField: 'name' },
    { rowField: 'sku', optionField: 'sku' },
    { rowField: 'unitPrice', optionField: 'unitPrice' },
  ],
};
```

## Configuration Reference

### Required Props

| Prop | Type | Description |
|------|------|-------------|
| `kind` | `'combobox'` | Column type identifier |
| `key` | `string` | Unique column key |
| `header` | `string` | Column header text |
| `getValue` | `function` | Extract display value from row |
| `onValueChange` | `function` | Update row when value changes |
| `options` | `TOption[]` | Array of items to display in dropdown |
| `optionIdKey` | `string` | Field name used as unique identifier in options |
| `displayField` | `string` | Field name to display in dropdown list |

### Optional Props

| Prop | Type | Description |
|------|------|-------------|
| `width` | `string` | CSS width value (e.g., `'200px'`) |
| `placeholder` | `string` | Placeholder text in input |
| `align` | `'left'\|'center'\|'right'` | Text alignment |
| `filterField` | `string` | Field to filter by (defaults to `displayField`) |
| `rowMappings` | `ComboboxRowMapping[]` | Map multiple option fields to row fields |
| `onCellKeyDown` | `function` | Custom keyboard handler |

## Filtering

### Auto Filtering

Typeahead automatically filters options based on user input:

```typescript
// User types "wireless" → filters options where displayField includes "wireless"
options: [
  { id: '1', name: 'Wireless Mouse', sku: 'MOUSE-001' },
  { id: '2', name: 'Wired Mouse', sku: 'MOUSE-002' },
  { id: '3', name: 'Keyboard', sku: 'KB-001' },
]
// Result: Shows "Wireless Mouse" and "Wired Mouse"
```

### Custom Filter Field

Use a different field for filtering:

```typescript
{
  displayField: 'name',      // Shows "Wireless Mouse"
  filterField: 'sku',        // But filters by SKU
  // User types "MOUSE" → shows products with "MOUSE" in SKU
}
```

## Row Mappings

When a user selects an item, update multiple fields in the row:

```typescript
rowMappings: [
  { rowField: 'description', optionField: 'name' },        // description ← name
  { rowField: 'sku', optionField: 'sku' },                 // sku ← sku
  { rowField: 'unitPrice', optionField: 'unitPrice' },     // unitPrice ← unitPrice
]
```

**Without rowMappings**: Only the column's field is updated (via `onValueChange`).
**With rowMappings**: Multiple fields in the row are updated automatically.

## Real-World Example: Product Selection

```typescript
// Parent component
export function OrderPanel() {
  const [draft, setDraft] = useState<SalesOrderDraft>(...);

  // Fetch or define available products
  const availableProducts = [
    { barcode: '890123450001', name: 'Wireless Mouse', unitPrice: 22.5 },
    { barcode: '890123450002', name: 'USB-C Charger', unitPrice: 39.0 },
    { barcode: '890123450003', name: 'HDMI Cable', unitPrice: 12.99 },
  ];

  // Define combobox column
  const productColumn: EditableGridColumn<SalesOrderItem> = {
    kind: 'combobox',
    key: 'description',
    header: 'Product',
    width: '280px',
    placeholder: 'Search products...',
    getValue: (row) => row.description,
    onValueChange: (row, nextValue) => ({
      ...row,
      description: nextValue,
    }),
    options: availableProducts,
    optionIdKey: 'barcode',
    displayField: 'name',
    filterField: 'name',
    rowMappings: [
      { rowField: 'description', optionField: 'name' },
      { rowField: 'sku', optionField: 'barcode' },
      { rowField: 'unitPrice', optionField: 'unitPrice' },
    ],
  };

  return (
    <EditableGridTable
      columns={[productColumn, ...otherColumns]}
      rows={draft.items}
      onRowsChange={(items) => setDraft({ ...draft, items })}
    />
  );
}
```

## Keyboard Interaction

| Key | Action |
|-----|--------|
| `↓` | Next option |
| `↑` | Previous option |
| `Enter` | Select highlighted option |
| `Escape` | Close dropdown |
| `Tab` | Move to next cell |
| `Shift+Tab` | Move to previous cell |

## Styling

The combobox cell uses the grid's standard `cellInput` styling. The Typeahead dropdown styling comes from React Bootstrap Typeahead CSS which is automatically imported.

### Custom Styling

To customize appearance, modify styles in `EditableGridTable.module.css`:

```css
.cellInput {
  /* Existing styles */
}

/* Typeahead dropdown inherits from react-bootstrap-typeahead CSS */
```

## Event Handling

### Selection Change

When a user selects an item:

1. If `rowMappings` are defined → all mapped fields are updated
2. If no `rowMappings` → only the column key field is updated via `onValueChange`
3. Focus moves to the next column (right)

### Clear Selection

Click the clear button (×) to reset the field:

```typescript
// Input becomes empty
// Row is NOT updated (clear is only visual)
```

## Type Safety

```typescript
// Ensure your options match the expected structure
interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
}

const combobox: EditableGridColumn<SalesOrderItem> = {
  kind: 'combobox',
  options: productArray as Product[],
  displayField: 'name', // ✓ 'name' exists on Product
  optionIdKey: 'id',    // ✓ 'id' exists on Product
  // optionIdKey: 'invalid' ✗ TypeScript error
};
```

## Performance Considerations

- **Option filtering** happens in real-time as user types
- **For large datasets** (100+ items), consider:
  - Implementing server-side filtering
  - Lazy loading options
  - Debouncing input changes

```typescript
// Example: Filter on server
const fetchOptions = async (query: string) => {
  const response = await fetch(`/api/products?search=${query}`);
  return response.json();
};
```

## Browser & Mobile Support

- Desktop: Full keyboard and mouse support
- Mobile: `inputMode="text"` is set for optimal mobile keyboard
- Touch: Typeahead dropdown works with touch selection

## Comparison with Other Column Types

| Feature | Popup | Combobox | Text | Number |
|---------|-------|----------|------|--------|
| Searchable | ✓ | ✓ | ✗ | ✗ |
| Dropdown UI | Modal | Inline | ✗ | ✗ |
| Keyboard Nav | ✓ | ✓ | Limited | Limited |
| Multi-field mapping | ✓ | ✓ | ✗ | ✗ |
| Character filtering | ✗ | ✗ | ✗ | ✓ |
| Space trigger | ✓ | ✗ | ✗ | ✗ |

## Common Patterns

### Pattern 1: Category Selection

```typescript
const categories = [
  { id: 'cat1', label: 'Electronics' },
  { id: 'cat2', label: 'Accessories' },
];

const categoryCombobox: EditableGridColumn<Item> = {
  kind: 'combobox',
  key: 'category',
  header: 'Category',
  options: categories,
  optionIdKey: 'id',
  displayField: 'label',
  getValue: (row) => row.category,
  onValueChange: (row, val) => ({ ...row, category: val }),
};
```

### Pattern 2: Dynamic Options

```typescript
// Options change based on user input or state
const getDynamicOptions = () => {
  return userSelectedFilter === 'active'
    ? activeProducts
    : allProducts;
};

const column = {
  kind: 'combobox',
  options: getDynamicOptions(), // ← Re-evaluates on each render
  // ...
};
```

### Pattern 3: Chained Selections

```typescript
// First combobox selects category
// Second combobox shows products in that category

const categoryCombobox = { /* ... */ };
const productCombobox: EditableGridColumn<Item> = {
  kind: 'combobox',
  options: products.filter(p => p.categoryId === row.categoryId),
  // Only show products from selected category
};
```

## Troubleshooting

### Options not filtering

Ensure `filterField` or `displayField` exists on your option objects:

```typescript
// ✓ Correct
options: [{ id: '1', name: 'Product A' }]
displayField: 'name'

// ✗ Wrong
displayField: 'title' // Field doesn't exist
```

### Selection not updating row

Check if `rowMappings` is correctly configured:

```typescript
// ✓ Both fields exist
rowMappings: [
  { rowField: 'description', optionField: 'name' }
]

// ✗ Wrong field names
rowMappings: [
  { rowField: 'invalidField', optionField: 'name' }
]
```

### Performance sluggish with large lists

Consider lazy loading or pagination:

```typescript
const [options, setOptions] = useState<Product[]>([]);
const [query, setQuery] = useState('');

useEffect(() => {
  // Fetch products based on query
  fetchProducts(query).then(setOptions);
}, [query]);

// Pass options to combobox
```

