import type { Product } from '../../types';
import { getProductStockStatus } from './productInventory';
import styles from './ProductStockBadge.module.css';

interface ProductStockBadgeProps {
  product: Product;
}

export const ProductStockBadge = ({ product }: ProductStockBadgeProps) => {
  const status = getProductStockStatus(product);
  const statusClassName =
    status === 'In Stock' ? styles.inStock : status === 'Low Stock' ? styles.lowStock : styles.outOfStock;

  return <span className={`${styles.badge} ${statusClassName}`}>{status}</span>;
};

