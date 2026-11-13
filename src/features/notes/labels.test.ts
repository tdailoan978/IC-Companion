import { describe, expect, it } from 'vitest';
import { findLesson } from '../../lib/content/lessons.ts';
import { lessonTasks } from '../../lib/plan/tasks.ts';
import { bookTaskId, decodeRef, isNoteKind, mmss, noteItemLabel, noteItemLink, roundMinutes } from './labels.ts';

const lesson = findLesson(2, 'L11')!;

describe('noteItemLabel', () => {
  it('labels a book section with its pages', () => {
    expect(noteItemLabel(lesson, 'book', 'Part 1 text')).toEqual({ text: 'Part 1 text · p. 2–3', found: true });
  });

  it('numbers grammar points and exercise sets', () => {
    const g = lesson.grammar[2];
    expect(noteItemLabel(lesson, 'grammar', g.id).text).toBe(`G3 · ${g.title}`);
    const e = lesson.exercises[1];
    expect(noteItemLabel(lesson, 'exercise', e.id).text).toBe(`E2 · ${e.title}`);
  });

  it('uses the dialogue title and the word with its pinyin', () => {
    expect(noteItemLabel(lesson, 'dialogue', lesson.dialogues[0].id).text).toBe(lesson.dialogues[0].title);
    const v = lesson.vocab[0];
    expect(noteItemLabel(lesson, 'vocab', v.id)).toEqual({ text: v.zh, pinyin: v.pinyin, zh: true, found: true });
  });

  it('falls back to the raw ref for an item that is not in the lesson', () => {
    expect(noteItemLabel(lesson, 'grammar', 'L11.g.99')).toEqual({ text: 'L11.g.99', found: false });
    expect(noteItemLabel(lesson, 'book', 'Part 9 text').found).toBe(false);
  });
});

describe('links and ids', () => {
  it('links non-book notes to their item', () => {
    expect(noteItemLink({ level: 2, lessonId: 'L11', kind: 'grammar', ref: 'L11.g.3' })?.to).toBe('/lesson/2/L11/grammar?item=L11.g.3');
    expect(noteItemLink({ level: 2, lessonId: 'L11', kind: 'dialogue', ref: 'L11.d1' })?.to).toBe('/lesson/2/L11/dialogues?item=L11.d1');
    expect(noteItemLink({ level: 2, lessonId: 'L11', kind: 'exercise', ref: 'L11.e2' })?.to).toBe('/lesson/2/L11/exercises?item=L11.e2');
    expect(noteItemLink({ level: 2, lessonId: 'L11', kind: 'book', ref: 'Part 1 text' })).toBeNull();
  });

  it('finds the plan task of a book note', () => {
    const id = bookTaskId({ level: 2, lessonId: 'L11', ref: 'Part 1 text' });
    const task = lessonTasks(lesson).find((t) => t.id === id);
    expect(task?.pages).toEqual({ from: 2, to: 3 });
  });

  it('decodes route refs safely', () => {
    expect(decodeRef('Part%201%20text')).toBe('Part 1 text');
    expect(decodeRef('Part 1 text')).toBe('Part 1 text');
    expect(decodeRef('100%')).toBe('100%');
    expect(decodeRef(undefined)).toBe('');
  });

  it('knows the note kinds', () => {
    expect(isNoteKind('book')).toBe(true);
    expect(isNoteKind('photo')).toBe(false);
  });
});

describe('reading time', () => {
  it('formats mm:ss and rounds to whole minutes, at least 1', () => {
    expect(mmss(0)).toBe('00:00');
    expect(mmss(75_400)).toBe('01:15');
    expect(mmss(75 * 60_000)).toBe('75:00');
    expect(roundMinutes(10_000)).toBe(1);
    expect(roundMinutes(12.4 * 60_000)).toBe(12);
    expect(roundMinutes(12.6 * 60_000)).toBe(13);
  });
});
