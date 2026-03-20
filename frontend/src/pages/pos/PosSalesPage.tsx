import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import type { Customer, SalesOrderDraft, SalesOrderItem } from '../../types';
import { productCatalog } from '../../data/catalog';
import styles from './PosSalesPage.module.css';

interface PosSalesPageProps {
  customers: Customer[];
  draft: SalesOrderDraft;
  onDraftChange: (draft: SalesOrderDraft) => void;
}

const toCurrency = (amount: number) => `$${amount.toFixed(2)}`;

const buildCatalogIndex = () => {
  return productCatalog.reduce<Record<string, { name: string; unitPrice: number }>>((index, item) => {
    index[item.barcode] = { name: item.name, unitPrice: item.unitPrice };
    return index;
  }, {});
};

const catalogIndex = buildCatalogIndex();

export const PosSalesPage = ({ customers, draft, onDraftChange }: PosSalesPageProps) => {
  const [barcode, setBarcode] = useState('');
  const [scanNote, setScanNote] = useState('Scanner ready. Focus stays in barcode field after each scan.');
  const [lastScannedBarcode, setLastScannedBarcode] = useState('');
  const scannerInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scannerInputRef.current?.focus();
  }, []);

  const selectedCustomer = useMemo(
    () => customers.find((customer) => customer.id === draft.customerId),
    [customers, draft.customerId],
  );

  const subtotal = draft.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const discountTotal = draft.items.reduce((sum, item) => sum + item.discount, 0);
  const total = Math.max(subtotal - discountTotal, 0);

  const updateItemQuantity = (itemId: string, delta: number) => {
    const updated = draft.items
      .map((item) => {
        if (item.id !== itemId) {
          return item;
        }

        return { ...item, quantity: Math.max(item.quantity + delta, 1) };
      })
      .filter((item) => item.quantity > 0);

    onDraftChange({ ...draft, items: updated });
  };

  const removeItem = (itemId: string) => {
    onDraftChange({
      ...draft,
      items: draft.items.filter((item) => item.id !== itemId),
    });
  };

  const addScannedItem = (normalizedBarcode: string) => {
    const existingItem = draft.items.find((item) => item.sku === normalizedBarcode);

    if (existingItem) {
      const updatedItems = draft.items.map((item) =>
        item.id === existingItem.id ? { ...item, quantity: item.quantity + 1 } : item,
      );

      onDraftChange({ ...draft, items: updatedItems });
      setScanNote(`Added 1 more to ${existingItem.description} (${normalizedBarcode}).`);
      return;
    }

    const catalogItem = catalogIndex[normalizedBarcode];
    const newItem: SalesOrderItem = {
      id: crypto.randomUUID(),
      sku: normalizedBarcode,
      description: catalogItem?.name ?? `Unmapped barcode ${normalizedBarcode}`,
      brand: '',
      quantity: 1,
      unitPrice: catalogItem?.unitPrice ?? 0,
      discount: 0,
    };

    onDraftChange({
      ...draft,
      items: [...draft.items, newItem],
    });

    setScanNote(
      catalogItem
        ? `${catalogItem.name} added from barcode ${normalizedBarcode}.`
        : `Barcode ${normalizedBarcode} is not in catalog. Added as unmapped item.`,
    );
  };

  const handleScanSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedBarcode = barcode.trim();

    if (!normalizedBarcode) {
      setScanNote('Scan skipped: barcode was empty.');
      scannerInputRef.current?.focus();
      return;
    }

    setLastScannedBarcode(normalizedBarcode);
    addScannedItem(normalizedBarcode);
    setBarcode('');
    scannerInputRef.current?.focus();
  };

  const addQuickItem = (productBarcode: string) => {
    setLastScannedBarcode(productBarcode);
    addScannedItem(productBarcode);
    scannerInputRef.current?.focus();
  };

  return (
    <section className="panel panel--stretch page-section">
      <div className="panel__header">
        <div>
          <p className="eyebrow">POS mode</p>
          <h2>Fast scanning checkout</h2>
          <p className="lead-text">Scan barcode and press Enter. Re-scanning the same code increases quantity instantly.</p>
        </div>
        <span className="pill">Optimized for keyboard barcode scanners</span>
      </div>

      <div className={styles.posShell}>
        <div className={styles.posMain}>
          <form className={styles.posScanForm} onSubmit={handleScanSubmit}>
            <label className={`field ${styles.posScanField}`} htmlFor="barcode-input">
              <span>Scan barcode</span>
              <input
                id="barcode-input"
                ref={scannerInputRef}
                value={barcode}
                onChange={(event) => setBarcode(event.target.value)}
                placeholder="Scan barcode and press Enter"
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
              />
            </label>
            <button className={`button ${styles.posScanButton}`} type="submit">
              Add
            </button>
            <button
              className="button button--secondary"
              type="button"
              onClick={() => scannerInputRef.current?.focus()}
            >
              Focus scanner
            </button>
          </form>

          <p className={styles.posScanNote}>
            <strong>Status:</strong> {scanNote}
          </p>

          <div className={styles.posItemsArea}>
            <div className={styles.posItemsHeader}>
              <h3>Order items</h3>
              <p>{draft.items.length} unique items in cart</p>
            </div>

            <div className={styles.posItemList} role="list" aria-label="Scanned order items">
              {draft.items.map((item) => {
                const lineTotal = Math.max(item.quantity * item.unitPrice - item.discount, 0);
                const isRecent = item.sku === lastScannedBarcode;

                return (
                  <article
                    className={`${styles.posItemRow} ${isRecent ? styles.posItemRowRecent : ''}`}
                    key={item.id}
                    role="listitem"
                  >
                    <div className={styles.posItemCore}>
                      <strong>{item.description}</strong>
                      <p>Barcode: {item.sku}</p>
                    </div>
                    <div className={styles.posItemPricing}>
                      <span>{toCurrency(item.unitPrice)} each</span>
                      <strong>{toCurrency(lineTotal)}</strong>
                    </div>
                    <div className={styles.posItemActions}>
                      <button className="button button--secondary" type="button" onClick={() => updateItemQuantity(item.id, -1)}>
                        -
                      </button>
                      <span className={styles.posQty}>{item.quantity}</span>
                      <button className="button button--secondary" type="button" onClick={() => updateItemQuantity(item.id, 1)}>
                        +
                      </button>
                      <button className="icon-button" type="button" onClick={() => removeItem(item.id)} aria-label={`Remove ${item.description}`}>
                        x
                      </button>
                    </div>
                  </article>
                );
              })}

              {draft.items.length === 0 && (
                <article className={`empty-state ${styles.posEmpty}`}>
                  <strong>Cart is empty</strong>
                  <p>Start scanning products to fill this large order area quickly.</p>
                </article>
              )}
            </div>
          </div>

          <div className={styles.posQuickCatalog}>
            <h3>Quick add</h3>
            <p>Fallback for manual click-entry using the seeded catalog.</p>
            <div className={styles.posCatalogGrid}>
              {productCatalog.map((product) => (
                <button key={product.barcode} className={styles.posCatalogItem} type="button" onClick={() => addQuickItem(product.barcode)}>
                  <strong>{product.name}</strong>
                  <span>{product.barcode}</span>
                  <span>{toCurrency(product.unitPrice)}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <aside className={`order-summary ${styles.posSummary}`}>
          <div className="summary-card">
            <p className="eyebrow">Customer</p>
            {selectedCustomer ? (
              <>
                <h3>{selectedCustomer.company}</h3>
                <p>{selectedCustomer.name}</p>
                <p>{selectedCustomer.phone}</p>
                <p>{selectedCustomer.email}</p>
              </>
            ) : (
              <p>No customer selected. You can select one from the Customers page.</p>
            )}
          </div>

          <div className="summary-card summary-card--totals">
            <p className="eyebrow">Totals</p>
            <div className="metric-row">
              <span>Lines</span>
              <strong>{draft.items.length}</strong>
            </div>
            <div className="metric-row">
              <span>Subtotal</span>
              <strong>{toCurrency(subtotal)}</strong>
            </div>
            <div className="metric-row">
              <span>Discounts</span>
              <strong>-{toCurrency(discountTotal)}</strong>
            </div>
            <div className="metric-row metric-row--total">
              <span>Payable</span>
              <strong>{toCurrency(total)}</strong>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
};

