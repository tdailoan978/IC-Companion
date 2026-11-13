import { afterEach, describe, expect, it, vi } from 'vitest';
import { createDebouncer, isEmptyNote, listNotes, loadNote, newNote, noteKey, notePath, parseNoteKey, updateNote, type NoteRef } from './notes.ts';
import { compactStroke, emptyInk } from './ink.ts';

const ref: NoteRef = { level: 2, lessonId: 'L11', kind: 'book', ref: 'Part 1 text' };

describe('note keys', () => {
  it('round-trips every kind, including refs with spaces and dots', () => {
    for (const r of [ref, { ...ref, kind: 'grammar', ref: 'L11.g.3' }, { ...ref, kind: 'vocab', ref: 'L11.v.12' }] as NoteRef[]) {
      expect(parseNoteKey(noteKey(r))).toEqual(r);
    }
    expect(parseNoteKey('progress.2/L11')).toBeNull();
    expect(notePath(ref)).toBe('/note/2/L11/book/Part%201%20text');
  });
  it('treats a note with only erased ink or blank text as empty', () => {
    const n = newNote(ref);
    expect(isEmptyNote(n)).toBe(true);
    expect(isEmptyNote({ ...n, text: '  ' })).toBe(true);
    expect(isEmptyNote({ ...n, ink: { ...emptyInk(), strokes: [{ width: 18, erase: true, points: [{ x: 1, y: 1, p: 0.5, t: 0 }] }] } })).toBe(true);
    expect(isEmptyNote({ ...n, text: '比' })).toBe(false);
  });
});

describe('saving', () => {
  afterEach(() => vi.useRealTimers());
  it('debounces: many changes become one save 500 ms after the last, and flush saves at once', () => {
    vi.useFakeTimers();
    const save = vi.fn();
    const d = createDebouncer(save, 500);
    d.schedule();
    vi.advanceTimersByTime(300);
    d.schedule();
    vi.advanceTimersByTime(300);
    expect(save).not.toHaveBeenCalled();
    vi.advanceTimersByTime(200);
    expect(save).toHaveBeenCalledTimes(1);
    d.schedule();
    d.flush();
    expect(save).toHaveBeenCalledTimes(2);
    d.flush();
    expect(save).toHaveBeenCalledTimes(2);
  });
});

describe('ink storage', () => {
  it('rounds strokes and stores time from the stroke start', () => {
    const s = compactStroke({ width: 3, points: [{ x: 10.1234, y: 5.678, p: 0.4567, t: 1000.4 }, { x: 11, y: 6, p: 0.5, t: 1016.9 }] });
    expect(s.points).toEqual([{ x: 10.1, y: 5.7, p: 0.46, t: 0 }, { x: 11, y: 6, p: 0.5, t: 17 }]);
    expect(JSON.parse(JSON.stringify(s))).toEqual(s);
  });
});

describe('failed reads (no storage here, like a broken IndexedDB)', () => {
  it('marks the note failed, refuses every change, and never writes', async () => {
    await expect(loadNote(ref)).rejects.toBeTruthy();
    expect(updateNote(ref, (n) => ({ ...n, text: 'would overwrite the real note' }))).toBe(false);
  });
  it('makes the Notebook fail instead of showing an empty list', async () => {
    await expect(listNotes()).rejects.toBeTruthy();
  });
});

