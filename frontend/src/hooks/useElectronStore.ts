import { useCallback } from 'react';

interface ElectronStore {
  get: (key: string) => Promise<unknown>;
  set: (key: string, value: unknown) => Promise<void>;
  delete: (key: string) => Promise<void>;
}

/**
 * Hook to access Electron's persistent store from React components.
 * Only available when running inside the Electron app.
 *
 * @example
 * const { getStoreValue, setStoreValue } = useElectronStore();
 *
 * // Save data
 * await setStoreValue('user-preferences', { theme: 'dark' });
 *
 * // Load data
 * const prefs = await getStoreValue('user-preferences');
 */
export const useElectronStore = () => {
  const isElectron = typeof window !== 'undefined' && window.electronAPI?.store !== undefined;

  const getStoreValue = useCallback(async (key: string) => {
    const store = window.electronAPI?.store;
    if (!store) {
      console.warn('useElectronStore: Not running in Electron environment');
      return null;
    }
    return store.get(key);
  }, []);

  const setStoreValue = useCallback(async (key: string, value: unknown) => {
    const store = window.electronAPI?.store;
    if (!store) {
      console.warn('useElectronStore: Not running in Electron environment');
      return;
    }
    await store.set(key, value);
  }, []);

  const deleteStoreValue = useCallback(async (key: string) => {
    const store = window.electronAPI?.store;
    if (!store) {
      console.warn('useElectronStore: Not running in Electron environment');
      return;
    }
    await store.delete(key);
  }, []);

  return {
    getStoreValue,
    setStoreValue,
    deleteStoreValue,
    isElectronApp: isElectron,
  };
};

/**
 * Check if the app is running in Electron
 */
export const isElectronApp = () => {
  return typeof window !== 'undefined' && window.electronAPI !== undefined;
};

