import { useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { findLesson } from '../../lib/content/lessons.ts';
import { todayDay } from '../../lib/days.ts';
import { deleteMyWord, updateMyWord, useMyWords, type MyWord } from '../../lib/mywords.ts';
import { notePath, parseNoteKey } from '../../lib/notes.ts';
import { cardKey, useReviewCards } from '../../lib/review.ts';
import { describeDay } from '../review/session.ts';
import { checkWord, trimWord, WordFields, type WordDraft, type WordErrors } from './WordFields.tsx';
import './mywords.css';

function EditWord({ word, onDone }: { word: MyWord; onDone: () => void }) {
  const [draft, setDraft] = useState<WordDraft>({ zh: word.zh, pinyin: word.pinyin, en: word.en });
  const [errors, setErrors] = useState<WordErrors>({});
  const [failed, setFailed] = useState(false);
  const zhRef = useRef<HTMLInputElement>(null);
  const enRef = useRef<HTMLInputElement>(null);

  async function save(e: FormEvent) {
    e.preventDefault();
    const found = checkWord(draft);
    setErrors(found);
    if (found.zh) return zhRef.current?.focus();
    if (found.en) return enRef.current?.focus();
    if (await updateMyWord(word.id, trimWord(draft))) onDone();
    else setFailed(true);
  }

  return (
    <form className="mw-edit" onSubmit={save} noValidate aria-label={`Edit ${word.zh}`}>
      <WordFields
        value={draft}
        errors={errors}
        zhRef={zhRef}
        enRef={enRef}
        onChange={(field, text) => {
          setDraft((d) => ({ ...d, [field]: text }));
          if (field !== 'pinyin') setErrors((er) => ({ ...er, [field]: undefined }));
        }}
      />
      {failed && (
        <p role="alert" className="mw-error">
          The change could not be saved on this device. Try again.
        </p>
      )}
      <div className="mw-row-actions">
        <button type="submit" className="button">
          Save
        </button>
        <button type="button" className="button button-quiet" onClick={onDone}>
          Cancel
        </button>
      </div>
    </form>
  );
}

function WordRow({ word, due }: { word: MyWord; due?: string }) {
  const [mode, setMode] = useState<'view' | 'edit' | 'confirm'>('view');
  const lesson = findLesson(word.level, word.lessonId);
  const ref = word.noteKey ? parseNoteKey(word.noteKey) : null;
  const today = todayDay();

  return (
    <li className="mw-word">
      {mode === 'edit' ? (
        <EditWord word={word} onDone={() => setMode('view')} />
      ) : (
        <>
          <div className="mw-word-main">
            <p className="mw-word-head">
              <span lang="zh-Hans" className="mw-zh">
                {word.zh}
              </span>{' '}
              <span className="pinyin mw-pinyin">{word.pinyin}</span>
            </p>
            <p className="mw-en">{word.en}</p>
            <p className="muted mw-source">
              {lesson ? (
                <>
                  Lesson {lesson.lesson} · <span lang="zh-Hans">{lesson.titleZh}</span>
                </>
              ) : (
                word.lessonId
              )}
              {due && <> · next review {describeDay(due, today)}</>}
            </p>
          </div>
          {mode === 'confirm' ? (
            <div className="mw-confirm" role="group" aria-label={`Delete ${word.zh}?`}>
              <p>
                Delete <span lang="zh-Hans">{word.zh}</span>? Its review card goes too.
              </p>
              <div className="mw-row-actions">
                <button type="button" className="button mw-delete" onClick={() => void deleteMyWord(word.id)}>
                  Delete
                </button>
                <button type="button" className="button button-quiet" onClick={() => setMode('view')}>
                  Keep
                </button>
              </div>
            </div>
          ) : (
            <div className="mw-row-actions">
              {ref && (
                <Link to={notePath(ref)} className="button button-quiet">
                  Open note
                </Link>
              )}
              <button type="button" className="button button-quiet" onClick={() => setMode('edit')}>
                Edit
              </button>
              <button type="button" className="button button-quiet" onClick={() => setMode('confirm')}>
                Delete
              </button>
            </div>
          )}
        </>
      )}
    </li>
  );
}

/** Words I added from my notes (docs/NOTES_AND_DEEP_LINKS.md section 4): newest first; edit or delete. */
export function MyWordsPage() {
  const { words, loaded } = useMyWords();
  const { cards } = useReviewCards();
  const list = Object.values(words).sort((a, b) => b.created.localeCompare(a.created));

  return (
    <div className="page my-words" aria-busy={!loaded || undefined}>
      <header className="mw-header">
        <h1>My words</h1>
        <Link to="/notebook" className="button button-quiet">
          Notebook
        </Link>
      </header>
      {loaded && list.length === 0 && (
        <section className="mw-empty">
          <p>
            No words yet. Open any note and tap <strong>Add to my words</strong>: the word joins your review the next day, marked “My word”.
          </p>
        </section>
      )}
      {list.length > 0 && (
        <>
          <p className="muted">
            {list.length} {list.length === 1 ? 'word' : 'words'}, newest first. They come up in Review with your lesson words.
          </p>
          <ul className="mw-list">
            {list.map((w) => (
              <WordRow key={w.id} word={w} due={cards[cardKey(`${w.level}/${w.lessonId}`, w.id)]?.due} />
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
