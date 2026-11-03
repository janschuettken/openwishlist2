/** Kleiner Wrapper um localStorage, der in privaten Fenstern nicht abstürzt. */
export const StorageKeys = {
  session: 'session',
  loginToken: 'loginToken',
  adminLoginToken: 'adminLoginToken',
  lang: 'lang',
  theme: 'theme',
} as const;

export type StorageKey = (typeof StorageKeys)[keyof typeof StorageKeys];

export const storage = {
  get(key: StorageKey): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key: StorageKey, value: string | null): void {
    try {
      if (value == null) localStorage.removeItem(key);
      else localStorage.setItem(key, value);
    } catch {
      /* ignorieren */
    }
  },
  remove(key: StorageKey): void {
    storage.set(key, null);
  },
};
