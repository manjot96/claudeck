import type { PromptTemplate } from "../hooks/useTemplates"

type Props = {
  open: boolean
  onClose: () => void
  templates: PromptTemplate[]
  onSelect: (template: PromptTemplate) => void
  onDelete: (id: string) => void
}

export default function TemplatesDrawer({
  open,
  onClose,
  templates,
  onSelect,
  onDelete,
}: Props) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div
        className="absolute bottom-0 left-0 right-0 bg-surface-raised rounded-t-2xl
                    max-h-[70vh] overflow-y-auto p-4 animate-[slideUp_0.2s_ease-out]"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-100">Templates</h2>
          <button
            onClick={onClose}
            className="text-slate-500 text-sm min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            Close
          </button>
        </div>
        {templates.length === 0 ? (
          <p className="text-slate-500 text-sm text-center py-8">
            No templates saved yet
          </p>
        ) : (
          <div className="space-y-2">
            {templates.map((t) => (
              <div
                key={t.id}
                className="bg-surface rounded-xl p-3 flex items-start justify-between"
              >
                <button
                  onClick={() => onSelect(t)}
                  className="text-left flex-1 min-h-[44px]"
                >
                  <p className="text-sm font-medium text-slate-200">{t.name}</p>
                  <p className="text-xs text-slate-500 line-clamp-2 mt-1">
                    {t.prompt}
                  </p>
                  {t.projectId && (
                    <span className="text-[10px] text-accent mt-1 inline-block">
                      Project-specific
                    </span>
                  )}
                </button>
                <button
                  onClick={() => onDelete(t.id)}
                  className="text-slate-500 hover:text-danger text-xs ml-2 p-2
                             min-h-[44px] min-w-[44px] flex items-center justify-center
                             transition-colors"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  >
                    <path d="M4 4l8 8M12 4l-8 8" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
