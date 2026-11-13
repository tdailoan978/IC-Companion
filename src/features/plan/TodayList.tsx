import { Link } from 'react-router';
import { MixedText } from '../../app/MixedText.tsx';
import type { DayPlan, PlanItem } from '../../lib/plan/schedule.ts';
import type { PlanTask } from '../../lib/plan/tasks.ts';
import { taskLink } from '../deeplink/links.ts';
import { dayLabel, lessonOf, type PlanModel } from './usePlan.ts';

/**
 * Where a task opens: exactly its item, with the "Back to Today" bar (a book task opens its
 * reading note page, which has the timer and "Done reading").
 */
export const taskPath = taskLink;

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

/** One task row: tick state, what to do (a link that opens exactly that item), lesson and minutes. */
export function TaskRow({ item }: { item: PlanItem }) {
  const { task, minutes, done } = item;
  const lesson = lessonOf(task);
  return (
    <li className="plan-item" data-done={done}>
      <div className="plan-item-row">
        <StatusMark done={done} />
        <div className="plan-item-text">
          <Link className="plan-item-label plan-item-link" to={taskPath(task)}>
            <span>
              <MixedText text={task.label} />
            </span>
          </Link>
          <span className="plan-item-meta">
            Lesson {task.lessonNo}{' '}
            <span lang="zh-Hans">{lesson.titleZh}</span> · ~{minutes} min
          </span>
        </div>
      </div>
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
          {schedule.next && <NextTask task={schedule.next} />}
        </div>
      )}
      {!day.study && schedule.next && <NextTask task={schedule.next} />}
      {schedule.open === 0 && <p className="plan-done-title">Every task in the plan is done.</p>}
    </section>
  );
}

/** "Do the next task" (optional): opens the next task in the plan. */
function NextTask({ task }: { task: PlanTask }) {
  return (
    <Link className="button button-quiet" to={taskPath(task)}>
      Do the next task
    </Link>
  );
}
