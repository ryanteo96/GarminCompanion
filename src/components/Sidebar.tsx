import { Account } from './Account.js';
import { Fragment, type KeyboardEvent, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router';
import { sportsWithSessions } from '../logic/sports.js';
import { useStore } from '../store.js';
import { TABS, TAB_NAMES, type Tab } from '../tabs.js';

// Stroke-family icons; decorative, so the words beside them carry the meaning.
const ICONS: Record<Tab, ReactNode> = {
  home: <path d="M3 11l9-7 9 7M5 10v10h14V10" />,
  recovery: <path d="M2 12h4l3-7 4 14 3-7h6" />,
  activity: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4" />
    </>
  ),
};

const MOVES: Partial<Record<string, (i: number) => number>> = {
  ArrowRight: (i) => (i + 1) % TABS.length,
  ArrowDown: (i) => (i + 1) % TABS.length,
  ArrowLeft: (i) => (i + TABS.length - 1) % TABS.length,
  ArrowUp: (i) => (i + TABS.length - 1) % TABS.length,
  Home: () => 0,
  End: () => TABS.length - 1,
};

export function Sidebar({ tab }: { tab: Tab }) {
  const navigate = useNavigate();
  const { sport } = useParams();
  const sports = sportsWithSessions(useStore((s) => s.activities));
  // replace, not push: moving between tabs should not fill the back button with every tab you looked at.
  const go = (t: Tab): void => void navigate(`/${t}`, { replace: true });

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>): void => {
    const move = MOVES[e.key];
    if (!move) return;
    e.preventDefault();
    const next = TABS[move(TABS.indexOf(tab))];
    go(next);
    document.getElementById(`t-${next}`)?.focus();
  };

  return (
    <aside className="side">
      <div className="brand">Garmin Companion</div>
      <div className="tabs" role="tablist" aria-label="Dashboard sections" aria-orientation="vertical">
        {TABS.map((t) => (
          <Fragment key={t}>
            <button role="tab" id={`t-${t}`} aria-controls={`p-${t}`} aria-selected={t === tab} tabIndex={t === tab ? 0 : -1} onClick={() => go(t)} onKeyDown={onKeyDown}>
              <svg viewBox="0 0 24 24" aria-hidden="true">{ICONS[t]}</svg>
              <span>{TAB_NAMES[t]}</span>
            </button>
            {/* Laptop only (hidden on the phone bar); the phone reaches Sports through the chips. */}
            {t === 'activity' &&
              sports.map((s) => (
                <button key={s.slug} type="button" className="sub" aria-current={s.slug === sport ? 'page' : undefined} onClick={() => void navigate(`/activity/${s.slug}`, { replace: true })}>
                  {s.name}
                </button>
              ))}
          </Fragment>
        ))}
      </div>
      <Account where="side" />
    </aside>
  );
}
