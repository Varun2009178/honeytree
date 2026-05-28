import { describe, it } from 'node:test';
import assert from 'node:assert';
import { calculateStreak } from '../src/streak.js';

const fmt = (d) => d.toISOString().slice(0, 10);
function daysAgo(n) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return fmt(d);
}

describe('calculateStreak', () => {
  it('3+ day streak with today → growing, not decaying', () => {
    const map = new Map([
      [daysAgo(0), 1],
      [daysAgo(1), 2],
      [daysAgo(2), 1],
      [daysAgo(3), 1],
    ]);
    const result = calculateStreak(map);
    assert.strictEqual(result.streak >= 3, true);
    assert.strictEqual(result.decaying, false);
    assert.strictEqual(result.status, 'Your forest is growing.');
  });

  it('1-2 day streak with today → stable, not decaying', () => {
    const map = new Map([
      [daysAgo(0), 1],
    ]);
    const result = calculateStreak(map);
    assert.strictEqual(result.streak, 1);
    assert.strictEqual(result.decaying, false);
    assert.strictEqual(result.status, 'Your forest is stable.');
  });

  it('2 day streak with today → stable', () => {
    const map = new Map([
      [daysAgo(0), 1],
      [daysAgo(1), 1],
    ]);
    const result = calculateStreak(map);
    assert.strictEqual(result.streak, 2);
    assert.strictEqual(result.decaying, false);
    assert.strictEqual(result.status, 'Your forest is stable.');
  });

  it('no commit today but yesterday → decaying, weakening', () => {
    const map = new Map([
      [daysAgo(1), 2],
      [daysAgo(2), 1],
    ]);
    const result = calculateStreak(map);
    assert.strictEqual(result.streak, 2);
    assert.strictEqual(result.decaying, true);
    assert.strictEqual(result.status, 'Your forest is weakening...');
  });

  it('no commits at all → streak 0, not decaying', () => {
    const map = new Map();
    const result = calculateStreak(map);
    assert.strictEqual(result.streak, 0);
    assert.strictEqual(result.decaying, false);
    assert.strictEqual(result.status, "You didn't show up today.");
  });

  it('empty map → streak 0', () => {
    const result = calculateStreak(new Map());
    assert.strictEqual(result.streak, 0);
  });
});
