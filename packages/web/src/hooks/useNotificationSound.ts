import { useCallback, useRef } from "react"

type SoundType = "success" | "failure"

export function useNotificationSound(enabled: boolean, hapticEnabled: boolean) {
  const ctxRef = useRef<AudioContext | null>(null)

  const play = useCallback((type: SoundType) => {
    if (!enabled) return

    // Sound
    try {
      if (!ctxRef.current) ctxRef.current = new AudioContext()
      const ctx = ctxRef.current
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      gain.gain.value = 0.3

      const now = ctx.currentTime
      if (type === "success") {
        osc.frequency.setValueAtTime(523, now)      // C5
        osc.frequency.setValueAtTime(659, now + 0.1) // E5
      } else {
        osc.frequency.setValueAtTime(659, now)      // E5
        osc.frequency.setValueAtTime(523, now + 0.1) // C5
      }
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25)
      osc.start(now)
      osc.stop(now + 0.25)
    } catch {}

    // Haptic
    if (hapticEnabled && navigator.vibrate) {
      navigator.vibrate([100, 50, 100])
    }
  }, [enabled, hapticEnabled])

  return { play }
}
