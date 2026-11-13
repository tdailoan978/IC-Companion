# Next feature: plan deep links, reading notes and a notebook

Agreed with the owner on 2026-11-13 in a side chat (grilled one question at a time). Builds on Stop B
(commit bcbfb37). Fold this into PLAN.md as section 9.4 when building, and stop afterwards for an iPad check
like the other stops. The owner keeps the textbook PDFs outside the app (Books/Files in Split View). No
textbook pages or text ever go in the repo, which is public.

## 1. Deep links from the study plan

Today, `taskPath` in `src/features/plan/TodayList.tsx:11` sends app tasks to the top of their step and book
tasks to `/plan`.

- Each plan task opens exactly its item:
  - **Word slice** ("New words 1–7"): a flashcard run of only those words. It ticks when every word in it
    has a "Got it" (`progress.vocabGot`). The slice run must not disturb the saved whole-part deck (`savedDeck.ts`).
  - **Grammar point:** Grammar scrolled to that card, with focus on its heading.
  - **Dialogue:** that dialogue selected.
  - **Exercise set:** that set started.
  - **Speaking:** the first unfinished card.
  - **Book task:** its note page (section 2).
- **Return bar:** shown only when the screen was opened from the plan (for example a `from=plan` query or
  router state). It shows "Back to Today"; once the item is done, it also shows "Next: <next task>". Nothing
  navigates by itself.
- Links must survive a reload: hash routes with the item in the path or query, for example
  `#/lesson/2/L11/grammar?item=L11.g.3&from=plan`.

## 2. Reading note page (replaces the minutes buttons)

- Tapping a "Read …" task opens its note page. The page shows the section and pages ("Part 1 text,
  p. 2–3"), a running timer that counts only while the app is visible (`useActiveTimer`), and the note
  (section 3).
- **Done reading:** ticks the book task (`plan.book`) and logs the real active time:
  `logActivity(lesson, 'book', taskId, ms, pages)`. Before saving, the time can be adjusted with a simple
  stepper, in case the owner got distracted. The 5/10/15/20+ `MINUTE_CHOICES` go away. Unticking stays
  possible.
- Reopening a done reading task shows its note. Reading it again doesn't log time a second time unless the
  owner presses Done again; that entry is then a `repeat` in the activity log.
- **Layout:** built for half-and-half Split View next to Books/Files (about 410 px wide in portrait, 590 px
  in landscape). A "Full width" writing mode is one tap away. It must also work at 320 px and 1366 px wide.

## 3. Notes everywhere, one Notebook

- A note button on:
  - every reading task;
  - every grammar card;
  - each dialogue;
  - each vocabulary word, in both list and flashcard back;
  - each exercise set.

  One note per item. Each note is filed under its lesson and item: book section, grammar id, dialogue id,
  vocab id or exercise set id.
- Each note has two parts:
  - **Ink area for Apple Pencil**, stored as **vector strokes** (points with pressure and time), never as
    images, so backups stay small. Use Pointer Events and draw only for `pointerType === 'pen'`, with palm
    rejection: touches are ignored while the pen is down, and finger drags scroll. Include undo, an eraser,
    clear (with a confirm), and two or three pen widths. The ink area grows with the content (or pages down).
  - **Typed text** (Scribble works here, including Chinese if the owner adds a Chinese keyboard).
- Save on every change, debounced: about 500 ms after typing stops, or at the end of each pen stroke.
  Closing the app must never lose a note. Use the same storage rules as progress: `readStrict`, never write
  over a record that couldn't be read, and show the save-failed notice on failure.
- **Notebook screen** (`#/notebook`, linked from Home and the header):
  - All notes grouped by lesson, then in plan order.
  - Each note shows its item label, its book pages where they apply, the last-edited date, a small ink
    thumbnail and the start of its text.
  - Tapping a note opens it in place; a link goes to the item itself.
  - Search covers typed text only. Say so in the search box placeholder ("Search typed notes").
- **Export as PDF:** the whole notebook or one lesson, with ink drawn as written, the typed text, and each
  note's lesson, item and pages. First try a print stylesheet with `window.print()`; on iPad that gives
  Print → Save to Files as PDF. **Risk to test on the iPad:** printing from a Home Screen (standalone) app.
  If it doesn't work there, the fallback is a small PDF library, which is a new dependency and needs the
  owner's OK first.
- Notes are part of the existing Export/Import backup automatically (same IndexedDB store). Extend
  `valueProblem` in `src/lib/backup.ts` to check the shape of the new note and custom-card records.

## 4. "Add to my words" (own review cards)

- From any note, the owner can add a word to review with Chinese, pinyin and meaning. The card joins the
  normal review queue (`review.cards`), marked "My word", with a link back to the note and page it came from.
- **Pinyin** is filled in automatically from the characters and can be edited. The owner approved
  **pinyin-pro** in principle (about 300 KB). Load it with a dynamic `import()` only when adding a word, so it
  doesn't slow app start. Confirm the version and size before adding it.
- **Review changes:**
  - Own cards need their own id scheme (for example `my.<uuid>`, lesson = the note's lesson key) and
    their own word data stored with the card or in a `mywords` record.
  - `ReviewPage.tsx:21-22` currently looks words up through `findLesson`; it must handle own cards.
  - Own cards share the daily new-card limit, and count toward the plan's review time, by design.
- **Managing own words:** a "My words" list (in the Notebook, or in Review) to edit or delete them.

## 5. Checks and tests

- Unit tests:
  - deep-link parsing;
  - slice completion;
  - note store (debounce, failed-read safety);
  - ink stroke serialisation;
  - own-card review flow;
  - backup validation of the new records.
- Browser checks:
  - each plan item opens exactly its item, and the return bar appears;
  - the reading timer pauses in the background;
  - notes survive a reload;
  - pen drawing with mouse/pen emulation;
  - the Notebook and its search;
  - the PDF print view in both themes (print should use light colours);
  - 320 px, half-width and full-width layouts.
- iPad checklist items (for the owner):
  - Pencil ink and palm rejection;
  - Scribble in typed notes;
  - Print → Save as PDF from the Home Screen app;
  - reading time logged after Done reading;
  - an own word showing up in review the next day.
