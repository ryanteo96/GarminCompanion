import assert from 'node:assert/strict';
import { test } from 'vitest';
import { CARD_IDS, DEFAULT_CARDS, hide, merge, move, reset, sanitize, show } from '../src/home/layout.js';

test('move takes a card from one position to another and leaves the input alone', () => {
  const input = ['a', 'b', 'c'];
  assert.deepEqual(move(input, 0, 2), ['b', 'c', 'a']);
  assert.deepEqual(input, ['a', 'b', 'c']);
  assert.deepEqual(move(['a', 'b'], 5, 0), ['a', 'b']);
});

test('show appends a hidden card once, hide removes it', () => {
  assert.deepEqual(show(['a'], 'b'), ['a', 'b']);
  assert.deepEqual(show(['a', 'b'], 'b'), ['a', 'b']);
  assert.deepEqual(hide(['a', 'b'], 'a'), ['b']);
});

test('reset returns the default order as a fresh array', () => {
  assert.deepEqual(reset(), ['readiness', 'hrv', 'resting-hr', 'sleep', 'body-battery', 'month', 'sessions', 'week', 'steps', 'intensity', 'stress']);
  assert.notEqual(reset(), DEFAULT_CARDS);
});

test('sanitize drops unknown ids and duplicates, keeping the first', () => {
  assert.deepEqual(sanitize(['hrv', 'gone', 'hrv', 1, 'sleep'], CARD_IDS), ['hrv', 'sleep']);
});

test('sanitize turns a non-array into the default and keeps an empty array', () => {
  for (const bad of [null, undefined, 'hrv', {}, 3]) assert.deepEqual(sanitize(bad, CARD_IDS), [...CARD_IDS]);
  assert.deepEqual(sanitize([], CARD_IDS), []);
});

test('merge keeps the newer layout and the local one on a tie', () => {
  const local = { cards: ['a'], updatedAt: 10 };
  const newer = { cards: ['b'], updatedAt: 11 };
  const older = { cards: ['c'], updatedAt: 9 };
  assert.equal(merge(local, newer), newer);
  assert.equal(merge(local, older), local);
  assert.equal(merge(local, { cards: ['d'], updatedAt: 10 }), local);
  assert.equal(merge(local, null), local);
});
