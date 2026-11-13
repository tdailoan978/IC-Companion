// What a note is about, for the Notebook and its print view: the item's label,
// its book pages, where it sits in the study plan, and the screen it came from.
// Pure, so the grouping and order are tested.

import { allLessons, findLesson } from '../../lib/content/lessons.ts';
import { lessonKey, type Lesson } from '../../lib/content/types.ts';
import { withDeepLink } from '../../lib/deeplink.ts';
import type { Note, NoteRef } from '../../lib/notes.ts';
import { bookSections, lessonTasks, pageLabel, type PlanTask } from '../../lib/plan/tasks.ts';
import { lessonPath } from '../lesson/steps.ts';

/** An item's label. `text` may hold Chinese (render it with MixedText); vocab notes have `zh` and `pinyin`. */
export type ItemLabel = { text: string; zh?: string; pinyin?: string; pages?: string };

export function itemLabel(ref: NoteRef, lesson: Lesson | undefined): ItemLabel {
  if (!lesson) return { text: ref.ref };
  switch (ref.kind) {
    case 'book': {
      const s = bookSections(lesson).find((x) => x.section === ref.ref);
      return s ? { text: s.section, pages: pageLabel(s.from, s.to) } : { text: ref.ref };
    }
    case 'grammar': {
      const i = lesson.grammar.findIndex((g) => g.id === ref.ref);
      return i < 0 ? { text: ref.ref } : { text: `G${i + 1} · ${lesson.grammar[i].title}` };
    }
    case 'dialogue': {
      const i = lesson.dialogues.findIndex((d) => d.id === ref.ref);
      return i < 0 ? { text: ref.ref } : { text: `Dialogue ${i + 1} · ${lesson.dialogues[i].title}` };
    }
    case 'vocab': {
      const v = lesson.vocab.find((x) => x.id === ref.ref);
      return v ? { text: v.en, zh: v.zh, pinyin: v.pinyin } : { text: ref.ref };
    }
    case 'exercise': {
      const i = lesson.exercises.findIndex((e) => e.id === ref.ref);
      return i < 0 ? { text: ref.ref } : { text: `E${i + 1} · ${lesson.exercises[i].title}` };
    }
  }
}

/** The label as one line of text, e.g. "Part 1 text · p. 2–3" or "天气 tiānqì · weather". */
export function labelText(l: ItemLabel): string {
  const head = l.zh ? `${l.zh} ${l.pinyin ?? ''}`.trim() : '';
  return [head, l.text, l.pages].filter(Boolean).join(' · ');
}

/** "Lesson 11" (or the lesson id when the content no longer has it). */
export const lessonName = (lesson: Lesson | undefined, ref: Pick<NoteRef, 'lessonId'>) => (lesson ? `Lesson ${lesson.lesson}` : ref.lessonId);

function taskMatches(t: PlanTask, ref: NoteRef): boolean {
  switch (ref.kind) {
    case 'book':
      return t.kind === 'book' && t.section === ref.ref;
    case 'vocab':
      return t.kind === 'words' && Boolean(t.wordIds?.includes(ref.ref));
    default:
      return t.kind === ref.kind && t.ref === ref.ref;
  }
}

/** Sort position inside the lesson: the plan's task order; words by their number inside their slice. */
export function planOrder(ref: NoteRef, lesson: Lesson, tasks: PlanTask[] = lessonTasks(lesson)): number {
  const i = tasks.findIndex((t) => taskMatches(t, ref));
  const base = i < 0 ? tasks.length : i;
  const sub = ref.kind === 'vocab' ? (lesson.vocab.find((v) => v.id === ref.ref)?.n ?? 0) : 0;
  return base * 1000 + sub;
}

/** The screen the note's item lives on ("Go to item"). */
export function itemPath(ref: NoteRef): string {
  const { level, lessonId: id } = ref;
  switch (ref.kind) {
    case 'book':
      return lessonPath(level, id, 'overview');
    case 'grammar':
      return withDeepLink(lessonPath(level, id, 'grammar'), { item: ref.ref });
    case 'dialogue':
      return withDeepLink(lessonPath(level, id, 'dialogues'), { item: ref.ref });
    case 'exercise':
      return withDeepLink(lessonPath(level, id, 'exercises'), { item: ref.ref });
    case 'vocab':
      // The word's id, as the note page links it (plan links name word slices: "p1.s2").
      return withDeepLink(lessonPath(level, id, 'vocab'), { item: ref.ref });
  }
}

/** The start of the typed text on one line, at most `max` characters. */
export function snippet(text: string, max = 120): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  const chars = Array.from(flat);
  return chars.length <= max ? flat : `${chars.slice(0, max).join('').trimEnd()}…`;
}

/** Search covers typed text only; case-insensitive. */
export function matchesSearch(note: Pick<Note, 'text'>, query: string): boolean {
  const q = query.trim().toLocaleLowerCase();
  return q === '' || note.text.toLocaleLowerCase().includes(q);
}

export type LessonGroup = { key: string; lesson: Lesson | undefined; notes: Note[] };

/** Notes by lesson (lesson order), then in plan order inside each lesson. */
export function groupNotes(notes: Note[]): LessonGroup[] {
  const groups = new Map<string, LessonGroup>();
  for (const n of notes) {
    const key = `${n.level}/${n.lessonId}`;
    let g = groups.get(key);
    if (!g) {
      g = { key, lesson: findLesson(n.level, n.lessonId), notes: [] };
      groups.set(key, g);
    }
    g.notes.push(n);
  }
  const lessonIndex = new Map(allLessons.map((l, i) => [lessonKey(l), i]));
  const out = [...groups.values()].sort(
    (a, b) => (lessonIndex.get(a.key) ?? Infinity) - (lessonIndex.get(b.key) ?? Infinity) || a.key.localeCompare(b.key),
  );
  for (const g of out) {
    const tasks = g.lesson ? lessonTasks(g.lesson) : [];
    const order = new Map(g.notes.map((n) => [n, g.lesson ? planOrder(n, g.lesson, tasks) : 0]));
    g.notes.sort((a, b) => order.get(a)! - order.get(b)! || a.created.localeCompare(b.created));
  }
  return out;
}

/** "13 Nov 2026". */
export const shortDate = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};
