// A note's body (layout B from the prototype): a "Write | Type" switch, the ink area or the typed
// text filling the space, and a sticky bottom toolbar with the ink tools (and, for a reading,
// the timer and Done from `reading`).

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { emptyInk, hasInk, type Ink } from '../../lib/ink.ts';
import { flushNote, loadNote, updateNote, type Note, type NoteRef } from '../../lib/notes.ts';
import { InkCanvas, type InkTool } from './InkCanvas.tsx';

type Entry = { note: Note | null; loaded: boolean; failed: boolean };
type Mode = 'write' | 'type';

const PENS: { tool: InkTool; label: string; dot: number }[] = [
  { tool: 'thin', label: 'Thin pen', dot: 4 },
  { tool: 'medium', label: 'Medium pen', dot: 7 },
  { tool: 'thick', label: 'Thick pen', dot: 12 },
];

const EMPTY_INK = emptyInk();

// Kept for the session (not saved): the tool, and the Mac test option, which starts off.
let lastTool: InkTool = 'medium';
let anyInputSession = false;

const TEXT_PLACEHOLDER = 'Type your notes here. Scribble works too: write in this box with the Apple Pencil.';

/** The space from `host` down to the toolbar, so the ink area or text box fills the screen. */
function useFillHeight(hostRef: RefObject<HTMLElement | null>, barRef: RefObject<HTMLElement | null>, mode: Mode): number {
  const [fill, setFill] = useState(0);
  useLayoutEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const scroller = (host.closest('.app-main') as HTMLElement | null) ?? document.documentElement;
    const measure = () => {
      const top = host.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop;
      const bar = barRef.current?.offsetHeight ?? 0;
      setFill(Math.max(240, Math.floor(scroller.clientHeight - top - bar - 12)));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(scroller);
    if (barRef.current) ro.observe(barRef.current);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [hostRef, barRef, mode]);
  return fill;
}

export function NoteEditor({ noteRef, entry, reading }: { noteRef: NoteRef; entry: Entry; reading?: ReactNode }) {
  const ready = entry.loaded && !entry.failed;
  const note = entry.note;
  const ink: Ink = note?.ink ?? EMPTY_INK;
  const text = note?.text ?? '';

  const [mode, setMode] = useState<Mode>(() => (note && !hasInk(note.ink) && note.text.trim() !== '' ? 'type' : 'write'));
  const [tool, setToolState] = useState<InkTool>(lastTool);
  const [anyInput, setAnyInputState] = useState(anyInputSession);
  const [menuOpen, setMenuOpen] = useState(false);
  const setTool = (t: InkTool) => {
    lastTool = t;
    setToolState(t);
  };
  const setAnyInput = (v: boolean) => {
    anyInputSession = v;
    setAnyInputState(v);
  };

  const hostRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const fill = useFillHeight(hostRef, barRef, mode);

  // Leaving the note saves it at once (notes.ts also saves when the app is hidden).
  useEffect(() => () => flushNote(noteRef), [noteRef]);

  const setInk = (next: Ink) => updateNote(noteRef, (n) => ({ ...n, ink: next }));
  const save = () => flushNote(noteRef);
  const undo = () => {
    if (ink.strokes.length === 0) return;
    setInk({ ...ink, strokes: ink.strokes.slice(0, -1) });
    save();
  };
  const clear = () => {
    setMenuOpen(false);
    if (ink.strokes.length === 0) return;
    if (!window.confirm('Clear all handwriting in this note? This cannot be undone.')) return;
    setInk(emptyInk());
    save();
  };

  const showInkTools = ready && mode === 'write';
  const canUndo = ink.strokes.length > 0;

  return (
    <>
      {ready && (
        <div className="np-seg" role="group" aria-label="Note mode">
          {(['write', 'type'] as const).map((m) => (
            <button key={m} type="button" aria-pressed={mode === m} onClick={() => setMode(m)}>
              {m === 'write' ? 'Write' : 'Type'}
            </button>
          ))}
        </div>
      )}

      <div ref={hostRef} className="np-body">
        {entry.failed ? (
          <div className="notice np-failed" role="alert">
            <p>
              This note could not be read from the iPad, so it can't be changed right now. Nothing was saved over it.
              Close the app fully and reopen it, or try again.
            </p>
            <button type="button" className="button" onClick={() => void loadNote(noteRef)}>
              Try again
            </button>
          </div>
        ) : !entry.loaded ? (
          <p className="muted np-loading">Loading the note…</p>
        ) : mode === 'write' ? (
          <InkCanvas ink={ink} onChange={setInk} onStrokeEnd={save} tool={tool} anyInput={anyInput} minHeight={fill} />
        ) : (
          <textarea
            className="np-text"
            style={{ minHeight: fill }}
            value={text}
            placeholder={TEXT_PLACEHOLDER}
            aria-label="Typed notes"
            onChange={(e) => {
              const value = e.target.value;
              updateNote(noteRef, (n) => ({ ...n, text: value }));
            }}
            onBlur={save}
          />
        )}
      </div>

      {(showInkTools || reading) && (
        <div ref={barRef} className="np-bar">
          {showInkTools && (
            <div className="np-tools" role="toolbar" aria-label="Pen">
              {PENS.map((p) => (
                <button key={p.tool} type="button" className="np-tool" aria-pressed={tool === p.tool} aria-label={p.label} title={p.label} onClick={() => setTool(p.tool)}>
                  <span className="np-dot" style={{ width: p.dot, height: p.dot }} aria-hidden="true" />
                </button>
              ))}
              <button type="button" className="np-tool" aria-pressed={tool === 'eraser'} aria-label="Eraser" title="Eraser" onClick={() => setTool('eraser')}>
                <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
                  <path d="M15 4l5 5-9 9H6l-3-3 12-11zM9 9l6 6M11 18h9" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
                </svg>
              </button>
              <button type="button" className="np-tool" aria-label="Undo" title="Undo" disabled={!canUndo} onClick={undo}>
                <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
                  <path d="M9 14L4 9l5-5M4 9h10.5a5.5 5.5 0 010 11H11" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
                </svg>
              </button>
              <button type="button" className="np-tool np-wide-only np-tool-text" disabled={!canUndo} onClick={clear}>
                Clear
              </button>
              <span className="np-more">
                <button type="button" className="np-tool" aria-label="More pen options" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>
                  <span aria-hidden="true">⋯</span>
                </button>
                {menuOpen && (
                  <span className="np-menu">
                    <button type="button" className="np-menu-item np-narrow-only" disabled={!canUndo} onClick={clear}>
                      Clear all handwriting
                    </button>
                    <label className="np-menu-item">
                      <input
                        type="checkbox"
                        checked={anyInput}
                        onChange={(e) => {
                          setAnyInput(e.target.checked);
                          setMenuOpen(false);
                        }}
                      />
                      Draw with finger or mouse
                    </label>
                  </span>
                )}
              </span>
            </div>
          )}
          {reading}
        </div>
      )}
    </>
  );
}
