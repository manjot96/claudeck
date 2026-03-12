import { describe, test, expect, beforeEach, afterEach } from "bun:test"
import { hasCerts, generateCerts, tlsDir } from "./tls"
import { mkdtempSync, rmSync, existsSync } from "node:fs"
import { join } from "node:path"
import { tmpdir } from "node:os"

describe("tls", () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "tls-"))
  })

  afterEach(() => {
    rmSync(tmpDir, { recursive: true })
  })

  test("hasCerts returns false when no certs", () => {
    expect(hasCerts(tmpDir)).toBe(false)
  })

  test("generateCerts creates all cert files", async () => {
    await generateCerts(tmpDir)
    const dir = tlsDir(tmpDir)
    expect(existsSync(join(dir, "server.pem"))).toBe(true)
    expect(existsSync(join(dir, "server-key.pem"))).toBe(true)
    expect(existsSync(join(dir, "ca.pem"))).toBe(true)
  })

  test("hasCerts returns true after generation", async () => {
    await generateCerts(tmpDir)
    expect(hasCerts(tmpDir)).toBe(true)
  })
})
