// Small typed wrapper around IndexedDB (idb-keyval). Everything the app keeps
// on the device goes through here. Storage can be unavailable (for example a
// private window), so reads fall back to a default and writes never throw.

import { createStore, get, set } from 'idb-keyval';
import type { ThemeChoice } from './theme.ts';

const store = createStore('ic-companion', 'kv');

const KEYS = {
  theme: 'settings.theme',
  lastLocation: 'nav.lastLocation',
} as const;

export async function read<T>(key: string, fallback: T): Promise<T> {
  try {
    const value = await get<T>(key, store);
    return value ?? fallback;
  } catch {
    return fallback;
  }
}

export async function write<T>(key: string, value: T): Promise<void> {
  try {
    await set(key, value, store);
  } catch (err) {
    console.warn(`Could not save ${key}`, err);
  }
}

// ---- theme ----

export const loadThemeChoice = () => read<ThemeChoice>(KEYS.theme, 'system');
export const saveThemeChoice = (choice: ThemeChoice) => write(KEYS.theme, choice);

// ---- last place visited, for the Continue button ----

export type LastLocation = { level: number; id: string; step: string };

export const loadLastLocation = () => read<LastLocation | null>(KEYS.lastLocation, null);
export const saveLastLocation = (loc: LastLocation) => write(KEYS.lastLocation, loc);
