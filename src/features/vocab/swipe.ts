// Swipe decisions for the flashcard (pointer events, no library). Pure so the
// thresholds are tested: a small movement is a tap (flip), a long enough
// mostly-sideways drag is "Got it" (right) or "Again" (left), anything in
// between springs back.

/** Movement under this many px still counts as a tap. */
export const TAP_SLOP = 10;
/** Never ask for less than this, so a sloppy tap on a narrow card is not a swipe. */
export const MIN_SWIPE = 80;
/** ... and never more than this, so a wide iPad card does not need an arm's length. */
export const MAX_SWIPE = 160;

export type SwipeResult = 'tap' | 'got-it' | 'again' | 'cancel';

/** Distance a drag must cover: a quarter of the card's width, within MIN_SWIPE..MAX_SWIPE. */
export function swipeThreshold(cardWidth: number): number {
  return Math.min(MAX_SWIPE, Math.max(MIN_SWIPE, cardWidth * 0.25));
}

/** Whether a press has moved far enough to be a drag rather than a tap. */
export const isDrag = (dx: number, dy: number) => Math.hypot(dx, dy) > TAP_SLOP;

export function swipeResult(dx: number, dy: number, cardWidth: number): SwipeResult {
  if (!isDrag(dx, dy)) return 'tap';
  if (Math.abs(dx) < swipeThreshold(cardWidth) || Math.abs(dx) < Math.abs(dy)) return 'cancel';
  return dx > 0 ? 'got-it' : 'again';
}

/** 0-1: how close the drag is to deciding, for the "Got it" / "Again" tint. */
export const swipeProgress = (dx: number, cardWidth: number) => Math.min(1, Math.abs(dx) / swipeThreshold(cardWidth));
