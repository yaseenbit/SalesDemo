import { useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import type { Customer, CustomerStatus } from '../../types';
import { Link, useNavigate } from 'react-router-dom';
import styles from './CustomerListPage.module.css';

interface CustomerListPageProps {
  customers: Customer[];
  selectedCustomerId: string;
  onSelectCustomer: (customerId: string) => void;
}

export const CustomerListPage = ({
  customers,
  selectedCustomerId,
  onSelectCustomer,
}: CustomerListPageProps) => {
  const navigate = useNavigate();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const rowsPerPage = 18;
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | CustomerStatus>('All');
  const [currentPage, setCurrentPage] = useState(1);

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

  const totalPages = Math.max(1, Math.ceil(filteredCustomers.length / rowsPerPage));
  const pageStartIndex = (currentPage - 1) * rowsPerPage;
  const pageCustomers = filteredCustomers.slice(pageStartIndex, pageStartIndex + rowsPerPage);

  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  useEffect(() => {
    setCurrentPage((current) => Math.min(current, totalPages));
  }, [totalPages]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  useEffect(() => {
    if (!selectedCustomerId) {
      return;
    }

    const selectedIndex = filteredCustomers.findIndex((customer) => customer.id === selectedCustomerId);
    if (selectedIndex < 0) {
      return;
    }

    const nextPage = Math.floor(selectedIndex / rowsPerPage) + 1;
    if (nextPage !== currentPage) {
      setCurrentPage(nextPage);
    }
  }, [selectedCustomerId, filteredCustomers, rowsPerPage, currentPage]);

  const moveSelection = (offset: number) => {
    if (filteredCustomers.length === 0) {
      return;
    }

    const currentIndex = filteredCustomers.findIndex((customer) => customer.id === selectedCustomerId);
    const nextIndex = currentIndex < 0 ? 0 : Math.min(Math.max(currentIndex + offset, 0), filteredCustomers.length - 1);
    const nextCustomer = filteredCustomers[nextIndex];

    if (!nextCustomer) {
      return;
    }

    onSelectCustomer(nextCustomer.id);
  };

  const openSelectedCustomer = () => {
    if (!selectedCustomerId) {
      return;
    }

    navigate(`/customers/${selectedCustomerId}/edit`);
  };

  const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      moveSelection(1);
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      moveSelection(-1);
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      openSelectedCustomer();
    }
  };

  return (
    <section className="panel page-section">
      <div className="page-header">
        <div>
          <p className="eyebrow">Customers</p>
        </div>
        <Link className="button" to="/customers/new">
          Add customer
        </Link>
      </div>

      <div className="toolbar toolbar--stack">
        <label className="field">
          <span>Search customers</span>
          <input
            ref={searchInputRef}
            type="search"
            placeholder="Search by contact, company, or email"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            onKeyDown={handleSearchKeyDown}
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

      <p className={styles.tableHint}>Tip: Up/Down changes selected row, Enter opens edit for selected customer.</p>

      <div className={styles.customerTableShell}>
        <div className={styles.customerTableScroll}>
          <table className={styles.customerTable}>
            <thead>
              <tr>
                <th>Contact</th>
                <th>Company</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageCustomers.map((customer) => (
                <tr
                  key={customer.id}
                  className={selectedCustomerId === customer.id ? styles.customerRowActive : ''}
                  onClick={() => onSelectCustomer(customer.id)}
                  onDoubleClick={() => navigate(`/customers/${customer.id}/edit`)}
                >
                  <td>{customer.name}</td>
                  <td>{customer.company}</td>
                  <td>{customer.email}</td>
                  <td>{customer.phone}</td>
                  <td>
                    <span className={`badge badge--${customer.status.toLowerCase()}`}>{customer.status}</span>
                  </td>
                  <td>
                    <Link className="text-button" to={`/customers/${customer.id}/edit`}>
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}

              {pageCustomers.length === 0 && (
                <tr>
                  <td colSpan={6}>
                    <div className={`empty-state ${styles.customerTableEmpty}`}>
                      <strong>No customers found</strong>
                      <p>Try a different filter or add a new customer profile.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className={styles.customerPagination}>
          <button
            type="button"
            className="button button--secondary"
            onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
            disabled={currentPage === 1}
          >
            Previous
          </button>
          <span>
            Page {currentPage} of {totalPages}
          </span>
          <button
            type="button"
            className="button button--secondary"
            onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
            disabled={currentPage === totalPages}
          >
            Next
          </button>
        </div>
      </div>
    </section>
  );
};

