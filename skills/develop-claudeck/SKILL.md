---
name: develop-claudeck
description: This skill should be used when implementing ClauDeck features, executing the ClauDeck implementation plan, working on ClauDeck, continuing claudeck development, running "develop claudeck", "build claudeck", "implement claudeck task", "next claudeck task", "work on claudeck", or working on any ClauDeck daemon, PWA, or shared types code. Orchestrates a tight implement-build-test-verify loop using TDD, Playwright MCP for UI verification, and Ralph Loop for continuous iteration.
---

# ClauDeck Development Workflow

Orchestrate ClauDeck development through a disciplined implement-build-test-verify loop. Each task from the implementation plan follows TDD, gets verified with automated builds and Playwright browser testing, and progress is tracked for multi-session continuity.

## Prerequisites

Before starting work:

1. Read the spec: `docs/superpowers/specs/2026-03-11-opcode-remote-design.md`
2. Read the plan: `docs/superpowers/plans/2026-03-11-claudeck.md`
3. Read or create `progress.md` in project root (cross-session state)
4. Ensure Playwright MCP is available: test with `browser_navigate` to `about:blank`

**External dependencies (must be available at runtime):**
- **Superpowers plugin** — provides TDD, executing-plans, verification-before-completion, systematic-debugging, dispatching-parallel-agents skills
- **Ralph Loop plugin** — provides `/ralph-loop` slash command for continuous iteration
- **Playwright MCP** — provides browser_navigate, browser_snapshot, browser_take_screenshot, browser_click, browser_fill_form, browser_evaluate, browser_console_messages tools

## Core Loop

For each task in the implementation plan:

```
┌─ 1. CLAIM ──────────────────────────────────┐
│  Read next unchecked task from plan           │
│  Mark checkbox `- [x]` for current step       │
│  Update progress.md: "Task N: in progress"    │
└───────────────────────────────────────────────┘
         │
┌─ 2. IMPLEMENT (TDD) ────────────────────────┐
│  Invoke superpowers:test-driven-development   │
│  Write failing test first                     │
│  Implement minimal code to pass               │
│  Run: bun test <specific-test-file>           │
└───────────────────────────────────────────────┘
         │
┌─ 3. VERIFY BUILD ───────────────────────────┐
│  Run: scripts/verify.sh                       │
│  All tests pass, web builds, types check      │
│  Fix any failures before proceeding           │
└───────────────────────────────────────────────┘
         │
┌─ 4. VERIFY UI (Playwright — UI tasks only) ──┐
│  Start daemon if needed: bun run start        │
│  Use Playwright MCP to navigate and screenshot │
│  Compare screenshots against expected behavior │
│  Screenshots are source of truth               │
│  See references/playwright-tests.md            │
└───────────────────────────────────────────────┘
         │
┌─ 5. COMMIT + PROGRESS ─────────────────────┐
│  git add specific files (not -A, avoids noise) │
│  git commit with descriptive message          │
│  Update progress.md with completion notes     │
│  Note any gotchas for next session            │
└───────────────────────────────────────────────┘
         │
         ▼ Next task (Ralph Loop continues)
```

## When to Use Playwright MCP

Use Playwright browser testing for **UI tasks only** (Tasks 11-18 in the plan). Skip for daemon-only tasks (Tasks 3-10) — those use `bun test` exclusively.

**Playwright test flow for each UI task:**

1. `browser_navigate` to the PWA URL (daemon must be running)
2. `browser_snapshot` to capture accessibility tree
3. `browser_take_screenshot` for visual verification
4. `browser_click` / `browser_fill_form` to test interactions
5. `browser_snapshot` again to verify state changes
6. Compare against expected behavior from the spec

**Critical checks:**
- Touch targets are at least 44px (`browser_evaluate` to measure elements)
- Dark theme renders correctly (screenshot inspection)
- WebSocket connection status shows in UI
- Live output streams and auto-scrolls
- Bottom nav is visible and functional

## Ralph Loop Integration

Start Ralph Loop to continuously iterate through tasks:

1. Invoke `/ralph-loop` at session start
2. Ralph keeps the cycle running: finish one task → start next
3. At each cycle, Ralph checks:
   - Are there unchecked tasks remaining in the plan?
   - Did `scripts/verify.sh` pass?
   - Is `progress.md` up to date?
4. If all tasks complete, Ralph runs final verification (superpowers:verification-before-completion)

## Progress Tracking

Maintain `progress.md` in the project root for cross-session continuity. Track current state, completed tasks, Playwright test results, notes/gotchas, and TODOs for next session. Update after every task completion. Read at every session start.

See `references/progress-tracking.md` for the full template and cross-session handoff patterns.

## Verification Before Completion

Before claiming any task is done, invoke superpowers:verification-before-completion:

1. Run `scripts/verify.sh` — must pass clean
2. For UI tasks: Playwright screenshot matches expected behavior
3. Check the spec — does the implementation match?
4. No TODO comments or placeholder code left behind

## Superpowers Integration

Reference these skills at the appropriate moments:

| Moment | Skill |
|--------|-------|
| Starting a task | superpowers:executing-plans |
| Writing code | superpowers:test-driven-development |
| Parallelizing independent tasks | superpowers:dispatching-parallel-agents |
| Before claiming done | superpowers:verification-before-completion |
| Encountering a bug | superpowers:systematic-debugging |

## Additional Resources

### Reference Files

- **`references/playwright-tests.md`** — Detailed Playwright MCP test patterns for each ClauDeck screen (connect, projects, project, session)
- **`references/progress-tracking.md`** — Detailed progress.md format and cross-session handoff patterns

### Scripts

- **`scripts/verify.sh`** — Single command to run all quality gates (test + build + typecheck)
