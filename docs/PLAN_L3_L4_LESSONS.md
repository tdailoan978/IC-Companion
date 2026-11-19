# Plan: Integrated Chinese Level 3 and Level 4 lesson files (for Fable)

Written 2026-11-14 for a fresh session. The owner is a non-developer (refer to them as "the owner", they/them) who is learning Chinese and builds the IC Companion iPad app with Claude Code. Read this whole file before doing anything.

## 1. Goal and finish line

Write **20 lesson files**: Level 3 lessons 1-10 and Level 4 lessons 1-10, as original study content in the app's Markdown format, checked automatically and by independent reviewers. Level 2 (L11-L20) already exists and is the style model.

Done means:
- `content/level-3/L1.md` … `L10.md` and `content/level-4/L1.md` … `L10.md` exist (uncommitted) and pass the checks in section 7.
- `docs/CONTENT_FORMAT_L3_L4_ADDENDUM.md` describes the format changes.
- `docs/L3_L4_PARSER_NOTES.md` tells Claude Code exactly what the parser must change.
- `docs/L3_L4_CONTENT_REPORT.md` lists every flag, uncertainty and review finding per lesson.

The owner will run this after finishing other work and does not want stops between lessons. There is no per-lesson check-in. Work through all 20 and report at the end.

## 2. Hard rules (from the owner's working agreement)

- **Never run git commit, push or any git write.** Leave all new files uncommitted. Claude Code commits later and the owner pushes.
- **Never edit existing files** under `content/level-2/`, `src/`, `PLAN.md` or `CONTENT_FORMAT.md`. Report problems instead (file and line). Only create new files listed in section 1 and scratch files outside the repo.
- **The repo is public.** The textbook PDFs live outside it, in `/Users/Dion/Documents/Apps/Chinese Learning/Integrated Chinese copy/` (folders `Level 3/` and `Level 4/`). Never copy PDFs, page images or textbook text into the repo, and never commit that folder anywhere.
- **All teaching content is original writing.** Follow the book's lesson order, vocabulary list and grammar-topic list. Write fresh example sentences, fresh dialogues and fresh exercises. Explain grammar in your own words. Do not reproduce the book's text, its example sentences or its dialogue. Vocabulary entries (word, pinyin, part of speech, short English meaning) and page references follow the book.
- **Simplified characters only.** No traditional forms.
- **Ask before adding any dependency.** Do not add packages to the repo.
- **Agents kill only processes they started.** Each agent that starts a server or script owns it and must not touch others.

## 3. Sources

- `CONTENT_FORMAT.md` in the repo root: the strict contract. Level 3/4 files extend it as in section 4.
- `content/level-2/L11.md` and `L15.md`: style models for tone, depth and the recurring cast (林月, 马克, 安娜, 陈乐 plus role speakers).
- `PLAN.md` and `docs/NOTES_AND_DEEP_LINKS.md`: background only.
- Textbook PDFs in the folder above. The per-lesson Level 3 files are named `Integrated Chinese 3 L1.pdf` … `L10.pdf`. Level 4 has only the full-book PDF `Integrated Chinese Level 4 中文听说读写.pdf`; find each lesson inside it from its contents pages.
- Level 1 and Level 2 vocabulary (for the cumulative word check, section 6): Level 2 words from `content/level-2/*.md`; Level 1 words from `Level 1/Integrated Chinese Level 1 Anki.pdf`.

**Reading the PDFs.** They are image-based (print-to-PDF), so use the Read tool with the `pages` parameter (at most 20 pages per request). Layout of Level 3 Lesson 1, as a guide only: cover with objectives; Text (about 4 pages, with Language Notes); Vocabulary (about 2 pages); Grammar (about 8 pages, 4 points); Words & Phrases (about 7 pages, lettered A-H, each with example sentences); Language Practice, Chinese Chat and wrap-up (about 10 pages). **Read the text, vocabulary, grammar and Words & Phrases pages. Skim Language Practice only to see the skills tested. Do not read every page.** Use the printed page numbers in the page footers for the Book reference table.

## 4. The format for Level 3 and 4 (decided by the owner)

Same contract as `CONTENT_FORMAT.md`, with a **minimal extension**:

1. **Vocabulary is one block.** `## Vocabulary` is followed directly by a single table (columns `# | Chinese | Pinyin | POS | English`, numbered from 1). No `### Part 1` / `### Part 2`.
2. **New section `## Words & Phrases`**, placed between `## Grammar` and `## Dialogues`. One `###` per entry, heading `W<n> · <word or phrase> (<short English gloss>)`. Each entry has a short explanation paragraph (how the word works: predicate vs attributive, collocations, register), then a 3-column table (Chinese | Pinyin | English) with 2-4 original example rows. Cover every Words & Phrases entry the book gives for that lesson (the book lettering A, B, C… becomes W1, W2, W3…).
3. **Front matter** gains nothing new: `id: L1`, `level: 3`, `lesson: 1`, `title_en`, `title_zh`, `book: Integrated Chinese 4th ed., Level 3` (Level 4 likewise), `book_pages: <first>-<last>`. `level` + `id` identify a lesson, so ids repeat across levels.
4. **Book reference table** lists: Text, Vocabulary, Grammar, Words & Phrases, Language Practice (with the printed page of each), plus any other section that exists in that lesson.
5. **Grammar** keeps the existing shape (`### G<n> · title`, `**Pattern:**`, explanation, a 3-4 row examples table, optional `**Watch out:**`). Use as many G-points as the book has (Lesson 1 has 4).
6. **Dialogues** stay at exactly two (8-12 turns each). **Exercises** stay at exactly four, one each of choice, order, translate, match (about 6-8 items each, as in Level 2). **Speaking prompts** stay one table of four open questions.
7. Everything else (pinyin conventions, POS tags, tables with no `|` in cells) is unchanged.

First task of the run: write this as `docs/CONTENT_FORMAT_L3_L4_ADDENDUM.md` in proper contract language, then write `docs/L3_L4_PARSER_NOTES.md` listing the parser changes (single vocab block, Words & Phrases section, any Level 4 differences found in section 5).

## 5. Level 4 check before locking the spec

Level 4's layout has **not** been inspected. Before the addendum is final, one agent skims Level 4 Lesson 1 (cover, text, vocabulary, one grammar point, Words & Phrases) and reports any difference from Level 3: number of texts, extra sections, vocabulary size, whether there are Part 1/Part 2 splits. If Level 4 differs, extend the addendum (and parser notes) to cover it, and tell the orchestrator before lesson writing starts.

## 6. Pipeline and team (be ambitious: use a large team)

Run as an orchestrator with many parallel agents. Each agent owns disjoint files, is told exactly what not to edit, and writes only to its own lesson file and its own scratch files. Give servers their own ports. Use a scratch folder outside the repo (for example `$HOME/scratch/ic-l3-l4/`).

**Phase 0 (orchestrator, then one agent): setup.** Read the sources, write the addendum and parser notes, run the Level 4 check (section 5), build the validator script (section 7) and the cumulative vocabulary index from Levels 1-2.

**Phase 1: readers (20 agents in parallel, one per lesson).** Each reads its lesson's PDF pages and writes a facts file in scratch: lesson title (zh/en), printed page numbers per section, the full vocabulary list (word, pinyin, POS, English), the grammar point titles with the pattern each teaches, the Words & Phrases entry list, the text's topic and situation (a one-paragraph description, not a copy), and the lesson's learning objectives in paraphrase. Facts files hold facts and descriptions only, never book sentences.

**Phase 2: pilot, then writers.** First, one writer produces **Level 3 Lesson 1** as the pilot; the orchestrator runs the validator and one reviewer on it and fixes the process. Then **up to 19 writers in parallel**, one per remaining lesson. Each writer gets the facts file, the final format addendum, `CONTENT_FORMAT.md` and the two Level 2 style models. Requirements for a writer:
- Vocabulary table matches the facts file exactly (same words, order, POS, numbering).
- Pinyin follows the conventions in `CONTENT_FORMAT.md` (tone marks, joined syllables, written tone changes for 一 and 不, neutral tones unmarked, capitals for first word and names).
- Dialogues and exercises use words from the cumulative index (Levels 1-2, earlier Level 3/4 lessons, this lesson). Any word outside that set is avoided, or glossed in the dialogue's table, and logged in the report.
- Each grammar and Words & Phrases entry carries original example sentences and a "Watch out" where a typical learner error exists.
- Dialogues are natural spoken Chinese at the lesson's level, advance the recurring cast's story lightly, and use the lesson's grammar and words.
- Exercises have exactly one correct answer where the format demands it (choice, order, match). `translate` items give one model answer.

**Phase 3: checks and review (see section 7), then fixes.** After a lesson passes the validator, an **independent reviewer** (a fresh agent that did not write it) reads it against the facts file and returns findings. The writer, or a new fixer agent, applies real fixes. Allow at most two review-and-fix rounds per lesson; anything unresolved goes into the report as an open flag, not a guess.

**Phase 4: cross-lesson pass (a few agents).** Check across all 20 lessons: recurring cast used consistently, no repeated dialogue scenarios, no word glossed twice inconsistently, and cumulative vocabulary respected. Fix or flag.

**Phase 5: report.** Write `docs/L3_L4_CONTENT_REPORT.md`.

**Optional last task (small, only if the rest is done):** write `docs/SPEAKING_CHECK.md`, a spec for Claude Code (no code). Primary flow: Safari SpeechRecognition (zh-CN) transcribes the learner's attempt of a sentence, and the app compares the transcript to the target at pinyin level (with pinyin-pro, already approved) and highlights differing syllables. Fallback flow, used when recognition is unavailable or fails: record the learner, play it beside a model reading (built-in Chinese speech-synthesis voice), and overlay both pitch curves, with a self-rating. The spec must start with an iPad test: whether Safari recognition works from the Home Screen app, since that decides how much weight the fallback carries.

## 7. Checks

Build a validator (Python or Node in the scratch folder, not in the repo) that fails a lesson unless:
- Front matter keys and the exact H2 order hold: Objectives, Book reference, Vocabulary, Grammar, Words & Phrases, Dialogues, Exercises, Speaking prompts.
- Every table is well formed with no `|` or line breaks inside cells.
- The vocabulary table equals the facts file's list (words, order, POS tag in the allowed set, numbering from 1).
- Pinyin matches the characters for every Chinese string in vocabulary, grammar examples, W&P examples, dialogues and speaking prompts. Use a pinyin library with the allowance for 一/不 tone changes, neutral tones, and words with several readings; mark mismatches for review instead of auto-failing readings that are legitimately ambiguous.
- Exercise structure: four blocks with the right `{type=…}` tags; every item has exactly one `→`; `choice` items have one `___` and one `[a | b | c]` group whose answer appears among the options; `order` answers contain exactly the listed chunks.
- Dialogues: exactly two, 8-12 turns each, with the `*Setting: …*` line.
- Level 3/4 files contain no traditional characters.
- Cumulative vocabulary: every word used in dialogues and exercises is in the allowed set, or is logged.

Reviewer checklist (independent agent): grammar notes are correct and not misleading; example sentences are natural; dialogue sounds like real speech and uses the lesson's grammar; exercises each have one defensible answer; English glosses are accurate; level-appropriate difficulty; nothing copied from the book; anything uncertain is flagged as uncertain (not silently changed).

## 8. Report format

`docs/L3_L4_CONTENT_REPORT.md`: a table with one row per lesson (validator pass, review rounds used, open flags). Below it, the full list of open flags (file, line, issue, suggested resolution), words used outside the cumulative vocabulary, and anything in Level 4's layout the owner should know. Keep it factual and short.

## 9. Final message to the owner

Plain language: what was written, what was verified automatically and by reviewers, what was not verified (the owner cannot check Chinese by ear or eye), the open flags that matter most, and the next step: give `docs/L3_L4_PARSER_NOTES.md` to Claude Code to adapt the parser, then commit and push. Do not claim anything is verified that was not.
