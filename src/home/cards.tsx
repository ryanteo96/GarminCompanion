import { useMemo, type ComponentType } from 'react';
import { Today, SignalCard } from '../panels/RecoveryPanel.js';
import { IntensityCard, StepsCard, StressCard } from '../panels/ActivityPanel.js';
import { LoadHero, Sessions } from '../panels/TrainingPanel.js';
import { WeekCard } from '../panels/WeekCard.js';
import { MonthHeat } from '../components/MonthHeat.js';
import { heatmap, loadSeries, readiness, type ReadinessKey } from '../logic/stats.js';
import { useStore } from '../store.js';
import type { CardId } from './layout.js';

export interface CardDef {
  title: string;
  group: 'health' | 'training';
  span: 1 | 2 | 'full';
  Component: ComponentType;
}

// Home shows 7 days of trend, whatever the chart range is.
const N = 7;

function ReadinessCard() {
  const days = useStore((s) => s.days);
  const r = useMemo(() => readiness(days), [days]);
  return <Today r={r} days={days} compact />;
}

const signal = (k: ReadinessKey): ComponentType =>
  function Signal() {
    const days = useStore((s) => s.days);
    const r = useMemo(() => readiness(days), [days]);
    return <SignalCard k={k} days={days} r={r} n={N} />;
  };

function LoadCard() {
  const days = useStore((s) => s.days);
  const ls = useMemo(() => loadSeries(days), [days]);
  return <LoadHero last={ls[ls.length - 1]} compact />;
}

function SessionsCard() {
  const days = useStore((s) => s.days);
  const activities = useStore((s) => s.activities);
  const since = (n: number): string => days.at(-n)?.date ?? '0000';
  return (
    <section className="card" aria-labelledby="sessions-h">
      <Sessions activities={activities} since={since} />
    </section>
  );
}

function MonthCard() {
  const days = useStore((s) => s.days);
  const cells = useMemo(() => heatmap(days), [days]);
  return (
    <section className="card" aria-labelledby="month-h">
      <h3 id="month-h" className="cap">Training load, last 5 weeks</h3>
      <MonthHeat cells={cells} />
    </section>
  );
}

function Steps() {
  return <StepsCard days={useStore((s) => s.days)} n={N} />;
}
function Intensity() {
  return <IntensityCard days={useStore((s) => s.days)} />;
}
function Stress() {
  return <StressCard days={useStore((s) => s.days)} n={N} />;
}

// The record key is the card's id, so typecheck fails if a card in CARD_IDS has no entry.
export const CARDS: Record<CardId, CardDef> = {
  readiness: { title: 'Readiness', group: 'health', span: 'full', Component: ReadinessCard },
  hrv: { title: 'HRV', group: 'health', span: 1, Component: signal('hrv') },
  'resting-hr': { title: 'Resting HR', group: 'health', span: 1, Component: signal('restingHr') },
  sleep: { title: 'Sleep', group: 'health', span: 1, Component: signal('sleepH') },
  'body-battery': { title: 'Body Battery', group: 'health', span: 1, Component: signal('bbHigh') },
  load: { title: 'Training load', group: 'training', span: 2, Component: LoadCard },
  sessions: { title: 'Recent sessions', group: 'training', span: 2, Component: SessionsCard },
  week: { title: 'This week', group: 'training', span: 'full', Component: WeekCard },
  month: { title: 'Month heatmap', group: 'training', span: 2, Component: MonthCard },
  steps: { title: 'Steps', group: 'training', span: 1, Component: Steps },
  intensity: { title: 'Intensity minutes', group: 'training', span: 1, Component: Intensity },
  stress: { title: 'Stress', group: 'health', span: 1, Component: Stress },
};
