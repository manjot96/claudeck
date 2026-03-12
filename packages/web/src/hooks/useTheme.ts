import { useEffect } from "react"
import type { Settings } from "@claudeck/shared"

export function useTheme(theme: Settings["theme"]) {
  useEffect(() => {
    const root = document.documentElement
    root.classList.remove("dark", "light")

    if (theme === "system") {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
      root.classList.add(prefersDark ? "dark" : "light")

      const listener = (e: MediaQueryListEvent) => {
        root.classList.remove("dark", "light")
        root.classList.add(e.matches ? "dark" : "light")
      }
      const mq = window.matchMedia("(prefers-color-scheme: dark)")
      mq.addEventListener("change", listener)
      return () => mq.removeEventListener("change", listener)
    } else {
      root.classList.add(theme)
    }
  }, [theme])
}
