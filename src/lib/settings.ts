// App settings (PLAN.md 5.4 and 9.1), one record in IndexedDB. The theme has
// its own key (src/lib/theme.ts) because it must apply before first paint.

import { useSyncExternalStore } from 'react';
import { read, write } from './storage.ts';
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
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

/** Loads saved settings once (call at start-up); missing fields take their defaults. */
export async function loadSettings(): Promise<Settings> {
  if (!loaded) {
    const saved = await read<Partial<Settings> | null>(KEY, null);
    current = { ...DEFAULT_SETTINGS, ...saved };
    loaded = true;
    notify();
  }
  return current;
}

export const getSettings = () => current;

export async function updateSettings(change: Partial<Settings>): Promise<void> {
  current = { ...current, ...change };
  notify();
  await write(KEY, current);
}

/** Replaces all settings (used by Import). */
export async function replaceSettings(next: Settings): Promise<void> {
  current = { ...DEFAULT_SETTINGS, ...next };
  loaded = true;
  notify();
  await write(KEY, current);
}

export function useSettings(): Settings {
  return useSyncExternalStore(subscribe, getSettings);
}

export const subscribeSettings = subscribe;
