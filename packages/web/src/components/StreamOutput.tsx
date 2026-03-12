import { useRef, useEffect, useState } from "react"
import ReactMarkdown from "react-markdown"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism"
import type { ClaudeStreamEvent } from "@claudeck/shared"

type Props = {
  events: ClaudeStreamEvent[]
}

export default function StreamOutput({ events }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [autoScroll, setAutoScroll] = useState(true)

  useEffect(() => {
    if (autoScroll) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" })
    }
  }, [events.length, autoScroll])

  function handleScroll() {
    const el = containerRef.current
    if (!el) return
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100
    setAutoScroll(atBottom)
  }

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto p-4 font-mono text-sm space-y-2"
    >
      {events.map((event, i) => (
        <EventBlock key={i} event={event} />
      ))}
      <div ref={bottomRef} />

      {!autoScroll && (
        <button
          onClick={() => {
            setAutoScroll(true)
            bottomRef.current?.scrollIntoView({ behavior: "smooth" })
          }}
          className="fixed bottom-24 right-6 bg-accent text-white px-4 py-2
                     rounded-full shadow-lg min-h-[44px]"
        >
          Scroll to bottom
        </button>
      )}
    </div>
  )
}

function EventBlock({ event }: { event: ClaudeStreamEvent }) {
  if (event.type === "assistant") {
    const message = event.message as Record<string, unknown> | undefined
    const content = message?.content as Array<{ type: string; text?: string }> | undefined
    const text = content
      ?.filter((c) => c.type === "text")
      .map((c) => c.text)
      .join("") ?? JSON.stringify(event)
    return (
      <div className="text-slate-100 prose prose-invert prose-sm max-w-none break-words">
        <ReactMarkdown
          components={{
            code({ className, children, ...props }) {
              const match = /language-(\w+)/.exec(className || "")
              const code = String(children).replace(/\n$/, "")
              return match ? (
                <SyntaxHighlighter style={oneDark} language={match[1]} PreTag="div">
                  {code}
                </SyntaxHighlighter>
              ) : (
                <code className={className} {...props}>{children}</code>
              )
            },
          }}
        >
          {text}
        </ReactMarkdown>
      </div>
    )
  }

  if (event.type === "tool_use" || event.type === "tool_result") {
    return <ToolBlock event={event} />
  }

  if (event.type === "result") {
    const result = event as Record<string, unknown>
    const status = (result.status as string) ?? "unknown"
    const durationMs = result.duration_ms as number | undefined
    return (
      <div className={`text-sm py-2 ${status === "success" ? "text-success" : "text-danger"}`}>
        Session {status}
        {durationMs && ` (${(durationMs / 1000).toFixed(1)}s)`}
      </div>
    )
  }

  // Fallback: render raw JSON for unknown event types
  return (
    <div className="text-slate-500 text-xs">
      <pre className="overflow-x-auto">{JSON.stringify(event, null, 2)}</pre>
    </div>
  )
}

function ToolBlock({ event }: { event: ClaudeStreamEvent }) {
  const [expanded, setExpanded] = useState(false)
  const label =
    event.type === "tool_use"
      ? `Tool: ${(event as Record<string, unknown>).name ?? "unknown"}`
      : "Tool Result"

  return (
    <div className="border border-surface-overlay rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left px-3 py-2 text-slate-400 text-xs
                   bg-surface-raised hover:bg-surface-overlay transition-colors
                   min-h-[44px] flex items-center"
      >
        <span className="mr-2">{expanded ? "▼" : "▶"}</span>
        {label}
      </button>
      {expanded && (
        <pre className="p-3 text-xs text-slate-300 overflow-x-auto bg-surface">
          {JSON.stringify(event, null, 2)}
        </pre>
      )}
    </div>
  )
}
