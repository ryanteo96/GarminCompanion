import { useEffect, useRef } from 'react';
import { Navigate, useParams } from 'react-router';
import { Boot } from './components/Boot.js';
import { Dashboard } from './components/Dashboard.js';
import { ErrorGate } from './components/ErrorGate.js';
import { LoginGate } from './components/LoginGate.js';
import { useStore, type View } from './store.js';
import { APP_TITLE, isTab, TAB_NAMES } from './tabs.js';

export function App() {
  const { tab } = useParams();
  const view = useStore((s) => s.view);
  // New object on every finished load (success or stale fallback) and on every failure: the cue that a load settled.
  const fresh = useStore((s) => s.fresh);
  const error = useStore((s) => s.error);
  const previous = useRef<View>(view);

  useEffect(() => {
    document.title = view === 'login' ? `Sign in · ${APP_TITLE}` : view === 'app' && isTab(tab) ? `${TAB_NAMES[tab]} · ${APP_TITLE}` : APP_TITLE;
  }, [view, tab]);

  // Only a card the user was working in (login, error, a Retry button) loses focus when it closes; a plain page load
  // must leave focus alone so the skip link is the first Tab stop.
  useEffect(() => {
    const was = previous.current;
    previous.current = view;
    const { refocus, clearRefocus } = useStore.getState();
    if (view === 'app' && (refocus || was === 'login' || was === 'error')) document.getElementById(`t-${tab}`)?.focus({ preventScroll: true });
    if (view !== 'boot') clearRefocus(); // the loading view comes first and must not use it up
  }, [view, tab, fresh, error]);

  if (!isTab(tab)) return <Navigate to="/home" replace />;

  return (
    <>
      {view === 'app' && (
        <a
          className="skip"
          id="skip"
          href="#main"
          onClick={(e) => {
            // A real #main hash would reach the router as an unknown route and reset the tab.
            e.preventDefault();
            document.getElementById('main')?.focus();
          }}
        >
          Skip to content
        </a>
      )}
      {view === 'boot' && <Boot />}
      {view === 'login' && <LoginGate />}
      {view === 'error' && <ErrorGate />}
      {view === 'app' && <Dashboard tab={tab} />}
    </>
  );
}
