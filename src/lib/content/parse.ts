// Parser for lesson Markdown files (contract: CONTENT_FORMAT.md).
// Pure and dependency-free so the app can import it too: no Node APIs here.
//
// Every contract break is reported as `<file>:<line>: <what is wrong, what was expected>`.
// Problems inside rows and items are collected so one run reports as many as possible;
// structural problems (a missing section, a missing table) stop that section only.

import type { Dialogue, DialogueTurn, ExerciseSet, GrammarPoint, Lesson, Sentence, VocabItem } from './types.ts';

export type ContentIssue = { file: string; line: number; message: string };

export const formatIssue = (i: ContentIssue): string => `${i.file}:${i.line}: ${i.message}`;

/** Thrown when a lesson file breaks the contract. `message` holds one `file:line: …` line per issue. */
export class ContentError extends Error {
  readonly issues: ContentIssue[];
  constructor(issues: ContentIssue[]) {
    super(issues.map(formatIssue).join('\n'));
    this.name = 'ContentError';
    this.issues = issues;
  }
}

/**
 * Strips whitespace and punctuation (Chinese full-width and ASCII) so answers can be compared on
 * their characters alone. Used by the order-exercise check here and by the exercise screen.
 */
export const normalizeForCompare = (s: string): string => s.normalize('NFC').replace(/[\p{P}\p{S}\p{Z}\s]/gu, '');

export const SECTIONS = [
  'Objectives',
  'Book reference',
  'Vocabulary',
  'Grammar',
  'Dialogues',
  'Exercises',
  'Speaking prompts',
] as const;

export const POS_TAGS = [
  'n', 'v', 'adj', 'adv', 'vo', 'mw', 'prep', 'conj', 'pr', 'part', 'num', 't', 'pn', 'exp', 'mv', 'vc', 'intj',
] as const;

export const EXERCISE_TYPES = ['choice', 'order', 'translate', 'match'] as const;
type ExerciseType = (typeof EXERCISE_TYPES)[number];

const FRONT_MATTER_KEYS = ['id', 'level', 'lesson', 'title_en', 'title_zh', 'book', 'book_pages'] as const;

type Line = { n: number; text: string };
type Block = { heading: Line; title: string; body: Line[] };
type Row = { n: number; cells: string[]; index: number }; // index: position among all data rows

const isBlank = (l: Line) => l.text.trim() === '';
const isTableLine = (l: Line) => l.text.startsWith('|');
const quote = (s: string) => `"${s}"`;

/** Parses one lesson file. `file` is only used in error messages. Throws ContentError. */
export function parseLesson(text: string, file: string): Lesson {
  const issues: ContentIssue[] = [];
  const fail = (line: number, message: string): never => {
    throw new ContentError([{ file, line, message }]);
  };
  const report = (line: number, message: string) => {
    issues.push({ file, line, message });
  };
  // Runs fn; a ContentError it throws is recorded and parsing carries on.
  const attempt = <T>(fn: () => T): T | undefined => {
    try {
      return fn();
    } catch (e) {
      if (e instanceof ContentError) {
        issues.push(...e.issues);
        return undefined;
      }
      throw e;
    }
  };
  const done = <T>(value: T | undefined): T => {
    if (issues.length > 0) throw new ContentError(issues);
    return value as T;
  };

  const lines: Line[] = text
    .replace(/^﻿/, '')
    .split(/\r?\n/)
    .map((t, i) => ({ n: i + 1, text: t.replace(/\s+$/, '') }));
  const lastLine = lines[lines.length - 1].n;

  // ---- table helpers ------------------------------------------------------------------

  const splitRow = (l: Line, what: string): string[] => {
    const t = l.text.trim();
    if (!t.startsWith('|') || !t.endsWith('|') || t.length < 2) {
      fail(l.n, `${what}: a table row must start and end with "|"`);
    }
    return t.slice(1, -1).split('|').map((c) => c.trim());
  };

  /**
   * Reads the pipe table that starts at body[start]. Bad data rows are reported and skipped;
   * `count` still includes them so row-count checks do not pile up extra errors.
   */
  const readTable = (body: Line[], start: number, headers: readonly string[], what: string) => {
    const head = body[start];
    const want = `| ${headers.join(' | ')} |`;
    const got = splitRow(head, what);
    if (got.length !== headers.length || got.some((c, i) => c !== headers[i])) {
      fail(head.n, `${what}: expected the table header ${quote(want)}, found ${quote(head.text.trim())}`);
    }
    const sep = body[start + 1];
    const sepCells = sep && isTableLine(sep) ? splitRow(sep, what) : [];
    if (sepCells.length !== headers.length || !sepCells.every((c) => /^:?-+:?$/.test(c))) {
      fail(sep ? sep.n : head.n, `${what}: expected the separator row ${quote(`|${headers.map(() => '---').join('|')}|`)} under the table header`);
    }
    const rows: Row[] = [];
    let i = start + 2;
    let count = 0;
    for (; i < body.length && isTableLine(body[i]); i++) {
      const l = body[i];
      count++;
      attempt(() => {
        const cells = splitRow(l, what);
        if (cells.length !== headers.length) {
          fail(l.n, `${what}: row has ${cells.length} columns, expected ${headers.length} (${headers.join(', ')})`);
        }
        cells.forEach((c, k) => {
          if (c === '') fail(l.n, `${what}: the ${headers[k]} cell is empty`);
        });
        rows.push({ n: l.n, cells, index: count - 1 });
      });
    }
    return { rows, count, end: i, headerLine: head.n };
  };

  /** A body that must hold exactly one table and nothing else. */
  const onlyTable = (body: Line[], at: number, headers: readonly string[], what: string) => {
    let i = 0;
    while (i < body.length && isBlank(body[i])) i++;
    if (i >= body.length) fail(at, `${what}: missing table with columns ${headers.join(', ')}`);
    if (!isTableLine(body[i])) fail(body[i].n, `${what}: unexpected text; expected a table with columns ${headers.join(', ')}`);
    const table = readTable(body, i, headers, what);
    rejectRest(body, table.end, `${what}: unexpected text after the table`);
    return table;
  };

  const rejectRest = (body: Line[], from: number, message: string) => {
    for (let i = from; i < body.length; i++) {
      if (!isBlank(body[i])) fail(body[i].n, message);
    }
  };

  const toSentence = (r: Row): Sentence => ({ zh: r.cells[0], pinyin: r.cells[1], en: r.cells[2] });

  const splitH3 = (body: Line[], what: string, allowed: boolean) => {
    const blocks: Block[] = [];
    const preamble: Line[] = [];
    for (const l of body) {
      const m = /^### (.*)$/.exec(l.text);
      if (m) {
        if (!allowed) fail(l.n, `${what}: unexpected "###" heading in this section`);
        blocks.push({ heading: l, title: m[1].trim(), body: [] });
      } else if (blocks.length > 0) {
        blocks[blocks.length - 1].body.push(l);
      } else {
        preamble.push(l);
      }
    }
    if (allowed) {
      const stray = preamble.find((l) => !isBlank(l));
      if (stray) fail(stray.n, `${what}: unexpected text before the first "###" heading`);
    }
    return blocks;
  };

  // ---- front matter -------------------------------------------------------------------

  if (lines[0].text !== '---') fail(1, 'expected the front matter to open with "---" on the first line');
  const close = lines.findIndex((l, i) => i > 0 && l.text === '---');
  if (close < 0) fail(1, 'the front matter is never closed; expected a second "---" line');
  const fm = new Map<string, { value: string; n: number }>();
  for (const l of lines.slice(1, close)) {
    if (isBlank(l)) continue;
    const m = /^([A-Za-z_][A-Za-z0-9_]*):(?:\s+(.*))?$/.exec(l.text);
    if (!m) {
      report(l.n, `front matter: expected a "key: value" line, found ${quote(l.text)}`);
      continue;
    }
    const [, key, value = ''] = m;
    if (fm.has(key)) report(l.n, `front matter: duplicate key ${quote(key)}`);
    else if (value.trim() === '') report(l.n, `front matter: ${quote(key)} has no value`);
    else fm.set(key, { value: value.trim(), n: l.n });
  }
  for (const key of FRONT_MATTER_KEYS) {
    if (!fm.has(key)) report(lines[close].n, `front matter: missing required key ${quote(key)}`);
  }
  const fmNumber = (key: string): number => {
    const e = fm.get(key);
    if (!e) return NaN;
    if (!/^\d+$/.test(e.value)) report(e.n, `front matter: ${quote(key)} must be a whole number, found ${quote(e.value)}`);
    return Number(e.value);
  };
  const fmString = (key: string) => fm.get(key)?.value ?? '';
  const id = fmString('id');
  if (fm.has('id') && /\s|\./.test(id)) report(fm.get('id')!.n, `front matter: id ${quote(id)} must not contain spaces or dots`);
  const level = fmNumber('level');
  const lessonNumber = fmNumber('lesson');

  // ---- H1 and H2 sections -------------------------------------------------------------

  const body = lines.slice(close + 1);
  const h2: { name: string; line: Line; index: number }[] = [];
  body.forEach((l, index) => {
    const m = /^## (.*)$/.exec(l.text);
    if (m) h2.push({ name: m[1].trim(), line: l, index });
  });

  const firstH2 = h2.length > 0 ? h2[0].index : body.length;
  const top = body.slice(0, firstH2).filter((l) => !isBlank(l));
  const h1 = top.filter((l) => /^# \S/.test(l.text));
  const strayTop = top.find((l) => !/^# \S/.test(l.text));
  if (strayTop) report(strayTop.n, `unexpected text before the first section; only the "# Lesson …" title line belongs here`);
  if (h1.length === 0) report(h2.length > 0 ? h2[0].line.n : lastLine, 'missing the "# Lesson …" title line before the first section');
  if (h1.length > 1) report(h1[1].n, 'more than one "# " title line; expected exactly one');

  const order = SECTIONS.map((s) => `"## ${s}"`).join(', ');
  const sectionsOk = attempt(() => {
    for (let k = 0; k < Math.max(SECTIONS.length, h2.length); k++) {
      const want = SECTIONS[k];
      const got = h2[k];
      if (!got) fail(lastLine, `missing section "## ${want}" at the end of the file; sections must be ${order}`);
      if (!want) fail(got.line.n, `unexpected section "## ${got.name}"; sections must be ${order}`);
      if (got.name !== want) {
        const seenLater = h2.slice(k + 1).some((h) => h.name === want);
        const known = (SECTIONS as readonly string[]).includes(got.name);
        const problem = seenLater
          ? `sections are out of order: found "## ${got.name}" where "## ${want}" was expected`
          : known
            ? `missing section "## ${want}" (expected before "## ${got.name}")`
            : `found "## ${got.name}" where "## ${want}" was expected`;
        fail(got.line.n, `${problem}; sections must be ${order}`);
      }
    }
    return true;
  });
  // Without the expected sections nothing else can be located reliably.
  if (!sectionsOk) throw new ContentError(issues);
  const section = (name: (typeof SECTIONS)[number]) => {
    const k = SECTIONS.indexOf(name);
    const end = k + 1 < h2.length ? h2[k + 1].index : body.length;
    return { heading: h2[k].line, body: body.slice(h2[k].index + 1, end) };
  };

  // ---- Objectives ---------------------------------------------------------------------

  const objectives = attempt(() => {
    const s = section('Objectives');
    splitH3(s.body, 'Objectives', false);
    const items: string[] = [];
    for (const l of s.body) {
      if (isBlank(l)) continue;
      const m = /^- (.+)$/.exec(l.text);
      if (!m) fail(l.n, `Objectives: expected a "- " bullet line, found ${quote(l.text)}`);
      items.push(m![1].trim());
    }
    if (items.length < 3 || items.length > 5) {
      fail(s.heading.n, `Objectives: found ${items.length} bullets, expected 3 to 5`);
    }
    return items;
  });

  // ---- Book reference -----------------------------------------------------------------

  const bookRefs = attempt(() => {
    const s = section('Book reference');
    splitH3(s.body, 'Book reference', false);
    const t = onlyTable(s.body, s.heading.n, ['Section', 'Page'], 'Book reference');
    if (t.count === 0) fail(t.headerLine, 'Book reference: the table has no rows');
    const refs: { section: string; page: number }[] = [];
    for (const r of t.rows) {
      attempt(() => {
        if (!/^\d+$/.test(r.cells[1])) fail(r.n, `Book reference: page must be a whole number, found ${quote(r.cells[1])}`);
        refs.push({ section: r.cells[0], page: Number(r.cells[1]) });
      });
    }
    return refs;
  });

  // ---- Vocabulary ---------------------------------------------------------------------

  const vocab = attempt(() => {
    const s = section('Vocabulary');
    const blocks = splitH3(s.body, 'Vocabulary', true);
    const items: VocabItem[] = [];
    let next = 1; // the number the next data row should carry
    for (let k = 0; k < blocks.length; k++) {
      const b = blocks[k];
      if (k >= 2) fail(b.heading.n, `Vocabulary: unexpected heading ${quote(b.heading.text)}; expected only "### Part 1" and "### Part 2"`);
      const part = (k + 1) as 1 | 2;
      if (b.title !== `Part ${part}`) fail(b.heading.n, `Vocabulary: expected "### Part ${part}", found ${quote(b.heading.text)}`);
      const what = `Vocabulary Part ${part}`;
      const t = attempt(() => onlyTable(b.body, b.heading.n, ['#', 'Chinese', 'Pinyin', 'POS', 'English'], what));
      if (!t) continue;
      if (t.count === 0) report(t.headerLine, `${what}: the table has no rows`);
      let lastIndex = -1;
      for (const r of t.rows) {
        next += r.index - lastIndex - 1; // step over malformed rows already reported by readTable
        lastIndex = r.index;
        const want = next++;
        attempt(() => {
          const [num, zh, pinyin, pos, en] = r.cells;
          if (!/^\d+$/.test(num)) fail(r.n, `${what}: the # cell must be a number, found ${quote(num)}`);
          const n = Number(num);
          if (n !== want) {
            next = n + 1; // resynchronise so one slip is reported once
            fail(r.n, `${what}: numbering must run 1, 2, 3, … without gaps across both parts; expected ${want}, found ${n}`);
          }
          const badTag = pos.split('/').find((p) => !(POS_TAGS as readonly string[]).includes(p));
          if (badTag !== undefined) {
            fail(r.n, `${what}: unknown POS tag ${quote(badTag)} in ${quote(pos)}; expected tags from ${POS_TAGS.join(', ')} (combine with "/")`);
          }
          items.push({ id: `${id}.v.${n}`, part, n, zh, pinyin, pos, en });
        });
      }
      next += t.count - lastIndex - 1;
    }
    if (blocks.length < 2) fail(s.heading.n, `Vocabulary: expected "### Part 1" and "### Part 2", found ${blocks.length} part(s)`);
    return items;
  });

  // ---- Grammar ------------------------------------------------------------------------

  const grammar = attempt(() => {
    const s = section('Grammar');
    const blocks = splitH3(s.body, 'Grammar', true);
    if (blocks.length === 0) fail(s.heading.n, 'Grammar: expected at least one "### G1 · <title>" block');
    const points: GrammarPoint[] = [];
    blocks.forEach((b, k) => {
      attempt(() => {
        const m = /^G(\d+) · (\S.*)$/.exec(b.title);
        if (!m) fail(b.heading.n, `Grammar: expected the heading "### G${k + 1} · <title>", found ${quote(b.heading.text)}`);
        const g = Number(m![1]);
        if (g !== k + 1) fail(b.heading.n, `Grammar: points must be numbered G1, G2, … in order; expected G${k + 1}, found G${g}`);
        const label = `G${g}`;
        const lines = b.body;
        let i = 0;
        while (i < lines.length && isBlank(lines[i])) i++;
        const pm = i < lines.length ? /^\*\*Pattern:\*\*\s*(.*)$/.exec(lines[i].text) : null;
        if (!pm) fail(i < lines.length ? lines[i].n : b.heading.n, `${label}: expected "**Pattern:** \`…\`" as the first line of the block`);
        const pattern = extractPattern(pm![1]);
        if (pattern === undefined) fail(lines[i].n, `${label}: the Pattern line needs the pattern in backticks, e.g. **Pattern:** \`A + 比 + B + Adj\``);
        const patternLine = i;
        i++;
        const tableStart = lines.findIndex((l, j) => j >= i && isTableLine(l));
        if (tableStart < 0) fail(b.heading.n, `${label}: missing the examples table (columns Chinese, Pinyin, English)`);
        const explanationLines = lines.slice(i, tableStart);
        const early = explanationLines.find((l) => /^\*\*(Watch out|Pattern):\*\*/.test(l.text));
        if (early) fail(early.n, `${label}: unexpected ${quote(early.text.split('**')[1] + ':')} line before the examples table; only explanation text belongs between the Pattern line and the table`);
        const explanationMd = explanationLines.map((l) => l.text).join('\n').trim();
        if (explanationMd === '') fail(lines[patternLine].n, `${label}: missing the explanation between the Pattern line and the examples table`);
        const t = readTable(lines, tableStart, ['Chinese', 'Pinyin', 'English'], `${label} examples`);
        if (t.count < 3 || t.count > 4) fail(t.headerLine, `${label}: the examples table has ${t.count} rows, expected 3 to 4`);
        let watchOut: string | undefined;
        for (let j = t.end; j < lines.length; j++) {
          const l = lines[j];
          if (isBlank(l)) continue;
          const w = /^\*\*Watch out:\*\*\s*(.+)$/.exec(l.text);
          if (!w || watchOut !== undefined) {
            fail(l.n, `${label}: unexpected text after the examples table; only one optional "**Watch out:** …" line may follow`);
          }
          watchOut = w![1].trim();
        }
        const point: GrammarPoint = {
          id: `${id}.g.${g}`,
          title: m![2].trim(),
          pattern: pattern!,
          explanationMd,
          examples: t.rows.map(toSentence),
        };
        const patternNote = extractPatternNote(pm![1]);
        if (patternNote !== undefined) point.patternNote = patternNote;
        if (watchOut !== undefined) point.watchOut = watchOut;
        points.push(point);
      });
    });
    return points;
  });

  // ---- Dialogues ----------------------------------------------------------------------

  const dialogues = attempt(() => {
    const s = section('Dialogues');
    const blocks = splitH3(s.body, 'Dialogues', true);
    const out: Dialogue[] = [];
    blocks.forEach((b, k) => {
      attempt(() => {
        if (k >= 2) fail(b.heading.n, `Dialogues: unexpected third block ${quote(b.heading.text)}; expected exactly "### Dialogue 1 · …" and "### Dialogue 2 · …"`);
        const m = /^Dialogue (\d+) · (\S.*)$/.exec(b.title);
        if (!m || Number(m[1]) !== k + 1) fail(b.heading.n, `Dialogues: expected the heading "### Dialogue ${k + 1} · <title>", found ${quote(b.heading.text)}`);
        const label = `Dialogue ${k + 1}`;
        const lines = b.body;
        let i = 0;
        while (i < lines.length && isBlank(lines[i])) i++;
        const sm = i < lines.length ? /^\*Setting:\s*(.*?)\*$/.exec(lines[i].text) : null;
        if (!sm || sm[1].trim() === '') fail(i < lines.length ? lines[i].n : b.heading.n, `${label}: expected "*Setting: …*" as the first line of the block`);
        i++;
        while (i < lines.length && isBlank(lines[i])) i++;
        if (i >= lines.length || !isTableLine(lines[i])) fail(i < lines.length ? lines[i].n : b.heading.n, `${label}: expected the table (columns Speaker, Chinese, Pinyin, English) after the Setting line`);
        const t = readTable(lines, i, ['Speaker', 'Chinese', 'Pinyin', 'English'], label);
        rejectRest(lines, t.end, `${label}: unexpected text after the dialogue table`);
        if (t.count < 8 || t.count > 12) fail(t.headerLine, `${label}: has ${t.count} turns, expected 8 to 12`);
        const dId = `${id}.d${k + 1}`;
        const turns: DialogueTurn[] = t.rows.map((r, j) => ({
          id: `${dId}.${j + 1}`,
          speaker: r.cells[0],
          zh: r.cells[1],
          pinyin: r.cells[2],
          en: r.cells[3],
        }));
        out.push({ id: dId, title: m![2].trim(), setting: sm![1].trim(), turns });
      });
    });
    if (blocks.length !== 2) report(s.heading.n, `Dialogues: expected exactly 2 dialogue blocks, found ${blocks.length}`);
    return out;
  });

  // ---- Exercises ----------------------------------------------------------------------

  const exercises = attempt(() => {
    const s = section('Exercises');
    const blocks = splitH3(s.body, 'Exercises', true);
    const sets: ExerciseSet[] = [];
    blocks.forEach((b, k) => {
      attempt(() => {
        if (k >= 4) fail(b.heading.n, `Exercises: unexpected fifth block ${quote(b.heading.text)}; expected exactly 4 (E1-E4)`);
        const m = /^E(\d+) · (.+?)\s*\{type=([^}]*)\}$/.exec(b.title);
        if (!m) fail(b.heading.n, `Exercises: expected the heading "### E${k + 1} · <title> {type=choice|order|translate|match}", found ${quote(b.heading.text)}`);
        const [, num, title, type] = m!;
        if (Number(num) !== k + 1) fail(b.heading.n, `Exercises: sets must be numbered E1-E4 in order; expected E${k + 1}, found E${num}`);
        if (!(EXERCISE_TYPES as readonly string[]).includes(type)) fail(b.heading.n, `Exercises: unknown type ${quote(type)}; expected one of ${EXERCISE_TYPES.join(', ')}`);
        if (title.trim() === '') fail(b.heading.n, `E${num}: the heading has no title`);
        const setId = `${id}.e${num}`;
        sets.push(parseExerciseSet(b, setId, title.trim(), type as ExerciseType));
      });
    });
    if (blocks.length !== 4) report(s.heading.n, `Exercises: expected exactly 4 exercise sets, found ${blocks.length}`);
    return sets;
  });

  function parseExerciseSet(b: Block, setId: string, title: string, type: ExerciseType): ExerciseSet {
    const label = setId.split('.').pop()!.toUpperCase();
    const items: { n: number; k: number; prompt: string; answer: string }[] = [];
    let k = 0;
    for (const l of b.body) {
      if (isBlank(l)) continue;
      k++;
      const kk = k;
      attempt(() => {
        const m = /^(\d+)\.\s+(.*)$/.exec(l.text);
        if (!m) fail(l.n, `${label}: expected a numbered item "${kk}. … → answer", found ${quote(l.text)}`);
        if (Number(m![1]) !== kk) fail(l.n, `${label}: items must be numbered 1, 2, … in order; expected ${kk}., found ${m![1]}.`);
        const parts = m![2].split('→');
        if (parts.length !== 2) {
          fail(l.n, `${label}: item ${kk} must contain exactly one "→" separating the prompt from the answer, found ${parts.length - 1}`);
        }
        const prompt = parts[0].trim();
        const answer = parts[1].trim();
        if (prompt === '') fail(l.n, `${label}: item ${kk} has nothing before "→"`);
        if (answer === '') fail(l.n, `${label}: item ${kk} has no answer after "→"`);
        items.push({ n: l.n, k: kk, prompt, answer });
      });
    }
    if (k === 0) fail(b.heading.n, `${label}: the set has no items; expected numbered lines "1. … → answer"`);
    const itemId = (k: number) => `${setId}.${k}`;

    switch (type) {
      case 'choice': {
        const out: Extract<ExerciseSet, { type: 'choice' }>['items'] = [];
        for (const it of items) {
          attempt(() => {
            const blanks = it.prompt.match(/_+/g) ?? [];
            if (blanks.length !== 1 || blanks[0] !== '___') {
              fail(it.n, `${label}: item ${it.k} needs exactly one "___" blank in the prompt, found ${blanks.length === 0 ? 'none' : blanks.map(quote).join(', ')}`);
            }
            const groups = [...it.prompt.matchAll(/\[([^\]]*)\]/g)];
            if (groups.length !== 1) {
              fail(it.n, `${label}: item ${it.k} needs exactly one option group like "[a | b | c]", found ${groups.length}`);
            }
            const g = groups[0];
            const options = g[1].split('|').map((o) => o.trim());
            if (options.length < 2 || options.some((o) => o === '')) {
              fail(it.n, `${label}: item ${it.k} option group ${quote(g[0])} needs at least two non-empty options separated by " | "`);
            }
            if (new Set(options).size !== options.length) fail(it.n, `${label}: item ${it.k} lists the same option twice`);
            if (!options.includes(it.answer)) {
              fail(it.n, `${label}: item ${it.k} answer ${quote(it.answer)} is not one of the options ${options.map(quote).join(', ')}`);
            }
            const rawBefore = it.prompt.slice(0, g.index);
            const rawAfter = it.prompt.slice(g.index! + g[0].length);
            const joiner = /\s$/.test(rawBefore) && /^\s/.test(rawAfter) && rawBefore.trim() && rawAfter.trim() ? ' ' : '';
            const prompt = (rawBefore.trimEnd() + joiner + rawAfter.trimStart()).trim();
            out.push({ id: itemId(it.k), prompt, options, answer: it.answer });
          });
        }
        return { id: setId, type, title, items: out };
      }
      case 'order': {
        const out: Extract<ExerciseSet, { type: 'order' }>['items'] = [];
        for (const it of items) {
          attempt(() => {
            const chunks = it.prompt.split(' / ').map((c) => c.trim());
            if (chunks.length < 2 || chunks.some((c) => c === '')) {
              fail(it.n, `${label}: item ${it.k} needs at least two non-empty chunks separated by " / "`);
            }
            const sorted = (s: string) => [...normalizeForCompare(s)].sort().join('');
            if (sorted(chunks.join('')) !== sorted(it.answer)) {
              fail(it.n, `${label}: item ${it.k} chunks ${quote(normalizeForCompare(chunks.join('')))} do not use the same characters as the answer ${quote(normalizeForCompare(it.answer))} (punctuation and spaces ignored)`);
            }
            out.push({ id: itemId(it.k), chunks, answer: it.answer });
          });
        }
        return { id: setId, type, title, items: out };
      }
      case 'translate':
        return { id: setId, type, title, items: items.map((it) => ({ id: itemId(it.k), en: it.prompt, answer: it.answer })) };
      case 'match':
        return { id: setId, type, title, items: items.map((it) => ({ id: itemId(it.k), zh: it.prompt, en: it.answer })) };
    }
  }

  // ---- Speaking prompts ---------------------------------------------------------------

  const speaking = attempt(() => {
    const s = section('Speaking prompts');
    splitH3(s.body, 'Speaking prompts', false);
    const t = onlyTable(s.body, s.heading.n, ['Chinese', 'Pinyin', 'English'], 'Speaking prompts');
    if (t.count !== 4) fail(t.headerLine, `Speaking prompts: the table has ${t.count} rows, expected exactly 4`);
    return t.rows.map(toSentence);
  });

  return done<Lesson>({
    level,
    id,
    lesson: lessonNumber,
    titleEn: fmString('title_en'),
    titleZh: fmString('title_zh'),
    book: fmString('book'),
    bookPages: fmString('book_pages'),
    objectives: objectives!,
    bookRefs: bookRefs!,
    vocab: vocab!,
    grammar: grammar!,
    dialogues: dialogues!,
    exercises: exercises!,
    speaking: speaking!,
  });
}

/**
 * The pattern is the text inside the backticks of the Pattern line. When the line holds several
 * backtick groups (e.g. `A` or `B`), the whole span from the first to the last backtick is kept,
 * minus the backticks, so the joining words survive. Text after the last backtick is a note: see
 * extractPatternNote.
 */
export function extractPattern(rest: string): string | undefined {
  const first = rest.indexOf('`');
  const last = rest.lastIndexOf('`');
  if (first < 0 || last <= first) return undefined;
  const span = rest.slice(first + 1, last);
  if ((span.match(/`/g) ?? []).length % 2 !== 0) return undefined;
  const pattern = span.replace(/`/g, '').trim();
  return pattern === '' ? undefined : pattern;
}

/** Text after the last backtick of the Pattern line, e.g. "(the situation is new or has changed)". */
export function extractPatternNote(rest: string): string | undefined {
  const last = rest.lastIndexOf('`');
  const note = last < 0 ? '' : rest.slice(last + 1).trim();
  return note === '' ? undefined : note;
}
