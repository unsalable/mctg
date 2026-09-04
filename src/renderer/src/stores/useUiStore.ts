import { create } from 'zustand'

export type LauncherTab = 'home' | 'profiles' | 'versions' | 'account' | 'settings'

/** Üstteki limelight barın sırasıyla aynı olmalı. */
export const TAB_ORDER: LauncherTab[] = ['home', 'profiles', 'versions', 'account', 'settings']

interface ToastMessage {
  id: number
  message: string
  tone: 'info' | 'error' | 'success'
}

interface UiState {
  tab: LauncherTab
  setTab: (tab: LauncherTab) => void
  toast: ToastMessage | null
  showToast: (message: string, tone?: ToastMessage['tone']) => void
  hideToast: () => void
}

let toastTimer: number | undefined
let toastId = 0

export const useUiStore = create<UiState>((set) => ({
  tab: 'home',
  setTab: (tab) => set({ tab }),

  toast: null,
  showToast: (message, tone = 'info') => {
    window.clearTimeout(toastTimer)
    set({ toast: { id: ++toastId, message, tone } })
    toastTimer = window.setTimeout(() => set({ toast: null }), 4500)
  },
  hideToast: () => {
    window.clearTimeout(toastTimer)
    set({ toast: null })
  }
}))
