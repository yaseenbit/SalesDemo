import type {
  ChangeEvent,
  ClipboardEvent,
  DragEvent,
  FormEvent,
  InputHTMLAttributes,
  KeyboardEvent,
} from 'react';

const INTEGER_PATTERN = /^\d*$/;
const DECIMAL_PATTERN = /^\d*\.?\d*$/;

const navigationKeys = new Set([
  'Backspace',
  'Delete',
  'Tab',
  'Enter',
  'Escape',
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'ArrowDown',
  'Home',
  'End',
]);

const editingShortcutKeys = new Set(['a', 'c', 'v', 'x', 'z', 'y']);

const isValidNumericValue = (value: string, allowDecimal: boolean) => {
  return allowDecimal ? DECIMAL_PATTERN.test(value) : INTEGER_PATTERN.test(value);
};

const buildNextValue = (input: HTMLInputElement, insertedText: string) => {
  const selectionStart = input.selectionStart ?? input.value.length;
  const selectionEnd = input.selectionEnd ?? input.value.length;

  return `${input.value.slice(0, selectionStart)}${insertedText}${input.value.slice(selectionEnd)}`;
};

export interface NumericTextBoxProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'inputMode' | 'value' | 'onChange' | 'onBeforeInput'> {
  value: string;
  allowDecimal?: boolean;
  onValueChange: (value: string) => void;
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
  onBeforeInput?: (event: FormEvent<HTMLInputElement>) => void;
}

export const NumericTextBox = ({
  value,
  allowDecimal = false,
  onValueChange,
  onChange,
  onKeyDown,
  onPaste,
  onDrop,
  onBeforeInput,
  ...inputProps
}: NumericTextBoxProps) => {
  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    onKeyDown?.(event);

    if (event.defaultPrevented) {
      return;
    }

    if (event.ctrlKey || event.metaKey) {
      if (editingShortcutKeys.has(event.key.toLowerCase())) {
        return;
      }
    }

    if (event.altKey || navigationKeys.has(event.key) || event.key.length !== 1) {
      return;
    }

    const nextValue = buildNextValue(event.currentTarget, event.key);
    if (!isValidNumericValue(nextValue, allowDecimal)) {
      event.preventDefault();
    }
  };

  const handleBeforeInput = (event: FormEvent<HTMLInputElement>) => {
    onBeforeInput?.(event);

    if (event.defaultPrevented) {
      return;
    }

    const nativeEvent = event.nativeEvent as InputEvent;
    if (!nativeEvent.data || nativeEvent.isComposing) {
      return;
    }

    const nextValue = buildNextValue(event.currentTarget, nativeEvent.data);
    if (!isValidNumericValue(nextValue, allowDecimal)) {
      event.preventDefault();
    }
  };

  const handlePaste = (event: ClipboardEvent<HTMLInputElement>) => {
    onPaste?.(event);

    if (event.defaultPrevented) {
      return;
    }

    const pastedText = event.clipboardData.getData('text');
    const nextValue = buildNextValue(event.currentTarget, pastedText);
    if (!isValidNumericValue(nextValue, allowDecimal)) {
      event.preventDefault();
    }
  };

  const handleDrop = (event: DragEvent<HTMLInputElement>) => {
    onDrop?.(event);

    if (event.defaultPrevented) {
      return;
    }

    const droppedText = event.dataTransfer.getData('text');
    if (!droppedText) {
      return;
    }

    const nextValue = buildNextValue(event.currentTarget, droppedText);
    if (!isValidNumericValue(nextValue, allowDecimal)) {
      event.preventDefault();
    }
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextValue = event.target.value;
    if (!isValidNumericValue(nextValue, allowDecimal)) {
      return;
    }

    onChange?.(event);
    onValueChange(nextValue);
  };

  return (
    <input
      {...inputProps}
      type="text"
      inputMode={allowDecimal ? 'decimal' : 'numeric'}
      pattern={allowDecimal ? '\\d*\\.?\\d*' : '\\d*'}
      value={value}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      onBeforeInput={handleBeforeInput}
      onPaste={handlePaste}
      onDrop={handleDrop}
    />
  );
};
