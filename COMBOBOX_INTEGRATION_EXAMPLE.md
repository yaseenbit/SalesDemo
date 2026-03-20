# Combobox Column Integration Example

## Using Combobox in SalesOrderPanel

Here's a practical example of how to add a combobox column for product selection in the SalesOrderPanel:

### Step 1: Add Combobox Column to Columns Array

```typescript
// In SalesOrderPanel.tsx component

const columns = useMemo<EditableGridColumn<SalesOrderItem>[]>(() => {
  // ... existing columns ...

  // Combobox column for product selection
  const productComboboxColumn: EditableGridColumn<SalesOrderItem> = {
    kind: 'combobox',
    key: 'product',
    header: 'Product',
    width: '220px',
    placeholder: 'Search product...',
    getValue: (row) => row.description,
    onValueChange: (row, nextValue) => ({
      ...row,
      description: nextValue,
    }),
    options: productCatalog,
    optionIdKey: 'barcode',
    displayField: 'name',
    filterField: 'name',
    rowMappings: [
      { rowField: 'sku', optionField: 'barcode' },
      { rowField: 'description', optionField: 'name' },
      { rowField: 'unitPrice', optionField: 'unitPrice' },
    ],
  };

  return [
    productComboboxColumn,
    // ... other columns ...
  ];
}, []);
```

### Step 2: Use in EditableGridTable

```typescript
<EditableGridTable
  ariaLabel="Sales order line items"
  rows={draft.items}
  columns={columns}
  onRowsChange={updateItems}
  createRow={() => createEmptyItem()}
  isRowEmpty={isItemEmpty}
  rowKey={(row) => row.id}
/>
```

## Complete Example: Product Column with Multi-Field Update

```typescript
import { useMemo, useState } from 'react';
import { productCatalog } from '../data/catalog';
import type { SalesOrderItem } from '../types';
import { EditableGridTable, type EditableGridColumn } from './table/EditableGridTable';

export function OrderItemsTable({ items, onItemsChange }: Props) {
  const columns = useMemo<EditableGridColumn<SalesOrderItem>[]>(() => {
    // Product selection column with multi-field mapping
    const productColumn: EditableGridColumn<SalesOrderItem> = {
      kind: 'combobox',
      key: 'product',
      header: 'Product',
      width: '240px',
      placeholder: 'Type to search products...',
      getValue: (row) => row.description || '',
      onValueChange: (row, nextValue) => ({
        ...row,
        description: nextValue,
      }),
      // Pass the catalog items from data
      options: productCatalog,
      optionIdKey: 'barcode',       // Unique ID for each option
      displayField: 'name',          // Show product name in dropdown
      filterField: 'name',           // Filter by product name
      // When user selects a product, update all these fields
      rowMappings: [
        { rowField: 'sku', optionField: 'barcode' },
        { rowField: 'description', optionField: 'name' },
        { rowField: 'unitPrice', optionField: 'unitPrice' },
      ],
    };

    // Quantity column
    const quantityColumn: EditableGridColumn<SalesOrderItem> = {
      kind: 'number',
      key: 'quantity',
      header: 'Qty',
      width: '80px',
      align: 'right',
      getValue: (row) => row.quantity,
      onValueChange: (row, nextValue) => ({
        ...row,
        quantity: Math.max(1, Number(nextValue) || 1),
      }),
    };

    // Unit price column
    const unitPriceColumn: EditableGridColumn<SalesOrderItem> = {
      kind: 'number',
      key: 'unitPrice',
      header: 'Unit Price',
      width: '120px',
      align: 'right',
      getValue: (row) => row.unitPrice,
      onValueChange: (row, nextValue) => ({
        ...row,
        unitPrice: Math.max(0, Number(nextValue) || 0),
      }),
    };

    return [productColumn, quantityColumn, unitPriceColumn];
  }, []);

  const createEmptyItem = (): SalesOrderItem => ({
    id: crypto.randomUUID(),
    sku: '',
    description: '',
    quantity: 1,
    unitPrice: 0,
    discount: 0,
  });

  return (
    <EditableGridTable
      ariaLabel="Order items"
      rows={items}
      columns={columns}
      onRowsChange={onItemsChange}
      createRow={() => createEmptyItem()}
      isRowEmpty={(item) =>
        !item.sku && !item.description && item.quantity === 1 && item.unitPrice === 0
      }
      rowKey={(item) => item.id}
    />
  );
}
```

## Behavior Flow

### User Interaction Sequence

1. **User focuses product combobox cell**
   - Cell becomes active
   - Typeahead dropdown ready for input

2. **User types "mous"**
   - Filters options: shows "Wireless Mouse" and "USB Mouse" (if they exist)
   - Real-time filtering as user types

3. **User selects "Wireless Mouse"**
   - Typeahead popup closes
   - Row is updated with:
     - `sku` = "890123450001" (from option.barcode)
     - `description` = "Wireless Mouse" (from option.name)
     - `unitPrice` = 22.5 (from option.unitPrice)
   - Focus moves to next column

4. **User presses Clear (×)**
   - Input clears
   - Row values remain (not cleared automatically)

## Data Structure

### Catalog Items

```typescript
// From data/catalog.ts
export interface CatalogItem {
  barcode: string;      // Unique ID
  name: string;         // Display name
  unitPrice: number;    // Price
}

export const productCatalog: CatalogItem[] = [
  { barcode: '890123450001', name: 'Wireless Mouse', unitPrice: 22.5 },
  { barcode: '890123450002', name: 'USB-C Charger 65W', unitPrice: 39.0 },
  { barcode: '890123450003', name: 'HDMI Cable 2m', unitPrice: 12.99 },
];
```

### Row Data

```typescript
// From types.ts
interface SalesOrderItem {
  id: string;           // Row ID
  sku: string;          // Product SKU (barcode)
  description: string;  // Product name
  quantity: number;     // Qty
  unitPrice: number;    // Price per unit
  discount: number;     // Discount amount
}
```

### Mapping Relationship

```
User selects "Wireless Mouse" from combobox
                    ↓
productCatalog item:
{
  barcode: '890123450001',
  name: 'Wireless Mouse',
  unitPrice: 22.5
}
                    ↓
Row field mappings applied:
sku ← barcode             → '890123450001'
description ← name         → 'Wireless Mouse'
unitPrice ← unitPrice      → 22.5
```

## Advanced Usage: Dynamic Options

```typescript
// Options can change based on state or props
const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

const columns = useMemo<EditableGridColumn<SalesOrderItem>[]>(() => {
  // Filter products based on selected category
  const filteredProducts = selectedCategory
    ? productCatalog.filter(p => p.category === selectedCategory)
    : productCatalog;

  return [
    {
      kind: 'combobox',
      options: filteredProducts, // ← Dynamic options
      // ... rest of config
    },
  ];
}, [selectedCategory]);
```

## Integration Checklist

- [x] Import `EditableGridTable` and `EditableGridColumn` types
- [x] Import `productCatalog` from `data/catalog`
- [x] Define combobox column with:
  - [ ] `kind: 'combobox'`
  - [ ] `options: productCatalog`
  - [ ] `optionIdKey: 'barcode'`
  - [ ] `displayField: 'name'`
  - [ ] `rowMappings` for multi-field update
- [x] Add to columns array
- [x] Pass to `EditableGridTable` as `columns` prop
- [x] Test selection flow and field updates

## Testing Scenarios

### Scenario 1: Basic Selection
- Type "wireless" in combobox
- Verify dropdown shows matching products
- Click on "Wireless Mouse"
- Verify all mapped fields update correctly

### Scenario 2: Clear Selection
- Click clear button (×)
- Verify input becomes empty
- Verify row fields don't get cleared

### Scenario 3: Keyboard Navigation
- Tab into combobox
- Press down arrow
- Verify option highlights
- Press Enter
- Verify selection applies

### Scenario 4: Multi-Field Update
- Select product
- Verify sku, description, and unitPrice all update
- Verify correct values from catalog

## Troubleshooting

### Products not showing in dropdown
- Check `options` array has items
- Verify `displayField` matches field name in catalog
- Check console for TypeScript errors

### Selection not updating row
- Verify `rowMappings` is defined
- Check field names exist in `SalesOrderItem` type
- Verify `optionField` names match catalog fields

### Styling issues
- Typeahead CSS should auto-import
- Check `react-bootstrap-typeahead/css/Typeahead.css` is loaded
- Inspect element to verify `.form-control` classes applied

