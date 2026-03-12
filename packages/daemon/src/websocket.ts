import type { ServerWebSocket } from "bun"
import type {
  WsClientMessage,
  WsServerMessage,
  ClaudeStreamEvent,
} from "@claudeck/shared"

export type WsData = {
  subscriptions: Set<string>
  awaitingPong: boolean
}

type SessionState = {
  events: Array<{ type: string; [key: string]: unknown }>
  ended: boolean
  exitCode: number | null
}

type GetSessionState = (sessionId: string) => SessionState | null

export function createWsHandler() {
  const clients = new Set<ServerWebSocket<WsData>>()
  let heartbeatInterval: ReturnType<typeof setInterval> | null = null
  let getSessionState: GetSessionState | null = null

  function setSessionStateProvider(provider: GetSessionState): void {
    getSessionState = provider
  }

  function open(ws: ServerWebSocket<WsData>): void {
    ws.data = { subscriptions: new Set(), awaitingPong: false }
    clients.add(ws)
  }

  function message(ws: ServerWebSocket<WsData>, raw: string | Buffer): void {
    try {
      const msg = JSON.parse(String(raw)) as WsClientMessage
      if (msg.type === "subscribe") {
        ws.data.subscriptions.add(msg.sessionId)

        // Replay buffered events for late subscribers
        if (getSessionState) {
          const state = getSessionState(msg.sessionId)
          if (state) {
            for (const event of state.events) {
              ws.send(
                JSON.stringify({
                  type: "output",
                  sessionId: msg.sessionId,
                  data: event,
                } satisfies WsServerMessage)
              )
            }
            // If session already ended, replay the ended message too
            if (state.ended && state.exitCode !== null) {
              ws.send(
                JSON.stringify({
                  type: "session-ended",
                  sessionId: msg.sessionId,
                  exitCode: state.exitCode,
                } satisfies WsServerMessage)
              )
            }
          }
        }
      } else if (msg.type === "unsubscribe") {
        ws.data.subscriptions.delete(msg.sessionId)
      } else if (msg.type === "pong") {
        ws.data.awaitingPong = false
      }
    } catch {
      // ignore malformed messages
    }
  }

  function close(ws: ServerWebSocket<WsData>): void {
    clients.delete(ws)
  }

  function broadcast(sessionId: string, msg: WsServerMessage): void {
    const payload = JSON.stringify(msg)
    for (const ws of clients) {
      if (ws.data.subscriptions.has(sessionId)) {
        ws.send(payload)
      }
    }
  }

  function broadcastAll(msg: WsServerMessage): void {
    const payload = JSON.stringify(msg)
    for (const ws of clients) {
      ws.send(payload)
    }
  }

  function broadcastOutput(sessionId: string, data: ClaudeStreamEvent): void {
    broadcast(sessionId, { type: "output", sessionId, data })
  }

  function broadcastSessionStarted(sessionId: string): void {
    broadcastAll({ type: "session-started", sessionId })
  }

  function broadcastSessionEnded(sessionId: string, exitCode: number): void {
    broadcastAll({ type: "session-ended", sessionId, exitCode })
  }

  function startHeartbeat(): void {
    heartbeatInterval = setInterval(() => {
      const ping: WsServerMessage = { type: "ping" }
      const payload = JSON.stringify(ping)
      for (const ws of clients) {
        if (ws.data.awaitingPong) {
          ws.close(4002, "Pong timeout")
          clients.delete(ws)
          continue
        }
        ws.data.awaitingPong = true
        ws.send(payload)
      }
    }, 30_000)
  }

  function stopHeartbeat(): void {
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval)
      heartbeatInterval = null
    }
  }

  function closeAll(): void {
    for (const ws of clients) {
      ws.close(1001, "Server shutting down")
    }
    clients.clear()
  }

  return {
    open,
    message,
    close,
    broadcast,
    broadcastOutput,
    broadcastSessionStarted,
    broadcastSessionEnded,
    setSessionStateProvider,
    startHeartbeat,
    stopHeartbeat,
    closeAll,
  }
}
