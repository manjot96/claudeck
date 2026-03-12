import { useEffect } from "react"
import type { SavedMachine } from "@claudeck/shared"

type Props = {
  machines: SavedMachine[]
  activeId: string | null
  status: Record<string, "online" | "offline" | "checking">
  onSelect: (id: string) => void
  onSetDefault: (id: string) => void
  onRemove: (id: string) => void
  onCheckStatus: () => void
  onBack: () => void
}

export default function MachinesScreen({
  machines,
  activeId,
  status,
  onSelect,
  onSetDefault,
  onRemove,
  onCheckStatus,
  onBack,
}: Props) {
  useEffect(() => {
    onCheckStatus()
  }, [onCheckStatus])

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

      <h1 className="text-2xl font-bold text-slate-100 mb-6">Machines</h1>

      {machines.length === 0 && (
        <p className="text-slate-500 text-sm text-center py-8">
          No machines saved. Connect to a daemon to add one.
        </p>
      )}

      <div className="space-y-3">
        {machines.map((m) => {
          const s = status[m.id]
          const isActive = m.id === activeId

          return (
            <div
              key={m.id}
              className={`bg-surface-raised rounded-xl p-4 border transition-colors ${
                isActive
                  ? "border-accent"
                  : "border-surface-overlay"
              }`}
            >
              <div className="flex items-start justify-between">
                <button
                  onClick={() => onSelect(m.id)}
                  className="text-left flex-1 min-h-[44px]"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-2 w-2 rounded-full ${
                        s === "online"
                          ? "bg-success"
                          : s === "checking"
                            ? "bg-amber-400 animate-pulse"
                            : "bg-slate-600"
                      }`}
                    />
                    <span className="text-sm font-semibold text-slate-200">
                      {m.name}
                    </span>
                    {m.isDefault && (
                      <span className="text-[10px] bg-accent/20 text-accent px-1.5 py-0.5 rounded-full">
                        default
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 font-mono mt-1">
                    {m.host}
                  </p>
                </button>

                <div className="flex items-center gap-1">
                  {!m.isDefault && (
                    <button
                      onClick={() => onSetDefault(m.id)}
                      className="text-xs text-slate-500 hover:text-accent transition-colors
                                 p-2 min-h-[44px] min-w-[44px] flex items-center justify-center"
                      title="Set as default"
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 16 16"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polygon points="8,1 10,6 15,6.5 11,10 12.5,15 8,12 3.5,15 5,10 1,6.5 6,6" />
                      </svg>
                    </button>
                  )}
                  <button
                    onClick={() => onRemove(m.id)}
                    className="text-slate-500 hover:text-danger transition-colors
                               p-2 min-h-[44px] min-w-[44px] flex items-center justify-center"
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
            </div>
          )
        })}
      </div>
    </div>
  )
}
