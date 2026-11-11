# Build plan: Integrated Chinese companion app (iPad web app)

Hand this file to Claude Code together with the `content/` folder and `CONTENT_FORMAT.md`.

## 1. What we are building

A personal, single-user study app for iPad that turns the lesson files in `content/` into structured,
interactive lessons. The lessons follow the lesson order of *Integrated Chinese* (4th ed.), starting with
Volume 2 (Lessons 11-20). I own the textbooks and use the app alongside them; every lesson shows the book
page numbers for the matching sections.

- **Platform:** a web app (PWA) hosted free on GitHub Pages, added to the iPad Home Screen from Safari.
- **Works offline** after the first load.
- **Single user, no accounts, no backend, no analytics.** All progress stays on the device.
- **Simplified characters.** Light and dark mode following the system setting, with a manual override.

### Content rules (important)
- The repo contains only the original lesson files in `content/`. **Never add the textbook PDFs, scans,
  Anki decks, or any text copied from the textbook to the repo.** Add `*.pdf` and `*.apkg` to `.gitignore`.
- Do not rewrite or "improve" the lesson content while building. If a lesson file fails to parse, report the
  line and fix the parser or ask me, do not silently change the lesson.

## 2. Tech stack

| Concern | Choice | Why |
|---|---|---|
| Build | Vite + React + TypeScript | Small, fast, easy static deploy |
| Styling | Plain CSS with CSS variables (or CSS modules) | No heavy UI kit; easy light/dark theming |
| Routing | React Router with **hash routing** | GitHub Pages has no server-side rewrites |
| Content | Markdown in `content/` → JSON at build time | Lessons stay human-editable |
| Storage | IndexedDB via `idb-keyval` | Survives restarts; bigger and safer than localStorage |
| Offline | `vite-plugin-pwa` (Workbox), precache app shell + lesson JSON | Home Screen app works with no network |
| Audio | Web Speech API (`speechSynthesis`, `zh-CN` voice) | No audio files to host |
| Tests | Vitest for the parser and the review scheduler | The two places bugs would hurt most |
| Deploy | GitHub Actions → GitHub Pages | Push to `main` publishes |

Set Vite `base` to `/<repo-name>/`. Keep dependencies minimal and avoid anything that needs a server.

## 3. Repository layout

```
/
├─ PLAN.md                    this file
├─ CONTENT_FORMAT.md          the lesson file contract (read before writing the parser)
├─ content/
│  └─ level-2/L11.md … L20.md lesson files (source of truth)
├─ tools/                     Python checker used when the lessons were written (reference only)
├─ scripts/build-content.ts   parses content/**/*.md → src/generated/lessons.json (runs before dev/build)
├─ src/
│  ├─ generated/              build output, git-ignored
│  ├─ lib/                    parser types, storage, review scheduler, speech
│  ├─ features/               lesson/, vocab/, grammar/, dialogue/, exercises/, review/, settings/
│  └─ app/                    shell, routes, theme
├─ public/                    icons, manifest
└─ .github/workflows/deploy.yml
```

## 4. Content pipeline

1. `scripts/build-content.ts` walks `content/level-*/L*.md`, parses each file according to
   `CONTENT_FORMAT.md`, and writes one typed JSON bundle.
2. The script **fails the build with file name and line number** if a file breaks the contract
   (missing section, wrong column count, exercise line without `→`, and so on).
3. Every item gets a stable id so saved progress survives content edits:
   `L11.v.12` (vocab item 12), `L11.g.3` (grammar point 3), `L11.d1.4` (dialogue 1, turn 4),
   `L11.e2.5` (exercise set 2, item 5).
4. Adding Level 3 or 4 later must need no code change: drop `content/level-3/L1.md …` in and rebuild.
   Lesson ids are unique per level, so key everything by `level` + `id`.

Data model (TypeScript):

```ts
type Lesson = {
  level: number; id: string; lesson: number; titleEn: string; titleZh: string;
  book: string; bookPages: string;
  objectives: string[];
  bookRefs: { section: string; page: number }[];
  vocab: { id: string; part: 1 | 2; n: number; zh: string; pinyin: string; pos: string; en: string }[];
  grammar: { id: string; title: string; pattern: string; explanationMd: string;
             examples: Sentence[]; watchOut?: string }[];
  dialogues: { id: string; title: string; setting: string;
               turns: (Sentence & { speaker: string })[] }[];
  exercises: ExerciseSet[];
  speaking: Sentence[];
};
type Sentence = { zh: string; pinyin: string; en: string };
type ExerciseSet =
  | { type: 'choice';    title: string; items: { id: string; prompt: string; options: string[]; answer: string }[] }
  | { type: 'order';     title: string; items: { id: string; chunks: string[]; answer: string }[] }
  | { type: 'translate'; title: string; items: { id: string; en: string; answer: string }[] }
  | { type: 'match';     title: string; items: { id: string; zh: string; en: string }[] };
```

## 5. Screens and behaviour

### 5.1 Home (lesson list)
- Levels as sections; each lesson is a card: number, Chinese title, English title, progress ring.
- A "Review due: N" button at the top when vocabulary reviews are due.
- "Continue" jumps to the last place I was.

### 5.2 Lesson view
iPad layout: a left sidebar with the lesson's steps, content on the right. In portrait or narrow widths the
sidebar collapses to a top step bar. Steps, in order, each with a done tick:

1. **Overview** - objectives, and the book reference table ("Part 1 text → p. 2").
2. **Vocabulary** (Part 1, Part 2)
   - List mode: Chinese, pinyin, POS, English; tap a row to hear it.
   - Flashcard mode: Chinese on the front; tap to flip for pinyin + English; swipe or buttons
     "Again / Got it". Option to reverse direction (English → Chinese).
   - Finishing a part adds its words to the review queue.
3. **Grammar** - one card per grammar point: title, pattern in a highlighted box, explanation, example
   sentences (tap to hear; pinyin and English individually hideable), the "Watch out" note styled as a callout.
4. **Dialogues**
   - Read mode: chat-style bubbles per speaker; global toggles for pinyin and English; tap a line to hear it.
   - Listen mode: plays the whole dialogue line by line with the current line highlighted.
   - Shadow mode: plays a line, pauses for the same length so I can repeat it aloud, then moves on.
   - Tap any word that is in the vocabulary list to see its pinyin and meaning in a popover (longest-match
     lookup against all vocab up to this lesson).
5. **Exercises** - the four sets, one item at a time, immediate feedback, score at the end, retry wrong items.
   - `choice`: sentence with a blank and three buttons.
   - `order`: tap chunks to build the sentence (tap again to remove); compare ignoring punctuation.
   - `translate`: show the English, I answer aloud or on paper, reveal the model answer, then self-mark
     "Got it / Not yet" (more than one translation can be right, so do not auto-grade).
   - `match`: two columns, tap a Chinese word then its English meaning.
6. **Speaking** - the four prompts, one per card, with a "hear the question" button and a reveal for
   pinyin/English. No recording needed.

A lesson is complete when every step is ticked. Nothing is locked: I can open any lesson or step at any time.

### 5.3 Review (spaced repetition for vocabulary)
- Leitner boxes 1-5 with intervals 1, 2, 4, 8, 16 days. "Got it" moves a card up a box, "Again" sends it
  back to box 1. Store `{ box, dueDate }` per vocab id.
- A review session shows due cards (cap 40 per session, configurable), oldest first.
- Card front is Chinese; back shows pinyin, English, a speak button, and the lesson it came from.

### 5.4 Settings
- Theme: system / light / dark. Chinese font size: normal / large / extra large.
- Show pinyin by default: on / off. Speech rate: slow (0.7) / normal (0.9). Voice picker (zh-CN voices).
- New review cards per day and session cap.
- **Export progress / Import progress** as a JSON file (my backup, since browser storage can be cleared).
- Reset progress (with a confirm step).

## 6. iPad-specific requirements
- Tested target: Safari on iPadOS, installed to the Home Screen (`display: standalone`).
- Manifest + `apple-touch-icon` + `apple-mobile-web-app-capable` meta tags; theme colour for both themes.
- Respect safe areas (`env(safe-area-inset-*)`); support landscape and portrait and Split View widths.
- Touch targets at least 44 pt; no hover-only interactions; no text selection flash on tap targets.
- Chinese text uses the system font stack (`"PingFang SC", "Noto Sans SC", system-ui, sans-serif`), base
  size at least 22 px for Chinese in lessons, pinyin shown above or below in a lighter weight.
- Speech: iOS only allows `speechSynthesis.speak()` after a user tap, and voices load late. Wait for
  `voiceschanged`, pick the best `zh-CN` voice, cancel any current utterance before speaking, and show a
  clear message if no Chinese voice is available rather than failing silently.
- Persist to IndexedDB on every answer so closing the app never loses progress.

## 7. Milestones (build in this order, stop after each for me to try it on the iPad)

1. **Content pipeline.** Parser + types + Vitest tests against all ten lesson files; build fails loudly on
   bad content. *Done when:* `npm run build:content` produces JSON for L11-L20 with the right counts
   (vocab rows, grammar points, 2 dialogues, 4 exercise sets, 4 speaking prompts per lesson).
2. **App shell and deploy.** Vite + React app, hash routing, theme, Home list, lesson Overview, GitHub
   Actions deploy, PWA manifest and icons. *Done when:* the Pages URL opens on the iPad, installs to the
   Home Screen, and lists ten lessons.
3. **Vocabulary, Grammar, Dialogues (read mode) with speech.** *Done when:* I can work through L11's
   words, grammar cards and both dialogues, hearing any line.
4. **Exercises and lesson progress.** *Done when:* all four exercise types work for every lesson and
   progress ticks survive a restart.
5. **Review system and Settings (including export/import).** *Done when:* finished vocabulary shows up
   for review on the right days (unit-tested with a fake clock) and a backup round-trips.
6. **Offline and polish.** Service worker precache, listen and shadow modes, tap-a-word popovers,
   accessibility pass (VoiceOver labels, contrast in both themes), empty and error states.
   *Done when:* the app works in airplane mode after one online load.

Later ideas, not part of this build: stroke-order and handwriting practice (the `hanzi-writer` library
works well with Apple Pencil), sentence-level review cards, Levels 3 and 4 content.

## 8. Working agreement for Claude Code
- Read `CONTENT_FORMAT.md` and two lesson files before writing the parser.
- Keep commits small and scoped to one milestone step; run tests and the content build before each commit.
- Ask me before adding any dependency beyond those in section 2.
- When a milestone is finished, tell me exactly what to check on the iPad.

## 9. Additions agreed on 2026-11-11

Milestones 1-2 are done and live at https://tdailoan978.github.io/IC-Companion/ (Vite `base` is `./`, so the
repo name and its capitals do not matter). The decisions below extend sections 5 and 7.

### 9.1 Study plan (daily and weekly checklists, milestones)

- **Week shape (set on the Study plan page; Settings links to it):** which days I study (default 5 days, Mon-Fri) and a daily cap
  (default 30 min). The plan never schedules more than the cap on a day.
- **No deadline up front.** The plan starts from a start date and schedules lesson after lesson.
  After 10 study days of real timings, the app proposes a finish date for Volume 2. I accept or reject it,
  and can set or change a date myself at any time.
- **Daily checklist ("Today"),** in this order:
  1. Review: clear the due vocabulary cards (ticks itself when none are due).
  2. Book reading: e.g. "Read Part 1 text, p. 2-3", using the lesson's book references.
     I tick it myself; ticking asks how long it took (quick buttons: 5 / 10 / 15 / 20+ min).
  3. New words: a slice of the current part's vocabulary (ticks itself when the flashcards are done).
  4. Grammar point, dialogue, or exercise set (ticks itself when finished in the lesson screens).
  5. Speaking prompts said aloud (ticks itself after the last prompt card).
- **Order inside a lesson:** Part 1 reading → Part 1 words → first half of the grammar → Dialogue 1 →
  Part 2 reading → Part 2 words → remaining grammar → Dialogue 2 → Exercises E1-E4 → Speaking.
- **Time estimates:** start from defaults (book 3 min/page, new word 2 min, grammar point 10 min,
  dialogue 15 min, exercise set 8 min, speaking 5 min, review 20 s/card) and replace each with the median
  of my own measured times once there are 3 or more measurements. The app times the tasks it hosts.
- **Missed days:** unfinished tasks roll forward and the rest of the plan is re-spread under the cap.
  If a deadline is set and can no longer be met under the cap, show a plain warning with a suggested new
  date that I can accept or dismiss. Never raise the daily load above the cap.
- **Weekly view:** this week's days with planned vs. done tasks and minutes; next week's preview.
- **Milestones:** a lesson is complete when every step is ticked (as in 5.2). Lesson and volume milestones
  show on Home and in the weekly view. Nothing is locked: I can still open any lesson or step.
- Plan state is in IndexedDB and is part of Export/Import (5.4).

### 9.2 Companion features (after milestone 6)

1. **Progress calendar:** month view of study days, minutes and lessons finished.
2. **Speaking check:** say a dialogue line or speaking prompt; Safari speech recognition (`zh-CN`) shows
   what it heard next to the target. If recognition is unavailable, say so and hide the button.
3. **Listening drills:** hear a dialogue sentence without text, then pick or type it; sentence-level review
   cards from the dialogues.
4. **Handwriting with Apple Pencil:** stroke-order animation and tracing quizzes for each lesson's new
   characters (`hanzi-writer` with its stroke data bundled for offline use: ask me before adding it).

### 9.3 Revised build order and iPad stops

- **Stop A:** milestones 3 and 4 (Vocabulary, Grammar, Dialogues read mode with speech, Exercises,
  lesson progress ticks). Check on the iPad by studying L11.
- **Stop B:** milestone 5 (Review, Settings, export/import) together with the study plan (9.1).
- **Then:** milestone 6 (offline and polish), then the features in 9.2 in that order.
- Known item for milestone 3: a few Pattern lines hold several backtick groups joined by prose
  ("`A` compared with `B`"); render the backticked parts as the highlighted pattern and the joining words
  as plain text rather than one merged string.
