import { useState, useEffect } from "react"
import type { Project } from "@claudeck/shared"

type Props = {
  getProjects: () => Promise<Project[]>
  onSelect: (project: Project) => void
}

function SkeletonCard() {
  return (
    <div className="bg-surface-raised rounded-xl border border-surface-overlay p-5 min-h-[72px] animate-pulse">
      <div className="h-5 w-2/5 bg-slate-700 rounded mb-3" />
      <div className="h-4 w-3/4 bg-slate-700/60 rounded" />
    </div>
  )
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-3 bg-red-950/40 border border-red-800/50 rounded-xl px-4 py-3 mb-6">
      <svg
        className="w-5 h-5 text-red-400 shrink-0"
        viewBox="0 0 20 20"
        fill="currentColor"
      >
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
          clipRule="evenodd"
        />
      </svg>
      <p className="text-red-300 text-sm">{message}</p>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
      <svg
        className="w-16 h-16 text-slate-600 mb-6"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        <circle cx="12" cy="13" r="2.5" />
        <path d="M12 10.5V9" />
      </svg>
      <h2 className="text-lg font-semibold text-slate-300 mb-2">
        No projects found
      </h2>
      <p className="text-sm text-slate-500 max-w-xs">
        Start a Claude Code session on your dev machine first.
      </p>
    </div>
  )
}

function ProjectCard({
  project,
  onSelect,
}: {
  project: Project
  onSelect: (project: Project) => void
}) {
  return (
    <button
      onClick={() => onSelect(project)}
      className="group w-full text-left p-5 bg-surface-raised rounded-xl
                 border border-surface-overlay
                 hover:border-accent/50 hover:scale-[1.01]
                 active:scale-[0.99]
                 transition-all duration-150
                 min-h-[72px] flex items-center"
    >
      <div className="flex-1 min-w-0">
        <div className="text-lg font-semibold text-slate-100">
          {project.name}
        </div>
        <div className="text-sm font-mono text-slate-400 mt-1 truncate">
          {project.path}
        </div>
      </div>
      <span className="text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity duration-150 ml-3 text-lg shrink-0">
        →
      </span>
    </button>
  )
}

export default function ProjectsScreen({ getProjects, onSelect }: Props) {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    getProjects()
      .then(setProjects)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [getProjects])

  if (loading) {
    return (
      <div className="min-h-screen bg-surface p-6 pb-28">
        {/* Pull-to-refresh hint */}
        <div className="flex justify-center mb-6">
          <div className="w-10 h-1 rounded-full bg-slate-700 animate-pulse" />
        </div>

        {/* Header skeleton */}
        <div className="flex items-center gap-3 mb-6">
          <div className="h-7 w-28 bg-slate-700 rounded animate-pulse" />
          <div className="h-6 w-20 bg-slate-700/60 rounded-full animate-pulse" />
        </div>

        {/* Skeleton grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface p-6 pb-28">
      {/* Pull-to-refresh hint */}
      <div className="flex justify-center mb-6">
        <div className="w-10 h-1 rounded-full bg-slate-700 animate-pulse" />
      </div>

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-[28px] font-bold text-slate-100">Projects</h1>
        {projects.length > 0 && (
          <span className="px-2.5 py-0.5 text-xs rounded-full bg-surface-overlay text-slate-400">
            {projects.length} {projects.length === 1 ? "project" : "projects"}
          </span>
        )}
      </div>

      {error && <ErrorBanner message={error} />}

      {projects.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  )
}
