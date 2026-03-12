import { describe, test, expect, beforeEach } from "bun:test"
import { createAuthChecker } from "./auth"

describe("createAuthChecker", () => {
  const TOKEN = "abc123"
  let check: ReturnType<typeof createAuthChecker>

  beforeEach(() => {
    check = createAuthChecker(TOKEN)
  })

  test("accepts valid Bearer token", () => {
    expect(check.isValid(`Bearer ${TOKEN}`, "127.0.0.1")).toBe(true)
  })

  test("rejects missing header", () => {
    expect(check.isValid(null, "127.0.0.1")).toBe(false)
  })

  test("rejects wrong token", () => {
    expect(check.isValid("Bearer wrong", "127.0.0.1")).toBe(false)
  })

  test("rejects after 5 failures from same IP", () => {
    const ip = "192.168.1.50"
    for (let i = 0; i < 5; i++) {
      check.isValid("Bearer wrong", ip)
    }
    // 6th attempt with correct token should be rate-limited
    expect(check.isValid(`Bearer ${TOKEN}`, ip)).toBe(false)
  })

  test("accepts valid WebSocket token param", () => {
    expect(check.isValidWs(TOKEN, "127.0.0.1")).toBe(true)
  })

  test("rejects invalid WebSocket token param", () => {
    expect(check.isValidWs("wrong", "127.0.0.1")).toBe(false)
  })
})
