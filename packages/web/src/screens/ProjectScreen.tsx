import { useState, useEffect, useCallback, useMemo } from "react"
import type { Project, Session, CreateSessionRequest } from "@claudeck/shared"
import { usePullToRefresh } from "../hooks/usePullToRefresh"
import SearchBar from "../components/SearchBar"
import FilterChips from "../components/FilterChips"
import TemplatesDrawer from "../components/TemplatesDrawer"
import { useTemplates } from "../hooks/useTemplates"

type Props = {
  project: Project
  getSessions: () => Promise<Session[]>
  getAllSessions: () => Promise<Session[]>
  createSession: (body: CreateSessionRequest) => Promise<Session>
  onSessionStarted: (session: Session) => void
  onWatchSession: (session: Session) => void
  onBack: () => void
}

const MAX_PROMPT_LENGTH = 10000

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

function formatRelativeTime(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (seconds < 60) return "just now"
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function formatDuration(start: string, end?: string): string {
  if (!end) return "running"
  const ms = new Date(end).getTime() - new Date(start).getTime()
  const seconds = Math.floor(ms / 1000)
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  const remaining = seconds % 60
  if (minutes < 60) return `${minutes}m ${remaining}s`
  const hours = Math.floor(minutes / 60)
  return `${hours}h ${minutes % 60}m`
}

export default function ProjectScreen({
  project,
  getSessions,
  getAllSessions,
  createSession,
  onSessionStarted,
  onWatchSession,
  onBack,
}: Props) {
  const [prompt, setPrompt] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [activeSession, setActiveSession] = useState<Session | null>(null)
  const [recentSessions, setRecentSessions] = useState<Session[]>([])
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "longest">("newest")
  const [showTemplates, setShowTemplates] = useState(false)
  const { templates, add: addTemplate, remove: removeTemplate, use: useTemplate } = useTemplates(project.id)

  const fetchSessions = useCallback(async () => {
    await getSessions().then((sessions) => {
      const active = sessions.find((s) => s.status === "running")
      setActiveSession(active ?? null)
    }).catch(() => {})

    await getAllSessions().then((sessions) => {
      const projectSessions = sessions.filter((s) => s.projectId === project.id)
      setRecentSessions(projectSessions)
    }).catch(() => {})
  }, [getSessions, getAllSessions, project.id])

  useEffect(() => {
    fetchSessions()
  }, [fetchSessions])

  const { containerProps, refreshing, pullDistance } = usePullToRefresh({
    onRefresh: fetchSessions,
  })

  const filterOptions = [
    { value: "all", label: "All" },
    { value: "completed", label: "Completed" },
    { value: "failed", label: "Failed" },
  ]

  const filteredSessions = useMemo(() => {
    let filtered = recentSessions.filter((s) => s.status === "ended")
    if (search) {
      const q = search.toLowerCase()
      filtered = filtered.filter((s) => s.prompt.toLowerCase().includes(q))
    }
    if (statusFilter === "completed") filtered = filtered.filter((s) => s.exitCode === 0)
    if (statusFilter === "failed") filtered = filtered.filter((s) => s.exitCode !== 0)

    return [...filtered].sort((a, b) => {
      if (sortBy === "oldest") return a.startedAt.localeCompare(b.startedAt)
      if (sortBy === "longest") {
        const durA = a.endedAt ? new Date(a.endedAt).getTime() - new Date(a.startedAt).getTime() : Infinity
        const durB = b.endedAt ? new Date(b.endedAt).getTime() - new Date(b.startedAt).getTime() : Infinity
        return durB - durA
      }
      return b.startedAt.localeCompare(a.startedAt)
    })
  }, [recentSessions, search, statusFilter, sortBy])

  const totals = useMemo(() => {
    let tokens = 0, cost = 0
    for (const s of recentSessions) {
      if (s.tokenUsage) tokens += s.tokenUsage.input + s.tokenUsage.output
      if (s.estimatedCost) cost += s.estimatedCost
    }
    return { tokens, cost }
  }, [recentSessions])

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
    <div
      className="min-h-screen bg-surface p-6 pb-28"
      style={{ transform: `translateY(${pullDistance}px)` }}
      {...containerProps}
    >
      {/* Pull-to-refresh spinner */}
      {refreshing && (
        <div className="flex justify-center mb-4">
          <svg className="animate-spin h-5 w-5 text-accent" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      )}
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
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-slate-100">
              <path d="M10 4V16M4 10H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <h2 className="text-lg font-semibold text-slate-100">New Session</h2>
          </div>
          <div className="flex items-center gap-2">
            {prompt.trim() && (
              <button
                type="button"
                onClick={() => {
                  const name = prompt.trim().slice(0, 50)
                  addTemplate(name, prompt.trim(), project.id)
                }}
                className="text-xs text-slate-400 hover:text-accent transition-colors
                           min-h-[36px] px-2 flex items-center gap-1"
                title="Save as template"
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="8,1 10,6 15,6.5 11,10 12.5,15 8,12 3.5,15 5,10 1,6.5 6,6" />
                </svg>
                Save
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowTemplates(true)}
              className="text-xs text-slate-400 hover:text-accent transition-colors
                         min-h-[36px] px-2 flex items-center gap-1"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="12" height="12" rx="2" />
                <path d="M5 5h6M5 8h6M5 11h3" />
              </svg>
              Templates
            </button>
          </div>
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

      {/* Recent Sessions */}
      {recentSessions.filter((s) => s.status === "ended").length > 0 && (
        <div className="mt-10">
          <div className="flex items-center gap-2 mb-4">
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-slate-400">
              <path d="M10 6V10L13 13M18 10C18 14.4183 14.4183 18 10 18C5.58172 18 2 14.4183 2 10C2 5.58172 5.58172 2 10 2C14.4183 2 18 5.58172 18 10Z"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <h2 className="text-lg font-semibold text-slate-100">Recent Sessions</h2>
            <span className="text-xs text-slate-500 bg-surface-overlay px-2 py-0.5 rounded-full">
              {recentSessions.filter((s) => s.status === "ended").length}
            </span>
          </div>

          {totals.tokens > 0 && (
            <div className="text-xs text-slate-500 px-1 mb-2">
              Project total: {formatTokens(totals.tokens)} tokens · ${totals.cost.toFixed(4)}
            </div>
          )}

          <div className="space-y-3 mb-3">
            <SearchBar value={search} onChange={setSearch} placeholder="Search sessions..." />
            <div className="flex items-center gap-2">
              <FilterChips options={filterOptions} active={statusFilter} onChange={setStatusFilter} />
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="bg-surface-overlay text-slate-200 text-xs rounded-lg px-2 py-1.5 border border-surface-overlay ml-auto">
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
                <option value="longest">Longest</option>
              </select>
            </div>
          </div>

          <div className="space-y-3">
            {filteredSessions.map((session) => (
                <button
                  key={session.id}
                  onClick={() => onWatchSession(session)}
                  className="w-full p-4 bg-surface-raised rounded-xl
                             border border-surface-overlay text-left
                             min-h-[72px] hover:bg-surface-overlay/30
                             transition-colors duration-150"
                >
                  <p className="text-slate-200 text-sm line-clamp-2 mb-2">{session.prompt}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                        session.exitCode === 0 ? "text-success" : "text-danger"
                      }`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${
                          session.exitCode === 0 ? "bg-success" : "bg-danger"
                        }`} />
                        {session.exitCode === 0 ? "Completed" : `Exit ${session.exitCode}`}
                      </span>
                      <span className="text-xs text-slate-500">
                        {formatDuration(session.startedAt, session.endedAt)}
                      </span>
                    </div>
                    <span className="text-xs text-slate-500">
                      {formatRelativeTime(session.startedAt)}
                    </span>
                  </div>
                </button>
              ))}
          </div>
        </div>
      )}

      <TemplatesDrawer
        open={showTemplates}
        onClose={() => setShowTemplates(false)}
        templates={templates}
        onSelect={(t) => {
          useTemplate(t.id)
          setPrompt(t.prompt)
          setShowTemplates(false)
        }}
        onDelete={removeTemplate}
      />
    </div>
  )
}
