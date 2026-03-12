import { useState, useEffect } from "react"
import type { AgentProfile } from "@claudeck/shared"

type Props = {
  getProfiles: () => Promise<AgentProfile[]>
  createProfile: (
    body: Omit<AgentProfile, "id" | "createdAt" | "updatedAt">
  ) => Promise<AgentProfile>
  deleteProfile: (id: string) => Promise<{ ok: boolean }>
  onBack: () => void
}

export default function ProfilesScreen({
  getProfiles,
  createProfile,
  deleteProfile,
  onBack,
}: Props) {
  const [profiles, setProfiles] = useState<AgentProfile[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [name, setName] = useState("")
  const [template, setTemplate] = useState("")
  const [cliFlags, setCliFlags] = useState("")

  useEffect(() => {
    getProfiles().then(setProfiles).catch(() => {})
  }, [getProfiles])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !template.trim()) return
    const profile = await createProfile({
      name: name.trim(),
      promptTemplate: template.trim(),
      cliFlags: cliFlags
        .split(",")
        .map((f) => f.trim())
        .filter(Boolean),
      projectScope: [],
    })
    setProfiles((prev) => [...prev, profile])
    setName("")
    setTemplate("")
    setCliFlags("")
    setShowCreate(false)
  }

  async function handleDelete(id: string) {
    await deleteProfile(id)
    setProfiles((prev) => prev.filter((p) => p.id !== id))
  }

  return (
    <div className="min-h-screen bg-surface p-6 pb-28">
      <button
        onClick={onBack}
        className="flex items-center gap-2 bg-surface-raised rounded-full px-4 py-2
                   text-accent text-sm font-medium min-h-[44px] min-w-[44px]
                   border border-transparent hover:border-accent
                   transition-colors duration-150 mb-6"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M10 12L6 8L10 4"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Back
      </button>

      <h1 className="text-2xl font-bold text-slate-100 mb-6">
        Agent Profiles
      </h1>

      {profiles.length === 0 && !showCreate && (
        <p className="text-slate-500 text-sm text-center py-8">
          No profiles yet. Create one to use preset prompts and CLI flags.
        </p>
      )}

      <div className="space-y-3 mb-6">
        {profiles.map((p) => (
          <div
            key={p.id}
            className="bg-surface-raised rounded-xl p-4 border border-surface-overlay"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-200">
                  {p.name}
                </h3>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                  {p.promptTemplate}
                </p>
                {p.cliFlags && p.cliFlags.length > 0 && (
                  <div className="flex gap-1 mt-2 flex-wrap">
                    {p.cliFlags.map((flag, i) => (
                      <span
                        key={i}
                        className="text-[10px] bg-surface-overlay px-1.5 py-0.5 rounded text-slate-400 font-mono"
                      >
                        {flag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={() => handleDelete(p.id)}
                className="text-slate-500 hover:text-danger transition-colors p-2
                           min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <path d="M4 4l8 8M12 4l-8 8" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>

      {showCreate ? (
        <form
          onSubmit={handleCreate}
          className="bg-surface-raised rounded-xl p-4 border border-surface-overlay space-y-3"
        >
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Profile name"
            className="w-full px-3 py-2 bg-surface rounded-lg text-slate-100 text-sm
                       border border-surface-overlay focus:border-accent focus:outline-none"
          />
          <textarea
            value={template}
            onChange={(e) => setTemplate(e.target.value)}
            placeholder="Prompt template"
            rows={3}
            className="w-full px-3 py-2 bg-surface rounded-lg text-slate-100 text-sm
                       border border-surface-overlay focus:border-accent focus:outline-none resize-none"
          />
          <input
            value={cliFlags}
            onChange={(e) => setCliFlags(e.target.value)}
            placeholder="CLI flags (comma-separated, optional)"
            className="w-full px-3 py-2 bg-surface rounded-lg text-slate-100 text-sm
                       border border-surface-overlay focus:border-accent focus:outline-none"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={!name.trim() || !template.trim()}
              className="flex-1 py-2.5 bg-accent hover:bg-accent-hover rounded-lg
                         text-white font-medium text-sm disabled:opacity-50
                         transition-colors min-h-[44px]"
            >
              Create
            </button>
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="px-4 py-2.5 bg-surface-overlay rounded-lg
                         text-slate-300 text-sm min-h-[44px]"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setShowCreate(true)}
          className="w-full py-3 border-2 border-dashed border-surface-overlay rounded-xl
                     text-slate-400 text-sm hover:border-accent hover:text-accent
                     transition-colors min-h-[44px]"
        >
          + New Profile
        </button>
      )}
    </div>
  )
}
