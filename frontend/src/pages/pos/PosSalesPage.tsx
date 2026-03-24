import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import type { Customer, SalesOrderDraft, SalesOrderItem } from '../../types';
import { fetchProductCatalog, productCatalog, type CatalogItem } from '../../data/catalog';
import { saveInvoice, getAllInvoices, searchInvoices, type SavedInvoice } from '../../services/invoiceDb';
import { Icon } from 'semantic-ui-react';
import styles from './PosSalesPage.module.css';

interface PosSalesPageProps {
  customers: Customer[];
  draft: SalesOrderDraft;
  onDraftChange: (draft: SalesOrderDraft) => void;
}

const toCurrency = (amount: number) => `$${amount.toFixed(2)}`;

const buildCatalogIndex = (items: CatalogItem[]) => {
  return items.reduce<Record<string, { name: string; unitPrice: number }>>((index, item) => {
    index[item.barcode] = { name: item.name, unitPrice: item.unitPrice };
    return index;
  }, {});
};

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
  allowPreAddAdjustments: true,
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
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
  const [isCatalogLoading, setIsCatalogLoading] = useState(true);
  const [barcode, setBarcode] = useState('');
  const [pendingUnitPrice, setPendingUnitPrice] = useState('');
  const [pendingQuantity, setPendingQuantity] = useState('1');
  const [pendingSelectedItem, setPendingSelectedItem] = useState<CatalogItem | null>(null);
  const [scanNote, setScanNote] = useState('Scanner ready. Focus stays in barcode field after each scan.');
  const [lastScannedBarcode, setLastScannedBarcode] = useState('');
  const [searchPopup, setSearchPopup] = useState<SearchPopupState | null>(null);
  const [selectedRowIndex, setSelectedRowIndex] = useState(-1);
  const [cartEdit, setCartEdit] = useState<CartEditState | null>(null);
  const [receiptPrintedAt, setReceiptPrintedAt] = useState(() => new Date().toISOString());
  const [activeInvoiceId, setActiveInvoiceId] = useState<string | null>(null);
  const [isFindModalOpen, setIsFindModalOpen] = useState(false);
  const [findQuery, setFindQuery] = useState('');
  const [savedInvoices, setSavedInvoices] = useState<SavedInvoice[]>([]);
  const scannerInputRef = useRef<HTMLInputElement>(null);
  const popupSearchInputRef = useRef<HTMLInputElement>(null);
  const pendingPriceInputRef = useRef<HTMLInputElement>(null);
  const pendingQuantityInputRef = useRef<HTMLInputElement>(null);
  const cartEditPriceInputRef = useRef<HTMLInputElement>(null);
  const cartEditQuantityInputRef = useRef<HTMLInputElement>(null);
  const lastFocusedCartEditItemIdRef = useRef<string | null>(null);
  const itemRowRefs = useRef<Map<string, HTMLElement>>(new Map());

  const catalogIndex = useMemo(() => buildCatalogIndex(catalogItems), [catalogItems]);

  useEffect(() => {
    scannerInputRef.current?.focus();
  }, []);

  useEffect(() => {
    let isActive = true;

    setScanNote('Loading items...');
    setIsCatalogLoading(true);

    fetchProductCatalog()
      .then((items) => {
        if (!isActive) {
          return;
        }

        setCatalogItems(items);
        setIsCatalogLoading(false);
        setScanNote(`Scanner ready. ${items.length} items loaded.`);
      })
      .catch(() => {
        if (!isActive) {
          return;
        }

        setCatalogItems([]);
        setIsCatalogLoading(false);
        setScanNote('Failed to load items.');
      });

    return () => {
      isActive = false;
    };
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

  const formatReceiptDate = (isoDate: string) => {
    return new Date(isoDate).toLocaleString();
  };

  function findMatchingProducts(query: string) {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return catalogItems;
    }

    return catalogItems.filter(
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

    const catalogItem = matchedCatalogItem ?? catalogItems.find((item) => item.barcode === normalizedBarcode);
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

    if (isCatalogLoading) {
      setScanNote('Please wait. Items are still loading...');
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

    setScanNote('Item not found.');
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

  const printReceipt = () => {
    if (draft.items.length === 0) {
      setScanNote('Cannot print receipt. Cart is empty.');
      return;
    }

    const printClassName = 'thermal-receipt-print';
    const printedAt = new Date().toISOString();
    setReceiptPrintedAt(printedAt);

    const cleanup = () => {
      document.body.classList.remove(printClassName);
      window.removeEventListener('afterprint', cleanup);
    };

    document.body.classList.add(printClassName);
    window.addEventListener('afterprint', cleanup);

    window.requestAnimationFrame(() => {
      window.print();
      // Fallback when afterprint is unreliable.
      window.setTimeout(cleanup, 1200);
    });
  };

  const saveAndClearInvoice = async () => {
    if (draft.items.length === 0) {
      setScanNote('Cannot save. Cart is empty.');
      return;
    }

    try {
      const saveResult = await saveInvoice(draft, activeInvoiceId ?? undefined);
      setScanNote(
        saveResult.isUpdate
          ? `Invoice ${saveResult.invoice.id} updated successfully. Cart cleared for next transaction.`
          : `Invoice ${saveResult.invoice.id} saved successfully. Cart cleared for next transaction.`,
      );
      
      onDraftChange({
        orderNumber: '',
        orderDate: new Date().toISOString().slice(0, 10),
        deliveryDate: '',
        customerId: draft.customerId,
        status: 'Draft' as const,
        notes: '',
        items: [],
      });

      setBarcode('');
      setCartEdit(null);
      setSelectedRowIndex(-1);
      setPendingSelectedItem(null);
      setActiveInvoiceId(null);
      setReceiptPrintedAt(new Date().toISOString());
      focusScannerInput();
    } catch (error) {
      console.error('Failed to save invoice:', error);
      setScanNote('Error saving invoice. Please try again.');
    }
  };

  const openFindModal = async () => {
    setIsFindModalOpen(true);
    try {
      const invoices = await getAllInvoices();
      setSavedInvoices(invoices);
      setFindQuery('');
    } catch (error) {
      console.error('Failed to load invoices:', error);
      setScanNote('Error loading saved invoices.');
    }
  };

  const handleFindSearch = async (query: string) => {
    setFindQuery(query);
    try {
      const results = await searchInvoices(query);
      setSavedInvoices(results);
    } catch (error) {
      console.error('Failed to search invoices:', error);
    }
  };

  const restoreInvoice = (invoice: SavedInvoice) => {
    onDraftChange({
      orderNumber: invoice.orderNumber,
      orderDate: invoice.orderDate,
      deliveryDate: invoice.deliveryDate,
      customerId: invoice.customerId,
      status: invoice.status,
      notes: invoice.notes,
      items: invoice.items,
    });
    setActiveInvoiceId(invoice.id);
    setIsFindModalOpen(false);
    setScanNote(`Restored invoice ${invoice.id}. Ready to continue editing.`);
    focusScannerInput();
  };

  return (
    <section className="panel panel--stretch page-section">
      <div className={styles.posToolbar}>
        <span className={styles.posToolbarTitle}>POS Screen</span>
        <div className={styles.posToolbarActions}>
          <button
            className={`${styles.posToolbarBtn} ${styles.posToolbarBtnAdd}`}
            type="button"
            title="Add item"
            onClick={() => {
              setBarcode('');
              focusScannerInput();
            }}
          >
            <Icon name="plus circle" />
            Add
          </button>
          <button
            className={`${styles.posToolbarBtn} ${styles.posToolbarBtnSearch}`}
            type="button"
            title="Search items"
            disabled={isCatalogLoading}
            onClick={() => openSearchPopup('', catalogItems)}
          >
            <Icon name="search" />
            Search
          </button>
          <button
            className={`${styles.posToolbarBtn} ${styles.posToolbarBtnSave}`}
            type="button"
            title="Save POS bill"
            disabled={draft.items.length === 0}
            onClick={saveAndClearInvoice}
          >
            <Icon name="save" />
            Save
          </button>
          <button
            className={`${styles.posToolbarBtn} ${styles.posToolbarBtnSearch}`}
            type="button"
            title="Find saved invoices"
            onClick={openFindModal}
          >
            <Icon name="folder open" />
            Find
          </button>
          <button
            className={`${styles.posToolbarBtn} ${styles.posToolbarBtnRefresh}`}
            type="button"
            title="Refresh / clear cart"
            onClick={() => {
              onDraftChange({ ...draft, items: [] });
              setBarcode('');
              setCartEdit(null);
              setSelectedRowIndex(-1);
              setScanNote('Cart cleared. Scanner ready.');
              focusScannerInput();
            }}
          >
            <Icon name="refresh" />
            Refresh
          </button>
          <button
            className={`${styles.posToolbarBtn} ${styles.posToolbarBtnPrint}`}
            type="button"
            title="Print receipt"
            disabled={draft.items.length === 0}
            onClick={printReceipt}
          >
            <Icon name="print" />
            Print
          </button>
          <button
            className={`${styles.posToolbarBtn} ${styles.posToolbarBtnExit}`}
            type="button"
            title="Exit POS"
            onClick={() => window.history.back()}
          >
            <Icon name="sign-out" />
            Exit
          </button>
        </div>
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
                    if (event.key === ' ') {
                      event.preventDefault();
                      if (isCatalogLoading) {
                        setScanNote('Please wait. Items are still loading...');
                        return;
                      }
                      const popupQuery = barcode.trim();
                      openSearchPopup(popupQuery, popupQuery ? findMatchingProducts(popupQuery) : catalogItems);
                      return;
                    }

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
            <div className={styles.posReceiptActionRow}>
              <button
                className="button"
                type="button"
                onClick={printReceipt}
                disabled={draft.items.length === 0}
              >
                Print receipt
              </button>
            </div>
          </div>
        </aside>
      </div>

      <section className={styles.receiptPrintArea} aria-hidden="true">
        <article className={styles.receiptPaper}>
          <header className={styles.receiptHeader}>
            <h3>SALES RECEIPT</h3>
            <p>{draft.orderNumber || `POS-${receiptPrintedAt.slice(0, 10).replace(/-/g, '')}`}</p>
            <p>{formatReceiptDate(receiptPrintedAt)}</p>
          </header>

          <div className={styles.receiptMeta}>
            <p>Customer: {selectedCustomer?.name || 'Walk-in customer'}</p>
            {selectedCustomer?.phone ? <p>Phone: {selectedCustomer.phone}</p> : null}
          </div>

          <div className={styles.receiptDivider} />

          <div className={styles.receiptTableHeader}>
            <span>Item</span>
            <span>Qty</span>
            <span>Amount</span>
          </div>

          {draft.items.map((item) => {
            const lineTotal = Math.max(item.quantity * item.unitPrice - item.discount, 0);

            return (
              <div key={`receipt-${item.id}`} className={styles.receiptRow}>
                <span>{item.description}</span>
                <span>{item.quantity}</span>
                <span>{toCurrency(lineTotal)}</span>
              </div>
            );
          })}

          <div className={styles.receiptDivider} />

          <div className={styles.receiptTotals}>
            <p>
              <span>Subtotal</span>
              <strong>{toCurrency(subtotal)}</strong>
            </p>
            <p>
              <span>Discount</span>
              <strong>-{toCurrency(discountTotal)}</strong>
            </p>
            <p className={styles.receiptGrandTotal}>
              <span>Total</span>
              <strong>{toCurrency(total)}</strong>
            </p>
          </div>

          <footer className={styles.receiptFooter}>
            <p>Thank you for shopping with us</p>
          </footer>
        </article>
      </section>

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

      {isFindModalOpen ? (
        <div className={styles.posFindModalOverlay} role="presentation" onClick={() => setIsFindModalOpen(false)}>
          <section
            className={styles.posFindModalDialog}
            role="dialog"
            aria-modal="true"
            aria-label="Find saved invoices"
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles.posFindModalHeader}>
              <h3>Saved Invoices</h3>
              <button className={styles.posFindModalCloseButton} type="button" onClick={() => setIsFindModalOpen(false)}>
                Close
              </button>
            </div>

            <label className={styles.posFindModalSearchField}>
              <span>Search invoices</span>
              <input
                type="text"
                value={findQuery}
                onChange={(event) => handleFindSearch(event.target.value)}
                placeholder="Search by ID, Order #, or Date"
              />
            </label>

            <div className={styles.posFindModalList}>
              {savedInvoices.length === 0 ? (
                <div className={styles.posFindModalEmpty}>
                  <p>No saved invoices found.</p>
                </div>
              ) : (
                savedInvoices.map((invoice) => (
                  <button
                    key={invoice.id}
                    type="button"
                    className={styles.posFindModalRow}
                    onClick={() => restoreInvoice(invoice)}
                  >
                    <div className={styles.posFindModalRowContent}>
                      <strong>{invoice.id}</strong>
                      <span className={styles.posFindModalRowMeta}>
                        Order: {invoice.orderNumber || 'N/A'} | Items: {invoice.items.length} | Saved:{' '}
                        {new Date(invoice.savedAt).toLocaleString()}
                      </span>
                    </div>
                    <Icon name="arrow right" />
                  </button>
                ))
              )}
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
};

