import chalk from 'chalk';
import { getCommitDates } from './git.js';
import { calculateStreak } from './streak.js';
import { renderGrid } from './grid.js';

export function main(ascii = false) {
  // Get commit dates from git
  const commitMap = getCommitDates();

  // Calculate streak info
  const { streak, decaying, status } = calculateStreak(commitMap);

  // Render the grid
  const grid = renderGrid(commitMap, decaying, ascii);

  // Print output with colors
  console.log(chalk.green(`🌱 Day ${streak} streak`));
  console.log(grid);

  // Status message: green if active/not decaying, yellow if decaying
  if (decaying) {
    console.log(chalk.yellow(status));
  } else {
    console.log(chalk.green(status));
  }
}
