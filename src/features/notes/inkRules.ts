// Pure rules for the ink area (InkCanvas.tsx), kept apart so they can be tested.

import { widthAt, type Ink, type InkPoint } from '../../lib/ink.ts';

/** Height added when writing nears the bottom of the ink area. */
export const GROW_BY = 400;
/** "Near the bottom": a stroke whose lowest point is within this many px of it. */
export const GROW_MARGIN = 150;
/** iOS Safari refuses canvases over about 16.7 million pixels; stay under it. */
export const MAX_CANVAS_PIXELS = 16_000_000;

export type PointerState = {
  /** The Apple Pencil is touching the ink area. */
  penDown: boolean;
  /** "Draw with finger or mouse" (for testing on a Mac). Off by default. */
  anyInput: boolean;
  /** A stroke is being drawn already (one stroke at a time). */
  strokeActive: boolean;
};

/**
 * What a new pointer on the ink area does: only the Pencil draws, unless "finger or mouse" is on.
 * Palm rejection: a touch while the pen is down is ignored. Ignored touches scroll the page.
 */
export function pointerAction(pointerType: string, s: PointerState): 'draw' | 'ignore' {
  if (s.strokeActive) return 'ignore';
  if (pointerType === 'pen') return 'draw';
  if (s.penDown) return 'ignore';
  return s.anyInput && (pointerType === 'touch' || pointerType === 'mouse') ? 'draw' : 'ignore';
}

/**
 * Whether a native touchstart/touchmove must be cancelled so the page does not scroll:
 * a Pencil touch (touchType 'stylus') never scrolls, and neither does a palm while the pen is down.
 * A finger on its own still scrolls.
 */
export function shouldBlockTouch(touches: ArrayLike<{ touchType?: string }>, penDown: boolean): boolean {
  if (penDown) return true;
  for (let i = 0; i < touches.length; i++) if (touches[i].touchType === 'stylus') return true;
  return false;
}

/**
 * The ink area's height after a stroke: it grows by GROW_BY (as often as needed) when the stroke's
 * lowest point came within GROW_MARGIN px of the bottom. `shown` is the height on screen, which can
 * be taller than the saved height on a tall screen; writing in that extra space keeps it.
 */
export function nextHeight(height: number, shown: number, lowestY: number): number {
  let h = height;
  if (lowestY <= h - GROW_MARGIN) return h;
  h = Math.max(h, shown);
  while (lowestY > h - GROW_MARGIN) h += GROW_BY;
  return h;
}

export const lowestPoint = (points: InkPoint[]) => points.reduce((m, p) => Math.max(m, p.y), 0);

/** The right edge of the ink (so a note written at full width can be scrolled sideways when narrower). */
export function inkRight(ink: Pick<Ink, 'strokes'>): number {
  let right = 0;
  for (const s of ink.strokes) {
    if (s.erase) continue;
    for (const p of s.points) right = Math.max(right, p.x + widthAt(s, p.p) / 2);
  }
  return Math.ceil(right);
}

/** Bitmap pixels per CSS px: the screen's devicePixelRatio, lowered only for very tall notes. */
export function canvasScale(dpr: number, cssWidth: number, cssHeight: number, maxPixels = MAX_CANVAS_PIXELS): number {
  const d = dpr > 0 ? dpr : 1;
  const area = cssWidth * cssHeight;
  if (area <= 0) return d;
  return Math.min(d, Math.sqrt(maxPixels / area));
}
