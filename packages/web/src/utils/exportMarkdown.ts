import type { ClaudeStreamEvent, Session } from "@claudeck/shared"

export function exportToMarkdown(
  session: Session,
  events: ClaudeStreamEvent[],
  clean = false
): string {
  const lines: string[] = []
  const truncPrompt =
    session.prompt.length > 80
      ? session.prompt.slice(0, 80) + "..."
      : session.prompt
  lines.push(`# Session: ${truncPrompt}`, "")
  lines.push(`- **Project:** ${session.projectId}`)
  lines.push(`- **Started:** ${session.startedAt}`)
  if (session.endedAt) {
    lines.push(`- **Ended:** ${session.endedAt}`)
    const durationMs =
      new Date(session.endedAt).getTime() -
      new Date(session.startedAt).getTime()
    const mins = Math.floor(durationMs / 60000)
    const secs = Math.floor((durationMs % 60000) / 1000)
    lines.push(`- **Duration:** ${mins}m ${secs}s`)
  }
  if (session.exitCode != null)
    lines.push(`- **Exit code:** ${session.exitCode}`)
  if (session.tokenUsage) {
    lines.push(
      `- **Tokens:** ${session.tokenUsage.input} input / ${session.tokenUsage.output} output`
    )
  }
  if (session.estimatedCost != null)
    lines.push(`- **Est. cost:** $${session.estimatedCost.toFixed(4)}`)
  lines.push("", "---", "")

  for (const event of events) {
    if (event.type === "assistant") {
      const message = event.message as Record<string, unknown> | undefined
      const content = message?.content as
        | Array<{ type: string; text?: string }>
        | undefined
      const text =
        content
          ?.filter((c) => c.type === "text")
          .map((c) => c.text)
          .join("") ?? ""
      if (text) lines.push(text, "")
    } else if (event.type === "tool_use" && !clean) {
      const name =
        ((event as Record<string, unknown>).name as string) ?? "Tool"
      lines.push(
        `<details><summary>Tool: ${name}</summary>`,
        "",
        "```json",
        JSON.stringify(event, null, 2),
        "```",
        "",
        "</details>",
        ""
      )
    } else if (event.type === "result") {
      const status =
        ((event as Record<string, unknown>).status as string) ?? "unknown"
      lines.push("---", "", `**Result:** ${status}`, "")
    }
  }

  return lines.join("\n")
}

export function downloadMarkdown(filename: string, content: string): void {
  const blob = new Blob([content], { type: "text/markdown" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export async function shareMarkdown(
  filename: string,
  content: string
): Promise<boolean> {
  if (!navigator.share) return false
  try {
    const file = new File([content], filename, { type: "text/markdown" })
    await navigator.share({ files: [file] })
    return true
  } catch {
    return false
  }
}
