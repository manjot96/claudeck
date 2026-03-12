import type { Settings, DaemonInfo } from "@claudeck/shared"

type Props = {
  settings: Settings
  onUpdate: <K extends keyof Settings>(key: K, value: Settings[K]) => void
  onReset: () => void
  host: string | null
  token: string | null
  mdnsName: string | null
  daemonInfo: DaemonInfo | null
  onDisconnect: () => void
  onNavigateProfiles?: () => void
  onNavigateMachines?: () => void
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between min-h-[44px] py-2">
      <span className="text-slate-200 text-sm">{label}</span>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${
          checked ? "bg-accent" : "bg-surface-overlay"
        }`}
      >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
          checked ? "translate-x-6" : "translate-x-1"
        }`} />
      </button>
    </label>
  )
}

function SectionHeader({ title }: { title: string }) {
  return <h2 className="text-xs uppercase tracking-wider text-slate-500 font-semibold mt-6 mb-2">{title}</h2>
}

function Select<T extends string>({ label, value, options, onChange }: {
  label: string; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void
}) {
  return (
    <label className="flex items-center justify-between min-h-[44px] py-2">
      <span className="text-slate-200 text-sm">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="bg-surface-overlay text-slate-200 text-sm rounded-lg px-3 py-1.5 border border-surface-overlay"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </label>
  )
}

export default function SettingsScreen({
  settings, onUpdate, onReset, host, token, mdnsName, daemonInfo, onDisconnect, onNavigateProfiles, onNavigateMachines,
}: Props) {
  return (
    <div className="min-h-screen bg-surface p-6 pb-28">
      <h1 className="text-[28px] font-bold text-slate-100 mb-2">Settings</h1>

      <SectionHeader title="Connection" />
      <div className="bg-surface-raised rounded-xl p-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-slate-400">Host</span>
          <span className="text-slate-200 font-mono text-xs">{host ?? "—"}</span>
        </div>
        {mdnsName && (
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">mDNS</span>
            <span className="text-slate-200 font-mono text-xs">{mdnsName}</span>
          </div>
        )}
        <div className="flex justify-between text-sm">
          <span className="text-slate-400">Token</span>
          <span className="text-slate-200 font-mono text-xs">
            {token ? `${token.slice(0, 8)}${"•".repeat(8)}` : "—"}
          </span>
        </div>
        <button
          onClick={onDisconnect}
          className="w-full mt-3 py-2.5 min-h-[44px] bg-danger/10 text-danger rounded-lg text-sm font-medium"
        >
          Disconnect
        </button>
      </div>

      <SectionHeader title="Management" />
      <div className="bg-surface-raised rounded-xl divide-y divide-surface-overlay">
        {onNavigateProfiles && (
          <button onClick={onNavigateProfiles} className="w-full flex items-center justify-between px-4 min-h-[48px] text-sm text-slate-200 hover:bg-surface-overlay/30 transition-colors">
            <span>Agent Profiles</span>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-500"><path d="M6 4l4 4-4 4"/></svg>
          </button>
        )}
        {onNavigateMachines && (
          <button onClick={onNavigateMachines} className="w-full flex items-center justify-between px-4 min-h-[48px] text-sm text-slate-200 hover:bg-surface-overlay/30 transition-colors">
            <span>Machines</span>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-500"><path d="M6 4l4 4-4 4"/></svg>
          </button>
        )}
      </div>

      <SectionHeader title="Notifications" />
      <div className="bg-surface-raised rounded-xl px-4 divide-y divide-surface-overlay">
        <Toggle label="Sound" checked={settings.soundEnabled} onChange={(v) => onUpdate("soundEnabled", v)} />
        <Toggle label="Browser notifications" checked={settings.notificationsEnabled} onChange={(v) => onUpdate("notificationsEnabled", v)} />
        <Toggle label="Haptic feedback" checked={settings.hapticEnabled} onChange={(v) => onUpdate("hapticEnabled", v)} />
      </div>

      <SectionHeader title="Display" />
      <div className="bg-surface-raised rounded-xl px-4 divide-y divide-surface-overlay">
        <Select label="Theme" value={settings.theme} onChange={(v) => onUpdate("theme", v)}
          options={[{ value: "system", label: "System" }, { value: "dark", label: "Dark" }, { value: "light", label: "Light" }]} />
        <Select label="Font size" value={settings.fontSize} onChange={(v) => onUpdate("fontSize", v)}
          options={[{ value: "small", label: "Small" }, { value: "medium", label: "Medium" }, { value: "large", label: "Large" }]} />
        <Toggle label="Auto-scroll" checked={settings.autoScroll} onChange={(v) => onUpdate("autoScroll", v)} />
        <Toggle label="Typewriter effect" checked={settings.typewriterEffect} onChange={(v) => onUpdate("typewriterEffect", v)} />
      </div>

      <SectionHeader title="Sessions" />
      <div className="bg-surface-raised rounded-xl px-4 divide-y divide-surface-overlay">
        <Toggle label="Auto-expand tool results" checked={settings.expandToolResults} onChange={(v) => onUpdate("expandToolResults", v)} />
        <Toggle label="Show raw JSON" checked={settings.showRawJson} onChange={(v) => onUpdate("showRawJson", v)} />
      </div>

      <SectionHeader title="About" />
      <div className="bg-surface-raised rounded-xl p-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-slate-400">PWA version</span>
          <span className="text-slate-200">2.0.0</span>
        </div>
        {daemonInfo && (
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Daemon version</span>
            <span className="text-slate-200">{daemonInfo.version}</span>
          </div>
        )}
      </div>

      <button
        onClick={onReset}
        className="w-full mt-6 py-2.5 min-h-[44px] bg-surface-raised text-slate-400 rounded-xl text-sm"
      >
        Reset to defaults
      </button>
    </div>
  )
}
