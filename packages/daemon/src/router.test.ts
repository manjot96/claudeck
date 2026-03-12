import { describe, test, expect } from "bun:test"
import { createRouter } from "./router"
import { createAuthChecker } from "./auth"
import { createSessionManager } from "./sessions"

const TOKEN = "testtoken123"

function makeRouter() {
  const auth = createAuthChecker(TOKEN)
  const sessions = createSessionManager()
  return createRouter({
    auth,
    sessions,
    projectsDir: undefined, // uses default
    hostname: "test-host",
    mdnsName: "test-host.local",
  })
}

function req(path: string, opts: RequestInit = {}) {
  return new Request(`http://localhost:3847${path}`, {
    headers: { Authorization: `Bearer ${TOKEN}`, ...opts.headers },
    ...opts,
  })
}

function unauthReq(path: string) {
  return new Request(`http://localhost:3847${path}`)
}

function sessionReq(prompt: string, command: string[] = ["echo", '{"type":"result","status":"success"}']) {
  return req("/api/sessions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${TOKEN}`,
    },
    body: JSON.stringify({
      projectPath: "/tmp",
      prompt,
      _testCommand: command,
    }),
  })
}

describe("router", () => {
  test("GET /api/ping returns daemon info", async () => {
    const router = makeRouter()
    const res = await router.handle(req("/api/ping"))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.hostname).toBe("test-host")
    expect(body.version).toBeDefined()
  })

  test("rejects unauthenticated requests with 401", async () => {
    const router = makeRouter()
    const res = await router.handle(unauthReq("/api/ping"))
    expect(res.status).toBe(401)
  })

  test("POST /api/sessions creates a session", async () => {
    const router = makeRouter()
    const res = await router.handle(sessionReq("test"))
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.id).toBeDefined()
    expect(body.status).toBe("running")
  })

  test("POST /api/sessions returns 409 when session active", async () => {
    const router = makeRouter()
    const first = await router.handle(sessionReq("test1", ["sleep", "10"]))
    expect(first.status).toBe(201)

    const second = await router.handle(sessionReq("test2"))
    expect(second.status).toBe(409)
  })

  test("GET /api/sessions lists active sessions", async () => {
    const router = makeRouter()
    await router.handle(sessionReq("test", ["sleep", "10"]))
    const res = await router.handle(req("/api/sessions"))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveLength(1)
  })

  test("DELETE /api/sessions/:id kills session", async () => {
    const router = makeRouter()
    const createRes = await router.handle(sessionReq("test", ["sleep", "10"]))
    const { id } = await createRes.json()
    const res = await router.handle(req(`/api/sessions/${id}`, { method: "DELETE" }))
    expect(res.status).toBe(200)
  })

  test("DELETE /api/sessions/:id returns 404 for unknown", async () => {
    const router = makeRouter()
    const res = await router.handle(req("/api/sessions/nonexistent", { method: "DELETE" }))
    expect(res.status).toBe(404)
  })

  test("returns 404 for unknown routes", async () => {
    const router = makeRouter()
    const res = await router.handle(req("/api/unknown"))
    expect(res.status).toBe(404)
  })
})
