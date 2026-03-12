import { describe, test, expect, beforeEach } from "bun:test"
import { createSessionManager } from "./sessions"

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
})
