import { useEffect } from 'react';
import { useOutletContext, useParams } from 'react-router';
import type { Lesson } from '../../lib/content/types.ts';
import { saveLastLocation } from '../../lib/storage.ts';
import { stopSpeech } from '../../lib/speech.ts';
import { NotFound } from '../../app/NotFound.tsx';
import { isStepKey } from './steps.ts';
import { OverviewStep } from './OverviewStep.tsx';
import { VocabStep } from '../vocab/VocabStep.tsx';
import { GrammarStep } from '../grammar/GrammarStep.tsx';
import { DialogueStep } from '../dialogue/DialogueStep.tsx';
import { ExercisesStep } from '../exercises/ExercisesStep.tsx';
import { SpeakingStep } from '../speaking/SpeakingStep.tsx';
import { SpeechNotice } from '../../app/SpeechNotice.tsx';
import { StepDone } from '../../app/StepDone.tsx';
import { StepPager } from './StepPager.tsx';

/** How each step ticks itself; shown under the button until it is ticked. */
const DONE_HINTS: Record<string, string> = {
  overview: 'Tick this once you have looked over the objectives and the book pages.',
  vocab: 'Ticks itself when you finish the flashcards for Part 1 and Part 2.',
  grammar: 'Ticks itself when every grammar point is marked “Got it”.',
  dialogues: 'Ticks itself when you have read both dialogues to the end.',
  exercises: 'Ticks itself when all four exercise sets are finished.',
  speaking: 'Ticks itself after the last speaking prompt.',
};

export function LessonStep() {
  const lesson = useOutletContext<Lesson>();
  const { step } = useParams();
  const valid = isStepKey(step);

  // Remember where I was, for the Continue button on Home.
  // Leaving a step (or the lesson) stops any sentence still being read.
  useEffect(() => () => stopSpeech(), [lesson.id, step]);

  useEffect(() => {
    if (valid) void saveLastLocation({ level: lesson.level, id: lesson.id, step });
  }, [valid, lesson.level, lesson.id, step]);

  if (!valid) {
    return <NotFound title="Step not found" message={`Lesson ${lesson.lesson} has no step called "${step}".`} />;
  }
  return (
    <>
      {step !== 'overview' && <SpeechNotice />}
      {/* key: a new lesson starts each screen fresh (flashcard position, exercise state). */}
      {step === 'overview' && <OverviewStep key={lesson.id} lesson={lesson} />}
      {step === 'vocab' && <VocabStep key={lesson.id} lesson={lesson} />}
      {step === 'grammar' && <GrammarStep key={lesson.id} lesson={lesson} />}
      {step === 'dialogues' && <DialogueStep key={lesson.id} lesson={lesson} />}
      {step === 'exercises' && <ExercisesStep key={lesson.id} lesson={lesson} />}
      {step === 'speaking' && <SpeakingStep key={lesson.id} lesson={lesson} />}
      <StepDone key={`${lesson.id}-${step}`} lesson={lesson} step={step} hint={DONE_HINTS[step]} />
      <StepPager lesson={lesson} step={step} />
    </>
  );
}
