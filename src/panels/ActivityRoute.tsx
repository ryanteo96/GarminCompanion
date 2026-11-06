import { Navigate, NavLink, useParams } from 'react-router';
import { isSport, SPORTS, sportOf, sportsWithSessions } from '../logic/sports.js';
import { useStore } from '../store.js';
import { FitnessCard } from '../components/FitnessCard.js';
import { ActivityPanel } from './ActivityPanel.js';
import { RunningPage } from './RunningPage.js';
import { SessionPage } from './SessionPage.js';
import { Sessions, TrainingPanel } from './TrainingPanel.js';

// Chips for All and each Sport that has Sessions. replace, not push, like the tabs.
export function SportChips() {
  const activities = useStore((s) => s.activities);
  const chips = [{ to: '/activity', name: 'All' }, ...sportsWithSessions(activities).map((s) => ({ to: `/activity/${s.slug}`, name: s.name }))];
  return (
    <nav className="chips" aria-label="Sport">
      {chips.map((c) => (
        <NavLink key={c.to} to={c.to} end replace>{c.name}</NavLink>
      ))}
    </nav>
  );
}

// Interim Sport body: its recent Sessions only. The Running and Strength pages replace it.
function SportStub({ slug }: { slug: string }) {
  const days = useStore((s) => s.days);
  const mine = useStore((s) => s.activities).filter((a) => sportOf(a.type) === slug);
  const since = (n: number): string => days.at(-n)?.date ?? '0000';
  return (
    <>
      <h2 className="sr-only">{SPORTS.find((s) => s.slug === slug)?.name}</h2>
      <Sessions activities={mine} since={since} />
    </>
  );
}

export function ActivityRoute() {
  const { sport, id } = useParams();
  if (id && !isSport(sport)) return <Navigate to="/activity" replace />;
  return (
    <>
      <SportChips />
      {isSport(sport) && id ? (
        <SessionPage sport={sport} id={Number(id)} />
      ) : sport === 'running' ? (
        <RunningPage />
      ) : isSport(sport) ? (
        <SportStub slug={sport} />
      ) : (
        // Training merges into Activity in its own ticket; until then All shows both.
        <>
          <FitnessCard />
          <TrainingPanel />
          <ActivityPanel />
        </>
      )}
    </>
  );
}
