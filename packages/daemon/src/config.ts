import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { randomBytes } from "node:crypto"
import type { DaemonConfig } from "@claudeck/shared"

export const DEFAULT_PORT = 3847
export const DEFAULT_BIND = "0.0.0.0"
const CONFIG_FILE = "config.json"

function defaultConfigDir(): string {
  const home = process.env.HOME ?? process.env.USERPROFILE ?? "~"
  return join(home, ".claudeck")
}

export function loadConfig(
  configDir = defaultConfigDir(),
  overrides: Partial<Pick<DaemonConfig, "port" | "bind">> = {}
): DaemonConfig {
  const configPath = join(configDir, CONFIG_FILE)

  if (existsSync(configPath)) {
    const raw = JSON.parse(readFileSync(configPath, "utf-8")) as DaemonConfig
    return {
      token: raw.token,
      port: overrides.port ?? raw.port ?? DEFAULT_PORT,
      bind: overrides.bind ?? raw.bind ?? DEFAULT_BIND,
    }
  }

  const config: DaemonConfig = {
    token: randomBytes(32).toString("hex"),
    port: DEFAULT_PORT,
    bind: DEFAULT_BIND,
  }

  mkdirSync(configDir, { recursive: true })
  writeFileSync(configPath, JSON.stringify(config, null, 2))

  return {
    ...config,
    port: overrides.port ?? config.port,
    bind: overrides.bind ?? config.bind,
  }
}
