import type { ReactNode } from 'react';

/**
 * The answer feedback line. Always rendered (empty until answered) so screen
 * readers announce it; the ✓ / ✗ mark means it never relies on colour alone.
 */
export function Feedback({ ok, children }: { ok: boolean | null; children?: ReactNode }) {
  return (
    <div className="ex-feedback" role="status" data-ok={ok === null ? undefined : ok}>
      {ok !== null && (
        <>
          <span className="ex-mark" aria-hidden="true">
            {ok ? '✓' : '✗'}
          </span>
          <span className="visually-hidden">{ok ? 'Correct.' : 'Not right.'}</span>
          <div className="ex-feedback-body">{children}</div>
        </>
      )}
    </div>
  );
}
