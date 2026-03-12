import { useState, useCallback, useRef, useEffect } from "react"
import type { Project, Session, WsServerMessage, DaemonInfo } from "@claudeck/shared"
import { useConnection } from "./hooks/useConnection"
import { useApi } from "./hooks/useApi"
import { useWebSocket } from "./hooks/useWebSocket"
import { useSettings } from "./hooks/useSettings"
import { useTheme } from "./hooks/useTheme"
import { useNotifications } from "./hooks/useNotifications"
import ConnectScreen from "./screens/ConnectScreen"
import ProjectsScreen from "./screens/ProjectsScreen"
import ProjectScreen from "./screens/ProjectScreen"
import SessionScreen from "./screens/SessionScreen"
import SettingsScreen from "./screens/SettingsScreen"
import ConnectionBanner from "./components/ConnectionBanner"
import BottomNav from "./components/BottomNav"

type Screen =
  | { name: "projects" }
  | { name: "project"; project: Project }
  | { name: "session"; session: Session }
  | { name: "settings" }

export default function App(): React.ReactElement {
  const conn = useConnection()
  const api = useApi(conn.host, conn.token)
  const [screen, setScreen] = useState<Screen>({ name: "projects" })
  const [activeSession, setActiveSession] = useState<Session | null>(null)
  const { settings, update: updateSettings, reset: resetSettings } = useSettings()
  useTheme(settings.theme)
  const notifications = useNotifications(settings.notificationsEnabled)
  const [daemonInfo, setDaemonInfo] = useState<DaemonInfo | null>(null)

  // Message handlers for WebSocket
  const messageHandlers = useRef(new Set<(msg: WsServerMessage) => void>())

  const handleWsMessage = useCallback((msg: WsServerMessage) => {
    for (const handler of messageHandlers.current) {
      handler(msg)
    }
  }, [])

  useEffect(() => {
    if (conn.connected && conn.host && conn.token) {
      fetch(`http://${conn.host}/api/ping`, {
        headers: { Authorization: `Bearer ${conn.token}` },
      })
        .then((r) => r.json())
        .then((data) => setDaemonInfo(data as DaemonInfo))
        .catch(() => {})
    }
  }, [conn.connected, conn.host, conn.token])

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
          getAllSessions={api.getAllSessions}
          createSession={api.createSession}
          onSessionStarted={(session) => {
            setActiveSession(session)
            setScreen({ name: "session", session })
            notifications.requestPermission()
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
          wsSendInput={ws.sendInput}
          wsOnMessage={registerHandler}
          getSessionEvents={api.getSessionEvents}
          onStop={async (id) => {
            await api.killSession(id)
          }}
          onBack={() => setScreen({ name: "projects" })}
          settings={settings}
          onNotify={notifications.notify}
        />
      )}

      {screen.name === "settings" && (
        <SettingsScreen
          settings={settings}
          onUpdate={updateSettings}
          onReset={resetSettings}
          host={conn.host}
          token={conn.token}
          mdnsName={conn.mdnsName ?? null}
          daemonInfo={daemonInfo}
          onDisconnect={conn.disconnect}
        />
      )}

      <BottomNav
        active={screen.name === "session" ? "session" : screen.name === "settings" ? "settings" : "projects"}
        onNavigate={(s) => {
          if (s === "projects") setScreen({ name: "projects" })
          if (s === "session" && activeSession) setScreen({ name: "session", session: activeSession })
          if (s === "settings") setScreen({ name: "settings" })
        }}
        hasActiveSession={activeSession !== null}
      />
    </div>
  )
}
