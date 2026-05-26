import { execSync } from 'node:child_process';

export function getCommitDates(days = 21) {
  let email;
  try {
    email = execSync('git config user.email', { encoding: 'utf8' }).trim();
  } catch {
    console.error('Not a git repository (or git is not installed).');
    process.exit(1);
  }

  let raw;
  try {
    raw = execSync(
      `git log --author=${email} --format=%aI --since=${days}.days.ago`,
      { encoding: 'utf8' }
    ).trim();
  } catch {
    console.error('Not a git repository.');
    process.exit(1);
  }

  const map = new Map();
  if (!raw) return map;

  for (const line of raw.split('\n')) {
    const dateStr = line.slice(0, 10); // "2026-05-25"
    map.set(dateStr, (map.get(dateStr) || 0) + 1);
  }

  return map;
}
