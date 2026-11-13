import { useEffect, useId, useMemo, useState } from 'react';
import { flushSync } from 'react-dom';
import { Link } from 'react-router';
import { MixedText } from '../../app/MixedText.tsx';
import { hasInk } from '../../lib/ink.ts';
import { listNotes, noteKey, notePath, subscribeNotes, type Note } from '../../lib/notes.ts';
import { InkCanvas } from './InkImage.tsx';
import { PrintView } from './PrintView.tsx';
import { groupNotes, itemLabel, itemPath, matchesSearch, shortDate, snippet, type ItemLabel, type LessonGroup } from './noteItems.ts';
import './notebook.css';

function ItemLabelView({ label }: { label: ItemLabel }) {
  return (
    <>
      {label.zh && (
        <>
          <span lang="zh-Hans" className="nb-label-zh">
            {label.zh}
          </span>{' '}
          <span className="pinyin">{label.pinyin}</span>
          {' · '}
        </>
      )}
      <MixedText text={label.text} />
      {label.pages && <span className="nb-label-pages"> · {label.pages}</span>}
    </>
  );
}

function NoteRow({ note, label, open, onToggle }: { note: Note; label: ItemLabel; open: boolean; onToggle: () => void }) {
  const bodyId = useId();
  const ink = hasInk(note.ink);
  const start = snippet(note.text);
  return (
    <li className="nb-note" data-open={open || undefined}>
      <button type="button" className="nb-note-summary" aria-expanded={open} aria-controls={bodyId} onClick={onToggle}>
        <span className="nb-note-main">
          <span className="nb-note-label">
            <ItemLabelView label={label} />
          </span>
          <span className="nb-note-meta muted">Edited {shortDate(note.edited)}</span>
          {!open && start && (
            <span className="nb-note-snippet">
              <MixedText text={start} />
            </span>
          )}
        </span>
        {ink && !open && <InkCanvas ink={note.ink} width={112} maxHeight={84} className="nb-thumb" />}
        <span className="nb-chevron" aria-hidden="true">
          {open ? '▾' : '▸'}
        </span>
      </button>
      {open && (
        <div className="nb-note-body" id={bodyId}>
          {ink && <InkCanvas ink={note.ink} className="nb-ink-full" />}
          {note.text.trim() ? (
            <p className="nb-note-text">
              <MixedText text={note.text} />
            </p>
          ) : (
            <p className="muted">No typed notes.</p>
          )}
          <div className="nb-note-links">
            <Link to={notePath(note)} className="button">
              Open note
            </Link>
            <Link to={itemPath(note)} className="button button-quiet">
              Go to item
            </Link>
          </div>
        </div>
      )}
    </li>
  );
}

const groupTitle = (g: LessonGroup) => (g.lesson ? `Lesson ${g.lesson.lesson} · ${g.lesson.titleZh} ${g.lesson.titleEn}` : g.key);

/** Every note, by lesson then plan order; search over typed text; print to PDF (docs/NOTES_AND_DEEP_LINKS.md section 3). */
export function NotebookPage() {
  const [notes, setNotes] = useState<Note[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [version, setVersion] = useState(0);
  const [query, setQuery] = useState('');
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [printing, setPrinting] = useState<{ title: string; groups: LessonGroup[]; n: number } | null>(null);
  const searchId = useId();

  // Re-read when any note changes (coalesced: loading the notes itself notifies once per note).
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const unsubscribe = subscribeNotes(() => {
      clearTimeout(timer);
      timer = setTimeout(() => setVersion((v) => v + 1), 100);
    });
    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    listNotes().then(
      (list) => {
        if (cancelled) return;
        setNotes(list);
        setFailed(false);
      },
      (err) => {
        console.warn('Could not list notes', err);
        if (!cancelled) setFailed(true);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [version]);

  const groups = useMemo(() => groupNotes(notes ?? []), [notes]);
  const shown = useMemo(
    () => groups.map((g) => ({ ...g, notes: g.notes.filter((n) => matchesSearch(n, query)) })).filter((g) => g.notes.length > 0),
    [groups, query],
  );
  const searching = query.trim() !== '';

  // A fresh print view each time (keyed), in case the last one stayed because afterprint never came.
  // Render the print view synchronously, then print inside the same tap: iPadOS may block a
  // print started later. Printing from the Home Screen app is the thing to test on the iPad.
  const print = (title: string, chosen: LessonGroup[]) => {
    flushSync(() => setPrinting((p) => ({ title, groups: chosen, n: (p?.n ?? 0) + 1 })));
    window.print();
  };

  const header = (
    <header className="nb-header">
      <h1>Notebook</h1>
      <div className="nb-actions">
        <Link to="/my-words" className="button button-quiet">
          My words
        </Link>
        {groups.length > 0 && (
          <button type="button" className="button button-quiet" onClick={() => print('Notebook', groups)}>
            Print notebook
          </button>
        )}
      </div>
    </header>
  );

  if (failed && !notes) {
    return (
      <div className="page notebook">
        {header}
        <p role="alert" className="notice">
          Your notes could not be read from this device's storage. Close the app and open it again.
        </p>
      </div>
    );
  }

  if (!notes) {
    return (
      <div className="page notebook" aria-busy="true">
        {header}
      </div>
    );
  }

  return (
    <div className="page notebook">
      {header}

      {groups.length === 0 ? (
        <section className="nb-empty">
          <h2>No notes yet</h2>
          <p>
            Every reading task, grammar card, dialogue, vocabulary word and exercise set has a <strong>Note</strong> button with a pencil. Write
            with Apple Pencil or type there, and the note appears here, filed under its lesson in study-plan order.
          </p>
          <p className="muted">From any note you can also add a word to review; those are listed under My words.</p>
        </section>
      ) : (
        <>
          <div className="nb-search">
            <label htmlFor={searchId} className="visually-hidden">
              Search typed notes
            </label>
            <input
              id={searchId}
              type="search"
              className="nb-search-input"
              placeholder="Search typed notes"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
            />
          </div>
          {searching && (
            <p className="muted nb-search-count" aria-live="polite">
              {shown.length === 0
                ? 'No typed notes match. Search covers typed text only, not handwriting.'
                : `${shown.reduce((s, g) => s + g.notes.length, 0)} of ${notes.length} notes match.`}
            </p>
          )}
          {shown.map((g) => (
            <section key={g.key} className="nb-lesson" aria-label={groupTitle(g)}>
              <div className="nb-lesson-head">
                <h2>
                  {g.lesson ? (
                    <>
                      Lesson {g.lesson.lesson} ·{' '}
                      <span lang="zh-Hans" className="nb-lesson-zh">
                        {g.lesson.titleZh}
                      </span>{' '}
                      <span className="muted nb-lesson-en">{g.lesson.titleEn}</span>
                    </>
                  ) : (
                    g.key
                  )}
                </h2>
                <button
                  type="button"
                  className="button button-quiet"
                  onClick={() => print(g.lesson ? `Lesson ${g.lesson.lesson} notes` : 'Notes', groups.filter((x) => x.key === g.key))}
                >
                  Print this lesson
                </button>
              </div>
              <ul className="nb-list">
                {g.notes.map((n) => {
                  const key = noteKey(n);
                  return (
                    <NoteRow
                      key={key}
                      note={n}
                      label={itemLabel(n, g.lesson)}
                      open={openKey === key}
                      onToggle={() => setOpenKey((k) => (k === key ? null : key))}
                    />
                  );
                })}
              </ul>
            </section>
          ))}
        </>
      )}

      {printing && <PrintView key={printing.n} title={printing.title} groups={printing.groups} onDone={() => setPrinting(null)} />}
    </div>
  );
}
