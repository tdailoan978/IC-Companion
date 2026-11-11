// Saved place in a part's flashcards (PLAN.md 6: closing the app never loses
// progress). Saved on every answer, restored when the part's flashcards open,
// cleared when the part is finished or "Go again" starts a new run.

import type { Lesson, VocabItem } from '../../lib/content/types.ts';
import { lessonKey } from '../../lib/content/types.ts';
import { read, write } from '../../lib/storage.ts';
import type { Deck } from './deck.ts';

export type SavedDeck = {
  /** Ids still to learn, in order (the first is on screen). */
  queue: string[];
  learned: string[];
  agains: number;
  /** Active time spent on this run so far. */
  ms: number;
};

export const savedDeckKey = (lesson: Pick<Lesson, 'level' | 'id'>, part: 1 | 2) => `deck.${lessonKey(lesson)}.p${part}`;

export const toSavedDeck = (deck: Deck<VocabItem>, ms: number): SavedDeck => ({
  queue: deck.queue.map((w) => w.id),
  learned: deck.learned.map((w) => w.id),
  agains: deck.agains,
  ms: Math.max(0, Math.round(ms)),
});

const isStringArray = (v: unknown): v is string[] => Array.isArray(v) && v.every((x) => typeof x === 'string');

/**
 * Rebuilds a deck from what was saved, against the part's current words: unknown ids are dropped and
 * words the save does not mention go to the back of the queue. Null when there is nothing to resume.
 */
export function fromSavedDeck(saved: unknown, words: readonly VocabItem[]): { deck: Deck<VocabItem>; ms: number } | null {
  if (!saved || typeof saved !== 'object') return null;
  const s = saved as Partial<SavedDeck>;
  if (!isStringArray(s.queue) || !isStringArray(s.learned)) return null;
  const byId = new Map(words.map((w) => [w.id, w]));
  const seen = new Set<string>();
  const pick = (ids: string[]) =>
    ids.flatMap((id) => {
      const w = byId.get(id);
      if (!w || seen.has(id)) return [];
      seen.add(id);
      return [w];
    });
  const queue = pick(s.queue);
  const learned = pick(s.learned);
  queue.push(...words.filter((w) => !seen.has(w.id)));
  if (queue.length === 0) return null;
  const agains = typeof s.agains === 'number' && s.agains >= 0 ? Math.floor(s.agains) : 0;
  const ms = typeof s.ms === 'number' && s.ms >= 0 ? s.ms : 0;
  return { deck: { queue, learned, agains }, ms };
}

export const loadSavedDeck = (lesson: Pick<Lesson, 'level' | 'id'>, part: 1 | 2) => read<unknown>(savedDeckKey(lesson, part), null);
export const saveDeck = (lesson: Pick<Lesson, 'level' | 'id'>, part: 1 | 2, saved: SavedDeck) => write(savedDeckKey(lesson, part), saved);
export const clearSavedDeck = (lesson: Pick<Lesson, 'level' | 'id'>, part: 1 | 2) => write(savedDeckKey(lesson, part), null);
