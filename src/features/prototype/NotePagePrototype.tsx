// QUESTION: "What should the reading note page look like in half-width iPad Split View next to the textbook PDF, and do Apple Pencil ink with palm rejection and Print → Save as PDF work on the owner's iPad?"
// PROTOTYPE (throwaway): hard-coded sample data, nothing is stored.
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import { findLesson } from '../../lib/content/lessons.ts';
import { useActiveTimer } from '../../lib/timer.ts';
import { InkReadout, InkSurface, InkToolbar, useInk, type Ink } from './InkCanvasPrototype.tsx';
import { PrototypeSwitcher } from './PrototypeSwitcher.tsx';
import './prototype.css';

const lesson = findLesson(2, 'L11');
const refs = lesson?.bookRefs ?? [];
const startPage = refs.find((r) => r.section === 'Part 1 text')?.page ?? 2;
const nextPage = refs.find((r) => r.page > startPage)?.page ?? 4;
const SECTION = `Part 1 text · p. ${startPage}–${nextPage - 1}`;
const LESSON = 'L11 天气';
const TASK = `Read ${SECTION.replace(' · ', ', ')}`;

function mmss(ms: number) {
  const s = Math.floor(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

function useTick() {
  const timer = useActiveTimer();
  const [, setN] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setN((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);
  return timer;
}

function DoneControl({ timer, compact }: { timer: ReturnType<typeof useActiveTimer>; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [mins, setMins] = useState(0);
  const [saved, setSaved] = useState(false);
  if (saved) return <span className="pt-saved">Saved (prototype: not stored)</span>;
  return (
    <>
      <button type="button" className="button" onClick={() => { setMins(Math.max(1, Math.round(timer.elapsed() / 60000))); setOpen(true); }}>
        {compact ? 'Done' : 'Done reading'}
      </button>
      {open && (
        <div className="pt-confirm" role="dialog" aria-label="Confirm reading time">
          <span>Reading time</span>
          <button type="button" className="toggle-chip" onClick={() => setMins((m) => Math.max(1, m - 1))} aria-label="Minus one minute">−</button>
          <strong>{mins} min</strong>
          <button type="button" className="toggle-chip" onClick={() => setMins((m) => m + 1)} aria-label="Plus one minute">+</button>
          <button type="button" className="button" onClick={() => { setSaved(true); setOpen(false); }}>Save</button>
          <button type="button" className="button-quiet" onClick={() => setOpen(false)}>Cancel</button>
        </div>
      )}
    </>
  );
}

const PLACEHOLDER = 'Type your notes here (Scribble works: write with the Pencil)…';

function FullToggle({ full, set }: { full: boolean; set: (v: boolean) => void }) {
  return <button type="button" className="toggle-chip" aria-pressed={full} onClick={() => set(!full)}>Full width</button>;
}
function PrintBtn() {
  return <button type="button" className="toggle-chip pt-noprint" onClick={() => window.print()}>Print / Save as PDF</button>;
}

type VP = { full: boolean; setFull: (v: boolean) => void };

export function VariantA({ full, setFull }: VP) {
  const timer = useTick();
  const ink = useInk();
  const [text, setText] = useState('');
  return (
    <div className="pt-page pt-a">
      <header className="pt-card pt-a-head">
        <div>
          <h1 className="pt-h1">{SECTION}</h1>
          <div className="pt-sub">{LESSON} · {TASK}</div>
        </div>
        <div className="pt-row pt-noprint">
          <span className="pt-timer">{mmss(timer.elapsed())}</span>
          <DoneControl timer={timer} />
          <FullToggle full={full} set={setFull} />
          <PrintBtn />
        </div>
      </header>
      <textarea className="pt-text" value={text} onChange={(e) => setText(e.target.value)} placeholder={PLACEHOLDER} rows={6} />
      <div className="pt-noprint"><InkToolbar ink={ink} /></div>
      <InkSurface ink={ink} className="pt-sheet-plain" />
      <InkReadout ink={ink} />
    </div>
  );
}

export function VariantB({ full, setFull }: VP) {
  const timer = useTick();
  const ink = useInk();
  const [text, setText] = useState('');
  const [mode, setMode] = useState<'write' | 'type'>('write');
  return (
    <div className="pt-page pt-b">
      <div className="pt-b-top">
        <span>{SECTION}</span>
        <span className="pt-sub">{LESSON}</span>
        <span className="pt-row pt-noprint"><FullToggle full={full} set={setFull} /><PrintBtn /></span>
      </div>
      <div className="pt-seg pt-noprint" role="tablist">
        {(['write', 'type'] as const).map((m) => (
          <button key={m} type="button" role="tab" aria-selected={mode === m} onClick={() => setMode(m)}>{m === 'write' ? 'Write' : 'Type'}</button>
        ))}
      </div>
      <div className="pt-b-body">
        {mode === 'write' ? (
          <><InkSurface ink={ink} className="pt-sheet-plain" /><InkReadout ink={ink} /></>
        ) : (
          <textarea className="pt-text pt-tall" value={text} onChange={(e) => setText(e.target.value)} placeholder={PLACEHOLDER} />
        )}
        {mode === 'type' && text === '' ? null : null}
      </div>
      <div className="pt-b-bar pt-noprint">
        <span className="pt-timer">{mmss(timer.elapsed())}</span>
        <InkToolbar ink={ink} hideDebug />
        <label className="pt-debug"><input type="checkbox" checked={ink.anyInput} onChange={(e) => ink.setAnyInput(e.target.checked)} /> Mouse/finger</label>
        <DoneControl timer={timer} compact />
      </div>
    </div>
  );
}

function PaperC({ ink }: { ink: Ink }) {
  return <InkSurface ink={ink} className="pt-paper-ink" />;
}

export function VariantC({ full, setFull }: VP) {
  const timer = useTick();
  const ink = useInk();
  const [text, setText] = useState('');
  const [open, setOpen] = useState(true);
  return (
    <div className="pt-page pt-c">
      <div className="pt-c-pill pt-noprint">
        <span className="pt-timer">{mmss(timer.elapsed())}</span>
        <DoneControl timer={timer} compact />
      </div>
      <div className="pt-c-sheet">
        <div className="pt-c-title">{SECTION} · {LESSON}</div>
        <div className="pt-c-palette pt-noprint"><InkToolbar ink={ink} vertical /></div>
        <PaperC ink={ink} />
        <div className="pt-c-card">
          <button type="button" className="button button-quiet pt-noprint" onClick={() => setOpen(!open)} aria-expanded={open}>{open ? '▾' : '▸'} Typed notes</button>
          {open && <textarea className="pt-text" value={text} onChange={(e) => setText(e.target.value)} placeholder={PLACEHOLDER} rows={4} />}
          <div className="pt-row pt-noprint"><FullToggle full={full} set={setFull} /><PrintBtn /></div>
        </div>
      </div>
      <InkReadout ink={ink} />
    </div>
  );
}

export function NotePagePrototype() {
  const [params] = useSearchParams();
  const v = params.get('variant');
  const [full, setFull] = useState(false);
  const P = { full, setFull };
  return (
    <div className={`pt-root${full ? ' pt-full' : ''}`}>
      {v === 'B' ? <VariantB {...P} /> : v === 'C' ? <VariantC {...P} /> : <VariantA {...P} />}
      <PrototypeSwitcher />
    </div>
  );
}
