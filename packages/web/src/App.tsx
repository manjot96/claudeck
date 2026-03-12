import { useState, useCallback, useRef } from "react"
import type { Project, Session, WsServerMessage } from "@claudeck/shared"
import { useConnection } from "./hooks/useConnection"
import { useApi } from "./hooks/useApi"
import { useWebSocket } from "./hooks/useWebSocket"
import ConnectScreen from "./screens/ConnectScreen"
import ProjectsScreen from "./screens/ProjectsScreen"
import ProjectScreen from "./screens/ProjectScreen"
import SessionScreen from "./screens/SessionScreen"
import ConnectionBanner from "./components/ConnectionBanner"
import BottomNav from "./components/BottomNav"

type Screen =
  | { name: "projects" }
  | { name: "project"; project: Project }
  | { name: "session"; session: Session }

export default function App(): React.ReactElement {
  const conn = useConnection()
  const api = useApi(conn.host, conn.token)
  const [screen, setScreen] = useState<Screen>({ name: "projects" })
  const [activeSession, setActiveSession] = useState<Session | null>(null)

  // Message handlers for WebSocket
  const messageHandlers = useRef(new Set<(msg: WsServerMessage) => void>())

  const handleWsMessage = useCallback((msg: WsServerMessage) => {
    for (const handler of messageHandlers.current) {
      handler(msg)
    }
  }, [])

  const ws = useWebSocket(
    conn.connected ? conn.host : null,
    conn.token,
    handleWsMessage
  )

  const registerHandler = useCallback(
    (handler: (msg: WsServerMessage) => void) => {
      messageHandlers.current.add(handler)
      return () => {
        messageHandlers.current.delete(handler)
      }
    },
    []
  )

  if (!conn.connected) {
    return <ConnectScreen onConnect={conn.connect} />
  }

  return (
    <div className="min-h-screen bg-surface">
      <ConnectionBanner status={ws.status} />

      {screen.name === "projects" && (
        <ProjectsScreen
          getProjects={api.getProjects}
          onSelect={(project) => setScreen({ name: "project", project })}
        />
      )}

      {screen.name === "project" && (
        <ProjectScreen
          project={screen.project}
          getSessions={api.getSessions}
          createSession={api.createSession}
          onSessionStarted={(session) => {
            setActiveSession(session)
            setScreen({ name: "session", session })
          }}
          onWatchSession={(session) => {
            setActiveSession(session)
            setScreen({ name: "session", session })
          }}
          onBack={() => setScreen({ name: "projects" })}
        />
      )}

      {screen.name === "session" && (
        <SessionScreen
          session={screen.session}
          wsSubscribe={ws.subscribe}
          wsUnsubscribe={ws.unsubscribe}
          wsOnMessage={registerHandler}
          onStop={async (id) => {
            await api.killSession(id)
          }}
          onBack={() => setScreen({ name: "projects" })}
        />
      )}

      <BottomNav
        active={screen.name === "session" ? "session" : "projects"}
        onNavigate={(s) => {
          if (s === "projects") setScreen({ name: "projects" })
          if (s === "session" && activeSession) setScreen({ name: "session", session: activeSession })
        }}
        hasActiveSession={activeSession !== null}
      />
    </div>
  )
}
