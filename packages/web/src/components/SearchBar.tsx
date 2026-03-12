import { useState, useEffect } from "react"

type Props = { value: string; onChange: (v: string) => void; placeholder?: string }

export default function SearchBar({ value, onChange, placeholder = "Search..." }: Props) {
  const [local, setLocal] = useState(value)

  useEffect(() => {
    const t = setTimeout(() => onChange(local), 300)
    return () => clearTimeout(t)
  }, [local, onChange])

  return (
    <div className="relative">
      <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" width="16" height="16" viewBox="0 0 16 16"
        fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <circle cx="7" cy="7" r="4.5" /><path d="M10.5 10.5L14 14" />
      </svg>
      <input type="text" value={local} onChange={(e) => setLocal(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-10 pr-4 py-2.5 min-h-[44px] bg-surface-raised rounded-xl text-slate-200
          border border-surface-overlay focus:border-accent focus:outline-none text-sm" />
    </div>
  )
}
