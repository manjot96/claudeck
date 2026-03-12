type Screen = "projects" | "session"

type Props = {
  active: Screen
  onNavigate: (screen: Screen) => void
  hasActiveSession: boolean
}

function FolderIcon({ className }: { className?: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  )
}

function TerminalIcon({ className }: { className?: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <polyline points="7 10 10 13 7 16" />
      <line x1="14" y1="16" x2="17" y2="16" />
    </svg>
  )
}

export default function BottomNav({ active, onNavigate, hasActiveSession }: Props): React.ReactElement {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-surface-raised/95 backdrop-blur-md border-t border-surface-overlay flex justify-around"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <button
        onClick={() => onNavigate("projects")}
        className={`flex-1 flex flex-col items-center justify-center gap-1 min-h-[56px] py-2 text-xs font-medium transition-colors duration-150
          ${active === "projects" ? "text-accent" : "text-slate-500"}`}
      >
        <div className={`w-1.5 h-1.5 rounded-full mb-[-2px] transition-opacity duration-150 ${active === "projects" ? "bg-accent opacity-100" : "opacity-0"}`} />
        <FolderIcon />
        <span>Projects</span>
      </button>

      {hasActiveSession && (
        <button
          onClick={() => onNavigate("session")}
          className={`flex-1 flex flex-col items-center justify-center gap-1 min-h-[56px] py-2 text-xs font-medium transition-colors duration-150 animate-[slideInRight_200ms_ease-out]
            ${active === "session" ? "text-accent" : "text-slate-500"}`}
        >
          <div className={`w-1.5 h-1.5 rounded-full mb-[-2px] transition-opacity duration-150 ${active === "session" ? "bg-accent opacity-100" : "opacity-0"}`} />
          <TerminalIcon />
          <span>Session</span>
        </button>
      )}

      <style>{`
        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </nav>
  )
}
