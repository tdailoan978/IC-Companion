// Notes (docs/NOTES_AND_DEEP_LINKS.md section 3): one note per item, each with
// Apple Pencil ink (vector strokes) and typed text. One IndexedDB key per note,
// so saving a note never rewrites the others. Saves are debounced (about 500 ms
// after typing stops, or at the end of a pen stroke via flushNote) and flushed
// when the app is hidden, so closing the app never loses a note.

import { useSyncExternalStore } from 'react';
import { emptyInk, hasInk, type Ink } from './ink.ts';
import { allKeys, readStrict, remove, setSaveFailed, write } from './storage.ts';

export type NoteKind = 'book' | 'grammar' | 'dialogue' | 'vocab' | 'exercise';

/** Which item a note belongs to. `ref`: book section name ("Part 1 text") or the item id (L11.g.3, L11.d1, L11.v.12, L11.e2). */
export type NoteRef = { level: number; lessonId: string; kind: NoteKind; ref: string };

export type Note = NoteRef & { ink: Ink; text: string; created: string; edited: string };

export const NOTE_PREFIX = 'note.';
export const noteKey = (r: NoteRef) => `${NOTE_PREFIX}${r.level}/${r.lessonId}|${r.kind}|${r.ref}`;

const KINDS: NoteKind[] = ['book', 'grammar', 'dialogue', 'vocab', 'exercise'];
export function parseNoteKey(key: string): NoteRef | null {
  const m = /^note\.(\d+)\/([^|]+)\|([a-z]+)\|(.+)$/.exec(key);
  if (!m || !KINDS.includes(m[3] as NoteKind)) return null;
  return { level: Number(m[1]), lessonId: m[2], kind: m[3] as NoteKind, ref: m[4] };
}

/** The note page for an item. */
export const notePath = (r: NoteRef) => `/note/${r.level}/${r.lessonId}/${r.kind}/${encodeURIComponent(r.ref)}`;

export const isEmptyNote = (n: Pick<Note, 'ink' | 'text'> | null | undefined) => !n || (!hasInk(n.ink) && n.text.trim() === '');

export const newNote = (r: NoteRef, now = new Date().toISOString()): Note => ({ ...r, ink: emptyInk(), text: '', created: now, edited: now });

/** Calls `fn` once, `ms` after the last `schedule()`; `flush()` runs it now if one is pending. */
export function createDebouncer(fn: () => void, ms: number) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return {
    schedule() {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        fn();
      }, ms);
    },
    flush() {
      if (!timer) return;
      clearTimeout(timer);
      timer = null;
      fn();
    },
    get pending() {
      return timer !== null;
    },
  };
}

// ---- store ----

type Entry = { note: Note | null; loaded: boolean; failed: boolean };
const entries = new Map<string, Entry>();
const loading = new Map<string, Promise<void>>();
const savers = new Map<string, ReturnType<typeof createDebouncer>>();
const listeners = new Set<() => void>();
const NOT_LOADED: Entry = { note: null, loaded: false, failed: false };
const notify = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

/** Known note keys (cheap index for "has a note" marks and the Notebook). */
let keyIndex: Set<string> | null = null;
let keyIndexLoading: Promise<void> | null = null;

export function loadNoteKeys(): Promise<void> {
  if (keyIndex) return Promise.resolve();
  keyIndexLoading ??= allKeys().then(
    (ks) => {
      keyIndex = new Set(ks.filter((k) => k.startsWith(NOTE_PREFIX)));
      notify();
    },
    (err) => {
      keyIndexLoading = null;
      console.warn('Could not list notes', err);
    },
  );
  return keyIndexLoading;
}

/** Loads one note. On a failed read it is marked failed and never written (so nothing is saved over it). */
export function loadNote(r: NoteRef): Promise<void> {
  const key = noteKey(r);
  const have = entries.get(key);
  if (have?.loaded) return Promise.resolve();
  let p = loading.get(key);
  if (!p) {
    p = readStrict<Note | null>(key, null).then(
      (saved) => {
        entries.set(key, { note: saved ? { ...newNote(r, saved.created), ...saved } : null, loaded: true, failed: false });
        notify();
      },
      (err) => {
        console.warn('Could not load note', err);
        entries.set(key, { note: null, loaded: false, failed: true });
        loading.delete(key);
        setSaveFailed(true);
        notify();
      },
    );
    loading.set(key, p);
  }
  return p;
}

async function persist(key: string): Promise<void> {
  const e = entries.get(key);
  if (!e?.loaded) return;
  if (!e.note || isEmptyNote(e.note)) {
    // An emptied note is removed rather than kept as an empty record.
    if (keyIndex?.has(key)) {
      await remove(key);
      keyIndex.delete(key);
      notify();
    }
    return;
  }
  if (await write(key, e.note)) {
    if (keyIndex && !keyIndex.has(key)) {
      keyIndex.add(key);
      notify();
    }
  }
}

function saverFor(key: string) {
  let s = savers.get(key);
  if (!s) {
    s = createDebouncer(() => void persist(key), 500);
    savers.set(key, s);
  }
  return s;
}

/**
 * Changes a note (creating it if needed) and schedules a save. Refuses (returns false)
 * if the saved note could not be read, so a failed read never turns into an overwrite.
 */
export function updateNote(r: NoteRef, change: (n: Note) => Note): boolean {
  const key = noteKey(r);
  const e = entries.get(key);
  if (!e?.loaded) {
    setSaveFailed(true);
    return false;
  }
  const now = new Date().toISOString();
  entries.set(key, { ...e, note: { ...change(e.note ?? newNote(r, now)), edited: now } });
  notify();
  saverFor(key).schedule();
  return true;
}

/** Saves a note now (call at the end of each pen stroke and when leaving the note). */
export function flushNote(r: NoteRef): void {
  savers.get(noteKey(r))?.flush();
}

export function flushAllNotes(): void {
  savers.forEach((s) => s.flush());
}

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushAllNotes();
  });
  window.addEventListener('pagehide', flushAllNotes);
}

export function useNote(r: NoteRef): Entry {
  const key = noteKey(r);
  const entry = useSyncExternalStore(subscribe, () => entries.get(key) ?? NOT_LOADED);
  if (!entry.loaded && !entry.failed) void loadNote(r);
  return entry;
}

/** Whether an item has a saved note (for the note buttons' "has a note" mark). */
export function useHasNote(r: NoteRef): boolean {
  const key = noteKey(r);
  const has = useSyncExternalStore(subscribe, () => keyIndex?.has(key) ?? false);
  if (!keyIndex) void loadNoteKeys();
  return has;
}

/** Every saved note (the Notebook). Throws if storage cannot be read. */
export async function listNotes(): Promise<Note[]> {
  await loadNoteKeys();
  const keys = [...(keyIndex ?? [])];
  const out: Note[] = [];
  for (const key of keys) {
    const r = parseNoteKey(key);
    if (!r) continue;
    await loadNote(r);
    const n = entries.get(key)?.note;
    if (n && !isEmptyNote(n)) out.push(n);
  }
  return out;
}

/** Re-renders when any note or the key index changes (the Notebook listens to this). */
export const subscribeNotes = subscribe;
