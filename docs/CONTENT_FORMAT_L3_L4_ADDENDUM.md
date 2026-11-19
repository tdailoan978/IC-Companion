# Lesson file format: addendum for Level 3 and Level 4

This addendum extends `CONTENT_FORMAT.md` for the files `content/level-3/L1.md` … `L10.md` and
`content/level-4/L1.md` … `L10.md`. Everything in `CONTENT_FORMAT.md` still holds unless this file says
otherwise. Level 2 files (`content/level-2/`) are not affected. As before, the structure is a strict
contract and all teaching content is original writing that follows the lesson order, word lists and
grammar-topic lists of *Integrated Chinese* (4th ed.).

## What changes (summary)

1. Vocabulary is **one table**, with no `### Part 1` / `### Part 2` headings.
2. A new H2 section, **`## Words & Phrases`**, sits between `## Grammar` and `## Dialogues`.
3. The front matter keys are unchanged; lesson numbers restart at 1 in each level, so `id` values
   repeat across levels and only `level` + `id` together identify a lesson.
4. The Book reference table uses fixed row names for the main sections.

## File skeleton (exact headings, exact order)

```
---
id: L1
level: 3
lesson: 1
title_en: Starting a New Semester
title_zh: 开学
book: Integrated Chinese 4th ed., Level 3
book_pages: 1-32
---

# Lesson 1 · 开学 · Starting a New Semester

## Objectives
- bullet list (3-5 items)

## Book reference
| Section | Page |
|---|---|
| Text | 2 |
| Vocabulary | 6 |
| Grammar | 8 |
| Words & Phrases | 17 |
| Language Practice | 24 |

## Vocabulary
| # | Chinese | Pinyin | POS | English |
|---|---|---|---|---|
| 1 | 开学 | kāixué | vo | to begin a new semester |

## Grammar

### G1 · <topic title>
**Pattern:** `…`

Explanation paragraphs.

| Chinese | Pinyin | English |
|---|---|---|
| … | … | … |

**Watch out:** optional single line.

## Words & Phrases

### W1 · 不见得 (not necessarily)
Explanation paragraph(s): how the word or phrase works.

| Chinese | Pinyin | English |
|---|---|---|
| … | … | … |

**Watch out:** optional single line.

## Dialogues
(unchanged: exactly two blocks)

## Exercises
(unchanged: exactly four blocks, E1 choice, E2 order, E3 translate, E4 match)

## Speaking prompts
(unchanged: one table of four open questions)
```

## Rules

- **Front matter.** Same seven keys, in the same order, as Level 2: `id`, `level`, `lesson`, `title_en`,
  `title_zh`, `book`, `book_pages`. `id` is `L` + the lesson number (`L1` … `L10`). `level` is `3` or `4`.
  `book` is exactly `Integrated Chinese 4th ed., Level 3` or `Integrated Chinese 4th ed., Level 4`.
  `book_pages` is `<first>-<last>` in printed page numbers. `level` + `id` identify a lesson: `L1` exists
  in both Level 3 and Level 4.
- **H1.** `# Lesson <lesson> · <title_zh> · <title_en>`, as in Level 2.
- **H2 sections** are exactly: Objectives, Book reference, Vocabulary, Grammar, Words & Phrases, Dialogues,
  Exercises, Speaking prompts, in that order.
- **Book reference.** The table always has the rows `Text`, `Vocabulary`, `Grammar`, `Words & Phrases`
  and `Language Practice` (these exact names), each with the printed page the section starts on. Other
  sections that exist in the lesson (for example `Chinese Chat`, `Cultural Literacy`, `Lesson Wrap-Up`,
  `Pinyin Text`) are added as further rows, in page order.
- **Vocabulary.** `## Vocabulary` is followed directly by a single table with the columns
  `# | Chinese | Pinyin | POS | English`. Rows are numbered from 1 without gaps, in the book's order;
  proper nouns come last, as in the book. There are no `###` headings in this section.
- **Grammar.** Unchanged shape: `### G<n> · <title>`, a `**Pattern:**` line with the pattern in backticks,
  explanation text, an examples table (`Chinese | Pinyin | English`) with 3-4 rows, and an optional single
  `**Watch out:**` line. A lesson has as many points as the book has (3 to 5 in these levels).
- **Words & Phrases.** One H3 block per entry, numbered from 1 in the book's order (the book's letters
  A, B, C… become W1, W2, W3…). The heading is `### W<n> · <word or phrase> (<short English gloss>)`:
  the gloss is the text inside the **last** pair of parentheses of the heading and contains no parentheses
  itself; the word or phrase is everything between `· ` and that last ` (`. The word may be a pattern
  (`跟…打交道`), a pair (`适合/合适`) or contain a placeholder. The block has, in this order:
  explanation text (one or more paragraphs; no `**Pattern:**` line), one examples table
  (`Chinese | Pinyin | English`) with 2-4 rows, and an optional single `**Watch out:**` line.
- **Dialogues, Exercises, Speaking prompts.** Unchanged: exactly two dialogues of 8-12 turns with a
  `*Setting: …*` line; exactly four exercise sets in the order choice, order, translate, match;
  one table of four speaking prompts.
- **Glossed words in dialogues.** When a dialogue line uses a word that the learner has not met yet
  (not in Levels 1-2, earlier lessons of this level, or this lesson), the English cell of that row ends
  with a gloss in parentheses: `(词 cí: meaning)`; several glosses are separated by `; ` inside one pair
  of parentheses. The app may show this as plain text. Such words are kept to a minimum.
- **POS tags, pinyin conventions, tables.** Unchanged. Cells never contain `|` or line breaks.
- **Characters.** Simplified characters only.

## Level 4

Level 4 files use exactly the same format as Level 3. The Level 4 book was checked before this
addendum was fixed: it has the same lesson layout as Level 3 (one text, one vocabulary list, numbered
grammar points, lettered Words & Phrases entries), so no extra rules are needed.

One difference in numbering: the Level 4 book prints its lessons as **Lesson 11 to Lesson 20**. The app
files keep the numbering the owner decided: `content/level-4/L1.md` … `L10.md` with `lesson: 1` … `10`.
File `L<n>.md` of Level 4 is the book's Lesson `<n + 10>` (so `level-4/L1.md` is the book's Lesson 11).
`book_pages` and the Book reference table use the Level 4 book's own printed page numbers, which start
again at 1.
