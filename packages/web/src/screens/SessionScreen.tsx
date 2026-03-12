import { useState, useEffect, useRef } from "react"
import type { Session, WsServerMessage, ClaudeStreamEvent, DisplayEvent, Settings } from "@claudeck/shared"
import StreamOutput from "../components/StreamOutput"
import SessionStats from "../components/SessionStats"
import ToolSummaryBar from "../components/ToolSummaryBar"
import InputBar from "../components/InputBar"
import SessionChanges from "../components/SessionChanges"
import { useNotificationSound } from "../hooks/useNotificationSound"
import {
  exportToMarkdown,
  downloadMarkdown,
  shareMarkdown,
} from "../utils/exportMarkdown"

type Props = {
  session: Session
  wsSubscribe: (sessionId: string) => void
  wsUnsubscribe: (sessionId: string) => void
  wsSendInput?: (sessionId: string, text: string) => void
  wsOnMessage: (handler: (msg: WsServerMessage) => void) => () => void
  getSessionEvents?: (id: string) => Promise<ClaudeStreamEvent[]>
  onStop: (sessionId: string) => Promise<void>
  onBack: () => void
  settings: Settings
  onNotify?: (title: string, body: string, sessionId: string) => void
}

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  if (m === 0) return `${s}s`
  return `${m}m ${s.toString().padStart(2, "0")}s`
}

export default function SessionScreen({
  session,
  wsSubscribe,
  wsUnsubscribe,
  wsSendInput,
  wsOnMessage,
  getSessionEvents,
  onStop,
  onBack,
  settings,
  onNotify,
}: Props) {
  const [events, setEvents] = useState<ClaudeStreamEvent[]>([])
  const [displayEvents, setDisplayEvents] = useState<DisplayEvent[]>([])
  const [inputReady, setInputReady] = useState(false)
  const inputTimeoutRef = useRef<ReturnType<typeof setTimeout>>()
  const [ended, setEnded] = useState(session.status === "ended")
  const [exitCode, setExitCode] = useState<number | null>(session.exitCode ?? null)
  const [tokenUsage, setTokenUsage] = useState(session.tokenUsage)
  const [estimatedCost, setEstimatedCost] = useState(session.estimatedCost)
  const [stopping, setStopping] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const sound = useNotificationSound(settings.soundEnabled, settings.hapticEnabled)

  // Elapsed timer
  useEffect(() => {
    const startMs = new Date(session.startedAt).getTime()

    // If session already ended, show final duration and don't tick
    if (session.status === "ended" && session.endedAt) {
      setElapsed(Math.floor((new Date(session.endedAt).getTime() - startMs) / 1000))
      return
    }

    function tick() {
      setElapsed(Math.floor((Date.now() - startMs) / 1000))
    }
    tick()
    timerRef.current = setInterval(tick, 1000)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [session.startedAt, session.endedAt, session.status])

  // Stop timer when ended
  useEffect(() => {
    if (ended && timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [ended])

  // For ended sessions, fetch archived events via REST
  useEffect(() => {
    if (session.status === "ended" && getSessionEvents) {
      getSessionEvents(session.id).then((archived) => {
        if (archived.length > 0) setEvents(archived)
      }).catch(() => {})
    }
  }, [session.id, session.status, getSessionEvents])

  useEffect(() => {
    wsSubscribe(session.id)
    return () => wsUnsubscribe(session.id)
  }, [session.id, wsSubscribe, wsUnsubscribe])

  useEffect(() => {
    return wsOnMessage((msg) => {
      if (msg.type === "output" && msg.sessionId === session.id) {
        setEvents((prev) => [...prev, msg.data])
        setDisplayEvents((prev) => [...prev, msg.data])
        if (msg.data.type === "result") setInputReady(true)
      }
      if (msg.type === "user-input" && msg.sessionId === session.id) {
        setDisplayEvents((prev) => [...prev, { _display: "user-input", text: msg.text, sentAt: new Date().toISOString() }])
      }
      if (msg.type === "session-ended" && msg.sessionId === session.id) {
        setEnded(true)
        setExitCode(msg.exitCode)
        // Extract token data if available in the message
        const msgAny = msg as Record<string, unknown>
        if (msgAny.tokenUsage) setTokenUsage(msgAny.tokenUsage as typeof tokenUsage)
        if (msgAny.estimatedCost != null) setEstimatedCost(msgAny.estimatedCost as number)
        // Play sound/haptic notification
        sound.play(msg.exitCode === 0 ? "success" : "failure")
        // Browser push notification
        const truncated = session.prompt.length > 60 ? session.prompt.slice(0, 60) + "\u2026" : session.prompt
        onNotify?.(
          msg.exitCode === 0 ? "Session Complete" : "Session Failed",
          truncated,
          session.id
        )
      }
    })
  }, [session.id, wsOnMessage, sound, onNotify, session.prompt])

  // Fallback: enable input after 5 minutes if no result event
  useEffect(() => {
    if (!inputReady && !ended && session.status === "running") {
      inputTimeoutRef.current = setTimeout(() => setInputReady(true), 5 * 60 * 1000)
      return () => clearTimeout(inputTimeoutRef.current)
    }
  }, [inputReady, ended, session.status])

  function handleSendInput(text: string) {
    wsSendInput?.(session.id, text)
    setInputReady(false)
    setDisplayEvents((prev) => [...prev, { _display: "user-input", text, sentAt: new Date().toISOString() }])
  }

  async function handleStop() {
    setStopping(true)
    await onStop(session.id)
  }

  async function handleExport() {
    const md = exportToMarkdown(session, events)
    const filename = `claudeck-${session.id.slice(0, 8)}.md`
    const shared = await shareMarkdown(filename, md)
    if (!shared) downloadMarkdown(filename, md)
  }

  const truncatedPrompt = session.prompt.length > 60
    ? session.prompt.slice(0, 60) + "\u2026"
    : session.prompt

  return (
    <div className="h-screen bg-surface flex flex-col">
      {/* Header */}
      <div
        className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4
                    bg-surface-raised/95 backdrop-blur-sm border-b border-surface-overlay"
        style={{ height: 60 }}
      >
        {/* Back button */}
        <button
          onClick={onBack}
          className="flex items-center justify-center bg-surface-overlay/50 rounded-full p-2
                     min-h-[44px] min-w-[44px] shrink-0"
          aria-label="Back"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12.5 15L7.5 10L12.5 5" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {/* Center: prompt + status */}
        <div className="flex-1 mx-3 text-center min-w-0">
          <div className="text-sm font-semibold text-slate-100 truncate">
            {truncatedPrompt}
          </div>
          <div className="flex items-center justify-center gap-2 mt-0.5">
            {ended ? (
              exitCode === 0 ? (
                <span className="flex items-center gap-1 text-xs text-success">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M2.5 6L5 8.5L9.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Completed (exit 0)
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs text-danger">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M3 3L9 9M9 3L3 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                  Failed (exit {exitCode})
                </span>
              )
            ) : (
              <span className="flex items-center gap-1 text-xs text-accent">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                </span>
                Running
              </span>
            )}
            <span className="text-xs text-slate-500">{formatElapsed(elapsed)}</span>
          </div>
        </div>

        {/* Export + Stop buttons */}
        {ended && events.length > 0 && (
          <button
            onClick={handleExport}
            className="flex items-center justify-center bg-surface-overlay/50 rounded-full p-2
                       min-h-[44px] min-w-[44px] shrink-0 mr-2"
            aria-label="Export"
          >
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 3v10M6 9l4 4 4-4" />
              <path d="M3 14v2a2 2 0 002 2h10a2 2 0 002-2v-2" />
            </svg>
          </button>
        )}
        {!ended ? (
          <button
            onClick={handleStop}
            disabled={stopping}
            className="flex items-center gap-1.5 bg-danger hover:bg-red-600 text-white
                       rounded-xl px-5 py-2.5 font-semibold min-h-[44px] shrink-0
                       disabled:opacity-50 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="2" y="2" width="10" height="10" rx="1.5" fill="currentColor" />
            </svg>
            Stop
          </button>
        ) : (
          <div className="min-w-[44px]" />
        )}
      </div>

      {/* Spacer for fixed header */}
      <div style={{ height: 60 }} className="shrink-0" />

      {/* Tool summary bar */}
      <ToolSummaryBar events={events} />

      {/* Output stream */}
      <div className="flex-1 min-h-0 pb-20">
        <StreamOutput
          events={displayEvents.length > 0 ? displayEvents : events}
          typewriterEnabled={settings.typewriterEffect ?? false}
        />
        {ended && <div className="px-4"><SessionChanges events={events} /></div>}
      </div>

      {/* Input bar for follow-up */}
      {!ended && wsSendInput && (
        <InputBar onSend={handleSendInput} disabled={!inputReady} />
      )}

      {/* Ended summary footer */}
      {ended && (
        <div className="fixed bottom-20 left-0 right-0 z-30 mx-4">
          <div className="bg-surface-raised rounded-t-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    exitCode === 0
                      ? "bg-green-500/20 text-success"
                      : "bg-red-500/20 text-danger"
                  }`}
                >
                  exit {exitCode}
                </span>
                <span className="text-sm text-slate-300">Session ended</span>
              </div>
              <span className="text-xs text-slate-500">{formatElapsed(elapsed)}</span>
            </div>
            <SessionStats tokenUsage={tokenUsage} estimatedCost={estimatedCost} />
          </div>
        </div>
      )}
    </div>
  )
}
