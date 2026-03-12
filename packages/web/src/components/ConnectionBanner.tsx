import { useEffect, useState } from "react"

type Props = {
  status: "connecting" | "connected" | "disconnected"
  onRetry?: () => void
}

function WifiPulseIcon({ className }: { className?: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M5 12.55a11 11 0 0 1 14.08 0" />
      <path d="M1.42 9a16 16 0 0 1 21.16 0" />
      <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
      <circle cx="12" cy="20" r="1" fill="currentColor" />
    </svg>
  )
}

function WifiOffIcon({ className }: { className?: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M5 12.55a11 11 0 0 1 14.08 0" opacity="0.4" />
      <path d="M1.42 9a16 16 0 0 1 21.16 0" opacity="0.4" />
      <path d="M8.53 16.11a6 6 0 0 1 6.95 0" opacity="0.4" />
      <circle cx="12" cy="20" r="1" fill="currentColor" />
      <line x1="2" y1="2" x2="22" y2="22" strokeWidth="2.5" />
    </svg>
  )
}

function AnimatedDots() {
  const [dotCount, setDotCount] = useState(1)

  useEffect(() => {
    const interval = setInterval(() => {
      setDotCount((c) => (c % 3) + 1)
    }, 500)
    return () => clearInterval(interval)
  }, [])

  return (
    <span className="inline-block w-[1.2em] text-left">
      {".".repeat(dotCount)}
    </span>
  )
}

export default function ConnectionBanner({ status, onRetry }: Props): React.ReactElement | null {
  if (status === "connected") return null

  const isConnecting = status === "connecting"

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-50 px-4 py-2 text-center backdrop-blur-sm
        animate-[slideDown_200ms_ease-out]
        ${isConnecting ? "bg-amber-500/90 text-white" : "bg-danger/90 text-white"}`}
      style={{ paddingTop: `calc(env(safe-area-inset-top) + 0.5rem)` }}
      onClick={!isConnecting && onRetry ? onRetry : undefined}
      role={!isConnecting && onRetry ? "button" : undefined}
    >
      <div className="flex items-center justify-center gap-2">
        {isConnecting ? (
          <WifiPulseIcon className="animate-pulse" />
        ) : (
          <WifiOffIcon />
        )}
        <span className="text-sm font-medium">
          {isConnecting ? (
            <>Reconnecting<AnimatedDots /></>
          ) : (
            "Connection lost"
          )}
        </span>
      </div>
      {!isConnecting && (
        <p className="text-xs text-white/70 mt-0.5">Tap to retry</p>
      )}

      <style>{`
        @keyframes slideDown {
          from {
            transform: translateY(-100%);
          }
          to {
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  )
}
