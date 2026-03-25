import { useMemo } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { createInitialOrderDraft, seedCustomers } from './data/seed';
import { useLocalStorage } from './hooks/useLocalStorage';
import { DashboardPage } from './pages/DashboardPage';
import { CustomerFormPage } from './pages/customers/CustomerFormPage';
import { CustomerListPage } from './pages/customers/CustomerListPage';
import { SalesOrdersPage } from './pages/orders/SalesOrdersPage';
import { PlaceholderPage } from './pages/PlaceholderPage';
import { PosSalesPage } from './pages/pos/PosSalesPage';
import { ProductDetailPage } from './pages/products/ProductDetailPage';
import { ProductListPage } from './pages/products/ProductListPage';
import { TableControlDemoPage } from './pages/TableControlDemoPage';
import type { Customer, SalesOrderDraft } from './types';

const sortCustomers = (customers: Customer[]) => [...customers].sort((a, b) => a.company.localeCompare(b.company));

function App() {
  const [customers, setCustomers] = useLocalStorage<Customer[]>('salesdemo-customers', seedCustomers);
  const [salesOrderDraft, setSalesOrderDraft] = useLocalStorage<SalesOrderDraft>(
    'salesdemo-order-draft',
    createInitialOrderDraft(seedCustomers[0]?.id ?? ''),
  );

  const orderedCustomers = useMemo(() => sortCustomers(customers), [customers]);

  const handleSaveCustomer = (customer: Customer) => {
    setCustomers((currentCustomers) => {
      const exists = currentCustomers.some((entry) => entry.id === customer.id);
      const nextCustomers = exists
        ? currentCustomers.map((entry) => (entry.id === customer.id ? customer : entry))
        : [...currentCustomers, customer];

      return sortCustomers(nextCustomers);
    });

    setSalesOrderDraft((currentDraft) => ({
      ...currentDraft,
      customerId: currentDraft.customerId || customer.id,
    }));
  };

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<DashboardPage />} />
        <Route
          path="customers"
          element={
            <CustomerListPage
              customers={orderedCustomers}
              selectedCustomerId={salesOrderDraft.customerId}
              onSelectCustomer={(customerId) =>
                setSalesOrderDraft((currentDraft) => ({
                  ...currentDraft,
                  customerId,
                }))
              }
            />
          }
        />
        <Route
          path="customers/new"
          element={<CustomerFormPage customers={orderedCustomers} onSaveCustomer={handleSaveCustomer} />}
        />
        <Route
          path="customers/:customerId/edit"
          element={<CustomerFormPage customers={orderedCustomers} onSaveCustomer={handleSaveCustomer} />}
        />
        <Route
          path="products"
          element={<ProductListPage />}
        />
        <Route
          path="products/:productId"
          element={<ProductDetailPage />}
        />
        <Route
          path="orders"
          element={
            <SalesOrdersPage
              customers={orderedCustomers}
              draft={salesOrderDraft}
              onDraftChange={setSalesOrderDraft}
            />
          }
        />
        <Route
          path="pos"
          element={
            <PosSalesPage
              customers={orderedCustomers}
              draft={salesOrderDraft}
              onDraftChange={setSalesOrderDraft}
            />
          }
        />
        <Route path="table-demo" element={<TableControlDemoPage />} />
        <Route
          path="sales-invoices"
          element={
            <PlaceholderPage
              eyebrow="Sales"
              title="Sales invoice"
              description="Invoice management can live here next, using the same full-width layout shell."
            />
          }
        />
        <Route
          path="cash-bills"
          element={
            <PlaceholderPage
              eyebrow="Sales"
              title="Cash bill"
              description="This placeholder keeps the navigation structure ready for cash bill workflows."
            />
          }
        />
        <Route
          path="sales-returns"
          element={
            <PlaceholderPage
              eyebrow="Sales"
              title="Sales return"
              description="Returns and reverse-entry screens can be added here without changing the shell again."
            />
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;

