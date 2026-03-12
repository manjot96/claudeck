import type { TokenUsage } from "@claudeck/shared"

type Props = { tokenUsage?: TokenUsage; estimatedCost?: number; compact?: boolean }

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

export default function SessionStats({ tokenUsage, estimatedCost, compact = false }: Props) {
  if (!tokenUsage) return null

  if (compact) {
    return (
      <span className="text-xs text-slate-500">
        {formatTokens(tokenUsage.input + tokenUsage.output)} tokens
        {estimatedCost != null && ` · $${estimatedCost.toFixed(4)}`}
      </span>
    )
  }

  return (
    <div className="bg-surface-raised rounded-xl p-3 grid grid-cols-2 gap-2 text-xs">
      <div><span className="text-slate-500">Input:</span> <span className="text-slate-200">{formatTokens(tokenUsage.input)}</span></div>
      <div><span className="text-slate-500">Output:</span> <span className="text-slate-200">{formatTokens(tokenUsage.output)}</span></div>
      {tokenUsage.cacheRead > 0 && <div><span className="text-slate-500">Cache read:</span> <span className="text-slate-200">{formatTokens(tokenUsage.cacheRead)}</span></div>}
      {tokenUsage.cacheWrite > 0 && <div><span className="text-slate-500">Cache write:</span> <span className="text-slate-200">{formatTokens(tokenUsage.cacheWrite)}</span></div>}
      {estimatedCost != null && <div className="col-span-2"><span className="text-slate-500">Est. cost:</span> <span className="text-accent">${estimatedCost.toFixed(4)}</span></div>}
    </div>
  )
}
