# Ralph agent instructions

You are Claude Code running unattended in a Ralph loop for this repository, one fresh process per iteration. Work from the repo root. Read `CLAUDE.md` for repo conventions.

## Each iteration

1. Read `scripts/ralph/plan.md`. It is the work queue.
2. Read `scripts/ralph/progress.txt`, especially the `## Codebase Patterns` block at the top.
3. Pick the first unticked task in file order that is **not** tagged `[HUMAN]` and whose `Blocked by` tasks (if any) are all ticked.
4. Do only that task. If it turns out to be bigger than one iteration, do the first coherent piece, leave the box unticked, and write in `progress.txt` exactly where you stopped.
5. Run the task's `Done when` check. Do not tick the box unless it passes.
6. Tick the box in `plan.md`.
7. Append an entry to `scripts/ralph/progress.txt` (format below).
8. Commit everything from this task, including the `plan.md` and `progress.txt` edits, with the prefix the task names, as `<prefix>: <task id> <short title>`. If the task says "No commit", still commit the `plan.md` and `progress.txt` changes as `chore(ralph): <task id> done`.
9. Exit.

## Guardrails

- One task per iteration. Never start a second task.
- Never tick a `[HUMAN]` task. Never do a `[HUMAN]` task on the human's behalf.
- Never print or commit a secret. The root `.env` is gitignored and holds them. Pipe values; do not echo them.
- The production host is `ssh ec2-user@100.29.233.41`. The app lives in `/srv/eve`. The database is the `eve-db` container, user `eve`, database `eve_production`. Do not run anything destructive there unless the task says so.
- Push to `main` triggers a production deploy. Only push when the task says to deploy. Before any push, run `npm run build:packages && npx tsc --noEmit && (cd apps/mobile && npm test)` and do not push if anything fails. After pushing, wait for the workflow to pass (`gh run watch`) before running the `Done when` check. Commits from tasks that do not push stay local until the next task that does; that is expected.
- Do not change the plan's tasks except to tick a box or to add a task that a task explicitly tells you to add (such as a review rejection).
- If a `Done when` check fails after a reasonable fix attempt, leave the box unticked, write what failed and what you tried in `progress.txt`, commit that, and exit.

## Progress entry format

```
## <date> - <task id>
- What changed
- Files touched
- Validation: the exact commands you ran and their results
- Learnings: anything the next iteration should know (optional)
---
```

If you learn something every future iteration needs, add one line to the top of the `## Codebase Patterns` block as well.

## Stop conditions

Output exactly one of these as the last line, and nothing after it:

- `<promise>COMPLETE</promise>` if and only if every task in `plan.md` is ticked.
- `<promise>BLOCKED</promise>` if and only if no unticked task is available to you: each remaining one is `[HUMAN]` or blocked by an unticked task. Before outputting it, write in `progress.txt` which `[HUMAN]` task is next and exactly what the human needs to do.

Otherwise exit normally so the outer loop runs the next iteration.
