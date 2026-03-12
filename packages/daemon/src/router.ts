import type { ApiError, DaemonInfo, CreateSessionRequest } from "@claudeck/shared"
import type { createAuthChecker } from "./auth"
import type { createSessionManager } from "./sessions"
import type { createProfileManager } from "./profiles"
import { scanProjects } from "./projects"

type RouterDeps = {
  auth: ReturnType<typeof createAuthChecker>
  sessions: ReturnType<typeof createSessionManager>
  profiles?: ReturnType<typeof createProfileManager>
  projectsDir?: string
  hostname: string
  mdnsName: string
}

const VERSION = "0.1.0"

function json(data: unknown, status = 200): Response {
  return Response.json(data, { status })
}

function errorResponse(error: string, code: string, status: number): Response {
  return json({ error, code } satisfies ApiError, status)
}

export function createRouter(deps: RouterDeps) {
  async function handle(req: Request, clientIp = "unknown"): Promise<Response> {
    const url = new URL(req.url)

    // Auth check
    if (url.pathname.startsWith("/api/")) {
      const authHeader = req.headers.get("authorization")
      if (!deps.auth.isValid(authHeader, clientIp)) {
        return errorResponse("Invalid or missing token", "INVALID_TOKEN", 401)
      }
    }

    // Route matching
    const method = req.method
    const path = url.pathname

    if (method === "GET" && path === "/api/ping") {
      const info: DaemonInfo = {
        hostname: deps.hostname,
        mdnsName: deps.mdnsName,
        version: VERSION,
      }
      return json(info)
    }

    if (method === "GET" && path === "/api/projects") {
      const projects = scanProjects(deps.projectsDir)
      return json(projects)
    }

    if (method === "POST" && path === "/api/sessions") {
      const body = (await req.json()) as CreateSessionRequest & { _testCommand?: string[] }
      if (!body.projectPath || !body.prompt) {
        return errorResponse("Missing projectPath or prompt", "BAD_REQUEST", 400)
      }
      try {
        const session = deps.sessions.create({
          projectPath: body.projectPath,
          prompt: body.prompt,
          ...(body._testCommand ? { command: body._testCommand } : {}),
        })
        return json(session, 201)
      } catch (e: unknown) {
        if (e instanceof Error && (e.message === "SESSION_ACTIVE" || e.message === "MAX_SESSIONS_REACHED")) {
          return errorResponse("Maximum concurrent sessions reached", "MAX_SESSIONS_REACHED", 409)
        }
        throw e
      }
    }

    if (method === "GET" && path === "/api/sessions") {
      const all = url.searchParams.get("all") === "true"
      const offset = parseInt(url.searchParams.get("offset") ?? "0")
      const limit = parseInt(url.searchParams.get("limit") ?? "100")
      return json(all ? deps.sessions.listAll({ offset, limit }) : deps.sessions.list())
    }

    // GET /api/sessions/:id/events — fetch archived events for a session
    const eventsMatch = method === "GET" && path.match(/^\/api\/sessions\/([^/]+)\/events$/)
    if (eventsMatch) {
      const id = eventsMatch[1]
      const state = deps.sessions.getSessionState(id)
      if (!state) {
        return errorResponse("Session not found", "NOT_FOUND", 404)
      }
      return json(state.events)
    }

    if (method === "DELETE" && path.startsWith("/api/sessions/")) {
      const id = path.split("/").pop()!
      const killed = deps.sessions.kill(id)
      if (!killed) {
        return errorResponse("Session not found", "NOT_FOUND", 404)
      }
      return json({ ok: true })
    }

    // ── Profile endpoints ──

    if (method === "GET" && path === "/api/profiles") {
      return json(deps.profiles?.list() ?? [])
    }

    if (method === "POST" && path === "/api/profiles") {
      if (!deps.profiles) return errorResponse("Profiles not available", "NOT_AVAILABLE", 500)
      const body = await req.json()
      return json(deps.profiles.create(body), 201)
    }

    const profileMatch = path.match(/^\/api\/profiles\/([^/]+)$/)
    if (profileMatch) {
      const id = profileMatch[1]
      if (method === "GET") {
        const profile = deps.profiles?.get(id)
        if (!profile) return errorResponse("Profile not found", "NOT_FOUND", 404)
        return json(profile)
      }
      if (method === "PUT") {
        if (!deps.profiles) return errorResponse("Profiles not available", "NOT_AVAILABLE", 500)
        const body = await req.json()
        deps.profiles.update(id, body)
        return json({ ok: true })
      }
      if (method === "DELETE") {
        deps.profiles?.remove(id)
        return json({ ok: true })
      }
    }

    return errorResponse("Not found", "NOT_FOUND", 404)
  }

  return { handle }
}
