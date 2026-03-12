/**
 * Normalise a host input into base HTTP and WS URLs.
 *
 * Accepts:
 *  - "192.168.1.50:3847"                       → http://192.168.1.50:3847
 *  - "https://foo.ngrok-free.dev"               → https://foo.ngrok-free.dev
 *  - "http://foo.ngrok-free.dev"                → http://foo.ngrok-free.dev
 *  - "foo.ngrok-free.dev"                       → https://foo.ngrok-free.dev
 */
export function httpBase(host: string): string {
  if (host.startsWith("http://") || host.startsWith("https://")) {
    return host.replace(/\/+$/, "")
  }
  // If it looks like ip:port, use http
  if (/:\d+$/.test(host)) {
    return `http://${host}`
  }
  // Domain name without port → https
  return `https://${host}`
}

export function wsBase(host: string): string {
  const base = httpBase(host)
  if (base.startsWith("https://")) return base.replace("https://", "wss://")
  return base.replace("http://", "ws://")
}
