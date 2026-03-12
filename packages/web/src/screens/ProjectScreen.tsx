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

const MAX_PROMPT_LENGTH = 10000

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
    <div className="min-h-screen bg-surface p-6 pb-28">
      {/* Back button */}
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

      {/* Project header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-100">{project.name}</h1>
        <p className="text-sm text-slate-400 font-mono mt-1">{project.path}</p>
      </div>

      {/* Active Session card */}
      {activeSession && (
        <button
          onClick={() => onWatchSession(activeSession)}
          className="w-full mt-0 mb-8 p-4 bg-surface-raised rounded-xl
                     border-l-[3px] border-l-accent border border-surface-overlay
                     text-left min-h-[80px] shadow-lg shadow-accent/5
                     hover:bg-surface-overlay/30 transition-colors duration-150"
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-success" />
            </span>
            <span className="uppercase tracking-wider text-xs text-accent font-semibold">
              Active Session
            </span>
          </div>
          <p className="text-slate-100 text-sm line-clamp-2">{activeSession.prompt}</p>
          <div className="flex justify-end mt-2">
            <span className="text-xs text-slate-400">
              Tap to watch
              <svg className="inline ml-1 -mt-px" width="12" height="12" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </div>
        </button>
      )}

      {/* Error banner */}
      {error && (
        <div className="flex items-start gap-3 bg-danger/10 border border-danger/20 rounded-xl p-4 mb-6 transition-all duration-150">
          <svg className="text-danger shrink-0 mt-0.5" width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M10 6V10M10 14H10.01M18 10C18 14.4183 14.4183 18 10 18C5.58172 18 2 14.4183 2 10C2 5.58172 5.58172 2 10 2C14.4183 2 18 5.58172 18 10Z"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <p className="text-danger text-sm">{error}</p>
        </div>
      )}

      {/* New Session section */}
      <form onSubmit={handleStart} className="space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-slate-100">
            <path d="M10 4V16M4 10H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <h2 className="text-lg font-semibold text-slate-100">New Session</h2>
        </div>

        <div className="relative">
          <textarea
            value={prompt}
            onChange={(e) => {
              if (e.target.value.length <= MAX_PROMPT_LENGTH) {
                setPrompt(e.target.value)
              }
            }}
            placeholder="What should Claude do?"
            rows={4}
            className="w-full px-4 py-3 bg-surface-raised rounded-xl text-slate-100
                       border border-surface-overlay focus:border-accent
                       focus:outline-none text-base resize-none
                       placeholder:text-slate-500 transition-colors duration-150"
          />
          <span className="absolute bottom-3 right-3 text-xs text-slate-500">
            {prompt.length} / {MAX_PROMPT_LENGTH}
          </span>
        </div>

        <button
          type="submit"
          disabled={loading || !prompt.trim()}
          className="w-full flex items-center justify-center gap-2
                     py-4 bg-accent hover:bg-accent-hover rounded-xl
                     text-white font-semibold text-lg disabled:opacity-50
                     transition-colors duration-150 min-h-[56px]"
        >
          {loading ? (
            <>
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Starting session...
            </>
          ) : (
            "Start Session"
          )}
        </button>
      </form>
    </div>
  )
}
