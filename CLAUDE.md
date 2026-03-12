# ClauDeck

PWA + Bun daemon for controlling Claude Code sessions remotely over LAN.

## Architecture

Bun workspace monorepo with three packages:

| Package | Path | Purpose |
|---------|------|---------|
| `shared` | `packages/shared` | TypeScript types only (no runtime code) |
| `daemon` | `packages/daemon` | Bun HTTP/WebSocket server, process manager, mDNS |
| `web` | `packages/web` | React PWA (Vite + Tailwind CSS v4) |

**Spec:** `docs/superpowers/specs/2026-03-11-opcode-remote-design.md`
**Plan:** `docs/superpowers/plans/2026-03-11-claudeck.md`

## Tech Stack

- **Runtime:** Bun >= 1.2
- **Language:** TypeScript (strict)
- **Frontend:** React 18, Vite 6, Tailwind CSS v4, vite-plugin-pwa
- **mDNS:** bonjour-service
- **Testing:** bun test

## Commands

```bash
# Install dependencies
bun install

# Run daemon
bun run --filter daemon start

# Build PWA
bun run build:web

# Run all tests
bun test

# Type check web
cd packages/web && bunx tsc --noEmit

# Full verification (tests + build + typecheck)
scripts/verify.sh

# Quick verification (tests only, skip web build)
scripts/verify.sh --quick
```

## Code Conventions

- Shared types go in `packages/shared/src/index.ts` — no runtime code, only TypeScript types
- Daemon uses `Bun.serve` for HTTP/WebSocket, `Bun.spawn` for claude CLI processes
- Auth: Bearer token on REST, query param on WebSocket (`/ws?token=<token>`)
- MVP enforces one active session at a time (409 on second attempt)
- Config stored at `~/.claudeck/config.json` (token, port, bind address)

## Development Skill

Use the `develop-claudeck` skill for the full implement-build-test-verify loop with TDD and Playwright UI testing. It reads the plan and tracks progress in `progress.md`.

## Task Tracking

Use beads (`bd`) for task management. Prefix: `claudeck`.
