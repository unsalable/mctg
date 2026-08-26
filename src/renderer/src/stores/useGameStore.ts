import { create } from 'zustand'
import type { GameProgress } from '../../../shared/types'

type GameUiState = 'idle' | 'preparing' | 'running'

interface GameState {
  ui: GameUiState
  progress: GameProgress | null
  error: string | null
  /** IPC olay aboneliklerini bir kez kurar. */
  init: () => void
  play: () => Promise<void>
  clearError: () => void
}

let initialized = false

export const useGameStore = create<GameState>((set, get) => ({
  ui: 'idle',
  progress: null,
  error: null,

  init: () => {
    if (initialized) return
    initialized = true
    window.launcher.game.onProgress((progress) => {
      // 'running' aşamasına geçiş play() içinde ele alınır; ara aşamalar burada akar.
      if (get().ui === 'preparing') set({ progress })
    })
    window.launcher.game.onExit(() => {
      set({ ui: 'idle', progress: null })
    })
  },

  play: async () => {
    if (get().ui !== 'idle') return
    set({
      ui: 'preparing',
      error: null,
      progress: { phase: 'resolving', label: 'Hazırlanıyor…', percent: null }
    })
    const result = await window.launcher.game.play()
    if (!result.ok) {
      set({ ui: 'idle', progress: null, error: result.error })
      return
    }
    set({ ui: 'running', progress: null })
  },

  clearError: () => set({ error: null })
}))
