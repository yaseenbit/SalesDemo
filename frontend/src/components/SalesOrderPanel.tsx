import { useMemo, useState } from 'react';
import { productCatalog, brandCatalog } from '../data/catalog';
import type { SalesOrderDraft, SalesOrderItem } from '../types';
import {
  EditableGridTable,
  type EditableGridCellKeyDownHandler,
  type EditableGridColumn,
} from './table/EditableGridTable';
import styles from './SalesOrderPanel.module.css';

interface SalesOrderPanelProps {
  draft: SalesOrderDraft;
  onDraftChange: (draft: SalesOrderDraft) => void;
  itemsAdded?: () => void;
  gridFocusRequestToken?: number;
}

type PickerTriggerColumnKey =
  | 'sku'
  | 'description'
  | 'quantity'
  | 'unitPrice'
  | 'discount'
  | 'lineTotal';

const pickerTriggerColumnOptions: Array<{ key: PickerTriggerColumnKey; label: string }> = [
  { key: 'description', label: 'Description' },
  { key: 'sku', label: 'SKU' },
  { key: 'quantity', label: 'Quantity' },
  { key: 'unitPrice', label: 'Unit Price' },
  { key: 'discount', label: 'Discount' },
  { key: 'lineTotal', label: 'Line Total' },
];

const popupConfig = {
  title: 'Select item',
  triggerKey: 'space' as const,
  filterPlaceholder: 'Type barcode or item name',
  options: productCatalog,
  optionIdKey: 'barcode' as const,
  filterKeys: ['barcode', 'name'] as const,
  displayFields: [
    { key: 'name' as const, label: 'Name' },
    { key: 'barcode' as const, label: 'Barcode' },
    { key: 'unitPrice' as const, label: 'Unit Price' },
  ],
  rowMappings: [
    { rowField: 'sku' as const, optionField: 'barcode' as const },
    { rowField: 'description' as const, optionField: 'name' as const },
    { rowField: 'unitPrice' as const, optionField: 'unitPrice' as const },
  ],
  appendRowAfterSelect: true,
  focusColumnKeyAfterSelect: 'description',
  emptyMessage: 'Try another search value.',
};

const brandPopupConfig = {
  title: 'Select brand',
  triggerKey: 'focus' as const,
  shouldOpenOnFocus: (row: SalesOrderItem) => !isItemEmpty(row) && row.brand.trim() === '',
  shouldOpenOnSpace: (row: SalesOrderItem) => row.brand.trim() !== '',
  filterPlaceholder: 'Type brand name',
  options: brandCatalog,
  optionIdKey: 'id' as const,
  filterKeys: ['name'] as const,
  displayFields: [{ key: 'name' as const, label: 'Brand' }],
  rowMappings: [{ rowField: 'brand' as const, optionField: 'name' as const }],
  appendRowAfterSelect: false,
  emptyMessage: 'Try another brand name.',
};

const createEmptyItem = (): SalesOrderItem => ({
  id: crypto.randomUUID(),
  sku: '',
  description: '',
  brand: '',
  quantity: 1,
  unitPrice: 0,
  discount: 0,
});

const clampNumber = (value: number, min = 0) => {
  if (Number.isNaN(value)) {
    return min;
  }

  return Math.max(min, value);
};

const isItemEmpty = (item: SalesOrderItem | undefined) => {
  if (!item) {
    return true;
  }
  return (
    (item.sku?.trim?.() ?? '').trim() === '' &&
    (item.description?.trim?.() ?? '').trim() === '' &&
    (item.brand?.trim?.() ?? '').trim() === '' &&
    (!item.quantity || item.quantity <= 1) &&
    (!item.unitPrice || item.unitPrice === 0) &&
    (!item.discount || item.discount === 0)
  );
};

export const SalesOrderPanel = ({ draft, onDraftChange, itemsAdded, gridFocusRequestToken }: SalesOrderPanelProps) => {
  const [pickerTriggerColumn, setPickerTriggerColumn] = useState<PickerTriggerColumnKey>('description');

  const isDeleteRowShortcut = (event: React.KeyboardEvent<HTMLInputElement>) => {
    return (
      (event.metaKey && event.key === 'Backspace') ||
      (event.ctrlKey && event.shiftKey && (event.key === 'Backspace' || event.key === 'Delete'))
    );
  };

  const updateItems = (items: SalesOrderItem[]) => {
    onDraftChange({
      ...draft,
      items,
    });
  };

  const addItem = () => {
    updateItems([...draft.items, createEmptyItem()]);
  };

  const removeItem = (itemId: string) => {
    updateItems(draft.items.filter((item) => item.id !== itemId));
  };

  const handleGridCellKeyDown: EditableGridCellKeyDownHandler<SalesOrderItem> = (context) => {
    if (!isDeleteRowShortcut(context.event)) {
      return undefined;
    }

    if (isItemEmpty(context.row)) {
      return { type: 'stay' };
    }

    const nextRows =
      context.rows.length === 1
        ? [createEmptyItem()]
        : context.rows.filter((_, currentIndex) => currentIndex !== context.rowIndex);

    updateItems(nextRows);

    return {
      type: 'focusAfterChange' as const,
      rowIndex: context.rows.length === 1 ? 0 : Math.min(context.rowIndex, nextRows.length - 1),
      columnIndex: 0,
    };
  };

  const columns = useMemo<EditableGridColumn<SalesOrderItem>[]>(() => {
    // Description column - popup or text only (no combobox)
    const descriptionColumn: EditableGridColumn<SalesOrderItem> =
      pickerTriggerColumn === 'description'
        ? {
            kind: 'popup',
            key: 'description',
            header: 'Description',
            width: '200px',
            placeholder: 'Item description',
            getValue: (row) => row.description,
            onValueChange: (row, nextValue) => ({ ...row, description: nextValue }),
            popup: popupConfig,
          }
        : {
            kind: 'text',
            key: 'description',
            header: 'Description',
            width: '200px',
            placeholder: 'Item description',
            getValue: (row) => row.description,
            onValueChange: (row, nextValue) => ({ ...row, description: nextValue }),
          };

    // Brand column - popup selector
    const brandSearchColumn: EditableGridColumn<SalesOrderItem> = {
      kind: 'popup',
      key: 'brand',
      header: 'Brand',
      width: '150px',
      placeholder: 'Search brand...',
      getValue: (row) => row.brand,
      onValueChange: (row, nextValue) => ({ ...row, brand: nextValue }),
      popup: brandPopupConfig,
    };

    const skuColumn: EditableGridColumn<SalesOrderItem> =
      pickerTriggerColumn === 'sku'
        ? {
            kind: 'popup',
            key: 'sku',
            header: 'SKU',
            width: '140px',
            placeholder: 'SKU-0001',
            getValue: (row) => row.sku,
            onValueChange: (row, nextValue) => ({ ...row, sku: nextValue.trim().toUpperCase() }),
            popup: popupConfig,
          }
          : {
              kind: 'barcode',
              key: 'sku',
              header: 'SKU',
              width: '140px',
              placeholder: 'SKU-0001',
              getValue: (row) => row.sku,
              onValueChange: (row, nextValue) => ({ ...row, sku: nextValue.trim().toUpperCase() }),
              allowedCharacters: /[\d+\-]/,
              onCellKeyDown: (context) => {
                  if (context.event.key === 'Enter') {
                      const rawInput = context.row.sku.trim();

                      // ── Quantity increment shortcut ──────────────────────────────
                      // Typing "+N" in the SKU field increments the previous row's
                      // quantity by N, then clears the field and stays on this row.
                      const incrementMatch = rawInput.match(/^\+(\d+)$/);
                      if (incrementMatch) {
                          const incrementBy = parseInt(incrementMatch[1], 10);
                          const prevRowIndex = context.rowIndex - 1;
                          const prevRow = context.rows[prevRowIndex];

                          if (prevRow && !isItemEmpty(prevRow)) {
                              const updatedRows = context.rows.map((row, idx) => {
                                  if (idx === prevRowIndex) {
                                      return { ...row, quantity: row.quantity + incrementBy };
                                  }
                                  if (idx === context.rowIndex) {
                                      return { ...row, sku: '' }; // clear the "+N" text
                                  }
                                  return row;
                              });
                              updateItems(updatedRows);
                              return {
                                  type: 'focusAfterChange' as const,
                                  rowIndex: context.rowIndex,
                                  columnIndex: 0,
                              };
                          }
                      }
                      // ─────────────────────────────────────────────────────────────

                      if (
                          rawInput === '' &&
                          context.rowIndex === context.rows.length - 1 &&
                          context.columnIndex === 0
                      ) {
                          itemsAdded?.();
                          return { type: 'stay' };
                      }

                      // Search catalog by barcode (SKU)
                      const matchedProduct = productCatalog.find(
                          (product) => product.barcode.toLowerCase() === context.row.sku.toLowerCase(),
                      );

                      if (matchedProduct) {
                          // ── Duplicate detection ───────────────────────────────────────
                          // If the same barcode is already present in another row,
                          // increment that row's quantity instead of adding a duplicate.
                          const duplicateRowIndex = context.rows.findIndex(
                              (row, idx) =>
                                  idx !== context.rowIndex &&
                                  row.sku.toLowerCase() === matchedProduct.barcode.toLowerCase(),
                          );

                          if (duplicateRowIndex >= 0) {
                              const updatedRows = context.rows.map((row, idx) => {
                                  if (idx === duplicateRowIndex) {
                                      return { ...row, quantity: row.quantity + 1 };
                                  }
                                  if (idx === context.rowIndex) {
                                      return { ...row, sku: '' }; // clear the scanned barcode
                                  }
                                  return row;
                              });
                              updateItems(updatedRows);
                              return {
                                  type: 'focusAfterChange' as const,
                                  rowIndex: context.rowIndex,
                                  columnIndex: 0,
                              };
                          }
                          // ─────────────────────────────────────────────────────────────

                          if (matchedProduct.name === context.row.description) {
                              return {
                                  type: 'focus',
                                  rowIndex: context.rows.length - 1,
                                  columnIndex: 0,
                              };
                          }

                          // Update current row with product details
                          const updatedRow: SalesOrderItem = {
                              ...context.row,
                              sku: matchedProduct.barcode,
                              description: matchedProduct.name,
                              unitPrice: matchedProduct.unitPrice,
                          };

                          const populatedRows = context.rows.map((row, idx) =>
                              idx === context.rowIndex ? updatedRow : row,
                          );

                          const nextRows = [...populatedRows];
                          if (context.rowIndex === context.rows.length - 1) {
                              nextRows.push(createEmptyItem());
                              updateItems(nextRows);
                          } else {
                              updateItems(nextRows);
                          }

                          return {
                              type: 'focusAfterChange',
                              rowIndex: nextRows.length - 1,
                              columnIndex: 0,
                          };
                      }

                      return {
                          type: 'showMessage',
                          title: 'Barcode not found',
                          message: rawInput
                              ? `Item not found for barcode: ${rawInput}`
                              : 'Please enter a barcode before searching.',
                          focusRowIndex: context.rowIndex,
                          focusColumnIndex: context.columnIndex,
                      };
                  }
              },
          };

    // ...existing code...

    const quantityColumn: EditableGridColumn<SalesOrderItem> =
      pickerTriggerColumn === 'quantity'
        ? {
            kind: 'popup',
            key: 'quantity',
            header: 'Qty',
            width: '80px',
            align: 'right',
            inputType: 'number',
            getValue: (row) => row.quantity,
            onValueChange: (row, nextValue) => ({ ...row, quantity: clampNumber(Number(nextValue), 1) }),
            popup: popupConfig,
          }
        : {
            kind: 'number',
            key: 'quantity',
            header: 'Qty',
            width: '80px',
            align: 'right',
            inputType: 'number',
            getValue: (row) => row.quantity,
            onValueChange: (row, nextValue) => ({ ...row, quantity: clampNumber(Number(nextValue), 1) }),
          };

    const unitPriceColumn: EditableGridColumn<SalesOrderItem> =
      pickerTriggerColumn === 'unitPrice'
        ? {
            kind: 'popup',
            key: 'unitPrice',
            header: 'Unit Price',
            width: '120px',
            align: 'right',
            inputType: 'number',
            getValue: (row) => row.unitPrice,
            onValueChange: (row, nextValue) => ({ ...row, unitPrice: clampNumber(Number(nextValue), 0) }),
            popup: popupConfig,
          }
        : {
            kind: 'number',
            key: 'unitPrice',
            header: 'Unit Price',
            width: '120px',
            align: 'right',
            inputType: 'number',
            getValue: (row) => row.unitPrice,
            onValueChange: (row, nextValue) => ({ ...row, unitPrice: clampNumber(Number(nextValue), 0) }),
          };

    const discountColumn: EditableGridColumn<SalesOrderItem> =
      pickerTriggerColumn === 'discount'
        ? {
            kind: 'popup',
            key: 'discount',
            header: 'Discount',
            width: '120px',
            align: 'right',
            inputType: 'number',
            getValue: (row) => row.discount,
            onValueChange: (row, nextValue) => ({ ...row, discount: clampNumber(Number(nextValue), 0) }),
            popup: popupConfig,
          }
        : {
            kind: 'number',
            key: 'discount',
            header: 'Discount',
            width: '120px',
            align: 'right',
            inputType: 'number',
            getValue: (row) => row.discount,
            onValueChange: (row, nextValue) => ({ ...row, discount: clampNumber(Number(nextValue), 0) }),
          };

    const lineTotalColumn: EditableGridColumn<SalesOrderItem> =
      pickerTriggerColumn === 'lineTotal'
        ? {
            kind: 'popup',
            key: 'lineTotal',
            header: 'Line Total',
            width: '130px',
            align: 'right',
            editable: false,
            getValue: (row) => Math.max(row.quantity * row.unitPrice - row.discount, 0).toFixed(2),
            popup: popupConfig,
          }
        : {
            kind: 'display',
            key: 'lineTotal',
            header: 'Line Total',
            width: '130px',
            align: 'right',
            getValue: (row) => Math.max(row.quantity * row.unitPrice - row.discount, 0).toFixed(2),
          };

    return [
      skuColumn,
      descriptionColumn,
      brandSearchColumn,
      quantityColumn,
      unitPriceColumn,
      discountColumn,
      lineTotalColumn,
    ];
  }, [itemsAdded, pickerTriggerColumn]);

  const subtotal = draft.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const discountTotal = draft.items.reduce((sum, item) => sum + item.discount, 0);
  const total = Math.max(subtotal - discountTotal, 0);

  return (
    <section className="panel panel--stretch">
      <div className="panel__header">
        <div>
          <p className="eyebrow">Sales order</p>
        </div>
      </div>

      <div className={styles.orderShell}>
        <div className="order-main">

          <div className={styles.lineItems}>
            <div className="line-items__header">
            </div>
            <div className={styles.controlsRow}>
              <label className="field">
                <span>Popup trigger column</span>
                <select
                  value={pickerTriggerColumn}
                  onChange={(event) => setPickerTriggerColumn(event.target.value as PickerTriggerColumnKey)}
                >
                  {pickerTriggerColumnOptions.map((option) => (
                    <option key={option.key} value={option.key}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className={styles.lineItemTable}>
              <EditableGridTable
                ariaLabel="Sales order line items"
                rows={draft.items}
                columns={columns}
                onRowsChange={updateItems}
                onCellKeyDown={handleGridCellKeyDown}
                createRow={() => createEmptyItem()}
                isRowEmpty={isItemEmpty}
                rowKey={(row) => row.id}
                focusRequestToken={gridFocusRequestToken}
                focusRequestRowIndex={0}
                focusRequestColumnIndex={0}
              />
            </div>

            <div className={styles.rowActions}>
              {draft.items.map((item) => (
                <button key={item.id} className="text-button" type="button" onClick={() => removeItem(item.id)}>
                  Remove {item.sku || item.description || 'row'}
                </button>
              ))}
            </div>
          </div>
        </div>

        <aside className="order-summary">

          <div className="summary-card summary-card--totals">
            <p className="eyebrow">Order totals</p>
            <div className="metric-row">
              <span>Items</span>
              <strong>{draft.items.length}</strong>
            </div>
            <div className="metric-row">
              <span>Subtotal</span>
              <strong>${subtotal.toFixed(2)}</strong>
            </div>
            <div className="metric-row">
              <span>Discounts</span>
              <strong>-${discountTotal.toFixed(2)}</strong>
            </div>
            <div className="metric-row metric-row--total">
              <span>Total</span>
              <strong>${total.toFixed(2)}</strong>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
};

