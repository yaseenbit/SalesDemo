import { SalesOrderPanel } from '../../components/SalesOrderPanel';
import type { Customer, SalesOrderDraft } from '../../types';

interface SalesOrdersPageProps {
  customers: Customer[];
  draft: SalesOrderDraft;
  onDraftChange: (draft: SalesOrderDraft) => void;
}

export const SalesOrdersPage = ({ customers, draft, onDraftChange }: SalesOrdersPageProps) => {
  return (
    <section className="page-section">
      <SalesOrderPanel customers={customers} draft={draft} onDraftChange={onDraftChange} />
    </section>
  );
};

