import type { Lesson, VocabItem } from '../../lib/content/types.ts';
import { speakChinese } from '../../lib/speech.ts';
import { NoteButton } from '../notes/NoteButton.tsx';

/** The row's element id, for links to one word (?item=L11.v.12). */
export const vocabRowId = (vocabId: string) => `vocab-${vocabId}`;

/** List mode: one row per word; tapping a row reads the Chinese aloud. Each word has its own note. */
export function VocabList({ lesson, words, highlight }: { lesson: Pick<Lesson, 'level' | 'id'>; words: VocabItem[]; highlight?: string }) {
  return (
    <ol className="vocab-list">
      {words.map((v) => (
        <li key={v.id} id={vocabRowId(v.id)} data-highlight={highlight === v.id || undefined}>
          {/* Speak inside the tap itself: iOS blocks speech started after an await. */}
          <button type="button" className="vocab-row" onClick={() => void speakChinese(v.zh)}>
            <span className="vocab-n" aria-hidden="true">
              {v.n}
            </span>
            <span lang="zh-Hans" className="vocab-zh">
              {v.zh}
            </span>
            <span className="vocab-meta">
              <span className="vocab-pinyin pinyin">{v.pinyin}</span>
              <span className="vocab-en">
                <abbr className="vocab-pos" title={posTitle(v.pos)}>
                  {v.pos}
                </abbr>{' '}
                {v.en}
              </span>
            </span>
            <svg className="vocab-row-icon" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
              <path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" />
              <path d="M16 8.5a5 5 0 0 1 0 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
          {/* A sibling of the row (a link cannot sit inside a button), so it never triggers the speech. */}
          <NoteButton note={{ level: lesson.level, lessonId: lesson.id, kind: 'vocab', ref: v.id }} label={v.zh} compact />
        </li>
      ))}
    </ol>
  );
}

const POS_NAMES: Record<string, string> = {
  n: 'noun',
  v: 'verb',
  adj: 'adjective',
  adv: 'adverb',
  prep: 'preposition',
  conj: 'conjunction',
  pr: 'pronoun',
  pn: 'proper noun',
  mw: 'measure word',
  vo: 'verb-object compound',
  vc: 'verb plus complement',
  mv: 'modal verb',
  num: 'numeral',
  part: 'particle',
  t: 'time word',
  exp: 'expression',
};

export const posTitle = (pos: string) =>
  pos
    .split(/\s*[/,]\s*/)
    .map((p) => POS_NAMES[p] ?? p)
    .join(', ');
