export function parseDiff(diffText) {
  if (!diffText || !diffText.trim()) return [];

  const lines = diffText.split("\n");
  const hunks = [];
  let currentHunk = null;

  for (const line of lines) {
    if (line.startsWith("@@")) {
      if (currentHunk) {
        currentHunk.added = currentHunk.lines.filter(l => l.type === "added").length;
        currentHunk.removed = currentHunk.lines.filter(l => l.type === "removed").length;
        hunks.push(currentHunk);
      }
      currentHunk = { header: line, lines: [], added: 0, removed: 0 };
    } else if (currentHunk) {
      if (line.startsWith("+")) {
        currentHunk.lines.push({ type: "added", text: line });
      } else if (line.startsWith("-")) {
        currentHunk.lines.push({ type: "removed", text: line });
      } else if (line.startsWith(" ") || line === "") {
        currentHunk.lines.push({ type: "context", text: line });
      }
    }
  }

  if (currentHunk) {
    currentHunk.added = currentHunk.lines.filter(l => l.type === "added").length;
    currentHunk.removed = currentHunk.lines.filter(l => l.type === "removed").length;
    hunks.push(currentHunk);
  }

  return hunks;
}

export function hunkToPatch(filePath, hunk) {
  const lines = [
    `--- a/${filePath}`,
    `+++ b/${filePath}`,
    hunk.header,
    ...hunk.lines.map(l => l.text),
  ];
  return lines.join("\n") + "\n";
}
