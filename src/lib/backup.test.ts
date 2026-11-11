import { describe, expect, it } from 'vitest';
import {
  backupFileName,
  makeBackup,
  parseBackup,
  serializeBackup,
  summarizeBackup,
  themeInBackup,
  type BackupEntry,
} from './backup.ts';

const entries: BackupEntry[] = [
  ['settings.theme', 'dark'],
  ['settings.app', { zhSize: 'large', showPinyin: false }],
  ['progress.2-L11', { steps: { overview: '2026-11-10T09:00:00.000Z' } }],
  ['progress.2-L12', { steps: {} }],
  ['review.cards', { '2/L11.v.1': { id: 'L11.v.1', lesson: '2/L11', box: 1, due: '2026-11-12', added: '2026-11-10' }, '2/L11.v.2': { id: 'L11.v.2', lesson: '2/L11', box: 2, due: '2026-11-12', added: '2026-11-10' }, '2/L11.v.3': { id: 'L11.v.3', lesson: '2/L11', box: 3, due: '2026-11-12', added: '2026-11-10' } }],
  ['activity.log', [{ day: '2026-11-10', min: 12 }]],
];

const now = new Date(2026, 10, 11, 9, 30); // 11 Nov 2026, local time

describe('backup file', () => {
  it('round-trips through JSON unchanged', () => {
    const backup = makeBackup(entries, now);
    expect(backup).toMatchObject({ app: 'ic-companion', version: 1, exportedAt: now.toISOString() });
    const parsed = parseBackup(serializeBackup(backup));
    expect(parsed).toEqual({ ok: true, backup });
  });

  it('names the file by the local date', () => {
    expect(backupFileName(now)).toBe('ic-companion-backup-2026-11-11.json');
    expect(backupFileName(new Date(2027, 0, 5, 23, 59))).toBe('ic-companion-backup-2027-01-05.json');
  });

  it('summarises lessons with progress and review cards', () => {
    expect(summarizeBackup(makeBackup(entries, now))).toEqual({
      exportedAt: now.toISOString(),
      lessonsWithProgress: 2,
      reviewCards: 3,
      entryCount: 6,
    });
    expect(summarizeBackup(makeBackup([], now))).toMatchObject({ lessonsWithProgress: 0, reviewCards: 0 });
  });

  it('finds the theme to restore, defaulting to system', () => {
    expect(themeInBackup(entries)).toBe('dark');
    expect(themeInBackup([])).toBe('system');
    expect(themeInBackup([['settings.theme', 'purple']])).toBe('system');
  });
});

describe('rejecting files that are not backups', () => {
  const valid = { app: 'ic-companion', version: 1, exportedAt: now.toISOString(), entries };
  const reject = (value: unknown) => {
    const result = parseBackup(typeof value === 'string' ? value : JSON.stringify(value));
    expect(result.ok).toBe(false);
    return result.ok ? '' : result.error;
  };

  it('rejects text that is not JSON', () => {
    expect(reject('not json {')).toMatch(/JSON/);
  });

  it('rejects another app or a non-object', () => {
    expect(reject({ ...valid, app: 'mandarin' })).toMatch(/not an IC Companion backup/);
    expect(reject([1, 2])).toMatch(/not an IC Companion backup/);
    expect(reject(null)).toMatch(/not an IC Companion backup/);
  });

  it('rejects another version', () => {
    expect(reject({ ...valid, version: 2 })).toMatch(/version 2/);
    expect(reject({ ...valid, version: '1' })).toMatch(/version/);
  });

  it('rejects a missing or bad export date', () => {
    expect(reject({ ...valid, exportedAt: undefined })).toMatch(/export date/);
    expect(reject({ ...valid, exportedAt: 'yesterday' })).toMatch(/export date/);
  });

  it('rejects entries that are not [key, value] pairs', () => {
    expect(reject({ ...valid, entries: {} })).toMatch(/saved data/);
    expect(reject({ ...valid, entries: [['a']] })).toMatch(/key and a value/);
    expect(reject({ ...valid, entries: [[1, 'x']] })).toMatch(/key and a value/);
    expect(reject({ ...valid, entries: [['', 'x']] })).toMatch(/key and a value/);
    expect(reject({ ...valid, entries: ['a', 'b'] })).toMatch(/key and a value/);
    expect(reject({ ...valid, entries: [['a', 1], ['a', 2]] })).toMatch(/twice/);
  });

  it('accepts an empty backup', () => {
    expect(parseBackup(JSON.stringify({ ...valid, entries: [] })).ok).toBe(true);
  });
});

describe('value checks on import', () => {
  const file = (entries: unknown[]) => JSON.stringify({ app: 'ic-companion', version: 1, exportedAt: '2026-11-11T10:00:00.000Z', entries });
  it('rejects damaged settings, cards and progress without changing anything', () => {
    expect(parseBackup(file([['settings.app', { studyDays: 'x' }]])).ok).toBe(false);
    expect(parseBackup(file([['review.cards', { a: { id: 'L11.v.1', box: 9 } }]])).ok).toBe(false);
    expect(parseBackup(file([['progress.2/L11', { grammarDone: 'yes' }]])).ok).toBe(false);
    expect(parseBackup(file([['activity.log', {}]])).ok).toBe(false);
  });
  it('accepts well-formed values', () => {
    const ok = parseBackup(
      file([
        ['settings.app', { studyDays: [1, 2, 3] }],
        ['review.cards', { '2/L11.v.1': { id: 'L11.v.1', lesson: '2/L11', box: 2, due: '2026-11-12', added: '2026-11-10' } }],
        ['progress.2/L11', { steps: { overview: '2026-11-10T09:00:00.000Z' }, exerciseSets: {} }],
        ['plan.book', { t: { at: '2026-11-10T09:00:00.000Z', minutes: 10 } }],
        ['activity.log', []],
      ]),
    );
    expect(ok.ok).toBe(true);
  });
});

