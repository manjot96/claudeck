import { useState, useEffect } from "react"
import { useDiscovery } from "../hooks/useDiscovery"

type Props = {
  onConnect: (host: string, token: string) => Promise<boolean>
}

export default function ConnectScreen({ onConnect }: Props) {
  const [host, setHost] = useState("")
  const discovery = useDiscovery()
  const [token, setToken] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [showToken, setShowToken] = useState(false)
  const [shake, setShake] = useState(false)

  useEffect(() => {
    if (error) {
      setShake(true)
      const t = setTimeout(() => setShake(false), 500)
      return () => clearTimeout(t)
    }
  }, [error])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)
    const ok = await onConnect(host, token)
    setLoading(false)
    if (!ok) setError("Could not connect. Check the address and token.")
  }

  return (
    <>
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 50%, 90% { transform: translateX(-4px); }
          30%, 70% { transform: translateX(4px); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
        .animate-spin-slow {
          animation: spin 0.8s linear infinite;
        }
      `}</style>

      <div className="min-h-screen bg-surface flex items-center justify-center p-6 relative overflow-hidden">
        {/* Radial gradient background glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "radial-gradient(ellipse at center, rgba(59, 130, 246, 0.08) 0%, transparent 70%)",
          }}
        />

        <form
          onSubmit={handleSubmit}
          className={`w-full max-w-sm space-y-6 relative z-10 rounded-2xl p-6
            border border-white/[0.08] shadow-[0_0_40px_rgba(59,130,246,0.06)]
            bg-surface-raised/90 backdrop-blur-sm
            ${shake ? "animate-shake" : ""}`}
        >
          {/* Logo and title */}
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-3">
              <svg
                width="36"
                height="36"
                viewBox="0 0 36 36"
                fill="none"
                className="shrink-0"
              >
                <rect
                  x="1"
                  y="1"
                  width="34"
                  height="34"
                  rx="8"
                  stroke="#3b82f6"
                  strokeWidth="1.5"
                  fill="rgba(59, 130, 246, 0.08)"
                />
                <text
                  x="18"
                  y="23"
                  textAnchor="middle"
                  fill="#3b82f6"
                  fontFamily="monospace"
                  fontWeight="bold"
                  fontSize="16"
                >
                  {">_"}
                </text>
              </svg>
              <h1 className="text-3xl font-bold text-accent">ClauDeck</h1>
            </div>
            <p className="text-slate-400 text-sm">Connect to your dev machine</p>
          </div>

          {/* Form fields */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1.5">
                Host (IP:port or URL)
              </label>
              <input
                type="text"
                value={host}
                onChange={(e) => setHost(e.target.value)}
                placeholder="192.168.1.50:3847 or https://..."
                className="w-full px-4 py-3 min-h-[44px] bg-surface rounded-lg text-slate-100
                  border border-surface-overlay/60
                  focus:border-accent focus:ring-1 focus:ring-accent/30 focus:outline-none
                  text-base transition-all duration-150 placeholder:text-slate-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-1.5">
                Auth Token
              </label>
              <div className="relative">
                <input
                  type={showToken ? "text" : "password"}
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="Paste token from daemon terminal"
                  className="w-full px-4 py-3 pr-12 min-h-[44px] bg-surface rounded-lg text-slate-100
                    border border-surface-overlay/60
                    focus:border-accent focus:ring-1 focus:ring-accent/30 focus:outline-none
                    text-base font-mono transition-all duration-150 placeholder:text-slate-500
                    placeholder:font-sans"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="absolute right-1 top-1/2 -translate-y-1/2 w-[44px] h-[44px]
                    flex items-center justify-center text-slate-400 hover:text-slate-200
                    transition-colors duration-150 rounded-md"
                  aria-label={showToken ? "Hide token" : "Show token"}
                >
                  {showToken ? (
                    // Eye-off icon
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                      <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    // Eye icon
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <p className="text-danger text-sm text-center">{error}</p>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 min-h-[56px] bg-accent hover:bg-accent-hover active:bg-accent-hover
              rounded-lg text-white font-semibold text-lg disabled:opacity-50
              transition-all duration-150 flex items-center justify-center gap-2.5"
          >
            {loading && (
              <span
                className="inline-block w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin-slow"
              />
            )}
            {loading ? "Connecting..." : "Connect"}
          </button>

          {/* Scan Network */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={discovery.scan}
              disabled={discovery.scanning}
              className="w-full py-2.5 min-h-[44px] border border-surface-overlay rounded-lg
                text-slate-400 text-sm hover:border-accent hover:text-accent
                disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {discovery.scanning ? (
                <>
                  <span className="inline-block w-4 h-4 border-2 border-slate-500/30 border-t-slate-400 rounded-full animate-spin-slow" />
                  Scanning...
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="8" cy="8" r="6" />
                    <path d="M8 2a6 6 0 014 2M8 14a6 6 0 01-4-2" />
                    <circle cx="8" cy="8" r="2" />
                  </svg>
                  Scan Network
                </>
              )}
            </button>

            {discovery.found.length > 0 && (
              <div className="space-y-1.5">
                {discovery.found.map((d, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setHost(d.host)}
                    className="w-full text-left px-3 py-2 bg-surface rounded-lg border border-surface-overlay
                      hover:border-accent transition-colors text-sm"
                  >
                    <span className="text-slate-200">{d.hostname}</span>
                    <span className="text-slate-500 text-xs ml-2">{d.host}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Version */}
          <p className="text-center text-xs text-slate-500">v1.0.0</p>
        </form>
      </div>
    </>
  )
}
