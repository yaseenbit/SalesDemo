import type { NewProductInput, Product, ProductCategory } from '../types';

export interface ProductImportResult {
  created: number;
  updated: number;
  skipped: number;
}

export const productCategories: ProductCategory[] = [
  'Accessories',
  'Audio',
  'Cables',
  'Displays',
  'Networking',
  'Office',
  'Peripherals',
  'Storage',
];

const productAdjectives = ['Alpha', 'Prime', 'Ultra', 'Smart', 'Pro', 'Eco', 'Max', 'Nova', 'Flex', 'Core'];
const productNouns = [
  'Mouse',
  'Keyboard',
  'Headset',
  'Dock',
  'Cable',
  'Router',
  'Monitor',
  'Speaker',
  'Drive',
  'Adapter',
  'Notebook',
  'Scanner',
];

const wait = (delayMs: number) => new Promise((resolve) => window.setTimeout(resolve, delayMs));

const normalizeProduct = (product: Product): Product => ({ ...product });

const getNormalizedBarcode = (barcode: string) => barcode.trim();

export const generateProductBarcode = () => {
  let barcode = '';

  do {
    const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`.slice(-10);
    barcode = `780${suffix}`;
  } while (productStore.some((product) => product.barcode === barcode));

  return barcode;
};

const createSeedProducts = (): Product[] => {
  return Array.from({ length: 2500 }, (_, index) => {
    const category = productCategories[index % productCategories.length];
    const adjective = productAdjectives[index % productAdjectives.length];
    const noun = productNouns[Math.floor(index / productAdjectives.length) % productNouns.length];
    const model = String(index + 1).padStart(4, '0');
    const createdAt = new Date(Date.now() - index * 86_400_000).toISOString();

    return {
      id: `product-${model}`,
      barcode: `780${String(index + 1).padStart(10, '0')}`,
      name: `${adjective} ${noun} ${model}`,
      category,
      description: `${adjective} ${noun} ${model} is a ${category.toLowerCase()} item configured for demo catalog browsing and product maintenance workflows.`,
      unitPrice: Number((8 + (index % 125) * 1.42).toFixed(2)),
      stockQuantity: 10 + (index * 7) % 240,
      reorderLevel: 12 + (index % 6) * 6,
      createdAt,
      archivedAt: null,
    } satisfies Product;
  });
};

let productStore: Product[] = createSeedProducts();

export const fetchProducts = async (delayMs = 900): Promise<Product[]> => {
  await wait(delayMs);

  return productStore
    .filter((product) => product.archivedAt === null)
    .map(normalizeProduct)
    .sort((left, right) => left.name.localeCompare(right.name) || left.barcode.localeCompare(right.barcode));
};

export const fetchProductById = async (productId: string, delayMs = 250): Promise<Product | null> => {
  await wait(delayMs);

  const product = productStore.find((entry) => entry.id === productId);
  return product ? normalizeProduct(product) : null;
};

export const createProduct = async (input: NewProductInput, delayMs = 450): Promise<Product> => {
  await wait(delayMs);

  const normalizedBarcode = getNormalizedBarcode(input.barcode);
  if (productStore.some((product) => product.barcode === normalizedBarcode)) {
    throw new Error('A product with this barcode already exists.');
  }

  const product: Product = {
    id: crypto.randomUUID(),
    barcode: normalizedBarcode,
    name: input.name.trim(),
    category: input.category,
    description: input.description.trim(),
    unitPrice: Number(input.unitPrice.toFixed(2)),
    stockQuantity: Math.max(0, Math.round(input.stockQuantity)),
    reorderLevel: Math.max(0, Math.round(input.reorderLevel)),
    createdAt: new Date().toISOString(),
    archivedAt: null,
  };

  productStore = [product, ...productStore];
  return normalizeProduct(product);
};

export const updateProduct = async (productId: string, input: NewProductInput, delayMs = 450): Promise<Product> => {
  await wait(delayMs);

  const existingProduct = productStore.find((product) => product.id === productId);
  if (!existingProduct) {
    throw new Error('Product not found.');
  }

  const normalizedBarcode = getNormalizedBarcode(input.barcode);
  if (productStore.some((product) => product.id !== productId && product.barcode === normalizedBarcode)) {
    throw new Error('A product with this barcode already exists.');
  }

  const updatedProduct: Product = {
    ...existingProduct,
    barcode: normalizedBarcode,
    name: input.name.trim(),
    category: input.category,
    description: input.description.trim(),
    unitPrice: Number(input.unitPrice.toFixed(2)),
    stockQuantity: Math.max(0, Math.round(input.stockQuantity)),
    reorderLevel: Math.max(0, Math.round(input.reorderLevel)),
  };

  productStore = productStore.map((product) => (product.id === productId ? updatedProduct : product));
  return normalizeProduct(updatedProduct);
};

export const importProducts = async (inputs: NewProductInput[], delayMs = 650): Promise<ProductImportResult> => {
  await wait(delayMs);

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const input of inputs) {
    const normalizedName = input.name.trim();
    const normalizedBarcode = getNormalizedBarcode(input.barcode);

    if (!normalizedName || !normalizedBarcode) {
      skipped += 1;
      continue;
    }

    const existingProduct = productStore.find((product) => product.barcode === normalizedBarcode);

    if (existingProduct) {
      const updatedProduct: Product = {
        ...existingProduct,
        barcode: normalizedBarcode,
        name: normalizedName,
        category: input.category,
        description: input.description.trim(),
        unitPrice: Number(input.unitPrice.toFixed(2)),
        stockQuantity: Math.max(0, Math.round(input.stockQuantity)),
        reorderLevel: Math.max(0, Math.round(input.reorderLevel)),
        archivedAt: null,
      };

      productStore = productStore.map((product) => (product.id === existingProduct.id ? updatedProduct : product));
      updated += 1;
      continue;
    }

    productStore = [
      {
        id: crypto.randomUUID(),
        barcode: normalizedBarcode,
        name: normalizedName,
        category: input.category,
        description: input.description.trim(),
        unitPrice: Number(input.unitPrice.toFixed(2)),
        stockQuantity: Math.max(0, Math.round(input.stockQuantity)),
        reorderLevel: Math.max(0, Math.round(input.reorderLevel)),
        createdAt: new Date().toISOString(),
        archivedAt: null,
      },
      ...productStore,
    ];
    created += 1;
  }

  return { created, updated, skipped };
};

export const archiveProduct = async (productId: string, delayMs = 300): Promise<Product> => {
  await wait(delayMs);

  const existingProduct = productStore.find((product) => product.id === productId);
  if (!existingProduct) {
    throw new Error('Product not found.');
  }

  const archivedProduct: Product = {
    ...existingProduct,
    archivedAt: new Date().toISOString(),
  };

  productStore = productStore.map((product) => (product.id === productId ? archivedProduct : product));
  return normalizeProduct(archivedProduct);
};

export const deleteProduct = async (productId: string, delayMs = 300): Promise<void> => {
  await wait(delayMs);

  const exists = productStore.some((product) => product.id === productId);
  if (!exists) {
    throw new Error('Product not found.');
  }

  productStore = productStore.filter((product) => product.id !== productId);
};

