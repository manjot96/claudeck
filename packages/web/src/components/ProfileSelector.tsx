import type { AgentProfile } from "@claudeck/shared"

type Props = {
  profiles: AgentProfile[]
  selectedId: string | null
  onSelect: (profile: AgentProfile | null) => void
}

export default function ProfileSelector({
  profiles,
  selectedId,
  onSelect,
}: Props) {
  if (profiles.length === 0) return null

  return (
    <div className="flex items-center gap-2">
      <svg
        width="14"
        height="14"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-slate-500 shrink-0"
      >
        <circle cx="8" cy="5" r="3" />
        <path d="M2 14c0-3.3 2.7-6 6-6s6 2.7 6 6" />
      </svg>
      <select
        value={selectedId ?? ""}
        onChange={(e) => {
          const id = e.target.value
          if (!id) {
            onSelect(null)
          } else {
            const profile = profiles.find((p) => p.id === id) ?? null
            onSelect(profile)
          }
        }}
        className="bg-surface-overlay text-slate-200 text-xs rounded-lg px-2 py-1.5
                   border border-surface-overlay flex-1 min-h-[36px]"
      >
        <option value="">No profile</option>
        {profiles.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
    </div>
  )
}
