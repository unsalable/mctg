import { create } from 'zustand'
import type { LauncherConfig, SiteUser } from '../../../shared/types'
import { useUiStore } from './useUiStore'

type SiteStatus = 'booting' | 'loggedOut' | 'authenticating' | 'loggedIn'

interface SiteState {
  status: SiteStatus
  user: SiteUser | null
  error: string | null
  /** Son hatanın sunucu kodu; 'network' ise şifre sorulmadan tekrar denenebilir. */
  errorCode: string | null
  /** Yöneticinin belirlediği sürüm + sunucu adresi. */
  config: LauncherConfig | null
  configError: string | null
  configLoading: boolean
  restore: () => Promise<void>
  /** Ağ hatasından sonra saklanan oturumla tekrar dener — şifre gerekmez. */
  retryRestore: () => Promise<void>
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  loadConfig: () => Promise<void>
  /** Yalnızca yönetici için; sunucu yetkisiz isteği zaten reddeder. */
  setVersion: (versionId: string) => Promise<boolean>
}

/**
 * MCTG site hesabı — launcher'ın ilk kapısı.
 *
 * Microsoft girişi bu adımdan SONRA açılır: site hesabı olmayan (ya da onayı
 * bekleyen) biri Microsoft penceresini hiç görmez. Sürüm bilgisi de burada
 * duruyor çünkü onu belirleyen yine bu hesabın yetkisi.
 */
export const useSiteStore = create<SiteState>((set, get) => ({
  status: 'booting',
  user: null,
  error: null,
  errorCode: null,
  config: null,
  configError: null,
  configLoading: false,

  restore: async () => {
    if (get().status !== 'booting') return
    // Preload köprüsü yüklenemediyse sonsuz açılış ekranı yerine girişe düş.
    if (!window.launcher) {
      set({ status: 'loggedOut' })
      return
    }
    const result = await window.launcher.site.restore()
    if (result.ok) {
      set({ status: 'loggedIn', user: result.user, error: null, errorCode: null })
      void get().loadConfig()
    } else {
      // Kayıtlı oturum yoksa bu bir hata değil, ilk giriş.
      const silent = result.code === 'no_session'
      set({
        status: 'loggedOut',
        error: silent ? null : result.error,
        errorCode: silent ? null : result.code
      })
    }
  },

  retryRestore: async () => {
    if (get().status === 'authenticating') return
    set({ status: 'authenticating', error: null, errorCode: null })
    const result = await window.launcher.site.restore()
    if (result.ok) {
      set({ status: 'loggedIn', user: result.user })
      void get().loadConfig()
    } else {
      const silent = result.code === 'no_session'
      set({
        status: 'loggedOut',
        error: silent ? null : result.error,
        errorCode: silent ? null : result.code
      })
    }
  },

  login: async (email, password) => {
    if (get().status === 'authenticating') return
    set({ status: 'authenticating', error: null, errorCode: null })
    const result = await window.launcher.site.login(email, password)
    if (result.ok) {
      set({ status: 'loggedIn', user: result.user, error: null, errorCode: null })
      void get().loadConfig()
    } else {
      set({ status: 'loggedOut', error: result.error, errorCode: result.code })
    }
  },

  logout: async () => {
    await window.launcher.site.logout()
    set({
      status: 'loggedOut',
      user: null,
      error: null,
      errorCode: null,
      config: null,
      configError: null
    })
    useUiStore.getState().setTab('home')
  },

  loadConfig: async () => {
    if (get().configLoading) return
    set({ configLoading: true })
    try {
      const result = await window.launcher.site.config()
      if (result.ok) {
        set({ config: result.config, configError: null })
      } else {
        set({ configError: result.error })
      }
    } finally {
      set({ configLoading: false })
    }
  },

  setVersion: async (versionId) => {
    const result = await window.launcher.site.setVersion(versionId)
    if (!result.ok) {
      useUiStore.getState().showToast(result.error, 'error')
      return false
    }
    set({ config: result.config, configError: null })
    useUiStore
      .getState()
      .showToast(
        result.config.warning ?? `Sürüm ${result.config.mcVersion} olarak ayarlandı — herkeste geçerli.`,
        result.config.warning ? 'info' : 'success'
      )
    return true
  }
}))
