import { useMemo } from 'react';
import { Link } from 'react-router';
import { MixedText } from '../../app/MixedText.tsx';
import { useDeepLink } from '../../lib/deeplink.ts';
import { usePlan } from '../plan/usePlan.ts';
import { nextForBar, nextLink } from './links.ts';
import './return-bar.css';

/**
 * "‹ Back to Today" bar for screens opened from the study plan (?from=plan). Once the task in
 * ?task= is done it also offers the next open task of today. Nothing navigates by itself.
 * Renders nothing when the screen was not opened from the plan.
 */
export function ReturnBar() {
  const { fromPlan, task } = useDeepLink();
  if (!fromPlan) return null;
  return <PlanReturnBar taskId={task} />;
}

function PlanReturnBar({ taskId }: { taskId?: string }) {
  const plan = usePlan();
  const order = useMemo(() => new Map(plan.tasks.map((t, i) => [t.id, i])), [plan.tasks]);
  const done = Boolean(plan.ready && taskId && plan.done.has(taskId));
  const next = done ? nextForBar(plan.schedule.days[0], taskId, (id) => order.get(id) ?? -1) : null;

  return (
    <nav className="return-bar" aria-label="Study plan">
      <Link className="return-bar-back" to="/plan" aria-label="Back to Today">
        <span aria-hidden="true">‹</span>
        <span>
          <span className="return-bar-back-word">Back to </span>Today
        </span>
      </Link>
      <span className="return-bar-next" aria-live="polite">
        {done &&
          (next ? (
            <Link className="return-bar-next-link" to={nextLink(next)}>
              <span className="return-bar-kicker">Next:</span>
              <span className="return-bar-label">
                {next.kind === 'review' ? `Review ${next.cards} ${next.cards === 1 ? 'card' : 'cards'}` : <MixedText text={next.task.label} />}
              </span>
              <span aria-hidden="true">›</span>
            </Link>
          ) : (
            <span className="return-bar-done">
              <span aria-hidden="true">✓ </span>Done for today
            </span>
          ))}
      </span>
    </nav>
  );
}
