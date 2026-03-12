import { useState, useMemo } from "react"
import type { ClaudeStreamEvent } from "@claudeck/shared"
import { parseSessionChanges } from "../utils/parseSessionChanges"

type Props = {
  events: ClaudeStreamEvent[]
}

function basename(path: string): string {
  return path.split("/").pop() ?? path
}

const OP_COLORS: Record<string, string> = {
  edit: "text-amber-400",
  write: "text-green-400",
  create: "text-blue-400",
}

export default function SessionChanges({ events }: Props) {
  const [expanded, setExpanded] = useState(false)
  const changes = useMemo(() => parseSessionChanges(events), [events])

  if (
    changes.summary.modified === 0 &&
    changes.summary.read === 0 &&
    changes.summary.commands === 0
  ) {
    return null
  }

  return (
    <div className="bg-surface-raised rounded-xl border border-surface-overlay/50 overflow-hidden mt-4">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left px-4 py-3 flex items-center justify-between
                   hover:bg-surface-overlay/30 transition-colors min-h-[44px]"
      >
        <div className="flex items-center gap-2">
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-slate-400"
          >
            <path d="M13 2H3a1 1 0 00-1 1v10a1 1 0 001 1h10a1 1 0 001-1V3a1 1 0 00-1-1z" />
            <path d="M5 6h6M5 8h4M5 10h5" />
          </svg>
          <span className="text-sm text-slate-200">Changes</span>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-500">
          {changes.summary.modified > 0 && (
            <span>{changes.summary.modified} modified</span>
          )}
          {changes.summary.read > 0 && (
            <span>{changes.summary.read} read</span>
          )}
          {changes.summary.commands > 0 && (
            <span>{changes.summary.commands} commands</span>
          )}
          <svg
            width="14"
            height="14"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`transition-transform duration-150 ${expanded ? "rotate-90" : ""}`}
          >
            <path d="M6 4l4 4-4 4" />
          </svg>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3">
          {changes.filesModified.length > 0 && (
            <div>
              <h4 className="text-xs text-slate-500 uppercase tracking-wider mb-1.5">
                Modified Files
              </h4>
              <div className="space-y-1">
                {changes.filesModified.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <span
                      className={`text-xs font-mono ${OP_COLORS[f.operation] ?? "text-slate-400"}`}
                    >
                      {f.operation}
                    </span>
                    <span className="text-slate-300 truncate font-mono text-xs">
                      {basename(f.path)}
                    </span>
                    <span className="text-slate-600 truncate text-[10px] hidden sm:inline">
                      {f.path}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {changes.filesRead.length > 0 && (
            <div>
              <h4 className="text-xs text-slate-500 uppercase tracking-wider mb-1.5">
                Read Files
              </h4>
              <div className="flex flex-wrap gap-1">
                {changes.filesRead.map((f, i) => (
                  <span
                    key={i}
                    className="text-[11px] text-slate-400 bg-surface-overlay/50 px-1.5 py-0.5 rounded font-mono"
                  >
                    {basename(f.path)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {changes.commandsRun.length > 0 && (
            <div>
              <h4 className="text-xs text-slate-500 uppercase tracking-wider mb-1.5">
                Commands
              </h4>
              <div className="space-y-1">
                {changes.commandsRun.map((c, i) => (
                  <div
                    key={i}
                    className="text-[11px] text-slate-400 font-mono bg-surface-overlay/50 px-2 py-1 rounded truncate"
                  >
                    $ {c.command}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
