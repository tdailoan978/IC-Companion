// PROTOTYPE (throwaway). Shared Apple Pencil ink: hook + toolbar + surface.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export type Pt = { x: number; y: number; p: number; t: number };
export type Stroke = { points: Pt[]; width: number; erase: boolean };
export type Tool = 'thin' | 'medium' | 'thick' | 'eraser';
const WIDTHS: Record<Exclude<Tool, 'eraser'>, number> = { thin: 1.5, medium: 3, thick: 6 };
const INITIAL_H = 500;

export function useInk() {
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [tool, setTool] = useState<Tool>('medium');
  const [anyInput, setAnyInput] = useState(false);
  const [height, setHeight] = useState(INITIAL_H);
  const clear = () => {
    if (strokes.length && confirm('Clear all ink?')) {
      setStrokes([]);
      setHeight(INITIAL_H);
    }
  };
  const undo = () => setStrokes((s) => s.slice(0, -1));
  return { strokes, setStrokes, tool, setTool, anyInput, setAnyInput, height, setHeight, clear, undo };
}
export type Ink = ReturnType<typeof useInk>;

export function InkToolbar({ ink, vertical, hideDebug }: { ink: Ink; vertical?: boolean; hideDebug?: boolean }) {
  const tools: [Tool, string][] = [['thin', 'Thin'], ['medium', 'Med'], ['thick', 'Thick'], ['eraser', 'Eraser']];
  return (
    <div className={`pt-ink-tools${vertical ? ' pt-vertical' : ''}`} role="toolbar" aria-label="Ink tools">
      {tools.map(([t, label]) => (
        <button key={t} type="button" className="toggle-chip" aria-pressed={ink.tool === t} onClick={() => ink.setTool(t)}>
          {label}
        </button>
      ))}
      <button type="button" className="toggle-chip" onClick={ink.undo} disabled={!ink.strokes.length}>
        Undo
      </button>
      <button type="button" className="toggle-chip" onClick={ink.clear} disabled={!ink.strokes.length}>
        Clear
      </button>
      {!hideDebug && (
        <label className="pt-debug">
          <input type="checkbox" checked={ink.anyInput} onChange={(e) => ink.setAnyInput(e.target.checked)} /> Draw with mouse/finger
        </label>
      )}
    </div>
  );
}

export function InkReadout({ ink }: { ink: Ink }) {
  const text = useMemo(() => {
    const pts = ink.strokes.reduce((n, s) => n + s.points.length, 0);
    return `${ink.strokes.length} strokes · ${pts} points · ~${JSON.stringify(ink.strokes).length} bytes as JSON`;
  }, [ink.strokes]);
  return <div className="pt-readout">{text}</div>;
}

function draw(ctx: CanvasRenderingContext2D, strokes: Stroke[], dpr: number, w: number, h: number) {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const s of strokes) {
    ctx.globalCompositeOperation = s.erase ? 'destination-out' : 'source-over';
    ctx.strokeStyle = '#1f1b16';
    ctx.fillStyle = '#1f1b16';
    const base = s.erase ? 18 : s.width;
    const pts = s.points;
    if (pts.length === 1) {
      ctx.beginPath();
      ctx.arc(pts[0].x, pts[0].y, (base * (0.4 + pts[0].p)) / 2, 0, Math.PI * 2);
      ctx.fill();
      continue;
    }
    for (let i = 1; i < pts.length; i++) {
      ctx.lineWidth = s.erase ? base : base * (0.4 + pts[i].p * 1.2);
      ctx.beginPath();
      ctx.moveTo(pts[i - 1].x, pts[i - 1].y);
      ctx.lineTo(pts[i].x, pts[i].y);
      ctx.stroke();
    }
  }
  ctx.globalCompositeOperation = 'source-over';
}

export function InkSurface({ ink, className }: { ink: Ink; className?: string }) {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [width, setWidth] = useState(300);
  const current = useRef<Stroke | null>(null);
  const penDown = useRef(false);
  const [live, setLive] = useState(0); // bump to redraw during a stroke
  const { strokes, setStrokes, setHeight } = ink;

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(Math.max(100, el.clientWidth)));
    ro.observe(el);
    setWidth(Math.max(100, el.clientWidth));
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    const dpr = window.devicePixelRatio || 1;
    c.width = Math.round(width * dpr);
    c.height = Math.round(ink.height * dpr);
    const all = current.current ? [...strokes, current.current] : strokes;
    draw(c.getContext('2d')!, all, dpr, width, ink.height);
  }, [strokes, width, ink.height, live]);

  const pos = (e: { clientX: number; clientY: number }) => {
    const r = canvas.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const mk = (e: React.PointerEvent): Pt => ({ ...pos(e), p: e.pointerType === 'pen' ? e.pressure || 0.5 : 0.5, t: Math.round(e.timeStamp) });

  const allowed = (e: React.PointerEvent) => {
    if (e.pointerType === 'pen') return true;
    if (!ink.anyInput) return false;
    return !penDown.current; // palm rejection: ignore touch while the pen is down
  };

  const onDown = (e: React.PointerEvent) => {
    if (e.pointerType === 'touch' && penDown.current) return;
    if (!allowed(e)) return;
    if (e.pointerType === 'pen') {
      penDown.current = true;
      e.preventDefault();
    }
    canvas.current!.setPointerCapture(e.pointerId);
    const erase = ink.tool === 'eraser';
    current.current = { points: [mk(e)], width: erase ? 18 : WIDTHS[ink.tool as keyof typeof WIDTHS], erase };
    setLive((n) => n + 1);
  };
  const onMove = (e: React.PointerEvent) => {
    if (!current.current || !allowed(e)) return;
    if (e.pointerType === 'pen') e.preventDefault();
    const evs = e.nativeEvent.getCoalescedEvents?.() ?? [];
    const r = canvas.current!.getBoundingClientRect();
    const list = evs.length ? evs : [e.nativeEvent];
    for (const ev of list) {
      current.current.points.push({
        x: ev.clientX - r.left,
        y: ev.clientY - r.top,
        p: e.pointerType === 'pen' ? ev.pressure || 0.5 : 0.5,
        t: Math.round(ev.timeStamp),
      });
    }
    setLive((n) => n + 1);
  };
  const end = (e: React.PointerEvent) => {
    if (e.pointerType === 'pen') {
      penDown.current = false;
      e.preventDefault();
    }
    const s = current.current;
    if (!s) return;
    current.current = null;
    setStrokes((prev) => [...prev, s]);
    const last = s.points[s.points.length - 1];
    if (last.y > ink.height - 120) setHeight((h) => h + 400);
  };

  return (
    <div ref={wrap} className={`pt-ink-wrap ${className ?? ''}`}>
      <canvas
        ref={canvas}
        className="pt-canvas"
        style={{ width, height: ink.height, touchAction: ink.anyInput ? 'none' : 'pan-y' }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={end}
        onPointerCancel={end}
        onContextMenu={(e) => e.preventDefault()}
      />
    </div>
  );
}

export function useBeforePrintFlatten(canvasHost: React.RefObject<HTMLElement | null>) {
  // Canvas prints fine in Safari/Chrome; kept as a hook point if it does not on the iPad.
  const noop = useCallback(() => canvasHost, [canvasHost]);
  return noop;
}
