import { useState, useRef, useEffect } from "react"

type Props = {
  onSend: (text: string) => void
  disabled: boolean
  placeholder?: string
}

export default function InputBar({ onSend, disabled, placeholder = "Send follow-up..." }: Props) {
  const [text, setText] = useState("")
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!disabled) inputRef.current?.focus()
  }, [disabled])

  function handleSubmit() {
    if (!text.trim() || disabled) return
    onSend(text.trim())
    setText("")
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="fixed bottom-[60px] left-0 right-0 z-30 bg-surface-raised/95 backdrop-blur-sm border-t border-surface-overlay px-4 py-2"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
      <div className="flex items-end gap-2">
        <textarea ref={inputRef} value={text} onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown} placeholder={disabled ? "Processing..." : placeholder}
          disabled={disabled} rows={1}
          className="flex-1 px-3 py-2.5 min-h-[44px] max-h-[120px] bg-surface rounded-xl text-slate-200
            border border-surface-overlay focus:border-accent focus:outline-none text-sm resize-none
            disabled:opacity-50 placeholder:text-slate-500" />
        <button onClick={handleSubmit} disabled={disabled || !text.trim()}
          className="p-2.5 min-h-[44px] min-w-[44px] bg-accent rounded-xl text-white
            disabled:opacity-50 transition-colors flex items-center justify-center">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M3 9h12M11 5l4 4-4 4" />
          </svg>
        </button>
      </div>
    </div>
  )
}
