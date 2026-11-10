import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { ContentError, extractPattern, extractPatternNote, normalizeForCompare, parseLesson } from './parse.ts';
import type { Lesson } from './types.ts';

const levelDir = fileURLToPath(new URL('../../../content/level-2/', import.meta.url));
const files = readdirSync(levelDir)
  .filter((f) => /^L\d+\.md$/.test(f))
  .sort((a, b) => Number(a.slice(1, -3)) - Number(b.slice(1, -3)));
const read = (name: string) => readFileSync(levelDir + name, 'utf8');
const L11 = read('L11.md');

/** Replaces 1-based line `n` of `text` (the line must currently equal `from`, to guard against drift). */
function setLine(text: string, n: number, from: string, to: string | null): string {
  const lines = text.split('\n');
  expect(lines[n - 1]).toBe(from);
  if (to === null) lines.splice(n - 1, 1);
  else lines[n - 1] = to;
  return lines.join('\n');
}
function removeLines(text: string, first: number, last: number): string {
  const lines = text.split('\n');
  lines.splice(first - 1, last - first + 1);
  return lines.join('\n');
}
function errorOf(text: string, file = 'L11.md'): ContentError {
  try {
    parseLesson(text, file);
  } catch (e) {
    expect(e).toBeInstanceOf(ContentError);
    return e as ContentError;
  }
  throw new Error('expected parseLesson to throw a ContentError');
}
/** Asserts the parse fails with an error at `line` whose message matches `pattern`. */
function expectError(text: string, line: number, pattern: RegExp) {
  const err = errorOf(text);
  expect(err.message).toMatch(/^L11\.md:\d+: /);
  const hit = err.issues.find((i) => i.line === line);
  expect(hit, `no issue at line ${line}; got:\n${err.message}`).toBeDefined();
  expect(hit!.message).toMatch(pattern);
  expect(err.message).toContain(`L11.md:${line}: `);
}

describe('all real lesson files', () => {
  it('finds the ten Level 2 lessons', () => {
    expect(files).toEqual(['L11.md', 'L12.md', 'L13.md', 'L14.md', 'L15.md', 'L16.md', 'L17.md', 'L18.md', 'L19.md', 'L20.md']);
  });

  describe.each(files)('%s', (name) => {
    const lesson: Lesson = parseLesson(read(name), name);
    const id = name.slice(0, -3);

    it('has the front matter values', () => {
      expect(lesson.id).toBe(id);
      expect(lesson.level).toBe(2);
      expect(lesson.lesson).toBe(Number(id.slice(1)));
      expect(lesson.titleEn).not.toBe('');
      expect(lesson.titleZh).not.toBe('');
      expect(lesson.bookPages).toMatch(/^\d+-\d+$/);
      expect(lesson.objectives.length).toBeGreaterThanOrEqual(3);
      expect(lesson.bookRefs.length).toBeGreaterThan(0);
      for (const r of lesson.bookRefs) expect(Number.isInteger(r.page)).toBe(true);
    });

    it('has continuous vocabulary numbering across both parts', () => {
      expect(lesson.vocab.map((v) => v.n)).toEqual(lesson.vocab.map((_, i) => i + 1));
      const parts = lesson.vocab.map((v) => v.part);
      expect(parts[0]).toBe(1);
      expect(parts.at(-1)).toBe(2);
      expect([...parts].sort()).toEqual(parts); // all of Part 1 before Part 2
      for (const v of lesson.vocab) expect(v.id).toBe(`${id}.v.${v.n}`);
    });

    it('has grammar points with 3-4 examples', () => {
      expect(lesson.grammar.length).toBeGreaterThanOrEqual(1);
      lesson.grammar.forEach((g, k) => {
        expect(g.id).toBe(`${id}.g.${k + 1}`);
        expect(g.examples.length).toBeGreaterThanOrEqual(3);
        expect(g.examples.length).toBeLessThanOrEqual(4);
        expect(g.pattern).not.toBe('');
        expect(g.pattern).not.toContain('`');
        expect(g.explanationMd).not.toBe('');
        expect(g.explanationMd).not.toMatch(/^\s|\s$|\*\*Pattern/);
      });
    });

    it('has 2 dialogues with 8-12 turns', () => {
      expect(lesson.dialogues).toHaveLength(2);
      lesson.dialogues.forEach((d, k) => {
        expect(d.id).toBe(`${id}.d${k + 1}`);
        expect(d.setting).not.toMatch(/^\*|Setting:|\*$/);
        expect(d.turns.length).toBeGreaterThanOrEqual(8);
        expect(d.turns.length).toBeLessThanOrEqual(12);
        d.turns.forEach((t, j) => expect(t.id).toBe(`${d.id}.${j + 1}`));
      });
    });

    it('has 4 exercise sets: choice, order, translate, match', () => {
      expect(lesson.exercises.map((e) => e.type)).toEqual(['choice', 'order', 'translate', 'match']);
      lesson.exercises.forEach((e, k) => {
        expect(e.id).toBe(`${id}.e${k + 1}`);
        expect(e.title).not.toMatch(/^E\d|\{type=/);
        expect(e.items.length).toBeGreaterThan(0);
        e.items.forEach((item, j) => expect(item.id).toBe(`${e.id}.${j + 1}`));
      });
      const choice = lesson.exercises[0];
      if (choice.type !== 'choice') throw new Error('unreachable');
      for (const item of choice.items) {
        expect(item.options).toContain(item.answer);
        expect(item.prompt).not.toMatch(/[[\]|]/);
        expect(item.prompt.split('___')).toHaveLength(2);
      }
    });

    it('has 4 speaking prompts', () => {
      expect(lesson.speaking).toHaveLength(4);
    });

    it('has unique, well-formed ids', () => {
      const ids = [
        ...lesson.vocab.map((v) => v.id),
        ...lesson.grammar.map((g) => g.id),
        ...lesson.dialogues.flatMap((d) => [d.id, ...d.turns.map((t) => t.id)]),
        ...lesson.exercises.flatMap((e) => [e.id, ...e.items.map((i) => i.id)]),
      ];
      expect(new Set(ids).size).toBe(ids.length);
      const shape = new RegExp(`^${id}\\.(v\\.\\d+|g\\.\\d+|d[12](\\.\\d+)?|e[1-4](\\.\\d+)?)$`);
      for (const x of ids) expect(x).toMatch(shape);
    });
  });
});

describe('L11 spot check', () => {
  const l = parseLesson(L11, 'L11.md');

  it('reads the front matter and book references', () => {
    expect(l).toMatchObject({
      id: 'L11',
      level: 2,
      lesson: 11,
      titleEn: 'Weather',
      titleZh: '天气',
      book: 'Integrated Chinese 4th ed., Volume 2',
      bookPages: '1-32',
    });
    expect(l.objectives).toHaveLength(5);
    expect(l.objectives[0]).toBe('After this lesson you can say what the weather is like and name the four seasons.');
    expect(l.bookRefs[0]).toEqual({ section: 'Part 1 text', page: 2 });
    expect(l.bookRefs.at(-1)).toEqual({ section: 'Lesson Wrap-Up', page: 31 });
  });

  it('reads vocabulary', () => {
    expect(l.vocab).toHaveLength(29);
    expect(l.vocab[0]).toEqual({ id: 'L11.v.1', part: 1, n: 1, zh: '天气', pinyin: 'tiānqì', pos: 'n', en: 'weather' });
    expect(l.vocab[11]).toMatchObject({ zh: '不但…而且…', pos: 'conj', en: 'not only... but also...' });
    expect(l.vocab[14]).toMatchObject({ id: 'L11.v.15', part: 2, zh: '那么' });
    expect(l.vocab.filter((v) => v.part === 1)).toHaveLength(14);
  });

  it('reads grammar', () => {
    expect(l.grammar).toHaveLength(6);
    const g1 = l.grammar[0];
    expect(g1.title).toBe('Comparative sentences with 比 (I)');
    expect(g1.pattern).toBe('A + 比 + B + Adj (+ 一点儿 / 得多 / 多了)');
    expect(g1.explanationMd.startsWith('比 sets one thing against another')).toBe(true);
    expect(g1.explanationMd.endsWith('as if translating "very".')).toBe(true);
    expect(g1.examples[0]).toEqual({
      zh: '这个公园比那个公园大。',
      pinyin: 'Zhège gōngyuán bǐ nàge gōngyuán dà.',
      en: 'This park is bigger than that park.',
    });
    expect(g1.watchOut).toBe('never put 很 inside a 比 sentence: ✗ 今天比昨天很冷 should be 今天比昨天冷得多.');
    // A note after the backticks is not part of the pattern.
    expect(l.grammar[1].pattern).toBe('Sentence + 了');
  });

  it('reads dialogues', () => {
    const [d1, d2] = l.dialogues;
    expect(d1.title).toBe('Too warm to skate');
    expect(d1.setting).toBe('At the end of winter, 马克 catches 林月 after class with a plan for the weekend.');
    expect(d1.turns).toHaveLength(12);
    expect(d1.turns[0]).toEqual({
      id: 'L11.d1.1',
      speaker: '马克',
      zh: '林月，这个周末我们去公园滑冰，好吗？',
      pinyin: 'Lín Yuè, zhège zhōumò wǒmen qù gōngyuán huábīng, hǎo ma?',
      en: 'Lin Yue, shall we go skating in the park this weekend?',
    });
    expect(d2.title).toBe('Rain again');
    expect(d2.turns.at(-1)?.id).toBe('L11.d2.12');
  });

  it('reads exercises', () => {
    const [e1, e2, e3, e4] = l.exercises;
    expect(e1).toMatchObject({ id: 'L11.e1', type: 'choice', title: 'Choose the right word' });
    expect(e1.items[0]).toEqual({ id: 'L11.e1.1', prompt: '昨天很冷，今天比昨天___冷。', options: ['更', '很', '非常'], answer: '更' });
    expect(e1.items[4]).toMatchObject({ options: ['一点儿', '有一点儿', '非常'], answer: '一点儿' });
    expect(e2).toMatchObject({ type: 'order', title: 'Put the words in order' });
    expect(e2.items[0]).toEqual({ id: 'L11.e2.1', chunks: ['暖和', '比', '加州的冬天', '得多', '纽约'], answer: '加州的冬天比纽约暖和得多。' });
    expect(e3).toMatchObject({ type: 'translate', title: 'Translate into Chinese' });
    expect(e3.items[0]).toEqual({ id: 'L11.e3.1', en: "Look, it's snowing!", answer: '你看，下雪了！' });
    expect(e4).toMatchObject({ type: 'match', title: 'Match the word' });
    expect(e4.items).toHaveLength(8);
    expect(e4.items[7]).toEqual({ id: 'L11.e4.8', zh: '刚才', en: 'just now' });
  });

  it('reads speaking prompts', () => {
    expect(l.speaking[3]).toEqual({ zh: '下雨的时候，你喜欢做什么？', pinyin: 'Xiàyǔ de shíhou, nǐ xǐhuan zuò shénme?', en: 'What do you like to do when it rains?' });
  });

  it('gives the same result for CRLF line endings and a BOM', () => {
    expect(parseLesson('﻿' + L11.replace(/\n/g, '\r\n'), 'L11.md')).toEqual(l);
  });

  it('ignores extra blank lines between blocks', () => {
    const spaced = L11.replace(/\n\n/g, '\n\n\n');
    expect(parseLesson(spaced, 'L11.md')).toEqual(l);
  });
});

describe('contract breaks', () => {
  it('missing H2 section', () => {
    // Drop "## Book reference" and its table (lines 20-33): "## Vocabulary" moves up to line 20.
    expectError(removeLines(L11, 20, 33), 20, /missing section "## Book reference"/);
  });

  it('missing last section', () => {
    const lines = L11.split('\n');
    const text = lines.slice(0, 229).join('\n'); // ends on the last match item, line 228 + blank
    expectError(text, 229, /missing section "## Speaking prompts"/);
  });

  it('sections out of order', () => {
    let text = setLine(L11, 73, '## Grammar', '## Dialogues');
    text = setLine(text, 159, '## Dialogues', '## Grammar');
    expectError(text, 73, /out of order.*"## Dialogues".*"## Grammar"/);
  });

  it('unknown section name', () => {
    expectError(setLine(L11, 230, '## Speaking prompts', '## Speaking'), 230, /found "## Speaking" where "## Speaking prompts" was expected/);
  });

  it('missing front matter key', () => {
    expectError(setLine(L11, 6, 'title_zh: 天气', null), 8, /missing required key "title_zh"/);
  });

  it('non-numeric level', () => {
    expectError(setLine(L11, 3, 'level: 2', 'level: two'), 3, /"level" must be a whole number/);
  });

  it('missing H1', () => {
    expectError(setLine(L11, 11, '# Lesson 11 · 天气 · Weather', ''), 13, /missing the "# Lesson …" title/);
  });

  it('wrong column count in a vocabulary row', () => {
    expectError(setLine(L11, 45, '| 7 | 冷 | lěng | adj | cold |', '| 7 | 冷 | lěng | cold |'), 45, /4 columns, expected 5/);
  });

  it('gap in vocabulary numbering', () => {
    expectError(setLine(L11, 57, '| 15 | 那么 | nàme | adv | so, such |', '| 16 | 那么 | nàme | adv | so, such |'), 57, /expected 15, found 16/);
  });

  it('unknown POS tag', () => {
    expectError(setLine(L11, 39, '| 1 | 天气 | tiānqì | n | weather |', '| 1 | 天气 | tiānqì | noun | weather |'), 39, /unknown POS tag "noun"/);
  });

  it('wrong table header', () => {
    expectError(setLine(L11, 55, '| # | Chinese | Pinyin | POS | English |', '| # | Hanzi | Pinyin | POS | English |'), 55, /expected the table header/);
  });

  it('grammar pattern without backticks', () => {
    expectError(setLine(L11, 104, '**Pattern:** `Subject + (不) 会 + Verb / Adj (+ 的)`', '**Pattern:** Subject + 会 + Verb'), 104, /pattern in backticks/);
  });

  it('grammar with only 2 examples', () => {
    expectError(removeLines(L11, 84, 85), 80, /G1: the examples table has 2 rows, expected 3 to 4/);
  });

  it('text after the grammar Watch out line', () => {
    expectError(setLine(L11, 88, '', 'Another remark.'), 88, /only one optional "\*\*Watch out:\*\* …" line/);
  });

  it('dialogue with 7 turns', () => {
    // Remove five of Dialogue 2's twelve turns (lines 184-188); its table header stays at line 182.
    expectError(removeLines(L11, 184, 188), 182, /Dialogue 2: has 7 turns, expected 8 to 12/);
  });

  it('dialogue without a Setting line', () => {
    expectError(setLine(L11, 162, '*Setting: At the end of winter, 马克 catches 林月 after class with a plan for the weekend.*', 'At the end of winter.'), 162, /expected "\*Setting: …\*"/);
  });

  it('exercise sets in the wrong type order', () => {
    expectError(setLine(L11, 206, '### E2 · Put the words in order {type=order}', '### E2 · Put the words in order {type=translate}'), 206, /E2: expected \{type=order\}/);
  });

  it('id that does not match the lesson number', () => {
    expectError(setLine(L11, 4, 'lesson: 11', 'lesson: 14'), 2, /expected "L14"/);
  });

  it('title line that does not match the front matter', () => {
    expectError(setLine(L11, 11, '# Lesson 11 · 天气 · Weather', '# Lesson 11 · 天气 · Weather today'), 11, /title line does not match/);
  });

  it('exercise line without →', () => {
    expectError(setLine(L11, 214, '1. Look, it\'s snowing! → 你看，下雪了！', '1. Look, it\'s snowing! 你看，下雪了！'), 214, /exactly one "→".*found 0/);
  });

  it('exercise line with two →', () => {
    expectError(setLine(L11, 221, '1. 暖和 → warm', '1. 暖和 → warm → hot'), 221, /exactly one "→".*found 2/);
  });

  it('exercise items out of sequence', () => {
    expectError(setLine(L11, 222, '2. 预报 → forecast', '3. 预报 → forecast'), 222, /expected 2\., found 3\./);
  });

  it('choice item without a blank', () => {
    expectError(setLine(L11, 200, '1. 昨天很冷，今天比昨天___冷。 [更 | 很 | 非常] → 更', '1. 昨天很冷，今天比昨天冷。 [更 | 很 | 非常] → 更'), 200, /exactly one "___" blank/);
  });

  it('choice item without options', () => {
    expectError(setLine(L11, 201, '2. 昨天下雨，今天___下雨了。 [又 | 再 | 更] → 又', '2. 昨天下雨，今天___下雨了。 → 又'), 201, /exactly one option group/);
  });

  it('choice answer not among the options', () => {
    expectError(setLine(L11, 202, '3. 天气预报说明天___下雪。 [会 | 了 | 比] → 会', '3. 天气预报说明天___下雪。 [会 | 了 | 比] → 要'), 202, /answer "要" is not one of the options/);
  });

  it('order chunks that do not rebuild the answer', () => {
    expectError(setLine(L11, 208, '2. 了 / 又 / 下雨 / 今天 → 今天又下雨了。', '2. 了 / 又 / 下雨 / 今天 → 今天又下雪了。'), 208, /do not use the same characters as the answer/);
  });

  it('unknown exercise type', () => {
    expectError(setLine(L11, 220, '### E4 · Match the word {type=match}', '### E4 · Match the word {type=pairs}'), 220, /unknown type "pairs"/);
  });

  it('speaking prompts with 3 rows', () => {
    expectError(removeLines(L11, 236, 236), 231, /3 rows, expected exactly 4/);
  });

  it('reports several problems from one file at once', () => {
    let text = setLine(L11, 45, '| 7 | 冷 | lěng | adj | cold |', '| 7 | 冷 | lěng | cold |');
    text = setLine(text, 221, '1. 暖和 → warm', '1. 暖和 warm');
    const err = errorOf(text);
    expect(err.issues.map((i) => i.line)).toEqual([45, 221]);
    expect(err.message.split('\n')).toHaveLength(2);
  });

  it('works on a tiny inline file too', () => {
    const err = errorOf('---\nid: L1\n---\n# Lesson 1\n## Objectives\n- one\n', 'tiny.md');
    expect(err.message).toMatch(/^tiny\.md:3: front matter: missing required key "level"/);
  });

  it('rejects a file without front matter', () => {
    expect(errorOf('# Lesson 1\n', 'x.md').message).toMatch(/^x\.md:1: /);
  });
});

describe('normalizeForCompare', () => {
  it('strips Chinese and ASCII punctuation and whitespace', () => {
    expect(normalizeForCompare('你看，下雪了！')).toBe('你看下雪了');
    expect(normalizeForCompare(' 今天 比 昨天 冷。 ')).toBe('今天比昨天冷');
    expect(normalizeForCompare('“千”、《书》？：；（好）…—')).toBe('千书好');
    expect(normalizeForCompare('Hello, world! (ok?)')).toBe('Helloworldok');
    expect(normalizeForCompare('a\tb　c\nd')).toBe('abcd');
  });

  it('keeps characters, letters and digits', () => {
    expect(normalizeForCompare('一点儿 abc 123')).toBe('一点儿abc123');
  });
});

describe('extractPattern', () => {
  it('takes the text inside a single backtick group and drops a trailing note', () => {
    expect(extractPattern('`Sentence + 了` (the situation is new)')).toBe('Sentence + 了');
  });
  it('keeps the joining words between several groups', () => {
    expect(extractPattern('`A + 刚 + V` compared with `刚才 + V`')).toBe('A + 刚 + V compared with 刚才 + V');
  });
  it('returns undefined without a complete backtick pair', () => {
    expect(extractPattern('A + B')).toBeUndefined();
    expect(extractPattern('`A + B')).toBeUndefined();
    expect(extractPattern('``')).toBeUndefined();
  });
});

describe('extractPatternNote', () => {
  it('keeps the note after the last backtick', () => {
    expect(extractPatternNote('`Sentence + 了` (the situation is new)')).toBe('(the situation is new)');
  });
  it('returns undefined when nothing follows the pattern', () => {
    expect(extractPatternNote('`A + 比 + B + Adj`')).toBeUndefined();
  });
  it('is kept on the parsed L11 grammar point', () => {
    const l11 = parseLesson(readFileSync(new URL('../../../content/level-2/L11.md', import.meta.url), 'utf8'), 'L11.md');
    expect(l11.grammar.some((g) => g.patternNote === '(the situation is new or has changed)')).toBe(true);
  });
});
