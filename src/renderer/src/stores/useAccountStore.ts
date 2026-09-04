import { create } from 'zustand'
import type { AccountResult, AccountSnapshot } from '../../../shared/types'
import { useAuthStore } from './useAuthStore'
import { useUiStore } from './useUiStore'

/** Aynı anda tek bir hesap işlemi çalışsın diye hangi işin sürdüğünü tutar. */
type BusyKind = null | 'loading' | 'adding' | 'applying' | 'removing' | 'resetting' | 'cape'

interface AccountState {
  account: AccountSnapshot | null
  busy: BusyKind
  /** İşlemin uygulandığı öğe (skin/pelerin) — kartın üstünde spinner göstermek için. */
  busyId: string | null
  error: string | null
  loaded: boolean
  load: (force?: boolean) => Promise<void>
  /** Çıkış yapıldığında önceki hesabın verisi ekranda kalmasın. */
  reset: () => void
  addSkin: () => Promise<void>
  removeSkin: (id: string) => Promise<void>
  applySkin: (id: string, variant: 'classic' | 'slim') => Promise<void>
  resetSkin: () => Promise<void>
  setCape: (capeId: string | null) => Promise<void>
}

export const useAccountStore = create<AccountState>((set, get) => {
  /** Tüm hesap çağrıları aynı sonucu döndürür: başarıda oturum bilgisini de tazeleriz. */
  const run = async (
    kind: Exclude<BusyKind, null>,
    busyId: string | null,
    call: () => Promise<AccountResult>,
    successMessage?: string
  ): Promise<void> => {
    if (get().busy) return
    set({ busy: kind, busyId, error: null })
    try {
      const result = await call()
      if (result.ok) {
        set({ account: result.account, loaded: true })
        useAuthStore.getState().setSession(result.account.session)
        if (successMessage) useUiStore.getState().showToast(successMessage, 'success')
      } else if (!result.cancelled) {
        set({ error: result.error })
        useUiStore.getState().showToast(result.error, 'error')
      }
    } finally {
      set({ busy: null, busyId: null })
    }
  }

  return {
    account: null,
    busy: null,
    busyId: null,
    error: null,
    loaded: false,

    reset: () => set({ account: null, busy: null, busyId: null, error: null, loaded: false }),

    load: async (force = false) => {
      if (get().loaded && !force) return
      await run('loading', null, () => window.launcher.account.get())
    },

    addSkin: () =>
      run('adding', null, () => window.launcher.account.addSkin(), 'Skin kütüphaneye eklendi.'),

    removeSkin: (id) =>
      run('removing', id, () => window.launcher.account.removeSkin(id), 'Skin kaldırıldı.'),

    applySkin: (id, variant) =>
      run(
        'applying',
        id,
        () => window.launcher.account.applySkin(id, variant),
        'Skin hesabına uygulandı.'
      ),

    resetSkin: () =>
      run(
        'resetting',
        null,
        () => window.launcher.account.resetSkin(),
        'Varsayılan skine dönüldü.'
      ),

    setCape: (capeId) =>
      run(
        'cape',
        capeId,
        () => window.launcher.account.setCape(capeId),
        capeId ? 'Pelerin değiştirildi.' : 'Pelerin gizlendi.'
      )
  }
})
