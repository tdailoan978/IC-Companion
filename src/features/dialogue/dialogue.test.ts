import { describe, expect, it } from 'vitest';
import { initialDialogueId, NARRATOR, otherDialogue, speakerStyles } from './dialogue.ts';

const turns = (...speakers: string[]) => speakers.map((speaker) => ({ speaker }));

describe('speakerStyles', () => {
  it('puts the first speaker on the left and the other on the right', () => {
    const s = speakerStyles(turns('林月', '马克', '林月', '马克'));
    expect(s.get('林月')).toEqual({ side: 'left', tone: 0 });
    expect(s.get('马克')).toEqual({ side: 'right', tone: 1 });
  });

  it('gives each extra speaker its own tone, kept for the whole dialogue', () => {
    const s = speakerStyles(turns('服务员', '马克', '林月', '安娜', '陈乐', '马克'));
    expect(s.get('服务员')).toEqual({ side: 'left', tone: 0 });
    expect(s.get('马克')).toEqual({ side: 'right', tone: 1 });
    expect(s.get('林月')).toEqual({ side: 'right', tone: 2 });
    expect(s.get('安娜')).toEqual({ side: 'right', tone: 3 });
    expect(s.get('陈乐')).toEqual({ side: 'right', tone: 1 });
  });

  it('centres the narrator and does not let it take the left side', () => {
    const s = speakerStyles(turns(NARRATOR, '马克', '林月'));
    expect(s.get(NARRATOR)).toEqual({ side: 'narrator', tone: 0 });
    expect(s.get('马克')).toEqual({ side: 'left', tone: 0 });
    expect(s.get('林月')).toEqual({ side: 'right', tone: 1 });
  });
});

describe('initialDialogueId', () => {
  const ds = [{ id: 'L11.d1' }, { id: 'L11.d2' }];
  it('opens the first unread dialogue', () => {
    expect(initialDialogueId(ds, {})).toBe('L11.d1');
    expect(initialDialogueId(ds, { 'L11.d1': 't' })).toBe('L11.d2');
  });
  it('opens the first when all are read, and nothing when there are none', () => {
    expect(initialDialogueId(ds, { 'L11.d1': 't', 'L11.d2': 't' })).toBe('L11.d1');
    expect(initialDialogueId([], {})).toBeUndefined();
  });
});

describe('otherDialogue', () => {
  it('offers the next dialogue, wrapping round', () => {
    const ds = [{ id: 'a' }, { id: 'b' }];
    expect(otherDialogue(ds, 'a')?.id).toBe('b');
    expect(otherDialogue(ds, 'b')?.id).toBe('a');
  });
  it('offers nothing when there is only one', () => {
    expect(otherDialogue([{ id: 'a' }], 'a')).toBeUndefined();
  });
});
