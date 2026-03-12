type Screen = "projects" | "session"

type Props = {
  active: Screen
  onNavigate: (screen: Screen) => void
  hasActiveSession: boolean
}

export default function BottomNav({ active, onNavigate, hasActiveSession }: Props): React.ReactElement {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-surface-raised border-t border-surface-overlay
                 flex justify-around"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <button
        onClick={() => onNavigate("projects")}
        className={`flex-1 py-4 text-sm font-medium min-h-[56px]
          ${active === "projects" ? "text-accent" : "text-slate-400"}`}
      >
        Projects
      </button>
      {hasActiveSession && (
        <button
          onClick={() => onNavigate("session")}
          className={`flex-1 py-4 text-sm font-medium min-h-[56px]
            ${active === "session" ? "text-accent" : "text-slate-400"}`}
        >
          Session
        </button>
      )}
    </nav>
  )
}
