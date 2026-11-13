// #/note/:level/:id/:kind/:ref: one note. For a book task it is also the reading page,
// with the section's pages, an active-time timer and "Done reading".

import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import { MixedText } from '../../app/MixedText.tsx';
import { NotFound } from '../../app/NotFound.tsx';
import { findLesson } from '../../lib/content/lessons.ts';
import type { Lesson } from '../../lib/content/types.ts';
import { useNote, type NoteRef } from '../../lib/notes.ts';
import { lessonTasks } from '../../lib/plan/tasks.ts';
import { ReturnBar } from '../deeplink/ReturnBar.tsx';
import { lessonPath } from '../lesson/steps.ts';
import { AddWordButton } from '../mywords/AddWordButton.tsx';
import { bookTaskId, decodeRef, isNoteKind, KIND_NAMES, noteItemLabel, noteItemLink } from './labels.ts';
import { NoteEditor } from './NoteEditor.tsx';
import { ReadingControls } from './ReadingControls.tsx';
import './note-page.css';

let fullWidthSession = false;

export function NotePage() {
  const params = useParams();
  const lesson = findLesson(params.level, params.id);
  const kind = params.kind;
  const ref = decodeRef(params.ref);
  if (!lesson) return <NotFound title="Lesson not found" message="This note belongs to a lesson that is not in the app." />;
  if (!isNoteKind(kind) || !ref) return <NotFound title="Note not found" message="There is no note at this address." />;
  return <NoteScreen key={`${lesson.level}/${lesson.id}|${kind}|${ref}`} lesson={lesson} initialRef={{ level: lesson.level, lessonId: lesson.id, kind, ref }} />;
}

function NoteScreen({ lesson, initialRef }: { lesson: Lesson; initialRef: NoteRef }) {
  // One stable object per note (the screen is keyed by the note).
  const [noteRef] = useState(initialRef);
  const entry = useNote(noteRef);
  const [full, setFullState] = useState(fullWidthSession);
  const setFull = (v: boolean) => {
    fullWidthSession = v;
    setFullState(v);
  };

  const label = noteItemLabel(lesson, noteRef.kind, noteRef.ref);
  const link = noteItemLink(noteRef);
  const task = useMemo(
    () => (noteRef.kind === 'book' ? lessonTasks(lesson).find((t) => t.id === bookTaskId(noteRef)) : undefined),
    [lesson, noteRef],
  );

  return (
    <div className="np" data-full={full || undefined}>
      <ReturnBar />
      <header className="np-head">
        <div className="np-head-text">
          <p className="np-lesson">
            <Link to={lessonPath(lesson.level, lesson.id)}>
              Lesson {lesson.lesson} <span lang="zh-Hans">{lesson.titleZh}</span>
            </Link>
            <span aria-hidden="true"> · </span>
            {KIND_NAMES[noteRef.kind]}
          </p>
          <h1 className="np-title">
            {label.zh ? (
              <>
                <span lang="zh-Hans">{label.text}</span> <span className="pinyin np-pinyin">{label.pinyin}</span>
              </>
            ) : (
              <MixedText text={label.text} />
            )}
          </h1>
          {!label.found && <p className="muted np-small">This item is no longer in the lesson; its note is kept.</p>}
          {noteRef.kind === 'book' && !task && label.found && <p className="muted np-small">This section is not in the study plan.</p>}
        </div>
        <div className="np-head-actions">
          {link && (
            <Link to={link.to} className="toggle-chip np-chip">
              {link.text}
            </Link>
          )}
          <AddWordButton note={noteRef} />
          <button type="button" className="toggle-chip np-chip" aria-pressed={full} onClick={() => setFull(!full)}>
            Full width
          </button>
        </div>
      </header>
      <NoteEditor noteRef={noteRef} entry={entry} reading={task ? <ReadingControls task={task} lesson={lesson} /> : undefined} />
    </div>
  );
}
