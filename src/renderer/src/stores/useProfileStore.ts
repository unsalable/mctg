import { create } from 'zustand'
import { VANILLA_PROFILE_ID } from '../../../shared/constants'
import type { ModProfile } from '../../../shared/types'

interface ProfileState {
  profiles: ModProfile[]
  selectedId: string
  repo: string | null
  /** Repo erişim sorunu gibi engelleyici olmayan uyarılar. */
  warning: string | null
  loading: boolean
  loaded: boolean
  load: () => Promise<void>
  select: (id: string) => void
}

export const useProfileStore = create<ProfileState>((set, get) => ({
  profiles: [],
  selectedId: VANILLA_PROFILE_ID,
  repo: null,
  warning: null,
  loading: false,
  loaded: false,

  load: async () => {
    if (get().loading) return
    set({ loading: true })
    try {
      const [snapshot, settings] = await Promise.all([
        window.launcher.profiles.list(),
        window.launcher.settings.get()
      ])
      const persisted = settings.settings.selectedProfileId
      const stillExists = snapshot.profiles.some((p) => p.id === persisted)
      set({
        profiles: snapshot.profiles,
        repo: snapshot.repo,
        warning: snapshot.error,
        selectedId: stillExists ? persisted : VANILLA_PROFILE_ID,
        loaded: true
      })
    } finally {
      set({ loading: false })
    }
  },

  select: (id) => {
    set({ selectedId: id })
    void window.launcher.settings.set({ selectedProfileId: id })
  }
}))
