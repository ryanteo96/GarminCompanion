import { NavLink, useParams } from 'react-router';
import { isSport, SPORTS, sportOf, sportsWithSessions } from '../logic/sports.js';
import { useStore } from '../store.js';
import { ActivityPanel } from './ActivityPanel.js';
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
      <h2 className="cap">{SPORTS.find((s) => s.slug === slug)?.name}</h2>
      <Sessions activities={mine} since={since} />
    </>
  );
}

export function ActivityRoute() {
  const { sport } = useParams();
  return (
    <>
      <SportChips />
      {isSport(sport) ? (
        <SportStub slug={sport} />
      ) : (
        // Training merges into Activity in its own ticket; until then All shows both.
        <>
          <TrainingPanel />
          <ActivityPanel />
        </>
      )}
    </>
  );
}
