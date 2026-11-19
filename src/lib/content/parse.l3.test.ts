// Level 3-4 format (docs/CONTENT_FORMAT_L3_L4_ADDENDUM.md): one vocabulary table and a
// "## Words & Phrases" section between Grammar and Dialogues.

import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { ContentError, parseLesson } from './parse.ts';
import { lessonKey } from './types.ts';

const dirOf = (level: number) => fileURLToPath(new URL(`../../../content/level-${level}/`, import.meta.url));
const filesOf = (level: number) =>
  readdirSync(dirOf(level))
    .filter((f) => /^L\d+\.md$/.test(f))
    .sort((a, b) => Number(a.slice(1, -3)) - Number(b.slice(1, -3)));
const read = (level: number, name: string) => readFileSync(dirOf(level) + name, 'utf8');
const L3_1 = read(3, 'L1.md');

function errorOf(text: string): ContentError {
  try {
    parseLesson(text, 'L1.md');
  } catch (e) {
    expect(e).toBeInstanceOf(ContentError);
    return e as ContentError;
  }
  throw new Error('expected parseLesson to throw a ContentError');
}

/** Replaces exactly one occurrence of `from` (guards against the file drifting under the test). */
function replaceOnce(text: string, from: string, to: string): string {
  const at = text.indexOf(from);
  expect(at, `"${from}" not found`).toBeGreaterThanOrEqual(0);
  expect(text.indexOf(from, at + 1), `"${from}" found twice`).toBe(-1);
  return text.slice(0, at) + to + text.slice(at + from.length);
}

/** The lines of the first Words & Phrases block (heading included), and where it starts. */
function firstWBlock(text: string) {
  const lines = text.split('\n');
  const start = lines.findIndex((l) => l.startsWith('### W1 · '));
  let end = start + 1;
  while (end < lines.length && !lines[end].startsWith('### ') && !lines[end].startsWith('## ')) end++;
  return { lines, start, end };
}

describe('all Level 3 and Level 4 lesson files', () => {
  for (const level of [3, 4]) {
    it(`finds ten Level ${level} lessons`, () => {
      expect(filesOf(level)).toEqual(Array.from({ length: 10 }, (_, i) => `L${i + 1}.md`));
    });

    describe.each(filesOf(level))(`level ${level} %s`, (name) => {
      const lesson = parseLesson(read(level, name), name);

      it('has one vocabulary list numbered from 1, all in part 1', () => {
        expect(lesson.level).toBe(level);
        expect(lesson.vocab.length).toBeGreaterThan(0);
        expect(lesson.vocab.every((v) => v.part === 1)).toBe(true);
        expect(lesson.vocab.map((v) => v.n)).toEqual(lesson.vocab.map((_, i) => i + 1));
      });

      it('has Words & Phrases entries W1, W2, … with 2-4 examples each', () => {
        expect(lesson.wordsPhrases.length).toBeGreaterThan(0);
        lesson.wordsPhrases.forEach((w, i) => {
          expect(w.id).toBe(`${lesson.id}.w.${i + 1}`);
          expect(w.word).not.toBe('');
          expect(w.gloss).not.toBe('');
          expect(w.explanationMd).not.toBe('');
          expect(w.examples.length).toBeGreaterThanOrEqual(2);
          expect(w.examples.length).toBeLessThanOrEqual(4);
        });
      });

      it('keeps the rest of the contract', () => {
        expect(lesson.grammar.length).toBeGreaterThan(0);
        expect(lesson.dialogues).toHaveLength(2);
        expect(lesson.exercises.map((e) => e.type)).toEqual(['choice', 'order', 'translate', 'match']);
        expect(lesson.speaking).toHaveLength(4);
      });
    });
  }

  it('keeps Level 3 and Level 4 lessons apart by level (ids repeat across levels)', () => {
    const l3 = parseLesson(read(3, 'L1.md'), 'L1.md');
    const l4 = parseLesson(read(4, 'L1.md'), 'L1.md');
    expect(l3.id).toBe(l4.id);
    expect(lessonKey(l3)).not.toBe(lessonKey(l4));
  });

  it('reads entry words that are pairs or patterns, with and without Watch out', () => {
    const all = [3, 4].flatMap((level) => filesOf(level).map((f) => parseLesson(read(level, f), f)));
    const entries = all.flatMap((l) => l.wordsPhrases);
    expect(entries.some((w) => w.word.includes('/'))).toBe(true);
    expect(entries.some((w) => w.word.includes('…'))).toBe(true);
    expect(entries.some((w) => w.watchOut)).toBe(true);
    expect(entries.some((w) => !w.watchOut)).toBe(true);
  });
});

describe('Level 3 Lesson 1 spot check', () => {
  const lesson = parseLesson(L3_1, 'L1.md');
  it('reads the first word and the first Words & Phrases entry', () => {
    expect(lesson.vocab[0]).toMatchObject({ id: 'L1.v.1', part: 1, n: 1 });
    expect(lesson.wordsPhrases[0]).toMatchObject({ id: 'L1.w.1', word: '觉得', gloss: 'to feel, to think' });
  });
});

describe('Level 3-4 contract breaks', () => {
  it('a "### Part 1" heading in the vocabulary', () => {
    const text = replaceOnce(L3_1, '## Vocabulary\n', '## Vocabulary\n### Part 1\n');
    expect(errorOf(text).message).toMatch(/Vocabulary \(one table at Levels 3-4, no "### Part" headings\): unexpected "###" heading/);
  });

  it('a missing "## Words & Phrases" section', () => {
    const { lines, start, end } = firstWBlock(L3_1);
    // Drop the section heading and all its blocks.
    const head = lines.findIndex((l) => l === '## Words & Phrases');
    let stop = end;
    while (stop < lines.length && !lines[stop].startsWith('## ')) stop++;
    expect(start).toBeGreaterThan(head);
    const text = [...lines.slice(0, head), ...lines.slice(stop)].join('\n');
    expect(errorOf(text).message).toMatch(/missing section "## Words & Phrases" \(expected before "## Dialogues"\).*Level 3-4 format/);
  });

  it('a Pattern line inside a Words & Phrases entry', () => {
    const { lines, start } = firstWBlock(L3_1);
    lines.splice(start + 1, 0, '**Pattern:** `觉得 + clause`');
    expect(errorOf(lines.join('\n')).message).toMatch(/W1: unexpected "Pattern:" line before the examples table/);
  });

  it('an entry with 1 example row', () => {
    const { lines, start, end } = firstWBlock(L3_1);
    const header = lines.findIndex((l, i) => i > start && l === '| Chinese | Pinyin | English |');
    let last = header + 2;
    while (last < end && lines[last].startsWith('|')) last++;
    lines.splice(header + 3, last - (header + 3)); // keep only the first data row
    expect(errorOf(lines.join('\n')).message).toMatch(/W1: the examples table has 1 rows, expected 2 to 4/);
  });

  it('an entry with 5 example rows', () => {
    const { lines, start } = firstWBlock(L3_1);
    const first = lines.findIndex((l, i) => i > start && l === '| Chinese | Pinyin | English |') + 2;
    let last = first;
    while (lines[last].startsWith('|')) last++;
    const rows = lines.slice(first, last);
    while (rows.length < 5) rows.push(rows[0]);
    lines.splice(first, last - first, ...rows);
    expect(errorOf(lines.join('\n')).message).toMatch(/W1: the examples table has 5 rows, expected 2 to 4/);
  });

  it('a heading without the gloss in parentheses', () => {
    const { lines, start } = firstWBlock(L3_1);
    lines[start] = '### W1 · 觉得';
    expect(errorOf(lines.join('\n')).message).toMatch(/expected the heading "### W1 · <word or phrase> \(<short English gloss>\)"/);
  });

  it('entries out of order', () => {
    const { lines, start } = firstWBlock(L3_1);
    lines[start] = lines[start].replace('### W1 · ', '### W2 · ');
    expect(errorOf(lines.join('\n')).message).toMatch(/expected W1, found W2/);
  });

  it('a Level 2 file is still checked against the Level 2 sections', () => {
    const text = replaceOnce(L3_1, 'level: 3', 'level: 2');
    expect(errorOf(text).message).toMatch(/Level 2 format/);
  });
});
