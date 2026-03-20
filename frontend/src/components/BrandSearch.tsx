import { useState, useMemo } from 'react';
import { Search } from 'semantic-ui-react';
import { brandCatalog } from '../data/catalog';
import styles from './BrandSearch.module.css';

interface BrandSearchProps {
  value: string;
  onChange: (value: string) => void;
  onKeyDown?: (event: React.KeyboardEvent<any>) => void;
}

interface SearchResult {
  title: string;
  description: string;
}

export const BrandSearch = ({ value, onChange, onKeyDown }: BrandSearchProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);

  const handleSearchChange = (e: any, data: any) => {
    const searchValue = data.value || '';
    onChange(searchValue);

    if (!searchValue) {
      setResults([]);
      return;
    }

    setIsLoading(true);

    // Simulate async search
    setTimeout(() => {
      const filtered = brandCatalog
        .filter((brand) => brand.name.toLowerCase().includes(searchValue.toLowerCase()))
        .map((brand) => ({
          title: brand.name,
          description: brand.id,
        }));

      setResults(filtered);
      setIsLoading(false);
    }, 200);
  };

  const handleResultSelect = (e: any, data: any) => {
    const selected = data.result as SearchResult;
    onChange(selected.title);
    setResults([]);
  };

  const handleKeyDown = (e: any) => {
    if (onKeyDown) {
      onKeyDown(e);
    }
  };

  return (
    <div className={styles.brandSearchContainer} onKeyDown={handleKeyDown}>
      <Search
        fluid
        input={{ className: styles.searchInput, placeholder: 'Search brand...' }}
        loading={isLoading}
        onSearchChange={handleSearchChange}
        results={results}
        value={value}
        onResultSelect={handleResultSelect}
      />
    </div>
  );
};

