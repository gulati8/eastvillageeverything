# How to resume work in a new Claude Code session

This file gives you a clean starting prompt for resuming the two open workstreams on this project. Pick the one that matches what you want to do, paste it into the new session.

---

## A) Resume TestFlight Phase 1 — debug the launch crash

```
The Phase 1 TestFlight beta build is uploaded to App Store Connect (build 1.0.0 (2)) and the app crashes on launch on a real iPhone — that's the only thing left blocking ship.

Read these in order:
1. /Users/amitgulati/Projects/eastvillageeverything/CLAUDE.md
2. /Users/amitgulati/Projects/eastvillageeverything/docs/superpowers/plans/2026-05-04-eve-testflight-plan.md — especially the "Current state" section near the top
3. /Users/amitgulati/Projects/eastvillageeverything/apps/mobile/app/_layout.tsx (top suspect: Sentry.wrap + initSentry at module load)

We are on branch `phase1-testflight-fixes`, ~20 commits ahead of main. Do not switch branches.

Drive me through the diagnostic path documented in the "Current state" section: Sentry first, then iPhone-side crash log via Settings → Privacy → Analytics Data, then Xcode Console.app live logs. I'll paste whatever I find.

When you have a crash signal, fix it. Then I'll rebuild locally (`cd apps/mobile && eas build --local --profile production --platform ios`), submit (`eas submit --profile production --platform ios --path <new ipa>`), and re-test on the phone.

Slack updates to channel #eve via SLACK_BOT_TOKEN env var as you make progress (channel ID C0AGW43AXJ6, workspace gulatihq.slack.com). Do not assume new builds work without me confirming the install.
```

---

## B) Resume the mobile redesign — finish the Fallback + detail-screen work

```
The mobile directory-style redesign at /Users/amitgulati/Projects/eastvillageeverything/docs/superpowers/plans/2026-05-04-mobile-redesign.md is paused. Some of it was already executed (PlaceList masthead, FilterRail, FilterSheet, etc. are in the codebase). I want to finish the rest.

Read these in order, all the way through:
1. /Users/amitgulati/Projects/eastvillageeverything/CLAUDE.md
2. /Users/amitgulati/Projects/eastvillageeverything/docs/superpowers/plans/2026-05-04-eve-testflight-plan.md — especially the "Current state" section, and the Phase 2 (deferred) section at the bottom
3. /Users/amitgulati/Projects/eastvillageeverything/docs/superpowers/plans/2026-05-04-mobile-redesign.md — especially the "Resume notes" section near the top, which lists what's already done and what remains

CRITICAL FILE OWNERSHIP — the redesign plan will tell you to modify transformPlace.ts, useFilterState.ts, placeV2Display.ts. Phase 1 just rewrote those files cleanly. Before editing any of them, read them in their CURRENT state. Do not reintroduce chips matching by substring, do not null fields transformPlace populates, do not bring back filterSections.ts.

Confirm the remaining task list with me before starting. Then execute one task at a time using superpowers:subagent-driven-development. Branch off `phase1-testflight-fixes` (or main if Phase 1 has merged by then — check first).

Slack updates to #eve (channel C0AGW43AXJ6) via SLACK_BOT_TOKEN.
```

---

## C) Both — TestFlight crash first, then redesign

```
Two open workstreams in this repo, in priority order:

1. PHASE 1 BLOCKER: the TestFlight beta build (1.0.0 (2)) crashes on launch on real device. This must ship before redesign work continues.

2. The directory-style redesign at docs/superpowers/plans/2026-05-04-mobile-redesign.md is paused. Some of it is in the codebase already; I want to finish the rest after Phase 1 is unblocked.

Start with #1. Read the prompt at docs/superpowers/RESUME.md "A) Resume TestFlight Phase 1" and execute it. Once a TestFlight build is on my phone and golden-path-passing, switch to "B) Resume the mobile redesign" in the same file.

Slack updates to #eve (channel C0AGW43AXJ6) via SLACK_BOT_TOKEN.
```

---

## What to expect from these prompts

- Each one tells the new session which plan file is canonical, which sections to read first, and what the current trust boundaries are.
- The "current state" sections in the two plan files do the heavy lifting — keep them updated as work continues. **If you finish a chunk of work, append a note to the plan's "Current state" section before ending the session.**
- All three prompts assume the Slack `commanddeck` bot env vars (`SLACK_BOT_TOKEN`, etc.) are still set in your shell. If you regenerate them, update this file.
