import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseLesson } from './content/parse.ts';
import { applyAutoTicks, completion, emptyProgress, finishedSteps, type LessonProgress } from './progress.ts';

const L11 = parseLesson(readFileSync(new URL('../../content/level-2/L11.md', import.meta.url), 'utf8'), 'L11.md');
const T = '2026-11-11T10:00:00.000Z';

function allDone(): LessonProgress {
  const p = emptyProgress();
  p.vocabParts = { '1': T, '2': T };
  for (const g of L11.grammar) p.grammarDone[g.id] = T;
  for (const d of L11.dialogues) p.dialoguesDone[d.id] = T;
  for (const e of L11.exercises) p.exerciseSets[e.id] = { score: 1, total: 1, at: T };
  p.speakingDone = T;
  return p;
}

describe('lesson progress', () => {
  it('finishes nothing for a new lesson', () => {
    expect(finishedSteps(L11, emptyProgress()).size).toBe(0);
    expect(completion(emptyProgress())).toBe(0);
  });

  it('needs both vocabulary parts, every grammar point, both dialogues and all four sets', () => {
    const p = allDone();
    expect([...finishedSteps(L11, p)].sort()).toEqual(['dialogues', 'exercises', 'grammar', 'speaking', 'vocab']);
    delete p.vocabParts['2'];
    delete p.grammarDone[L11.grammar[0].id];
    delete p.exerciseSets[L11.exercises[3].id];
    expect([...finishedSteps(L11, p)].sort()).toEqual(['dialogues', 'speaking']);
  });

  it('auto-ticks finished steps but never overview, and respects a manual untick', () => {
    const p = applyAutoTicks(L11, { ...allDone(), manualOff: { grammar: true } }, T);
    expect(Object.keys(p.steps).sort()).toEqual(['dialogues', 'exercises', 'speaking', 'vocab']);
    expect(completion(p)).toBeCloseTo(4 / 6);
  });

  it('keeps the first tick time', () => {
    const first = applyAutoTicks(L11, allDone(), T);
    const again = applyAutoTicks(L11, first, '2026-12-01T00:00:00.000Z');
    expect(again.steps.vocab).toBe(T);
  });
});
