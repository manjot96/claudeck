import { Database } from "bun:sqlite"
import type { Session, ClaudeStreamEvent } from "@claudeck/shared"

const SCHEMA_VERSION = 1

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

  function close(): void {
    db.close()
  }

  return { saveSession, updateSession, getSession, listSessions, saveEvents, getEvents, deleteOlderThan, close }
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
