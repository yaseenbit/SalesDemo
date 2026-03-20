import { useEffect, useMemo, useState } from 'react';
import styles from './SearchableTable.module.css';

export interface SearchableTableColumn<TItem extends object> {
  key: string;
  label: string;
  width?: string;
  render?: (value: any, item: TItem) => React.ReactNode;
}

export interface SearchableTableProps<TItem extends object> {
  items: TItem[];
  columns: SearchableTableColumn<TItem>[];
  searchFields: string[];
  displayField?: string;
  value?: string;
  placeholder?: string;
  emptyMessage?: string;
  maxResults?: number;
  compact?: boolean;
  showHeaders?: boolean;
  showResultCount?: boolean;
  onQueryChange?: (query: string) => void;
  onInputKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  onItemSelect?: (item: TItem) => void;
}

export const SearchableTable = <TItem extends object>({
  items,
  columns,
  searchFields,
  displayField,
  value,
  placeholder = 'Search items...',
  emptyMessage = 'No items found.',
  maxResults = 50,
  compact = false,
  showHeaders = !compact,
  showResultCount = true,
  onQueryChange,
  onInputKeyDown,
  onItemSelect,
}: SearchableTableProps<TItem>) => {
  const [searchQuery, setSearchQuery] = useState(value ?? '');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (value === undefined) {
      return;
    }

    setSearchQuery(value);
  }, [value]);

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) {
      return items.slice(0, maxResults);
    }

    const query = searchQuery.toLowerCase().trim();
    return items
      .filter((item) => {
        return searchFields.some((field) => {
          const value = (item as Record<string, any>)[field];
          return String(value ?? '').toLowerCase().includes(query);
        });
      })
      .slice(0, maxResults);
  }, [items, searchQuery, searchFields, maxResults]);

  const getValue = (item: TItem, fieldKey: string) => {
    return (item as Record<string, any>)[fieldKey];
  };

  const getDisplayText = (item: TItem) => {
    const field = displayField ?? columns[0]?.key ?? searchFields[0] ?? '';
    return String(getValue(item, field) ?? '');
  };

  const selectItem = (item: TItem) => {
    const nextText = getDisplayText(item);
    setSearchQuery(nextText);
    onQueryChange?.(nextText);
    setIsDropdownOpen(false);
    setActiveIndex(0);
    onItemSelect?.(item);
  };

  return (
    <div className={`${styles.searchableTableContainer} ${compact ? styles.compact : ''}`}>
      <div className={styles.searchBox}>
        <input
          type="text"
          className={styles.searchInput}
          placeholder={placeholder}
          value={searchQuery}
          onChange={(e) => {
            const nextValue = e.target.value;
            setSearchQuery(nextValue);
            onQueryChange?.(nextValue);
            setIsDropdownOpen(true);
            setActiveIndex(0);
          }}
          onFocus={() => setIsDropdownOpen(true)}
          onBlur={() => {
            // Delay close so row click can complete.
            window.setTimeout(() => setIsDropdownOpen(false), 100);
          }}
          onKeyDown={(e) => {
            onInputKeyDown?.(e);

            if (e.defaultPrevented) {
              return;
            }

            if (!isDropdownOpen) {
              if (filteredItems.length === 0) {
                return;
              }

              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setIsDropdownOpen(true);
                setActiveIndex(0);
                return;
              }

              if (e.key === 'ArrowUp') {
                e.preventDefault();
                setIsDropdownOpen(true);
                setActiveIndex(filteredItems.length - 1);
                return;
              }

              return;
            }

            if (filteredItems.length === 0) {
              return;
            }

            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setActiveIndex((prev) => (prev + 1) % filteredItems.length);
              return;
            }

            if (e.key === 'ArrowUp') {
              e.preventDefault();
              setActiveIndex((prev) => (prev - 1 + filteredItems.length) % filteredItems.length);
              return;
            }

            if (e.key === 'Enter') {
              e.preventDefault();
              selectItem(filteredItems[activeIndex] ?? filteredItems[0]);
              return;
            }

            if (e.key === 'Escape') {
              e.preventDefault();
              setIsDropdownOpen(false);
            }
          }}
          aria-label="Search items"
          role="combobox"
          aria-expanded={isDropdownOpen}
          aria-autocomplete="list"
        />
      </div>

      {isDropdownOpen ? (
        <div className={styles.tableWrapper}>
          <table className={styles.resultsTable}>
            {showHeaders && (
            <thead>
              <tr>
                {columns.map((column) => (
                  <th key={column.key} style={{ width: column.width }}>
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            )}
            <tbody>
              {filteredItems.map((item, index) => (
                <tr
                  key={index}
                  className={`${styles.resultRow} ${activeIndex === index ? styles.resultRowActive : ''}`}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    selectItem(item);
                  }}
                  onMouseEnter={() => setActiveIndex(index)}
                >
                  {columns.map((column) => (
                    <td key={`${index}-${column.key}`}>
                      {column.render
                        ? column.render(getValue(item, column.key), item)
                        : getValue(item, column.key)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          {filteredItems.length === 0 ? (
            <div className={styles.emptyState}>
              <p>{emptyMessage}</p>
            </div>
          ) : null}
        </div>
      ) : null}

      {showResultCount && isDropdownOpen && filteredItems.length > 0 && (
        <div className={styles.resultCount}>
          Showing {filteredItems.length}
          {items.length > filteredItems.length && ' of ' + items.length} items
        </div>
      )}
    </div>
  );
};

