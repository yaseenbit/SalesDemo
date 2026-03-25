import { useMemo, useState } from 'react';
import { NumericTextBox } from '../components/NumericTextBox';
import { EditableGridTable, type EditableGridColumn } from '../components/table/EditableGridTable';
import { SearchableTable, type SearchableTableColumn } from '../components/SearchableTable';
import { productCatalog } from '../data/catalog';
import styles from './TableControlDemoPage.module.css';

interface DemoRow {
  id: string;
  sku: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

type TriggerColumnKey = 'sku' | 'description' | 'quantity' | 'unitPrice';

const triggerColumnOptions: Array<{ key: TriggerColumnKey; label: string }> = [
  { key: 'sku', label: 'SKU' },
  { key: 'description', label: 'Description' },
  { key: 'quantity', label: 'Quantity' },
  { key: 'unitPrice', label: 'Unit Price' },
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
  emptyMessage: 'Try another filter.',
};

const initialRows: DemoRow[] = [
  { id: crypto.randomUUID(), sku: 'SKU-1001', description: 'Office Chair', quantity: 2, unitPrice: 245 },
  { id: crypto.randomUUID(), sku: 'SKU-2040', description: 'Standing Desk Converter', quantity: 1, unitPrice: 329 },
  { id: crypto.randomUUID(), sku: 'SKU-3010', description: 'Wireless Keyboard', quantity: 3, unitPrice: 74 },
];

const clampPositiveInt = (value: string, fallback: number) => {
  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    return fallback;
  }
  return Math.max(0, Math.round(parsed));
};

const clampCurrency = (value: string, fallback: number) => {
  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    return fallback;
  }
  return Math.max(0, Number(parsed.toFixed(2)));
};

const isDemoRowEmpty = (row: DemoRow) => {
  return row.sku.trim() === '' && row.description.trim() === '' && row.quantity === 0 && row.unitPrice === 0;
};

export const TableControlDemoPage = () => {
  const [rows, setRows] = useState<DemoRow[]>(initialRows);
  const [triggerColumn, setTriggerColumn] = useState<TriggerColumnKey>('description');
  const [wholeNumberValue, setWholeNumberValue] = useState('1250');
  const [decimalValue, setDecimalValue] = useState('249.99');

  const largeProductCatalog = useMemo(() => {
    return Array.from({ length: 1000 }, (_, index) => {
      const source = productCatalog[index % productCatalog.length];
      const sequence = String(index + 1).padStart(4, '0');

      return {
        barcode: sequence,
        name: `${source.name} Variant ${sequence}`,
        unitPrice: Number((source.unitPrice + (index % 15) * 0.37).toFixed(2)),
      };
    });
  }, []);

  const columns = useMemo<EditableGridColumn<DemoRow>[]>(() => {
    const skuColumn: EditableGridColumn<DemoRow> =
      triggerColumn === 'sku'
        ? {
            kind: 'popup',
            key: 'sku',
            header: 'SKU',
            width: '150px',
            getValue: (row) => row.sku,
            onValueChange: (row, nextValue) => ({ ...row, sku: nextValue.toUpperCase() }),
            popup: popupConfig,
          }
        : {
            kind: 'text',
            key: 'sku',
            header: 'SKU',
            width: '150px',
            getValue: (row) => row.sku,
            onValueChange: (row, nextValue) => ({ ...row, sku: nextValue.toUpperCase() }),
          };

    const descriptionColumn: EditableGridColumn<DemoRow> =
      triggerColumn === 'description'
        ? {
            kind: 'popup',
            key: 'description',
            header: 'Description',
            getValue: (row) => row.description,
            onValueChange: (row, nextValue) => ({ ...row, description: nextValue }),
            popup: popupConfig,
          }
        : {
            kind: 'text',
            key: 'description',
            header: 'Description',
            getValue: (row) => row.description,
            onValueChange: (row, nextValue) => ({ ...row, description: nextValue }),
          };

    const quantityColumn: EditableGridColumn<DemoRow> =
      triggerColumn === 'quantity'
        ? {
            kind: 'popup',
            key: 'quantity',
            header: 'Qty',
            width: '90px',
            align: 'right',
            inputType: 'number',
            getValue: (row) => row.quantity,
            onValueChange: (row, nextValue) => ({ ...row, quantity: clampPositiveInt(nextValue, row.quantity) }),
            popup: popupConfig,
          }
        : {
            kind: 'number',
            key: 'quantity',
            header: 'Qty',
            width: '90px',
            align: 'right',
            inputType: 'number',
            getValue: (row) => row.quantity,
            onValueChange: (row, nextValue) => ({ ...row, quantity: clampPositiveInt(nextValue, row.quantity) }),
          };

    const unitPriceColumn: EditableGridColumn<DemoRow> =
      triggerColumn === 'unitPrice'
        ? {
            kind: 'popup',
            key: 'unitPrice',
            header: 'Unit Price',
            width: '120px',
            align: 'right',
            inputType: 'number',
            getValue: (row) => row.unitPrice,
            onValueChange: (row, nextValue) => ({ ...row, unitPrice: clampCurrency(nextValue, row.unitPrice) }),
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
            onValueChange: (row, nextValue) => ({ ...row, unitPrice: clampCurrency(nextValue, row.unitPrice) }),
          };

    return [skuColumn, descriptionColumn, quantityColumn, unitPriceColumn];
  }, [triggerColumn]);

  return (
    <section className="panel page-section">
      <div className="page-header">
        <div>
          <p className="eyebrow">Control demo</p>
          <h2>Reusable configured table</h2>
          <p className="lead-text">
            Press Enter to move to the next cell. On the last cell of the last row, a new row is created and focused.
          </p>
        </div>
      </div>

      <div className={`form-card ${styles.tableCard}`}>
        <div className={`form-grid form-grid--three ${styles.numericDemoGrid}`}>
          <label className="field field--compact">
            <span>Whole number only</span>
            <NumericTextBox value={wholeNumberValue} onValueChange={setWholeNumberValue} placeholder="0" />
          </label>
          <label className="field field--compact">
            <span>Decimal enabled</span>
            <NumericTextBox
              value={decimalValue}
              allowDecimal
              onValueChange={setDecimalValue}
              placeholder="0.00"
            />
          </label>
          <div className="field">
            <span>Current values</span>
            <p className={styles.valuePreview}>
              Integer: <strong>{wholeNumberValue || 'empty'}</strong> · Decimal: <strong>{decimalValue || 'empty'}</strong>
            </p>
          </div>
        </div>

        <div className={styles.controlsRow}>
          <label className="field">
            <span>Popup trigger column</span>
            <select value={triggerColumn} onChange={(event) => setTriggerColumn(event.target.value as TriggerColumnKey)}>
              {triggerColumnOptions.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <p className={styles.helpText}>
          Press Space on {triggerColumnOptions.find((option) => option.key === triggerColumn)?.label} to open the built-in picker.
        </p>
        <EditableGridTable
          ariaLabel="Configured editable table demo"
          rows={rows}
          columns={columns}
          onRowsChange={setRows}
          createRow={() => ({ id: crypto.randomUUID(), sku: '', description: '', quantity: 0, unitPrice: 0 })}
          isRowEmpty={isDemoRowEmpty}
          rowKey={(row) => row.id}
        />
      </div>

      <div className={`form-card ${styles.tableCard}`} style={{ marginTop: '40px' }}>
        <div className="page-header">
          <p className="eyebrow">Searchable Table Demo</p>
          <h3>Live search through 1000 catalog items</h3>
        </div>

        <SearchableTable
          items={largeProductCatalog}
          columns={
            [
              { key: 'barcode', label: 'Barcode', width: '150px' },
              { key: 'name', label: 'Product Name' },
              { key: 'unitPrice', label: 'Unit Price', width: '120px', render: (value) => `$${value.toFixed(2)}` },
            ] as SearchableTableColumn<typeof productCatalog[0]>[]
          }
          searchFields={['barcode', 'name']}
          placeholder="Search by barcode or product name..."
          emptyMessage="No products found matching your search."
          onItemSelect={(item) => console.log('Selected item:', item)}
        />
      </div>
    </section>
  );
};

