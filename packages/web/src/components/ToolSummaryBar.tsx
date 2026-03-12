import type { ClaudeStreamEvent } from "@claudeck/shared"
import { useMemo } from "react"

const TOOL_COLORS: Record<string, string> = {
  Read: "bg-blue-500/20 text-blue-400",
  Glob: "bg-blue-500/20 text-blue-400",
  Grep: "bg-blue-500/20 text-blue-400",
  Edit: "bg-amber-500/20 text-amber-400",
  Write: "bg-amber-500/20 text-amber-400",
  Bash: "bg-green-500/20 text-green-400",
}

type Props = { events: ClaudeStreamEvent[] }

export default function ToolSummaryBar({ events }: Props) {
  const counts = useMemo(() => {
    const map = new Map<string, number>()
    for (const e of events) {
      if (e.type === "tool_use") {
        const name = (e as Record<string, unknown>).name as string ?? "unknown"
        map.set(name, (map.get(name) ?? 0) + 1)
      }
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1])
  }, [events])

  const totalEvents = events.length

  if (counts.length === 0) return null

  return (
    <div className="flex items-center gap-1.5 px-4 py-1.5 overflow-x-auto">
      <span className="text-xs text-slate-500 mr-1">{totalEvents} events</span>
      {counts.map(([name, count]) => (
        <span key={name} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-mono ${
          TOOL_COLORS[name] ?? "bg-slate-500/20 text-slate-400"
        }`}>
          <span className="hidden sm:inline">{name}</span>
          <span className="sm:hidden">{name.slice(0, 2)}</span>
          <span className="font-semibold">{count}</span>
        </span>
      ))}
    </div>
  )
}
