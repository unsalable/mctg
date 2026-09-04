import { create } from 'zustand'
import type { MinecraftVersion } from '../../../shared/types'

interface VersionState {
  /**
   * Yalnızca yayınlanmış sürümler.
   *
   * Anlık görüntüler ve eski (beta/alfa) sürümler listeye hiç girmiyor:
   * sunucu bunların hiçbirinde çalışmıyor, yöneticinin yanlışlıkla
   * seçebileceği bir seçenek olarak durmalarının bir faydası yok.
   */
  versions: MinecraftVersion[]
  latestRelease: string | null
  warning: string | null
  loading: boolean
  loaded: boolean
  load: () => Promise<void>
}

export const useVersionStore = create<VersionState>((set, get) => ({
  versions: [],
  latestRelease: null,
  warning: null,
  loading: false,
  loaded: false,

  load: async () => {
    if (get().loading) return
    set({ loading: true })
    try {
      const snapshot = await window.launcher.versions.list()
      set({
        versions: snapshot.versions.filter((version) => version.type === 'release'),
        latestRelease: snapshot.latestRelease,
        warning: snapshot.error,
        loaded: true
      })
    } finally {
      set({ loading: false })
    }
  }
}))
