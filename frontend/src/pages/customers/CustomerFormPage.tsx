import { useMemo, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { Customer } from '../../types';
import styles from './CustomerFormPage.module.css';

interface CustomerFormPageProps {
  customers: Customer[];
  onSaveCustomer: (customer: Customer) => void;
}

const createEmptyCustomer = (): Customer => ({
  id: '',
  name: '',
  company: '',
  email: '',
  phone: '',
  address: '',
  notes: '',
  status: 'Prospect',
});

export const CustomerFormPage = ({ customers, onSaveCustomer }: CustomerFormPageProps) => {
  const navigate = useNavigate();
  const { customerId } = useParams();

  const existingCustomer = useMemo(
    () => customers.find((customer) => customer.id === customerId),
    [customers, customerId],
  );

  const [draft, setDraft] = useState<Customer>(existingCustomer ?? createEmptyCustomer());

  const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    setDraft((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextCustomer: Customer = {
      ...draft,
      id: draft.id || crypto.randomUUID(),
      name: draft.name.trim(),
      company: draft.company.trim(),
      email: draft.email.trim(),
      phone: draft.phone.trim(),
      address: draft.address.trim(),
      notes: draft.notes.trim(),
    };

    onSaveCustomer(nextCustomer);
    navigate('/customers');
  };

  if (customerId && !existingCustomer) {
    return (
      <section className="panel page-section">
        <div className="empty-state">
          <strong>Customer not found</strong>
          <p>The requested customer record is unavailable.</p>
          <Link className="button" to="/customers">
            Back to list
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="panel page-section">
      <div className="page-header">
        <div>
          <p className="eyebrow">Customers</p>
          <h2>{draft.id ? 'Edit customer' : 'Add customer'}</h2>
          <p className="lead-text">Capture account details and keep records ready for quote and order workflows.</p>
        </div>
        <Link className="button button--secondary" to="/customers">
          View listing
        </Link>
      </div>

      <form className={`form-card ${styles.formCard}`} onSubmit={handleSubmit}>
        <div className="form-grid">
          <label className="field">
            <span>Contact name</span>
            <input name="name" value={draft.name} onChange={handleChange} required />
          </label>
          <label className="field">
            <span>Company</span>
            <input name="company" value={draft.company} onChange={handleChange} required />
          </label>
          <label className="field">
            <span>Email</span>
            <input name="email" type="email" value={draft.email} onChange={handleChange} required />
          </label>
          <label className="field">
            <span>Phone</span>
            <input name="phone" value={draft.phone} onChange={handleChange} required />
          </label>
          <label className="field field--full">
            <span>Address</span>
            <input name="address" value={draft.address} onChange={handleChange} required />
          </label>
          <label className="field">
            <span>Status</span>
            <select name="status" value={draft.status} onChange={handleChange}>
              <option value="Active">Active</option>
              <option value="Prospect">Prospect</option>
              <option value="Inactive">Inactive</option>
            </select>
          </label>
          <label className="field field--full">
            <span>Notes</span>
            <textarea name="notes" rows={4} value={draft.notes} onChange={handleChange} />
          </label>
        </div>

        <div className={styles.actions}>
          <button className="button" type="submit">
            {draft.id ? 'Save changes' : 'Create customer'}
          </button>
          <Link className="text-button" to="/customers">
            Cancel
          </Link>
        </div>
      </form>
    </section>
  );
};

