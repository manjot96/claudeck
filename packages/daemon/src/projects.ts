import { existsSync, readdirSync, statSync } from "node:fs"
import { join, basename } from "node:path"
import type { Project } from "@claudeck/shared"

function defaultProjectsDir(): string {
  const home = process.env.HOME ?? process.env.USERPROFILE ?? "~"
  return join(home, ".claude", "projects")
}

function decodePath(encoded: string): string {
  // Claude encodes absolute paths by replacing / with -
  // e.g., "-Users-foo-Work-my-app" → "/Users/foo/Work/my-app"
  // NOTE: This is lossy for dirs containing hyphens. We use the
  // raw encoded name as the unique `id` to avoid collisions.
  return encoded.replace(/^-/, "/").replace(/-/g, "/")
}

export function scanProjects(projectsDir = defaultProjectsDir()): Project[] {
  if (!existsSync(projectsDir)) return []

  const entries = readdirSync(projectsDir)
  const projects: Project[] = []

  for (const entry of entries) {
    const fullPath = join(projectsDir, entry)
    if (!statSync(fullPath).isDirectory()) continue

    const decodedPath = decodePath(entry)
    const name = basename(decodedPath)

    projects.push({
      id: entry,         // raw encoded dir name — unique, no collisions
      path: decodedPath, // best-effort decode for display
      name,              // last segment for display
    })
  }

  return projects.sort((a, b) => a.name.localeCompare(b.name))
}
