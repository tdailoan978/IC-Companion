// App settings (PLAN.md 5.4 and 9.1), one record in IndexedDB. The theme has
// its own key (src/lib/theme.ts) because it must apply before first paint.

import { useSyncExternalStore } from 'react';
import { readStrict, setSaveFailed, write } from './storage.ts';
import type { Day } from './days.ts';

export type ZhSize = 'normal' | 'large' | 'xlarge';
export const ZH_SIZE_PX: Record<ZhSize, number> = { normal: 22, large: 26, xlarge: 30 };

export type Settings = {
  /** Chinese font size in lessons. */
  zhSize: ZhSize;
  /** Whether pinyin starts shown on screens that have a Pinyin toggle. */
  showPinyin: boolean;
  /** Speech rate: slow 0.7, normal 0.9. */
  speechRate: 'slow' | 'normal';
  /** Chosen zh-CN voice (voiceURI), or null for the best available. */
  voiceURI: string | null;
  /** Review: never-reviewed cards allowed into review per day. */
  newCardsPerDay: number;
  /** Review: most cards in one session. */
  sessionCap: number;
  /** Study plan: days I study, 0 = Sunday … 6 = Saturday. */
  studyDays: number[];
  /** Study plan: most minutes scheduled on one day. */
  dailyCapMin: number;
  /** Study plan: first day of the plan (null until set up). */
  planStart: Day | null;
  /** Study plan: finish date for the volume, or null for none. */
  deadline: Day | null;
  /** Study plan: a proposed finish date I dismissed (so it is not proposed again the same day). */
  deadlineProposalDismissed: Day | null;
};

export const DEFAULT_SETTINGS: Settings = {
  zhSize: 'normal',
  showPinyin: true,
  speechRate: 'normal',
  voiceURI: null,
  newCardsPerDay: 20,
  sessionCap: 40,
  studyDays: [1, 2, 3, 4, 5],
  dailyCapMin: 30,
  planStart: null,
  deadline: null,
  deadlineProposalDismissed: null,
};

const KEY = 'settings.app';
let current: Settings = DEFAULT_SETTINGS;
let loaded = false;
let loading: Promise<Settings> | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

/** Keeps only fields of the right type, so a damaged record can never break a screen. */
export function sanitizeSettings(saved: unknown): Settings {
  const s = (typeof saved === 'object' && saved !== null ? saved : {}) as Record<string, unknown>;
  const out: Settings = { ...DEFAULT_SETTINGS };
  const isDay = (v: unknown) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
  const isInt = (v: unknown, min: number, max: number) => typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max;
  if (s.zhSize === 'normal' || s.zhSize === 'large' || s.zhSize === 'xlarge') out.zhSize = s.zhSize;
  if (typeof s.showPinyin === 'boolean') out.showPinyin = s.showPinyin;
  if (s.speechRate === 'slow' || s.speechRate === 'normal') out.speechRate = s.speechRate;
  if (s.voiceURI === null || typeof s.voiceURI === 'string') out.voiceURI = s.voiceURI;
  if (isInt(s.newCardsPerDay, 0, 500)) out.newCardsPerDay = s.newCardsPerDay as number;
  if (isInt(s.sessionCap, 1, 500)) out.sessionCap = s.sessionCap as number;
  if (Array.isArray(s.studyDays) && s.studyDays.every((d) => isInt(d, 0, 6))) out.studyDays = [...new Set(s.studyDays as number[])].sort();
  if (isInt(s.dailyCapMin, 5, 240)) out.dailyCapMin = s.dailyCapMin as number;
  for (const k of ['planStart', 'deadline', 'deadlineProposalDismissed'] as const) {
    if (s[k] === null || isDay(s[k])) out[k] = s[k] as Day | null;
  }
  return out;
}

/**
 * Loads saved settings once (call at start-up). Throws if storage cannot be read, and then
 * stays unloaded so a later call tries again: defaults are never mistaken for saved settings.
 */
export function loadSettings(): Promise<Settings> {
  if (loaded) return Promise.resolve(current);
  loading ??= readStrict<unknown>(KEY, null).then(
    (saved) => {
      // A change made while loading (not possible through updateSettings, which waits) is not lost.
      current = sanitizeSettings(saved);
      loaded = true;
      notify();
      return current;
    },
    (err) => {
      loading = null;
      throw err;
    },
  );
  return loading;
}

export const getSettings = () => current;
export const settingsLoaded = () => loaded;

/** Waits for the saved settings, then applies the change and saves. Never writes over settings it could not read. */
export async function updateSettings(change: Partial<Settings>): Promise<void> {
  try {
    await loadSettings();
  } catch (err) {
    console.warn('Could not load settings', err);
    setSaveFailed(true);
    return;
  }
  current = { ...current, ...change };
  notify();
  await write(KEY, current);
}

/** Replaces all settings (used by Import). */
export async function replaceSettings(next: Settings): Promise<void> {
  current = sanitizeSettings(next);
  loaded = true;
  notify();
  await write(KEY, current);
}

export function useSettings(): Settings {
  return useSyncExternalStore(subscribe, getSettings);
}

/** Whether the saved settings have been read (screens that would offer first-time setup wait for it). */
export function useSettingsLoaded(): boolean {
  return useSyncExternalStore(subscribe, settingsLoaded);
}

export const subscribeSettings = subscribe;
