type FilterOption = { value: string; label: string }
type Props = { options: FilterOption[]; active: string; onChange: (v: string) => void }

export default function FilterChips({ options, active, onChange }: Props) {
  return (
    <div className="flex gap-2 overflow-x-auto py-1">
      {options.map((o) => (
        <button key={o.value} onClick={() => onChange(o.value)}
          className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap min-h-[32px] transition-colors ${
            active === o.value
              ? "bg-accent text-white"
              : "bg-surface-overlay text-slate-400"
          }`}>{o.label}</button>
      ))}
    </div>
  )
}
