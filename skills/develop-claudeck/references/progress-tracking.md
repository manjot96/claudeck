# Progress Tracking for ClauDeck Development

Maintain `progress.md` in the project root for cross-session continuity. This file is the handoff mechanism between sessions, agents, and Ralph Loop cycles.

## Format

```markdown
# ClauDeck Progress

**Spec:** docs/superpowers/specs/2026-03-11-opcode-remote-design.md
**Plan:** docs/superpowers/plans/2026-03-11-claudeck.md

## Current State
- Last completed: Task N — [brief description]
- Next up: Task N+1 — [brief description]
- Blockers: (none | description of blocker)
- Build status: passing | failing (describe failure)

## Completed Tasks
- [x] Task 1: Initialize monorepo (2026-03-11)
- [x] Task 2: Shared types (2026-03-11)
- [ ] Task 3: Config module
...

## Playwright Test Results
- ConnectScreen: untested | passing | failing
- ProjectsScreen: untested | passing | failing
- ProjectScreen: untested | passing | failing
- SessionScreen: untested | passing | failing
- BottomNav: untested | passing | failing
- Touch targets: untested | passing | failing

## Notes & Gotchas
### Task N
- (Append learnings, workarounds, decisions after each task)
- (Include anything surprising or non-obvious)

## TODOs for Next Session
- [ ] Concrete next steps
- [ ] Unresolved questions
- [ ] Known issues to address
```

## When to Update

### After Every Task Completion
- Check off the task in the Completed Tasks list
- Add date of completion
- Update "Current State" section
- Append any notes/gotchas discovered

### After Every Playwright Test Run
- Update the Playwright Test Results section
- Note any visual issues or regressions

### At Session Start
- Read progress.md first
- Check for TODOs from previous session
- Verify "Current State" matches reality (run scripts/verify.sh)

### At Session End
- Update all sections
- Leave clear TODOs for next session
- Note any in-progress work that needs continuation

## Cross-Session Handoff

When a session ends (context limit, user stops, etc.):

1. Update progress.md with current state
2. Leave specific, actionable TODOs
3. Note the exact step within a task if mid-task
4. Include any debugging context if stuck on an issue

When a new session starts:

1. Read progress.md
2. Read the spec and plan
3. Run scripts/verify.sh to confirm build state
4. Resume from where the previous session left off
5. Check if any TODOs need addressing first

## Ralph Loop Integration

Ralph Loop checks progress.md at each cycle:

1. Read "Next up" to determine what to work on
2. After completing a task, update progress.md
3. Check if there are remaining unchecked tasks
4. If all tasks done, run final verification
5. If blocked, note the blocker and surface to user
