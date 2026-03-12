import { useState, useEffect } from "react"
import type { Project } from "@claudeck/shared"

type Props = {
  getProjects: () => Promise<Project[]>
  onSelect: (project: Project) => void
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
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <p className="text-slate-400">Loading projects...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface p-6 pb-24">
      <h1 className="text-2xl font-bold text-slate-100 mb-6">Projects</h1>

      {error && <p className="text-danger mb-4">{error}</p>}

      {projects.length === 0 ? (
        <p className="text-slate-400">
          No projects found. Start a Claude Code session on your dev machine first.
        </p>
      ) : (
        <div className="space-y-3">
          {projects.map((project) => (
            <button
              key={project.id}
              onClick={() => onSelect(project)}
              className="w-full text-left p-4 bg-surface-raised rounded-lg
                         border border-surface-overlay hover:border-accent
                         transition-colors min-h-[56px]"
            >
              <div className="font-semibold text-slate-100">{project.name}</div>
              <div className="text-sm text-slate-400 mt-1 font-mono truncate">
                {project.path}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
