import { useCallback, useRef } from "react"

export function useNotifications(enabled: boolean, onNavigate?: (sessionId: string) => void) {
  const permissionGranted = useRef(false)

  const requestPermission = useCallback(async () => {
    if (!("Notification" in window)) return false
    if (Notification.permission === "granted") {
      permissionGranted.current = true
      return true
    }
    const result = await Notification.requestPermission()
    permissionGranted.current = result === "granted"
    return permissionGranted.current
  }, [])

  const notify = useCallback((title: string, body: string, sessionId: string) => {
    if (!enabled || !permissionGranted.current || !document.hidden) return
    try {
      const n = new Notification(title, {
        body,
        icon: "/pwa-192x192.png",
        tag: sessionId,
      })
      n.onclick = () => {
        window.focus()
        n.close()
        onNavigate?.(sessionId)
      }
    } catch {}
  }, [enabled, onNavigate])

  return { requestPermission, notify }
}
