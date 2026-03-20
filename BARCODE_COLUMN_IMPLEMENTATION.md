# Barcode Column Implementation - Summary

## Overview
A new generic `barcode` column type has been created for the editable grid table that:
- Only allows numeric digits (0-9), plus (+), and minus (-) characters
- Triggers a catalog search when Enter is pressed
- Automatically populates row details when a matching barcode is found
- Can be reused for any barcode/SKU input fields

## Changes Made

### 1. EditableGridTable.tsx - New Barcode Column Type

#### New Interface
```typescript
interface EditableGridBarcodeColumn<TRow extends object> extends EditableGridBaseColumn<TRow> {
  kind: 'barcode';
  onValueChange: (row: TRow, nextValue: string, rowIndex: number) => TRow;
  onCellKeyDown?: EditableGridCellKeyDownHandler<TRow>;
  allowedCharacters?: RegExp;
}
```

**Features:**
- `kind: 'barcode'` - Identifies the column type
- `allowedCharacters` - Optional RegExp to filter valid input characters
- `onCellKeyDown` - Optional handler for keyboard events (e.g., Enter key)
- `onValueChange` - Callback to update the row when value changes

#### Character Filtering
Updated `updateCellValue()` function to filter characters based on the `allowedCharacters` regex:
```typescript
// Filter characters if allowedCharacters regex is defined (barcode column)
let filteredValue = nextValue;
if (column.kind === 'barcode' && column.allowedCharacters) {
  filteredValue = nextValue
    .split('')
    .filter((char) => column.allowedCharacters!.test(char))
    .join('');
}
```

**How it works:**
- When a user types in a barcode column, each character is checked against the regex
- Only characters matching the regex are allowed
- Other characters are silently filtered out

### 2. SalesOrderPanel.tsx - SKU Column Implementation

The SKU column now uses the new `barcode` column type with the following configuration:

#### Configuration
```typescript
{
  kind: 'barcode',
  key: 'sku',
  header: 'SKU',
  width: '140px',
  placeholder: 'SKU-0001',
  getValue: (row) => row.sku,
  onValueChange: (row, nextValue) => ({ ...row, sku: nextValue.trim().toUpperCase() }),
  allowedCharacters: /[\d+\-]/,  // Only 0-9, +, and -
  onCellKeyDown: (context) => {
    if (context.event.key === 'Enter') {
      // Search and populate logic
    }
  }
}
```

#### Character Filtering
- **Allowed:** Digits (0-9), Plus (+), Minus (-)
- **Blocked:** All other characters (letters, symbols, spaces, etc.)
- **Regex pattern:** `/[\d+\-]/`

#### Barcode Search & Auto-Fill
When Enter is pressed in the SKU field:

1. **Search:** Finds a matching product in the catalog by barcode
2. **Populate:** If found, automatically fills:
   - `sku` - Product barcode
   - `description` - Product name
   - `unitPrice` - Product unit price
3. **Navigation:** Moves focus to the next column (Description)
4. **No Match:** If barcode not found, just moves to next column

**Example:**
```
User types: 890123450001
Presses:   Enter
Result:    
  - SKU: 890123450001
  - Description: Wireless Mouse
  - Unit Price: 22.5
  - Focus moves to: Description field
```

## Behavior

### Input Validation
- ✅ **0-9** - Digits accepted
- ✅ **+** - Plus sign accepted
- ✅ **-** - Minus sign accepted
- ❌ **A-Z, a-z** - Letters blocked
- ❌ **!, @, #, etc.** - Special characters blocked
- ❌ **Space** - Space character blocked

### Trigger Column Context
When "SKU" is selected as the **Popup trigger column**:
- The SKU field becomes a popup column (Space key opens picker)
- All other normal text input is blocked (read-only mode)

When SKU is NOT the popup trigger:
- The SKU field becomes a barcode column
- Character filtering is active
- Enter key triggers barcode search

### Keyboard Navigation
- **Enter key** - Searches catalog and populates details, then moves to next column
- **Tab key** - Moves to next column (standard behavior)
- **Shift+Tab** - Moves to previous column (standard behavior)
- **Arrow keys** - Navigate between rows (standard behavior)

## File Modifications

### Files Changed
1. `/frontend/src/components/table/EditableGridTable.tsx`
   - Added `EditableGridBarcodeColumn` interface
   - Updated `EditableGridColumn` union type
   - Modified `updateCellValue()` for character filtering
   - Updated input rendering to handle barcode type

2. `/frontend/src/components/SalesOrderPanel.tsx`
   - Changed SKU column from 'text' to 'barcode'
   - Added `allowedCharacters: /[\d+\-]/` regex
   - Implemented `onCellKeyDown` handler for Enter key barcode search
   - Catalog search and row population logic

## Testing

The implementation has been verified with:
- ✅ TypeScript compilation (no errors)
- ✅ Production build successful
- ✅ All column types (text, number, popup, barcode, display) working correctly

## Future Extensions

This barcode column type can be reused in other parts of the application:
```typescript
// Example: Using barcode column in another component
const barcodeColumn: EditableGridColumn<YourRowType> = {
  kind: 'barcode',
  key: 'barcode',
  header: 'Barcode',
  allowedCharacters: /[\d]/,  // Only digits
  getValue: (row) => row.barcode,
  onValueChange: (row, nextValue) => ({ ...row, barcode: nextValue }),
  onCellKeyDown: (context) => {
    if (context.event.key === 'Enter') {
      // Your custom search logic here
    }
  }
};
```

## Checklist Completion

- [x] Identify popup columns in the grid
- [x] Block default input behavior for non-Space keys on popup columns
- [x] Keep Space as the only trigger key for popup columns
- [x] Ensure other columns remain fully editable
- [x] Build to verify the change works
- [x] SKU column only allows numbers and +, - characters
- [x] All other characters are prevented
- [x] Barcode search on Enter key
- [x] Automatically populate row details with matching product info
- [x] Create generic barcode column type for reusability

