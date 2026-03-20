# Barcode Column - Usage Guide

## Quick Start

### For Developers - Using Barcode Column

```typescript
import { EditableGridColumn } from './table/EditableGridTable';

// Define your barcode column
const barcodeColumn: EditableGridColumn<YourRowType> = {
  kind: 'barcode',
  key: 'barcode',
  header: 'Product Barcode',
  width: '150px',
  placeholder: 'Scan or enter barcode',
  
  // Get the current value
  getValue: (row) => row.barcode,
  
  // Update the row when value changes
  onValueChange: (row, nextValue) => ({
    ...row,
    barcode: nextValue.trim().toUpperCase()
  }),
  
  // Optional: Filter which characters are allowed
  allowedCharacters: /[\d+\-]/,  // Only digits, +, and -
  
  // Optional: Handle special keys like Enter
  onCellKeyDown: (context) => {
    if (context.event.key === 'Enter') {
      // Your search logic here
      const result = searchCatalog(context.row.barcode);
      if (result) {
        // Update the row with search results
        const updatedRow = { ...context.row, ...result };
        const nextRows = context.rows.map((r, i) =>
          i === context.rowIndex ? updatedRow : r
        );
        // Update rows in parent component
        // ... your update logic
        
        // Move to next column after successful search
        return { type: 'move', rowDelta: 0, colDelta: 1 };
      }
    }
  }
};
```

### SKU Column Example (Current Implementation)

The SKU column in SalesOrderPanel demonstrates a complete example:

```typescript
{
  kind: 'barcode',
  key: 'sku',
  header: 'SKU',
  width: '140px',
  placeholder: 'SKU-0001',
  getValue: (row) => row.sku,
  onValueChange: (row, nextValue) => ({ 
    ...row, 
    sku: nextValue.trim().toUpperCase() 
  }),
  
  // Only allow digits, plus, and minus
  allowedCharacters: /[\d+\-]/,
  
  // Search catalog on Enter
  onCellKeyDown: (context) => {
    if (context.event.key === 'Enter') {
      const matchedProduct = productCatalog.find(
        (product) => product.barcode.toLowerCase() === context.row.sku.toLowerCase()
      );
      
      if (matchedProduct) {
        const updatedRow = {
          ...context.row,
          sku: matchedProduct.barcode,
          description: matchedProduct.name,
          unitPrice: matchedProduct.unitPrice,
        };
        
        const nextRows = context.rows.map((row, idx) =>
          idx === context.rowIndex ? updatedRow : row
        );
        
        updateItems(nextRows);
        return { type: 'move', rowDelta: 0, colDelta: 1 };
      }
      
      return { type: 'move', rowDelta: 0, colDelta: 1 };
    }
  },
}
```

## Character Filtering Options

### Common Patterns

```typescript
// Only digits
allowedCharacters: /[\d]/

// Digits with + and -
allowedCharacters: /[\d+\-]/

// Alphanumeric (letters and numbers)
allowedCharacters: /[a-zA-Z0-9]/

// All numbers and most common symbols
allowedCharacters: /[\d+\-*/.,]/

// Custom pattern for specific format
allowedCharacters: /[0-9A-F]/ // Hex digits only
```

## Keyboard Event Handling

The `onCellKeyDown` context provides full event information:

```typescript
type EditableGridCellContext<TRow> = {
  event: KeyboardEvent<HTMLInputElement>;  // The keyboard event
  row: TRow;                                // Current row data
  rowIndex: number;                         // Index in rows array
  columnIndex: number;                      // Index in columns array
  column: EditableGridColumn<TRow>;         // Current column definition
  rows: TRow[];                             // All rows
  columns: EditableGridColumn<TRow>[];      // All columns
};
```

### Return Values for Navigation

```typescript
// Stay in current cell
return { type: 'stay' };

// Move to next cell using default Enter behavior
return { type: 'next' };

// Move by offset (row delta, column delta)
return { type: 'move', rowDelta: 1, colDelta: 2 };  // Next row, 2 columns right

// Focus specific cell
return { type: 'focus', rowIndex: 5, columnIndex: 2 };

// No return or undefined = default behavior
```

## Popup Column vs Barcode Column

### When SKU is Popup Trigger Column
```
┌─────────────────────┐
│ SKU Column          │
├─────────────────────┤
│ [Read-only field]   │  ← Cannot type
│ Press Space → ✓     │  ← Space opens picker
│ Other keys → blocked│  ← No character input
└─────────────────────┘
```

### When SKU is NOT Popup Trigger Column
```
┌─────────────────────┐
│ SKU (Barcode)       │
├─────────────────────┤
│ [Editable field]    │  ← Can type
│ 0-9, +, - → ✓       │  ← Allowed characters
│ Other chars → ✗     │  ← Filtered out
│ Enter → Search      │  ← Barcode lookup
└─────────────────────┘
```

## User Experience

### Workflow Example

1. **Click SKU cell**
   ```
   SKU: [890123450001|]  ← Cursor active
   ```

2. **Type barcode (only digits, +, - allowed)**
   ```
   SKU: [890123450001|]
   User types: "8,9,0..." → Only digits accepted
   ```

3. **Press Enter to search**
   ```
   SKU: [890123450001]
   Description: [Wireless Mouse|]  ← Auto-filled, focus moves here
   Unit Price: [22.5]              ← Auto-filled
   ```

4. **Not found - just moves to next column**
   ```
   SKU: [INVALID123456]
   Description: [|]  ← Focus moves, no auto-fill
   ```

## Testing Character Filtering

### Valid Input for SKU Column
- `890123450001` ✓ Digits
- `+10` ✓ Plus sign with digits
- `-5` ✓ Minus sign
- `123+456-789` ✓ Mixed allowed characters

### Invalid Input (Will be filtered)
- `SKU890123` ✗ Letters removed
- `890-123-450#001` ✗ Hash removed
- `890 123` ✗ Spaces removed
- `$890.50` ✗ Dollar and period removed

## API Reference

### EditableGridBarcodeColumn Interface

```typescript
interface EditableGridBarcodeColumn<TRow extends object> {
  kind: 'barcode';                           // Required: identifies column type
  key: string;                               // Required: unique column identifier
  header: string;                            // Required: column header text
  width?: string;                            // Optional: CSS width value
  placeholder?: string;                      // Optional: input placeholder text
  align?: 'left' | 'center' | 'right';      // Optional: text alignment
  getValue: (row: TRow, rowIndex: number) => string | number;  // Required
  onValueChange: (row: TRow, nextValue: string, rowIndex: number) => TRow;  // Required
  onCellKeyDown?: (context: EditableGridCellContext<TRow>) => CellMoveAction | void;  // Optional
  allowedCharacters?: RegExp;                // Optional: character filter regex
}
```

## Accessibility

- ✅ Keyboard navigable
- ✅ Tab/Shift+Tab support
- ✅ Arrow key support
- ✅ ARIA labels from grid
- ✅ Input validation feedback
- ✅ Clear placeholder text

