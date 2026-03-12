import type { SavedMachine } from "@claudeck/shared"

type Props = {
  machines: SavedMachine[]
  activeId: string | null
  onSwitch: (id: string) => void
  status?: Record<string, "online" | "offline" | "checking">
}

export default function MachineSwitcher({
  machines,
  activeId,
  onSwitch,
  status,
}: Props) {
  if (machines.length <= 1) return null

  return (
    <div className="flex items-center gap-2 mb-4">
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
        <rect x="1" y="3" width="14" height="10" rx="2" />
        <path d="M5 13v2M11 13v2M3 15h10" />
      </svg>
      <select
        value={activeId ?? ""}
        onChange={(e) => onSwitch(e.target.value)}
        className="bg-surface-overlay text-slate-200 text-xs rounded-lg px-2 py-1.5
                   border border-surface-overlay flex-1 min-h-[36px]"
      >
        {machines.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name}
            {status?.[m.id] === "online"
              ? " (online)"
              : status?.[m.id] === "offline"
                ? " (offline)"
                : ""}
          </option>
        ))}
      </select>
    </div>
  )
}
