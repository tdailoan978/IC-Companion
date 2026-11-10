import { useEffect } from 'react';
import { useOutletContext, useParams } from 'react-router';
import type { Lesson } from '../../lib/content/types.ts';
import { saveLastLocation } from '../../lib/storage.ts';
import { NotFound } from '../../app/NotFound.tsx';
import { isStepKey } from './steps.ts';
import { OverviewStep } from './OverviewStep.tsx';
import { ComingSoonStep } from './ComingSoonStep.tsx';
import { StepPager } from './StepPager.tsx';

export function LessonStep() {
  const lesson = useOutletContext<Lesson>();
  const { step } = useParams();
  const valid = isStepKey(step);

  // Remember where I was, for the Continue button on Home.
  useEffect(() => {
    if (valid) void saveLastLocation({ level: lesson.level, id: lesson.id, step });
  }, [valid, lesson.level, lesson.id, step]);

  if (!valid) {
    return <NotFound title="Step not found" message={`Lesson ${lesson.lesson} has no step called "${step}".`} />;
  }
  return (
    <>
      {step === 'overview' ? <OverviewStep lesson={lesson} /> : <ComingSoonStep lesson={lesson} step={step} />}
      <StepPager lesson={lesson} step={step} />
    </>
  );
}
