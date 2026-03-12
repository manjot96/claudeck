import { useRef, useEffect, useState, useCallback } from "react"
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
      className="flex-1 overflow-y-auto px-4 pt-4 pb-24 font-mono text-sm"
    >
      {events.length === 0 && <EmptyState />}
      {events.map((event, i) => (
        <EventBlock key={i} event={event} />
      ))}
      <div ref={bottomRef} />

      <div
        className={`fixed bottom-24 right-6 transition-opacity duration-200 ${
          autoScroll ? "opacity-0 pointer-events-none" : "opacity-100"
        }`}
      >
        <button
          onClick={() => {
            setAutoScroll(true)
            bottomRef.current?.scrollIntoView({ behavior: "smooth" })
          }}
          className="flex items-center gap-2 bg-accent text-white px-4 py-2.5
                     rounded-full shadow-xl shadow-accent/20 min-h-[44px]"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 3v10M4 9l4 4 4-4" />
          </svg>
          Bottom
        </button>
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex items-center justify-center h-full text-slate-500 text-sm">
      <span>Waiting for output</span>
      <span className="inline-flex ml-1">
        <span className="animate-[pulse_1.4s_ease-in-out_infinite]">.</span>
        <span className="animate-[pulse_1.4s_ease-in-out_0.2s_infinite]">.</span>
        <span className="animate-[pulse_1.4s_ease-in-out_0.4s_infinite]">.</span>
      </span>
    </div>
  )
}

function EventBlock({ event }: { event: ClaudeStreamEvent }) {
  if (event.type === "assistant") {
    return <AssistantBlock event={event} />
  }

  if (event.type === "tool_use") {
    return <ToolUseBlock event={event} />
  }

  if (event.type === "tool_result") {
    return <ToolResultBlock event={event} />
  }

  if (event.type === "result") {
    return <ResultBlock event={event} />
  }

  // Fallback: render raw JSON for unknown event types
  return (
    <div className="text-slate-500 text-xs mb-2">
      <pre className="overflow-x-auto">{JSON.stringify(event, null, 2)}</pre>
    </div>
  )
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }, [text])

  return (
    <button
      onClick={handleCopy}
      className="absolute top-2 right-2 p-1.5 rounded-md bg-surface-overlay/60
                 hover:bg-surface-overlay transition-colors text-slate-400 hover:text-slate-200"
      aria-label="Copy code"
    >
      {copied ? (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-success">
          <path d="M3 8.5l3 3 7-7" />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="5" y="5" width="8" height="8" rx="1.5" />
          <path d="M11 5V3.5A1.5 1.5 0 009.5 2h-6A1.5 1.5 0 002 3.5v6A1.5 1.5 0 003.5 11H5" />
        </svg>
      )}
    </button>
  )
}

function AssistantBlock({ event }: { event: ClaudeStreamEvent }) {
  const message = event.message as Record<string, unknown> | undefined
  const content = message?.content as Array<{ type: string; text?: string }> | undefined
  const text = content
    ?.filter((c) => c.type === "text")
    .map((c) => c.text)
    .join("") ?? JSON.stringify(event)

  return (
    <div className="bg-surface-raised/30 rounded-xl p-4 mb-3">
      <div className="text-slate-100 prose prose-invert prose-sm max-w-none break-words">
        <ReactMarkdown
          components={{
            code({ className, children, ...props }) {
              const match = /language-(\w+)/.exec(className || "")
              const code = String(children).replace(/\n$/, "")
              if (match) {
                return (
                  <div className="relative group">
                    <CopyButton text={code} />
                    <SyntaxHighlighter style={oneDark} language={match[1]} PreTag="div">
                      {code}
                    </SyntaxHighlighter>
                  </div>
                )
              }
              return (
                <code
                  className="bg-surface-overlay/50 px-1.5 py-0.5 rounded text-accent text-sm font-mono"
                  {...props}
                >
                  {children}
                </code>
              )
            },
          }}
        >
          {text}
        </ReactMarkdown>
      </div>
    </div>
  )
}

const TOOL_COLORS: Record<string, string> = {
  Read: "text-blue-400",
  Glob: "text-blue-400",
  Grep: "text-blue-400",
  Edit: "text-amber-400",
  Write: "text-amber-400",
  Bash: "text-green-400",
}

function getToolColor(name: string): string {
  return TOOL_COLORS[name] ?? "text-slate-400"
}

function WrenchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      <path d="M10.5 2a4 4 0 00-3.46 5.97L2.5 12.5l1 1 4.53-4.54A4 4 0 1010.5 2z" />
    </svg>
  )
}

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 transition-transform duration-150 ${expanded ? "rotate-90" : ""}`}
    >
      <path d="M6 4l4 4-4 4" />
    </svg>
  )
}

function ToolUseBlock({ event }: { event: ClaudeStreamEvent }) {
  const [expanded, setExpanded] = useState(false)
  const toolName = (event as Record<string, unknown>).name as string ?? "unknown"
  const colorClass = getToolColor(toolName)

  return (
    <div className="bg-surface-raised rounded-xl border border-surface-overlay/50 overflow-hidden mb-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left px-3 py-2 flex items-center gap-2
                   hover:bg-surface-overlay/30 transition-colors min-h-[44px]"
      >
        <ChevronIcon expanded={expanded} />
        <WrenchIcon />
        <span className={`text-xs font-mono ${colorClass}`}>{toolName}</span>
      </button>
      {expanded && (
        <pre className="p-3 bg-surface text-xs text-slate-300 font-mono overflow-y-auto max-h-[300px]">
          {JSON.stringify(event, null, 2)}
        </pre>
      )}
    </div>
  )
}

function ToolResultBlock({ event }: { event: ClaudeStreamEvent }) {
  const [expanded, setExpanded] = useState(false)
  const isError = (event as Record<string, unknown>).is_error === true

  return (
    <div
      className={`ml-4 bg-surface-raised rounded-xl border border-surface-overlay/50 overflow-hidden mb-2
                  border-l-2 ${isError ? "border-l-danger" : "border-l-success"}`}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left px-3 py-2 flex items-center gap-2
                   hover:bg-surface-overlay/30 transition-colors min-h-[44px]"
      >
        <ChevronIcon expanded={expanded} />
        <span className="text-xs font-mono text-slate-400">Result</span>
      </button>
      {expanded && (
        <pre className="p-3 bg-surface text-xs text-slate-300 font-mono overflow-y-auto max-h-[300px]">
          {JSON.stringify(event, null, 2)}
        </pre>
      )}
    </div>
  )
}

function ResultBlock({ event }: { event: ClaudeStreamEvent }) {
  const result = event as Record<string, unknown>
  const status = (result.status as string) ?? "unknown"
  const durationMs = result.duration_ms as number | undefined
  const isSuccess = status === "success"

  return (
    <div
      className={`bg-surface-raised rounded-xl p-4 mt-4 border-l-2 ${
        isSuccess ? "border-l-success" : "border-l-danger"
      }`}
    >
      <div className="flex items-center gap-2">
        {isSuccess ? (
          <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-success shrink-0">
            <path d="M3 8.5l3 3 7-7" />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-danger shrink-0">
            <path d="M4 4l8 8M12 4l-8 8" />
          </svg>
        )}
        <span className={`text-sm font-medium ${isSuccess ? "text-success" : "text-danger"}`}>
          {isSuccess ? "Session completed successfully" : "Session failed"}
        </span>
      </div>
      {durationMs != null && (
        <div className="text-slate-400 text-xs mt-1.5 ml-[26px]">
          Duration: {(durationMs / 1000).toFixed(1)}s
        </div>
      )}
    </div>
  )
}
