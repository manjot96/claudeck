import { describe, test, expect, beforeEach, afterEach } from "bun:test"
import { loadConfig, DEFAULT_PORT, DEFAULT_BIND } from "./config"
import { rmSync } from "node:fs"
import { join } from "node:path"

const TEST_DIR = join(import.meta.dir, "../.test-config")

describe("loadConfig", () => {
  beforeEach(() => {
    rmSync(TEST_DIR, { recursive: true, force: true })
  })

  afterEach(() => {
    rmSync(TEST_DIR, { recursive: true, force: true })
  })

  test("creates config with generated token on first run", () => {
    const config = loadConfig(TEST_DIR)
    expect(config.token).toHaveLength(64) // 32 bytes hex
    expect(config.port).toBe(DEFAULT_PORT)
    expect(config.bind).toBe(DEFAULT_BIND)
  })

  test("reads existing config on subsequent runs", () => {
    const first = loadConfig(TEST_DIR)
    const second = loadConfig(TEST_DIR)
    expect(second.token).toBe(first.token)
  })

  test("CLI overrides take precedence", () => {
    const config = loadConfig(TEST_DIR, { port: 9999, bind: "127.0.0.1" })
    expect(config.port).toBe(9999)
    expect(config.bind).toBe("127.0.0.1")
  })
})
