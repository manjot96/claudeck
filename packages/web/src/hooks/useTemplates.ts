import { useState, useCallback } from "react"

export type PromptTemplate = {
  id: string
  name: string
  prompt: string
  projectId?: string // undefined = global
  createdAt: string
  lastUsedAt: string
}

const STORAGE_KEY = "claudeck_templates"

function load(): PromptTemplate[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]")
  } catch {
    return []
  }
}

function save(templates: PromptTemplate[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(templates))
}

export function useTemplates(projectId?: string) {
  const [templates, setTemplates] = useState<PromptTemplate[]>(load)

  const add = useCallback((name: string, prompt: string, scope?: string) => {
    const t: PromptTemplate = {
      id: crypto.randomUUID(),
      name,
      prompt,
      projectId: scope,
      createdAt: new Date().toISOString(),
      lastUsedAt: new Date().toISOString(),
    }
    setTemplates((prev) => {
      const next = [...prev, t]
      save(next)
      return next
    })
  }, [])

  const remove = useCallback((id: string) => {
    setTemplates((prev) => {
      const next = prev.filter((t) => t.id !== id)
      save(next)
      return next
    })
  }, [])

  const use = useCallback(
    (id: string) => {
      setTemplates((prev) => {
        const next = prev.map((t) =>
          t.id === id ? { ...t, lastUsedAt: new Date().toISOString() } : t
        )
        save(next)
        return next
      })
      return templates.find((t) => t.id === id)
    },
    [templates]
  )

  // Project-specific first, then global, sorted by lastUsedAt
  const sorted = templates
    .filter((t) => !t.projectId || t.projectId === projectId)
    .sort((a, b) => {
      if (a.projectId && !b.projectId) return -1
      if (!a.projectId && b.projectId) return 1
      return b.lastUsedAt.localeCompare(a.lastUsedAt)
    })

  return { templates: sorted, add, remove, use }
}
