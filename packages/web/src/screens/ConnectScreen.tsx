import { useState } from "react"

type Props = {
  onConnect: (host: string, token: string) => Promise<boolean>
}

export default function ConnectScreen({ onConnect }: Props) {
  const [host, setHost] = useState("")
  const [token, setToken] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)
    const ok = await onConnect(host, token)
    setLoading(false)
    if (!ok) setError("Could not connect. Check the address and token.")
  }

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-6">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-accent">ClauDeck</h1>
          <p className="text-slate-400 mt-2">Connect to your dev machine</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Host (IP:port)</label>
            <input
              type="text"
              value={host}
              onChange={(e) => setHost(e.target.value)}
              placeholder="192.168.1.50:3847"
              className="w-full px-4 py-3 bg-surface-raised rounded-lg text-slate-100
                         border border-surface-overlay focus:border-accent
                         focus:outline-none text-lg"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-1">Auth Token</label>
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Paste token from daemon terminal"
              className="w-full px-4 py-3 bg-surface-raised rounded-lg text-slate-100
                         border border-surface-overlay focus:border-accent
                         focus:outline-none text-lg font-mono"
              required
            />
          </div>
        </div>

        {error && (
          <p className="text-danger text-sm text-center">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 bg-accent hover:bg-accent-hover rounded-lg
                     text-white font-semibold text-lg disabled:opacity-50
                     transition-colors min-h-[56px]"
        >
          {loading ? "Connecting..." : "Connect"}
        </button>
      </form>
    </div>
  )
}
