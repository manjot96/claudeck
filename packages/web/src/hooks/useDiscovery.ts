import { useState, useCallback } from "react"

type DiscoveredDaemon = { host: string; hostname: string; mdnsName: string }

export function useDiscovery() {
  const [scanning, setScanning] = useState(false)
  const [found, setFound] = useState<DiscoveredDaemon[]>([])

  const scan = useCallback(async () => {
    setScanning(true)
    setFound([])
    const candidates: string[] = []

    // Try stored hostnames
    try {
      const stored = JSON.parse(
        localStorage.getItem("claudeck_connection") ?? "{}"
      )
      if (stored.mdnsName) candidates.push(`${stored.mdnsName}:3847`)
    } catch {}

    // Try common .local names
    const currentHostname = window.location.hostname
    if (currentHostname && !currentHostname.includes(".")) {
      candidates.push(`${currentHostname}.local:3847`)
    }

    // Subnet scan (first 50 IPs on port 3847)
    const ipMatch = window.location.hostname.match(
      /^(\d+\.\d+\.\d+)\.\d+$/
    )
    if (ipMatch) {
      for (let i = 1; i <= 50; i++)
        candidates.push(`${ipMatch[1]}.${i}:3847`)
    }

    const uniqueCandidates = [...new Set(candidates)]

    await Promise.allSettled(
      uniqueCandidates.map(async (host) => {
        try {
          const res = await fetch(`http://${host}/api/ping`, {
            signal: AbortSignal.timeout(2000),
          })
          if (res.ok) {
            const info = (await res.json()) as {
              hostname: string
              mdnsName: string
            }
            const daemon = {
              host,
              hostname: info.hostname,
              mdnsName: info.mdnsName,
            }
            setFound((prev) => [...prev, daemon])
          }
        } catch {}
      })
    )

    setScanning(false)
  }, [])

  return { scanning, found, scan }
}
