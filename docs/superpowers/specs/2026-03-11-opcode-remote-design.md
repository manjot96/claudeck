# ClauDeck — Design Spec

**Date:** 2026-03-11
**Status:** Draft
**Repo:** ~/Work/claudeck (public, to be created)

## Overview

ClauDeck is a PWA + Bun daemon that lets you control Claude Code sessions from an iPad (or any browser) over your local network. The daemon runs on your dev machine, spawns `claude` CLI processes, and streams their output in real-time to the PWA via WebSocket. Powered by Opcode under the hood.

## Goals

- Trigger Claude Code agents from an iPad on the couch
- Watch live session output in real-time
- Stop running sessions
- Minimal setup friction (one-time IP + token entry)

## Non-Goals (for MVP)

- Full Opcode feature parity (analytics, MCP management, timeline)
- Resume/browse past sessions
- Custom agent profiles
- Multiple concurrent sessions
- Client-side mDNS network scanning/auto-discovery (daemon does advertise for `.local` hostname resolution)
- Push notifications
- Interactive follow-up input to running sessions (fire-and-forget prompts only for MVP)

## Architecture

```
[iPad Safari PWA] <--HTTP/WebSocket--> [Bun Daemon on dev machine] <--spawns--> [claude CLI]
```

Three packages in a Bun workspace monorepo:

```
claudeck/
├── packages/
│   ├── daemon/        # Bun server, process manager, WebSocket
│   ├── web/           # React PWA (Vite + Tailwind)
│   └── shared/        # TypeScript types for API contract
├── package.json       # Bun workspace root
└── CLAUDE.md
```

**Bun version:** >= 1.2 (stable WebSocket API, `Bun.spawn` reliability)

## Daemon (`packages/daemon`)

### Responsibilities

1. Serve PWA static files from `packages/web/dist/`
2. Expose REST API for project/session management
3. Manage WebSocket connections for real-time output streaming
4. Spawn and manage `claude` CLI processes
5. Advertise via mDNS for `.local` hostname reconnection

### Configuration

Config file: `~/.claudeck/config.json`

```typescript
type DaemonConfig = {
  token: string        // 32-byte hex, generated on first run
  port: number         // default 3847
  bind: string         // default "0.0.0.0"
}
```

CLI flags override config file values: `--port`, `--bind`.

### Startup Flow

1. Read or create config at `~/.claudeck/config.json`
2. Generate 32-byte hex auth token on first run, print to terminal
3. Start HTTP server on configured port (default `3847`)
4. Register mDNS service as `_claudeck._tcp`
5. Register SIGINT/SIGTERM handlers for graceful shutdown
6. Serve PWA and API

### Graceful Shutdown

On SIGINT/SIGTERM:
1. Stop accepting new connections
2. Send `session-ended` with `exitCode: -1` to all WebSocket clients
3. Kill all running claude processes (SIGTERM, then SIGKILL after 5s)
4. Close WebSocket connections
5. Exit

### REST API

All endpoints require `Authorization: Bearer <token>`.

**Error response shape** (all error responses):
```typescript
{ error: string, code: string }
```

| Method | Path | Description | Errors |
|--------|------|-------------|--------|
| `GET` | `/api/ping` | Health check, returns `DaemonInfo` | — |
| `GET` | `/api/projects` | Scan `~/.claude/projects/`, return project list | — |
| `POST` | `/api/sessions` | Start a claude process. Body: `CreateSessionRequest`. Returns `Session` | `409` if a session is already running (MVP: one at a time) |
| `GET` | `/api/sessions` | List active sessions | — |
| `DELETE` | `/api/sessions/:id` | Kill a running session | `404` if session not found |

Common errors: `401` invalid/missing token, `400` malformed request body.

### WebSocket (`/ws?token=<token>`)

Invalid token → close with code `4001`.

**Heartbeat:** Server sends `{ type: "ping" }` every 30 seconds. Client responds with `{ type: "pong" }`. If no pong received within 10 seconds, server closes the connection. PWA reconnects automatically on close.

**Client → Server:**
```typescript
{ type: "subscribe", sessionId: string }
{ type: "unsubscribe", sessionId: string }
{ type: "pong" }
```

**Server → Client:**
```typescript
{ type: "output", sessionId: string, data: ClaudeStreamEvent }
{ type: "session-started", sessionId: string }
{ type: "session-ended", sessionId: string, exitCode: number }
{ type: "error", message: string }
{ type: "ping" }
```

### Claude Stream Events

The daemon passes through Claude's `stream-json` output verbatim. Each line from stdout is a JSON object. Key event types from Claude CLI:

```typescript
// The daemon does NOT transform these — passed through as-is in the `data` field
type ClaudeStreamEvent = {
  type: "assistant" | "tool_use" | "tool_result" | "system" | "result"
  // Each type has different fields — see Claude CLI docs
  // The PWA renders based on the `type` field:
  //   "assistant" → markdown-rendered text
  //   "tool_use"  → collapsible tool call display
  //   "tool_result" → tool output
  //   "result" → final summary
  [key: string]: unknown
}
```

### Process Management

- Spawn via `Bun.spawn`: `claude --output-format stream-json -p "<prompt>" --project-dir <path>`
- Track in `Map<sessionId, { process: Subprocess, projectPath: string, prompt: string, startedAt: string }>`
- Pipe stdout through newline-delimited JSON parser
- Broadcast parsed events to subscribed WebSocket clients
- On process exit: remove from map, broadcast `session-ended` with exit code
- MVP enforces one active session at a time (return 409 on second `POST /api/sessions`)

### mDNS

- Advertise as `_claudeck._tcp` using `bonjour-service` package
- Include hostname and port in service record
- Enables `.local` hostname resolution for reconnection after IP changes
- This is daemon-side advertisement only — no client-side discovery in MVP

## PWA Frontend (`packages/web`)

### Tech Stack

- React 18 + TypeScript
- Vite 6 for build
- Tailwind CSS for styling
- Vite PWA plugin for service worker / manifest

### Connection Flow

1. First visit → enter daemon IP:port and auth token manually
2. Store in localStorage
3. Call `GET /api/ping` — daemon returns hostname/mDNS name
4. Store mDNS name for future reconnection
5. On subsequent visits: try stored IP (3s timeout), fall back to `<hostname>.local:3847` (3s timeout)
6. Connection failure → show status banner with retry + manual entry option
7. Establish WebSocket, auto-reconnect on drop (exponential backoff: 1s, 2s, 4s, max 30s)

### Screens

**1. Projects List**
- Grid/list of projects from `GET /api/projects`
- Project name (derived from directory name), full path
- Tap to enter project view

**2. Project View**
- Active session for this project (if any)
- "New Session" button → text input for prompt
- Tap active session to watch output

**3. Session View (main screen)**
- Live-streaming output from claude process
- Auto-scrolling with scroll-lock toggle (tap bottom to re-enable)
- Rendered markdown for `assistant` type events
- Collapsible tool use/result blocks
- Syntax-highlighted code blocks (lightweight: Prism or Shiki)
- Stop button (red, prominent, fixed position)
- Session status indicator (running spinner / ended with exit code)
- Connection status banner (shows reconnecting state)

### PWA Configuration

- `display: standalone` for fullscreen Home Screen experience
- Landscape + portrait orientation support
- App icon and splash screen
- Service worker caches the UI shell
- Offline: loads UI, shows "disconnected" state

### UI Design Principles

- Dark theme by default (terminal aesthetic)
- Large touch targets (44px minimum)
- Monospace font for session output
- System font for app chrome
- Bottom navigation bar (iPad thumb ergonomics)

## Shared Types (`packages/shared`)

Pure TypeScript types, no runtime code.

```typescript
// WebSocket messages
type WsClientMessage =
  | { type: "subscribe"; sessionId: string }
  | { type: "unsubscribe"; sessionId: string }
  | { type: "pong" }

type WsServerMessage =
  | { type: "output"; sessionId: string; data: ClaudeStreamEvent }
  | { type: "session-started"; sessionId: string }
  | { type: "session-ended"; sessionId: string; exitCode: number }
  | { type: "error"; message: string }
  | { type: "ping" }

type ClaudeStreamEvent = {
  type: string
  [key: string]: unknown
}

// REST API types
type Project = {
  id: string          // slug derived from directory name (e.g., "my-project")
  path: string        // absolute path (e.g., "/Users/foo/Work/my-project")
  name: string        // directory name (e.g., "my-project")
}

type Session = {
  id: string          // crypto.randomUUID()
  projectId: string   // matches Project.id
  prompt: string
  status: "running" | "ended"
  exitCode?: number   // present when status === "ended"
  startedAt: string   // ISO 8601
}

type DaemonInfo = {
  hostname: string
  mdnsName: string    // e.g., "macbook-pro.local"
  version: string
}

type CreateSessionRequest = {
  projectPath: string
  prompt: string
}

type ApiError = {
  error: string
  code: string        // e.g., "SESSION_ACTIVE", "NOT_FOUND", "INVALID_TOKEN"
}

type DaemonConfig = {
  token: string
  port: number
  bind: string
}
```

## Auth & Security

- **Token auth:** 32-byte random hex token, generated on first daemon run
- **Storage:** `~/.claudeck/config.json`
- **REST:** `Authorization: Bearer <token>` header on all requests
- **WebSocket:** token as query param `/ws?token=<token>`
- **Invalid token:** 401 HTTP / WebSocket close with code 4001
- **Network binding:** default `0.0.0.0`, optional `--bind <ip>` flag
- **No HTTPS:** LAN-only, iOS Safari doesn't enforce for local IPs
- **Rate limiting:** 5 failed auth attempts per minute per IP (in-memory)

## MVP Scope

**In scope:**
- List projects from `~/.claude/projects/`
- Start a new session (one at a time, 409 on second attempt)
- Live-stream session output via WebSocket
- Stop a running session
- Token-based auth
- PWA installable on iPad Home Screen
- mDNS advertisement for `.local` hostname reconnection
- WebSocket heartbeat for mobile Safari resilience
- Graceful daemon shutdown

**Post-MVP:**
- Resume/browse past sessions
- Interactive follow-up input to running sessions
- Custom agent profiles (saved prompts + permissions)
- Multiple concurrent sessions
- Session search/filtering
- Client-side mDNS network discovery
- Sound/haptic notification on session completion
