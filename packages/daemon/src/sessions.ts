import type { Subprocess } from "bun"
import type { Session, ClaudeStreamEvent } from "@claudeck/shared"

type ManagedSession = {
  session: Session
  process: Subprocess
}

type CreateOpts = {
  projectPath: string
  prompt: string
  command?: string[] // override for testing; defaults to claude CLI
}

type OutputHandler = (sessionId: string, data: ClaudeStreamEvent) => void
type EndHandler = (sessionId: string, exitCode: number) => void

export function createSessionManager() {
  const active = new Map<string, ManagedSession>()
  const outputHandlers: OutputHandler[] = []
  const endHandlers: EndHandler[] = []

  function create(opts: CreateOpts): Session {
    if (active.size > 0) {
      throw new Error("SESSION_ACTIVE")
    }

    const id = crypto.randomUUID()
    const command = opts.command ?? [
      "claude",
      "--output-format",
      "stream-json",
      "-p",
      opts.prompt,
      "--project-dir",
      opts.projectPath,
    ]

    const proc = Bun.spawn(command, {
      stdout: "pipe",
      stderr: "pipe",
      cwd: opts.projectPath,
    })

    const session: Session = {
      id,
      projectId: `-${opts.projectPath.replace(/^\//, "").replace(/\//g, "-")}`,
      prompt: opts.prompt,
      status: "running",
      startedAt: new Date().toISOString(),
    }

    active.set(id, { session, process: proc })

    // Stream stdout in background
    streamOutput(id, proc)

    return session
  }

  async function streamOutput(sessionId: string, proc: Subprocess): Promise<void> {
    const reader = proc.stdout!.getReader()
    const decoder = new TextDecoder()
    let buffer = ""

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
            for (const handler of outputHandlers) {
              handler(sessionId, event)
            }
          } catch {
            // skip non-JSON lines
          }
        }
      }
    } catch {
      // stream closed
    }

    const exitCode = await proc.exited
    const managed = active.get(sessionId)
    if (managed) {
      managed.session.status = "ended"
      managed.session.exitCode = exitCode
      active.delete(sessionId)
    }
    for (const handler of endHandlers) {
      handler(sessionId, exitCode)
    }
  }

  function list(): Session[] {
    return Array.from(active.values()).map((m) => m.session)
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

  function onOutput(handler: OutputHandler): void {
    outputHandlers.push(handler)
  }

  function onEnd(handler: EndHandler): void {
    endHandlers.push(handler)
  }

  return { create, list, kill, killAll, forceKillAll, onOutput, onEnd }
}
