import type { Product } from '../../types';

export type BarcodeLabelFormat = 'standard' | 'compact' | 'price-tag';

export const barcodeLabelFormatOptions: Array<{ value: BarcodeLabelFormat; label: string }> = [
  { value: 'standard', label: 'Standard label' },
  { value: 'compact', label: 'Compact label' },
  { value: 'price-tag', label: 'Price tag' },
];

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const createBarcodeBars = (barcode: string) => {
  return barcode
    .split('')
    .map((digit, index) => {
      const digitValue = Number(digit);
      const height = digitValue % 2 === 0 ? 58 : 46;
      const width = index % 3 === 0 ? 4 : 2;
      return `<span style="display:inline-block;width:${width}px;height:${height}px;background:#111;margin-right:1px;"></span>`;
    })
    .join('');
};

const getLabelDimensions = (format: BarcodeLabelFormat) => {
  if (format === 'compact') {
    return { width: 320, padding: 18, titleSize: 16, priceSize: 18, barcodeSize: 18 };
  }

  if (format === 'price-tag') {
    return { width: 360, padding: 20, titleSize: 18, priceSize: 28, barcodeSize: 18 };
  }

  return { width: 420, padding: 22, titleSize: 20, priceSize: 22, barcodeSize: 22 };
};

const buildBarcodeLabelMarkup = (product: Product, format: BarcodeLabelFormat, autoPrint = false) => {
  const dimensions = getLabelDimensions(format);
  const subtitle =
    format === 'compact' ? 'Compact barcode label' : format === 'price-tag' ? 'Retail price tag' : 'Standard barcode label';

  return `<!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Barcode Label</title>
      <style>
        body {
          margin: 0;
          padding: 24px;
          font-family: Arial, sans-serif;
          background: #f8fafc;
          color: #111827;
        }
        .label {
          width: ${dimensions.width}px;
          border: 1px solid #cbd5e1;
          background: #ffffff;
          padding: ${dimensions.padding}px;
          box-shadow: 0 10px 30px rgba(15, 23, 42, 0.12);
        }
        .label h1 {
          margin: 0 0 8px;
          font-size: ${dimensions.titleSize}px;
        }
        .label p {
          margin: 4px 0;
          color: #475569;
        }
        .barcode {
          margin: 20px 0 10px;
          display: flex;
          align-items: flex-end;
          min-height: 58px;
        }
        .barcodeValue {
          margin-top: 8px;
          font-family: monospace;
          font-size: ${dimensions.barcodeSize}px;
          letter-spacing: 0.18em;
          text-align: center;
        }
        .price {
          font-size: ${dimensions.priceSize}px;
          font-weight: 700;
          margin-top: 16px;
        }
      </style>
      ${autoPrint ? '<script>window.addEventListener("load", () => window.print());</script>' : ''}
    </head>
    <body>
      <article class="label">
        <h1>${escapeHtml(product.name)}</h1>
        <p>Category: ${escapeHtml(product.category)}</p>
        <p>${escapeHtml(subtitle)}</p>
        <div class="barcode">${createBarcodeBars(product.barcode)}</div>
        <div class="barcodeValue">${escapeHtml(product.barcode)}</div>
        <div class="price">$${product.unitPrice.toFixed(2)}</div>
      </article>
    </body>
  </html>`;
};

export const openBarcodeLabelPreview = (product: Product, format: BarcodeLabelFormat, autoPrint = false) => {
  const previewWindow = window.open('', '_blank', 'width=640,height=520');
  if (!previewWindow) {
    return false;
  }

  const html = buildBarcodeLabelMarkup(product, format, autoPrint);
  const blob = new Blob([html], { type: 'text/html' });
  const previewUrl = URL.createObjectURL(blob);

  previewWindow.location.replace(previewUrl);
  previewWindow.focus();
  window.setTimeout(() => URL.revokeObjectURL(previewUrl), 60_000);
  return true;
};

export const copyBarcodeToClipboard = async (barcode: string) => {
  await navigator.clipboard.writeText(barcode);
};

