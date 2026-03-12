import type { AgentProfile } from "@claudeck/shared"

type Storage = {
  saveProfile: (p: AgentProfile) => void
  getProfile: (id: string) => AgentProfile | null
  listProfiles: () => AgentProfile[]
  updateProfile: (id: string, fields: Partial<AgentProfile>) => void
  deleteProfile: (id: string) => void
}

type CreateInput = Omit<AgentProfile, "id" | "createdAt" | "updatedAt">

export function createProfileManager(storage: Storage) {
  function create(input: CreateInput): AgentProfile {
    const now = new Date().toISOString()
    const profile: AgentProfile = {
      id: crypto.randomUUID(),
      ...input,
      createdAt: now,
      updatedAt: now,
    }
    storage.saveProfile(profile)
    return profile
  }

  function get(id: string) {
    return storage.getProfile(id)
  }

  function list() {
    return storage.listProfiles()
  }

  function update(id: string, fields: Partial<CreateInput>) {
    storage.updateProfile(id, {
      ...fields,
      updatedAt: new Date().toISOString(),
    })
  }

  function remove(id: string) {
    storage.deleteProfile(id)
  }

  return { create, get, list, update, remove }
}
