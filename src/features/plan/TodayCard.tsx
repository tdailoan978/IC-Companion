import { Link } from 'react-router';
import { MixedText } from '../../app/MixedText.tsx';
import { taskLink } from '../deeplink/links.ts';
import { dayLabel, usePlan } from './usePlan.ts';
import './plan.css';

/** Home: "Today · 2 of 5 done · ~18 min left", the next task, and a link to the plan. */
export function TodayCard() {
  const plan = usePlan();
  if (!plan.ready) return null;
  const { settings, schedule, summary, today } = plan;

  if (!settings.planStart) {
    return (
      <section className="today-card" aria-label="Study plan">
        <p className="today-card-line">Plan your weeks: book reading and app steps, fitted to your study days.</p>
        <Link className="button" to="/plan">
          Set up your study plan
        </Link>
      </section>
    );
  }

  const day = schedule.days[0];
  if (!day.study) {
    const nextStudy = schedule.days.find((d) => d.day > today)?.day;
    return (
      <section className="today-card" aria-label="Study plan">
        <p className="today-card-line">
          <strong>Rest day</strong>
          {nextStudy && <> · next study day {dayLabel(nextStudy, today)}</>}
        </p>
        <Link className="button button-quiet" to="/plan">
          Open the plan
        </Link>
      </section>
    );
  }

  const next = summary.next;
  return (
    <section className="today-card" aria-label="Study plan">
      <p className="today-card-line">
        <strong>Today</strong> · {summary.done} of {summary.total} done
        {summary.leftMin > 0 ? <> · ~{summary.leftMin} min left</> : summary.finished ? <> · done for today</> : null}
      </p>
      <div className="today-card-actions">
        {next && !summary.finished && (
          <Link className="button today-card-next" to={next.kind === 'review' ? '/review' : taskLink(next.task)}>
            <span className="today-card-kicker">Next</span>
            <span>
              {next.kind === 'review' ? (
                `Review ${next.cards} ${next.cards === 1 ? 'card' : 'cards'}`
              ) : (
                <>
                  L{next.task.lessonNo} · <MixedText text={next.task.label} />
                </>
              )}
            </span>
          </Link>
        )}
        <Link className="button button-quiet" to="/plan">
          {summary.finished ? 'See the plan' : 'Today’s plan'}
        </Link>
      </div>
    </section>
  );
}
