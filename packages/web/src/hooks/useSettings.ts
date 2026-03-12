import { useState, useCallback } from "react"
import type { Settings } from "@claudeck/shared"

const STORAGE_KEY = "claudeck_settings"

const DEFAULTS: Settings = {
  soundEnabled: true,
  notificationsEnabled: false,
  hapticEnabled: true,
  theme: "system",
  fontSize: "medium",
  autoScroll: true,
  typewriterEffect: true,
  expandToolResults: false,
  showRawJson: false,
}

function load(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) }
  } catch {}
  return { ...DEFAULTS }
}

function save(settings: Settings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
}

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(load)

  const update = useCallback(<K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: value }
      save(next)
      return next
    })
  }, [])

  const reset = useCallback(() => {
    save(DEFAULTS)
    setSettings({ ...DEFAULTS })
  }, [])

  return { settings, update, reset }
}
