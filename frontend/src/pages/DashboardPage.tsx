import { Link } from 'react-router-dom';
import styles from './DashboardPage.module.css';

export const DashboardPage = () => {
  return (
    <section className="panel page-section">
      <div className="page-header">
        <div>
          <p className="eyebrow">Overview</p>
          <h2>Manage sales with fast, focused workflows.</h2>
          <p className="lead-text">
            Navigate to customer records or jump directly into order entry. All changes are immediate and persist on
            this device.
          </p>
        </div>
      </div>

      <div className={styles.quickActions}>
        <Link className={`${styles.quickAction} ${styles.quickActionPurple}`} to="/customers">
          <h3>Browse customers</h3>
          <p>Search customer records and update account information.</p>
        </Link>
        <Link className={`${styles.quickAction} ${styles.quickActionBlue}`} to="/customers/new">
          <h3>Add customer</h3>
          <p>Create a new profile with contact details and account status.</p>
        </Link>
        <Link className={`${styles.quickAction} ${styles.quickActionTeal}`} to="/orders">
          <h3>Build sales order</h3>
          <p>Add line items, discounts, and review totals in one dedicated view.</p>
        </Link>
        <Link className={`${styles.quickAction} ${styles.quickActionOrange}`} to="/pos">
          <h3>POS scanning</h3>
          <p>Use a barcode scanner and add repeated scans to quantity instantly.</p>
        </Link>
      </div>
    </section>
  );
};

