import { create } from 'zustand'
import type { ThemeMode } from '../../../shared/types'

interface SettingsState {
  ramGb: number
  systemRamGb: number | null
  theme: ThemeMode
  loaded: boolean
  load: () => Promise<void>
  setRamGb: (gb: number) => void
  setTheme: (theme: ThemeMode) => void
}

let ramPersistTimer: number | undefined

/** Tema sınıfı <html> üzerinde tutulur; CSS değişkenleri buradan türer. */
function applyTheme(theme: ThemeMode): void {
  document.documentElement.classList.toggle('dark', theme === 'dark')
  document.documentElement.style.colorScheme = theme
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  ramGb: 4,
  systemRamGb: null,
  theme: 'light',
  loaded: false,

  load: async () => {
    if (get().loaded) return
    const snapshot = await window.launcher.settings.get()
    applyTheme(snapshot.settings.theme)
    set({
      ramGb: snapshot.settings.ramGb,
      systemRamGb: snapshot.systemRamGb,
      theme: snapshot.settings.theme,
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

  setTheme: (theme) => {
    applyTheme(theme)
    set({ theme })
    void window.launcher.settings.set({ theme })
  }
}))
