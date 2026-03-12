type Props = {
  status: "connecting" | "connected" | "disconnected"
}

export default function ConnectionBanner({ status }: Props): React.ReactElement | null {
  if (status === "connected") return null

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-50 px-4 py-2 text-center text-sm font-medium
        ${status === "connecting" ? "bg-yellow-600/90 text-yellow-100" : "bg-danger/90 text-white"}`}
      style={{ paddingTop: `calc(env(safe-area-inset-top) + 0.5rem)` }}
    >
      {status === "connecting" ? "Reconnecting..." : "Disconnected"}
    </div>
  )
}
