import { hostname } from "node:os"
import { resolve } from "node:path"
import { existsSync } from "node:fs"
import { loadConfig } from "./config"
import { createAuthChecker } from "./auth"
import { createSessionManager } from "./sessions"
import { createStorage } from "./storage"
import { join } from "node:path"
import { createRouter } from "./router"
import { createWsHandler, type WsData } from "./websocket"
import { createProfileManager } from "./profiles"
import { advertise, getMdnsName, stopAdvertising } from "./mdns"

// Parse CLI args
const args = process.argv.slice(2)
const portIdx = args.indexOf("--port")
const bindIdx = args.indexOf("--bind")
const portOverride = portIdx >= 0 ? parseInt(args[portIdx + 1]) : undefined
const bindOverride = bindIdx >= 0 ? args[bindIdx + 1] : undefined

// Initialize modules
const config = loadConfig(undefined, { port: portOverride, bind: bindOverride })
const auth = createAuthChecker(config.token)
const home = process.env.HOME ?? process.env.USERPROFILE ?? "~"
const dbPath = join(home, ".claudeck", "sessions.db")
const storage = createStorage(dbPath)
storage.deleteOlderThan(config.retentionDays ?? 30)
const sessions = createSessionManager({ storage })
const profiles = createProfileManager(storage)
const wsHandler = createWsHandler()

const router = createRouter({
  auth,
  sessions,
  profiles,
  hostname: hostname(),
  mdnsName: getMdnsName(),
})

// Wire session state provider for late-subscriber replay
wsHandler.setSessionStateProvider((sessionId) => sessions.getSessionState(sessionId))

// Wire interactive input
wsHandler.setSendInputFn((sessionId, text) => sessions.sendInput(sessionId, text))

// Wire session events to WebSocket
sessions.onOutput((sessionId, data) => {
  wsHandler.broadcastOutput(sessionId, data)
})

sessions.onEnd((sessionId, exitCode) => {
  wsHandler.broadcastSessionEnded(sessionId, exitCode)
})

// Resolve static files directory
const webDistDir = resolve(import.meta.dir, "../../web/dist")
const hasStaticFiles = existsSync(webDistDir)

// Start server
const server = Bun.serve<WsData>({
  port: config.port,
  hostname: config.bind,

  fetch(req, server) {
    const url = new URL(req.url)

    // WebSocket upgrade
    if (url.pathname === "/ws") {
      const token = url.searchParams.get("token") ?? ""
      const ip = req.headers.get("x-forwarded-for") ?? server.requestIP(req)?.address ?? "unknown"
      if (!auth.isValidWs(token, ip)) {
        return new Response("Unauthorized", { status: 401 })
      }
      if (server.upgrade(req, { data: { subscriptions: new Set(), awaitingPong: false } })) {
        return undefined
      }
      return new Response("WebSocket upgrade failed", { status: 500 })
    }

    // API routes
    if (url.pathname.startsWith("/api/")) {
      const clientIp = req.headers.get("x-forwarded-for") ?? server.requestIP(req)?.address ?? "unknown"
      return router.handle(req, clientIp)
    }

    // Static files (PWA)
    if (hasStaticFiles) {
      const filePath = url.pathname === "/" ? "/index.html" : url.pathname
      const fullPath = resolve(webDistDir, filePath.slice(1))
      const file = Bun.file(fullPath)
      // Fall back to index.html for SPA routing
      if (!existsSync(fullPath)) {
        return new Response(Bun.file(resolve(webDistDir, "index.html")))
      }
      return new Response(file)
    }

    return new Response("ClauDeck daemon running. Build the web UI with: bun run build:web", {
      status: 200,
    })
  },

  websocket: {
    open: wsHandler.open,
    message: wsHandler.message,
    close: wsHandler.close,
  },
})

// Start heartbeat
wsHandler.startHeartbeat()

// Start mDNS
advertise(config.port)

const mdnsName = getMdnsName()
console.log(`
┌─────────────────────────────────────────────┐
│  ClauDeck daemon running                    │
│                                             │
│  URL:   http://${config.bind}:${config.port}${" ".repeat(Math.max(0, 27 - `${config.bind}:${config.port}`.length))}│
│  Token: ${config.token.slice(0, 16)}...${" ".repeat(12)}│
│  mDNS:  ${mdnsName}${" ".repeat(Math.max(0, 32 - mdnsName.length))}│
│                                             │
│  Full token in: ~/.claudeck/config.json     │
└─────────────────────────────────────────────┘
`)

// Graceful shutdown
async function shutdown(): Promise<void> {
  console.log("\nShutting down...")
  wsHandler.stopHeartbeat()

  // Broadcast session-ended with exitCode -1 for all active sessions (per spec)
  for (const session of sessions.list()) {
    wsHandler.broadcastSessionEnded(session.id, -1)
  }

  // SIGTERM all running processes
  sessions.killAll()

  // Wait up to 5s for processes to exit, then SIGKILL
  const start = Date.now()
  while (sessions.list().length > 0 && Date.now() - start < 5000) {
    await new Promise((r) => setTimeout(r, 250))
  }
  sessions.forceKillAll() // SIGKILL any survivors

  wsHandler.closeAll()
  await stopAdvertising()
  storage.close()
  server.stop()
  process.exit(0)
}

process.on("SIGINT", shutdown)
process.on("SIGTERM", shutdown)
