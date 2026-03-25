export type CustomerStatus = 'Active' | 'Prospect' | 'Inactive';

export interface Customer {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  address: string;
  notes: string;
  status: CustomerStatus;
}

export type OrderStatus = 'Draft' | 'Pending Approval' | 'Ready to Ship' | 'Completed' | 'Cancelled';

export interface SalesOrderItem {
  id: string;
  sku: string;
  description: string;
  brand: string;
  quantity: number;
  unitPrice: number;
  discount: number;
}

export interface SalesOrder {
  id: string;
  orderNumber: string;
  customerId: string;
  orderDate: string;
  deliveryDate: string;
  status: OrderStatus;
  notes: string;
  items: SalesOrderItem[];
}

export type SalesOrderDraft = Omit<SalesOrder, 'id'>;

export type ProductCategory =
  | 'Accessories'
  | 'Audio'
  | 'Cables'
  | 'Displays'
  | 'Networking'
  | 'Office'
  | 'Peripherals'
  | 'Storage';

export interface Product {
  id: string;
  barcode: string;
  name: string;
  category: ProductCategory;
  description: string;
  unitPrice: number;
  stockQuantity: number;
  reorderLevel: number;
  createdAt: string;
  archivedAt: string | null;
}

export type NewProductInput = Omit<Product, 'id' | 'createdAt' | 'archivedAt'>;

export type Page =
  | 'dashboard'
  | 'customers'
  | 'customer-add'
  | 'customer-edit'
  | 'orders'
  | 'order-new'
  | 'order-detail';
