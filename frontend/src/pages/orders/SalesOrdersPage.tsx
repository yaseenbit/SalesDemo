import { useState } from 'react';
import { SalesOrderPanel } from '../../components/SalesOrderPanel';
import type { Customer, SalesOrderDraft } from '../../types';
import styles from './SalesOrdersPage.module.css';

interface SalesOrdersPageProps {
  customers: Customer[];
  draft: SalesOrderDraft;
  onDraftChange: (draft: SalesOrderDraft) => void;
}

export const SalesOrdersPage = ({ customers, draft, onDraftChange }: SalesOrdersPageProps) => {
  const [isItemsAddedDialogOpen, setIsItemsAddedDialogOpen] = useState(false);

  const handleItemsAdded = () => {
    setIsItemsAddedDialogOpen(true);
  };

  return (
    <section className="page-section">
      <SalesOrderPanel
        customers={customers}
        draft={draft}
        onDraftChange={onDraftChange}
        itemsAdded={handleItemsAdded}
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

