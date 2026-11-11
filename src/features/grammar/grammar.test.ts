import { describe, expect, it } from 'vitest';
import { paragraphs, patternPieces, understoodCount } from './grammar.ts';

const code = (text: string) => ({ text, code: true });
const join = (text: string) => ({ text, code: false });

describe('patternPieces', () => {
  it('keeps a single part as one highlighted line', () => {
    expect(patternPieces([code('多 / 少 + Verb + Object')])).toEqual([{ kind: 'code', text: '多 / 少 + Verb + Object' }]);
  });

  it('keeps the joining words between parts', () => {
    expect(patternPieces([code('Subject + 刚 + Verb'), join('compared with'), code('刚才 + Verb')])).toEqual([
      { kind: 'code', text: 'Subject + 刚 + Verb' },
      { kind: 'join', text: 'compared with' },
      { kind: 'code', text: '刚才 + Verb' },
    ]);
  });

  it('drops leading punctuation from joining words', () => {
    expect(patternPieces([code('A'), join('; negative:'), code('B')])[1]).toEqual({ kind: 'join', text: 'negative:' });
    expect(patternPieces([code('A'), join('· with an object:'), code('B')])[1]).toEqual({ kind: 'join', text: 'with an object:' });
  });

  it('drops bare separators and empty parts', () => {
    expect(patternPieces([code('A'), join(' · '), code('B'), join(''), code('  ')])).toEqual([
      { kind: 'code', text: 'A' },
      { kind: 'code', text: 'B' },
    ]);
  });
});

describe('patternPieces: several patterns in one part', () => {
  it('splits a part on " · " into one line each', () => {
    expect(patternPieces([code('modifier + 的 + noun · verb + 得 + comment')])).toEqual([
      { kind: 'code', text: 'modifier + 的 + noun' },
      { kind: 'code', text: 'verb + 得 + comment' },
    ]);
  });
});

describe('paragraphs', () => {
  it('splits on blank lines and joins wrapped lines', () => {
    expect(paragraphs('One line\nwrapped.\n\nTwo.\n\n  ')).toEqual(['One line wrapped.', 'Two.']);
  });
});

describe('understoodCount', () => {
  it('counts only this lesson’s points that are done', () => {
    const grammar = [{ id: 'L11.g.1' }, { id: 'L11.g.2' }, { id: 'L11.g.3' }];
    expect(understoodCount(grammar, { 'L11.g.1': 't', 'L11.g.3': 't', 'L12.g.1': 't' })).toBe(2);
  });
});
