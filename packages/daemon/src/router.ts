import type { ApiError, DaemonInfo, CreateSessionRequest } from "@claudeck/shared"
import type { createAuthChecker } from "./auth"
import type { createSessionManager } from "./sessions"
import { scanProjects } from "./projects"

type RouterDeps = {
  auth: ReturnType<typeof createAuthChecker>
  sessions: ReturnType<typeof createSessionManager>
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
        if (e instanceof Error && e.message === "SESSION_ACTIVE") {
          return errorResponse("A session is already running", "SESSION_ACTIVE", 409)
        }
        throw e
      }
    }

    if (method === "GET" && path === "/api/sessions") {
      return json(deps.sessions.list())
    }

    if (method === "DELETE" && path.startsWith("/api/sessions/")) {
      const id = path.split("/").pop()!
      const killed = deps.sessions.kill(id)
      if (!killed) {
        return errorResponse("Session not found", "NOT_FOUND", 404)
      }
      return json({ ok: true })
    }

    return errorResponse("Not found", "NOT_FOUND", 404)
  }

  return { handle }
}
