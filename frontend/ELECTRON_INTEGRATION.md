# Electron Integration Guide for SalesDemo

This guide explains how to integrate Electron-specific features into the SalesDemo React application.

## Overview

The Electron wrapper provides several features that can be used in your React components:

1. **Persistent Data Storage** - Save/load data that persists across app restarts
2. **Desktop-specific Features** - Native menus, window controls, system tray, etc.
3. **Security** - Context isolation and secure IPC communication

## Using Electron Store in React

### Basic Usage

The `useElectronStore` hook makes it easy to access persistent storage:

```typescript
import { useElectronStore } from '../hooks/useElectronStore';

function MyComponent() {
  const { getStoreValue, setStoreValue, deleteStoreValue, isElectronApp } = useElectronStore();

  const handleSave = async () => {
    await setStoreValue('my-key', { data: 'value' });
  };

  const handleLoad = async () => {
    const data = await getStoreValue('my-key');
    console.log(data);
  };

  if (!isElectronApp) {
    return <p>Not running in Electron</p>;
  }

  return (
    <div>
      <button onClick={handleSave}>Save</button>
      <button onClick={handleLoad}>Load</button>
    </div>
  );
}
```

### Storing User Preferences

```typescript
import { useEffect, useState } from 'react';
import { useElectronStore } from '../hooks/useElectronStore';

function PreferencesComponent() {
  const { getStoreValue, setStoreValue } = useElectronStore();
  const [theme, setTheme] = useState('light');

  // Load preferences on mount
  useEffect(() => {
    const loadPreferences = async () => {
      const prefs = await getStoreValue('user-preferences');
      if (prefs?.theme) {
        setTheme(prefs.theme);
      }
    };
    loadPreferences();
  }, [getStoreValue]);

  const handleThemeChange = async (newTheme: string) => {
    setTheme(newTheme);
    await setStoreValue('user-preferences', { theme: newTheme });
  };

  return (
    <div>
      <select value={theme} onChange={(e) => handleThemeChange(e.target.value)}>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </select>
    </div>
  );
}
```

### Caching Invoice Data

For the POS system, you could cache draft invoices:

```typescript
// In PosSalesPage.tsx
const { getStoreValue, setStoreValue } = useElectronStore();

// Save draft automatically
useEffect(() => {
  const saveDraft = async () => {
    if (draft.items.length > 0) {
      await setStoreValue('invoice-draft', draft);
    }
  };
  
  const timer = setTimeout(saveDraft, 2000); // Auto-save every 2 seconds
  return () => clearTimeout(timer);
}, [draft, setStoreValue]);

// Load draft on mount
useEffect(() => {
  const loadDraft = async () => {
    const saved = await getStoreValue('invoice-draft');
    if (saved) {
      onDraftChange(saved);
    }
  };
  loadDraft();
}, [onDraftChange]);
```

### Storing Customer Selection

```typescript
// Remember selected customer across sessions
const handleCustomerSelect = async (customerId: string) => {
  onDraftChange({ ...draft, customerId });
  await setStoreValue('last-selected-customer', customerId);
};

// Restore customer on app load
useEffect(() => {
  const loadLastCustomer = async () => {
    const customerId = await getStoreValue('last-selected-customer');
    if (customerId && draft.customerId === '') {
      onDraftChange({ ...draft, customerId });
    }
  };
  loadLastCustomer();
}, []);
```

## Detecting Electron Environment

Use the `isElectronApp` export to conditionally render features:

```typescript
import { isElectronApp } from '../hooks/useElectronStore';

function MyComponent() {
  if (!isElectronApp()) {
    return <p>This feature only works in the desktop app</p>;
  }

  return <div>Desktop-only content</div>;
}
```

Or use the hook's `isElectronApp` return value:

```typescript
function MyComponent() {
  const { isElectronApp } = useElectronStore();
  
  return isElectronApp && <DesktopFeature />;
}
```

## Data Storage Locations

Data stored via `window.electronAPI.store` is persisted at:

- **macOS**: `~/Library/Application Support/salesdemo-electron/`
- **Windows**: `%APPDATA%/salesdemo-electron/`
- **Linux**: `~/.config/salesdemo-electron/`

The actual store file is `config.json` in these directories.

## Examples

### Complete Invoice Draft Auto-Save Example

```typescript
import { useEffect } from 'react';
import { useElectronStore } from '../hooks/useElectronStore';
import type { SalesOrderDraft } from '../types';

interface UseInvoicePersistenceProps {
  draft: SalesOrderDraft;
  onDraftChange: (draft: SalesOrderDraft) => void;
}

export function useInvoicePersistence({
  draft,
  onDraftChange,
}: UseInvoicePersistenceProps) {
  const { getStoreValue, setStoreValue } = useElectronStore();

  // Auto-save draft every 3 seconds
  useEffect(() => {
    if (draft.items.length === 0) return;

    const timer = setTimeout(async () => {
      try {
        await setStoreValue('current-invoice-draft', draft);
      } catch (error) {
        console.error('Failed to auto-save draft:', error);
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [draft, setStoreValue]);

  // Restore draft on mount
  useEffect(() => {
    const restoreDraft = async () => {
      try {
        const saved = await getStoreValue('current-invoice-draft');
        if (saved && typeof saved === 'object') {
          onDraftChange(saved as SalesOrderDraft);
        }
      } catch (error) {
        console.error('Failed to restore draft:', error);
      }
    };

    restoreDraft();
  }, [onDraftChange, getStoreValue]);

  return {
    clearDraft: async () => {
      await setStoreValue('current-invoice-draft', null);
    },
  };
}
```

### Use in PosSalesPage:

```typescript
function PosSalesPage({ ... }: PosSalesPageProps) {
  // ... existing code ...
  
  const { clearDraft } = useInvoicePersistence({ draft, onDraftChange });

  const saveAndClearInvoice = async () => {
    // ... existing save logic ...
    await clearDraft(); // Clear the auto-saved draft
    // ... rest of logic ...
  };

  // ... rest of component ...
}
```

## Security Considerations

The Electron wrapper uses **context isolation** to keep your React app safe:

1. **No Direct Node.js Access**: React components cannot directly access Node.js APIs
2. **Limited IPC Interface**: Only the store API is exposed through `window.electronAPI`
3. **Preload Script Validation**: All IPC calls go through the preload script validation

To add more APIs securely:

1. Add the handler in `electron/src/main.ts`:
```typescript
ipcMain.handle('myapi:do-something', async (event, param) => {
  // Handle the request
  return result;
});
```

2. Expose it in `electron/src/preload.ts`:
```typescript
contextBridge.exposeInMainWorld('electronAPI', {
  myapi: {
    doSomething: (param: string) => ipcRenderer.invoke('myapi:do-something', param),
  },
});
```

3. Update types in `frontend/src/types/electron.d.ts`:
```typescript
declare global {
  interface Window {
    electronAPI: {
      myapi: {
        doSomething: (param: string) => Promise<any>;
      };
    };
  }
}
```

4. Use in React:
```typescript
await window.electronAPI.myapi.doSomething('value');
```

## Common Patterns

### Loading State Management

```typescript
const [isLoading, setIsLoading] = useState(true);
const [data, setData] = useState(null);
const { getStoreValue } = useElectronStore();

useEffect(() => {
  const load = async () => {
    try {
      const value = await getStoreValue('my-key');
      setData(value);
    } finally {
      setIsLoading(false);
    }
  };
  load();
}, [getStoreValue]);
```

### Error Handling

```typescript
const [error, setError] = useState<string | null>(null);
const { setStoreValue } = useElectronStore();

const handleSave = async (value: any) => {
  try {
    setError(null);
    await setStoreValue('my-key', value);
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Unknown error');
  }
};
```

### Debounced Saves

```typescript
import { useCallback, useRef } from 'react';
import { useElectronStore } from '../hooks/useElectronStore';

function useDebounceStore(key: string, delay = 1000) {
  const { setStoreValue } = useElectronStore();
  const timerRef = useRef<NodeJS.Timeout>();

  const debouncedSet = useCallback(
    (value: any) => {
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setStoreValue(key, value);
      }, delay);
    },
    [key, delay, setStoreValue],
  );

  return debouncedSet;
}
```

## Troubleshooting

### "window.electronAPI is undefined"

This means the app is not running in the Electron environment. Check:
1. Are you running with `npm run dev` from the `electron` directory?
2. Is the frontend dev server running on port 5173?
3. Check browser console for errors

### Data not persisting

Check the data storage location for your OS:
- **macOS**: `~/Library/Application Support/salesdemo-electron/config.json`
- **Windows**: `%APPDATA%/salesdemo-electron/config.json`
- **Linux**: `~/.config/salesdemo-electron/config.json`

You can manually delete these files to reset the store.

### Type errors with useElectronStore

Make sure the `electron.d.ts` file is in your TypeScript include path. It should be automatically picked up if it's in `src/types/`.

## Next Steps

1. **Add Invoice Persistence**: Use the patterns above to auto-save invoice drafts
2. **Remember User Preferences**: Store theme, language, print settings, etc.
3. **Local Cache**: Cache customer and product data for offline access
4. **Analytics**: Track usage patterns locally before syncing to server
5. **Custom IPC APIs**: Add more features as needed (print, file operations, etc.)

## Resources

- [Electron Store Documentation](https://github.com/sindresorhus/electron-store)
- [Electron IPC Documentation](https://www.electronjs.org/docs/api/ipc-main)
- [React Hooks Best Practices](https://react.dev/reference/rules/rules-of-hooks)

