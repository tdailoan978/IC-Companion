import { describe, expect, it } from 'vitest';
import { restoredIndex, savedSpeakingKey } from './savedIndex.ts';

describe('saved speaking prompt', () => {
  it('is keyed per lesson', () => {
    expect(savedSpeakingKey({ level: 2, id: 'L11' })).toBe('speaking.2/L11');
  });

  it('resumes at a valid index and falls back to the first prompt', () => {
    expect(restoredIndex(2, 4)).toBe(2);
    expect(restoredIndex(4, 4)).toBe(0);
    expect(restoredIndex(-1, 4)).toBe(0);
    expect(restoredIndex(1.5, 4)).toBe(0);
    expect(restoredIndex(null, 4)).toBe(0);
    expect(restoredIndex('2', 4)).toBe(0);
  });
});
