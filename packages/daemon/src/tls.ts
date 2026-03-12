import { existsSync } from "node:fs"
import { join } from "node:path"

const TLS_DIR_NAME = "tls"

export function tlsDir(configDir: string): string {
  return join(configDir, TLS_DIR_NAME)
}

export function hasCerts(configDir: string): boolean {
  const dir = tlsDir(configDir)
  return (
    existsSync(join(dir, "server.pem")) &&
    existsSync(join(dir, "server-key.pem")) &&
    existsSync(join(dir, "ca.pem"))
  )
}

export async function generateCerts(
  configDir: string
): Promise<{ certPath: string; keyPath: string; caPath: string }> {
  const dir = tlsDir(configDir)
  const { mkdirSync } = await import("node:fs")
  mkdirSync(dir, { recursive: true })

  const caKeyPath = join(dir, "ca-key.pem")
  const caPath = join(dir, "ca.pem")
  const keyPath = join(dir, "server-key.pem")
  const certPath = join(dir, "server.pem")

  // Generate CA
  await run(["openssl", "genrsa", "-out", caKeyPath, "2048"])
  await run([
    "openssl",
    "req",
    "-new",
    "-x509",
    "-key",
    caKeyPath,
    "-out",
    caPath,
    "-days",
    "3650",
    "-subj",
    "/CN=ClauDeck CA",
  ])

  // Generate server key + cert
  await run(["openssl", "genrsa", "-out", keyPath, "2048"])
  const csrPath = join(dir, "server.csr")
  await run([
    "openssl",
    "req",
    "-new",
    "-key",
    keyPath,
    "-out",
    csrPath,
    "-subj",
    "/CN=claudeck",
  ])
  await run([
    "openssl",
    "x509",
    "-req",
    "-in",
    csrPath,
    "-CA",
    caPath,
    "-CAkey",
    caKeyPath,
    "-CAcreateserial",
    "-out",
    certPath,
    "-days",
    "3650",
  ])

  return { certPath, keyPath, caPath }
}

async function run(cmd: string[]): Promise<void> {
  const proc = Bun.spawn(cmd, { stdout: "ignore", stderr: "pipe" })
  const exitCode = await proc.exited
  if (exitCode !== 0) throw new Error(`Command failed: ${cmd.join(" ")}`)
}
