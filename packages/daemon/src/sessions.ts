import type { Subprocess } from "bun"
import type { Session, ClaudeStreamEvent } from "@claudeck/shared"
import type { createStorage } from "./storage"

type ManagedSession = {
  session: Session
  process: Subprocess
  eventBuffer: ClaudeStreamEvent[]
}

type SessionState = {
  events: ClaudeStreamEvent[]
  ended: boolean
  exitCode: number | null
}

const ENDED_SESSION_TTL_MS = 5 * 60 * 1000 // keep ended sessions for 5 minutes

type CreateOpts = {
  projectPath: string
  prompt: string
  command?: string[] // override for testing; defaults to claude CLI
}

type OutputHandler = (sessionId: string, data: ClaudeStreamEvent) => void
type EndHandler = (sessionId: string, exitCode: number) => void

type ManagerOpts = {
  storage?: ReturnType<typeof createStorage>
  maxConcurrent?: number
}

export function createSessionManager(opts: ManagerOpts = {}) {
  const active = new Map<string, ManagedSession>()
  const ended = new Map<string, SessionState>()
  const history: Session[] = [] // all sessions, most recent first
  const eventArchive = new Map<string, ClaudeStreamEvent[]>() // permanent event storage
  const outputHandlers: OutputHandler[] = []
  const endHandlers: EndHandler[] = []

  function create(createOpts: CreateOpts): Session {
    if (active.size > 0) {
      throw new Error("SESSION_ACTIVE")
    }

    const id = crypto.randomUUID()
    const command = createOpts.command ?? [
      "claude",
      "--output-format",
      "stream-json",
      "-p",
      createOpts.prompt,
    ]

    // Build a clean env: inherit everything but strip CLAUDECODE so
    // the spawned claude process doesn't think it's nested.
    const cleanEnv = { ...process.env }
    delete cleanEnv.CLAUDECODE

    const proc = Bun.spawn(command, {
      stdout: "pipe",
      stderr: "pipe",
      cwd: createOpts.projectPath,
      env: cleanEnv,
    })

    const session: Session = {
      id,
      projectId: `-${createOpts.projectPath.replace(/^\//, "").replace(/\//g, "-")}`,
      prompt: createOpts.prompt,
      status: "running",
      startedAt: new Date().toISOString(),
    }

    active.set(id, { session, process: proc, eventBuffer: [] })
    history.unshift(session) // add to front (most recent first)

    if (opts.storage) {
      opts.storage.saveSession(session)
    }

    // Stream stdout in background
    streamOutput(id, proc)

    return session
  }

  async function streamOutput(sessionId: string, proc: Subprocess): Promise<void> {
    const reader = proc.stdout!.getReader()
    const decoder = new TextDecoder()
    let buffer = ""

    let eventBatch: ClaudeStreamEvent[] = []
    let batchSequence = 0
    const flushInterval = opts.storage ? setInterval(() => {
      if (eventBatch.length > 0 && opts.storage) {
        opts.storage.saveEvents(sessionId, eventBatch, batchSequence)
        batchSequence += eventBatch.length
        eventBatch = []
      }
    }, 100) : null

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() ?? ""

        for (const line of lines) {
          if (!line.trim()) continue
          try {
            const event = JSON.parse(line) as ClaudeStreamEvent
            // Buffer the event for late subscribers
            const managed = active.get(sessionId)
            if (managed) {
              managed.eventBuffer.push(event)
            }
            // Extract token usage from result events
            if (event.type === "result") {
              const usage = (event as Record<string, unknown>).usage as Record<string, number> | undefined
              if (usage && managed) {
                managed.session.tokenUsage = {
                  input: usage.input_tokens ?? 0,
                  output: usage.output_tokens ?? 0,
                  cacheRead: usage.cache_read_input_tokens ?? 0,
                  cacheWrite: usage.cache_creation_input_tokens ?? 0,
                }
                managed.session.estimatedCost =
                  (managed.session.tokenUsage.input * 3 + managed.session.tokenUsage.output * 15) / 1_000_000
              }
            }
            for (const handler of outputHandlers) {
              handler(sessionId, event)
            }
            if (opts.storage) {
              eventBatch.push(event)
              if (eventBatch.length >= 50) {
                opts.storage.saveEvents(sessionId, eventBatch, batchSequence)
                batchSequence += eventBatch.length
                eventBatch = []
              }
            }
          } catch {
            // skip non-JSON lines
          }
        }
      }
    } catch {
      // stream closed
    }

    if (flushInterval) clearInterval(flushInterval)
    if (opts.storage && eventBatch.length > 0) {
      opts.storage.saveEvents(sessionId, eventBatch, batchSequence)
    }

    const exitCode = await proc.exited
    const managed = active.get(sessionId)
    const bufferedEvents = managed?.eventBuffer ?? []
    if (managed) {
      managed.session.status = "ended"
      managed.session.exitCode = exitCode
      managed.session.endedAt = new Date().toISOString()
      active.delete(sessionId)
    }

    if (opts.storage) {
      opts.storage.updateSession(sessionId, {
        status: "ended",
        exitCode,
        endedAt: managed?.session.endedAt,
        tokenUsage: managed?.session.tokenUsage,
        estimatedCost: managed?.session.estimatedCost,
      })
    }

    // Preserve ended session state for late subscribers
    ended.set(sessionId, {
      events: bufferedEvents,
      ended: true,
      exitCode,
    })

    // Archive events permanently for session history replay
    eventArchive.set(sessionId, bufferedEvents)

    // Clean up after TTL
    setTimeout(() => {
      ended.delete(sessionId)
    }, ENDED_SESSION_TTL_MS)

    for (const handler of endHandlers) {
      handler(sessionId, exitCode)
    }
  }

  function list(): Session[] {
    return Array.from(active.values()).map((m) => m.session)
  }

  function listAll(listOpts: { offset?: number; limit?: number } = {}): Session[] {
    if (opts.storage) {
      return opts.storage.listSessions({ offset: listOpts.offset, limit: listOpts.limit })
    }
    return history.map((s) => ({ ...s }))
  }

  function kill(sessionId: string): boolean {
    const managed = active.get(sessionId)
    if (!managed) return false
    managed.process.kill()
    return true
  }

  function killAll(): void {
    for (const [id] of active) {
      kill(id)
    }
  }

  function forceKillAll(): void {
    for (const [, managed] of active) {
      managed.process.kill(9) // SIGKILL
    }
  }

  function getSessionState(sessionId: string): SessionState | null {
    // Check active sessions first
    const managed = active.get(sessionId)
    if (managed) {
      return {
        events: [...managed.eventBuffer],
        ended: false,
        exitCode: null,
      }
    }

    // Check recently ended sessions (has TTL)
    const endedState = ended.get(sessionId)
    if (endedState) {
      return { ...endedState, events: [...endedState.events] }
    }

    // Check permanent archive
    const archived = eventArchive.get(sessionId)
    if (archived) {
      // Find the session in history to get the exit code
      const hist = history.find((s) => s.id === sessionId)
      return {
        events: [...archived],
        ended: true,
        exitCode: hist?.exitCode ?? null,
      }
    }

    // Fall back to storage for archived sessions
    if (opts.storage) {
      const storedSession = opts.storage.getSession(sessionId)
      if (storedSession) {
        const events = opts.storage.getEvents(sessionId)
        return {
          events,
          ended: storedSession.status === "ended",
          exitCode: storedSession.exitCode ?? null,
        }
      }
    }

    return null
  }

  function onOutput(handler: OutputHandler): void {
    outputHandlers.push(handler)
  }

  function onEnd(handler: EndHandler): void {
    endHandlers.push(handler)
  }

  return { create, list, listAll, kill, killAll, forceKillAll, getSessionState, onOutput, onEnd }
}
