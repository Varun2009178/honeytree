// src/diffpanel.js
import chalk from "chalk";

chalk.level = 3;

export function createDiffPanel(filePath, hunks) {
  return {
    filePath,
    hunks,
    currentHunk: 0,
    hunkStatus: hunks.map(() => "pending"),
    scrollOffset: 0,
  };
}

export function renderDiffPanel(panel, width, height) {
  const lines = [];
  const totalAdded = panel.hunks.reduce((s, h) => s + h.added, 0);
  const totalRemoved = panel.hunks.reduce((s, h) => s + h.removed, 0);

  // Header
  const header = ` ${panel.filePath}  +${totalAdded} -${totalRemoved}  ${panel.hunks.length} hunks`;
  lines.push(chalk.hex("#f5a50b").bold(header.padEnd(width).slice(0, width)));

  // Separator
  lines.push(chalk.hex("#555555")("─".repeat(width)));

  // Help line
  const help = " j/k: navigate  a: accept  r: reject  A/R: all  Esc: close";
  lines.push(chalk.hex("#888888")(help.padEnd(width).slice(0, width)));

  lines.push(chalk.hex("#555555")("─".repeat(width)));

  // Render hunks
  const bodyHeight = height - lines.length;
  const bodyLines = [];

  for (let hi = 0; hi < panel.hunks.length; hi++) {
    const hunk = panel.hunks[hi];
    const isCurrent = hi === panel.currentHunk;
    const status = panel.hunkStatus[hi];

    // Hunk header with status
    let statusIcon = "[ ]";
    if (status === "accepted") statusIcon = chalk.green("[✓]");
    else if (status === "rejected") statusIcon = chalk.red("[✗]");

    const hunkHeader = isCurrent
      ? chalk.hex("#ffcc44").bold(`▸ Hunk ${hi + 1}/${panel.hunks.length} ${statusIcon} ${hunk.header}`)
      : chalk.hex("#888888")(`  Hunk ${hi + 1}/${panel.hunks.length} ${statusIcon} ${hunk.header}`);

    bodyLines.push(hunkHeader.padEnd(width).slice(0, width));

    // Hunk lines
    for (const line of hunk.lines) {
      let rendered;
      const text = line.text.padEnd(width).slice(0, width);
      if (line.type === "added") {
        rendered = chalk.green(text);
      } else if (line.type === "removed") {
        rendered = chalk.red(text);
      } else {
        rendered = isCurrent ? chalk.hex("#cccccc")(text) : chalk.hex("#666666")(text);
      }
      bodyLines.push(rendered);
    }

    bodyLines.push(""); // blank line between hunks
  }

  // Apply scroll offset and fill to height
  const scrolled = bodyLines.slice(panel.scrollOffset, panel.scrollOffset + bodyHeight);
  for (const line of scrolled) {
    lines.push(line);
  }

  // Pad remaining height
  while (lines.length < height) {
    lines.push(" ".repeat(width));
  }

  return lines.slice(0, height);
}
