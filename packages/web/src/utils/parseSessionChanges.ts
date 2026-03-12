import type { ClaudeStreamEvent } from "@claudeck/shared"

export type SessionChanges = {
  filesModified: Array<{ path: string; operation: "edit" | "write" | "create" }>
  filesRead: Array<{ path: string }>
  commandsRun: Array<{ command: string; exitCode?: number }>
  summary: { modified: number; read: number; commands: number }
}

export function parseSessionChanges(
  events: ClaudeStreamEvent[]
): SessionChanges {
  const modified = new Map<string, "edit" | "write" | "create">()
  const read = new Set<string>()
  const commands: Array<{ command: string; exitCode?: number }> = []

  for (const event of events) {
    if (event.type !== "tool_use") continue
    const e = event as Record<string, unknown>
    const name = e.name as string
    const input = e.input as Record<string, unknown> | undefined

    if (name === "Edit" && input?.file_path) {
      modified.set(input.file_path as string, "edit")
    } else if (name === "Write" && input?.file_path) {
      modified.set(input.file_path as string, "write")
    } else if (name === "Read" && input?.file_path) {
      read.add(input.file_path as string)
    } else if (name === "Bash" && input?.command) {
      commands.push({ command: input.command as string })
    }
  }

  const filesRead = Array.from(read).filter((p) => !modified.has(p))
  return {
    filesModified: Array.from(modified.entries()).map(([path, op]) => ({
      path,
      operation: op,
    })),
    filesRead: filesRead.map((path) => ({ path })),
    commandsRun: commands,
    summary: {
      modified: modified.size,
      read: filesRead.length,
      commands: commands.length,
    },
  }
}
