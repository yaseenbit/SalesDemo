import type { Customer, SalesOrderDraft } from '../types';

const today = new Date();
const future = new Date();
future.setDate(today.getDate() + 7);

const formatDate = (value: Date) => value.toISOString().slice(0, 10);

export const seedCustomers: Customer[] = [
  {
    id: crypto.randomUUID(),
    name: 'Ava Thompson',
    company: 'Northwind Retail',
    email: 'ava@northwind.example',
    phone: '+1 (312) 555-0191',
    address: '120 Lake Street, Chicago, IL',
    notes: 'Prefers weekly delivery slots and consolidated invoices.',
    status: 'Active',
  },
  {
    id: crypto.randomUUID(),
    name: 'Leo Martinez',
    company: 'Blue Harbor Foods',
    email: 'leo@blueharbor.example',
    phone: '+1 (646) 555-0143',
    address: '88 Fulton Ave, New York, NY',
    notes: 'Often places rush orders for seasonal promotions.',
    status: 'Prospect',
  },
  {
    id: crypto.randomUUID(),
    name: 'Priya Raman',
    company: 'Summit Office Supply',
    email: 'priya@summit.example',
    phone: '+1 (206) 555-0160',
    address: '410 Pine Street, Seattle, WA',
    notes: 'Needs approval copy for orders above $5,000.',
    status: 'Active',
  },
];

export const createInitialOrderDraft = (customerId = seedCustomers[0]?.id ?? ''): SalesOrderDraft => ({
  orderNumber: 'SO-2026-001',
  customerId,
  orderDate: formatDate(today),
  deliveryDate: formatDate(future),
  status: 'Draft',
  notes: 'Pack fragile items separately and confirm inventory before dispatch.',
  items: [
    {
      id: crypto.randomUUID(),
      sku: 'SKU-1001',
      description: 'Premium office chair',
      brand: 'Herman Miller',
      quantity: 2,
      unitPrice: 245,
      discount: 10,
    },
    {
      id: crypto.randomUUID(),
      sku: 'SKU-2040',
      description: 'Standing desk converter',
      brand: 'Flexispot',
      quantity: 1,
      unitPrice: 329,
      discount: 0,
    },
  ],
});

