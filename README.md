# ClauDeck

Control [Claude Code](https://docs.anthropic.com/en/docs/claude-code) sessions from your iPad (or any browser) over your local network.

ClauDeck is a PWA + Bun daemon that runs on your dev machine, spawns `claude` CLI processes, and streams their output in real-time to a Progressive Web App via WebSocket.

Inspired by and based on [Opcode](https://github.com/winfunc/opcode).

## Features

- **Remote Claude Code** — trigger Claude Code agents from any device on your LAN
- **Live streaming** — watch session output in real-time via WebSocket
- **PWA** — install on your iPad Home Screen for a native-like experience
- **Dark terminal aesthetic** — monospace output with syntax highlighting
- **Token auth** — secure access with a generated auth token
- **mDNS** — automatic `.local` hostname discovery for reconnection

## Architecture

```
[iPad Safari PWA] <--HTTP/WebSocket--> [Bun Daemon on dev machine] <--spawns--> [claude CLI]
```

Three packages in a Bun workspace monorepo:

| Package | Description |
|---------|-------------|
| `packages/shared` | TypeScript types for the API contract (no runtime code) |
| `packages/daemon` | Bun HTTP/WebSocket server, process manager, mDNS |
| `packages/web` | React PWA (Vite + Tailwind CSS) |

## Tech Stack

- **Runtime:** [Bun](https://bun.sh) >= 1.2
- **Frontend:** React 18, TypeScript, Vite 6, Tailwind CSS v4
- **PWA:** vite-plugin-pwa
- **mDNS:** bonjour-service

## Getting Started

> **Prerequisites:** [Bun](https://bun.sh) >= 1.2 and [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code) installed.

```bash
# Install dependencies
bun install

# Start the daemon (generates auth token on first run)
bun run --filter daemon start

# Build the PWA
bun run --filter web build
```

On first run, the daemon prints an auth token to the terminal. Enter the daemon's IP address and this token in the PWA to connect.

## API

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/ping` | Health check |
| `GET` | `/api/projects` | List Claude Code projects |
| `POST` | `/api/sessions` | Start a new session |
| `GET` | `/api/sessions` | List active sessions |
| `DELETE` | `/api/sessions/:id` | Stop a running session |

WebSocket endpoint: `/ws?token=<token>`

All endpoints require `Authorization: Bearer <token>`.

## MVP Scope

- List projects from `~/.claude/projects/`
- Start one session at a time (fire-and-forget prompts)
- Live-stream session output
- Stop running sessions
- Token-based auth
- Installable PWA
- mDNS advertisement
- Graceful daemon shutdown

## License

MIT
