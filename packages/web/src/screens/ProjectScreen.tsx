import { useState, useEffect } from "react"
import type { Project, Session, CreateSessionRequest } from "@claudeck/shared"

type Props = {
  project: Project
  getSessions: () => Promise<Session[]>
  createSession: (body: CreateSessionRequest) => Promise<Session>
  onSessionStarted: (session: Session) => void
  onWatchSession: (session: Session) => void
  onBack: () => void
}

export default function ProjectScreen({
  project,
  getSessions,
  createSession,
  onSessionStarted,
  onWatchSession,
  onBack,
}: Props) {
  const [prompt, setPrompt] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [activeSession, setActiveSession] = useState<Session | null>(null)

  useEffect(() => {
    getSessions().then((sessions) => {
      const active = sessions.find((s) => s.status === "running")
      setActiveSession(active ?? null)
    }).catch(() => {})
  }, [getSessions])

  async function handleStart(e: React.FormEvent) {
    e.preventDefault()
    if (!prompt.trim()) return
    setError("")
    setLoading(true)
    try {
      const session = await createSession({
        projectPath: project.path,
        prompt: prompt.trim(),
      })
      onSessionStarted(session)
    } catch (e: unknown) {
      if (e instanceof Error) setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface p-6 pb-24">
      <button
        onClick={onBack}
        className="text-accent mb-4 min-h-[44px] min-w-[44px]"
      >
        &larr; Projects
      </button>

      <h1 className="text-2xl font-bold text-slate-100">{project.name}</h1>
      <p className="text-sm text-slate-400 font-mono mt-1">{project.path}</p>

      {activeSession && (
        <button
          onClick={() => onWatchSession(activeSession)}
          className="w-full mt-6 p-4 bg-surface-raised rounded-lg border border-accent
                     text-left min-h-[56px]"
        >
          <div className="text-accent text-sm font-semibold">Active Session</div>
          <div className="text-slate-100 mt-1 truncate">{activeSession.prompt}</div>
          <div className="text-xs text-slate-400 mt-1">Tap to watch output</div>
        </button>
      )}

      <form onSubmit={handleStart} className="mt-8 space-y-4">
        <div>
          <label className="block text-sm text-slate-400 mb-1">Prompt</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="What should Claude do?"
            rows={4}
            className="w-full px-4 py-3 bg-surface-raised rounded-lg text-slate-100
                       border border-surface-overlay focus:border-accent
                       focus:outline-none text-base resize-none"
          />
        </div>

        {error && <p className="text-danger text-sm">{error}</p>}

        <button
          type="submit"
          disabled={loading || !prompt.trim()}
          className="w-full py-4 bg-accent hover:bg-accent-hover rounded-lg
                     text-white font-semibold text-lg disabled:opacity-50
                     transition-colors min-h-[56px]"
        >
          {loading ? "Starting..." : "Start Session"}
        </button>
      </form>
    </div>
  )
}
