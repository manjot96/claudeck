import { Database } from "bun:sqlite"
import type { Session, ClaudeStreamEvent, AgentProfile } from "@claudeck/shared"

const SCHEMA_VERSION = 2

const MIGRATIONS: Record<number, string[]> = {
  1: [
    `CREATE TABLE IF NOT EXISTS schema_version (version INTEGER PRIMARY KEY)`,
    `CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY, project_id TEXT NOT NULL, prompt TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'running', exit_code INTEGER,
      started_at TEXT NOT NULL, ended_at TEXT,
      token_usage_input INTEGER, token_usage_output INTEGER,
      token_usage_cache_read INTEGER, token_usage_cache_write INTEGER,
      estimated_cost REAL
    )`,
    `CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL REFERENCES sessions(id),
      sequence INTEGER NOT NULL, data TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(session_id, sequence)
    )`,
    `CREATE INDEX IF NOT EXISTS idx_sessions_project ON sessions(project_id)`,
    `CREATE INDEX IF NOT EXISTS idx_sessions_started ON sessions(started_at DESC)`,
    `CREATE INDEX IF NOT EXISTS idx_events_session ON events(session_id, sequence)`,
  ],
  2: [
    `CREATE TABLE IF NOT EXISTS profiles (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, prompt_template TEXT NOT NULL,
      allowed_tools TEXT, cli_flags TEXT, project_scope TEXT,
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    )`,
  ],
}

export function createStorage(dbPath: string) {
  const db = new Database(dbPath, { create: true })
  db.exec("PRAGMA journal_mode = WAL")
  db.exec("PRAGMA foreign_keys = ON")

  // Migrate
  db.exec("CREATE TABLE IF NOT EXISTS schema_version (version INTEGER PRIMARY KEY)")
  const row = db.query("SELECT MAX(version) as v FROM schema_version").get() as { v: number | null } | null
  const currentVersion = row?.v ?? 0

  for (let v = currentVersion + 1; v <= SCHEMA_VERSION; v++) {
    const stmts = MIGRATIONS[v]
    if (stmts) {
      for (const sql of stmts) db.exec(sql)
      db.exec(`INSERT OR REPLACE INTO schema_version (version) VALUES (${v})`)
    }
  }

  // Prepared statements
  const insertSession = db.prepare(
    `INSERT INTO sessions (id, project_id, prompt, status, started_at, exit_code, ended_at,
      token_usage_input, token_usage_output, token_usage_cache_read, token_usage_cache_write, estimated_cost)
     VALUES ($id, $projectId, $prompt, $status, $startedAt, $exitCode, $endedAt,
      $tokenInput, $tokenOutput, $tokenCacheRead, $tokenCacheWrite, $estimatedCost)`
  )

  const insertEvent = db.prepare(
    `INSERT INTO events (session_id, sequence, data) VALUES ($sessionId, $sequence, $data)`
  )

  function saveSession(session: Session): void {
    insertSession.run({
      $id: session.id, $projectId: session.projectId, $prompt: session.prompt,
      $status: session.status, $startedAt: session.startedAt,
      $exitCode: session.exitCode ?? null, $endedAt: session.endedAt ?? null,
      $tokenInput: session.tokenUsage?.input ?? null,
      $tokenOutput: session.tokenUsage?.output ?? null,
      $tokenCacheRead: session.tokenUsage?.cacheRead ?? null,
      $tokenCacheWrite: session.tokenUsage?.cacheWrite ?? null,
      $estimatedCost: session.estimatedCost ?? null,
    })
  }

  function updateSession(id: string, updates: Partial<Session>): void {
    const sets: string[] = []
    const params: Record<string, unknown> = { $id: id }

    if (updates.status !== undefined) { sets.push("status = $status"); params.$status = updates.status }
    if (updates.exitCode !== undefined) { sets.push("exit_code = $exitCode"); params.$exitCode = updates.exitCode }
    if (updates.endedAt !== undefined) { sets.push("ended_at = $endedAt"); params.$endedAt = updates.endedAt }
    if (updates.tokenUsage) {
      sets.push("token_usage_input = $ti", "token_usage_output = $to", "token_usage_cache_read = $tcr", "token_usage_cache_write = $tcw")
      params.$ti = updates.tokenUsage.input; params.$to = updates.tokenUsage.output
      params.$tcr = updates.tokenUsage.cacheRead; params.$tcw = updates.tokenUsage.cacheWrite
    }
    if (updates.estimatedCost !== undefined) { sets.push("estimated_cost = $cost"); params.$cost = updates.estimatedCost }

    if (sets.length === 0) return
    db.prepare(`UPDATE sessions SET ${sets.join(", ")} WHERE id = $id`).run(params)
  }

  function getSession(id: string): Session | null {
    const row = db.query("SELECT * FROM sessions WHERE id = $id").get({ $id: id }) as Record<string, unknown> | null
    return row ? rowToSession(row) : null
  }

  function listSessions(opts: { projectId?: string; status?: string; offset?: number; limit?: number } = {}): Session[] {
    const where: string[] = []
    const params: Record<string, unknown> = {}

    if (opts.projectId) { where.push("project_id = $pid"); params.$pid = opts.projectId }
    if (opts.status) { where.push("status = $status"); params.$status = opts.status }

    const whereClause = where.length > 0 ? `WHERE ${where.join(" AND ")}` : ""
    const limit = opts.limit ?? 100
    const offset = opts.offset ?? 0

    const rows = db.query(
      `SELECT * FROM sessions ${whereClause} ORDER BY started_at DESC LIMIT $limit OFFSET $offset`
    ).all({ ...params, $limit: limit, $offset: offset }) as Record<string, unknown>[]

    return rows.map(rowToSession)
  }

  function saveEvents(sessionId: string, events: ClaudeStreamEvent[], startSequence: number): void {
    const tx = db.transaction(() => {
      for (let i = 0; i < events.length; i++) {
        insertEvent.run({
          $sessionId: sessionId,
          $sequence: startSequence + i,
          $data: JSON.stringify(events[i]),
        })
      }
    })
    tx()
  }

  function getEvents(sessionId: string): ClaudeStreamEvent[] {
    const rows = db.query(
      "SELECT data FROM events WHERE session_id = $id ORDER BY sequence"
    ).all({ $id: sessionId }) as { data: string }[]
    return rows.map((r) => JSON.parse(r.data))
  }

  function deleteOlderThan(days: number): number {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
    // Delete events first (FK)
    db.prepare("DELETE FROM events WHERE session_id IN (SELECT id FROM sessions WHERE started_at < $cutoff)").run({ $cutoff: cutoff })
    const result = db.prepare("DELETE FROM sessions WHERE started_at < $cutoff").run({ $cutoff: cutoff })
    return result.changes
  }

  // ── Profile CRUD ──

  function saveProfile(p: AgentProfile): void {
    db.prepare(
      `INSERT INTO profiles (id, name, prompt_template, allowed_tools, cli_flags, project_scope, created_at, updated_at)
       VALUES ($id, $name, $promptTemplate, $allowedTools, $cliFlags, $projectScope, $createdAt, $updatedAt)`
    ).run({
      $id: p.id, $name: p.name, $promptTemplate: p.promptTemplate,
      $allowedTools: p.allowedTools ? JSON.stringify(p.allowedTools) : null,
      $cliFlags: p.cliFlags ? JSON.stringify(p.cliFlags) : null,
      $projectScope: JSON.stringify(p.projectScope),
      $createdAt: p.createdAt, $updatedAt: p.updatedAt,
    })
  }

  function getProfile(id: string): AgentProfile | null {
    const row = db.query("SELECT * FROM profiles WHERE id = $id").get({ $id: id }) as Record<string, unknown> | null
    return row ? rowToProfile(row) : null
  }

  function listProfiles(): AgentProfile[] {
    const rows = db.query("SELECT * FROM profiles ORDER BY name").all() as Record<string, unknown>[]
    return rows.map(rowToProfile)
  }

  function updateProfile(id: string, fields: Partial<AgentProfile>): void {
    const sets: string[] = []
    const params: Record<string, unknown> = { $id: id }
    if (fields.name !== undefined) { sets.push("name = $name"); params.$name = fields.name }
    if (fields.promptTemplate !== undefined) { sets.push("prompt_template = $pt"); params.$pt = fields.promptTemplate }
    if (fields.allowedTools !== undefined) { sets.push("allowed_tools = $at"); params.$at = JSON.stringify(fields.allowedTools) }
    if (fields.cliFlags !== undefined) { sets.push("cli_flags = $cf"); params.$cf = JSON.stringify(fields.cliFlags) }
    if (fields.projectScope !== undefined) { sets.push("project_scope = $ps"); params.$ps = JSON.stringify(fields.projectScope) }
    if (fields.updatedAt !== undefined) { sets.push("updated_at = $ua"); params.$ua = fields.updatedAt }
    if (sets.length === 0) return
    db.prepare(`UPDATE profiles SET ${sets.join(", ")} WHERE id = $id`).run(params)
  }

  function deleteProfile(id: string): void {
    db.prepare("DELETE FROM profiles WHERE id = $id").run({ $id: id })
  }

  function close(): void {
    db.close()
  }

  return {
    saveSession, updateSession, getSession, listSessions, saveEvents, getEvents, deleteOlderThan,
    saveProfile, getProfile, listProfiles, updateProfile, deleteProfile,
    close,
  }
}

function rowToProfile(row: Record<string, unknown>): AgentProfile {
  return {
    id: row.id as string,
    name: row.name as string,
    promptTemplate: row.prompt_template as string,
    allowedTools: row.allowed_tools ? JSON.parse(row.allowed_tools as string) : undefined,
    cliFlags: row.cli_flags ? JSON.parse(row.cli_flags as string) : undefined,
    projectScope: row.project_scope ? JSON.parse(row.project_scope as string) : [],
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}

function rowToSession(row: Record<string, unknown>): Session {
  const session: Session = {
    id: row.id as string,
    projectId: row.project_id as string,
    prompt: row.prompt as string,
    status: row.status as "running" | "ended",
    startedAt: row.started_at as string,
  }
  if (row.exit_code != null) session.exitCode = row.exit_code as number
  if (row.ended_at != null) session.endedAt = row.ended_at as string
  if (row.token_usage_input != null) {
    session.tokenUsage = {
      input: row.token_usage_input as number,
      output: row.token_usage_output as number,
      cacheRead: row.token_usage_cache_read as number,
      cacheWrite: row.token_usage_cache_write as number,
    }
  }
  if (row.estimated_cost != null) session.estimatedCost = row.estimated_cost as number
  return session
}
