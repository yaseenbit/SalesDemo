import type { NewProductInput, Product, ProductCategory } from '../types';

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
      unitPrice: Number((8 + (index % 125) * 1.42).toFixed(2)),
      stockQuantity: 10 + (index * 7) % 240,
      createdAt,
    } satisfies Product;
  });
};

let productStore: Product[] = createSeedProducts();

export const fetchProducts = async (delayMs = 900): Promise<Product[]> => {
  await wait(delayMs);

  return productStore
    .map(normalizeProduct)
    .sort((left, right) => left.name.localeCompare(right.name) || left.barcode.localeCompare(right.barcode));
};

export const createProduct = async (input: NewProductInput, delayMs = 450): Promise<Product> => {
  await wait(delayMs);

  const normalizedBarcode = input.barcode.trim();
  if (productStore.some((product) => product.barcode === normalizedBarcode)) {
    throw new Error('A product with this barcode already exists.');
  }

  const product: Product = {
    id: crypto.randomUUID(),
    barcode: normalizedBarcode,
    name: input.name.trim(),
    category: input.category,
    unitPrice: Number(input.unitPrice.toFixed(2)),
    stockQuantity: Math.max(0, Math.round(input.stockQuantity)),
    createdAt: new Date().toISOString(),
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

  const normalizedBarcode = input.barcode.trim();
  if (productStore.some((product) => product.id !== productId && product.barcode === normalizedBarcode)) {
    throw new Error('A product with this barcode already exists.');
  }

  const updatedProduct: Product = {
    ...existingProduct,
    barcode: normalizedBarcode,
    name: input.name.trim(),
    category: input.category,
    unitPrice: Number(input.unitPrice.toFixed(2)),
    stockQuantity: Math.max(0, Math.round(input.stockQuantity)),
  };

  productStore = productStore.map((product) => (product.id === productId ? updatedProduct : product));
  return normalizeProduct(updatedProduct);
};

