import { Link } from 'react-router';
import { notePath, useHasNote, type NoteRef } from '../../lib/notes.ts';
import { useDeepLink, withDeepLink } from '../../lib/deeplink.ts';
import './note-button.css';

/** "Note" button for an item: opens its note; shows a mark when the item already has one. */
export function NoteButton({ note, label = 'Note', compact = false }: { note: NoteRef; label?: string; compact?: boolean }) {
  const has = useHasNote(note);
  // Opened from a plan item: keep the plan context so the note page shows Back to Today too.
  const { fromPlan, task } = useDeepLink();
  return (
    <Link
      to={withDeepLink(notePath(note), { fromPlan, task })}
      className={`note-button${compact ? ' note-button-compact' : ''}`}
      data-has={has || undefined}
      aria-label={`${has ? 'Open note' : 'Add a note'}: ${label}`}
      onClick={(e) => e.stopPropagation()}
    >
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
        <path d="M4 20h4L19 9l-4-4L4 16v4zM14 6l4 4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {!compact && <span>{has ? 'Note' : 'Add note'}</span>}
      {has && <span className="note-button-dot" aria-hidden="true" />}
    </Link>
  );
}
