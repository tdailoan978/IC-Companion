import { FinishSection } from './FinishSection.tsx';
import { PlanSettingsSection, PlanSetup } from './PlanSettings.tsx';
import { TodayList } from './TodayList.tsx';
import { usePlan } from './usePlan.ts';
import { MilestoneSummary, WeekView } from './WeekView.tsx';
import './plan.css';

/** #/plan: today's checklist, the week, milestones, the finish date and plan settings (PLAN.md 9.1). */
export function PlanPage() {
  const plan = usePlan();

  if (!plan.ready) {
    return (
      <div className="page plan-page">
        <h1>Study plan</h1>
        <p className="muted" role="status">
          Loading…
        </p>
      </div>
    );
  }

  if (!plan.settings.planStart) {
    return (
      <div className="page plan-page">
        <h1>Study plan</h1>
        <PlanSetup today={plan.today} />
      </div>
    );
  }

  return (
    <div className="page plan-page">
      <h1>Study plan</h1>
      {/* One column in reading order; from 900px the week sits in a right-hand column (plan.css). */}
      <div className="plan-grid">
        <div className="plan-area-today">
          <TodayList plan={plan} />
        </div>
        <div className="plan-area-week">
          <WeekView plan={plan} />
        </div>
        <div className="plan-area-finish">
          <FinishSection plan={plan} />
        </div>
        <div className="plan-area-milestones">
          <MilestoneSummary plan={plan} />
        </div>
        <div className="plan-area-settings">
          <PlanSettingsSection key={plan.settings.deadline ?? ''} settings={plan.settings} today={plan.today} />
        </div>
      </div>
    </div>
  );
}
