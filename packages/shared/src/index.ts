// ── WebSocket Messages ──

export type WsClientMessage =
  | { type: "subscribe"; sessionId: string }
  | { type: "unsubscribe"; sessionId: string }
  | { type: "input"; sessionId: string; text: string }
  | { type: "pong" }

export type WsServerMessage =
  | { type: "output"; sessionId: string; data: ClaudeStreamEvent }
  | { type: "session-started"; sessionId: string }
  | { type: "session-ended"; sessionId: string; exitCode: number }
  | { type: "user-input"; sessionId: string; text: string }
  | { type: "error"; message: string }
  | { type: "ping" }

export type DisplayEvent =
  | (ClaudeStreamEvent & { _display?: never })
  | { _display: "user-input"; text: string; sentAt: string }

export type ClaudeStreamEvent = {
  type: string
  [key: string]: unknown
}

// ── Token Usage ──

export type TokenUsage = {
  input: number
  output: number
  cacheRead: number
  cacheWrite: number
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
  endedAt?: string
  tokenUsage?: TokenUsage
  estimatedCost?: number
}

export type DaemonInfo = {
  hostname: string
  mdnsName: string
  version: string
}

export type CreateSessionRequest = {
  projectPath: string
  prompt: string
  profileId?: string
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
  retentionDays?: number
  maxConcurrentSessions?: number
  tls?: { enabled: boolean; certPath: string; keyPath: string; caPath: string }
}

// ── Agent Profiles ──

export type AgentProfile = {
  id: string
  name: string
  promptTemplate: string
  allowedTools?: string[]
  cliFlags?: string[]
  projectScope: string[]
  createdAt: string
  updatedAt: string
}

// ── Saved Machines ──

export type SavedMachine = {
  id: string
  name: string
  host: string
  token: string
  mdnsName?: string
  lastSeen: string
  isDefault: boolean
}

// ── Settings ──

export type Settings = {
  soundEnabled: boolean
  notificationsEnabled: boolean
  hapticEnabled: boolean
  theme: "dark" | "light" | "system"
  fontSize: "small" | "medium" | "large"
  autoScroll: boolean
  typewriterEffect: boolean
  expandToolResults: boolean
  showRawJson: boolean
}
