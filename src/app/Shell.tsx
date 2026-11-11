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
          <ThemeControl />
        </div>
      </header>
      <main className="app-main" ref={mainRef}>
        <SaveNotice />
        <Outlet />
      </main>
    </div>
  );
}
