// Apple Pencil ink as vector strokes (never images), so notes and backups stay
// small. Coordinates are CSS pixels on the ink area at the width it was drawn,
// so ink can be scaled for thumbnails and print.

export type InkPoint = { x: number; y: number; p: number; t: number };
export type InkStroke = { points: InkPoint[]; width: number; erase?: true };
export type Ink = {
  strokes: InkStroke[];
  /** Height of the ink area in CSS px (it grows as I write). */
  height: number;
  /** Width of the ink area when the strokes were drawn (for scaling); 0 = unknown. */
  width: number;
};

export const PEN_WIDTHS = { thin: 1.5, medium: 3, thick: 6 } as const;
export type PenWidth = keyof typeof PEN_WIDTHS;
export const ERASER_WIDTH = 18;
export const INK_START_HEIGHT = 600;
/** Ink is always dark on a light "paper" area, in both themes and in print. */
export const INK_COLOUR = '#1f1b16';
export const PAPER_COLOUR = '#fffdf8';

export const emptyInk = (): Ink => ({ strokes: [], height: INK_START_HEIGHT, width: 0 });

const r1 = (n: number) => Math.round(n * 10) / 10;
const r2 = (n: number) => Math.round(n * 100) / 100;

/** Rounds a finished stroke for storage: 0.1 px, pressure to 0.01, time in ms from the stroke's start. */
export function compactStroke(s: InkStroke): InkStroke {
  const t0 = s.points[0]?.t ?? 0;
  const out: InkStroke = { width: s.width, points: s.points.map((pt) => ({ x: r1(pt.x), y: r1(pt.y), p: r2(pt.p), t: Math.round(pt.t - t0) })) };
  if (s.erase) out.erase = true;
  return out;
}

/** Line width at a point: pressure 0..1 scales the pen width (erasers ignore pressure). */
export const widthAt = (s: InkStroke, p: number) => (s.erase ? ERASER_WIDTH : s.width * (0.4 + p * 1.2));

function style(ctx: CanvasRenderingContext2D, s: InkStroke) {
  ctx.globalCompositeOperation = s.erase ? 'destination-out' : 'source-over';
  ctx.strokeStyle = INK_COLOUR;
  ctx.fillStyle = INK_COLOUR;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
}

/** Draws one segment (a→b) of a stroke: used live while writing, so only new ink is drawn. */
export function drawSegment(ctx: CanvasRenderingContext2D, s: InkStroke, a: InkPoint, b: InkPoint): void {
  style(ctx, s);
  ctx.lineWidth = widthAt(s, b.p);
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
  ctx.globalCompositeOperation = 'source-over';
}

export function drawStroke(ctx: CanvasRenderingContext2D, s: InkStroke): void {
  const pts = s.points;
  if (pts.length === 0) return;
  style(ctx, s);
  if (pts.length === 1) {
    ctx.beginPath();
    ctx.arc(pts[0].x, pts[0].y, widthAt(s, pts[0].p) / 2, 0, Math.PI * 2);
    ctx.fill();
  } else {
    for (let i = 1; i < pts.length; i++) {
      ctx.lineWidth = widthAt(s, pts[i].p);
      ctx.beginPath();
      ctx.moveTo(pts[i - 1].x, pts[i - 1].y);
      ctx.lineTo(pts[i].x, pts[i].y);
      ctx.stroke();
    }
  }
  ctx.globalCompositeOperation = 'source-over';
}

/**
 * Draws all ink onto a canvas whose context is already scaled for devicePixelRatio.
 * `scale` shrinks or grows it (thumbnails, print). Erasers only erase ink, not the paper,
 * so the caller paints the paper behind the canvas (CSS background).
 */
export function drawInk(ctx: CanvasRenderingContext2D, ink: Ink, scale = 1): void {
  ctx.save();
  ctx.scale(scale, scale);
  for (const s of ink.strokes) drawStroke(ctx, s);
  ctx.restore();
}

/** The lowest y any ink reaches (to crop thumbnails and print). */
export const inkBottom = (ink: Ink) => ink.strokes.reduce((m, s) => s.points.reduce((n, p) => Math.max(n, p.y), m), 0);

export const hasInk = (ink: Ink | undefined) => Boolean(ink && ink.strokes.some((s) => !s.erase));
