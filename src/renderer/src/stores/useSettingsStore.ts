import { create } from 'zustand'
import { useProfileStore } from './useProfileStore'

interface SettingsState {
  ramGb: number
  modRepo: string
  systemRamGb: number | null
  loaded: boolean
  load: () => Promise<void>
  setRamGb: (gb: number) => void
  setModRepo: (value: string) => void
}

let ramPersistTimer: number | undefined
let repoPersistTimer: number | undefined

export const useSettingsStore = create<SettingsState>((set, get) => ({
  ramGb: 4,
  modRepo: '',
  systemRamGb: null,
  loaded: false,

  load: async () => {
    if (get().loaded) return
    const snapshot = await window.launcher.settings.get()
    set({
      ramGb: snapshot.settings.ramGb,
      modRepo: snapshot.settings.modRepo,
      systemRamGb: snapshot.systemRamGb,
      loaded: true
    })
  },

  setRamGb: (gb) => {
    set({ ramGb: gb })
    // Slider sürüklenirken her adımda diske yazmamak için kısa debounce.
    window.clearTimeout(ramPersistTimer)
    ramPersistTimer = window.setTimeout(() => {
      void window.launcher.settings.set({ ramGb: get().ramGb })
    }, 250)
  },

  setModRepo: (value) => {
    set({ modRepo: value })
    // Yazma bitince kaydet ve profil listesini yeni repodan tazele.
    window.clearTimeout(repoPersistTimer)
    repoPersistTimer = window.setTimeout(async () => {
      await window.launcher.settings.set({ modRepo: get().modRepo })
      await useProfileStore.getState().load()
    }, 600)
  }
}))
