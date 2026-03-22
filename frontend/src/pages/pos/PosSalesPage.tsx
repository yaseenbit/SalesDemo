import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import type { Customer, SalesOrderDraft, SalesOrderItem } from '../../types';
import { productCatalog, type CatalogItem } from '../../data/catalog';
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

type SearchPopupState = {
  query: string;
  activeIndex: number;
};

type CartEditState = {
  itemId: string;
  price: string;
  quantity: string;
};

const posConfig = {
  allowPreAddAdjustments: false,
};

const sanitizePriceInput = (value: string) => {
  const onlyDigitsAndDot = value.replace(/[^0-9.]/g, '');
  const [wholePart, ...rest] = onlyDigitsAndDot.split('.');

  if (rest.length === 0) {
    return onlyDigitsAndDot;
  }

  return `${wholePart}.${rest.join('')}`;
};

const sanitizeQuantityInput = (value: string) => value.replace(/[^0-9]/g, '');

export const PosSalesPage = ({ customers, draft, onDraftChange }: PosSalesPageProps) => {
  const [barcode, setBarcode] = useState('');
  const [pendingUnitPrice, setPendingUnitPrice] = useState('');
  const [pendingQuantity, setPendingQuantity] = useState('1');
  const [pendingSelectedItem, setPendingSelectedItem] = useState<CatalogItem | null>(null);
  const [scanNote, setScanNote] = useState('Scanner ready. Focus stays in barcode field after each scan.');
  const [lastScannedBarcode, setLastScannedBarcode] = useState('');
  const [searchPopup, setSearchPopup] = useState<SearchPopupState | null>(null);
  const [selectedRowIndex, setSelectedRowIndex] = useState(-1);
  const [cartEdit, setCartEdit] = useState<CartEditState | null>(null);
  const scannerInputRef = useRef<HTMLInputElement>(null);
  const popupSearchInputRef = useRef<HTMLInputElement>(null);
  const pendingPriceInputRef = useRef<HTMLInputElement>(null);
  const pendingQuantityInputRef = useRef<HTMLInputElement>(null);
  const cartEditPriceInputRef = useRef<HTMLInputElement>(null);
  const cartEditQuantityInputRef = useRef<HTMLInputElement>(null);
  const lastFocusedCartEditItemIdRef = useRef<string | null>(null);
  const itemRowRefs = useRef<Map<string, HTMLElement>>(new Map());

  useEffect(() => {
    scannerInputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!searchPopup) {
      return;
    }

    window.requestAnimationFrame(() => {
      popupSearchInputRef.current?.focus();
      popupSearchInputRef.current?.select();
    });
  }, [searchPopup]);

  useEffect(() => {
    if (!cartEdit) {
      lastFocusedCartEditItemIdRef.current = null;
      return;
    }

    if (lastFocusedCartEditItemIdRef.current === cartEdit.itemId) {
      return;
    }

    lastFocusedCartEditItemIdRef.current = cartEdit.itemId;

    window.requestAnimationFrame(() => {
      cartEditPriceInputRef.current?.focus();
      cartEditPriceInputRef.current?.select();
    });
  }, [cartEdit?.itemId]);

  useEffect(() => {
    if (draft.items.length === 0) {
      setSelectedRowIndex(-1);
      return;
    }

    setSelectedRowIndex((current) => (current >= draft.items.length ? draft.items.length - 1 : current));
  }, [draft.items.length]);

  useEffect(() => {
    if (selectedRowIndex < 0 || selectedRowIndex >= draft.items.length) {
      return;
    }

    const selectedItem = draft.items[selectedRowIndex];
    if (!selectedItem) {
      return;
    }

    itemRowRefs.current.get(selectedItem.id)?.scrollIntoView({ block: 'nearest' });
  }, [draft.items, selectedRowIndex]);

  useEffect(() => {
    if (!cartEdit) {
      return;
    }

    const editingItemStillExists = draft.items.some((item) => item.id === cartEdit.itemId);
    if (!editingItemStillExists) {
      setCartEdit(null);
    }
  }, [cartEdit, draft.items]);

  const selectedCustomer = useMemo(
    () => customers.find((customer) => customer.id === draft.customerId),
    [customers, draft.customerId],
  );

  const subtotal = draft.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const discountTotal = draft.items.reduce((sum, item) => sum + item.discount, 0);
  const total = Math.max(subtotal - discountTotal, 0);

  function findMatchingProducts(query: string) {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return [] as CatalogItem[];
    }

    return productCatalog.filter(
      (product) =>
        product.barcode.toLowerCase().includes(normalizedQuery) || product.name.toLowerCase().includes(normalizedQuery),
    );
  }

  const popupResults = useMemo(() => {
    if (!searchPopup) {
      return [] as CatalogItem[];
    }

    return findMatchingProducts(searchPopup.query);
  }, [searchPopup]);

  const focusScannerInput = () => {
    window.requestAnimationFrame(() => {
      scannerInputRef.current?.focus();
      scannerInputRef.current?.select();
    });
  };

  const focusPendingPriceInput = () => {
    window.requestAnimationFrame(() => {
      pendingPriceInputRef.current?.focus();
      pendingPriceInputRef.current?.select();
    });
  };

  const focusPendingQuantityInput = () => {
    window.requestAnimationFrame(() => {
      pendingQuantityInputRef.current?.focus();
      pendingQuantityInputRef.current?.select();
    });
  };

  const closeSearchPopup = () => {
    setSearchPopup(null);
  };

  const getPendingAddValues = () => {
    if (!posConfig.allowPreAddAdjustments) {
      return { quantityToAdd: 1, overrideUnitPrice: undefined as number | undefined };
    }

    const parsedQuantity = Number.parseInt(pendingQuantity, 10);
    const quantityToAdd = Number.isFinite(parsedQuantity) && parsedQuantity > 0 ? parsedQuantity : 1;

    const parsedUnitPrice = Number.parseFloat(pendingUnitPrice);
    const overrideUnitPrice = Number.isFinite(parsedUnitPrice) && parsedUnitPrice >= 0 ? parsedUnitPrice : undefined;

    return { quantityToAdd, overrideUnitPrice };
  };

  const resetPendingAddValues = () => {
    if (!posConfig.allowPreAddAdjustments) {
      return;
    }

    setPendingSelectedItem(null);
    setPendingQuantity('1');
    setPendingUnitPrice('');
  };

  const stageItemForPreAdd = (product: CatalogItem) => {
    setPendingSelectedItem(product);
    setBarcode(product.barcode);
    setPendingUnitPrice(product.unitPrice.toFixed(2));
    setPendingQuantity('1');
    closeSearchPopup();
    setScanNote(`Selected ${product.name}. Adjust price/quantity and press Enter on quantity to add.`);
    focusPendingPriceInput();
  };

  const openSearchPopup = (query: string, results: CatalogItem[]) => {
    const normalizedQuery = query.trim().toLowerCase();
    const exactMatchIndex = normalizedQuery
      ? results.findIndex((product) => product.barcode.toLowerCase() === normalizedQuery)
      : -1;

    setSearchPopup({
      query,
      activeIndex: exactMatchIndex >= 0 ? exactMatchIndex : 0,
    });
    setScanNote(`Found ${results.length} matching items. Use ↑/↓ and Enter to add one.`);
  };

  const updateSearchPopupQuery = (nextQuery: string) => {
    const nextResults = findMatchingProducts(nextQuery);
    const normalizedQuery = nextQuery.trim().toLowerCase();
    const exactMatchIndex = normalizedQuery
      ? nextResults.findIndex((product) => product.barcode.toLowerCase() === normalizedQuery)
      : -1;

    setSearchPopup((current) =>
      current
        ? {
            ...current,
            query: nextQuery,
            activeIndex: nextResults.length === 0 ? 0 : exactMatchIndex >= 0 ? exactMatchIndex : 0,
          }
        : current,
    );
  };

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
    if (cartEdit?.itemId === itemId) {
      setCartEdit(null);
      focusScannerInput();
    }

    onDraftChange({
      ...draft,
      items: draft.items.filter((item) => item.id !== itemId),
    });
  };

  const openCartEditor = (rowIndex: number) => {
    const rowItem = draft.items[rowIndex];
    if (!rowItem) {
      return;
    }

    setCartEdit({
      itemId: rowItem.id,
      price: String(rowItem.unitPrice),
      quantity: String(rowItem.quantity),
    });
    setScanNote(`Editing ${rowItem.description}. Press Enter on quantity to save.`);
  };

  const saveCartEditorChanges = () => {
    if (!cartEdit) {
      return;
    }

    const currentItem = draft.items.find((item) => item.id === cartEdit.itemId);
    if (!currentItem) {
      setCartEdit(null);
      focusScannerInput();
      return;
    }

    const parsedPrice = Number.parseFloat(cartEdit.price);
    const parsedQuantity = Number.parseInt(cartEdit.quantity, 10);

    const nextPrice = Number.isFinite(parsedPrice) && parsedPrice >= 0 ? parsedPrice : currentItem.unitPrice;
    const nextQuantity = Number.isFinite(parsedQuantity) && parsedQuantity > 0 ? parsedQuantity : currentItem.quantity;

    const updatedItems = draft.items.map((item) =>
      item.id === cartEdit.itemId
        ? {
            ...item,
            unitPrice: nextPrice,
            quantity: nextQuantity,
          }
        : item,
    );

    onDraftChange({
      ...draft,
      items: updatedItems,
    });

    setCartEdit(null);
    setSelectedRowIndex(-1);
    setScanNote(`Updated ${currentItem.description} to ${toCurrency(nextPrice)} x ${nextQuantity}.`);
    focusScannerInput();
  };

  const addScannedItem = (
    normalizedBarcode: string,
    matchedCatalogItem?: CatalogItem,
    quantityToAdd = 1,
    overrideUnitPrice?: number,
  ) => {
    const existingItem = draft.items.find((item) => item.sku === normalizedBarcode);

    if (existingItem) {
      const updatedItems = draft.items.map((item) =>
        item.id === existingItem.id
          ? {
              ...item,
              quantity: item.quantity + quantityToAdd,
              unitPrice: overrideUnitPrice ?? item.unitPrice,
            }
          : item,
      );

      onDraftChange({ ...draft, items: updatedItems });
      setScanNote(`Added ${quantityToAdd} more to ${existingItem.description} (${normalizedBarcode}).`);
      return;
    }

    const catalogItem = matchedCatalogItem ?? productCatalog.find((item) => item.barcode === normalizedBarcode);
    const catalogEntry = catalogItem ?? catalogIndex[normalizedBarcode];
    const newItem: SalesOrderItem = {
      id: crypto.randomUUID(),
      sku: normalizedBarcode,
      description: catalogEntry?.name ?? `Unmapped barcode ${normalizedBarcode}`,
      brand: '',
      quantity: quantityToAdd,
      unitPrice: overrideUnitPrice ?? catalogEntry?.unitPrice ?? 0,
      discount: 0,
    };

    onDraftChange({
      ...draft,
      items: [...draft.items, newItem],
    });

    setScanNote(
      catalogEntry
        ? `${catalogEntry.name} added from barcode ${normalizedBarcode}.`
        : `Barcode ${normalizedBarcode} is not in catalog. Added as unmapped item.`,
    );
  };

  const addCatalogItemFromPopup = (product: CatalogItem) => {
    if (posConfig.allowPreAddAdjustments) {
      stageItemForPreAdd(product);
      return;
    }

    const { quantityToAdd, overrideUnitPrice } = getPendingAddValues();

    setLastScannedBarcode(product.barcode);
    addScannedItem(product.barcode, product, quantityToAdd, overrideUnitPrice);
    setBarcode('');
    resetPendingAddValues();
    closeSearchPopup();
    focusScannerInput();
  };

  const submitScanValue = (rawValue: string) => {
    const normalizedBarcode = rawValue.trim();

    const { quantityToAdd, overrideUnitPrice } = getPendingAddValues();

    if (!normalizedBarcode) {
      setScanNote('Scan skipped: barcode was empty.');
      scannerInputRef.current?.focus();
      return;
    }

    const matchedProducts = findMatchingProducts(normalizedBarcode);

    if (posConfig.allowPreAddAdjustments) {
      if (matchedProducts.length === 1) {
        stageItemForPreAdd(matchedProducts[0]);
        return;
      }

      if (matchedProducts.length > 1) {
        openSearchPopup(normalizedBarcode, matchedProducts);
        return;
      }

      setPendingSelectedItem(null);
      setScanNote(`No matching product found for "${normalizedBarcode}".`);
      return;
    }

    if (matchedProducts.length === 1) {
      const matchedProduct = matchedProducts[0];
      setLastScannedBarcode(matchedProduct.barcode);
      addScannedItem(matchedProduct.barcode, matchedProduct, quantityToAdd, overrideUnitPrice);
      setBarcode('');
      resetPendingAddValues();
      closeSearchPopup();
      focusScannerInput();
      return;
    }

    if (matchedProducts.length > 1) {
      openSearchPopup(normalizedBarcode, matchedProducts);
      return;
    }

    setLastScannedBarcode(normalizedBarcode);
    addScannedItem(normalizedBarcode, undefined, quantityToAdd, overrideUnitPrice);
    setBarcode('');
    resetPendingAddValues();
    closeSearchPopup();
    focusScannerInput();
  };

  const handleScanSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    submitScanValue(barcode);
  };

  const addQuickItem = (productBarcode: string) => {
    setLastScannedBarcode(productBarcode);
    addScannedItem(productBarcode);
    closeSearchPopup();
    focusScannerInput();
  };

  const addPendingSelectedItem = () => {
    if (!pendingSelectedItem) {
      setScanNote('Select an item first by scanning a barcode and pressing Enter.');
      focusScannerInput();
      return;
    }

    const { quantityToAdd, overrideUnitPrice } = getPendingAddValues();

    setLastScannedBarcode(pendingSelectedItem.barcode);
    addScannedItem(pendingSelectedItem.barcode, pendingSelectedItem, quantityToAdd, overrideUnitPrice);
    setBarcode('');
    resetPendingAddValues();
    focusScannerInput();
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
          <div className={styles.posScanArea}>
            <form className={styles.posScanForm} onSubmit={handleScanSubmit}>
              <label className={`field ${styles.posScanField}`} htmlFor="barcode-input">
                <span>Scan barcode</span>
                <input
                  id="barcode-input"
                  ref={scannerInputRef}
                  value={barcode}
                  onChange={(event) => {
                    setBarcode(event.target.value);
                    if (posConfig.allowPreAddAdjustments) {
                      setPendingSelectedItem(null);
                    }
                    closeSearchPopup();
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      if (selectedRowIndex < 0 || selectedRowIndex >= draft.items.length) {
                        return;
                      }

                      event.preventDefault();
                      openCartEditor(selectedRowIndex);
                      return;
                    }

                    if (draft.items.length === 0) {
                      return;
                    }

                    if (event.key === 'ArrowDown') {
                      event.preventDefault();
                      setSelectedRowIndex((current) => (current < 0 ? 0 : Math.min(current + 1, draft.items.length - 1)));
                      return;
                    }

                    if (event.key === 'ArrowUp') {
                      event.preventDefault();
                      setSelectedRowIndex((current) =>
                        current < 0 ? draft.items.length - 1 : Math.max(current - 1, 0),
                      );
                      return;
                    }

                    if (event.key === 'Escape') {
                      event.preventDefault();
                      setSelectedRowIndex(-1);
                      return;
                    }

                    if (event.key === 'Delete') {
                      if (selectedRowIndex < 0 || selectedRowIndex >= draft.items.length) {
                        return;
                      }

                      event.preventDefault();
                      const selectedItem = draft.items[selectedRowIndex];
                      if (selectedItem) {
                        removeItem(selectedItem.id);
                      }
                    }
                  }}
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

            {posConfig.allowPreAddAdjustments ? (
              <div className={styles.posPreAddControls}>
                {pendingSelectedItem ? (
                  <div className={styles.posSelectedItemPreview}>
                    <strong>{pendingSelectedItem.name}</strong>
                    <p>SKU: {pendingSelectedItem.barcode}</p>
                    <p>Default price: {toCurrency(pendingSelectedItem.unitPrice)}</p>
                  </div>
                ) : (
                  <div className={styles.posSelectedItemPreview}>
                    <strong>No item selected</strong>
                    <p>Scan barcode and press Enter to load item details.</p>
                  </div>
                )}

                <label className="field">
                  <span>Price</span>
                  <input
                    ref={pendingPriceInputRef}
                    type="number"
                    min="0"
                    step="0.01"
                    value={pendingUnitPrice}
                    onChange={(event) => setPendingUnitPrice(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        focusPendingQuantityInput();
                      }
                    }}
                    placeholder="Default"
                  />
                </label>
                <label className="field">
                  <span>Quantity</span>
                  <input
                    ref={pendingQuantityInputRef}
                    type="number"
                    min="1"
                    step="1"
                    value={pendingQuantity}
                    onChange={(event) => setPendingQuantity(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        addPendingSelectedItem();
                      }
                    }}
                  />
                </label>
              </div>
            ) : null}

            <p className={styles.posScanNote}>
              <strong>Status:</strong> {scanNote}
            </p>

          </div>

          <div className={styles.posItemsArea}>
            <div className={styles.posItemsHeader}>
              <h3>Order items</h3>
              <p>{draft.items.length} unique items in cart</p>
            </div>

            <div className={styles.posItemList} role="list" aria-label="Scanned order items">
              {draft.items.map((item, itemIndex) => {
                const lineTotal = Math.max(item.quantity * item.unitPrice - item.discount, 0);
                const isRecent = item.sku === lastScannedBarcode;
                const isEditingRow = cartEdit?.itemId === item.id;

                return (
                  <article
                    className={`${styles.posItemRow} ${isRecent ? styles.posItemRowRecent : ''} ${selectedRowIndex === itemIndex ? styles.posItemRowSelected : ''}`}
                    key={item.id}
                    role="listitem"
                    aria-selected={selectedRowIndex === itemIndex}
                    ref={(element) => {
                      if (element) {
                        itemRowRefs.current.set(item.id, element);
                      } else {
                        itemRowRefs.current.delete(item.id);
                      }
                    }}
                  >
                    <div className={styles.posItemCore}>
                      {isEditingRow ? <span className={styles.posEditingBadge}>Editing</span> : null}
                      <strong>{item.description}</strong>
                      <p>Barcode: {item.sku}</p>
                    </div>
                    <div className={styles.posItemPricing}>
                      {isEditingRow ? (
                        <label className={styles.posInlineEditField}>
                          <span>Price</span>
                          <input
                            ref={cartEditPriceInputRef}
                            className={styles.posInlineEditInput}
                            type="text"
                            inputMode="decimal"
                            value={cartEdit?.price ?? ''}
                            onChange={(event) =>
                              setCartEdit((current) =>
                                current
                                  ? {
                                      ...current,
                                      price: sanitizePriceInput(event.target.value),
                                    }
                                  : current,
                              )
                            }
                            onKeyDown={(event) => {
                              if (event.key === 'Enter') {
                                event.preventDefault();
                                cartEditQuantityInputRef.current?.focus();
                                cartEditQuantityInputRef.current?.select();
                                return;
                              }

                              if (event.key === 'Escape') {
                                event.preventDefault();
                                setCartEdit(null);
                                setSelectedRowIndex(-1);
                                focusScannerInput();
                              }
                            }}
                          />
                        </label>
                      ) : (
                        <span>{toCurrency(item.unitPrice)} each</span>
                      )}
                      <strong>{toCurrency(lineTotal)}</strong>
                    </div>
                    <div className={styles.posItemActions}>
                      {isEditingRow ? (
                        <label className={styles.posInlineEditField}>
                          <span>Qty</span>
                          <input
                            ref={cartEditQuantityInputRef}
                            className={styles.posInlineEditInput}
                            type="text"
                            inputMode="numeric"
                            value={cartEdit?.quantity ?? ''}
                            onChange={(event) =>
                              setCartEdit((current) =>
                                current
                                  ? {
                                      ...current,
                                      quantity: sanitizeQuantityInput(event.target.value),
                                    }
                                  : current,
                              )
                            }
                            onKeyDown={(event) => {
                              if (event.key === 'Enter') {
                                event.preventDefault();
                                saveCartEditorChanges();
                                return;
                              }

                              if (event.key === 'Escape') {
                                event.preventDefault();
                                setCartEdit(null);
                                setSelectedRowIndex(-1);
                                focusScannerInput();
                              }
                            }}
                          />
                        </label>
                      ) : (
                        <>
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
                        </>
                      )}
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

          {/*<div className={styles.posQuickCatalog}>*/}
          {/*  <h3>Quick add</h3>*/}
          {/*  <p>Fallback for manual click-entry using the seeded catalog.</p>*/}
          {/*  <div className={styles.posCatalogGrid}>*/}
          {/*    {productCatalog.map((product) => (*/}
          {/*      <button key={product.barcode} className={styles.posCatalogItem} type="button" onClick={() => addQuickItem(product.barcode)}>*/}
          {/*        <strong>{product.name}</strong>*/}
          {/*        <span>{product.barcode}</span>*/}
          {/*        <span>{toCurrency(product.unitPrice)}</span>*/}
          {/*      </button>*/}
          {/*    ))}*/}
          {/*  </div>*/}
          {/*</div>*/}
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

      {searchPopup ? (
        <div className={styles.posSearchPopupOverlay} role="presentation" onClick={closeSearchPopup}>
          <section
            className={styles.posSearchPopupDialog}
            aria-label="Matching catalog items"
            role="dialog"
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles.posSearchPopupHeader}>
              <h3>Matching items</h3>
              <button className={styles.posSearchPopupCloseButton} type="button" onClick={closeSearchPopup}>
                Close
              </button>
            </div>

            <label className={styles.posSearchPopupField}>
              <span>Filter items</span>
              <input
                ref={popupSearchInputRef}
                value={searchPopup.query}
                onChange={(event) => updateSearchPopupQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (popupResults.length === 0) {
                    if (event.key === 'Escape') {
                      event.preventDefault();
                      closeSearchPopup();
                      focusScannerInput();
                    }

                    return;
                  }

                  if (event.key === 'ArrowDown') {
                    event.preventDefault();
                    setSearchPopup((current) =>
                      current
                        ? {
                            ...current,
                            activeIndex: (current.activeIndex + 1) % popupResults.length,
                          }
                        : current,
                    );
                    return;
                  }

                  if (event.key === 'ArrowUp') {
                    event.preventDefault();
                    setSearchPopup((current) =>
                      current
                        ? {
                            ...current,
                            activeIndex: (current.activeIndex - 1 + popupResults.length) % popupResults.length,
                          }
                        : current,
                    );
                    return;
                  }

                  if (event.key === 'Enter') {
                    event.preventDefault();
                    const selectedProduct = popupResults[searchPopup.activeIndex] ?? popupResults[0];
                    if (selectedProduct) {
                      addCatalogItemFromPopup(selectedProduct);
                    }
                    return;
                  }

                  if (event.key === 'Escape') {
                    event.preventDefault();
                    closeSearchPopup();
                    setScanNote('Selection popup closed. Continue scanning or press Enter to search again.');
                    focusScannerInput();
                  }
                }}
                placeholder="Type barcode or item name"
              />
            </label>

            <div className={styles.posSearchPopupList}>
              {popupResults.map((product, index) => {
                const isActive = index === searchPopup.activeIndex;

                return (
                  <button
                    key={product.barcode}
                    type="button"
                    className={`${styles.posSearchPopupRow} ${isActive ? styles.posSearchPopupRowActive : ''}`}
                    onClick={() => addCatalogItemFromPopup(product)}
                    onMouseEnter={() => setSearchPopup((current) => (current ? { ...current, activeIndex: index } : current))}
                  >
                    <span>{product.barcode}</span>
                    <span>{product.name}</span>
                    <span>{toCurrency(product.unitPrice)}</span>
                  </button>
                );
              })}

              {popupResults.length === 0 ? (
                <div className={styles.posSearchPopupEmpty}>
                  <strong>No items found</strong>
                  <p>Try another barcode or product name.</p>
                </div>
              ) : null}
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
};

