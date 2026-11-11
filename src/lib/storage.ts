// Small typed wrapper around IndexedDB (idb-keyval). Everything the app keeps
// on the device goes through here. Storage can be unavailable (for example a
// private window), so reads fall back to a default and writes never throw.

import { createStore, get, set } from 'idb-keyval';
import type { ThemeChoice } from './theme.ts';

// iOS WebKit can drop its IndexedDB connection (for example after the app sat in
// the background); a fresh store reopens it, so failed calls retry once with one.
let store = createStore('ic-companion', 'kv');
const reopen = () => {
  store = createStore('ic-companion', 'kv');
};

const KEYS = {
  theme: 'settings.theme',
  lastLocation: 'nav.lastLocation',
} as const;

async function withRetry<T>(op: () => Promise<T>): Promise<T> {
  try {
    return await op();
  } catch {
    reopen();
    return op();
  }
}

/** Reads a value; missing → fallback. Throws if storage fails, so a failed read is never mistaken for "nothing saved". */
export async function readStrict<T>(key: string, fallback: T): Promise<T> {
  const value = await withRetry(() => get<T>(key, store));
  return value ?? fallback;
}

/** Reads a value for display only (theme, last place): any failure → fallback. */
export async function read<T>(key: string, fallback: T): Promise<T> {
  try {
    return await readStrict(key, fallback);
  } catch {
    return fallback;
  }
}

// ---- save failures, shown to the user instead of only in the console ----

let saveFailed = false;
const saveListeners = new Set<() => void>();
export const getSaveFailed = () => saveFailed;
export function subscribeSaveFailed(listener: () => void): () => void {
  saveListeners.add(listener);
  return () => saveListeners.delete(listener);
}
export function setSaveFailed(value: boolean) {
  if (saveFailed === value) return;
  saveFailed = value;
  saveListeners.forEach((l) => l());
}

/** Saves a value, retrying once with a reopened store. Never throws; a failure raises the save warning. */
export async function write<T>(key: string, value: T): Promise<boolean> {
  try {
    await withRetry(() => set(key, value, store));
    setSaveFailed(false);
    return true;
  } catch (err) {
    console.warn(`Could not save ${key}`, err);
    setSaveFailed(true);
    return false;
  }
}

// ---- theme ----

export const loadThemeChoice = () => read<ThemeChoice>(KEYS.theme, 'system');
export const saveThemeChoice = (choice: ThemeChoice) => write(KEYS.theme, choice);

// ---- last place visited, for the Continue button ----

export type LastLocation = { level: number; id: string; step: string };

export const loadLastLocation = () => read<LastLocation | null>(KEYS.lastLocation, null);
export const saveLastLocation = (loc: LastLocation) => write(KEYS.lastLocation, loc);
