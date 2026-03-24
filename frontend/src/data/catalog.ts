export interface CatalogItem {
  barcode: string;
  name: string;
  unitPrice: number;
}

export interface BrandItem {
  id: string;
  name: string;
}

const baseProductCatalog: CatalogItem[] = [
  { barcode: '890123450001', name: 'Wireless Mouse', unitPrice: 22.5 },
  { barcode: '890123450002', name: 'USB-C Charger 65W', unitPrice: 39.0 },
  { barcode: '890123450003', name: 'HDMI Cable 2m', unitPrice: 12.99 },
  { barcode: '890123450004', name: 'Notebook A5', unitPrice: 4.5 },
  { barcode: '890123450005', name: 'Ballpoint Pen Set', unitPrice: 6.75 },
  { barcode: '890123450006', name: 'Thermal Receipt Roll', unitPrice: 3.25 },
  { barcode: '890123450007', name: 'Portable SSD 1TB', unitPrice: 99.99 },
  { barcode: '890123450008', name: 'Keyboard Mechanical', unitPrice: 74.0 },
];

const generatedPrefixes = ['Alpha', 'Prime', 'Ultra', 'Smart', 'Pro', 'Eco', 'Max', 'Nova', 'Flex', 'Core'];
const generatedProductTypes = [
  'Scanner',
  'Adapter',
  'Cable',
  'Speaker',
  'Keyboard',
  'Mouse',
  'Headset',
  'Dock',
  'Charger',
  'Monitor',
];

const generatedProductCatalog: CatalogItem[] = Array.from({ length: 500 }, (_, index) => {
  const prefix = generatedPrefixes[index % generatedPrefixes.length];
  const productType = generatedProductTypes[Math.floor(index / generatedPrefixes.length) % generatedProductTypes.length];
  const sequence = String(index + 1).padStart(3, '0');

  return {
    barcode: `990${String(index + 1).padStart(9, '0')}`,
    name: `${prefix} ${productType} ${sequence}`,
    unitPrice: Number((5 + (index % 75) * 1.35).toFixed(2)),
  };
});

export const productCatalog: CatalogItem[] = [...baseProductCatalog, ...generatedProductCatalog];

export const fetchProductCatalog = async (delayMs = 650): Promise<CatalogItem[]> => {
  await new Promise((resolve) => window.setTimeout(resolve, delayMs));
  return productCatalog.map((item) => ({ ...item }));
};

export const brandCatalog: BrandItem[] = [
  { id: 'brand-001', name: 'Logitech' },
  { id: 'brand-002', name: 'Dell' },
  { id: 'brand-003', name: 'HP' },
  { id: 'brand-004', name: 'Sony' },
  { id: 'brand-005', name: 'Apple' },
  { id: 'brand-006', name: 'Samsung' },
  { id: 'brand-007', name: 'Lenovo' },
  { id: 'brand-008', name: 'Generic' },
];

