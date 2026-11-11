import { useState } from 'react';
import { Link } from 'react-router';
import { MixedText } from '../../app/MixedText.tsx';
import { tickBook, untickBook } from '../../lib/plan/store.ts';
import type { DayPlan, PlanItem } from '../../lib/plan/schedule.ts';
import type { PlanTask } from '../../lib/plan/tasks.ts';
import { lessonPath } from '../lesson/steps.ts';
import { dayLabel, lessonOf, type PlanModel } from './usePlan.ts';

/** Where an app task is done (book tasks are ticked on the plan page). */
export const taskPath = (task: PlanTask) => (task.kind === 'book' ? '/plan' : lessonPath(task.level, task.lessonId, task.step));

/** A done / not-done mark for items that tick themselves. */
function StatusMark({ done }: { done: boolean }) {
  return (
    <span className="plan-mark" data-done={done}>
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
        {done && <path d="M6 12.5l4 4 8-9" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />}
      </svg>
      <span className="visually-hidden">{done ? 'Done: ' : 'To do: '}</span>
    </span>
  );
}

const MINUTE_CHOICES = [
  { label: '5', minutes: 5 },
  { label: '10', minutes: 10 },
  { label: '15', minutes: 15 },
  { label: '20+', minutes: 25 },
];

/** One task row: tick state, what to do (a link to its screen), lesson and minutes. */
export function TaskRow({ item }: { item: PlanItem }) {
  const { task, minutes, done } = item;
  const [asking, setAsking] = useState(false);
  const lesson = lessonOf(task);
  const isBook = task.kind === 'book';

  return (
    <li className="plan-item" data-done={done}>
      <div className="plan-item-row">
        {isBook ? (
          <button
            type="button"
            className="plan-tick"
            aria-pressed={done}
            aria-expanded={done ? undefined : asking}
            aria-label={done ? `Read, tap to untick: ${task.label}` : `Tick when read: ${task.label}`}
            onClick={() => (done ? void untickBook(task.id) : setAsking((a) => !a))}
          >
            <StatusMark done={done} />
          </button>
        ) : (
          <StatusMark done={done} />
        )}
        <div className="plan-item-text">
          {isBook ? (
            <span className="plan-item-label">
              <MixedText text={task.label} />
            </span>
          ) : (
            <Link className="plan-item-label plan-item-link" to={taskPath(task)}>
              <span>
                <MixedText text={task.label} />
              </span>
            </Link>
          )}
          <span className="plan-item-meta">
            Lesson {task.lessonNo}{' '}
            <span lang="zh-Hans">{lesson.titleZh}</span> · ~{minutes} min
          </span>
        </div>
      </div>
      {asking && !done && (
        <div className="plan-minutes" role="group" aria-label={`How long did it take? ${task.label}`}>
          <span className="plan-minutes-q">How long did it take?</span>
          <div className="plan-minutes-buttons">
            {MINUTE_CHOICES.map((c) => (
              <button
                key={c.label}
                type="button"
                className="button button-quiet plan-minutes-choice"
                aria-label={`${c.label} minutes`}
                onClick={() => {
                  setAsking(false);
                  void tickBook(task, c.minutes, lesson);
                }}
              >
                {c.label} min
              </button>
            ))}
            <button type="button" className="button button-quiet plan-minutes-cancel" onClick={() => setAsking(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </li>
  );
}

export function ReviewRow({ review }: { review: NonNullable<DayPlan['review']> }) {
  return (
    <li className="plan-item" data-done={review.done}>
      <div className="plan-item-row">
        <StatusMark done={review.done} />
        <div className="plan-item-text">
          {review.done ? (
            <span className="plan-item-label">Review: no cards due</span>
          ) : (
            <Link className="plan-item-label plan-item-link" to="/review">
              Review {review.cards} {review.cards === 1 ? 'card' : 'cards'}
            </Link>
          )}
          <span className="plan-item-meta">{review.done ? (review.minutes > 0 ? `${review.minutes} min today` : 'Ticks itself when none are due') : `~${review.minutes} min`}</span>
        </div>
      </div>
    </li>
  );
}

/** Today's checklist with its totals, "done for today" and rest-day states. */
export function TodayList({ plan }: { plan: PlanModel }) {
  const { schedule, summary, settings, today } = plan;
  const day = schedule.days[0];
  const nextStudy = schedule.days.find((d) => d.day > today)?.day;

  return (
    <section className="plan-section" aria-labelledby="plan-today">
      <h2 id="plan-today">
        Today <span className="plan-heading-date">· {dayLabel(today)}</span>
      </h2>

      {!day.study && (
        <p className="notice">
          Rest day: today is not one of your study days.
          {nextStudy ? ` Next study day: ${dayLabel(nextStudy, today)}.` : ' Choose your study days in Plan settings below.'}
        </p>
      )}

      {day.study && (
        <p className="plan-summary">
          <strong>
            {summary.done} of {summary.total} done
          </strong>
          {summary.leftMin > 0 && <> · ~{summary.leftMin} min left</>} · {day.minutes} of {settings.dailyCapMin} min planned
        </p>
      )}

      {(day.review || day.items.length > 0) && (
        <ul className="plan-list">
          {day.review && <ReviewRow review={day.review} />}
          {day.items.map((item) => (
            <TaskRow key={item.task.id} item={item} />
          ))}
        </ul>
      )}

      {day.study && summary.finished && (
        <div className="plan-done">
          <p className="plan-done-title">Done for today.</p>
          {schedule.next && <NextTask task={schedule.next} plan={plan} />}
        </div>
      )}
      {!day.study && schedule.next && <NextTask task={schedule.next} plan={plan} />}
      {schedule.open === 0 && <p className="plan-done-title">Every task in the plan is done.</p>}
    </section>
  );
}

/** "Do the next task" (optional): the next task in the plan, ready to start or tick. */
function NextTask({ task, plan }: { task: PlanTask; plan: PlanModel }) {
  const [show, setShow] = useState(false);
  const minutes = plan.schedule.days.flatMap((d) => d.items).find((i) => i.task.id === task.id)?.minutes ?? 0;
  if (task.kind !== 'book' && !show) {
    return (
      <Link className="button button-quiet" to={taskPath(task)}>
        Do the next task
      </Link>
    );
  }
  if (!show) {
    return (
      <button type="button" className="button button-quiet" onClick={() => setShow(true)}>
        Do the next task
      </button>
    );
  }
  return (
    <ul className="plan-list plan-list-next" aria-label="Next task">
      <TaskRow item={{ task, minutes, done: false }} />
    </ul>
  );
}
