import { useCallback } from "react"
import type { Project, Session, CreateSessionRequest } from "@claudeck/shared"

export function useApi(host: string | null, token: string | null) {
  const fetchApi = useCallback(
    async <T>(path: string, opts: RequestInit = {}): Promise<T> => {
      if (!host || !token) throw new Error("Not connected")
      const res = await fetch(`http://${host}${path}`, {
        ...opts,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          ...opts.headers,
        },
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }))
        throw new Error(err.error ?? res.statusText)
      }
      return res.json()
    },
    [host, token]
  )

  const getProjects = useCallback(
    () => fetchApi<Project[]>("/api/projects"),
    [fetchApi]
  )

  const getSessions = useCallback(
    () => fetchApi<Session[]>("/api/sessions"),
    [fetchApi]
  )

  const createSession = useCallback(
    (body: CreateSessionRequest) =>
      fetchApi<Session>("/api/sessions", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    [fetchApi]
  )

  const killSession = useCallback(
    (id: string) =>
      fetchApi<{ ok: boolean }>(`/api/sessions/${id}`, { method: "DELETE" }),
    [fetchApi]
  )

  return { getProjects, getSessions, createSession, killSession }
}
