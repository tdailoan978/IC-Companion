// Backup file for Export / Import in Settings (PLAN.md 5.4). Pure logic only:
// the Settings screen reads and writes storage and handles the file itself.

import { MYWORDS_KEY } from './mywords.ts';
import { NOTE_PREFIX, parseNoteKey } from './notes.ts';
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

const isDayString = (v: unknown) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
const isTime = (v: unknown) => typeof v === 'string' && !Number.isNaN(Date.parse(v));
const mapOf = (v: unknown, ok: (x: unknown) => boolean) => isRecord(v) && Object.values(v).every(ok);
const isNum = (v: unknown) => typeof v === 'number' && Number.isFinite(v);

/** Ink as vector strokes (ink.ts): { strokes: [{ points: [{ x, y, p, t }], width }], height }. */
const isPoint = (pt: unknown) => isRecord(pt) && isNum(pt.x) && isNum(pt.y) && isNum(pt.p) && isNum(pt.t);
const isStroke = (s: unknown) => isRecord(s) && Array.isArray(s.points) && s.points.every(isPoint) && isNum(s.width);
const isInk = (ink: unknown) =>
  isRecord(ink) && Array.isArray(ink.strokes) && ink.strokes.every(isStroke) && isNum(ink.height) && (!('width' in ink) || isNum(ink.width));

/** One of my words (mywords.ts), keyed by its "my." id. */
const isMyWord = (w: unknown) =>
  isRecord(w) &&
  typeof w.id === 'string' &&
  w.id.startsWith('my.') &&
  typeof w.zh === 'string' &&
  typeof w.pinyin === 'string' &&
  typeof w.en === 'string' &&
  isNum(w.level) &&
  typeof w.lessonId === 'string';

/** Checks the shape of the values the app reads, so a damaged file cannot break a screen after import. */
function valueProblem(key: string, value: unknown): string | null {
  if (key === 'settings.app') {
    if (!isRecord(value)) return 'settings are not a record';
    if ('studyDays' in value && !(Array.isArray(value.studyDays) && value.studyDays.every((d) => Number.isInteger(d) && d >= 0 && d <= 6)))
      return 'study days are not a list of weekdays';
    return null;
  }
  if (key === REVIEW_KEY) {
    const card = (c: unknown) =>
      isRecord(c) && typeof c.id === 'string' && typeof c.lesson === 'string' && [1, 2, 3, 4, 5].includes(c.box as number) && isDayString(c.due) && isDayString(c.added);
    return mapOf(value, card) ? null : 'review cards are not in the expected form';
  }
  if (key.startsWith(PROGRESS_PREFIX)) {
    if (!isRecord(value)) return `progress for ${key.slice(PROGRESS_PREFIX.length)} is not a record`;
    for (const field of ['steps', 'vocabParts', 'vocabGot', 'grammarDone', 'dialoguesDone']) {
      if (field in value && !mapOf(value[field], isTime)) return `progress for ${key.slice(PROGRESS_PREFIX.length)} has a damaged "${field}"`;
    }
    for (const field of ['exerciseItems', 'exerciseSets', 'manualOff']) {
      if (field in value && !isRecord(value[field])) return `progress for ${key.slice(PROGRESS_PREFIX.length)} has a damaged "${field}"`;
    }
    return null;
  }
  if (key === 'plan.book') {
    return mapOf(value, (t) => isRecord(t) && isTime(t.at) && typeof t.minutes === 'number') ? null : 'book-reading ticks are not in the expected form';
  }
  if (key === 'activity.log') return Array.isArray(value) ? null : 'activity log is not a list';
  if (key.startsWith(NOTE_PREFIX)) {
    if (!parseNoteKey(key)) return `note "${key}" has a damaged name`;
    if (!isRecord(value) || !isInk(value.ink) || typeof value.text !== 'string') return `note "${key}" is not in the expected form`;
    return null;
  }
  if (key === MYWORDS_KEY) {
    return isRecord(value) && Object.entries(value).every(([id, w]) => isMyWord(w) && (w as { id: string }).id === id)
      ? null
      : 'own words ("My words") are not in the expected form';
  }
  return null;
}

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
    const problem = valueProblem(entry[0], entry[1]);
    if (problem) return { ok: false, error: `This backup's ${problem}, so it may be damaged. Nothing was changed.` };
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
