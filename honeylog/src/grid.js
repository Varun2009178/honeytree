const EMOJI = ['.', '\u{1F331}', '\u{1F33F}', '\u{1F333}', '\u{1F332}'];
// decay: applied to indices 17,18,19 (last 3 days before today)
const DECAY_MAP = {
  '\u{1F331}': '.',
  '\u{1F33F}': '\u{1F940}',
  '\u{1F333}': '\u{1F940}',
  '\u{1F332}': '\u{1F333}',
};
const ASCII_MAP = {
  '\u{1F331}': '*',
  '\u{1F33F}': '*',
  '\u{1F333}': 'Y',
  '\u{1F332}': 'A',
  '\u{1F940}': 'x',
  '.': '.',
};

function countToEmoji(count) {
  if (count === 0) return EMOJI[0];
  if (count === 1) return EMOJI[1];
  if (count <= 3) return EMOJI[2];
  if (count <= 6) return EMOJI[3];
  return EMOJI[4];
}

export function renderGrid(commitMap, decaying, ascii = false) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const cells = [];
  for (let i = 20; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const count = commitMap.get(key) || 0;
    cells.push(countToEmoji(count));
  }

  // Apply decay to indices 17, 18, 19 (last 3 days before today)
  if (decaying) {
    for (const idx of [17, 18, 19]) {
      if (DECAY_MAP[cells[idx]]) {
        cells[idx] = DECAY_MAP[cells[idx]];
      }
    }
  }

  // ASCII substitution
  if (ascii) {
    for (let i = 0; i < cells.length; i++) {
      cells[i] = ASCII_MAP[cells[i]] ?? cells[i];
    }
  }

  // 3 rows x 7 columns
  const rows = [];
  for (let r = 0; r < 3; r++) {
    rows.push(cells.slice(r * 7, r * 7 + 7).join(' '));
  }

  return rows.join('\n');
}
