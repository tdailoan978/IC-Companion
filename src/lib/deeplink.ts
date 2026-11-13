// Deep links from the study plan (docs/NOTES_AND_DEEP_LINKS.md section 1):
// #/lesson/2/L11/grammar?item=L11.g.3&from=plan&task=2%2FL11%3Agrammar%3AL11.g.3
// The item is in the query so links survive a reload.

import { useSearchParams } from 'react-router';

export type DeepLink = {
  /** The item to open: a grammar, dialogue, vocab-slice or exercise-set id, depending on the step. */
  item?: string;
  /** Opened from the study plan: show the "Back to Today" bar. */
  fromPlan: boolean;
  /** The plan task id, so the bar can tell when it is done and what comes next. */
  task?: string;
};

export function parseDeepLink(search: string | URLSearchParams): DeepLink {
  const q = typeof search === 'string' ? new URLSearchParams(search.startsWith('?') ? search.slice(1) : search) : search;
  const link: DeepLink = { fromPlan: q.get('from') === 'plan' };
  const item = q.get('item');
  const task = q.get('task');
  if (item) link.item = item;
  if (task) link.task = task;
  return link;
}

export function withDeepLink(path: string, link: Partial<DeepLink>): string {
  const q = new URLSearchParams();
  if (link.item) q.set('item', link.item);
  if (link.fromPlan) q.set('from', 'plan');
  if (link.task) q.set('task', link.task);
  const s = q.toString();
  return s ? `${path}?${s}` : path;
}

export function useDeepLink(): DeepLink {
  const [params] = useSearchParams();
  return parseDeepLink(params);
}
