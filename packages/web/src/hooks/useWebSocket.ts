import { useEffect, useRef, useState, useCallback } from "react"
import type { WsServerMessage, WsClientMessage } from "@claudeck/shared"

type WsStatus = "connecting" | "connected" | "disconnected"

export function useWebSocket(
  host: string | null,
  token: string | null,
  onMessage: (msg: WsServerMessage) => void
) {
  const [status, setStatus] = useState<WsStatus>("disconnected")
  const wsRef = useRef<WebSocket | null>(null)
  const retriesRef = useRef(0)
  const onMessageRef = useRef(onMessage)
  onMessageRef.current = onMessage

  const connect = useCallback(() => {
    if (!host || !token) return
    setStatus("connecting")

    const ws = new WebSocket(`ws://${host}/ws?token=${token}`)
    wsRef.current = ws

    ws.onopen = () => {
      setStatus("connected")
      retriesRef.current = 0
    }

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data) as WsServerMessage
        if (msg.type === "ping") {
          ws.send(JSON.stringify({ type: "pong" } satisfies WsClientMessage))
          return
        }
        onMessageRef.current(msg)
      } catch {}
    }

    ws.onclose = () => {
      setStatus("disconnected")
      wsRef.current = null
      // Exponential backoff reconnect
      const delay = Math.min(1000 * 2 ** retriesRef.current, 30000)
      retriesRef.current++
      setTimeout(connect, delay)
    }

    ws.onerror = () => ws.close()
  }, [host, token])

  useEffect(() => {
    connect()
    return () => {
      retriesRef.current = Infinity // prevent reconnect on unmount
      wsRef.current?.close()
    }
  }, [connect])

  const send = useCallback((msg: WsClientMessage) => {
    wsRef.current?.send(JSON.stringify(msg))
  }, [])

  const subscribe = useCallback(
    (sessionId: string) => send({ type: "subscribe", sessionId }),
    [send]
  )

  const unsubscribe = useCallback(
    (sessionId: string) => send({ type: "unsubscribe", sessionId }),
    [send]
  )

  return { status, subscribe, unsubscribe }
}
