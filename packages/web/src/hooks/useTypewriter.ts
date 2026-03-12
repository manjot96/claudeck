import { useState, useEffect, useRef } from "react"

export function useTypewriter(text: string, enabled: boolean): string {
  const [displayed, setDisplayed] = useState("")
  const prevTextRef = useRef("")

  useEffect(() => {
    if (!enabled) {
      setDisplayed(text)
      return
    }

    // Only animate new content
    const prev = prevTextRef.current
    if (!text.startsWith(prev)) {
      // Text replaced entirely — show immediately
      setDisplayed(text)
      prevTextRef.current = text
      return
    }

    const newContent = text.slice(prev.length)
    if (newContent.length === 0) return

    let idx = 0
    let rafId: number

    function tick() {
      const charsPerFrame = 30
      idx = Math.min(idx + charsPerFrame, newContent.length)
      setDisplayed(prev + newContent.slice(0, idx))
      if (idx < newContent.length) {
        rafId = requestAnimationFrame(tick)
      } else {
        prevTextRef.current = text
      }
    }

    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [text, enabled])

  return displayed
}
