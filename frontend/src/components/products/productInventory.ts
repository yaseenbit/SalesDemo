import type { Product } from '../../types';

export type ProductStockStatus = 'In Stock' | 'Low Stock' | 'Out of Stock';
export type ProductInventoryFilter = 'All' | ProductStockStatus | 'Needs Reorder';

export const getProductStockStatus = (product: Product): ProductStockStatus => {
  if (product.stockQuantity <= 0) {
    return 'Out of Stock';
  }

  if (product.stockQuantity <= product.reorderLevel) {
    return 'Low Stock';
  }

  return 'In Stock';
};

export const getSuggestedReorderQuantity = (product: Product) => {
  if (product.stockQuantity > product.reorderLevel) {
    return 0;
  }

  return Math.max(product.reorderLevel * 2 - product.stockQuantity, product.reorderLevel - product.stockQuantity);
};

export const needsReorder = (product: Product) => getSuggestedReorderQuantity(product) > 0;

export const matchesInventoryFilter = (product: Product, filter: ProductInventoryFilter) => {
  if (filter === 'All') {
    return true;
  }

  if (filter === 'Needs Reorder') {
    return needsReorder(product);
  }

  return getProductStockStatus(product) === filter;
};

export const getInventorySummary = (products: Product[]) => {
  return products.reduce(
    (summary, product) => {
      const status = getProductStockStatus(product);
      const reorderQuantity = getSuggestedReorderQuantity(product);

      summary.total += 1;
      summary.inventoryValue += product.unitPrice * product.stockQuantity;
      summary[status === 'In Stock' ? 'inStock' : status === 'Low Stock' ? 'lowStock' : 'outOfStock'] += 1;
      if (reorderQuantity > 0) {
        summary.needsReorder += 1;
        summary.totalSuggestedReorder += reorderQuantity;
      }

      return summary;
    },
    {
      total: 0,
      inStock: 0,
      lowStock: 0,
      outOfStock: 0,
      needsReorder: 0,
      totalSuggestedReorder: 0,
      inventoryValue: 0,
    },
  );
};

