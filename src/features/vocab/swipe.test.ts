import { describe, expect, it } from 'vitest';
import { MAX_SWIPE, MIN_SWIPE, isDrag, swipeProgress, swipeResult, swipeThreshold } from './swipe.ts';

describe('flashcard swipe', () => {
  it('needs a quarter of the card width, within limits', () => {
    expect(swipeThreshold(400)).toBe(100);
    expect(swipeThreshold(200)).toBe(MIN_SWIPE);
    expect(swipeThreshold(1000)).toBe(MAX_SWIPE);
  });

  it('treats a tiny movement as a tap', () => {
    expect(swipeResult(0, 0, 400)).toBe('tap');
    expect(swipeResult(6, -5, 400)).toBe('tap');
    expect(isDrag(6, 5)).toBe(false);
    expect(isDrag(12, 0)).toBe(true);
  });

  it('right is "Got it", left is "Again"', () => {
    expect(swipeResult(120, 10, 400)).toBe('got-it');
    expect(swipeResult(-120, 10, 400)).toBe('again');
  });

  it('springs back when the drag is too short', () => {
    expect(swipeResult(60, 0, 400)).toBe('cancel');
    expect(swipeResult(-99, 0, 400)).toBe('cancel');
  });

  it('springs back when the drag is mostly vertical', () => {
    expect(swipeResult(110, 200, 400)).toBe('cancel');
  });

  it('reports how close a drag is to deciding', () => {
    expect(swipeProgress(50, 400)).toBe(0.5);
    expect(swipeProgress(-300, 400)).toBe(1);
  });
});
