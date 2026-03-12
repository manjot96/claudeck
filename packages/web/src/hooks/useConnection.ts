import { useState, useCallback, useEffect } from "react"
import { httpBase } from "./hostUrl"

type ConnectionState = {
  host: string | null
  token: string | null
  mdnsName: string | null
  connected: boolean
}

const STORAGE_KEY = "claudeck_connection"

function loadStored(): Omit<ConnectionState, "connected"> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return { host: null, token: null, mdnsName: null }
}

function saveStored(state: Omit<ConnectionState, "connected">) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export function useConnection() {
  const [state, setState] = useState<ConnectionState>(() => ({
    ...loadStored(),
    connected: false,
  }))

  const connect = useCallback(async (host: string, token: string) => {
    try {
      const res = await fetch(`${httpBase(host)}/api/ping`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(3000),
      })
      if (!res.ok) throw new Error("Auth failed")
      const info = await res.json()
      const conn = { host, token, mdnsName: info.mdnsName }
      saveStored(conn)
      setState({ ...conn, connected: true })
      return true
    } catch {
      setState((s) => ({ ...s, connected: false }))
      return false
    }
  }, [])

  const disconnect = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setState({ host: null, token: null, mdnsName: null, connected: false })
  }, [])

  // Auto-reconnect on mount
  useEffect(() => {
    const { host, token, mdnsName } = loadStored()
    if (host && token) {
      connect(host, token).then((ok) => {
        if (!ok && mdnsName) {
          // Fall back to mDNS hostname
          const mdnsHost = `${mdnsName}:${host.split(":")[1] || "3847"}`
          connect(mdnsHost, token)
        }
      })
    }
  }, [connect])

  return { ...state, connect, disconnect }
}
