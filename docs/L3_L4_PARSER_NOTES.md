# Parser changes for the Level 3 and Level 4 lesson files

For Claude Code. The new files are `content/level-3/L1.md` … `L10.md` and `content/level-4/L1.md` …
`L10.md`. Their format is `CONTENT_FORMAT.md` plus `docs/CONTENT_FORMAT_L3_L4_ADDENDUM.md`.

**Important:** until the parser is adapted, `npm run build:content` (and so `npm run dev` and
`npm run build`) fails, because `scripts/build-content.ts` picks up every `content/level-*/L*.md` file
and the current parser rejects the new files (unknown `## Words & Phrases` section, no `### Part 1`).
Adapt the parser before, or in the same commit as, adding the content.

Line numbers below refer to `src/lib/content/parse.ts` as it was on 2026-11-14.

## 1. Sections depend on the level

- `SECTIONS` (line ~30) is a single fixed list. Levels 3 and 4 need:
  `Objectives, Book reference, Vocabulary, Grammar, Words & Phrases, Dialogues, Exercises, Speaking prompts`.
  Level 2 keeps the old list (no `Words & Phrases`).
- The section check (lines ~232-253) and the `section(name)` helper (~254) index into `SECTIONS`; make
  both use the list chosen from the front matter `level` (level 2 → old list; level 3 and 4 → new list).
  `level` is already read before the H2 check, so no reordering is needed.
- Suggested rule: `level <= 2` → Level 2 format; `level >= 3` → Level 3/4 format. Error messages should
  name the list that applies.

## 2. Vocabulary: one table at Levels 3-4

- Lines ~297-335 require `### Part 1` and `### Part 2`. For level ≥ 3 the section body is one table and
  nothing else: `onlyTable(s.body, s.heading.n, ['#', 'Chinese', 'Pinyin', 'POS', 'English'], 'Vocabulary')`,
  with `splitH3(s.body, 'Vocabulary', false)` to reject stray `###` headings.
- Numbering: 1, 2, 3 … without gaps (same check as now).
- `VocabItem.part` is typed `1 | 2` (`types.ts`). Either make it optional and leave it out for level ≥ 3,
  or set it to `1` for every item. Check every place the UI groups or labels by part (search for
  `.part` in `src/features/vocab`, `src/features/lesson`, `src/features/review`): at Levels 3-4 there
  must be no "Part 1 / Part 2" split or label; show one list.
- Lists are longer than a Level 2 part: 23 to 46 words in Level 3, about 45 in Level 4. If the
  vocabulary step shows words in batches, check that one batch of ~46 is acceptable or chunk it in the UI.
- POS tags are the same set. Some cells combine tags (`adv/v`, `n/mw`), as before.
- A few words contain Latin letters or placeholders: `T恤衫`, `卡拉OK`, `非…不可`, `要么…，要么…`,
  `不是…，而是…`. Note the full-width comma inside two of the pattern entries; anything that splits
  Chinese text on `，` must not break these. Check `pinyin-pro` based features with the Latin-letter words.

## 3. New section: Words & Phrases

- One H3 block per entry. Heading: `### W<n> · <word or phrase> (<short English gloss>)`, numbered
  W1, W2, … in order. Suggested regex: `/^W(\d+) · (\S.*) \(([^()]+)\)$/` (group 2 = word, group 3 = gloss;
  the gloss is the last parenthesised group and contains no parentheses).
- Block body, in this order: explanation Markdown (one or more paragraphs, **no** `**Pattern:**` line),
  one table `Chinese | Pinyin | English` with **2 to 4** rows, then an optional single
  `**Watch out:** …` line. This is the grammar block without the Pattern line and with a 2-4 row limit,
  so the grammar block parser (lines ~339-394) can be reused with two switches.
- Suggested type (`types.ts`):
  `WordPhrase { id: string; word: string; gloss: string; explanationMd: string; examples: Sentence[]; watchOut?: string }`
  with `id` = `${lesson.id}.w.${n}`, and `Lesson.wordsPhrases: WordPhrase[]` (empty array for Level 2).
- A lesson has 3 to 10 entries. An entry's word can be a pair or a pattern: `适合/合适`,
  `幸福/快乐/高兴`, `不是X，就是Y`, `跟…打交道`.
- UI: the simplest fit is to show Words & Phrases as a second list inside (or right after) the grammar
  step, using the same card as a grammar point minus the pattern line. Its example sentences can feed
  the same features that use grammar examples (speaking, review). This is a product decision for the owner.

## 4. Ids repeat across levels

- Level 3 and Level 4 both have `L1` … `L10`, and item ids are built from the lesson id alone
  (`L1.v.3`, `L1.g.2`, `L1.d1.4`, `L1.e2.1`). They collide between levels. `lessonKey(lesson)` already
  combines level and id for lessons; check that **every stored key** (progress, review scheduling,
  notes, My words, deep links, backups) uses the level as well, not the bare item id. Level 2 uses
  L11-L20, so the collision has not been possible until now. If stored data uses bare item ids, prefix
  new ids with the level (for example `3:L1.v.3`) and keep Level 2's ids unchanged so existing progress
  survives.
- `build-content.ts` already checks that `level` matches the folder and `id` matches the file name, and
  detects duplicates by `lessonKey`. No change needed there.
- Routes and deep links that contain a lesson id need the level too (see `docs/NOTES_AND_DEEP_LINKS.md`).

## 5. Level 4 specifics

- Same format as Level 3; no extra parser rules.
- The Level 4 book numbers its lessons 11-20. The files are `level-4/L1.md` … `L10.md` with
  `lesson: 1` … `10` (the owner's decision), and the H1 reads `# Lesson 1 · …`. If the app should show
  the book's own number ("Lesson 11"), derive it in the UI as `lesson + 10` for level 4; the files do
  not carry it.
- The front matter `book` value is `Integrated Chinese 4th ed., Level 3` / `… Level 4` (Level 2 files say
  `Volume 2`). Nothing should depend on this string.
- Level 2's lesson list is L11-L20 and Level 3's is L1-L10: any sorting or "next lesson" logic must
  order by level first, then lesson number.

## 6. Small things

- Book reference rows at Levels 3-4 always include `Text`, `Vocabulary`, `Grammar`, `Words & Phrases`,
  `Language Practice` (Level 2 used `Part 1 text` and so on). Nothing in the parser depends on row names.
- Dialogue English cells may end with a gloss for a word outside the cumulative vocabulary:
  `(词 cí: meaning)`. It can be shown as plain text; a nicer rendering is optional.
- Grammar examples stay at 3-4 rows; Objectives stay at 3-5 bullets; dialogues 8-12 turns; four
  exercise sets in the fixed order; four speaking prompts. No change.
- `parse.test.ts`: add a Level 3 fixture covering the single vocabulary table, a Words & Phrases block
  (with and without Watch out), a heading whose word contains `/` or `…`, and the rejection cases
  (a `### Part 1` at level 3; a missing `## Words & Phrases`; a `**Pattern:**` line inside a W block;
  1 or 5 example rows).

## 7. How the content was checked

The files were checked with a separate validator (kept outside the repo) that enforces the rules above,
so they should parse cleanly once the parser follows this note. If the adapted parser reports an
error in a content file, treat it as a difference between this note and the parser first.
