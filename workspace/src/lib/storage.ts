/**
 * Safe localStorage wrapper.
 *
 * Why this exists:
 *  - `window.localStorage` access during SSR / Next.js build throws.
 *  - Browsers in private mode throw on `localStorage.setItem`.
 *  - Some embedded webviews (e.g. Instagram in-app browser) disable localStorage.
 *
 * This wrapper falls back to an in-memory Map when the real API is unavailable,
 * so feature code can call `safeLocalStorage.getItem(...)` without worrying
 * about the environment.
 */

const memoryStore = new Map<string, string>();

function isLocalStorageAvailable(): boolean {
  try {
    if (typeof window === 'undefined') return false;
    const testKey = '__pracpedia_storage_test__';
    window.localStorage.setItem(testKey, '1');
    window.localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

const hasLocalStorage = typeof window !== 'undefined' && isLocalStorageAvailable();

export const safeLocalStorage = {
  getItem(key: string): string | null {
    try {
      if (hasLocalStorage) return window.localStorage.getItem(key);
      return memoryStore.get(key) ?? null;
    } catch {
      return memoryStore.get(key) ?? null;
    }
  },

  setItem(key: string, value: string): void {
    try {
      if (hasLocalStorage) {
        window.localStorage.setItem(key, value);
      } else {
        memoryStore.set(key, value);
      }
    } catch {
      memoryStore.set(key, value);
    }
  },

  removeItem(key: string): void {
    try {
      if (hasLocalStorage) window.localStorage.removeItem(key);
      else memoryStore.delete(key);
    } catch {
      memoryStore.delete(key);
    }
  },
};
