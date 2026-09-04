import { create } from 'zustand'
import type { PlayerSession } from '../../../shared/types'
import { useUiStore } from './useUiStore'

type AuthStatus = 'booting' | 'loggedOut' | 'authenticating' | 'loggedIn'

interface AuthState {
  status: AuthStatus
  session: PlayerSession | null
  error: string | null
  restore: () => Promise<void>
  login: () => Promise<void>
  logout: () => Promise<void>
  /** Skin/pelerin değişince hesap store'u güncel oturumu buraya yazar. */
  setSession: (session: PlayerSession) => void
}

export const useAuthStore = create<AuthState>((set, get) => ({
  status: 'booting',
  session: null,
  error: null,

  restore: async () => {
    if (get().status !== 'booting') return
    // Preload köprüsü yüklenemediyse sonsuz açılış ekranı yerine giriş ekranına düş.
    if (!window.launcher) {
      set({ status: 'loggedOut' })
      return
    }
    const result = await window.launcher.auth.restore()
    if (result.ok) {
      set({ status: 'loggedIn', session: result.session, error: null })
    } else {
      set({ status: 'loggedOut' })
    }
  },

  login: async () => {
    if (get().status === 'authenticating') return
    set({ status: 'authenticating', error: null })
    const result = await window.launcher.auth.login()
    if (result.ok) {
      set({ status: 'loggedIn', session: result.session, error: null })
    } else {
      // Kullanıcı pencereyi kendisi kapattıysa hata mesajı göstermeye gerek yok.
      set({ status: 'loggedOut', error: result.cancelled ? null : result.error })
    }
  },

  logout: async () => {
    await window.launcher.auth.logout()
    set({ status: 'loggedOut', session: null, error: null })
    // Yeniden giriş yapıldığında launcher ana sekmede açılsın.
    useUiStore.getState().setTab('home')
  },

  setSession: (session) => set({ session })
}))
