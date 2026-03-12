import { useState, useEffect } from "react"
import type { Session, WsServerMessage, ClaudeStreamEvent } from "@claudeck/shared"
import StreamOutput from "../components/StreamOutput"

type Props = {
  session: Session
  wsSubscribe: (sessionId: string) => void
  wsUnsubscribe: (sessionId: string) => void
  wsOnMessage: (handler: (msg: WsServerMessage) => void) => () => void
  onStop: (sessionId: string) => Promise<void>
  onBack: () => void
}

export default function SessionScreen({
  session,
  wsSubscribe,
  wsUnsubscribe,
  wsOnMessage,
  onStop,
  onBack,
}: Props) {
  const [events, setEvents] = useState<ClaudeStreamEvent[]>([])
  const [ended, setEnded] = useState(false)
  const [exitCode, setExitCode] = useState<number | null>(null)
  const [stopping, setStopping] = useState(false)

  useEffect(() => {
    wsSubscribe(session.id)
    return () => wsUnsubscribe(session.id)
  }, [session.id, wsSubscribe, wsUnsubscribe])

  useEffect(() => {
    return wsOnMessage((msg) => {
      if (msg.type === "output" && msg.sessionId === session.id) {
        setEvents((prev) => [...prev, msg.data])
      }
      if (msg.type === "session-ended" && msg.sessionId === session.id) {
        setEnded(true)
        setExitCode(msg.exitCode)
      }
    })
  }, [session.id, wsOnMessage])

  async function handleStop() {
    setStopping(true)
    await onStop(session.id)
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-surface-raised
                      border-b border-surface-overlay">
        <button onClick={onBack} className="text-accent min-h-[44px] min-w-[44px]">
          &larr; Back
        </button>
        <div className="text-center flex-1 mx-4">
          <div className="text-sm font-semibold text-slate-100 truncate">
            {session.prompt.slice(0, 50)}
            {session.prompt.length > 50 ? "..." : ""}
          </div>
          <div className="text-xs text-slate-400">
            {ended ? (
              <span className={exitCode === 0 ? "text-success" : "text-danger"}>
                Ended (exit {exitCode})
              </span>
            ) : (
              <span className="text-accent">Running...</span>
            )}
          </div>
        </div>
        {!ended && (
          <button
            onClick={handleStop}
            disabled={stopping}
            className="bg-danger text-white px-4 py-2 rounded-lg font-semibold
                       min-h-[44px] disabled:opacity-50"
          >
            Stop
          </button>
        )}
      </div>

      {/* Output stream */}
      <StreamOutput events={events} />
    </div>
  )
}
