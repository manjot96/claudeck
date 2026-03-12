import { useState, useEffect } from "react"
import type { Session } from "@claudeck/shared"

type Props = {
  sessions: Session[]
  onSelect: (session: Session) => void
  onBack: () => void
}

function elapsed(startedAt: string): string {
  const seconds = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000)
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${String(secs).padStart(2, "0")}`
}

export default function SessionListScreen({ sessions, onSelect, onBack }: Props) {
  const [, setTick] = useState(0)

  // Update elapsed times every second
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="min-h-screen bg-surface p-6 pb-28">
      <button
        onClick={onBack}
        className="flex items-center gap-2 bg-surface-raised rounded-full px-4 py-2
                   text-accent text-sm font-medium min-h-[44px] min-w-[44px]
                   border border-transparent hover:border-accent
                   transition-colors duration-150 mb-6"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Projects
      </button>

      <h1 className="text-[28px] font-bold text-slate-100 mb-4">Active Sessions</h1>
      <p className="text-sm text-slate-500 mb-6">{sessions.length} session{sessions.length !== 1 ? "s" : ""} running</p>

      <div className="space-y-3">
        {sessions.map((s) => (
          <button
            key={s.id}
            onClick={() => onSelect(s)}
            className="w-full text-left bg-surface-raised rounded-xl p-4
                       border border-surface-overlay hover:bg-surface-overlay/30
                       transition-colors duration-150 min-h-[72px]"
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
              </span>
              <span className="text-xs text-accent font-medium uppercase tracking-wider">Running</span>
            </div>
            <p className="text-sm text-slate-200 line-clamp-2">{s.prompt}</p>
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-slate-500">{s.projectId}</span>
              <span className="text-xs text-accent font-mono">{elapsed(s.startedAt)}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
