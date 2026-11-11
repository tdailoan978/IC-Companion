import { updateSettings } from '../../lib/settings.ts';
import { ESTIMATE_KINDS, ESTIMATE_LABELS, MIN_SAMPLES, type EstimateKind, type Estimate } from '../../lib/plan/estimates.ts';
import { PROPOSAL_AFTER_DAYS } from '../../lib/plan/deadline.ts';
import { dayLabel, longDayLabel, type PlanModel } from './usePlan.ts';

const round1 = (n: number) => Math.round(n * 10) / 10;

function estimateText(kind: EstimateKind, e: Estimate): string {
  const value = kind === 'review' ? `${Math.round(e.minPerUnit * 60)} s` : `${round1(e.minPerUnit)} min`;
  return value;
}

function sourceText(e: Estimate): string {
  if (e.measured) return `measured, median of ${e.samples}`;
  return e.samples > 0 ? `default (${e.samples} of ${MIN_SAMPLES} timings)` : 'default';
}

export function FinishSection({ plan }: { plan: PlanModel }) {
  const { schedule, deadline, today, estimates, settings, futureReviewMin } = plan;
  const finish = schedule.finish;
  const dismiss = () => void updateSettings({ deadlineProposalDismissed: today });

  return (
    <section className="plan-section" aria-labelledby="plan-finish">
      <h2 id="plan-finish">Finish</h2>
      <p className="plan-finish-date">
        {schedule.open === 0 ? (
          <>Everything is done{finish ? `, last task ${dayLabel(finish, today)}` : ''}.</>
        ) : finish ? (
          <>
            Projected finish: <strong>{longDayLabel(finish)}</strong>
            <span className="muted">
              {' '}
              · {schedule.open} tasks left at up to {settings.dailyCapMin} min a study day
            </span>
          </>
        ) : (
          <>No finish can be projected: choose at least one study day.</>
        )}
      </p>

      {deadline.kind === 'propose' && (
        <div className="plan-callout" role="status">
          <p>
            From your timings so far, you would finish on <strong>{longDayLabel(deadline.date)}</strong>. Use it as your finish date?
          </p>
          <div className="plan-callout-actions">
            <button type="button" className="button" onClick={() => void updateSettings({ deadline: deadline.date })}>
              Accept
            </button>
            <button type="button" className="button button-quiet" onClick={dismiss}>
              Not now
            </button>
          </div>
        </div>
      )}

      {deadline.kind === 'late' && (
        <div className="plan-callout plan-callout-warn" role="status">
          <p>
            Your finish date is {longDayLabel(deadline.deadline)}, but at up to {settings.dailyCapMin} min a study day the plan now ends on{' '}
            <strong>{longDayLabel(deadline.finish)}</strong>.
          </p>
          {deadline.prompt && (
            <div className="plan-callout-actions">
              <button type="button" className="button" onClick={() => void updateSettings({ deadline: deadline.finish })}>
                Move it to {dayLabel(deadline.finish, today)}
              </button>
              <button type="button" className="button button-quiet" onClick={dismiss}>
                Dismiss
              </button>
            </div>
          )}
        </div>
      )}

      {deadline.kind === 'on-track' && (
        <p>
          Finish date {longDayLabel(deadline.deadline)}: <strong>on track</strong>.
        </p>
      )}

      {deadline.kind === 'none' && (
        <p className="muted">
          No finish date set.{' '}
          {deadline.daysToGo > 0
            ? `After ${PROPOSAL_AFTER_DAYS} days of study the plan will suggest one (${deadline.daysToGo} more to go). You can also set one in Plan settings.`
            : 'You can set one in Plan settings.'}
        </p>
      )}

      <h3 className="plan-subhead">Time estimates</h3>
      <table className="plan-estimates">
        <thead>
          <tr>
            <th scope="col">Task</th>
            <th scope="col">Time</th>
            <th scope="col">Source</th>
          </tr>
        </thead>
        <tbody>
          {ESTIMATE_KINDS.map((kind) => {
            const e = estimates[kind];
            return (
              <tr key={kind} data-measured={e.measured}>
                <th scope="row">{ESTIMATE_LABELS[kind]}</th>
                <td>{estimateText(kind, e)}</td>
                <td>{sourceText(e)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="plan-field-note">
        Each estimate switches to the median of your own timings after {MIN_SAMPLES} first-time runs. Future study days keep {futureReviewMin} min for review
        (the median of your daily review time over the last week, or 5 min until there is some; never more than half the day).
      </p>
    </section>
  );
}
