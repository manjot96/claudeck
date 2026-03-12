import { useState, useCallback } from "react"
import type { SavedMachine } from "@claudeck/shared"

const STORAGE_KEY = "claudeck_machines"

function load(): SavedMachine[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]")
  } catch {
    return []
  }
}

function save(machines: SavedMachine[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(machines))
}

export function useMachines() {
  const [machines, setMachines] = useState<SavedMachine[]>(load)
  const [activeId, setActiveId] = useState<string | null>(
    () => machines.find((m) => m.isDefault)?.id ?? machines[0]?.id ?? null
  )
  const [status, setStatus] = useState<
    Record<string, "online" | "offline" | "checking">
  >({})

  const add = useCallback(
    (m: Omit<SavedMachine, "id" | "lastSeen" | "isDefault">) => {
      const machine: SavedMachine = {
        ...m,
        id: crypto.randomUUID(),
        lastSeen: new Date().toISOString(),
        isDefault: machines.length === 0,
      }
      setMachines((prev) => {
        const next = [...prev, machine]
        save(next)
        return next
      })
      if (machines.length === 0) setActiveId(machine.id)
      return machine
    },
    [machines]
  )

  const remove = useCallback(
    (id: string) => {
      setMachines((prev) => {
        const next = prev.filter((m) => m.id !== id)
        save(next)
        return next
      })
      if (activeId === id) setActiveId(null)
    },
    [activeId]
  )

  const setDefault = useCallback((id: string) => {
    setMachines((prev) => {
      const next = prev.map((m) => ({ ...m, isDefault: m.id === id }))
      save(next)
      return next
    })
  }, [])

  const active = machines.find((m) => m.id === activeId) ?? null

  const checkStatus = useCallback(async () => {
    for (const m of machines) {
      setStatus((prev) => ({ ...prev, [m.id]: "checking" }))
      try {
        const res = await fetch(`http://${m.host}/api/ping`, {
          signal: AbortSignal.timeout(3000),
        })
        setStatus((prev) => ({
          ...prev,
          [m.id]: res.ok ? "online" : "offline",
        }))
      } catch {
        setStatus((prev) => ({ ...prev, [m.id]: "offline" }))
      }
    }
  }, [machines])

  return {
    machines,
    active,
    activeId,
    setActiveId,
    add,
    remove,
    setDefault,
    status,
    checkStatus,
  }
}
