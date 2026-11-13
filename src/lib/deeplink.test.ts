import { describe, expect, it } from 'vitest';
import { parseDeepLink, withDeepLink } from './deeplink.ts';

describe('deep links', () => {
  it('round-trips an item, the plan flag and the task id', () => {
    const path = withDeepLink('/lesson/2/L11/grammar', { item: 'L11.g.3', fromPlan: true, task: '2/L11:grammar:L11.g.3' });
    expect(path).toBe('/lesson/2/L11/grammar?item=L11.g.3&from=plan&task=2%2FL11%3Agrammar%3AL11.g.3');
    expect(parseDeepLink(path.split('?')[1])).toEqual({ item: 'L11.g.3', fromPlan: true, task: '2/L11:grammar:L11.g.3' });
  });
  it('leaves plain paths alone and reads nothing from an empty query', () => {
    expect(withDeepLink('/lesson/2/L11/vocab', {})).toBe('/lesson/2/L11/vocab');
    expect(parseDeepLink('')).toEqual({ fromPlan: false });
  });
});
