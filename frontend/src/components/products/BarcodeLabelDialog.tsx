import { useEffect, useState } from 'react';
import type { Product } from '../../types';
import {
  barcodeLabelFormatOptions,
  openBarcodeLabelPreview,
  type BarcodeLabelFormat,
} from './barcodeTools';
import styles from './BarcodeLabelDialog.module.css';

interface BarcodeLabelDialogProps {
  isOpen: boolean;
  product: Product | null;
  onClose: () => void;
  onStatusChange?: (message: string) => void;
}

export const BarcodeLabelDialog = ({ isOpen, product, onClose, onStatusChange }: BarcodeLabelDialogProps) => {
  const [format, setFormat] = useState<BarcodeLabelFormat>('standard');

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleWindowKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return;
      }

      event.preventDefault();
      onClose();
    };

    window.addEventListener('keydown', handleWindowKeyDown);
    return () => window.removeEventListener('keydown', handleWindowKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !product) {
    return null;
  }

  const handlePreview = (autoPrint: boolean) => {
    const didOpen = openBarcodeLabelPreview(product, format, autoPrint);
    onStatusChange?.(
      didOpen
        ? autoPrint
          ? `${barcodeLabelFormatOptions.find((option) => option.value === format)?.label} print opened for ${product.name}.`
          : `${barcodeLabelFormatOptions.find((option) => option.value === format)?.label} preview opened for ${product.name}.`
        : 'Unable to open barcode label preview. Please allow pop-ups and try again.',
    );
  };

  return (
    <div className={styles.overlay} role="presentation" onClick={onClose}>
      <section
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-label="Barcode label options"
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.header}>
          <div>
            <p className="eyebrow">Barcode tools</p>
            <h3>Barcode label format</h3>
          </div>
          <button className={styles.closeButton} type="button" onClick={onClose}>
            Close
          </button>
        </div>

        <div className={styles.content}>
          <p className={styles.subtitle}>Choose how the barcode label for {product.name} should be formatted.</p>

          <label className="field">
            <span>Label format</span>
            <select value={format} onChange={(event) => setFormat(event.target.value as BarcodeLabelFormat)}>
              {barcodeLabelFormatOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className={styles.actions}>
          <button className="button button--secondary" type="button" onClick={() => handlePreview(false)}>
            Preview label
          </button>
          <button className="button" type="button" onClick={() => handlePreview(true)}>
            Print label
          </button>
        </div>
      </section>
    </div>
  );
};

