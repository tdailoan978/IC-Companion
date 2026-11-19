# Takeover plan: finish the Level 3 and Level 4 lesson files (for Opus 5.5)

Written 2026-11-16 by the Fable session that started this work. It replaces `docs/PLAN_L3_L4_LESSONS.md`
as the working plan: read that file once for the goal and the owner's rules, then follow this one.
The owner is a non-developer (they/them) and cannot check Chinese themself. Read this whole file first.

## 0. Why this plan exists, and the one constraint that shaped it

The run stopped three times on the account's 5-hour usage limit. Each time many Opus agents were running
at once. **You, the takeover session, must be frugal:**

- Run **at most 3 Opus agents at a time** (writers and reviewers). Sonnet agents (fixers) are cheap; up to 4.
- Start the next agent only when one reports. Do not fan out 10 at once.
- If an agent dies on a rate limit, its work is saved. Check what is on disk first (section 2 commands),
  then start a **fresh** agent for whatever is missing. Do not try to resume the old agent ids listed in
  the previous session: they belong to that session.
- Do the orchestration yourself with small commands. Do not read whole lesson files into your own
  context unless you must judge something.

## 1. Hard rules (unchanged, from the owner)

- **Never run git commit, push or any git write.** Read-only git is tolerated but not needed. All new files
  stay uncommitted.
- **Never edit existing files** under `content/level-2/`, `src/`, `PLAN.md`, `CONTENT_FORMAT.md`.
- The repo is public. Textbook PDFs and page images never go into it. Page images live only in
  `~/scratch/ic-l3-l4/pages` and `pages4` and are **deleted at the end** (section 7).
- All teaching content is original. Vocabulary entries, titles, grammar-topic lists and page numbers
  follow the book.
- Simplified characters only. No new dependencies. Agents touch only their own files.

## 2. Where everything is

Repo: `/Users/Dion/Documents/Apps/ic-companion` (the lessons go in `content/level-3/`, `content/level-4/`).
Scratch (outside the repo): `/Users/Dion/scratch/ic-l3-l4/`

| Path in scratch | What it is |
|---|---|
| `READER.md`, `WRITER.md`, `REVIEWER.md`, `FIXER.md` | Briefs for each agent role. Agents read them first. |
| `STORY.md` | Cast and story outline for all 20 lessons. |
| `facts/L3-01.json` … `L4-10.json` | One facts file per lesson (all 20 done, lint clean). |
| `story/L<level>-<nn>.md` | Each writer's story note (what happened in its dialogues). |
| `reviews/L…r1.md`, `…fix1.md` | Review findings and fix logs. |
| `logs/*.oov.json`, `*.compound.json` | Validator output per lesson (see section 6). |
| `tools/validate.mjs`, `tools/lib.mjs` | The validator. `tools/extra_allowed.txt` = extra known words. |
| `level4_layout.md`, `level4_pagemap.json` | Level 4 book layout and page map. |
| `pages/`, `pages4/` | Rendered page images (226 MB). Not needed any more unless a facts file must be re-checked. |

Commands you will use:

```bash
# validate one lesson (must end in PASS)
node /Users/Dion/scratch/ic-l3-l4/tools/validate.mjs /Users/Dion/Documents/Apps/ic-companion/content/level-4/L6.md
# status of everything
cd /Users/Dion/scratch/ic-l3-l4 && ls reviews story && for f in /Users/Dion/Documents/Apps/ic-companion/content/level-[34]/L*.md; do node tools/validate.mjs "$f" --quiet | tail -1; done
```

## 3. Decisions already made (do not reopen)

- **Format:** `docs/CONTENT_FORMAT_L3_L4_ADDENDUM.md` (done). **Parser changes:** `docs/L3_L4_PARSER_NOTES.md` (done).
  The app's `npm run build:content` fails until Claude Code adapts the parser; that is expected and documented.
- **Level 4 numbering:** the book prints Lessons 11-20; the files are `level-4/L1.md` … `L10.md` with
  `lesson: 1` … `10` (the owner's decision). Level 4's layout is the same as Level 3's.
- **Models:** readers Sonnet (done), writers Opus, reviewers Opus, fixers Sonnet.
- **Pinyin spacing:** 了/着/过 after a verb are joined (`mǎile`, `zhùzhe`, `qùguo`); sentence-final 了 and
  的/得/地 stand alone; two-syllable directional complements are written neutral with a space
  (`xiǎng chulai`, `hēi xialai`). Reviewers are told not to flag this.
- **Neutral tones and readings follow the book's vocabulary list** even where dictionaries differ:
  `hǎochu`, `dìdao`, `zhúyi`, `wèidao`, `xīnxian`, `lìhai`, `mǎhu`, `tàidu`, `rènao`, `zǎochen`,
  拉 `là` ("leave behind"; standard character 落; kept as the book writes it, logged as a flag).
- **New minor character:** 大卫 Dàwèi, 安娜's boyfriend (from Level 3 Lesson 6). Already in `STORY.md`.
- **Glosses:** a word outside the cumulative vocabulary in a dialogue is glossed at the end of that row's
  English cell as `(词 cí: meaning)`. Exercises must not need glosses.
- **Review rounds:** one full review per lesson, then the fixer; then one short second-round check of
  the changed lines only (section 5, step C). Anything still unresolved goes into the report as an open
  flag, not a guess. Maximum two rounds.
- The validator's out-of-vocabulary check is weak on purpose: it only reports words containing a
  character that no known word has. Compounds of known characters go to `logs/*.compound.json` and are
  judged by a person-like reviewer in the cross-lesson pass. Say this plainly in the report.

## 4. State at takeover (checked on disk 2026-11-16)

Every existing lesson file passes the validator with 0 errors.

| Lesson | File | Story note | Review r1 | Fix 1 | Still to do |
|---|---|---|---|---|---|
| L3-01 | yes | yes | yes (2 must) | yes | second-round check |
| L3-02 | yes | yes | yes (2 must) | yes | second-round check |
| L3-03 | yes | yes | yes (3 must) | yes | second-round check |
| L3-04 | yes | yes | yes (0 must) | yes | second-round check |
| L3-05 | yes | yes | yes (1 must) | yes | second-round check |
| L3-06 | yes | yes | yes (1 must) | yes | second-round check |
| L3-07 | yes | yes | yes (1 must) | yes | second-round check |
| L3-08 | yes | yes | yes (0 must) | yes | second-round check |
| L3-09 | yes | yes | yes (1 must) | yes | second-round check |
| L3-10 | yes | yes | yes (2 must) | yes | second-round check |
| L4-01 | yes | yes | **no** | no | review, fix, check |
| L4-02 | yes (writer died before its final reply) | **no** | no | no | story note, review, fix, check |
| L4-03 | yes (writer died before its final reply) | **no** | no | no | story note, review, fix, check |
| L4-04 | yes | yes | yes, complete (`L4-04.r1.md`, FIX NEEDED) | **no** | fix, check |
| L4-05 | yes | yes | **no** | no | review, fix, check |
| L4-06 | **no** | no | no | no | write, review, fix, check |
| L4-07 | **no** | no | no | no | write, review, fix, check |
| L4-08 | **no** | no | no | no | write, review, fix, check |
| L4-09 | **no** | no | no | no | write, review, fix, check |
| L4-10 | **no** | no | no | no | write, review, fix, check |

Known weak spots to pass to the second-round checkers (fixers substituted their own wording where the
reviewer's replacement used an unknown word):
- L3-10 E1 item 2: `火车快到天津了，开得慢___了。→ 下来` (suspected awkward; `火车慢下来了` is the natural form).
- L3-08 E1 items 1, 2, 7 (`少花`, `学生们`, `不来`); L3-05 E1 item 7 (`很多人`); L3-03 Dialogue 1 (`菠菜汤`);
  L3-02 Dialogue 2 (`不过` in place of `其实`).
- L3-10: a reviewer noted the two dialogues follow the book text's sequence of ideas step by step
  (original sentences, same order of beats). Change one beat or log it as an open flag.
- L3-07 W4 uses 其实, which is outside the cumulative vocabulary; the fixer was told to add a gloss in the
  explanation. Verify it is there.

Facts-file loose ends (fix in the facts file yourself; small): `L3-01` Words & Phrases D pinyin
`shěng qián` vs vocabulary `shěngqián`; `L3-06` `sections` lacks `{"name": "Chinese Chat", "page": 177}`.

## 5. Remaining work, in order

Keep to the concurrency limit in section 0. Suggested order: finish Level 4 writing first (it unblocks
everything else), interleaving reviews of files that already exist.

### Step A. Write Level 4 Lessons 6-10 (Opus, one agent per lesson, at most 3 at a time)

Prompt (fill in n and the book number n+10):

> First read `/Users/Dion/scratch/ic-l3-l4/WRITER.md` in full and follow it exactly. Your lesson: Level 4,
> Lesson n (the book's Lesson n+10; in the file use `id: Ln`, `level: 4`, `lesson: n`). Facts file:
> `/Users/Dion/scratch/ic-l3-l4/facts/L4-0n.json`. Lesson file to create:
> `/Users/Dion/Documents/Apps/ic-companion/content/level-4/Ln.md`. Story note:
> `/Users/Dion/scratch/ic-l3-l4/story/L4-0n.md`. Read all existing story notes in
> `/Users/Dion/scratch/ic-l3-l4/story/` so your dialogues do not contradict or repeat earlier lessons.
> Level 4 is a notch harder than Level 3: turns can be longer and more discursive. Touch only your own files.

Per-lesson additions:
- **L6:** the vocabulary list happens to contain 马克 as a proper noun; in the app 马克 is our cast member. Fine.
- **L8:** historical statements in examples and dialogues must be factually correct.
- **L9:** per `STORY.md`, the interview's result stays open at the end of this lesson.
- **L10:** last lesson of the series: 马克 gets the job in Beijing; end warmly with the future open.
  Write L9 before L10 (L10 needs L9's story note).

Before step A, get the two missing story notes (L4-02, L4-03) so later writers can read them: one Sonnet
agent each, "read the two dialogues of this lesson file and write the story note as WRITER.md describes;
edit nothing else".

### Step B. Review and fix (Opus reviewer, then Sonnet fixer)

For L4-01, L4-02, L4-03, L4-05 and each of L4-06 … L4-10 as they are written. L4-04 already has its
review: go straight to the fixer.

Reviewer prompt:

> First read `/Users/Dion/scratch/ic-l3-l4/REVIEWER.md` in full and follow it exactly. Lesson to review:
> Level 4, Lesson n (the book's Lesson n+10), round 1. Lesson file: `…/content/level-4/Ln.md`. Facts file:
> `/Users/Dion/scratch/ic-l3-l4/facts/L4-0n.json`. Write your review to
> `/Users/Dion/scratch/ic-l3-l4/reviews/L4-0n.r1.md`. Do NOT flag the spelling of two-syllable directional
> complements with neutral tones and a space: project convention. Neutral tones that follow the book's
> vocabulary list are correct. [Paste the writer's own doubts from its final reply and ask for a clear
> ruling on each. Ask for a fact check where the lesson states facts: festivals, history, health,
> environment, finance.]

Writers' doubts already on record, to paste into the matching review prompt:
- **L4-01:** 以 examples use 成绩 and 为主 (possibly beyond the learner); `北京城里不让放鞭炮` is simplified
  (the ban is inside the Fifth Ring Road); two light jokes about 明年; 倒计时 written `dào jì shí`; check all
  festival facts.
- **L4-05:** E2 item 7 (`她的薪水已经超过了她丈夫的`: another order?); E1 item 6 (is 的 the only answer?);
  醒 and 明白 appear unglossed in two G2 examples; `二比一` as `èr bǐ yī`; fact-check the statements on women's
  status since 1950; 林月's grandmother (factory worker, later manager) must agree with the L4-01 and L4-04
  story notes.
- **L4-02, L4-03:** no writer report exists; ask the reviewer for a full review with no special points.

Fixer prompt:

> First read `/Users/Dion/scratch/ic-l3-l4/FIXER.md` in full and follow it exactly. Lesson: Level 4,
> Lesson n, round 1. Lesson file: `…/content/level-4/Ln.md`. Review file: `…/reviews/L4-0n.r1.md`. Log file:
> `…/reviews/L4-0n.fix1.md`. Story note: `…/story/L4-0n.md`. If a replacement text from the reviewer makes
> the validator report a new OOV word, prefer a wording with known words and record the deviation in
> your log. Never run git.

Overrule a reviewer only for the decisions in section 3 (for example a suggestion to replace 拉 là).

### Step C. Second-round check of changed lines (Opus, all 20 lessons, short)

One agent per lesson, but cheap: it reads the fix log and only the lines the fixer changed.

> You are the second-round checker for one lesson. Read `/Users/Dion/scratch/ic-l3-l4/REVIEWER.md` for the
> standards. Then read the round-1 review `…/reviews/L<lv>-<nn>.r1.md` and the fix log `…fix1.md`, and check
> in the lesson file ONLY the items the fixer changed, plus every item the log lists as a deviation from
> the reviewer's text: is each fix correct, natural Chinese with matching pinyin and English, and does
> each exercise still have exactly one answer? Run the validator. Write
> `…/reviews/L<lv>-<nn>.r2.md` in the REVIEWER.md format (verdict, must fix with exact replacements,
> uncertain). Do not edit the lesson file. [Add the lesson's known weak spots from section 4.]

If r2 has must-fix items, run one Sonnet fixer (`…fix2.md`). After that the lesson is closed: whatever is
still doubtful becomes an open flag in the report. No third round.

To save usage, two or three lessons may share one checker agent if their fix logs are short.

### Step D. Cross-lesson pass (2 Opus agents, one per level, plus 1 for vocabulary)

1. **Story and scenarios, Level 3** and 2. **the same for Level 4:** read all story notes and the dialogue
   sections of the 10 files. Report contradictions (who lives where, 陈乐's family, 林月's grandparents,
   money owed, the Yunnan trip, the job in Beijing), repeated scenarios, and cast used against `STORY.md`.
   Output `reviews/cross-L3.md`, `reviews/cross-L4.md` with exact replacement lines. Known facts to check:
   林月 has not moved off campus (L3-01, L3-02 leave it open); the winter trip is decided only in L3-10;
   安娜 joining the Yunnan trip is settled in L4-03; 陈乐's parents are 林月's 舅舅 and 舅妈 (L4-01);
   林月's grandmother's working life (L4-05) against L4-01 and L4-04.
3. **Cumulative vocabulary:** read all `logs/*.compound.json` and `*.oov.json`. From those lists pick the
   words a learner at that point has truly not met (for example 其实, 球迷) and separate them from harmless
   combinations (每天, 一件, 吃饭). Also check that no word is glossed twice with different meanings.
   Output `reviews/cross-vocab.md`: per lesson, the real out-of-vocabulary words with the line and a
   suggested replacement or gloss. Apply with Sonnet fixers; re-run the validator on every touched file.

### Step E. Report

Write `docs/L3_L4_CONTENT_REPORT.md` (format in section 8 of the original plan): one row per lesson
(validator pass, review rounds used, open flags), then the full list of open flags (file, line, issue,
suggested resolution), the words used outside the cumulative vocabulary, and the Level 4 notes. Sources:
the `Open` and `Not applied` sections of every fix log, the `Uncertain` and `Facts-file questions` sections
of every review, the cross-pass files, and the writers' "facts-file entry I think is wrong" remarks.
Flags already known that must appear:

- 拉 là for "leave behind" (L3-01 vocabulary, used in L3-01 and L3-06): the book's spelling; standard is 落.
- Book-list neutral tones kept as printed (list in section 3).
- Level 4 numbering: files L1-L10 are the book's Lessons 11-20.
- L4-09 vocabulary 5 人材 is tagged `v` in the book (looks like a book error for `n`): kept as printed
  unless the owner says otherwise; check what the L4-09 file shows.
- L4-02 vocabulary 11 is printed 想像 in the book's simplified column (standard: 想象): kept as printed.
- The facts files were transcribed from page images by Sonnet and lint-checked by machine; Level 3
  vocabulary was also compared with an Anki deck (it agreed; the deck's own typos aside). **Level 4
  vocabulary had no second source**, so its pinyin and meanings were checked only by the pinyin library
  and by the reviewers' reading.
- The cumulative-vocabulary check is partly manual (section 3).
- One fixer ran a read-only `git status` once by mistake; nothing was written.
- The usage limit interrupted the run three times; say which lessons were written or reviewed across an
  interruption (L4-01 to L4-05 writers, the L3 reviewers) so the owner knows where a seam may be.

### Step F. Optional last task (only if usage allows)

`docs/SPEAKING_CHECK.md`, the spec described at the end of section 6 of the original plan (no code).
Skip it without comment in the plan if usage is short, and say in the final message that it was skipped.

## 6. Validator notes

- `PASS` with `REVIEW` lines is normal: most are polyphones the library guesses wrongly (得 děi, 教 jiāo,
  只 zhǐ, 了 liǎo) and book-list neutral tones. A writer or reviewer must have looked at each.
- Known false alarms: `气了` / `气` (from 生…气), `干` / `衣` in L3-02 (from 干衣机), words with Latin letters
  (`T恤衫`, `卡拉OK`) are not machine-checked, "file path does not end with…" appears when the validator is
  run with a relative path.
- New proper names or obviously known words can be added to `tools/extra_allowed.txt` (one word per
  whitespace-separated token). Single characters in that file act as "glue" for the strict compound
  check, so add single characters sparingly.
- Do not loosen a check to make a file pass. If a check is wrong, fix the check and note it in the report.

## 7. Clean-up at the very end

- Delete the page images: `rm -rf ~/scratch/ic-l3-l4/pages ~/scratch/ic-l3-l4/pages4` (226 MB of textbook
  page images; they must not outlive the job). Keep the rest of the scratch folder: the owner or a later
  session may want the facts files, reviews and validator.
- Leave `docs/PLAN_L3_L4_LESSONS.md` and this file in place, uncommitted; mention both in the final
  message so the owner can decide whether Claude Code commits or deletes them.
- Run the status command from section 2 one last time; all 20 files must show `PASS`.

## 8. Final message to the owner

Plain language, as section 9 of the original plan asks: what was written; what was verified by machine
(structure, pinyin against characters, vocabulary tables against the facts files, exercise shape,
simplified characters) and by independent reviewers (naturalness, grammar notes, one-answer exercises);
what was **not** verified (nobody listened to anything; Level 4 vocabulary has no second source; the
vocabulary-level check is partly judgement); the open flags that matter most; and the next step: give
`docs/L3_L4_PARSER_NOTES.md` to Claude Code to adapt the parser, then commit and push. Claim nothing as
verified that was not.
