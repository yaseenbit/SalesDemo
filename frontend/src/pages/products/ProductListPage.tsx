import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from 'semantic-ui-react';
import { ProductFormDialog, type ProductFormValues } from '../../components/products/ProductFormDialog';
import { createProduct, fetchProducts, productCategories, updateProduct } from '../../services/productApi';
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
  barcode: '',
  category: productCategories[0],
  unitPrice: '',
  stockQuantity: '',
});

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
          <td style="text-align:right;">${escapeHtml(formatCurrency(product.unitPrice))}</td>
          <td style="text-align:right;">${product.stockQuantity}</td>
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
        tbody tr:nth-child(even) {
          background: #f8fafc;
        }
        @media print {
          body {
            margin: 0;
          }
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
            <th>Unit Price</th>
            <th>Stock Qty</th>
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
  const [selectedRowIndex, setSelectedRowIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formState, setFormState] = useState<ProductFormValues>(createInitialFormState);
  const rowRefs = useRef<Map<string, HTMLTableRowElement>>(new Map());
  const tableShellRef = useRef<HTMLDivElement>(null);

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

  const filteredProducts = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return products.filter((product) => {
      const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;
      if (!matchesCategory) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      return (
        product.name.toLowerCase().includes(normalizedQuery) || product.barcode.toLowerCase().includes(normalizedQuery)
      );
    });
  }, [products, searchQuery, selectedCategory]);

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
    const row = rowRefs.current.get(selectedProduct.id);
    row?.scrollIntoView({ block: 'nearest' });
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
      unitPrice: String(product.unitPrice),
      stockQuantity: String(product.stockQuantity),
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

    const printWindow = window.open('', '_blank', 'width=1200,height=800');
    if (!printWindow) {
      setStatusMessage('Unable to open print preview. Please allow pop-ups and try again.');
      return;
    }

    const html = buildPrintMarkup(filteredProducts, searchQuery, selectedCategory, autoPrint);
    const blob = new Blob([html], { type: 'text/html' });
    const previewUrl = URL.createObjectURL(blob);

    printWindow.location.replace(previewUrl);
    printWindow.focus();

    window.setTimeout(() => URL.revokeObjectURL(previewUrl), 60_000);

    if (autoPrint) {
      setStatusMessage('Opening browser print dialog for the filtered products.');
      return;
    }

    setStatusMessage('Print preview opened in a new window.');
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
        head: [['Barcode', 'Name', 'Category', 'Unit Price', 'Stock Qty']],
        body: filteredProducts.map((product) => [
          product.barcode,
          product.name,
          product.category,
          formatCurrency(product.unitPrice),
          product.stockQuantity.toLocaleString(),
        ]),
        styles: { fontSize: 8, cellPadding: 5 },
        headStyles: { fillColor: [70, 85, 232] },
        columnStyles: {
          0: { cellWidth: 110 },
          1: { cellWidth: 230 },
          2: { cellWidth: 90 },
          3: { halign: 'right' },
          4: { halign: 'right' },
        },
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

    const nextProduct: NewProductInput = {
      name: trimmedName,
      barcode: trimmedBarcode,
      category: formState.category,
      unitPrice: parsedUnitPrice,
      stockQuantity: parsedStockQuantity,
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
      console.error('Failed to create product:', error);
      setStatusMessage(error instanceof Error ? error.message : 'Unable to create product.');
    } finally {
      setIsSaving(false);
    }
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
            Print Preview
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

    

      <div className={`form-card ${styles.filtersCard}`}>
        <div className={styles.filtersRow}>
          <label className={`field ${styles.searchField}`}>
            <span>Search by name or barcode</span>
            <div className={styles.searchInputShell}>
              <Icon name="search" className={styles.searchIcon} />
              <input
                type="text"
                value={searchQuery}
                placeholder="Type product name or barcode"
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
                    if (selectedRowIndex < 0 || selectedRowIndex >= filteredProducts.length) {
                      return;
                    }

                    event.preventDefault();
                    openEditDialog(filteredProducts[selectedRowIndex]);
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
        </div>

        <div className={styles.summaryRow}>
          <span>
            Showing <strong>{filteredProducts.length.toLocaleString()}</strong> of <strong>{products.length.toLocaleString()}</strong> items
          </span>
          {statusMessage ? <span className={styles.statusMessage}>{statusMessage}</span> : null}
        </div>
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
              <p>Adjust the search text or category filter to see matching items.</p>
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
                    if (selectedRowIndex < 0 || selectedRowIndex >= filteredProducts.length) {
                      return;
                    }

                    event.preventDefault();
                    openEditDialog(filteredProducts[selectedRowIndex]);
                  }
                }}
            >
              <table className={styles.productsTable}>
                <thead>
                <tr>
                  <th>Barcode</th>
                  <th>Name</th>
                  <th>Category</th>
                  <th>Unit Price</th>
                  <th>Stock Qty</th>
                  <th>Created</th>
                </tr>
                </thead>
                <tbody>
                {filteredProducts.map((product, index) => (
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
                      <td>{product.barcode}</td>
                      <td>{product.name}</td>
                      <td>
                        <span className={styles.categoryBadge}>{product.category}</span>
                      </td>
                      <td className={styles.numericCell}>{formatCurrency(product.unitPrice)}</td>
                      <td className={styles.numericCell}>{product.stockQuantity.toLocaleString()}</td>
                      <td>{new Date(product.createdAt).toLocaleDateString()}</td>
                    </tr>
                ))}
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
      />
    </section>
  );
};
