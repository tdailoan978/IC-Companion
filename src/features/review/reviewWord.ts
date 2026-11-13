// The word behind a review card: a lesson word from the content, or one of my
// own words (docs/NOTES_AND_DEEP_LINKS.md section 4), whose data lives in the
// `mywords` record. Pure, so the own-card rules are tested.

import { findLesson } from '../../lib/content/lessons.ts';
import type { Lesson } from '../../lib/content/types.ts';
import { isMyWordId, type MyWord } from '../../lib/mywords.ts';
import type { ReviewCard } from '../../lib/review.ts';
import { splitLessonKey } from './session.ts';

export type ReviewWord = {
  zh: string;
  pinyin: string;
  en: string;
  /** Part of speech (lesson words only). */
  pos?: string;
  lesson?: Lesson;
  /** Set for my own words. */
  mine?: MyWord;
};

/** Null when the content no longer has the word, or my word was deleted: such cards are skipped. */
export function findReviewWord(card: ReviewCard, mine: Record<string, MyWord>): ReviewWord | null {
  if (isMyWordId(card.id)) {
    const w = mine[card.id];
    if (!w) return null;
    return { zh: w.zh, pinyin: w.pinyin, en: w.en, lesson: findLesson(w.level, w.lessonId), mine: w };
  }
  const key = splitLessonKey(card.lesson);
  const lesson = key ? findLesson(key.level, key.id) : undefined;
  const word = lesson?.vocab.find((v) => v.id === card.id);
  return lesson && word ? { zh: word.zh, pinyin: word.pinyin, en: word.en, pos: word.pos, lesson } : null;
}
