import type { HTMLInputTypeAttribute, KeyboardEvent } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Typeahead } from 'react-bootstrap-typeahead';
import 'react-bootstrap-typeahead/css/Typeahead.css';
import { SearchableTable, type SearchableTableColumn } from '../SearchableTable';
import styles from './EditableGridTable.module.css';

export type CellMoveAction =
  | { type: 'move'; rowDelta: number; colDelta: number }
  | { type: 'focus'; rowIndex: number; columnIndex: number }
  | { type: 'focusAfterChange'; rowIndex: number; columnIndex: number }
  | {
      type: 'showMessage';
      title?: string;
      message: string;
      focusRowIndex?: number;
      focusColumnIndex?: number;
    }
  | { type: 'stay' }
  | { type: 'next' };

export type EditableGridCellContext<TRow extends object> = {
  event: KeyboardEvent<HTMLInputElement>;
  row: TRow;
  rowIndex: number;
  columnIndex: number;
  column: EditableGridColumn<TRow>;
  rows: TRow[];
  columns: EditableGridColumn<TRow>[];
};

export type EditableGridCellKeyDownHandler<TRow extends object> = (
  context: EditableGridCellContext<TRow>,
) => CellMoveAction | void;

type FieldKey<T> = Extract<keyof T, string>;
type PopupScalar = string | number | boolean | null | undefined;
type PopupOptionRecord = object;

interface EditableGridBaseColumn<TRow extends object> {
  key: string;
  header: string;
  width?: string;
  placeholder?: string;
  align?: 'left' | 'center' | 'right';
  getValue: (row: TRow, rowIndex: number) => string | number;
}

interface EditableGridTextColumn<TRow extends object> extends EditableGridBaseColumn<TRow> {
  kind: 'text';
  onValueChange: (row: TRow, nextValue: string, rowIndex: number) => TRow;
  onCellKeyDown?: EditableGridCellKeyDownHandler<TRow>;
}

interface EditableGridNumberColumn<TRow extends object> extends EditableGridBaseColumn<TRow> {
  kind: 'number';
  inputType?: HTMLInputTypeAttribute;
  onValueChange: (row: TRow, nextValue: string, rowIndex: number) => TRow;
  onCellKeyDown?: EditableGridCellKeyDownHandler<TRow>;
}

interface EditableGridDisplayColumn<TRow extends object> extends EditableGridBaseColumn<TRow> {
  kind: 'display';
}

interface PopupDisplayField<TOption extends PopupOptionRecord> {
  key: string;
  label: string;
}

interface PopupRowMapping<TRow extends object, TOption extends PopupOptionRecord> {
  rowField: FieldKey<TRow>;
  optionField: string;
}

interface EditableGridPopupConfig<TRow extends object, TOption extends PopupOptionRecord> {
  title: string;
  triggerKey?: 'space' | 'focus';
  shouldOpenOnFocus?: (row: TRow, rowIndex: number) => boolean;
  shouldOpenOnSpace?: (row: TRow, rowIndex: number) => boolean;
  filterPlaceholder?: string;
  options: TOption[];
  optionIdKey: string;
  filterKeys: readonly string[];
  displayFields: readonly PopupDisplayField<TOption>[];
  rowMappings: readonly PopupRowMapping<TRow, TOption>[];
  appendRowAfterSelect?: boolean;
  focusColumnKeyAfterSelect?: string;
  emptyMessage?: string;
}

interface EditableGridPopupColumn<TRow extends object, TOption extends PopupOptionRecord>
  extends EditableGridBaseColumn<TRow> {
  kind: 'popup';
  onValueChange?: (row: TRow, nextValue: string, rowIndex: number) => TRow;
  inputType?: HTMLInputTypeAttribute;
  editable?: boolean;
  popup: EditableGridPopupConfig<TRow, TOption>;
  onCellKeyDown?: EditableGridCellKeyDownHandler<TRow>;
}

interface EditableGridBarcodeColumn<TRow extends object> extends EditableGridBaseColumn<TRow> {
  kind: 'barcode';
  onValueChange: (row: TRow, nextValue: string, rowIndex: number) => TRow;
  onCellKeyDown?: EditableGridCellKeyDownHandler<TRow>;
  allowedCharacters?: RegExp;
}

interface ComboboxDisplayField<TOption extends PopupOptionRecord> {
  key: string;
  label: string;
}

interface ComboboxRowMapping<TRow extends object, TOption extends PopupOptionRecord> {
  rowField: FieldKey<TRow>;
  optionField: string;
}

interface EditableGridComboboxColumn<TRow extends object, TOption extends PopupOptionRecord = PopupOptionRecord>
  extends EditableGridBaseColumn<TRow> {
  kind: 'combobox';
  onValueChange: (row: TRow, nextValue: string, rowIndex: number) => TRow;
  onCellKeyDown?: EditableGridCellKeyDownHandler<TRow>;
  options: TOption[];
  optionIdKey: string;
  displayField: string;
  filterField?: string;
  rowMappings?: readonly ComboboxRowMapping<TRow, TOption>[];
}

interface EditableGridSearchColumn<TRow extends object, TOption extends PopupOptionRecord = PopupOptionRecord>
  extends EditableGridBaseColumn<TRow> {
  kind: 'search';
  onValueChange: (row: TRow, nextValue: string, rowIndex: number) => TRow;
  onCellKeyDown?: EditableGridCellKeyDownHandler<TRow>;
  items: TOption[];
  searchColumns: SearchableTableColumn<TOption>[];
  searchFields: string[];
  displayField: string;
  emptyMessage?: string;
  maxResults?: number;
  rowMappings?: readonly ComboboxRowMapping<TRow, TOption>[];
}

interface EditableGridBrandSearchColumn<TRow extends object> extends EditableGridBaseColumn<TRow> {
  kind: 'brand-search';
  onValueChange: (row: TRow, nextValue: string, rowIndex: number) => TRow;
  onCellKeyDown?: EditableGridCellKeyDownHandler<TRow>;
  renderComponent: React.ComponentType<{
    value: string;
    onChange: (value: string) => void;
    onKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  }>;
}

export type EditableGridColumn<TRow extends object> =
  | EditableGridTextColumn<TRow>
  | EditableGridNumberColumn<TRow>
  | EditableGridDisplayColumn<TRow>
  | EditableGridPopupColumn<TRow, PopupOptionRecord>
  | EditableGridBarcodeColumn<TRow>
  | EditableGridComboboxColumn<TRow, PopupOptionRecord>
  | EditableGridSearchColumn<TRow, PopupOptionRecord>
  | EditableGridBrandSearchColumn<TRow>;

interface EditableGridTableProps<TRow extends object> {
  columns: EditableGridColumn<TRow>[];
  rows: TRow[];
  onRowsChange: (rows: TRow[]) => void;
  createRow?: (rows: TRow[]) => TRow;
  isRowEmpty?: (row: TRow) => boolean;
  ariaLabel?: string;
  rowKey?: (row: TRow, rowIndex: number) => string;
  onCellKeyDown?: EditableGridCellKeyDownHandler<TRow>;
  focusRequestToken?: number;
  focusRequestRowIndex?: number;
  focusRequestColumnIndex?: number;
}

type PopupState = {
  rowIndex: number;
  columnIndex: number;
  filter: string;
  activeIndex: number;
};

type MessageDialogState = {
  title: string;
  message: string;
  focusRowIndex: number;
  focusColumnIndex: number;
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
const isSpaceKey = (key: string) => key === ' ' || key === 'Spacebar' || key === 'Space';
const getPopupFieldValue = (record: object, key: string) => (record as Record<string, PopupScalar>)[key];
const getOptionText = (value: PopupScalar) => String(value ?? '');

const isPopupColumn = <TRow extends object>(
  column: EditableGridColumn<TRow>,
): column is EditableGridPopupColumn<TRow, PopupOptionRecord> => column.kind === 'popup';

const isComboboxColumn = <TRow extends object>(
  column: EditableGridColumn<TRow>,
): column is EditableGridComboboxColumn<TRow, PopupOptionRecord> => column.kind === 'combobox';

const isSearchColumn = <TRow extends object>(
  column: EditableGridColumn<TRow>,
): column is EditableGridSearchColumn<TRow, PopupOptionRecord> => column.kind === 'search';

const isBrandSearchColumn = <TRow extends object>(
  column: EditableGridColumn<TRow>,
): column is EditableGridBrandSearchColumn<TRow> => column.kind === 'brand-search';

const isEditableColumn = <TRow extends object>(column: EditableGridColumn<TRow>) => {
  if (column.kind === 'display') {
    return false;
  }

  if (column.kind === 'popup') {
    return column.editable ?? Boolean(column.onValueChange);
  }

  return true;
};

export const EditableGridTable = <TRow extends object>({
  columns,
  rows,
  onRowsChange,
  createRow,
  isRowEmpty,
  ariaLabel = 'Editable grid table',
  rowKey,
  onCellKeyDown,
  focusRequestToken,
  focusRequestRowIndex = 0,
  focusRequestColumnIndex = 0,
}: EditableGridTableProps<TRow>) => {
  const inputRefs = useRef<Map<string, HTMLElement>>(new Map());
  const pendingFocusRef = useRef<{ rowIndex: number; columnIndex: number } | null>(null);
  const skipNextFocusPopupOpenRef = useRef<{ rowIndex: number; columnIndex: number } | null>(null);
  const didInitRowCheckRef = useRef(false);
  const messageCloseButtonRef = useRef<HTMLButtonElement>(null);
  const [popupState, setPopupState] = useState<PopupState | null>(null);
  const [messageDialogState, setMessageDialogState] = useState<MessageDialogState | null>(null);

  useEffect(() => {
    if (didInitRowCheckRef.current) {
      return;
    }

    didInitRowCheckRef.current = true;

    if (!createRow) {
      return;
    }

    const hasEmptyRow = isRowEmpty ? rows.some((row) => row && isRowEmpty(row)) : rows.length > 0;
    if (hasEmptyRow) {
      return;
    }

    onRowsChange([...rows, createRow(rows)]);
  }, [createRow, isRowEmpty, onRowsChange, rows]);

  const activePopupColumn = useMemo(() => {
    if (!popupState) {
      return null;
    }

    const column = columns[popupState.columnIndex];
    return column && isPopupColumn(column) ? column : null;
  }, [columns, popupState]);

  const filteredPopupOptions = useMemo(() => {
    if (!popupState || !activePopupColumn) {
      return [] as PopupOptionRecord[];
    }

    const query = popupState.filter.trim().toLowerCase();
    if (!query) {
      return activePopupColumn.popup.options;
    }

    return activePopupColumn.popup.options.filter((option) => {
      return activePopupColumn.popup.filterKeys.some((key) =>
        getOptionText(getPopupFieldValue(option, key)).toLowerCase().includes(query),
      );
    });
  }, [activePopupColumn, popupState]);

  const columnStyles = useMemo(
    () => columns.map((column) => ({ width: column.width ?? 'auto' })),
    [columns],
  );

  const getRefKey = (rowIndex: number, columnIndex: number) => `${rowIndex}:${columnIndex}`;

  const focusCell = (rowIndex: number, columnIndex: number) => {
    const rowMax = rows.length - 1;
    const columnMax = columns.length - 1;

    if (rowMax < 0 || columnMax < 0) {
      return;
    }

    const safeRow = clamp(rowIndex, 0, rowMax);
    const safeColumn = clamp(columnIndex, 0, columnMax);
    const ref = inputRefs.current.get(getRefKey(safeRow, safeColumn));

    if (!ref) {
      return;
    }

    if (ref instanceof HTMLInputElement) {
      ref.focus();
      ref.select();
      return;
    }

    const nestedInput = ref.querySelector('input');
    if (nestedInput instanceof HTMLInputElement) {
      nestedInput.focus();
      nestedInput.select();
    }
  };

  const shouldMoveHorizontally = (
    event: KeyboardEvent<HTMLInputElement>,
    direction: 'left' | 'right',
    readOnly: boolean,
  ) => {
    if (readOnly) {
      return true;
    }

    const target = event.currentTarget;
    const selectionStart = target.selectionStart;
    const selectionEnd = target.selectionEnd;

    if (selectionStart === null || selectionEnd === null || selectionStart !== selectionEnd) {
      return false;
    }

    if (direction === 'left') {
      return selectionStart === 0;
    }

    return selectionEnd === target.value.length;
  };

  useEffect(() => {
    if (!pendingFocusRef.current) {
      return;
    }

    const target = pendingFocusRef.current;
    pendingFocusRef.current = null;
    focusCell(target.rowIndex, target.columnIndex);
  }, [rows, columns]);

  useEffect(() => {
    if (focusRequestToken === undefined) {
      return;
    }
    debugger;

    focusCell(rows.length -1, focusRequestColumnIndex);
  }, [focusRequestColumnIndex, focusRequestRowIndex, focusRequestToken]);

  useEffect(() => {
    if (!popupState) {
      return;
    }

    setPopupState((current) => {
      if (!current) {
        return current;
      }

      const maxIndex = Math.max(filteredPopupOptions.length - 1, 0);
      return {
        ...current,
        activeIndex: clamp(current.activeIndex, 0, maxIndex),
      };
    });
  }, [filteredPopupOptions, popupState]);

  const closePopup = () => {
    setPopupState(null);
  };

  const closeMessageDialog = () => {
    setMessageDialogState((current) => {
      if (current) {
        window.requestAnimationFrame(() => {
          focusCell(current.focusRowIndex, current.focusColumnIndex);
        });
      }

      return null;
    });
  };

  useEffect(() => {
    if (!messageDialogState) {
      return;
    }

    messageCloseButtonRef.current?.focus();
  }, [messageDialogState]);

  const openPopup = (rowIndex: number, columnIndex: number) => {
    if (popupState && popupState.rowIndex === rowIndex && popupState.columnIndex === columnIndex) {
      return;
    }

    const column = columns[columnIndex];
    if (!column || !isPopupColumn(column)) {
      return;
    }

    setPopupState({
      rowIndex,
      columnIndex,
      filter: '',
      activeIndex: 0,
    });
  };

  const getColumnIndexByKey = (columnKey: string, fallbackColumnIndex: number) => {
    const foundIndex = columns.findIndex((column) => column.key === columnKey);
    return foundIndex >= 0 ? foundIndex : fallbackColumnIndex;
  };

  const getFirstEditableColumnIndex = () => {
    const firstEditableIndex = columns.findIndex((column) => isEditableColumn(column));
    return firstEditableIndex >= 0 ? firstEditableIndex : 0;
  };

  const applyPopupSelection = (option: PopupOptionRecord) => {
    if (!popupState || !activePopupColumn) {
      return;
    }

    const { rowIndex, columnIndex } = popupState;
    const currentRow = rows[rowIndex];
    if (!currentRow) {
      closePopup();
      return;
    }

    const nextRow = { ...(currentRow as object) } as Record<string, unknown>;
    activePopupColumn.popup.rowMappings.forEach(({ rowField, optionField }) => {
      nextRow[rowField] = getPopupFieldValue(option, optionField) as TRow[FieldKey<TRow>];
    });

    const filledRows = rows.map((row, currentIndex) =>
      currentIndex === rowIndex ? (nextRow as TRow) : row,
    );

    let nextRows = filledRows;
    let focusRowIndex = rowIndex;
    let focusColumnIndex = getColumnIndexByKey(
      activePopupColumn.popup.focusColumnKeyAfterSelect ?? activePopupColumn.key,
      columnIndex,
    );

    if (activePopupColumn.popup.appendRowAfterSelect && createRow) {
      nextRows = [...filledRows, createRow(filledRows)];
      focusRowIndex = nextRows.length - 1;
      // Requirement: focus must land on the new row first cell.
      focusColumnIndex = 0;
    }

    // For focus-triggered popup columns, the programmatic post-select focus would
    // otherwise reopen the popup immediately. Skip exactly one focus-open cycle.
    if ((activePopupColumn.popup.triggerKey ?? 'space') === 'focus') {
      skipNextFocusPopupOpenRef.current = { rowIndex: focusRowIndex, columnIndex: focusColumnIndex };
    }

    pendingFocusRef.current = { rowIndex: focusRowIndex, columnIndex: focusColumnIndex };
    onRowsChange(nextRows);
    closePopup();
  };

  const defaultEnterMove = (rowIndex: number, columnIndex: number) => {
    if (columnIndex < columns.length - 1) {
      focusCell(rowIndex, columnIndex + 1);
      return;
    }

    if (rowIndex < rows.length - 1) {
      focusCell(rowIndex + 1, 0);
      return;
    }

    if (!createRow) {
      return;
    }

    const lastRow = rows[rowIndex];
    if (lastRow && isRowEmpty?.(lastRow)) {
      focusCell(rowIndex, 0);
      return;
    }

    const nextRows = [...rows, createRow(rows)];
    pendingFocusRef.current = { rowIndex: nextRows.length - 1, columnIndex: 0 };
    onRowsChange(nextRows);
  };

  const applyMoveAction = (action: CellMoveAction, rowIndex: number, columnIndex: number) => {
    if (action.type === 'stay') {
      return;
    }

    if (action.type === 'next') {
      defaultEnterMove(rowIndex, columnIndex);
      return;
    }

    if (action.type === 'focus') {
      focusCell(action.rowIndex, action.columnIndex);
      return;
    }

    if (action.type === 'focusAfterChange') {
      pendingFocusRef.current = { rowIndex: action.rowIndex, columnIndex: action.columnIndex };
      return;
    }

    if (action.type === 'showMessage') {
      setMessageDialogState({
        title: action.title ?? 'Validation error',
        message: action.message,
        focusRowIndex: action.focusRowIndex ?? rowIndex,
        focusColumnIndex: action.focusColumnIndex ?? columnIndex,
      });
      return;
    }

    focusCell(rowIndex + action.rowDelta, columnIndex + action.colDelta);
  };

  const updateCellValue = (rowIndex: number, columnIndex: number, nextValue: string) => {
    const column = columns[columnIndex];
    const row = rows[rowIndex];

    if (!column || !row || column.kind === 'display' || !('onValueChange' in column) || !column.onValueChange) {
      return;
    }

    // Number columns are digit-only (0-9) even though rendered as plain text inputs.
    let filteredValue = nextValue;
    if (column.kind === 'number') {
      filteredValue = nextValue.replace(/[^0-9]/g, '');
    }

    // Barcode columns can define custom allowed character rules.
    if (column.kind === 'barcode' && column.allowedCharacters) {
      filteredValue = nextValue
        .split('')
        .filter((char) => column.allowedCharacters!.test(char))
        .join('');
    }

    const { onValueChange } = column;

    const nextRows = rows.map((currentRow, currentIndex) =>
      currentIndex === rowIndex ? onValueChange(currentRow, filteredValue, currentIndex) : currentRow,
    );

    onRowsChange(nextRows);
  };

  const handlePopupInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!popupState) {
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setPopupState((current) =>
        current
          ? {
              ...current,
              activeIndex: Math.min(current.activeIndex + 1, Math.max(filteredPopupOptions.length - 1, 0)),
            }
          : current,
      );
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setPopupState((current) =>
        current ? { ...current, activeIndex: Math.max(current.activeIndex - 1, 0) } : current,
      );
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      const selected = filteredPopupOptions[popupState.activeIndex];
      if (selected) {
        applyPopupSelection(selected);
      }
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      closePopup();
    }
  };

  const handleCellKeyDown = (event: KeyboardEvent<HTMLInputElement>, rowIndex: number, columnIndex: number) => {
    const column = columns[columnIndex];
    const row = rows[rowIndex];

    if (!column || !row) {
      return;
    }

    const context: EditableGridCellContext<TRow> = {
      event,
      row,
      rowIndex,
      column,
      columnIndex,
      rows,
      columns,
    };

    if (isSpaceKey(event.key) && isPopupColumn(column)) {
      const triggerKey = column.popup.triggerKey ?? 'space';
      const canOpenOnSpace =
        triggerKey === 'space' || (triggerKey === 'focus' && column.popup.shouldOpenOnSpace?.(row, rowIndex));

      if (!canOpenOnSpace) {
        return;
      }

      event.preventDefault();
      openPopup(rowIndex, columnIndex);
      return;
    }

    const action = onCellKeyDown?.(context) ?? ('onCellKeyDown' in column ? column.onCellKeyDown?.(context) : undefined);
    if (action) {
      event.preventDefault();
      applyMoveAction(action, rowIndex, columnIndex);
      return;
    }

    const readOnlyCell =
      !isEditableColumn(column) ||
      (isPopupColumn(column) && (column.popup.triggerKey ?? 'space') === 'space');

    if (event.key === 'ArrowLeft' && shouldMoveHorizontally(event, 'left', readOnlyCell)) {
      event.preventDefault();
      focusCell(rowIndex, columnIndex - 1);
      return;
    }

    if (event.key === 'ArrowRight' && shouldMoveHorizontally(event, 'right', readOnlyCell)) {
      event.preventDefault();
      focusCell(rowIndex, columnIndex + 1);
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      focusCell(rowIndex + 1, columnIndex);
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      focusCell(rowIndex - 1, columnIndex);
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      defaultEnterMove(rowIndex, columnIndex);
    }
  };

  const handleCellFocus = (rowIndex: number, columnIndex: number) => {
    const column = columns[columnIndex];
    if (!column || !isPopupColumn(column)) {
      return;
    }

    const row = rows[rowIndex];
    if (!row) {
      return;
    }

    if ((column.popup.triggerKey ?? 'space') === 'focus') {
      if (column.popup.shouldOpenOnFocus && !column.popup.shouldOpenOnFocus(row, rowIndex)) {
        return;
      }

      const skipTarget = skipNextFocusPopupOpenRef.current;
      if (skipTarget && skipTarget.rowIndex === rowIndex && skipTarget.columnIndex === columnIndex) {
        skipNextFocusPopupOpenRef.current = null;
        return;
      }

      openPopup(rowIndex, columnIndex);
    }
  };

  return (
    <>
      <div className={styles.tableWrap}>
        <table className={styles.table} aria-label={ariaLabel}>
          <colgroup>
            {columnStyles.map((style, index) => (
              <col key={`${columns[index]?.key ?? index}-width`} style={style} />
            ))}
          </colgroup>
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.key}>{column.header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowKey?.(row, rowIndex) ?? `row-${rowIndex}`}>
                {columns.map((column, columnIndex) => {
                  const editable = isEditableColumn(column);
                  const inputType =
                    column.kind === 'number'
                      ? 'text'
                      : column.kind === 'popup'
                        ? column.inputType ?? 'text'
                        : column.kind === 'barcode'
                          ? 'text'
                          : 'text';
                  const inputMode = column.kind === 'number' ? 'numeric' : undefined;

                  // Check if this is a popup column with space trigger (should be read-only to prevent typing)
                  const popupTriggerKey = isPopupColumn(column) ? (column.popup.triggerKey ?? 'space') : null;
                  const isPopupTriggeredCell = popupTriggerKey === 'space' || popupTriggerKey === 'focus';
                  const shouldBeReadOnly = !editable || isPopupTriggeredCell;

                  // Render combobox column
                  if (isComboboxColumn(column)) {
                    const displayValue = String(column.getValue(row, rowIndex));

                    // Find the exact matching option to show as selected
                    const selectedOption = column.options.find(
                      (option) =>
                        String(getPopupFieldValue(option, column.displayField) ?? '') === displayValue,
                    );
                    const selected = selectedOption ? [selectedOption] : [];

                    return (
                      <td key={`${column.key}-${rowIndex}`}>
                        <div
                          ref={(element) => {
                            const refKey = getRefKey(rowIndex, columnIndex);
                            if (element) {
                              inputRefs.current.set(refKey, element);
                            } else {
                              inputRefs.current.delete(refKey);
                            }
                          }}
                          className={styles.comboboxCell}
                        >
                          <Typeahead
                            id={`combobox-${rowIndex}-${columnIndex}`}
                            options={column.options as any}
                            labelKey={(option: any) =>
                              String(getPopupFieldValue(option as PopupOptionRecord, column.displayField) ?? '')
                            }
                            filterBy={(option: any, state: any) => {
                              const filterFieldKey = column.filterField || column.displayField;
                              const optionText = String(
                                getPopupFieldValue(option as PopupOptionRecord, filterFieldKey) ?? '',
                              ).toLowerCase();
                              const searchTerm = String(state?.text ?? '').toLowerCase();
                              return optionText.includes(searchTerm);
                            }}
                            selected={selected as any}
                            onChange={(selected: any) => {
                              if (selected.length > 0) {
                                const chosenOption = selected[0] as PopupOptionRecord;
                                const nextRow = { ...(row as object) } as Record<string, unknown>;

                                if (column.rowMappings) {
                                  column.rowMappings.forEach(({ rowField, optionField }) => {
                                    nextRow[rowField] = getPopupFieldValue(chosenOption, optionField) as TRow[FieldKey<TRow>];
                                  });
                                } else {
                                  nextRow[column.key as FieldKey<TRow>] = getPopupFieldValue(
                                    chosenOption,
                                    column.displayField,
                                  ) as TRow[FieldKey<TRow>];
                                }

                                const nextRows = rows.map((currentRow, currentIndex) =>
                                  currentIndex === rowIndex ? (nextRow as TRow) : currentRow,
                                );

                                onRowsChange(nextRows);
                                focusCell(rowIndex, columnIndex + 1);
                              }
                            }}
                            onInputChange={(text: string) => {
                              // Keep the row value in sync as the user types
                              const nextRows = rows.map((currentRow, currentIndex) =>
                                currentIndex === rowIndex
                                  ? column.onValueChange(currentRow, text, currentIndex)
                                  : currentRow,
                              );
                              onRowsChange(nextRows);
                            }}
                            inputProps={{
                              className: styles.cellInput,
                              onKeyDown: (event: KeyboardEvent<HTMLInputElement>) =>
                                handleCellKeyDown(event, rowIndex, columnIndex),
                            }}
                            placeholder={column.placeholder}
                            positionFixed
                            clearButton
                          />
                        </div>
                      </td>
                    );
                  }

                  // Render searchable table column
                  if (isSearchColumn(column)) {
                    const searchValue = String(column.getValue(row, rowIndex));

                    return (
                      <td key={`${column.key}-${rowIndex}`}>
                        <div
                          ref={(element) => {
                            const refKey = getRefKey(rowIndex, columnIndex);
                            if (element) {
                              inputRefs.current.set(refKey, element);
                            } else {
                              inputRefs.current.delete(refKey);
                            }
                          }}
                        >
                          <SearchableTable
                            items={column.items}
                            columns={column.searchColumns}
                            searchFields={column.searchFields}
                            displayField={column.displayField}
                            placeholder={column.placeholder}
                            emptyMessage={column.emptyMessage}
                            maxResults={column.maxResults}
                            value={searchValue}
                            showResultCount={false}
                            compact
                            onQueryChange={(text) => {
                              const nextRows = rows.map((currentRow, currentIndex) =>
                                currentIndex === rowIndex
                                  ? column.onValueChange(currentRow, text, currentIndex)
                                  : currentRow,
                              );
                              onRowsChange(nextRows);
                            }}
                            onInputKeyDown={(event) => handleCellKeyDown(event, rowIndex, columnIndex)}
                            onItemSelect={(selectedItem) => {
                              const nextRow = { ...(row as object) } as Record<string, unknown>;

                              if (column.rowMappings) {
                                column.rowMappings.forEach(({ rowField, optionField }) => {
                                  nextRow[rowField] = getPopupFieldValue(selectedItem, optionField) as TRow[FieldKey<TRow>];
                                });
                              } else {
                                nextRow[column.key as FieldKey<TRow>] = getPopupFieldValue(
                                  selectedItem,
                                  column.displayField,
                                ) as TRow[FieldKey<TRow>];
                              }

                              const nextRows = rows.map((currentRow, currentIndex) =>
                                currentIndex === rowIndex ? (nextRow as TRow) : currentRow,
                              );

                              onRowsChange(nextRows);
                              focusCell(rowIndex, columnIndex + 1);
                            }}
                          />
                        </div>
                      </td>
                    );
                  }

                    // Render brand-search column (custom component)
                    if (isBrandSearchColumn(column)) {
                      const brandValue = String(column.getValue(row, rowIndex));

                      return (
                        <td key={`${column.key}-${rowIndex}`}>
                          <div
                            ref={(element) => {
                              const refKey = getRefKey(rowIndex, columnIndex);
                              if (element) {
                                inputRefs.current.set(refKey, element);
                              } else {
                                inputRefs.current.delete(refKey);
                              }
                            }}
                          >
                            <column.renderComponent
                              value={brandValue}
                              onChange={(nextValue) => {
                                const nextRows = rows.map((currentRow, currentIndex) =>
                                  currentIndex === rowIndex
                                    ? column.onValueChange(currentRow, nextValue, currentIndex)
                                    : currentRow,
                                );
                                onRowsChange(nextRows);
                              }}
                              onKeyDown={(event) => handleCellKeyDown(event, rowIndex, columnIndex)}
                            />
                          </div>
                        </td>
                      );
                    }

                  // Render standard input cell
                  return (
                    <td key={`${column.key}-${rowIndex}`}>
                      <input
                        ref={(element) => {
                          const refKey = getRefKey(rowIndex, columnIndex);
                          if (element) {
                            inputRefs.current.set(refKey, element);
                          } else {
                            inputRefs.current.delete(refKey);
                          }
                        }}
                        className={styles.cellInput}
                        data-align={column.align ?? 'left'}
                        type={inputType}
                        inputMode={inputMode}
                        value={column.getValue(row, rowIndex)}
                        placeholder={column.placeholder}
                        readOnly={shouldBeReadOnly}
                        onChange={(event) => updateCellValue(rowIndex, columnIndex, event.target.value)}
                        onFocus={() => handleCellFocus(rowIndex, columnIndex)}
                        onKeyDown={(event) => handleCellKeyDown(event, rowIndex, columnIndex)}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {popupState && activePopupColumn && (
        <div className={styles.pickerOverlay} role="presentation" onClick={closePopup}>
          <section
            className={styles.pickerDialog}
            role="dialog"
            aria-modal="true"
            aria-label={activePopupColumn.popup.title}
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles.pickerHeader}>
              <h3>{activePopupColumn.popup.title}</h3>
              <button className={styles.pickerCloseButton} type="button" onClick={closePopup}>
                Close
              </button>
            </div>

            <label className={styles.pickerField}>
              <span>Filter items</span>
              <input
                value={popupState.filter}
                onChange={(event) =>
                  setPopupState((current) =>
                    current
                      ? {
                          ...current,
                          filter: event.target.value,
                          activeIndex: 0,
                        }
                      : current,
                  )
                }
                onKeyDown={handlePopupInputKeyDown}
                placeholder={activePopupColumn.popup.filterPlaceholder ?? 'Type to filter'}
                autoFocus
              />
            </label>

            <div className={styles.pickerList}>
              {filteredPopupOptions.map((option, index) => {
                const optionId = getOptionText(getPopupFieldValue(option, activePopupColumn.popup.optionIdKey));
                const isActive = index === popupState.activeIndex;

                return (
                  <button
                    key={optionId}
                    type="button"
                    className={`${styles.pickerRow} ${isActive ? styles.pickerRowActive : ''}`}
                    style={{
                      gridTemplateColumns: `repeat(${activePopupColumn.popup.displayFields.length}, minmax(0, 1fr))`,
                    }}
                    aria-selected={isActive}
                    onClick={() => applyPopupSelection(option)}
                  >
                    {activePopupColumn.popup.displayFields.map((field) => (
                      <span key={`${optionId}-${field.key}`}>
                        {getOptionText(getPopupFieldValue(option, field.key))}
                      </span>
                    ))}
                  </button>
                );
              })}

              {filteredPopupOptions.length === 0 && (
                <div className={styles.pickerEmpty}>
                  <strong>No items found</strong>
                  <p>{activePopupColumn.popup.emptyMessage ?? 'Try another filter.'}</p>
                </div>
              )}
            </div>
          </section>
        </div>
      )}

      {messageDialogState && (
        <div
          className={styles.messageOverlay}
          role="presentation"
          onClick={closeMessageDialog}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.preventDefault();
              closeMessageDialog();
            }
          }}
        >
          <section
            className={styles.messageDialog}
            role="alertdialog"
            aria-modal="true"
            aria-label={messageDialogState.title}
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className={styles.messageTitle}>{messageDialogState.title}</h3>
            <p className={styles.messageText}>{messageDialogState.message}</p>
            <div className={styles.messageActions}>
              <button ref={messageCloseButtonRef} className="button" type="button" onClick={closeMessageDialog}>
                Close
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
};
