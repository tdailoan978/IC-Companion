// What a note is about, in words: the note page's header and links back to the item.

import type { Lesson } from '../../lib/content/types.ts';
import { withDeepLink } from '../../lib/deeplink.ts';
import type { NoteKind, NoteRef } from '../../lib/notes.ts';
import { bookSections, pageLabel } from '../../lib/plan/tasks.ts';
import { lessonPath } from '../lesson/steps.ts';

export type ItemLabel = {
  /** "Part 1 text · p. 2–3", "G3 · The modal verb 会 (will) (II)", a dialogue title, a word, "E2 · Put the words in order". */
  text: string;
  /** Vocab: the word's pinyin (text is then all Chinese). */
  pinyin?: string;
  /** The text is Chinese only (vocab). */
  zh?: true;
  /** False when the item is not in the lesson (any more); the note still opens. */
  found: boolean;
};

export const KIND_NAMES: Record<NoteKind, string> = {
  book: 'Reading',
  grammar: 'Grammar',
  dialogue: 'Dialogue',
  vocab: 'Word',
  exercise: 'Exercises',
};

export const NOTE_KINDS = Object.keys(KIND_NAMES) as NoteKind[];
export const isNoteKind = (k: string | undefined): k is NoteKind => NOTE_KINDS.includes(k as NoteKind);

export function noteItemLabel(lesson: Lesson, kind: NoteKind, ref: string): ItemLabel {
  const missing: ItemLabel = { text: ref, found: false };
  switch (kind) {
    case 'book': {
      const s = bookSections(lesson).find((x) => x.section === ref);
      return s ? { text: `${s.section} · ${pageLabel(s.from, s.to)}`, found: true } : missing;
    }
    case 'grammar': {
      const i = lesson.grammar.findIndex((g) => g.id === ref);
      return i < 0 ? missing : { text: `G${i + 1} · ${lesson.grammar[i].title}`, found: true };
    }
    case 'dialogue': {
      const d = lesson.dialogues.find((x) => x.id === ref);
      return d ? { text: d.title, found: true } : missing;
    }
    case 'vocab': {
      const v = lesson.vocab.find((x) => x.id === ref);
      return v ? { text: v.zh, pinyin: v.pinyin, zh: true, found: true } : missing;
    }
    case 'exercise': {
      const i = lesson.exercises.findIndex((e) => e.id === ref);
      return i < 0 ? missing : { text: `E${i + 1} · ${lesson.exercises[i].title}`, found: true };
    }
  }
}

const ITEM_STEP = { grammar: 'grammar', dialogue: 'dialogues', vocab: 'vocab', exercise: 'exercises' } as const;
const ITEM_LINK_TEXT = { grammar: 'Open grammar point', dialogue: 'Open dialogue', vocab: 'Open word', exercise: 'Open exercise set' } as const;

/** A link to the item itself (e.g. the grammar step at L11.g.3); book notes have none (the book is outside the app). */
export function noteItemLink(r: NoteRef): { to: string; text: string } | null {
  if (r.kind === 'book') return null;
  return { to: withDeepLink(lessonPath(r.level, r.lessonId, ITEM_STEP[r.kind]), { item: r.ref }), text: ITEM_LINK_TEXT[r.kind] };
}

/** The plan task id of a book note: `2/L11:book:Part 1 text`. */
export const bookTaskId = (r: Pick<NoteRef, 'level' | 'lessonId' | 'ref'>) => `${r.level}/${r.lessonId}:book:${r.ref}`;

/** Route params can arrive encoded or not; a stray "%" must not break the page. */
export function decodeRef(raw: string | undefined): string {
  if (!raw) return '';
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

/** 75 s → "01:15"; an hour or more keeps counting minutes ("75:00"). */
export function mmss(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

/** Active time to whole minutes for the Done confirm (at least 1). */
export const roundMinutes = (ms: number) => Math.max(1, Math.round(ms / 60_000));
