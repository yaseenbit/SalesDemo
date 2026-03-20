import { useMemo, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import type { Customer, CustomerStatus } from '../types';

interface CustomerPanelProps {
  customers: Customer[];
  selectedCustomerId: string;
  onSelectCustomer: (customerId: string) => void;
  onSaveCustomer: (customer: Customer) => void;
}

const emptyCustomer = (): Customer => ({
  id: '',
  name: '',
  company: '',
  email: '',
  phone: '',
  address: '',
  notes: '',
  status: 'Prospect',
});

export const CustomerPanel = ({
  customers,
  selectedCustomerId,
  onSelectCustomer,
  onSaveCustomer,
}: CustomerPanelProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | CustomerStatus>('All');
  const [draft, setDraft] = useState<Customer>(emptyCustomer());
  const [isEditing, setIsEditing] = useState(false);

  const filteredCustomers = useMemo(() => {
    return customers.filter((customer) => {
      const matchesSearch = [customer.name, customer.company, customer.email]
        .join(' ')
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'All' || customer.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [customers, searchTerm, statusFilter]);

  const startNewCustomer = () => {
    setDraft(emptyCustomer());
    setIsEditing(true);
  };

  const editCustomer = (customer: Customer) => {
    setDraft(customer);
    setIsEditing(true);
  };

  const resetForm = () => {
    setDraft(emptyCustomer());
    setIsEditing(false);
  };

  const handleChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value } = event.target;
    setDraft((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const customerToSave: Customer = {
      ...draft,
      id: draft.id || crypto.randomUUID(),
      name: draft.name.trim(),
      company: draft.company.trim(),
      email: draft.email.trim(),
      phone: draft.phone.trim(),
      address: draft.address.trim(),
      notes: draft.notes.trim(),
    };

    onSaveCustomer(customerToSave);
    onSelectCustomer(customerToSave.id);
    resetForm();
  };

  return (
    <section className="panel panel--stretch">
      <div className="panel__header">
        <div>
          <p className="eyebrow">Customers</p>
          <h2>Customer directory</h2>
        </div>
        <button className="button button--secondary" type="button" onClick={startNewCustomer}>
          Add customer
        </button>
      </div>

      <div className="toolbar toolbar--stack">
        <label className="field">
          <span>Search</span>
          <input
            type="search"
            placeholder="Search by name, company, or email"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </label>
        <label className="field field--compact">
          <span>Status</span>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as 'All' | CustomerStatus)}>
            <option value="All">All</option>
            <option value="Active">Active</option>
            <option value="Prospect">Prospect</option>
            <option value="Inactive">Inactive</option>
          </select>
        </label>
      </div>

      <div className="customer-layout">
        <div className="customer-list">
          {filteredCustomers.map((customer) => (
            <article
              key={customer.id}
              className={`customer-card ${selectedCustomerId === customer.id ? 'customer-card--active' : ''}`}
            >
              <button
                type="button"
                className="customer-card__select"
                onClick={() => onSelectCustomer(customer.id)}
              >
                <div className="customer-card__top">
                  <div>
                    <strong>{customer.name}</strong>
                    <p>{customer.company}</p>
                  </div>
                  <span className={`badge badge--${customer.status.toLowerCase()}`}>{customer.status}</span>
                </div>
                <p>{customer.email}</p>
                <p>{customer.phone}</p>
              </button>
              <div className="customer-card__footer">
                <button type="button" className="text-button" onClick={() => editCustomer(customer)}>
                  Edit details
                </button>
              </div>
            </article>
          ))}

          {filteredCustomers.length === 0 && (
            <div className="empty-state">
              <strong>No customers found</strong>
              <p>Try a different search or add a new customer.</p>
            </div>
          )}
        </div>

        <form className="form-card" onSubmit={handleSubmit}>
          <div className="form-card__header">
            <div>
              <p className="eyebrow">{isEditing ? 'Update' : 'Create'}</p>
              <h3>{draft.id ? 'Edit customer' : 'New customer'}</h3>
            </div>
            {isEditing && (
              <button className="text-button" type="button" onClick={resetForm}>
                Cancel
              </button>
            )}
          </div>

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

          <button className="button" type="submit">
            {draft.id ? 'Save customer' : 'Create customer'}
          </button>
        </form>
      </div>
    </section>
  );
};

