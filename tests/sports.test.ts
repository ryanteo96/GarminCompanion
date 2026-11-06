import assert from 'node:assert/strict';
import { test } from 'vitest';
import { isSport, sportOf, sportsWithSessions } from '../src/logic/sports.js';

test('sportOf groups Garmin activity types into Sports', () => {
  assert.equal(sportOf('running'), 'running');
  assert.equal(sportOf('treadmill_running'), 'running');
  assert.equal(sportOf('strength_training'), 'strength');
  assert.equal(sportOf('yoga'), undefined);
});

test('isSport only accepts known slugs', () => {
  assert.ok(isSport('running') && isSport('strength'));
  assert.ok(!isSport('swimming') && !isSport(undefined));
});

test('sportsWithSessions hides sports with no Sessions, in a stable order', () => {
  const a = (type: string) => ({ type });
  assert.deepEqual(sportsWithSessions([a('strength_training'), a('running')]).map((s) => s.slug), ['running', 'strength']);
  assert.deepEqual(sportsWithSessions([a('strength_training')]).map((s) => s.slug), ['strength']);
  assert.deepEqual(sportsWithSessions([]), []);
});
