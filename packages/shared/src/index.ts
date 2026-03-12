// ── WebSocket Messages ──

export type WsClientMessage =
  | { type: "subscribe"; sessionId: string }
  | { type: "unsubscribe"; sessionId: string }
  | { type: "pong" }

export type WsServerMessage =
  | { type: "output"; sessionId: string; data: ClaudeStreamEvent }
  | { type: "session-started"; sessionId: string }
  | { type: "session-ended"; sessionId: string; exitCode: number }
  | { type: "error"; message: string }
  | { type: "ping" }

export type ClaudeStreamEvent = {
  type: string
  [key: string]: unknown
}

// ── REST API Types ──

export type Project = {
  id: string
  path: string
  name: string
}

export type Session = {
  id: string
  projectId: string
  prompt: string
  status: "running" | "ended"
  exitCode?: number
  startedAt: string
}

export type DaemonInfo = {
  hostname: string
  mdnsName: string
  version: string
}

export type CreateSessionRequest = {
  projectPath: string
  prompt: string
}

export type ApiError = {
  error: string
  code: string
}

// ── Daemon Config ──

export type DaemonConfig = {
  token: string
  port: number
  bind: string
}
