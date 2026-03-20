import { useMemo, useState } from 'react';
import { productCatalog, brandCatalog } from '../data/catalog';
import type { Customer, OrderStatus, SalesOrderDraft, SalesOrderItem } from '../types';
import { EditableGridTable, type EditableGridColumn } from './table/EditableGridTable';
import styles from './SalesOrderPanel.module.css';

interface SalesOrderPanelProps {
  customers: Customer[];
  draft: SalesOrderDraft;
  onDraftChange: (draft: SalesOrderDraft) => void;
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

const isItemEmpty = (item: SalesOrderItem) => {
  return (
    item.sku.trim() === '' &&
    item.description.trim() === '' &&
    item.brand.trim() === '' &&
    item.quantity <= 1 &&
    item.unitPrice === 0 &&
    item.discount === 0
  );
};

export const SalesOrderPanel = ({ customers, draft, onDraftChange }: SalesOrderPanelProps) => {
  const [pickerTriggerColumn, setPickerTriggerColumn] = useState<PickerTriggerColumnKey>('description');

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

    // Brand column - always combobox
    const brandComboboxColumn: EditableGridColumn<SalesOrderItem> = {
      kind: 'combobox',
      key: 'brand',
      header: 'Brand',
      width: '150px',
      placeholder: 'Select brand...',
      getValue: (row) => row.brand,
      onValueChange: (row, nextValue) => ({ ...row, brand: nextValue }),
      options: brandCatalog,
      optionIdKey: 'id',
      displayField: 'name',
      filterField: 'name',
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
                // Search catalog by barcode (SKU)
                const matchedProduct = productCatalog.find(
                  (product) => product.barcode.toLowerCase() === context.row.sku.toLowerCase(),
                );

                if (matchedProduct) {
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

                  const nextRows = [...populatedRows, createEmptyItem()];
                  updateItems(nextRows);

                  return {
                    type: 'focusAfterChange',
                    rowIndex: nextRows.length - 1,
                    columnIndex: 0,
                  };
                }

                const attemptedBarcode = context.row.sku.trim();
                return {
                  type: 'showMessage',
                  title: 'Barcode not found',
                  message: attemptedBarcode
                    ? `Item not found for barcode: ${attemptedBarcode}`
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
      brandComboboxColumn,
      quantityColumn,
      unitPriceColumn,
      discountColumn,
      lineTotalColumn,
    ];
  }, [pickerTriggerColumn]);

  const handleHeaderChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    onDraftChange({
      ...draft,
      [name]: value,
    });
  };

  const subtotal = draft.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const discountTotal = draft.items.reduce((sum, item) => sum + item.discount, 0);
  const total = Math.max(subtotal - discountTotal, 0);
  const selectedCustomer = customers.find((customer) => customer.id === draft.customerId);

  return (
    <section className="panel panel--stretch">
      <div className="panel__header">
        <div>
          <p className="eyebrow">Sales order</p>
          <h2>Create and refine orders</h2>
        </div>
        <span className="pill">No backend · saved in your browser</span>
      </div>

      <div className={styles.orderShell}>
        <div className="order-main">
          <div className="form-grid form-grid--three">
            <label className="field">
              <span>Order number</span>
              <input name="orderNumber" value={draft.orderNumber} onChange={handleHeaderChange} />
            </label>
            <label className="field">
              <span>Order date</span>
              <input name="orderDate" type="date" value={draft.orderDate} onChange={handleHeaderChange} />
            </label>
            <label className="field">
              <span>Delivery date</span>
              <input name="deliveryDate" type="date" value={draft.deliveryDate} onChange={handleHeaderChange} />
            </label>
            <label className="field field--full">
              <span>Customer</span>
              <select name="customerId" value={draft.customerId} onChange={handleHeaderChange}>
                <option value="">Choose a customer</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.company} · {customer.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Status</span>
              <select name="status" value={draft.status} onChange={handleHeaderChange}>
                {(['Draft', 'Pending Approval', 'Ready to Ship'] as OrderStatus[]).map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>
            <label className="field field--full">
              <span>Order notes</span>
              <textarea name="notes" rows={4} value={draft.notes} onChange={handleHeaderChange} />
            </label>
          </div>

          <div className={styles.lineItems}>
            <div className="line-items__header">
              <div>
                <h3>Items</h3>
                <p>Add, adjust, and review each line before checkout.</p>
              </div>
              <button className="button button--secondary" type="button" onClick={addItem}>
                Add item
              </button>
            </div>

            <p className={styles.tableHint}>
              Enter moves to next cell. Press Space on the selected trigger column to open the item picker.
            </p>
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
                createRow={() => createEmptyItem()}
                isRowEmpty={isItemEmpty}
                rowKey={(row) => row.id}
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
          <div className="summary-card">
            <p className="eyebrow">Customer snapshot</p>
            {selectedCustomer ? (
              <>
                <h3>{selectedCustomer.company}</h3>
                <p>{selectedCustomer.name}</p>
                <p>{selectedCustomer.email}</p>
                <p>{selectedCustomer.phone}</p>
                <p>{selectedCustomer.address}</p>
              </>
            ) : (
              <p>Select a customer to attach shipping and contact details.</p>
            )}
          </div>

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

