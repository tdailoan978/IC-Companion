// Saved place in a lesson's speaking prompts (PLAN.md 6: closing the app never
// loses progress). Saved on every move, cleared when the prompts are finished.

import type { Lesson } from '../../lib/content/types.ts';
import { lessonKey } from '../../lib/content/types.ts';
import { read, write } from '../../lib/storage.ts';

export const savedSpeakingKey = (lesson: Pick<Lesson, 'level' | 'id'>) => `speaking.${lessonKey(lesson)}`;

/** The prompt to resume at: a whole number inside the list, else 0. */
export function restoredIndex(saved: unknown, count: number): number {
  return typeof saved === 'number' && Number.isInteger(saved) && saved >= 0 && saved < count ? saved : 0;
}

export const loadSpeakingIndex = (lesson: Pick<Lesson, 'level' | 'id'>) => read<unknown>(savedSpeakingKey(lesson), null);
export const saveSpeakingIndex = (lesson: Pick<Lesson, 'level' | 'id'>, index: number) => write(savedSpeakingKey(lesson), index);
export const clearSpeakingIndex = (lesson: Pick<Lesson, 'level' | 'id'>) => write(savedSpeakingKey(lesson), null);
