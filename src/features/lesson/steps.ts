// The six steps of a lesson, in order (PLAN.md section 5.2).

import type { StepKey } from '../../lib/progress.ts';

export type { StepKey };

export type StepInfo = {
  key: StepKey;
  label: string;
  labelZh: string;
};

export const STEPS: StepInfo[] = [
  { key: 'overview', label: 'Overview', labelZh: '概览' },
  { key: 'vocab', label: 'Vocabulary', labelZh: '生词' },
  { key: 'grammar', label: 'Grammar', labelZh: '语法' },
  { key: 'dialogues', label: 'Dialogues', labelZh: '课文' },
  { key: 'exercises', label: 'Exercises', labelZh: '练习' },
  { key: 'speaking', label: 'Speaking', labelZh: '说话' },
];

export const isStepKey = (value: string | undefined): value is StepKey =>
  STEPS.some((s) => s.key === value);

export const stepInfo = (key: StepKey): StepInfo => STEPS.find((s) => s.key === key)!;

export const lessonPath = (level: number, id: string, step: StepKey = 'overview') =>
  `/lesson/${level}/${id}/${step}`;
