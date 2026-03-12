import { describe, test, expect, beforeEach, afterEach } from "bun:test"
import { scanProjects } from "./projects"
import { mkdirSync, rmSync } from "node:fs"
import { join } from "node:path"

const TEST_DIR = join(import.meta.dir, "../.test-projects")

describe("scanProjects", () => {
  beforeEach(() => {
    rmSync(TEST_DIR, { recursive: true, force: true })
    // Claude stores projects as path-encoded directory names
    // e.g., ~/.claude/projects/-Users-foo-Work-my-app/
    mkdirSync(join(TEST_DIR, "-Users-foo-Work-my-app"), { recursive: true })
    mkdirSync(join(TEST_DIR, "-Users-foo-Work-another"), { recursive: true })
  })

  afterEach(() => {
    rmSync(TEST_DIR, { recursive: true, force: true })
  })

  test("returns projects from claude projects dir", () => {
    const projects = scanProjects(TEST_DIR)
    expect(projects).toHaveLength(2)
  })

  test("uses encoded dir name as id and decodes path for display", () => {
    const projects = scanProjects(TEST_DIR)
    const app = projects.find((p) => p.id === "-Users-foo-Work-my-app")
    expect(app).toBeDefined()
    expect(app!.name).toBe("app")
    expect(app!.path).toBe("/Users/foo/Work/my/app")
  })

  test("returns empty array for missing directory", () => {
    const projects = scanProjects("/nonexistent/path")
    expect(projects).toEqual([])
  })
})
