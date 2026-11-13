// "My words": words I add from my notes become my own review cards
// (docs/NOTES_AND_DEEP_LINKS.md section 4). The words live in one record,
// `mywords`; each has a card in the normal review queue (`review.cards`) whose
// id starts with "my." and whose lesson is the note's lesson.

import { useSyncExternalStore } from 'react';
import { addCards, cardKey, updateReviewCards } from './review.ts';
import { readStrict, setSaveFailed, write } from './storage.ts';
import type { Day } from './days.ts';

export type MyWord = {
  /** "my.<random>"; also the review card id. */
  id: string;
  zh: string;
  pinyin: string;
  en: string;
  level: number;
  lessonId: string;
  /** The note it came from (notes.ts noteKey), for the link back. */
  noteKey?: string;
  created: string;
};

export const MYWORDS_KEY = 'mywords';
export const isMyWordId = (id: string) => id.startsWith('my.');
export const newMyWordId = () =>
  `my.${typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36)}`;

let cache: Record<string, MyWord> | null = null;
let loading: Promise<Record<string, MyWord>> | null = null;
const listeners = new Set<() => void>();
const EMPTY: Record<string, MyWord> = {};
const notify = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function loadMyWords(): Promise<Record<string, MyWord>> {
  if (cache) return Promise.resolve(cache);
  loading ??= readStrict<Record<string, MyWord>>(MYWORDS_KEY, {}).then(
    (saved) => {
      cache = saved;
      notify();
      return saved;
    },
    (err) => {
      loading = null;
      throw err;
    },
  );
  return loading;
}

async function change(fn: (words: Record<string, MyWord>) => Record<string, MyWord>): Promise<boolean> {
  let words: Record<string, MyWord>;
  try {
    words = await loadMyWords();
  } catch (err) {
    console.warn('Could not load my words', err);
    setSaveFailed(true);
    return false;
  }
  cache = fn(cache ?? words);
  notify();
  return write(MYWORDS_KEY, cache);
}

/** Adds a word and its review card (first review the next day, like learned words). */
export async function addMyWord(word: Omit<MyWord, 'id' | 'created'>, today: Day): Promise<MyWord | null> {
  const w: MyWord = { ...word, id: newMyWordId(), created: new Date().toISOString() };
  if (!(await change((all) => ({ ...all, [w.id]: w })))) return null;
  await updateReviewCards((cards) => addCards(cards, `${w.level}/${w.lessonId}`, [w.id], today));
  return w;
}

export const updateMyWord = (id: string, patch: Partial<Pick<MyWord, 'zh' | 'pinyin' | 'en'>>) =>
  change((all) => (all[id] ? { ...all, [id]: { ...all[id], ...patch } } : all));

/** Deletes a word and its review card. */
export async function deleteMyWord(id: string): Promise<void> {
  const w = cache?.[id] ?? (await loadMyWords().catch(() => EMPTY))[id];
  await change((all) => {
    const next = { ...all };
    delete next[id];
    return next;
  });
  if (w) {
    await updateReviewCards((cards) => {
      const next = { ...cards };
      delete next[cardKey(`${w.level}/${w.lessonId}`, id)];
      return next;
    });
  }
}

export function useMyWords(): { words: Record<string, MyWord>; loaded: boolean } {
  const words = useSyncExternalStore(subscribe, () => cache ?? EMPTY);
  if (!cache) loadMyWords().catch((err) => console.warn('Could not load my words', err));
  return { words, loaded: cache !== null };
}
