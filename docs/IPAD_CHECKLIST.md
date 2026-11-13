# iPad checklist

## Milestone 1-2 (app shell)

Before you start: push to GitHub, wait for the "Deploy to GitHub Pages" run to go green, then open
**https://tdailoan978.github.io/IC-Companion/** (capitals matter) in Safari on the iPad.

1. Home lists **Level 2** with ten lesson cards, L11 天气 Weather to L20 在机场 At the Airport, each with an empty progress ring.
2. The build stamp in the Home footer matches the time of your latest push.
3. Share → **Add to Home Screen**: the icon is a white 文 on red and the name is "IC Companion".
4. Open it from the Home Screen: no Safari address bar, and nothing hidden under the status bar or the home indicator.
5. Open L11: Overview shows the objectives and the book reference table (Part 1 text → p. 2 and so on).
6. Landscape: the steps are a sidebar on the left. Portrait: they are a bar across the top. The five steps after Overview say "Coming in milestone 3/4".
7. Split View at the smallest width: no sideways scrolling, and the step bar still works.
8. Theme: Auto follows the iPad's Light/Dark setting. Light and Dark override it, and the choice survives closing the app.
9. Close the app fully and reopen: **Continue** on Home takes you back to the last lesson step.
10. All buttons are easy to hit with a finger, and tapping doesn't flash grey or select text.

Known: tapping the status bar doesn't scroll to the top inside the app. There's no offline support yet (Milestone 6).

Results: passed (2026-11-11). The app loads at /IC-Companion/ after the relative-path fix.

## Stop A: lesson screens (milestones 3-4)

Push from GitHub Desktop, wait for the green Actions run, then open the app from the Home Screen. The build
stamp on Home should match your push; if it doesn't, close the app fully and reopen it.

Study L11 from top to bottom:

1. **Speech:** on Vocabulary, tap a word's speaker button. You hear a Chinese voice. If a yellow note says no
   Chinese voice is installed, follow its steps, reopen the app, and note that it happened.
2. **Vocabulary list:** Part 1 shows 14 words and Part 2 shows 15. Tapping a row reads it aloud.
3. **Flashcards:** tap to flip; swipe right for Got it and left for Again; a vertical drag still scrolls the
   page. Again sends the card to the back. Try Reverse (English first). Finishing Part 1 says so.
4. **Grammar:** six cards. The Pinyin and English buttons hide and show those lines. Tapping an example reads
   it aloud. "Watch out" notes stand out. Mark one point "Got it" and see "1 of 6 understood".
5. **Grammar patterns with several parts:** open L12 Grammar G1. The two patterns sit on separate lines with
   "and" between them.
6. **Dialogues:** chat bubbles, 马克 on one side and 林月 on the other. Tapping a line reads it aloud.
   "Finished reading" at the bottom marks the dialogue as read.
7. **Exercises:** do all four sets:
   - E1: pick a word, and the blank fills in.
   - E2: build the sentence by tapping words; tap a placed word to send it back.
   - E3: say the answer, reveal it, then mark yourself.
   - E4: match the words to their meanings.

   Each set shows a score at the end, and "Retry the wrong ones" works.
8. **Speaking:** four prompt cards with "Hear the question" and a reveal. "Finish" on the last card.
9. **Ticks:** the steps you finished show a filled tick in the step list. Overview needs "Mark step done".
   Any step can be ticked or unticked by hand. L11's ring on Home fills as steps are ticked.
10. **Saved:** close the app fully (swipe it away) and reopen it. The ticks, the exercise scores and
    "Continue" are all still there.
11. **Portrait, landscape and Split View:** in portrait the steps run across the top; in landscape they're a sidebar;
    nothing scrolls sideways in narrow Split View.
12. **Dark mode:** set Dark and glance at Vocabulary, Grammar, a dialogue and an exercise. Everything is
    readable.

Results: passed (2026-11-11). Everything worked; dark mode was then restyled as Lacquer.

## Stop B: review, settings and study plan (milestone 5 + PLAN 9.1)

Push from GitHub Desktop, wait for the green Actions run, then open the app from the Home Screen and check the
build stamp.

**Back up first:** Settings (gear, top right) → Backup → Export. Save the file to Files. This also tests check 9.

1. **Set up the plan:** Home shows "Set up your study plan". Pick your days and time (Mon–Fri, 30 min),
   then tap Start. Today lists Review first, then book reading with page numbers, then app tasks, within the
   time you chose.
2. **Book ticks:** tick a "Read … p. x–y" task. It asks how long it took (5/10/15/20+). Untick and tick
   again to check it works both ways.
3. **App tasks tick themselves:** tap a "New words" task, finish those words in the flashcards, come back. The task is
   ticked. Do the same with one grammar point.
4. **Home:** the Today card shows "n of m done · ~x min left" and the next task. Level 2 shows "n of 10 lessons
   complete".
5. **The week:** the plan page shows Mon–Sun for this week with today highlighted, plus the projected finish date.
6. **Review queue:** finish all of L11 Part 1 flashcards today. Tomorrow, Home shows "Review due: 14" (or
   fewer if you set a smaller cap). Do the review:
   - tap to flip; the back shows pinyin, English, a speaker button and "Lesson 11 · 天气";
   - swipe or tap Again / Got it;
   - cards you missed come back once at the end.
7. **Places are kept:** in flashcards, answer a few cards, close the app fully, reopen. The deck continues
   where you were (e.g. "11 left"). Same for the Speaking cards.
8. **Settings:**
   - Chinese size Large/Extra large changes the Chinese in lessons.
   - Pinyin off makes Grammar and Dialogues start with pinyin hidden.
   - Speech Slow is slower.
   - The voice list shows your Chinese voices, and Test speaks with the chosen one.
   - Changing the theme in Settings also changes the header switch.
9. **Backup:**
   - Export saves a `.json` file (Share → Save to Files).
   - "Keep my data" says whether iPadOS granted it.
   - Import that same file: it shows what's in it, asks to confirm, then reloads with everything as it was.
10. **Reset:** only if you're happy to start over, and only after exporting. It asks twice, then clears everything.
11. **Rest day:** on a Saturday or Sunday, Home and the plan say it's a rest day and name the next study day.

Results: passed (2026-11-13). The owner did all the checks and has used the app for a few days with no problems.

## Stop C: notes, deep links, Notebook and My words (PLAN 9.4)

Push from GitHub Desktop, wait for the green Actions run, open the app from the Home Screen and check the build
stamp. Export a backup first (gear → Backup).

Put the app and your textbook PDF (Books or Files) side by side in Split View, half and half.

1. **Plan items open exactly their item:** from Today, tap each kind of task. Check each one, and that a
   "‹ Today" bar appears at the top:
   - a "Read …" task opens its reading page;
   - a "New words …" task starts flashcards for just those words;
   - a grammar task scrolls to that card;
   - a dialogue task opens that dialogue;
   - an exercise task starts that set.
2. **Next:** finish one of them (e.g. the word slice). The bar now offers "Next: …". Nothing moves by itself.
3. **Reading page:**
   - The timer counts while you read.
   - Switch to Books full screen for a minute and come back: that minute isn't counted.
   - "Done reading" lets you adjust the minutes before saving, and the task is ticked on Today.
4. **Pencil (most important):**
   - In Write, ink follows the pen with no lag, even after a lot of writing, and gets thicker as you press harder.
   - Resting your palm leaves no marks, and nothing gets selected or highlighted.
   - One finger scrolls; the Pencil never scrolls.
   - The eraser, undo and clear work, and the page grows as you reach the bottom.
5. **Typed notes:** in Type, Scribble with the Pencil turns handwriting into text (Chinese too, if you've added a Chinese keyboard).
6. **Full width:** one tap makes the writing area fill the screen, and one tap brings it back.
7. **Notes stay:** write a note, close the app fully at once, reopen it. Ink and text are still there.
8. **Note buttons:** grammar cards, dialogues, each word (list and flashcard back) and each exercise set
   have a note button. Ones with a note show a dot.
9. **Notebook (book icon in the header, or Home):**
   - notes are grouped by lesson with a small ink picture;
   - tapping one expands it;
   - "Search typed notes" finds words in your typed text.
10. **Print / Save as PDF:** in the Notebook, try "Print this lesson" from the **Home Screen app**:
    - does the print sheet open?
    - Pinch out on the preview → Share → Save to Files. Does the PDF show ink and text in light colours?

    If printing doesn't work from the Home Screen app, note it. A PDF library is the fallback and needs your OK.
11. **My words:**
    - In a note, "Add to my words": type 雪人, and the pinyin fills itself in (you can change it). Add a meaning and save.
    - It's in the Notebook → My words list, where you can edit or delete it.
    - Tomorrow it shows up in Review as "My word" with a link to its note.

Results:
