#!/usr/bin/env bash
# Fire fake "prompts" to grow your Honeytree forest fast.
#
# Each iteration runs the Stop-hook tick (`honeytree __tick`), which plants one
# token-sized tree — random species/growth when there's no live transcript —
# and syncs to the cloud. Exactly the path Claude Code drives, minus the typing.
#
# Usage: ./grow.sh [count] [delay_seconds]
#   count  trees to plant            (default 60 — clears the first 50 milestone)
#   delay  seconds between plants    (default 0.25)
#
# Point at a local build instead of the global CLI:
#   HONEYTREE="node honeydew/bin/honeydew.js" ./grow.sh 10

set -uo pipefail

COUNT="${1:-60}"
DELAY="${2:-0.25}"
HONEYTREE="${HONEYTREE:-honeytree}"

# Resolve the runner (supports a multi-word HONEYTREE like "node path/bin.js").
read -r -a RUNNER <<< "$HONEYTREE"
if ! command -v "${RUNNER[0]}" >/dev/null 2>&1; then
  echo "Can't find '${RUNNER[0]}'. Install with: npm i -g honeytree@latest" >&2
  echo "Or run a local build: HONEYTREE=\"node honeydew/bin/honeydew.js\" ./grow.sh" >&2
  exit 1
fi

echo "Planting $COUNT trees (${DELAY}s apart) via ${RUNNER[*]}…"
for i in $(seq 1 "$COUNT"); do
  echo '{}' | "${RUNNER[@]}" __tick >/dev/null 2>&1 || true
  printf "\r  %d/%d planted" "$i" "$COUNT"
  sleep "$DELAY"
done
printf "\n"
echo "Done. Open your dashboard or run: honeytree"
