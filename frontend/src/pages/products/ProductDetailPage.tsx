import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Icon } from 'semantic-ui-react';
import { BarcodeLabelDialog } from '../../components/products/BarcodeLabelDialog';
import { ProductFormDialog, type ProductFormValues } from '../../components/products/ProductFormDialog';
import { ProductStockBadge } from '../../components/products/ProductStockBadge';
import { copyBarcodeToClipboard } from '../../components/products/barcodeTools';
import { getProductStockStatus, getSuggestedReorderQuantity } from '../../components/products/productInventory';
import {
  archiveProduct,
  deleteProduct,
  fetchProductById,
  generateProductBarcode,
  productCategories,
  updateProduct,
} from '../../services/productApi';
import type { NewProductInput, Product } from '../../types';
import styles from './ProductDetailPage.module.css';

const createFormValues = (product: Product): ProductFormValues => ({
  name: product.name,
  barcode: product.barcode,
  category: product.category,
  description: product.description,
  unitPrice: String(product.unitPrice),
  stockQuantity: String(product.stockQuantity),
  reorderLevel: String(product.reorderLevel),
});

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const ProductDetailPage = () => {
  const navigate = useNavigate();
  const { productId } = useParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isBarcodeDialogOpen, setIsBarcodeDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formState, setFormState] = useState<ProductFormValues | null>(null);

  const loadProduct = useCallback(async () => {
    if (!productId) {
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      const nextProduct = await fetchProductById(productId);
      if (!nextProduct) {
        setProduct(null);
        setErrorMessage('Product not found.');
        return;
      }

      setProduct(nextProduct);
      setFormState(createFormValues(nextProduct));
    } catch (error) {
      console.error('Failed to load product details:', error);
      setErrorMessage('Unable to load product details right now.');
    } finally {
      setIsLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    void loadProduct();
  }, [loadProduct]);

  useEffect(() => {
    if (!isEditDialogOpen) {
      return;
    }

    const handleWindowKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || isSaving) {
        return;
      }

      event.preventDefault();
      setIsEditDialogOpen(false);
      if (product) {
        setFormState(createFormValues(product));
      }
    };

    window.addEventListener('keydown', handleWindowKeyDown);
    return () => window.removeEventListener('keydown', handleWindowKeyDown);
  }, [isEditDialogOpen, isSaving, product]);

  const stockStatus = useMemo(() => (product ? getProductStockStatus(product) : null), [product]);
  const suggestedReorderQuantity = useMemo(() => (product ? getSuggestedReorderQuantity(product) : 0), [product]);

  if (isLoading) {
    return (
      <section className="panel page-section">
        <div className={styles.loadingState}>
          <Icon name="spinner" loading size="big" />
          <strong>Loading product details...</strong>
        </div>
      </section>
    );
  }

  if (!product) {
    return (
      <section className="panel page-section">
        <div className="empty-state">
          <strong>{errorMessage || 'Product not found.'}</strong>
          <Link className="button" to="/products">
            Back to product listing
          </Link>
        </div>
      </section>
    );
  }

  const handleCloseDialog = () => {
    setIsEditDialogOpen(false);
    setFormState(createFormValues(product));
  };

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!product || !formState) {
      return;
    }

    const trimmedName = formState.name.trim();
    const trimmedBarcode = formState.barcode.trim();
    const parsedUnitPrice = Number(formState.unitPrice);
    const parsedStockQuantity = Number(formState.stockQuantity);
    const parsedReorderLevel = Number(formState.reorderLevel);

    if (!trimmedName || !trimmedBarcode) {
      setStatusMessage('Name and barcode are required.');
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
      const savedProduct = await updateProduct(product.id, nextProduct);
      setProduct(savedProduct);
      setFormState(createFormValues(savedProduct));
      setStatusMessage(`${savedProduct.name} updated successfully.`);
      setIsEditDialogOpen(false);
    } catch (error) {
      console.error('Failed to update product details:', error);
      setStatusMessage(error instanceof Error ? error.message : 'Unable to save product changes.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerateBarcode = () => {
    if (!formState) {
      return;
    }

    setFormState({
      ...formState,
      barcode: generateProductBarcode(),
    });
  };

  const handleCopyBarcode = async () => {
    try {
      await copyBarcodeToClipboard(product.barcode);
      setStatusMessage('Barcode copied to clipboard.');
    } catch (error) {
      console.error('Failed to copy barcode:', error);
      setStatusMessage('Unable to copy barcode right now.');
    }
  };

  const handleArchive = async () => {
    if (!window.confirm(`Archive ${product.name}? It will be removed from the active product listing.`)) {
      return;
    }

    try {
      await archiveProduct(product.id);
      navigate('/products', { replace: true });
    } catch (error) {
      console.error('Failed to archive product:', error);
      setStatusMessage(error instanceof Error ? error.message : 'Unable to archive product.');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete ${product.name}? This action cannot be undone.`)) {
      return;
    }

    try {
      await deleteProduct(product.id);
      navigate('/products', { replace: true });
    } catch (error) {
      console.error('Failed to delete product:', error);
      setStatusMessage(error instanceof Error ? error.message : 'Unable to delete product.');
    }
  };

  return (
    <section className="panel page-section">
      <div className="page-header">
        <div>
          <p className="eyebrow">Products</p>
          <h2>{product.name}</h2>
          <p className="lead-text">View inventory details, reorder suggestions, and barcode tools for this product.</p>
        </div>
        <div className={styles.headerActions}>
          <Link className="button button--secondary" to="/products">
            Back to list
          </Link>
          <button className="button" type="button" onClick={() => setIsEditDialogOpen(true)}>
            Edit product
          </button>
        </div>
      </div>

      <div className={styles.summaryGrid}>
        <article className={styles.metricCard}>
          <span className={styles.metricLabel}>Stock status</span>
          <ProductStockBadge product={product} />
        </article>
        <article className={styles.metricCard}>
          <span className={styles.metricLabel}>Available quantity</span>
          <strong>{product.stockQuantity.toLocaleString()}</strong>
        </article>
        <article className={styles.metricCard}>
          <span className={styles.metricLabel}>Reorder level</span>
          <strong>{product.reorderLevel.toLocaleString()}</strong>
        </article>
        <article className={styles.metricCard}>
          <span className={styles.metricLabel}>Suggested reorder</span>
          <strong>{suggestedReorderQuantity.toLocaleString()}</strong>
        </article>
      </div>

      <div className={styles.detailLayout}>
        <div className={styles.detailColumn}>
          <article className={`form-card ${styles.infoCard}`}>
            <h3>Product information</h3>
            <dl className={styles.detailList}>
              <div>
                <dt>Barcode</dt>
                <dd>{product.barcode}</dd>
              </div>
              <div>
                <dt>Category</dt>
                <dd>{product.category}</dd>
              </div>
              <div>
                <dt>Unit price</dt>
                <dd>{currencyFormatter.format(product.unitPrice)}</dd>
              </div>
              <div>
                <dt>Created</dt>
                <dd>{new Date(product.createdAt).toLocaleString()}</dd>
              </div>
              <div className={styles.detailDescriptionRow}>
                <dt>Description</dt>
                <dd>{product.description || 'No description added yet.'}</dd>
              </div>
            </dl>
          </article>

          <article className={`form-card ${styles.infoCard}`}>
            <h3>Reorder guidance</h3>
            <p className={styles.reorderMessage}>
              {stockStatus === 'Out of Stock'
                ? `This item is out of stock. Reorder at least ${suggestedReorderQuantity.toLocaleString()} units now.`
                : stockStatus === 'Low Stock'
                  ? `Stock is below or at the reorder threshold. Suggested reorder quantity: ${suggestedReorderQuantity.toLocaleString()} units.`
                  : 'Inventory is healthy and currently above the reorder threshold.'}
            </p>
            <div className={styles.reorderMeta}>
              <span>Current stock: {product.stockQuantity.toLocaleString()}</span>
              <span>Reorder level: {product.reorderLevel.toLocaleString()}</span>
              <span>Suggested order: {suggestedReorderQuantity.toLocaleString()}</span>
            </div>
          </article>
        </div>

        <aside className={styles.toolsColumn}>
          <article className={`form-card ${styles.toolsCard}`}>
            <h3>Barcode tools</h3>
            <div className={styles.barcodeBox}>
              <span className={styles.barcodeLabel}>Barcode</span>
              <strong>{product.barcode}</strong>
            </div>
            <div className={styles.toolsActions}>
              <button className="button button--secondary" type="button" onClick={handleCopyBarcode}>
                Copy barcode
              </button>
              <button className="button button--secondary" type="button" onClick={() => setIsBarcodeDialogOpen(true)}>
                Label options
              </button>
            </div>
            <p className={styles.toolsHint}>Barcode tools let users copy the barcode and choose a label format before previewing or printing.</p>
          </article>

          <article className={`form-card ${styles.toolsCard}`}>
            <h3>Quick actions</h3>
            <div className={styles.toolsActionsStack}>
              <button className="button button--secondary" type="button" onClick={() => setIsEditDialogOpen(true)}>
                Edit inventory details
              </button>
              <button className="button button--secondary" type="button" onClick={handleArchive}>
                Archive product
              </button>
              <button className={styles.deleteButton} type="button" onClick={handleDelete}>
                Delete product
              </button>
              <button className="button button--secondary" type="button" onClick={() => navigate('/products')}>
                Return to listing
              </button>
            </div>
          </article>
        </aside>
      </div>

      {statusMessage ? <p className={styles.statusMessage}>{statusMessage}</p> : null}

      {formState ? (
        <ProductFormDialog
          isOpen={isEditDialogOpen}
          isEditMode
          isSaving={isSaving}
          value={formState}
          categories={productCategories}
          onClose={handleCloseDialog}
          onSubmit={handleSave}
          onValueChange={setFormState}
          onGenerateBarcode={handleGenerateBarcode}
        />
      ) : null}
      <BarcodeLabelDialog
        isOpen={isBarcodeDialogOpen}
        product={product}
        onClose={() => setIsBarcodeDialogOpen(false)}
        onStatusChange={(message) => setStatusMessage(message)}
      />
    </section>
  );
};

