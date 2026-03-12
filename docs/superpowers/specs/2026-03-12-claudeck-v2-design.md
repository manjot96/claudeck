# ClauDeck V2 — Post-MVP Features Design Spec

**Date:** 2026-03-12
**Status:** Approved
**Builds on:** `docs/superpowers/specs/2026-03-11-opcode-remote-design.md` (MVP spec)

## Overview

19 features organized into 4 implementation waves, building on the completed MVP. Each wave's features can be developed in parallel; waves are sequential due to dependencies.

## Wave 1: Foundation (3 features)

### 1.1 Settings Screen (`claudeck-h05`)

New centralized preferences screen, accessible from BottomNav (3 tabs: Projects / Session / Settings).

**Shared types** (add to `packages/shared/src/index.ts`):

```typescript
type Settings = {
  // Notifications
  soundEnabled: boolean        // default: true
  notificationsEnabled: boolean // default: false (requires permission)
  hapticEnabled: boolean       // default: true

  // Display
  theme: "dark" | "light" | "system"  // default: "system"
  fontSize: "small" | "medium" | "large" // default: "medium"
  autoScroll: boolean          // default: true
  typewriterEffect: boolean    // default: true

  // Sessions
  expandToolResults: boolean   // default: false
  showRawJson: boolean         // default: false
}
```

**New files:**
- `packages/web/src/hooks/useSettings.ts` — typed read/write to localStorage with defaults
- `packages/web/src/screens/SettingsScreen.tsx` — sections: Connection, Notifications, Display, Sessions, About

**Modified files:**
- `packages/web/src/components/BottomNav.tsx` — add Settings tab (gear icon)
- `packages/web/src/App.tsx` — add settings screen route, pass `useSettings()` to components that need it

**Sections:**
1. **Connection** — current host/IP, mDNS name, masked token with reveal, disconnect button
2. **Notifications** — sound toggle, browser notifications toggle, haptic toggle
3. **Display** — theme selector, font size, auto-scroll, typewriter effect
4. **Sessions** — expand tool results, show raw JSON
5. **About** — PWA version, daemon version (from `/api/ping`), GitHub link

### 1.2 Persistent Session Storage (`claudeck-0fj`)

SQLite-backed session and event persistence using `bun:sqlite` (zero dependencies).

**New files:**
- `packages/daemon/src/storage.ts`

**Schema:**
```sql
CREATE TABLE schema_version (version INTEGER PRIMARY KEY);

CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  prompt TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'running',
  exit_code INTEGER,
  started_at TEXT NOT NULL,
  ended_at TEXT,
  token_usage_input INTEGER,
  token_usage_output INTEGER,
  token_usage_cache_read INTEGER,
  token_usage_cache_write INTEGER,
  estimated_cost REAL
);

CREATE TABLE events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL REFERENCES sessions(id),
  sequence INTEGER NOT NULL,
  data TEXT NOT NULL,  -- JSON blob
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(session_id, sequence)
);

CREATE INDEX idx_sessions_project ON sessions(project_id);
CREATE INDEX idx_sessions_started ON sessions(started_at DESC);
CREATE INDEX idx_events_session ON events(session_id, sequence);
```

**Storage API:**
```typescript
function createStorage(dbPath: string) {
  // Auto-migrate on open
  return {
    saveSession(session: Session): void
    updateSession(id: string, updates: Partial<Session>): void
    getSession(id: string): Session | null
    listSessions(opts: { projectId?: string, status?: string, offset?: number, limit?: number }): Session[]
    saveEvents(sessionId: string, events: ClaudeStreamEvent[], startSequence: number): void
    getEvents(sessionId: string): ClaudeStreamEvent[]
    deleteOlderThan(days: number): number  // returns count deleted
  }
}
```

**Integration with sessions.ts:**
- On `create()`: insert session row
- During `streamOutput()`: batch-insert events every 100ms or 50 events
- On process exit: update session row with status/exitCode/endedAt
- `listAll()`: query SQLite with pagination
- `getSessionState()`: fall back to SQLite for archived sessions

**Modified files:**
- `packages/daemon/src/sessions.ts` — accept storage instance, persist on write
- `packages/daemon/src/index.ts` — create storage, pass to session manager
- `packages/daemon/src/router.ts` — add pagination params to GET /api/sessions

**Config:**
- DB path: `~/.claudeck/sessions.db`
- Retention: 30 days default, configurable via `DaemonConfig.retentionDays`
- Add `retentionDays?: number` to `DaemonConfig` in shared types

### 1.3 Pull-to-Refresh (`claudeck-s6z`)

Touch gesture-driven refresh for list screens.

**New files:**
- `packages/web/src/hooks/usePullToRefresh.ts`

**Hook API:**
```typescript
function usePullToRefresh(opts: {
  onRefresh: () => Promise<void>
  threshold?: number  // default: 60px
  debounceMs?: number // default: 2000
}): {
  containerProps: { onTouchStart, onTouchMove, onTouchEnd }
  refreshing: boolean
  pullDistance: number  // for animation
}
```

**Implementation:**
- Track touch start Y, compute delta on move
- When released past threshold, trigger `onRefresh()`
- CSS transform: `translateY(${pullDistance}px)` on container during pull
- Show spinner above content during refresh
- 2s minimum between refreshes

**Modified files:**
- `packages/web/src/screens/ProjectsScreen.tsx` — wrap in pull-to-refresh, re-fetch projects
- `packages/web/src/screens/ProjectScreen.tsx` — wrap in pull-to-refresh, re-fetch sessions

---

## Wave 2: Settings-dependent + Storage-dependent (6 features)

### 2.1 Sound/Haptic Notifications (`claudeck-bqa`)

**New files:**
- `packages/web/src/hooks/useNotificationSound.ts`

**Implementation:**
- Web Audio API: `AudioContext` + `OscillatorNode`
- Success chime: two ascending tones (C5 → E5, 100ms each)
- Failure chime: two descending tones (E5 → C5, 100ms each)
- `navigator.vibrate([100, 50, 100])` on Android for haptic
- Trigger on `session-ended` WS message
- Reads `soundEnabled` and `hapticEnabled` from `useSettings()`

**Modified files:**
- `packages/web/src/screens/SessionScreen.tsx` — call `useNotificationSound()` on session end

### 2.2 Browser Push Notifications (`claudeck-6y0`)

**New files:**
- `packages/web/src/hooks/useNotifications.ts`

**Implementation:**
- `Notification.requestPermission()` called on first session start (not app load)
- On `session-ended` when `document.hidden === true`:
  ```typescript
  new Notification(exitCode === 0 ? "Session Complete" : "Session Failed", {
    body: truncatedPrompt,
    icon: "/pwa-192x192.png",
    tag: sessionId, // prevent duplicates
  })
  ```
- On notification click: `window.focus()`, navigate to session
- Detect support: `"Notification" in window`
- iOS PWA: requires iOS 16.4+, check `navigator.standalone`
- Reads `notificationsEnabled` from `useSettings()`

**Modified files:**
- `packages/web/src/screens/SessionScreen.tsx` — integrate notification hook
- `packages/web/src/App.tsx` — permission request on first session creation

### 2.3 Session Search/Filtering (`claudeck-b7e`)

**New files:**
- `packages/web/src/components/SearchBar.tsx`
- `packages/web/src/components/FilterChips.tsx`

**Implementation:**
- Search bar: text input with magnifying glass icon, debounced 300ms
- Filter chips: All / Completed / Failed (toggle, single-select)
- Sort dropdown: Newest / Oldest / Longest
- Client-side filtering on `listAll()` response
- Full-text search on prompt field (case-insensitive includes)

**Modified files:**
- `packages/web/src/screens/ProjectScreen.tsx` — add SearchBar + FilterChips above recent sessions list

### 2.4 Session Cost/Token Tracking (`claudeck-66w`)

**New files:**
- `packages/web/src/components/SessionStats.tsx`

**Shared types** (add to Session):
```typescript
type TokenUsage = {
  input: number
  output: number
  cacheRead: number
  cacheWrite: number
}

// Add to Session type:
type Session = {
  // ...existing fields
  tokenUsage?: TokenUsage
  estimatedCost?: number
}
```

**Implementation:**
- Parse `result` event: extract `usage.input_tokens`, `usage.output_tokens`, cache fields
- `SessionStats` component: shows token counts + estimated cost
- Cost calculation: configurable rates per model, default to Claude Sonnet pricing
- Display in SessionScreen header (compact) and ended footer (detailed)
- Daemon persists token usage in SQLite sessions table
- Aggregate view in ProjectScreen: total tokens/cost for project's sessions

**Modified files:**
- `packages/daemon/src/sessions.ts` — parse result event, store token usage
- `packages/daemon/src/storage.ts` — token usage columns already in schema
- `packages/web/src/screens/SessionScreen.tsx` — show SessionStats
- `packages/web/src/screens/ProjectScreen.tsx` — show aggregate stats

### 2.5 Dark/Light Theme Toggle (`claudeck-llt`)

**New files:**
- `packages/web/src/hooks/useTheme.ts`

**Implementation:**
- Light theme CSS variables in `index.css`:
  ```css
  :root.light {
    --color-surface: #f8fafc;
    --color-surface-raised: #ffffff;
    --color-surface-overlay: #e2e8f0;
    /* ...etc */
  }
  ```
- `useTheme()` hook reads `theme` from `useSettings()`, applies class to `document.documentElement`
- System preference detection: `window.matchMedia("(prefers-color-scheme: dark)")`
- Syntax highlighter: `oneDark` when dark, `oneLight` when light

**Modified files:**
- `packages/web/src/index.css` — add light theme variables
- `packages/web/src/App.tsx` — call `useTheme()` at root
- `packages/web/src/components/StreamOutput.tsx` — dynamic syntax theme

### 2.6 Tool Use Summary Bar (`claudeck-pzl`)

**New files:**
- `packages/web/src/components/ToolSummaryBar.tsx`

**Implementation:**
- Derive tool counts from `events` array: count `tool_use` events grouped by `name`
- Compact pill display: `Read: 5 | Edit: 3 | Bash: 2`
- Color-coded per `TOOL_COLORS` map (already defined in StreamOutput)
- Fixed below SessionScreen header
- Total event count shown
- Animate new tool pills appearing
- Collapse to single total count on narrow screens, expand on tap

**Modified files:**
- `packages/web/src/screens/SessionScreen.tsx` — add ToolSummaryBar below header

---

## Wave 3: Independent UI Features (6 features)

### 3.1 Interactive Follow-up Input (`claudeck-jle`)

The biggest architectural change. Transforms fire-and-forget into full interactive mode.

**Shared types** (add to `packages/shared/src/index.ts`):
```typescript
// Add to WsClientMessage union:
| { type: "input"; sessionId: string; text: string }

// Add to WsServerMessage union:
| { type: "user-input"; sessionId: string; text: string }
```

**Daemon changes (`packages/daemon/src/sessions.ts`):**
- Remove `-p` flag from spawn command
- After spawn, write initial prompt to `process.stdin` followed by newline
- Keep `process.stdin` open (do NOT call `end()`)
- New method: `sendInput(sessionId: string, text: string): boolean`
  - Writes `text + "\n"` to process stdin
  - Returns false if session not found or ended

**WebSocket changes (`packages/daemon/src/websocket.ts`):**
- Handle new `input` message type in `message()` handler
- Call `sessions.sendInput(msg.sessionId, msg.text)`
- Broadcast `user-input` to all subscribers (so other connected clients see the input)

**PWA changes:**
- New `InputBar` component: text input + send button, fixed at bottom of SessionScreen (above BottomNav)
- Visible only when session is running
- On send: emit WS `{ type: "input", sessionId, text }`
- Render `user-input` events as right-aligned user bubbles in StreamOutput
- Keyboard handling: auto-focus, submit on Enter (Shift+Enter for newline)

**New files:**
- `packages/web/src/components/InputBar.tsx`

**Modified files:**
- `packages/daemon/src/sessions.ts` — interactive spawn, sendInput method
- `packages/daemon/src/websocket.ts` — handle input message, broadcast user-input
- `packages/web/src/hooks/useWebSocket.ts` — add `sendInput(sessionId, text)` method
- `packages/web/src/screens/SessionScreen.tsx` — add InputBar, render user-input events
- `packages/web/src/components/StreamOutput.tsx` — render user-input event type

### 3.2 Multiple Concurrent Sessions (`claudeck-ibz`)

**Shared types:**
```typescript
// Add to DaemonConfig:
type DaemonConfig = {
  // ...existing
  maxConcurrentSessions: number  // default: 3
}
```

**Daemon changes:**
- `sessions.ts`: replace `active.size > 0` check with `active.size >= config.maxConcurrentSessions`
- Config: add `maxConcurrentSessions` field, default 3

**PWA changes:**
- BottomNav Session tab: badge showing count of running sessions
- When multiple sessions active: Session tab shows a session list picker
- New `SessionListScreen.tsx` showing all active sessions with project name + prompt + elapsed time
- Tap a session → navigate to SessionScreen for that session

**New files:**
- `packages/web/src/screens/SessionListScreen.tsx`

**Modified files:**
- `packages/daemon/src/sessions.ts` — configurable concurrent limit
- `packages/daemon/src/config.ts` — add maxConcurrentSessions default
- `packages/web/src/components/BottomNav.tsx` — session count badge
- `packages/web/src/App.tsx` — session list routing

### 3.3 Prompt Templates/Favorites (`claudeck-5dp`)

**Implementation** (PWA-only, localStorage):

```typescript
type PromptTemplate = {
  id: string           // crypto.randomUUID()
  name: string
  prompt: string
  projectId?: string   // null = global
  createdAt: string
  lastUsedAt: string
}
```

**New files:**
- `packages/web/src/hooks/useTemplates.ts` — CRUD on localStorage templates
- `packages/web/src/components/TemplatesDrawer.tsx` — slide-up drawer showing templates

**Modified files:**
- `packages/web/src/screens/ProjectScreen.tsx` — templates button above textarea, star/save button, template selection fills textarea

**Features:**
- Save current prompt as template (star button next to textarea)
- Templates drawer: project-specific first, then global
- Edit name, edit prompt, delete
- `{{placeholder}}` support: detect placeholders, show input fields before starting session
- Long-press template → start immediately

### 3.4 Markdown Export (`claudeck-9r7`)

**New files:**
- `packages/web/src/utils/exportMarkdown.ts`

**Export format:**
```markdown
# Session: <truncated prompt>

- **Project:** <project name>
- **Started:** <ISO date>
- **Ended:** <ISO date>
- **Duration:** <formatted>
- **Exit code:** <code>
- **Tokens:** <input/output>

---

<assistant text as-is>

<details><summary>Tool: Read (file.ts)</summary>
<tool input/output>
</details>

---

**Result:** Success/Failed (duration)
```

**Implementation:**
- Transform `ClaudeStreamEvent[]` → markdown string
- Export button (share icon) in SessionScreen header
- `navigator.share({ files: [mdFile] })` on mobile
- `URL.createObjectURL()` + download link on desktop
- Option: "Clean export" strips tool blocks, shows only assistant text

**Modified files:**
- `packages/web/src/screens/SessionScreen.tsx` — export button in header

### 3.5 Session Diff View (`claudeck-ok5`)

**New files:**
- `packages/web/src/components/SessionChanges.tsx`
- `packages/web/src/utils/parseSessionChanges.ts`

**Change tracking:**
```typescript
type SessionChanges = {
  filesModified: Array<{ path: string, operation: "edit" | "write" | "create" }>
  filesRead: Array<{ path: string }>
  commandsRun: Array<{ command: string, exitCode?: number }>
  summary: { modified: number, read: number, commands: number }
}
```

**Implementation:**
- `parseSessionChanges(events)`: scan tool_use events for Edit/Write/Bash/Read/Grep/Glob
- Extract file paths from tool input parameters
- `SessionChanges` component: grouped file list with operation icons
- Summary card at session end: "Modified 5 files, ran 3 commands, read 12 files"
- Tab or expandable section in SessionScreen (below output, above ended footer)

**Modified files:**
- `packages/web/src/screens/SessionScreen.tsx` — add Changes section/tab

### 3.6 Streaming Typewriter Effect (`claudeck-jl9`)

**New files:**
- `packages/web/src/hooks/useTypewriter.ts`

**Implementation:**
```typescript
function useTypewriter(text: string, enabled: boolean): string {
  // Returns progressively revealed text
  // Uses requestAnimationFrame, ~30 chars per frame
  // Only animates when text changes (new content appended)
  // Returns full text immediately if !enabled
}
```

- Apply only to the latest `AssistantBlock` in StreamOutput
- CSS blinking cursor: `|` character with `animation: blink 1s step-end infinite`
- Reads `typewriterEffect` from `useSettings()`
- Previous assistant blocks render instantly (no animation)

**Modified files:**
- `packages/web/src/components/StreamOutput.tsx` — use typewriter hook on latest assistant block

---

## Wave 4: Complex/Dependent Features (4 features)

### 4.1 Custom Agent Profiles (`claudeck-f4k`)

**Shared types:**
```typescript
type AgentProfile = {
  id: string
  name: string
  promptTemplate: string
  allowedTools?: string[]
  cliFlags?: string[]        // e.g., ["--model", "opus"]
  projectScope: string[]     // project IDs, empty = all
  createdAt: string
  updatedAt: string
}
```

**Daemon:**
- Profiles stored in SQLite: `profiles` table
- REST endpoints: `GET/POST/PUT/DELETE /api/profiles`
- On session create with `profileId`: merge profile's CLI flags and prompt template

**Schema addition:**
```sql
CREATE TABLE profiles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  prompt_template TEXT NOT NULL,
  allowed_tools TEXT,          -- JSON array
  cli_flags TEXT,              -- JSON array
  project_scope TEXT,          -- JSON array of project IDs
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

**PWA:**
- Profile selector dropdown in ProjectScreen's new session form
- Profile editor accessible from Settings
- Profile CRUD screen

**New files:**
- `packages/daemon/src/profiles.ts` — CRUD operations
- `packages/web/src/screens/ProfilesScreen.tsx` — profile list + editor
- `packages/web/src/components/ProfileSelector.tsx` — dropdown for ProjectScreen

**Modified files:**
- `packages/daemon/src/router.ts` — add profile endpoints
- `packages/daemon/src/sessions.ts` — merge profile settings on create
- `packages/daemon/src/storage.ts` — profiles table + CRUD
- `packages/web/src/screens/ProjectScreen.tsx` — profile selector
- `packages/shared/src/index.ts` — AgentProfile type

### 4.2 Multi-Machine Support (`claudeck-s7i`)

**Types:**
```typescript
type SavedMachine = {
  id: string
  name: string
  host: string
  token: string
  mdnsName?: string
  lastSeen: string
  isDefault: boolean
}
```

**Implementation:**
- `useMachines()` hook: CRUD on localStorage machine list
- Replace `useConnection()` single-connection model with multi-machine
- MachinesScreen: list saved machines with online/offline status (ping each)
- Machine switcher dropdown at top of ProjectsScreen
- ConnectScreen becomes "Add Machine" flow
- `useApi` and `useWebSocket` dynamically switch based on active machine
- Color-coded machine labels throughout UI

**New files:**
- `packages/web/src/hooks/useMachines.ts`
- `packages/web/src/screens/MachinesScreen.tsx`
- `packages/web/src/components/MachineSwitcher.tsx`

**Modified files:**
- `packages/web/src/hooks/useConnection.ts` — refactor to support multiple connections
- `packages/web/src/hooks/useApi.ts` — accept dynamic host/token
- `packages/web/src/hooks/useWebSocket.ts` — accept dynamic host/token
- `packages/web/src/App.tsx` — machine switching logic
- `packages/web/src/screens/ConnectScreen.tsx` — "Add Machine" flow
- `packages/web/src/components/BottomNav.tsx` — machines tab or integration

### 4.3 Client-side mDNS Discovery (`claudeck-op3`)

**New files:**
- `packages/web/src/hooks/useDiscovery.ts`

**Implementation:**
- "Scan Network" button on ConnectScreen / Add Machine screen
- Scan strategy (browsers can't do real mDNS):
  1. Try stored `<hostname>.local:3847` (from previous connections)
  2. Try common `.local` names: `macbook-pro.local`, `imac.local`, etc.
  3. Try subnet scan: take user's likely subnet (from current URL), scan `.1` through `.50` on port 3847
  4. Each attempt: `fetch(/api/ping)` with 2s timeout
- Show discovered daemons in a list with hostname + IP
- Race all requests, show results as they come in
- Store successful discoveries for future use

**Modified files:**
- `packages/web/src/screens/ConnectScreen.tsx` — add Scan button + discovery results

### 4.4 HTTPS/TLS Option (`claudeck-wzt`)

**New files:**
- `packages/daemon/src/tls.ts`

**Implementation:**
- `--tls` CLI flag triggers cert generation
- Generate self-signed CA + server cert using `Bun.spawn(["openssl", ...])`
- Store in `~/.claudeck/tls/`: `ca.pem`, `server.pem`, `server-key.pem`
- Configure `Bun.serve({ tls: { cert, key } })`
- Print CA fingerprint to terminal
- Auto-detect: if certs exist, enable TLS by default
- `--no-tls` flag to disable

**Config addition:**
```typescript
type DaemonConfig = {
  // ...existing
  tls?: {
    enabled: boolean
    certPath: string
    keyPath: string
    caPath: string
  }
}
```

**PWA:**
- Trust Certificate guide screen: instructions for iOS cert installation
- Auto-detect HTTPS and adjust WebSocket protocol (wss://)

**Modified files:**
- `packages/daemon/src/index.ts` — TLS configuration for Bun.serve
- `packages/daemon/src/config.ts` — TLS config defaults
- `packages/web/src/hooks/hostUrl.ts` — detect https, use wss://
- `packages/shared/src/index.ts` — TLS config types

---

## E2E Testing Strategy

Every feature gets Playwright e2e tests via Playwright MCP.

**Test structure:**
- Tests run against a real daemon instance (spawned in test setup)
- Mock claude CLI with a simple script that echoes events (already used in existing tests)
- Each wave's tests verify both new and existing functionality (regression)

**Per-wave test plan:**

| Wave | Tests |
|------|-------|
| Wave 1 | Settings screen renders + persists values, SQLite sessions persist across daemon restart, pull-to-refresh triggers data reload |
| Wave 2 | Sound plays on session end (mock AudioContext), notification fires when hidden, search filters results, token stats display, theme switches CSS vars, tool bar shows counts |
| Wave 3 | Input bar sends text + appears in stream, multiple sessions run simultaneously, template save/load/use, export produces valid markdown, changes view shows modified files, typewriter animates latest block |
| Wave 4 | Profile CRUD + session with profile, machine switching, discovery scan shows results, TLS connection works |

**Regression tests per wave:** health check, project list, session create/stream/stop, WebSocket reconnect.

---

## File Impact Summary

**New files (27):**
- `packages/daemon/src/storage.ts`
- `packages/daemon/src/profiles.ts`
- `packages/daemon/src/tls.ts`
- `packages/web/src/hooks/useSettings.ts`
- `packages/web/src/hooks/usePullToRefresh.ts`
- `packages/web/src/hooks/useNotificationSound.ts`
- `packages/web/src/hooks/useNotifications.ts`
- `packages/web/src/hooks/useTheme.ts`
- `packages/web/src/hooks/useTemplates.ts`
- `packages/web/src/hooks/useTypewriter.ts`
- `packages/web/src/hooks/useMachines.ts`
- `packages/web/src/hooks/useDiscovery.ts`
- `packages/web/src/screens/SettingsScreen.tsx`
- `packages/web/src/screens/SessionListScreen.tsx`
- `packages/web/src/screens/ProfilesScreen.tsx`
- `packages/web/src/screens/MachinesScreen.tsx`
- `packages/web/src/components/InputBar.tsx`
- `packages/web/src/components/SearchBar.tsx`
- `packages/web/src/components/FilterChips.tsx`
- `packages/web/src/components/SessionStats.tsx`
- `packages/web/src/components/ToolSummaryBar.tsx`
- `packages/web/src/components/SessionChanges.tsx`
- `packages/web/src/components/TemplatesDrawer.tsx`
- `packages/web/src/components/ProfileSelector.tsx`
- `packages/web/src/components/MachineSwitcher.tsx`
- `packages/web/src/utils/exportMarkdown.ts`
- `packages/web/src/utils/parseSessionChanges.ts`

**Modified files (16):**
- `packages/shared/src/index.ts`
- `packages/daemon/src/sessions.ts`
- `packages/daemon/src/websocket.ts`
- `packages/daemon/src/router.ts`
- `packages/daemon/src/config.ts`
- `packages/daemon/src/index.ts`
- `packages/web/src/App.tsx`
- `packages/web/src/components/BottomNav.tsx`
- `packages/web/src/components/ConnectionBanner.tsx`
- `packages/web/src/components/StreamOutput.tsx`
- `packages/web/src/screens/ConnectScreen.tsx`
- `packages/web/src/screens/ProjectsScreen.tsx`
- `packages/web/src/screens/ProjectScreen.tsx`
- `packages/web/src/screens/SessionScreen.tsx`
- `packages/web/src/hooks/useConnection.ts`
- `packages/web/src/hooks/useWebSocket.ts`
- `packages/web/src/hooks/useApi.ts`
- `packages/web/src/hooks/hostUrl.ts`
- `packages/web/src/index.css`
