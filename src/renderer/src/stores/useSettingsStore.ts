import { create } from 'zustand'

interface SettingsState {
  ramGb: number
  systemRamGb: number | null
  loaded: boolean
  load: () => Promise<void>
  setRamGb: (gb: number) => void
}

let ramPersistTimer: number | undefined

export const useSettingsStore = create<SettingsState>((set, get) => ({
  ramGb: 4,
  systemRamGb: null,
  loaded: false,

  load: async () => {
    if (get().loaded) return
    const snapshot = await window.launcher.settings.get()
    set({
      ramGb: snapshot.settings.ramGb,
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
}))
