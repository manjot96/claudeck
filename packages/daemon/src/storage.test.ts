import { describe, test, expect, beforeEach, afterEach } from "bun:test"
import { createStorage } from "./storage"
import { unlinkSync, existsSync } from "node:fs"

const TEST_DB = "/tmp/claudeck-test.db"

describe("createStorage", () => {
  let storage: ReturnType<typeof createStorage>

  beforeEach(() => {
    for (const f of [TEST_DB, `${TEST_DB}-wal`, `${TEST_DB}-shm`]) {
      if (existsSync(f)) unlinkSync(f)
    }
    storage = createStorage(TEST_DB)
  })

  afterEach(() => {
    storage.close()
    for (const f of [TEST_DB, `${TEST_DB}-wal`, `${TEST_DB}-shm`]) {
      if (existsSync(f)) unlinkSync(f)
    }
  })

  test("saves and retrieves a session", () => {
    storage.saveSession({
      id: "s1", projectId: "p1", prompt: "test", status: "running",
      startedAt: new Date().toISOString(),
    })
    const s = storage.getSession("s1")
    expect(s).not.toBeNull()
    expect(s!.prompt).toBe("test")
  })

  test("updates a session", () => {
    storage.saveSession({
      id: "s1", projectId: "p1", prompt: "test", status: "running",
      startedAt: new Date().toISOString(),
    })
    storage.updateSession("s1", { status: "ended", exitCode: 0 })
    const s = storage.getSession("s1")
    expect(s!.status).toBe("ended")
    expect(s!.exitCode).toBe(0)
  })

  test("lists sessions with pagination", () => {
    for (let i = 0; i < 5; i++) {
      storage.saveSession({
        id: `s${i}`, projectId: "p1", prompt: `test ${i}`, status: "ended",
        startedAt: new Date(Date.now() - i * 1000).toISOString(), exitCode: 0,
      })
    }
    const page1 = storage.listSessions({ limit: 2, offset: 0 })
    expect(page1).toHaveLength(2)
    const page2 = storage.listSessions({ limit: 2, offset: 2 })
    expect(page2).toHaveLength(2)
  })

  test("saves and retrieves events", () => {
    storage.saveSession({
      id: "s1", projectId: "p1", prompt: "test", status: "running",
      startedAt: new Date().toISOString(),
    })
    storage.saveEvents("s1", [
      { type: "assistant", message: { content: [{ type: "text", text: "hello" }] } },
      { type: "result", status: "success" },
    ], 0)
    const events = storage.getEvents("s1")
    expect(events).toHaveLength(2)
    expect(events[0].type).toBe("assistant")
  })

  test("deletes old sessions", () => {
    storage.saveSession({
      id: "old", projectId: "p1", prompt: "old", status: "ended",
      startedAt: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString(), exitCode: 0,
    })
    storage.saveSession({
      id: "new", projectId: "p1", prompt: "new", status: "ended",
      startedAt: new Date().toISOString(), exitCode: 0,
    })
    const deleted = storage.deleteOlderThan(30)
    expect(deleted).toBe(1)
    expect(storage.getSession("old")).toBeNull()
    expect(storage.getSession("new")).not.toBeNull()
  })

  test("filters by projectId", () => {
    storage.saveSession({ id: "s1", projectId: "p1", prompt: "a", status: "ended", startedAt: new Date().toISOString(), exitCode: 0 })
    storage.saveSession({ id: "s2", projectId: "p2", prompt: "b", status: "ended", startedAt: new Date().toISOString(), exitCode: 0 })
    const results = storage.listSessions({ projectId: "p1" })
    expect(results).toHaveLength(1)
    expect(results[0].projectId).toBe("p1")
  })
})
