import { describe, it } from 'node:test';
import assert from 'node:assert';
import { renderGrid } from '../src/grid.js';

function daysAgo(n) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

describe('emoji mapping', () => {
  it('0 commits → "."', () => {
    const map = new Map();
    const grid = renderGrid(map, false);
    // All cells should be "."
    assert.ok(grid.includes('.'));
  });

  it('1 commit → seedling', () => {
    const map = new Map([[daysAgo(0), 1]]);
    const grid = renderGrid(map, false);
    assert.ok(grid.includes('\u{1F331}')); // 🌱
  });

  it('2-3 commits → herb', () => {
    const map = new Map([[daysAgo(0), 3]]);
    const grid = renderGrid(map, false);
    assert.ok(grid.includes('\u{1F33F}')); // 🌿
  });

  it('4-6 commits → deciduous tree', () => {
    const map = new Map([[daysAgo(0), 5]]);
    const grid = renderGrid(map, false);
    assert.ok(grid.includes('\u{1F333}')); // 🌳
  });

  it('7+ commits → evergreen tree', () => {
    const map = new Map([[daysAgo(0), 10]]);
    const grid = renderGrid(map, false);
    assert.ok(grid.includes('\u{1F332}')); // 🌲
  });
});

describe('decay', () => {
  it('decaying=true applies decay map to indices 17,18,19', () => {
    // Indices 17,18,19 correspond to days 3,2,1 ago (since grid goes from day 20 to day 0)
    const map = new Map([
      [daysAgo(3), 1], // index 17 → 🌱 → "."
      [daysAgo(2), 1], // index 18 → 🌱 → "."
      [daysAgo(1), 1], // index 19 → 🌱 → "."
    ]);
    const gridDecay = renderGrid(map, true);
    const gridNoDecay = renderGrid(map, false);
    // With decay, seedlings at 17-19 become ".", so they disappear
    // Without decay, they remain as seedlings
    assert.notStrictEqual(gridDecay, gridNoDecay);
  });
});

describe('ASCII mode', () => {
  it('converts emojis to ASCII characters', () => {
    const map = new Map([[daysAgo(0), 10]]);
    const grid = renderGrid(map, false, true);
    assert.ok(grid.includes('A')); // 🌲 → A
    assert.ok(grid.includes('.')); // empty → .
    // Should not contain emoji
    assert.strictEqual(grid.includes('\u{1F332}'), false);
  });
});

describe('grid structure', () => {
  it('renders 3 rows', () => {
    const map = new Map();
    const grid = renderGrid(map, false);
    const rows = grid.split('\n');
    assert.strictEqual(rows.length, 3);
  });

  it('each row has 7 cells', () => {
    const map = new Map();
    const grid = renderGrid(map, false);
    const rows = grid.split('\n');
    for (const row of rows) {
      const cells = row.split(' ');
      assert.strictEqual(cells.length, 7);
    }
  });
});
