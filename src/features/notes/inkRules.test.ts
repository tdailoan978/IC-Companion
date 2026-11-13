import { describe, expect, it } from 'vitest';
import { canvasScale, inkRight, lowestPoint, nextHeight, pointerAction, shouldBlockTouch } from './inkRules.ts';

const idle = { penDown: false, anyInput: false, strokeActive: false };

describe('pointerAction', () => {
  it('draws only with the Pencil by default', () => {
    expect(pointerAction('pen', idle)).toBe('draw');
    expect(pointerAction('touch', idle)).toBe('ignore');
    expect(pointerAction('mouse', idle)).toBe('ignore');
  });

  it('ignores a palm while the pen is down, even with finger drawing on', () => {
    expect(pointerAction('touch', { penDown: true, anyInput: true, strokeActive: false })).toBe('ignore');
    expect(pointerAction('touch', { penDown: true, anyInput: false, strokeActive: true })).toBe('ignore');
  });

  it('lets finger and mouse draw when the test option is on', () => {
    expect(pointerAction('touch', { ...idle, anyInput: true })).toBe('draw');
    expect(pointerAction('mouse', { ...idle, anyInput: true })).toBe('draw');
    expect(pointerAction('unknown', { ...idle, anyInput: true })).toBe('ignore');
  });

  it('draws one stroke at a time', () => {
    expect(pointerAction('pen', { ...idle, strokeActive: true })).toBe('ignore');
    expect(pointerAction('mouse', { ...idle, anyInput: true, strokeActive: true })).toBe('ignore');
  });
});

describe('shouldBlockTouch', () => {
  it('blocks scrolling for the Pencil only', () => {
    expect(shouldBlockTouch([{ touchType: 'stylus' }], false)).toBe(true);
    expect(shouldBlockTouch([{ touchType: 'direct' }], false)).toBe(false);
    expect(shouldBlockTouch([{}], false)).toBe(false);
    expect(shouldBlockTouch([{ touchType: 'direct' }, { touchType: 'stylus' }], false)).toBe(true);
  });

  it('blocks a palm while the pen is down', () => {
    expect(shouldBlockTouch([{ touchType: 'direct' }], true)).toBe(true);
  });
});

describe('nextHeight', () => {
  it('keeps the height while writing stays clear of the bottom', () => {
    expect(nextHeight(600, 600, 300)).toBe(600);
    expect(nextHeight(600, 600, 450)).toBe(600);
  });

  it('grows by 400 px when a stroke comes within 150 px of the bottom', () => {
    expect(nextHeight(600, 600, 451)).toBe(1000);
    expect(nextHeight(600, 600, 599)).toBe(1000);
  });

  it('grows as often as needed when a stroke ran off the bottom', () => {
    expect(nextHeight(600, 600, 900)).toBe(1400);
  });

  it('keeps the extra space shown on a tall screen once it is written in', () => {
    expect(nextHeight(600, 1000, 700)).toBe(1000);
    expect(nextHeight(600, 1000, 900)).toBe(1400);
    expect(nextHeight(600, 1000, 200)).toBe(600);
  });
});

describe('ink geometry', () => {
  it('finds the lowest point and the right edge', () => {
    const pts = [
      { x: 10, y: 20, p: 0.5, t: 0 },
      { x: 200, y: 80, p: 0.5, t: 5 },
    ];
    expect(lowestPoint(pts)).toBe(80);
    // medium pen at pressure 0.5: width 3 * (0.4 + 0.6) = 3, half = 1.5
    expect(inkRight({ strokes: [{ points: pts, width: 3 }] })).toBe(202);
    expect(inkRight({ strokes: [{ points: [{ x: 900, y: 1, p: 0.5, t: 0 }], width: 3, erase: true }] })).toBe(0);
  });

  it('keeps the screen scale unless the canvas would be too big', () => {
    expect(canvasScale(2, 1000, 1000)).toBe(2);
    expect(canvasScale(0, 100, 100)).toBe(1);
    const s = canvasScale(2, 1000, 8000);
    expect(s).toBeLessThan(2);
    expect(1000 * s * 8000 * s).toBeLessThanOrEqual(16_000_000 + 1);
  });
});
