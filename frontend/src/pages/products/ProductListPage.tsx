import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from 'semantic-ui-react';
import { BarcodeLabelDialog } from '../../components/products/BarcodeLabelDialog';
import { ProductFormDialog, type ProductFormValues } from '../../components/products/ProductFormDialog';
import { ProductStockBadge } from '../../components/products/ProductStockBadge';
import { copyBarcodeToClipboard } from '../../components/products/barcodeTools';
import {
  getInventorySummary,
  getSuggestedReorderQuantity,
  matchesInventoryFilter,
  type ProductInventoryFilter,
} from '../../components/products/productInventory';
import {
  archiveProduct,
  createProduct,
  deleteProduct,
  fetchProducts,
  generateProductBarcode,
  importProducts,
  productCategories,
  updateProduct,
} from '../../services/productApi';
import type { NewProductInput, Product, ProductCategory } from '../../types';
import styles from './ProductListPage.module.css';

type CategoryFilter = 'All' | ProductCategory;

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const formatCurrency = (value: number) => currencyFormatter.format(value);

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const createInitialFormState = (): ProductFormValues => ({
  name: '',
  barcode: generateProductBarcode(),
  category: productCategories[0],
  description: '',
  unitPrice: '',
  stockQuantity: '',
  reorderLevel: '12',
});

const inventoryFilterOptions: ProductInventoryFilter[] = ['All', 'Low Stock', 'Out of Stock', 'Needs Reorder'];

const normalizeImportKey = (value: string) => value.replace(/[^a-z0-9]/gi, '').toLowerCase();

const getImportCell = (row: Record<string, unknown>, aliases: string[]) => {
  for (const [key, value] of Object.entries(row)) {
    const normalizedKey = normalizeImportKey(key);
    if (aliases.includes(normalizedKey)) {
      return value;
    }
  }

  return undefined;
};

const getImportNumber = (value: unknown, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const resolveCategory = (value: unknown): ProductCategory => {
  const rawValue = String(value ?? '').trim().toLowerCase();
  return productCategories.find((category) => category.toLowerCase() === rawValue) ?? productCategories[0];
};

const parseImportedProducts = (rows: Record<string, unknown>[]) => {
  let skipped = 0;

  const products = rows.flatMap((row) => {
    const name = String(getImportCell(row, ['name', 'productname', 'itemname']) ?? '').trim();
    const barcode = String(getImportCell(row, ['barcode', 'barcodenumber', 'code']) ?? '').trim();

    if (!name || !barcode) {
      skipped += 1;
      return [];
    }

    return [
      {
        name,
        barcode,
        category: resolveCategory(getImportCell(row, ['category', 'itemcategory'])),
        description: String(getImportCell(row, ['description', 'details', 'productdescription']) ?? '').trim(),
        unitPrice: getImportNumber(getImportCell(row, ['unitprice', 'price', 'sellingprice']), 0),
        stockQuantity: getImportNumber(getImportCell(row, ['stockquantity', 'stock', 'qty', 'quantity']), 0),
        reorderLevel: getImportNumber(getImportCell(row, ['reorderlevel', 'reorder', 'minimumstock']), 12),
      } satisfies NewProductInput,
    ];
  });

  return { products, skipped };
};

const buildPrintMarkup = (products: Product[], query: string, category: CategoryFilter, autoPrint = false) => {
  const printedAt = new Date().toLocaleString();
  const rowsMarkup = products
    .map(
      (product, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${escapeHtml(product.barcode)}</td>
          <td>${escapeHtml(product.name)}</td>
          <td>${escapeHtml(product.category)}</td>
          <td>${escapeHtml(product.stockQuantity.toLocaleString())}</td>
          <td>${escapeHtml(product.reorderLevel.toLocaleString())}</td>
          <td style="text-align:right;">${escapeHtml(formatCurrency(product.unitPrice))}</td>
        </tr>`,
    )
    .join('');

  return `<!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Products Print Preview</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 24px;
          color: #1f2937;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 20px;
          margin-bottom: 20px;
        }
        .header h1 {
          margin: 0 0 8px;
          font-size: 24px;
        }
        .meta {
          color: #4b5563;
          font-size: 13px;
          line-height: 1.6;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12px;
        }
        th,
        td {
          border: 1px solid #d1d5db;
          padding: 8px 10px;
          text-align: left;
          vertical-align: top;
        }
        th {
          background: #eef2ff;
          font-weight: 700;
        }
      </style>
      ${autoPrint ? '<script>window.addEventListener("load", () => window.print());</script>' : ''}
    </head>
    <body>
      <div class="header">
        <div>
          <h1>Product Listing</h1>
          <div class="meta">
            <div>Printed at: ${escapeHtml(printedAt)}</div>
            <div>Search filter: ${escapeHtml(query || 'All items')}</div>
            <div>Category filter: ${escapeHtml(category)}</div>
            <div>Total rows: ${products.length.toLocaleString()}</div>
          </div>
        </div>
      </div>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Barcode</th>
            <th>Name</th>
            <th>Category</th>
            <th>Stock Qty</th>
            <th>Reorder Level</th>
            <th>Unit Price</th>
          </tr>
        </thead>
        <tbody>${rowsMarkup}</tbody>
      </table>
    </body>
  </html>`;
};

export const ProductListPage = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('All');
  const [inventoryFilter, setInventoryFilter] = useState<ProductInventoryFilter>('All');
  const [selectedRowIndex, setSelectedRowIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [barcodeLabelProduct, setBarcodeLabelProduct] = useState<Product | null>(null);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formState, setFormState] = useState<ProductFormValues>(createInitialFormState);
  const rowRefs = useRef<Map<string, HTMLTableRowElement>>(new Map());
  const tableShellRef = useRef<HTMLDivElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  const isEditMode = editingProductId !== null;

  const loadProducts = useCallback(async (source: 'initial' | 'refresh' | 'create' | 'update' = 'refresh') => {
    setIsLoading(true);
    setLoadError('');

    try {
      const loadedProducts = await fetchProducts();
      setProducts(loadedProducts);

      if (source === 'initial') {
        setStatusMessage(`Loaded ${loadedProducts.length.toLocaleString()} items from the backend simulation.`);
      } else if (source === 'refresh') {
        setStatusMessage(`Refreshed ${loadedProducts.length.toLocaleString()} items from backend.`);
      } else if (source === 'update') {
        setStatusMessage(`Product updated. Listing refreshed with ${loadedProducts.length.toLocaleString()} items.`);
      } else {
        setStatusMessage(`Product saved. Listing refreshed with ${loadedProducts.length.toLocaleString()} items.`);
      }
    } catch (error) {
      console.error('Failed to load products:', error);
      setLoadError('Unable to load products from backend. Please try again.');
      setStatusMessage('');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProducts('initial');
  }, [loadProducts]);

  const baseFilteredProducts = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return products.filter((product) => {
      const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;
      if (!matchesCategory) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      return [product.name, product.barcode, product.description].join(' ').toLowerCase().includes(normalizedQuery);
    });
  }, [products, searchQuery, selectedCategory]);

  const filteredProducts = useMemo(
    () => baseFilteredProducts.filter((product) => matchesInventoryFilter(product, inventoryFilter)),
    [baseFilteredProducts, inventoryFilter],
  );

  const inventorySummary = useMemo(() => getInventorySummary(baseFilteredProducts), [baseFilteredProducts]);

  useEffect(() => {
    setSelectedRowIndex((currentIndex) => {
      if (filteredProducts.length === 0) {
        return -1;
      }

      if (currentIndex < 0) {
        return 0;
      }

      return Math.min(currentIndex, filteredProducts.length - 1);
    });
  }, [filteredProducts]);

  useEffect(() => {
    if (selectedRowIndex < 0 || selectedRowIndex >= filteredProducts.length) {
      return;
    }

    const selectedProduct = filteredProducts[selectedRowIndex];
    rowRefs.current.get(selectedProduct.id)?.scrollIntoView({ block: 'nearest' });
  }, [filteredProducts, selectedRowIndex]);

  const closeDialog = useCallback(() => {
    setIsAddDialogOpen(false);
    setEditingProductId(null);
    setFormState(createInitialFormState());
  }, []);

  const openNewDialog = () => {
    setEditingProductId(null);
    setFormState(createInitialFormState());
    setIsAddDialogOpen(true);
  };

  const openEditDialog = (product: Product) => {
    setEditingProductId(product.id);
    setFormState({
      name: product.name,
      barcode: product.barcode,
      category: product.category,
      description: product.description,
      unitPrice: String(product.unitPrice),
      stockQuantity: String(product.stockQuantity),
      reorderLevel: String(product.reorderLevel),
    });
    setIsAddDialogOpen(true);
  };

  useEffect(() => {
    if (!isAddDialogOpen) {
      return;
    }

    const handleWindowKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || isSaving) {
        return;
      }

      event.preventDefault();
      closeDialog();
    };

    window.addEventListener('keydown', handleWindowKeyDown);
    return () => window.removeEventListener('keydown', handleWindowKeyDown);
  }, [closeDialog, isAddDialogOpen, isSaving]);

  const handleOpenPreview = (autoPrint: boolean) => {
    if (filteredProducts.length === 0) {
      setStatusMessage('There are no filtered products to preview or print.');
      return;
    }

    const previewWindow = window.open('', '_blank', 'width=1200,height=800');
    if (!previewWindow) {
      setStatusMessage('Unable to open print preview. Please allow pop-ups and try again.');
      return;
    }

    const html = buildPrintMarkup(filteredProducts, searchQuery, selectedCategory, autoPrint);
    const blob = new Blob([html], { type: 'text/html' });
    const previewUrl = URL.createObjectURL(blob);

    previewWindow.location.replace(previewUrl);
    previewWindow.focus();
    window.setTimeout(() => URL.revokeObjectURL(previewUrl), 60_000);

    setStatusMessage(autoPrint ? 'Opening browser print dialog for the filtered products.' : 'Print preview opened in a new window.');
  };

  const handleExportPdf = async () => {
    if (filteredProducts.length === 0) {
      setStatusMessage('There are no filtered products to export.');
      return;
    }

    try {
      setStatusMessage('Preparing PDF export...');

      const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
        import('jspdf'),
        import('jspdf-autotable'),
      ]);

      const document = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
      const generatedAt = new Date().toLocaleString();

      document.setFontSize(18);
      document.text('Product Listing', 40, 36);
      document.setFontSize(10);
      document.text(`Generated: ${generatedAt}`, 40, 54);
      document.text(`Search: ${searchQuery || 'All items'}`, 40, 68);
      document.text(`Category: ${selectedCategory}`, 40, 82);
      document.text(`Rows: ${filteredProducts.length.toLocaleString()}`, 40, 96);

      autoTable(document, {
        startY: 112,
        head: [['Barcode', 'Name', 'Category', 'Stock', 'Reorder Level', 'Suggested Reorder', 'Unit Price']],
        body: filteredProducts.map((product) => [
          product.barcode,
          product.name,
          product.category,
          product.stockQuantity.toLocaleString(),
          product.reorderLevel.toLocaleString(),
          getSuggestedReorderQuantity(product).toLocaleString(),
          formatCurrency(product.unitPrice),
        ]),
        styles: { fontSize: 8, cellPadding: 5 },
        headStyles: { fillColor: [70, 85, 232] },
        margin: { left: 40, right: 40 },
      });

      document.save(`products-${new Date().toISOString().slice(0, 10)}.pdf`);
      setStatusMessage('PDF export completed for the current filtered products.');
    } catch (error) {
      console.error('Failed to export products PDF:', error);
      setStatusMessage('Unable to export PDF right now. Please try again.');
    }
  };

  const handleCreateOrUpdateProduct = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedName = formState.name.trim();
    const trimmedBarcode = formState.barcode.trim();
    const parsedUnitPrice = Number(formState.unitPrice);
    const parsedStockQuantity = Number(formState.stockQuantity);
    const parsedReorderLevel = Number(formState.reorderLevel);

    if (!trimmedName || !trimmedBarcode) {
      setStatusMessage('Name and barcode are required to create a product.');
      return;
    }

    if (Number.isNaN(parsedUnitPrice) || parsedUnitPrice < 0) {
      setStatusMessage('Enter a valid unit price.');
      return;
    }

    if (!Number.isInteger(parsedStockQuantity) || parsedStockQuantity < 0) {
      setStatusMessage('Enter a valid stock quantity.');
      return;
    }

    if (!Number.isInteger(parsedReorderLevel) || parsedReorderLevel < 0) {
      setStatusMessage('Enter a valid reorder level.');
      return;
    }

    const nextProduct: NewProductInput = {
      name: trimmedName,
      barcode: trimmedBarcode,
      category: formState.category,
      description: formState.description.trim(),
      unitPrice: parsedUnitPrice,
      stockQuantity: parsedStockQuantity,
      reorderLevel: parsedReorderLevel,
    };

    setIsSaving(true);

    try {
      if (isEditMode && editingProductId) {
        const updatedProduct = await updateProduct(editingProductId, nextProduct);
        closeDialog();
        setStatusMessage(`${updatedProduct.name} updated successfully. Refreshing listing...`);
        await loadProducts('update');
        return;
      }

      const createdProduct = await createProduct(nextProduct);
      closeDialog();
      setStatusMessage(`${createdProduct.name} created successfully. Refreshing listing...`);
      await loadProducts('create');
    } catch (error) {
      console.error('Failed to save product:', error);
      setStatusMessage(error instanceof Error ? error.message : 'Unable to save product.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerateBarcode = () => {
    setFormState((current) => ({
      ...current,
      barcode: generateProductBarcode(),
    }));
  };

  const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    setIsImporting(true);

    try {
      const [{ read, utils }, buffer] = await Promise.all([import('xlsx'), file.arrayBuffer()]);
      const workbook = read(buffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[firstSheetName];
      const rows = utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
      const parsedRows = parseImportedProducts(rows);
      const result = await importProducts(parsedRows.products);
      await loadProducts('refresh');
      setStatusMessage(
        `Import completed. Created ${result.created}, updated ${result.updated}, skipped ${result.skipped + parsedRows.skipped}.`,
      );
    } catch (error) {
      console.error('Failed to import products:', error);
      setStatusMessage('Unable to import the selected CSV/Excel file. Please verify the column names and file format.');
    } finally {
      setIsImporting(false);
    }
  };

  const handleCopyBarcode = async (product: Product) => {
    try {
      await copyBarcodeToClipboard(product.barcode);
      setStatusMessage(`Barcode copied for ${product.name}.`);
    } catch (error) {
      console.error('Failed to copy barcode:', error);
      setStatusMessage('Unable to copy barcode right now.');
    }
  };

  const handleArchiveProduct = async (product: Product) => {
    if (!window.confirm(`Archive ${product.name}? Archived products will be removed from the active listing.`)) {
      return;
    }

    try {
      await archiveProduct(product.id);
      await loadProducts('refresh');
      setStatusMessage(`${product.name} archived successfully.`);
    } catch (error) {
      console.error('Failed to archive product:', error);
      setStatusMessage(error instanceof Error ? error.message : 'Unable to archive product.');
    }
  };

  const handleDeleteProduct = async (product: Product) => {
    if (!window.confirm(`Delete ${product.name}? This action cannot be undone.`)) {
      return;
    }

    try {
      await deleteProduct(product.id);
      await loadProducts('refresh');
      setStatusMessage(`${product.name} deleted successfully.`);
    } catch (error) {
      console.error('Failed to delete product:', error);
      setStatusMessage(error instanceof Error ? error.message : 'Unable to delete product.');
    }
  };

  const handleDownloadImportTemplate = () => {
    const templateRows = [
      'name,barcode,category,description,unitPrice,stockQuantity,reorderLevel',
      'Wireless Mouse,7800000000001,Accessories,Sample imported product,24.99,45,12',
    ].join('\n');

    const blob = new Blob([templateRows], { type: 'text/csv;charset=utf-8;' });
    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = 'product-import-template.csv';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(downloadUrl);
    setStatusMessage('CSV import template downloaded.');
  };

  return (
    <section className="panel page-section">
      <div className={styles.pageToolbar}>
        <span className={styles.toolbarTitle}>Product Listing</span>

        <div className={styles.actionBar}>
          <button className={`${styles.toolbarBtn} ${styles.toolbarBtnAdd}`} type="button" onClick={openNewDialog}>
            <Icon name="plus circle" />
            New
          </button>
          <button
            className={`${styles.toolbarBtn} ${styles.toolbarBtnTemplate}`}
            type="button"
            onClick={handleDownloadImportTemplate}
          >
            <Icon name="download" />
            Template
          </button>
          <button
            className={`${styles.toolbarBtn} ${styles.toolbarBtnImport}`}
            type="button"
            disabled={isImporting}
            onClick={() => importInputRef.current?.click()}
          >
            <Icon name={isImporting ? 'spinner' : 'upload'} loading={isImporting} />
            Import
          </button>
          <button
            className={`${styles.toolbarBtn} ${styles.toolbarBtnRefresh}`}
            type="button"
            disabled={isLoading}
            onClick={() => void loadProducts('refresh')}
          >
            <Icon name={isLoading ? 'spinner' : 'refresh'} loading={isLoading} />
            Refresh
          </button>
          <button className={`${styles.toolbarBtn} ${styles.toolbarBtnPreview}`} type="button" onClick={() => handleOpenPreview(false)}>
            <Icon name="eye" />
            Preview
          </button>
          <button className={`${styles.toolbarBtn} ${styles.toolbarBtnPrint}`} type="button" onClick={() => handleOpenPreview(true)}>
            <Icon name="print" />
            Print
          </button>
          <button className={`${styles.toolbarBtn} ${styles.toolbarBtnPdf}`} type="button" onClick={() => void handleExportPdf()}>
            <Icon name="file pdf outline" />
            Export PDF
          </button>
        </div>
      </div>

      <input ref={importInputRef} type="file" accept=".csv,.xlsx,.xls" className={styles.hiddenInput} onChange={(event) => void handleImportFile(event)} />

      <div className={styles.summaryCards}>
        <button
          type="button"
          className={`${styles.summaryCard} ${inventoryFilter === 'All' ? styles.summaryCardActive : ''}`}
          onClick={() => setInventoryFilter('All')}
        >
          <span>Total products</span>
          <strong>{inventorySummary.total.toLocaleString()}</strong>
        </button>
        <button
          type="button"
          className={`${styles.summaryCard} ${inventoryFilter === 'Low Stock' ? styles.summaryCardActive : ''}`}
          onClick={() => setInventoryFilter('Low Stock')}
        >
          <span>Low stock</span>
          <strong>{inventorySummary.lowStock.toLocaleString()}</strong>
        </button>
        <button
          type="button"
          className={`${styles.summaryCard} ${inventoryFilter === 'Out of Stock' ? styles.summaryCardActive : ''}`}
          onClick={() => setInventoryFilter('Out of Stock')}
        >
          <span>Out of stock</span>
          <strong>{inventorySummary.outOfStock.toLocaleString()}</strong>
        </button>
        <button
          type="button"
          className={`${styles.summaryCard} ${inventoryFilter === 'Needs Reorder' ? styles.summaryCardActive : ''}`}
          onClick={() => setInventoryFilter('Needs Reorder')}
        >
          <span>Needs reorder</span>
          <strong>{inventorySummary.needsReorder.toLocaleString()}</strong>
        </button>
        <article className={styles.summaryCard}>
          <span>Inventory value</span>
          <strong>{formatCurrency(inventorySummary.inventoryValue)}</strong>
        </article>
      </div>

      <div className={`form-card ${styles.filtersCard}`}>
        <div className={styles.filtersRow}>
          <label className={`field ${styles.searchField}`}>
            <span>Search by name or barcode</span>
            <div className={styles.searchInputShell}>
              <Icon name="search" className={styles.searchIcon} />
              <input
                type="text"
                value={searchQuery}
                placeholder="Search"
                onChange={(event) => setSearchQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (filteredProducts.length === 0) {
                    return;
                  }

                  if (event.key === 'ArrowDown') {
                    event.preventDefault();
                    setSelectedRowIndex((current) => (current < 0 ? 0 : Math.min(current + 1, filteredProducts.length - 1)));
                    return;
                  }

                  if (event.key === 'ArrowUp') {
                    event.preventDefault();
                    setSelectedRowIndex((current) => (current <= 0 ? 0 : current - 1));
                    return;
                  }

                  if (event.key === 'Enter') {
                    event.preventDefault();
                    if (selectedRowIndex >= 0 && selectedRowIndex < filteredProducts.length) {
                      openEditDialog(filteredProducts[selectedRowIndex]);
                    }
                  }
                }}
              />
            </div>
          </label>

          <label className={`field field--compact ${styles.categoryField}`}>
            <span>Category</span>
            <select value={selectedCategory} onChange={(event) => setSelectedCategory(event.target.value as CategoryFilter)}>
              <option value="All">All categories</option>
              {productCategories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>

          <label className={`field field--compact ${styles.inventoryField}`}>
            <span>Inventory</span>
            <select value={inventoryFilter} onChange={(event) => setInventoryFilter(event.target.value as ProductInventoryFilter)}>
              {inventoryFilterOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className={styles.summaryRow}>
          <span>
            Showing <strong>{filteredProducts.length.toLocaleString()}</strong> of <strong>{baseFilteredProducts.length.toLocaleString()}</strong> matching items
          </span>
          {statusMessage ? <span className={styles.statusMessage}>{statusMessage}</span> : null}
        </div>
        <p className={styles.tableHint}>
          Tip: Use ↑ ↓ to move the selected row, Enter to edit, double-click to edit, and inline actions to view details or barcode tools.
        </p>
      </div>

      <div className={`form-card ${styles.listCard}`}>
        {isLoading ? (
          <div className={styles.loadingState}>
            <Icon loading name="spinner" size="big" />
            <strong>Loading products from backend...</strong>
            <p>Please wait while the API simulation returns the latest product catalog.</p>
          </div>
        ) : loadError ? (
          <div className={styles.emptyState}>
            <strong>{loadError}</strong>
            <button className="button" type="button" onClick={() => void loadProducts('refresh')}>
              Retry load
            </button>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className={styles.emptyState}>
            <strong>No products found</strong>
            <p>Adjust the search text or filters to see matching items.</p>
          </div>
        ) : (
          <div
            ref={tableShellRef}
            className={styles.tableShell}
            tabIndex={0}
            role="region"
            aria-label="Products results table"
            onKeyDown={(event) => {
              if (filteredProducts.length === 0) {
                return;
              }

              if (event.key === 'ArrowDown') {
                event.preventDefault();
                setSelectedRowIndex((current) => (current < 0 ? 0 : Math.min(current + 1, filteredProducts.length - 1)));
                return;
              }

              if (event.key === 'ArrowUp') {
                event.preventDefault();
                setSelectedRowIndex((current) => (current <= 0 ? 0 : current - 1));
                return;
              }

              if (event.key === 'Enter') {
                event.preventDefault();
                if (selectedRowIndex >= 0 && selectedRowIndex < filteredProducts.length) {
                  openEditDialog(filteredProducts[selectedRowIndex]);
                }
              }
            }}
          >
            <table className={styles.productsTable}>
              <thead>
                <tr>
                  <th>Barcode</th>
                  <th>Name</th>
                  <th>Category</th>
                  <th>Status</th>
                  <th>Stock Qty</th>
                  <th>Reorder Level</th>
                  <th>Suggested Reorder</th>
                  <th>Unit Price</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product, index) => {
                  const suggestedReorder = getSuggestedReorderQuantity(product);

                  return (
                    <tr
                      key={product.id}
                      ref={(row) => {
                        if (row) {
                          rowRefs.current.set(product.id, row);
                        } else {
                          rowRefs.current.delete(product.id);
                        }
                      }}
                      className={filteredProducts[selectedRowIndex]?.id === product.id ? styles.selectedRow : ''}
                      onClick={() => {
                        setSelectedRowIndex(index);
                        tableShellRef.current?.focus();
                      }}
                      onDoubleClick={() => openEditDialog(product)}
                    >
                      <td className={styles.barcodeCell}>{product.barcode}</td>
                      <td>
                        <div className={styles.nameCell}>
                          <strong>{product.name}</strong>
                          <span>{product.description || 'No description'}</span>
                        </div>
                      </td>
                      <td>
                        <span className={styles.categoryBadge}>{product.category}</span>
                      </td>
                      <td>
                        <ProductStockBadge product={product} />
                      </td>
                      <td className={styles.numericCell}>{product.stockQuantity.toLocaleString()}</td>
                      <td className={styles.numericCell}>{product.reorderLevel.toLocaleString()}</td>
                      <td>
                        {suggestedReorder > 0 ? (
                          <span className={styles.reorderPill}>Order {suggestedReorder.toLocaleString()}</span>
                        ) : (
                          <span className={styles.reorderOk}>Healthy</span>
                        )}
                      </td>
                      <td className={styles.numericCell}>{formatCurrency(product.unitPrice)}</td>
                      <td>
                        <div className={styles.rowActions}>
                          <Link
                            className="text-button"
                            to={`/products/${product.id}`}
                            onClick={(event) => event.stopPropagation()}
                          >
                            View
                          </Link>
                          <button
                            className="text-button"
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              openEditDialog(product);
                            }}
                          >
                            Edit
                          </button>
                          <button
                            className="text-button"
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              void handleCopyBarcode(product);
                            }}
                          >
                            Copy
                          </button>
                          <button
                            className="text-button"
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              setBarcodeLabelProduct(product);
                            }}
                          >
                            Label
                          </button>
                          <button
                            className="text-button"
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              void handleArchiveProduct(product);
                            }}
                          >
                            Archive
                          </button>
                          <button
                            className="text-button"
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              void handleDeleteProduct(product);
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ProductFormDialog
        isOpen={isAddDialogOpen}
        isEditMode={isEditMode}
        isSaving={isSaving}
        value={formState}
        categories={productCategories}
        onClose={closeDialog}
        onSubmit={handleCreateOrUpdateProduct}
        onValueChange={setFormState}
        onGenerateBarcode={handleGenerateBarcode}
      />
      <BarcodeLabelDialog
        isOpen={barcodeLabelProduct !== null}
        product={barcodeLabelProduct}
        onClose={() => setBarcodeLabelProduct(null)}
        onStatusChange={(message) => setStatusMessage(message)}
      />
    </section>
  );
};
