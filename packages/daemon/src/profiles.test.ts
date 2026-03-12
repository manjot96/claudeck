import { describe, test, expect, beforeEach, afterEach } from "bun:test"
import { createStorage } from "./storage"
import { createProfileManager } from "./profiles"
import { mkdtempSync, rmSync } from "node:fs"
import { join } from "node:path"
import { tmpdir } from "node:os"

describe("profiles", () => {
  let tmpDir: string
  let storage: ReturnType<typeof createStorage>
  let profiles: ReturnType<typeof createProfileManager>

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "profiles-"))
    storage = createStorage(join(tmpDir, "test.db"))
    profiles = createProfileManager(storage)
  })

  afterEach(() => {
    storage.close()
    rmSync(tmpDir, { recursive: true })
  })

  test("creates and retrieves a profile", () => {
    const p = profiles.create({
      name: "Test",
      promptTemplate: "Do X",
      projectScope: [],
    })
    expect(p.id).toBeDefined()
    expect(profiles.get(p.id)?.name).toBe("Test")
  })

  test("lists all profiles", () => {
    profiles.create({ name: "A", promptTemplate: "a", projectScope: [] })
    profiles.create({ name: "B", promptTemplate: "b", projectScope: [] })
    expect(profiles.list().length).toBe(2)
  })

  test("updates a profile", () => {
    const p = profiles.create({
      name: "Old",
      promptTemplate: "old",
      projectScope: [],
    })
    profiles.update(p.id, { name: "New" })
    expect(profiles.get(p.id)?.name).toBe("New")
  })

  test("deletes a profile", () => {
    const p = profiles.create({
      name: "Del",
      promptTemplate: "del",
      projectScope: [],
    })
    profiles.remove(p.id)
    expect(profiles.get(p.id)).toBeNull()
  })

  test("stores and retrieves cliFlags and allowedTools", () => {
    const p = profiles.create({
      name: "Flags",
      promptTemplate: "test",
      cliFlags: ["--verbose", "--no-cache"],
      allowedTools: ["Read", "Grep"],
      projectScope: ["/home/user/project"],
    })
    const retrieved = profiles.get(p.id)
    expect(retrieved?.cliFlags).toEqual(["--verbose", "--no-cache"])
    expect(retrieved?.allowedTools).toEqual(["Read", "Grep"])
    expect(retrieved?.projectScope).toEqual(["/home/user/project"])
  })
})
