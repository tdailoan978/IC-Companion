import { describe, expect, it } from 'vitest';
import { findLesson } from '../../lib/content/lessons.ts';
import { emptyInk } from '../../lib/ink.ts';
import type { Note, NoteKind } from '../../lib/notes.ts';
import { groupNotes, itemLabel, itemPath, labelText, matchesSearch, snippet } from './noteItems.ts';

const L11 = findLesson(2, 'L11')!;
const L12 = findLesson(2, 'L12')!;

const note = (lessonId: string, kind: NoteKind, ref: string, text = 'x', created = '2026-11-13T09:00:00.000Z'): Note => ({
  level: 2,
  lessonId,
  kind,
  ref,
  ink: emptyInk(),
  text,
  created,
  edited: created,
});

describe('note item labels', () => {
  it('labels each kind of item from the lesson content', () => {
    expect(labelText(itemLabel(note('L11', 'book', 'Part 1 text'), L11))).toBe('Part 1 text · p. 2–3');
    expect(itemLabel(note('L11', 'grammar', 'L11.g.3'), L11).text).toBe(`G3 · ${L11.grammar[2].title}`);
    expect(itemLabel(note('L11', 'dialogue', 'L11.d2'), L11).text).toBe(`Dialogue 2 · ${L11.dialogues[1].title}`);
    expect(itemLabel(note('L11', 'exercise', 'L11.e2'), L11).text).toBe(`E2 · ${L11.exercises[1].title}`);
    expect(itemLabel(note('L11', 'vocab', 'L11.v.1'), L11)).toMatchObject({ zh: '天气', pinyin: 'tiānqì' });
    // Content that no longer has the item: the raw id, never a crash.
    expect(itemLabel(note('L11', 'grammar', 'L11.g.99'), L11).text).toBe('L11.g.99');
    expect(itemLabel(note('L99', 'grammar', 'L99.g.1'), undefined).text).toBe('L99.g.1');
  });

  it('links each note to its item', () => {
    expect(itemPath(note('L11', 'grammar', 'L11.g.3'))).toBe('/lesson/2/L11/grammar?item=L11.g.3');
    expect(itemPath(note('L11', 'dialogue', 'L11.d1'))).toBe('/lesson/2/L11/dialogues?item=L11.d1');
    expect(itemPath(note('L11', 'exercise', 'L11.e2'))).toBe('/lesson/2/L11/exercises?item=L11.e2');
    expect(itemPath(note('L11', 'book', 'Part 1 text'))).toBe('/lesson/2/L11/overview');
    expect(itemPath(note('L11', 'vocab', 'L11.v.1'))).toBe('/lesson/2/L11/vocab?item=L11.v.1');
  });
});

describe('notebook grouping', () => {
  it('groups by lesson in lesson order, then plan order inside the lesson', () => {
    const notes = [
      note('L12', 'grammar', 'L12.g.1'),
      note('L11', 'exercise', 'L11.e1'),
      note('L11', 'vocab', 'L11.v.3'),
      note('L11', 'grammar', 'L11.g.1'),
      note('L11', 'book', 'Part 1 text'),
      note('L11', 'vocab', 'L11.v.1'),
      note('L11', 'book', 'Part 1 vocabulary'),
    ];
    const groups = groupNotes(notes);
    expect(groups.map((g) => g.key)).toEqual(['2/L11', '2/L12']);
    expect(groups[0].lesson).toBe(L11);
    expect(groups[1].lesson).toBe(L12);
    expect(groups[0].notes.map((n) => n.ref)).toEqual(['Part 1 text', 'Part 1 vocabulary', 'L11.v.1', 'L11.v.3', 'L11.g.1', 'L11.e1']);
  });
});

describe('snippets and search', () => {
  it('cuts the typed text to its first characters on one line', () => {
    expect(snippet('a\n\n b')).toBe('a b');
    expect(snippet('天'.repeat(130))).toBe(`${'天'.repeat(120)}…`);
  });

  it('searches typed text, ignoring case, in English and Chinese', () => {
    expect(matchesSearch({ text: 'The 比 pattern' }, 'the')).toBe(true);
    expect(matchesSearch({ text: 'The 比 pattern' }, ' 比 ')).toBe(true);
    expect(matchesSearch({ text: '今天比昨天冷' }, '昨天')).toBe(true);
    expect(matchesSearch({ text: 'weather' }, '天气')).toBe(false);
    expect(matchesSearch({ text: '' }, '')).toBe(true);
  });
});
