export function calculateStreak(commitMap) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const fmt = (d) => d.toISOString().slice(0, 10);
  const committedToday = (commitMap.get(fmt(today)) || 0) >= 1;

  // Walk backwards counting consecutive days with commits
  let streak = 0;
  let decaying = false;

  if (committedToday) {
    // Count from today backwards
    for (let i = 0; ; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      if ((commitMap.get(fmt(d)) || 0) >= 1) {
        streak++;
      } else {
        break;
      }
    }
  } else {
    // Count from yesterday backwards
    for (let i = 1; ; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      if ((commitMap.get(fmt(d)) || 0) >= 1) {
        streak++;
      } else {
        break;
      }
    }
    if (streak > 0) decaying = true;
  }

  let status;
  if (committedToday && streak >= 3) {
    status = 'Your forest is growing.';
  } else if (committedToday) {
    status = 'Your forest is stable.';
  } else if (streak > 0) {
    status = 'Your forest is weakening...';
  } else {
    status = "You didn't show up today.";
  }

  return { streak, decaying, status };
}
