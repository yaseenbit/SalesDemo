import type { FormEvent } from 'react';
import { Icon } from 'semantic-ui-react';
import { NumericTextBox } from '../NumericTextBox';
import type { ProductCategory } from '../../types';
import styles from './ProductFormDialog.module.css';

export interface ProductFormValues {
  name: string;
  barcode: string;
  category: ProductCategory;
  unitPrice: string;
  stockQuantity: string;
}

interface ProductFormDialogProps {
  isOpen: boolean;
  isEditMode: boolean;
  isSaving: boolean;
  value: ProductFormValues;
  categories: ProductCategory[];
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onValueChange: (value: ProductFormValues) => void;
}

export const ProductFormDialog = ({
  isOpen,
  isEditMode,
  isSaving,
  value,
  categories,
  onClose,
  onSubmit,
  onValueChange,
}: ProductFormDialogProps) => {
  if (!isOpen) {
    return null;
  }

  const updateField = <TKey extends keyof ProductFormValues>(field: TKey, fieldValue: ProductFormValues[TKey]) => {
    onValueChange({
      ...value,
      [field]: fieldValue,
    });
  };

  return (
    <div className={styles.dialogOverlay} role="presentation" onClick={() => !isSaving && onClose()}>
      <section
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-label={isEditMode ? 'Edit product' : 'Add new product'}
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.dialogHeader}>
          <div>
            <p className="eyebrow">Products</p>
            <h3>{isEditMode ? 'Edit item' : 'Add new item'}</h3>
          </div>
          <button className={styles.closeButton} type="button" onClick={onClose} disabled={isSaving}>
            Close
          </button>
        </div>

        <form className={styles.dialogForm} onSubmit={onSubmit}>
          <div className="form-grid form-grid--three">
            <label className="field field--full">
              <span>Item name</span>
              <input
                type="text"
                value={value.name}
                onChange={(event) => updateField('name', event.target.value)}
                placeholder="Enter product name"
                required
              />
            </label>

            <label className="field">
              <span>Barcode</span>
              <NumericTextBox
                value={value.barcode}
                onValueChange={(barcode) => updateField('barcode', barcode)}
                placeholder="Numeric barcode"
                required
              />
            </label>

            <label className="field">
              <span>Category</span>
              <select
                value={value.category}
                onChange={(event) => updateField('category', event.target.value as ProductCategory)}
              >
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Unit price</span>
              <NumericTextBox
                value={value.unitPrice}
                allowDecimal
                onValueChange={(unitPrice) => updateField('unitPrice', unitPrice)}
                placeholder="0.00"
                required
              />
            </label>

            <label className="field">
              <span>Stock quantity</span>
              <NumericTextBox
                value={value.stockQuantity}
                onValueChange={(stockQuantity) => updateField('stockQuantity', stockQuantity)}
                placeholder="0"
                required
              />
            </label>
          </div>

          <div className={styles.dialogActions}>
            <button className="button" type="submit" disabled={isSaving}>
              <Icon name={isSaving ? 'spinner' : 'save'} loading={isSaving} />
              {isEditMode ? 'Save changes' : 'Save product'}
            </button>
            <button className="button button--secondary" type="button" onClick={onClose} disabled={isSaving}>
              Cancel
            </button>
          </div>
        </form>
      </section>
    </div>
  );
};

