import { describe, test, expect, beforeEach, afterEach } from "bun:test"
import { createSessionManager } from "./sessions"
import { createStorage } from "./storage"
import { mkdtempSync, rmSync } from "node:fs"
import { join } from "node:path"
import { tmpdir } from "node:os"

describe("createSessionManager", () => {
  let mgr: ReturnType<typeof createSessionManager>

  beforeEach(() => {
    mgr = createSessionManager()
  })

  test("creates a session with echo command (simulating claude)", () => {
    // Use echo as a stand-in for claude CLI
    const session = mgr.create({
      projectPath: "/tmp",
      prompt: "test",
      command: ["echo", '{"type":"result","status":"success"}'],
    })

    expect(session.id).toBeDefined()
    expect(session.status).toBe("running")
    expect(session.prompt).toBe("test")
  })

  test("lists active sessions", () => {
    mgr.create({
      projectPath: "/tmp",
      prompt: "test",
      command: ["echo", "hi"],
    })
    expect(mgr.list()).toHaveLength(1)
  })

  test("rejects second session while one is active", () => {
    mgr.create({
      projectPath: "/tmp",
      prompt: "test1",
      command: ["sleep", "10"],
    })

    expect(() =>
      mgr.create({
        projectPath: "/tmp",
        prompt: "test2",
        command: ["echo", "hi"],
      })
    ).toThrow("SESSION_ACTIVE")
  })

  test("kills a session", () => {
    const session = mgr.create({
      projectPath: "/tmp",
      prompt: "test",
      command: ["sleep", "60"],
    })

    const killed = mgr.kill(session.id)
    expect(killed).toBe(true)
  })

  test("returns false for unknown session id", () => {
    expect(mgr.kill("nonexistent")).toBe(false)
  })

  test("buffers output events and replays on getSessionState", async () => {
    const events: Array<{ sessionId: string; data: unknown }> = []
    mgr.onOutput((sessionId, data) => events.push({ sessionId, data }))

    const session = mgr.create({
      projectPath: "/tmp",
      prompt: "test",
      command: ["echo", '{"type":"result","status":"success"}'],
    })

    // Wait for process to finish
    await new Promise((r) => setTimeout(r, 200))

    // Events should have been broadcast
    expect(events.length).toBeGreaterThan(0)

    // getSessionState should return buffered events even after session ended
    const state = mgr.getSessionState(session.id)
    expect(state).not.toBeNull()
    expect(state!.events.length).toBeGreaterThan(0)
    expect(state!.ended).toBe(true)
    expect(state!.exitCode).toBe(0)
  })

  test("getSessionState returns null for unknown session", () => {
    const state = mgr.getSessionState("nonexistent")
    expect(state).toBeNull()
  })

  test("end handler fires with exit code", async () => {
    const ended: Array<{ sessionId: string; exitCode: number }> = []
    mgr.onEnd((sessionId, exitCode) => ended.push({ sessionId, exitCode }))

    mgr.create({
      projectPath: "/tmp",
      prompt: "test",
      command: ["echo", '{"type":"result","status":"success"}'],
    })

    await new Promise((r) => setTimeout(r, 200))
    expect(ended).toHaveLength(1)
    expect(ended[0].exitCode).toBe(0)
  })
})

describe("session manager with storage", () => {
  let tmpDir: string
  let storage: ReturnType<typeof createStorage>

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "sessions-"))
    storage = createStorage(join(tmpDir, "test.db"))
  })
  afterEach(() => { storage.close(); rmSync(tmpDir, { recursive: true }) })

  test("persists session to storage on create", async () => {
    const mgr = createSessionManager({ storage })
    const s = mgr.create({ projectPath: "/tmp", prompt: "test", command: ["echo", '{"type":"result","status":"success"}'] })
    await new Promise((r) => mgr.onEnd(r))
    const stored = storage.getSession(s.id)
    expect(stored).toBeTruthy()
    expect(stored!.prompt).toBe("test")
  })

  test("listAll returns sessions from storage", async () => {
    const mgr = createSessionManager({ storage })
    mgr.create({ projectPath: "/tmp", prompt: "test1", command: ["echo", '{"type":"result"}'] })
    await new Promise((r) => mgr.onEnd(r))
    const all = mgr.listAll()
    expect(all.length).toBeGreaterThanOrEqual(1)
  })
})
