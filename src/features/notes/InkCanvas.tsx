// The Apple Pencil ink area. Built for speed (docs/NOTES_AND_DEEP_LINKS.md section 6):
// - a stroke in progress lives in a ref and each new segment is drawn straight onto the
//   canvas (drawSegment); React does not re-render per pointer move;
// - everything is redrawn (drawInk) only on load, undo/clear, resize and height growth,
//   and the bitmap is never resized during a stroke;
// - native non-passive touch listeners stop the Pencil (and a palm while it writes) from
//   scrolling, while a finger alone still scrolls (touch-action: pan-x pan-y);
// - text selection is cancelled while a stroke is drawn.

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  compactStroke,
  drawInk,
  drawSegment,
  drawStroke,
  ERASER_WIDTH,
  PAPER_COLOUR,
  PEN_WIDTHS,
  type Ink,
  type InkPoint,
  type InkStroke,
  type PenWidth,
} from '../../lib/ink.ts';
import { canvasScale, inkRight, lowestPoint, nextHeight, pointerAction, shouldBlockTouch } from './inkRules.ts';

export type InkTool = PenWidth | 'eraser';

type Props = {
  ink: Ink;
  onChange(next: Ink): void;
  onStrokeEnd(): void;
  tool: InkTool;
  /** "Draw with finger or mouse" (testing on a Mac). Off by default: only the Pencil draws. */
  anyInput?: boolean;
  /** Fill at least this height on screen (the space above the toolbar). */
  minHeight?: number;
};

type Active = { stroke: InkStroke; pointerId: number; rect: DOMRect; pen: boolean };

// Clamped to the ink area: with pointer capture a stroke can leave it, which would widen the canvas.
const clamp = (v: number, max: number) => Math.min(Math.max(v, 0), max);
const pointOf = (e: PointerEvent, rect: DOMRect, pen: boolean): InkPoint => ({
  x: clamp(e.clientX - rect.left, rect.width),
  y: clamp(e.clientY - rect.top, rect.height),
  p: pen ? e.pressure || 0.5 : 0.5,
  t: e.timeStamp,
});

export function InkCanvas({ ink, onChange, onStrokeEnd, tool, anyInput = false, minHeight = 0 }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [areaWidth, setAreaWidth] = useState(0);

  const right = useMemo(() => inkRight(ink), [ink.strokes]);
  const cssW = Math.max(areaWidth, right);
  const cssH = Math.max(ink.height, Math.floor(minHeight));

  // Latest props for the native listeners (attached once).
  const live = useRef({ onChange, onStrokeEnd, tool, anyInput, cssW, cssH });
  live.current = { onChange, onStrokeEnd, tool, anyInput, cssW, cssH };

  /** The newest ink: the prop, or what the last stroke produced before the prop caught up. */
  const inkNow = useRef(ink);
  const active = useRef<Active | null>(null);
  const penDown = useRef(false);
  /** The strokes array that is on the canvas now (a prop with the same array needs no redraw). */
  const painted = useRef<InkStroke[] | null>(null);
  const size = useRef({ w: 0, h: 0, scale: 1 });
  const pendingResize = useRef(false);
  const pendingRepaint = useRef(false);

  const context = () => canvasRef.current?.getContext('2d') ?? null;

  const paintAll = () => {
    const ctx = context();
    if (!ctx) return;
    const { w, h, scale } = size.current;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.clearRect(0, 0, w, h);
    drawInk(ctx, inkNow.current);
    if (active.current) drawStroke(ctx, active.current.stroke);
    painted.current = inkNow.current.strokes;
  };

  /** Sizes the canvas to cssW × cssH; deferred while a stroke is drawn (resizing clears the bitmap). */
  const applySize = () => {
    const c = canvasRef.current;
    if (!c) return;
    if (active.current) {
      pendingResize.current = true;
      return;
    }
    const { cssW: w, cssH: h } = live.current;
    if (w <= 0) return;
    const scale = canvasScale(window.devicePixelRatio || 1, w, h);
    const s = size.current;
    if (s.w === w && s.h === h && s.scale === scale) return;
    size.current = { w, h, scale };
    c.style.width = `${w}px`;
    c.style.height = `${h}px`;
    c.width = Math.round(w * scale);
    c.height = Math.round(h * scale);
    paintAll();
  };

  // A new ink prop: adopt it; redraw only if it is not what the canvas already shows (undo, clear, load).
  useLayoutEffect(() => {
    inkNow.current = ink;
  }, [ink]);

  useLayoutEffect(() => {
    applySize();
  }, [cssW, cssH]);

  useLayoutEffect(() => {
    if (painted.current === ink.strokes) return;
    if (active.current) pendingRepaint.current = true;
    else paintAll();
  }, [ink.strokes]);

  // The area's width (rotation, Split View, Full width).
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const measure = () => setAreaWidth(Math.floor(wrap.clientWidth));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, []);

  // A different screen (moving the window to another display) changes devicePixelRatio.
  useEffect(() => {
    const mq = window.matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`);
    const onChange = () => applySize();
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, []);

  useEffect(() => {
    const c = canvasRef.current;
    const wrap = wrapRef.current;
    if (!c || !wrap) return;

    const onDown = (e: PointerEvent) => {
      const L = live.current;
      const act = pointerAction(e.pointerType, { penDown: penDown.current, anyInput: L.anyInput, strokeActive: active.current !== null });
      if (act === 'ignore') return; // a finger scrolls; a palm is rejected
      e.preventDefault();
      const pen = e.pointerType === 'pen';
      if (pen) penDown.current = true;
      try {
        c.setPointerCapture(e.pointerId);
      } catch {
        // capture is a nicety; drawing works without it
      }
      const rect = c.getBoundingClientRect();
      const erase = L.tool === 'eraser';
      const stroke: InkStroke = { points: [pointOf(e, rect, pen)], width: erase ? ERASER_WIDTH : PEN_WIDTHS[L.tool as PenWidth] };
      if (erase) stroke.erase = true;
      active.current = { stroke, pointerId: e.pointerId, rect, pen };
      const ctx = context();
      if (ctx) drawStroke(ctx, stroke); // a dot, so a tap leaves a mark
    };

    const onMove = (e: PointerEvent) => {
      const a = active.current;
      if (!a || e.pointerId !== a.pointerId) return;
      e.preventDefault();
      const ctx = context();
      const coalesced = typeof e.getCoalescedEvents === 'function' ? e.getCoalescedEvents() : [];
      const events = coalesced.length > 0 ? coalesced : [e];
      const pts = a.stroke.points;
      for (const ev of events) {
        const p = pointOf(ev, a.rect, a.pen);
        const prev = pts[pts.length - 1];
        if (p.x === prev.x && p.y === prev.y) continue;
        pts.push(p);
        if (ctx) drawSegment(ctx, a.stroke, prev, p);
      }
    };

    const onEnd = (e: PointerEvent) => {
      if (e.pointerType === 'pen') penDown.current = false;
      const a = active.current;
      if (!a || e.pointerId !== a.pointerId) return;
      active.current = null;
      // A cancelled stroke (iPadOS can cancel one) keeps what was drawn rather than losing it.
      const L = live.current;
      const base = inkNow.current;
      const stroke = compactStroke(a.stroke);
      const strokes = [...base.strokes, stroke];
      const next: Ink = { strokes, height: nextHeight(base.height, L.cssH, lowestPoint(stroke.points)), width: L.cssW };
      inkNow.current = next;
      painted.current = strokes;
      L.onChange(next);
      L.onStrokeEnd();
      // Whatever changed during the stroke (an undo tapped by a finger, a rotation) is caught up now.
      const resize = pendingResize.current;
      const repaint = pendingRepaint.current;
      pendingResize.current = false;
      pendingRepaint.current = false;
      if (resize) applySize();
      if (repaint) paintAll();
    };

    // Native and non-passive, so preventDefault works: the Pencil never scrolls, a finger does.
    const onTouch = (e: TouchEvent) => {
      if (e.cancelable && shouldBlockTouch(e.changedTouches as unknown as ArrayLike<{ touchType?: string }>, penDown.current)) e.preventDefault();
    };
    const onSelectStart = (e: Event) => {
      if (active.current) e.preventDefault();
    };
    const noMenu = (e: Event) => e.preventDefault();

    c.addEventListener('pointerdown', onDown);
    c.addEventListener('pointermove', onMove);
    c.addEventListener('pointerup', onEnd);
    c.addEventListener('pointercancel', onEnd);
    c.addEventListener('contextmenu', noMenu);
    wrap.addEventListener('touchstart', onTouch, { passive: false });
    wrap.addEventListener('touchmove', onTouch, { passive: false });
    document.addEventListener('selectstart', onSelectStart);
    return () => {
      c.removeEventListener('pointerdown', onDown);
      c.removeEventListener('pointermove', onMove);
      c.removeEventListener('pointerup', onEnd);
      c.removeEventListener('pointercancel', onEnd);
      c.removeEventListener('contextmenu', noMenu);
      wrap.removeEventListener('touchstart', onTouch);
      wrap.removeEventListener('touchmove', onTouch);
      document.removeEventListener('selectstart', onSelectStart);
      active.current = null;
      penDown.current = false;
    };
  }, []);

  return (
    <div ref={wrapRef} className="ink-area" style={{ background: PAPER_COLOUR }}>
      <canvas
        ref={canvasRef}
        className="ink-canvas"
        data-any-input={anyInput || undefined}
        role="img"
        aria-label={`Handwritten note: ${ink.strokes.filter((s) => !s.erase).length} strokes`}
      />
    </div>
  );
}
