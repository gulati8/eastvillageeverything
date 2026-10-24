#!/usr/bin/env bash
# Ralph loop: one fresh `claude` process per iteration, fed the same prompt.
# State lives only in the repo: scripts/ralph/plan.md and progress.txt.
#
# Usage: ./scripts/ralph/ralph.sh [iterations]   (default 10)
#
# Stops when: every task is ticked (COMPLETE), only [HUMAN] or blocked tasks
# remain (BLOCKED), two iterations in a row tick nothing (stuck), two
# iterations in a row exit non-zero (claude failing), or the cap is reached.
set -euo pipefail

MAX_ITERATIONS="${1:-10}"
if ! [[ "$MAX_ITERATIONS" =~ ^[0-9]+$ ]]; then
  echo "Iterations must be a positive integer (got '$MAX_ITERATIONS')." >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
PROMPT_FILE="$SCRIPT_DIR/prompt.md"
PLAN_FILE="$SCRIPT_DIR/plan.md"
LOG_DIR="$SCRIPT_DIR/logs"

for f in prompt.md plan.md progress.txt; do
  [[ -f "$SCRIPT_DIR/$f" ]] || { echo "Missing $SCRIPT_DIR/$f" >&2; exit 1; }
done
command -v claude >/dev/null 2>&1 || { echo "claude CLI not on PATH" >&2; exit 1; }

cd "$PROJECT_ROOT"
if [[ -n "$(git status --porcelain)" ]]; then
  echo "Working tree is not clean. Commit or stash first; each iteration commits everything it touched." >&2
  exit 1
fi
if [[ "$(git branch --show-current)" != "main" ]]; then
  echo "Not on main. The plan and the deploy workflow assume main." >&2
  exit 1
fi
mkdir -p "$LOG_DIR"

ticked() { grep -c '^- \[x\]' "$PLAN_FILE" || true; }

# Unattended runs cannot answer permission prompts, so permissions are bypassed.
# The prompt's guardrails and the plan's task text are the only limits on what
# the agent does. Review plan.md before raising the iteration count.
AGENT_CMD=(claude --print --dangerously-skip-permissions)

NO_PROGRESS=0
FAILURES=0
printf '\nStarting Ralph: up to %s iteration(s), %s task(s) ticked so far\n' "$MAX_ITERATIONS" "$(ticked)"

for i in $(seq 1 "$MAX_ITERATIONS"); do
  printf '\n=== Iteration %s/%s  %s ===\n' "$i" "$MAX_ITERATIONS" "$(date '+%Y-%m-%d %H:%M:%S')"
  LOG="$LOG_DIR/$(date '+%Y%m%d-%H%M%S')-iter$i.log"
  BEFORE=$(ticked)

  set +e
  "${AGENT_CMD[@]}" "$(<"$PROMPT_FILE")" 2>&1 | tee "$LOG"
  STATUS=${PIPESTATUS[0]}
  set -e

  if [[ $STATUS -ne 0 ]]; then
    FAILURES=$((FAILURES + 1))
    printf '\nclaude exited with status %s (%s in a row). Log: %s\n' "$STATUS" "$FAILURES" "$LOG" >&2
    if [[ $FAILURES -ge 2 ]]; then
      echo "Two consecutive failures. Stopping." >&2
      exit 3
    fi
    sleep 5
    continue
  fi
  FAILURES=0

  # Only the final non-empty line of output counts as a stop signal; the prompt
  # text itself contains both markers, so matching the whole log would misfire.
  LAST_LINE=$(grep -v '^[[:space:]]*$' "$LOG" | tail -n 1 || true)
  if [[ "$LAST_LINE" == *'<promise>COMPLETE</promise>'* ]]; then
    printf '\nAll tasks ticked. Done.\n'
    exit 0
  fi
  if [[ "$LAST_LINE" == *'<promise>BLOCKED</promise>'* ]]; then
    printf '\nBlocked on a [HUMAN] task. See the end of scripts/ralph/progress.txt.\n'
    exit 2
  fi

  AFTER=$(ticked)
  if [[ "$AFTER" -gt "$BEFORE" ]]; then
    NO_PROGRESS=0
    printf '\nTicked %s task(s) this iteration (%s total).\n' "$((AFTER - BEFORE))" "$AFTER"
  else
    NO_PROGRESS=$((NO_PROGRESS + 1))
    printf '\nNo task ticked this iteration (%s in a row).\n' "$NO_PROGRESS" >&2
    if [[ $NO_PROGRESS -ge 2 ]]; then
      echo "Two iterations without progress. Stopping; see scripts/ralph/progress.txt for what failed." >&2
      exit 4
    fi
  fi
  sleep 2
done

printf '\nMax iterations (%s) reached. Check scripts/ralph/plan.md and progress.txt.\n' "$MAX_ITERATIONS" >&2
exit 1
