import styles from './PlaceholderPage.module.css';

interface PlaceholderPageProps {
  eyebrow: string;
  title: string;
  description: string;
}

export const PlaceholderPage = ({ eyebrow, title, description }: PlaceholderPageProps) => {
  return (
    <section className="panel page-section">
      <div className="page-header">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2>{title}</h2>
          <p className="lead-text">{description}</p>
        </div>
      </div>

      <div className={`empty-state ${styles.placeholderState}`}>
        <strong>Coming soon</strong>
        <p>This screen is ready in the navigation and can be expanded with full workflow details next.</p>
      </div>
    </section>
  );
};

