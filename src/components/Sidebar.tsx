import type { KeyboardEvent, ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { TABS, TAB_NAMES, type Tab } from '../tabs.js';

// Stroke-family icons; decorative, so the words beside them carry the meaning.
const ICONS: Record<Tab, ReactNode> = {
  recovery: <path d="M2 12h4l3-7 4 14 3-7h6" />,
  training: <path d="M5 20V11M12 20V4M19 20v-6" />,
  activity: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4" />
    </>
  ),
  insights: <path d="M3 17l6-6 4 4 8-9" />,
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
          <button key={t} role="tab" id={`t-${t}`} aria-controls={`p-${t}`} aria-selected={t === tab} tabIndex={t === tab ? 0 : -1} onClick={() => go(t)} onKeyDown={onKeyDown}>
            <svg viewBox="0 0 24 24" aria-hidden="true">{ICONS[t]}</svg>
            <span>{TAB_NAMES[t]}</span>
          </button>
        ))}
      </div>
      <p className="side-note small muted">Signing out also clears the copy of your data cached in this browser.</p>
    </aside>
  );
}
