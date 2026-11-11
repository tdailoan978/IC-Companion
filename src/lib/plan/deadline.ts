// Finish date for the volume (PLAN.md 9.1): no deadline up front; after ten
// days of real timings the plan proposes its projected finish, and warns when
// a deadline I set can no longer be met under the daily cap.

import type { Activity } from '../progress.ts';
import { toDay, type Day } from '../days.ts';

/** Distinct days needed in the activity log before a finish date is proposed. */
export const PROPOSAL_AFTER_DAYS = 10;

export const activityDayCount = (log: Activity[]): number => new Set(log.map((a) => toDay(new Date(a.at)))).size;

export type DeadlineStatus =
  /** No deadline and nothing to propose yet. */
  | { kind: 'none'; daysToGo: number }
  /** No deadline: propose the projected finish. */
  | { kind: 'propose'; date: Day }
  | { kind: 'on-track'; deadline: Day; finish: Day | null }
  /** Projected finish is after the deadline; `prompt` offers the projected date (unless dismissed today). */
  | { kind: 'late'; deadline: Day; finish: Day; prompt: boolean };

/**
 * `dismissed` is settings.deadlineProposalDismissed: "Not now" on a proposal or on the late
 * warning's suggested date hides that offer for the rest of the day.
 */
export function deadlineStatus(args: { deadline: Day | null; dismissed: Day | null; finish: Day | null; activityDays: number; today: Day }): DeadlineStatus {
  const { deadline, dismissed, finish, activityDays, today } = args;
  if (deadline) {
    if (finish && finish > deadline) return { kind: 'late', deadline, finish, prompt: dismissed !== today };
    return { kind: 'on-track', deadline, finish };
  }
  if (finish && activityDays >= PROPOSAL_AFTER_DAYS && dismissed !== today) return { kind: 'propose', date: finish };
  return { kind: 'none', daysToGo: Math.max(0, PROPOSAL_AFTER_DAYS - activityDays) };
}
