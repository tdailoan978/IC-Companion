// Backup file for Export / Import in Settings (PLAN.md 5.4). Pure logic only:
// the Settings screen reads and writes storage and handles the file itself.

import { isThemeChoice, type ThemeChoice } from './theme.ts';

export const BACKUP_APP = 'ic-companion';
export const BACKUP_VERSION = 1;
/** When the last export happened (ISO string). Import replaces it with the backup's own copy, if any. */
export const LAST_EXPORT_KEY = 'backup.lastExport';
/** Storage key of the theme choice (see storage.ts). */
const THEME_KEY = 'settings.theme';
const REVIEW_KEY = 'review.cards';
const PROGRESS_PREFIX = 'progress.';

export type BackupEntry = [string, unknown];

export type Backup = {
  app: typeof BACKUP_APP;
  version: typeof BACKUP_VERSION;
  /** ISO time of the export. */
  exportedAt: string;
  entries: BackupEntry[];
};

export function makeBackup(entries: readonly BackupEntry[], now: Date = new Date()): Backup {
  return { app: BACKUP_APP, version: BACKUP_VERSION, exportedAt: now.toISOString(), entries: [...entries] };
}

const pad = (n: number) => String(n).padStart(2, '0');

/** `ic-companion-backup-YYYY-MM-DD.json`, in the device's own time zone. */
export function backupFileName(now: Date = new Date()): string {
  return `ic-companion-backup-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.json`;
}

export const serializeBackup = (backup: Backup): string => JSON.stringify(backup, null, 1);

export type ParseResult = { ok: true; backup: Backup } | { ok: false; error: string };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Reads a backup file's text. Anything that is not a version 1 IC Companion backup is rejected. */
export function parseBackup(text: string): ParseResult {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, error: 'This file is not a backup: it could not be read as JSON.' };
  }
  if (!isRecord(data) || data.app !== BACKUP_APP) {
    return { ok: false, error: 'This file is not an IC Companion backup.' };
  }
  if (data.version !== BACKUP_VERSION) {
    return {
      ok: false,
      error: `This backup is version ${String(data.version)}; this app reads version ${BACKUP_VERSION} only.`,
    };
  }
  if (typeof data.exportedAt !== 'string' || Number.isNaN(Date.parse(data.exportedAt))) {
    return { ok: false, error: 'This backup has no valid export date, so it may be damaged.' };
  }
  if (!Array.isArray(data.entries)) {
    return { ok: false, error: 'This backup has no saved data list, so it may be damaged.' };
  }
  const seen = new Set<string>();
  for (const entry of data.entries as unknown[]) {
    if (!Array.isArray(entry) || entry.length !== 2 || typeof entry[0] !== 'string' || entry[0] === '') {
      return { ok: false, error: 'This backup contains an entry that is not a key and a value, so it may be damaged.' };
    }
    if (seen.has(entry[0])) {
      return { ok: false, error: `This backup lists "${entry[0]}" twice, so it may be damaged.` };
    }
    seen.add(entry[0]);
  }
  return {
    ok: true,
    backup: {
      app: BACKUP_APP,
      version: BACKUP_VERSION,
      exportedAt: data.exportedAt,
      entries: data.entries as BackupEntry[],
    },
  };
}

export type BackupSummary = {
  exportedAt: string;
  /** Keys starting `progress.` (one per lesson with any progress). */
  lessonsWithProgress: number;
  /** Cards in `review.cards`. */
  reviewCards: number;
  /** All saved keys. */
  entryCount: number;
};

function sizeOf(value: unknown): number {
  if (Array.isArray(value)) return value.length;
  if (value instanceof Map || value instanceof Set) return value.size;
  if (isRecord(value)) return Object.keys(value).length;
  return 0;
}

export function summarizeBackup(backup: Backup): BackupSummary {
  const review = backup.entries.find(([key]) => key === REVIEW_KEY);
  return {
    exportedAt: backup.exportedAt,
    lessonsWithProgress: backup.entries.filter(([key]) => key.startsWith(PROGRESS_PREFIX)).length,
    reviewCards: review ? sizeOf(review[1]) : 0,
    entryCount: backup.entries.length,
  };
}

/**
 * The theme the restored data holds, for the localStorage copy that index.html
 * applies before first paint. No saved theme means "system".
 */
export function themeInBackup(entries: readonly BackupEntry[]): ThemeChoice {
  const saved = entries.find(([key]) => key === THEME_KEY)?.[1];
  return isThemeChoice(saved) ? saved : 'system';
}
