#!/usr/bin/env bash
# Ralph loop: one fresh `claude` process per iteration, fed the same prompt.
# State lives only in the repo: scripts/ralph/plan.md and progress.txt.
#
# Usage: ./scripts/ralph/ralph.sh [iterations]   (default 10)
set -euo pipefail

MAX_ITERATIONS="${1:-10}"
if ! [[ "$MAX_ITERATIONS" =~ ^[0-9]+$ ]]; then
  echo "Iterations must be a positive integer (got '$MAX_ITERATIONS')." >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
PROMPT_FILE="$SCRIPT_DIR/prompt.md"
LOG_DIR="$SCRIPT_DIR/logs"

for f in prompt.md plan.md progress.txt; do
  [[ -f "$SCRIPT_DIR/$f" ]] || { echo "Missing $SCRIPT_DIR/$f" >&2; exit 1; }
done
command -v claude >/dev/null 2>&1 || { echo "claude CLI not on PATH" >&2; exit 1; }
mkdir -p "$LOG_DIR"

# Unattended runs cannot answer permission prompts, so permissions are bypassed.
# The prompt's guardrails and the plan's task text are the only limits on what
# the agent does. Review plan.md before raising the iteration count.
AGENT_CMD=(claude --print --dangerously-skip-permissions)

printf '\nStarting Ralph: up to %s iteration(s)\n' "$MAX_ITERATIONS"
for i in $(seq 1 "$MAX_ITERATIONS"); do
  printf '\n=== Iteration %s/%s  %s ===\n' "$i" "$MAX_ITERATIONS" "$(date '+%Y-%m-%d %H:%M:%S')"
  LOG="$LOG_DIR/$(date '+%Y%m%d-%H%M%S')-iter$i.log"

  OUTPUT=$(cd "$PROJECT_ROOT" && "${AGENT_CMD[@]}" "$(<"$PROMPT_FILE")" 2>&1 | tee "$LOG" | tee /dev/stderr) || true

  if grep -q '<promise>COMPLETE</promise>' <<<"$OUTPUT"; then
    printf '\nAll tasks ticked. Done.\n'
    exit 0
  fi
  if grep -q '<promise>BLOCKED</promise>' <<<"$OUTPUT"; then
    printf '\nBlocked on a [HUMAN] task. See the end of scripts/ralph/progress.txt.\n'
    exit 2
  fi
  sleep 2
done

printf '\nMax iterations (%s) reached. Check scripts/ralph/plan.md and progress.txt.\n' "$MAX_ITERATIONS" >&2
exit 1
