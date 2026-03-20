import { useMemo, useState } from 'react';
import { SalesOrderPanel } from '../../components/SalesOrderPanel';
import { SearchableTable, type SearchableTableColumn } from '../../components/SearchableTable';
import type { Customer, SalesOrderDraft } from '../../types';
import styles from './SalesOrdersPage.module.css';

interface SalesOrdersPageProps {
  customers: Customer[];
  draft: SalesOrderDraft;
  onDraftChange: (draft: SalesOrderDraft) => void;
}

export const SalesOrdersPage = ({ customers, draft, onDraftChange }: SalesOrdersPageProps) => {
  const [isItemsAddedDialogOpen, setIsItemsAddedDialogOpen] = useState(false);
  const [gridFocusRequestToken, setGridFocusRequestToken] = useState<number>();

  const customerColumns = useMemo<SearchableTableColumn<Customer>[]>(
    () => [
      { key: 'company', label: 'Company', width: '180px' },
      { key: 'name', label: 'Contact' },
      { key: 'phone', label: 'Phone', width: '140px' },
    ],
    [],
  );

  const selectedCustomer = customers.find((customer) => customer.id === draft.customerId);
  const selectedCustomerLabel = selectedCustomer ? `${selectedCustomer.company} - ${selectedCustomer.name}` : '';

  const handleItemsAdded = () => {
    setIsItemsAddedDialogOpen(true);
  };

  const handleHeaderChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;

    onDraftChange({
      ...draft,
      [name]: value,
    });
  };

  return (
    <section className="page-section">
      <div className={`form-card ${styles.orderDetailsCompact}`}>
        <div className={styles.detailsLayout}>
          <div className={styles.leftColumn}>
            <label className={`field ${styles.customerField}`}>
              <span>Customer</span>
              <div className={styles.searchFieldShell}>
                <SearchableTable
                  items={customers}
                  columns={customerColumns}
                  searchFields={['company', 'name', 'phone', 'email']}
                  value={selectedCustomerLabel}
                  placeholder="Search customer"
                  emptyMessage="No customers found."
                  compact
                  showHeaders={false}
                  showResultCount={false}
                  onQueryChange={(query) => {
                    if (!query.trim() && draft.customerId) {
                      onDraftChange({
                        ...draft,
                        customerId: '',
                      });
                    }
                  }}
                  onItemSelect={(customer) => {
                    onDraftChange({
                      ...draft,
                      customerId: customer.id,
                    });
                    setGridFocusRequestToken(Date.now());
                  }}
                />
              </div>
            </label>

            <label className={`field ${styles.addressField}`}>
              <span>Address</span>
              <input
                type="text"
                value={selectedCustomer?.address ?? ''}
                placeholder="Select a customer"
                readOnly
                className={styles.readOnlyInput}
              />
            </label>

            <label className={`field ${styles.phoneField}`}>
              <span>Phone no</span>
              <input
                type="text"
                value={selectedCustomer?.phone ?? ''}
                placeholder="Select a customer"
                readOnly
                className={styles.readOnlyInput}
              />
            </label>
          </div>

          <div className={styles.rightColumn}>
            <label className={`field ${styles.orderNumberField}`}>
              <span>Sales order no</span>
              <input
                type="text"
                name="orderNumber"
                value={draft.orderNumber}
                onChange={handleHeaderChange}
                placeholder="SO-0001"
              />
            </label>

            <label className={`field ${styles.orderDateField}`}>
              <span>Sales order date</span>
              <input type="date" name="orderDate" value={draft.orderDate} onChange={handleHeaderChange} />
            </label>
          </div>
        </div>
      </div>

      <SalesOrderPanel
        draft={draft}
        onDraftChange={onDraftChange}
        itemsAdded={handleItemsAdded}
        gridFocusRequestToken={gridFocusRequestToken}
      />

      {isItemsAddedDialogOpen ? (
        <div className={styles.doneOverlay} role="presentation" onClick={() => setIsItemsAddedDialogOpen(false)}>
          <section
            className={styles.doneDialog}
            role="alertdialog"
            aria-modal="true"
            aria-label="Items adding done"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className={styles.doneTitle}>Items adding is done</h3>
            <p className={styles.doneMessage}>You can now continue with totals or submit the order.</p>
            <div className={styles.doneActions}>
              <button className="button" type="button" onClick={() => setIsItemsAddedDialogOpen(false)}>
                Close
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
};

