import { useEffect, useRef } from 'react';
import { Link, Outlet, useLocation } from 'react-router';
import { ThemeControl } from './ThemeControl.tsx';
import { SaveNotice } from './SaveNotice.tsx';
import './shell.css';

/** App frame: header (safe-area aware) and the scrolling main area. */
export function Shell() {
  const { pathname } = useLocation();
  const mainRef = useRef<HTMLElement>(null);
  const isHome = pathname === '/';

  // Each new screen starts at the top.
  useEffect(() => {
    mainRef.current?.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="shell">
      <header className="app-header">
        <div className="app-header-row">
          {isHome ? (
            <span className="app-title">IC Companion</span>
          ) : (
            <Link to="/" className="app-back">
              <span aria-hidden="true">‹</span> Lessons
            </Link>
          )}
          <div className="app-header-tools">
            <ThemeControl />
            <Link to="/settings" className="app-settings" aria-label="Settings">
              <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
                <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="1.8" />
                <path
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"
                />
              </svg>
            </Link>
          </div>
        </div>
      </header>
      <main className="app-main" ref={mainRef}>
        <SaveNotice />
        <Outlet />
      </main>
    </div>
  );
}
