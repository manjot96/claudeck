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

export function createWsHandler() {
  const clients = new Set<ServerWebSocket<WsData>>()
  let heartbeatInterval: ReturnType<typeof setInterval> | null = null

  function open(ws: ServerWebSocket<WsData>): void {
    ws.data = { subscriptions: new Set(), awaitingPong: false }
    clients.add(ws)
  }

  function message(ws: ServerWebSocket<WsData>, raw: string | Buffer): void {
    try {
      const msg = JSON.parse(String(raw)) as WsClientMessage
      if (msg.type === "subscribe") {
        ws.data.subscriptions.add(msg.sessionId)
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
    startHeartbeat,
    stopHeartbeat,
    closeAll,
  }
}
