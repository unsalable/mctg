import { VANILLA_PROFILE, VANILLA_PROFILE_ID } from '../../../shared/constants'
import type {
  GameExitInfo,
  GameProgress,
  LauncherApi,
  LauncherSettings,
  PlayerSession
} from '../../../shared/types'

/**
 * Yalnızca geliştirme sırasında, sayfa Electron dışında (tarayıcıda) açıldığında
 * kurulan sahte köprü. UI'ın tamamının Electron olmadan da gezilebilmesini sağlar.
 * Electron içinde preload gerçek `window.launcher`ı sağladığı için hiç devreye girmez.
 */
export function installBrowserMock(): void {
  const settings: LauncherSettings = {
    ramGb: 4,
    modRepo: 'ornek/mod-repo',
    selectedProfileId: VANILLA_PROFILE_ID
  }
  const progressListeners = new Set<(progress: GameProgress) => void>()
  const exitListeners = new Set<(info: GameExitInfo) => void>()

  const session: PlayerSession = {
    name: 'TestOyuncu',
    uuid: '00000000-0000-0000-0000-000000000000',
    skinUrl: null,
    skinDataUrl: null,
    skinVariant: 'classic'
  }

  const mock: LauncherApi = {
    windowControls: {
      minimize: () => {},
      close: () => {}
    },
    auth: {
      restore: async () => ({ ok: false, error: 'NO_SESSION', cancelled: true }),
      login: async () => {
        await new Promise((resolve) => setTimeout(resolve, 700))
        return { ok: true, session }
      },
      logout: async () => {}
    },
    settings: {
      get: async () => ({ settings: { ...settings }, systemRamGb: 16 }),
      set: async (patch) => {
        Object.assign(settings, patch)
        return { ...settings }
      }
    },
    game: {
      play: async () => {
        const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms))
        const emit = (p: GameProgress): void => progressListeners.forEach((l) => l(p))
        emit({ phase: 'resolving', label: 'Sürüm bilgileri alınıyor…', percent: null })
        await sleep(500)
        for (let i = 0; i <= 100; i += 4) {
          emit({ phase: 'downloading', label: 'Oyun dosyaları indiriliyor…', percent: i })
          await sleep(40)
        }
        if (settings.selectedProfileId !== VANILLA_PROFILE_ID) {
          emit({ phase: 'mods', label: 'Mod dosyaları denetleniyor…', percent: null })
          await sleep(500)
          for (let i = 0; i <= 100; i += 10) {
            emit({ phase: 'mods', label: 'Modlar indiriliyor… (3/7)', percent: i })
            await sleep(60)
          }
        }
        emit({ phase: 'java', label: 'Java doğrulanıyor…', percent: null })
        await sleep(500)
        emit({ phase: 'launching', label: 'Oyun başlatılıyor…', percent: null })
        await sleep(700)
        // 4 saniyelik sahte oyun oturumu sonrası çıkış olayı
        setTimeout(() => exitListeners.forEach((l) => l({ code: 0 })), 4000)
        return { ok: true }
      },
      onProgress: (callback) => {
        progressListeners.add(callback)
        return () => progressListeners.delete(callback)
      },
      onExit: (callback) => {
        exitListeners.add(callback)
        return () => exitListeners.delete(callback)
      }
    },
    profiles: {
      list: async () => {
        await new Promise((resolve) => setTimeout(resolve, 300))
        return {
          profiles: [
            VANILLA_PROFILE,
            {
              id: 'sunucu',
              name: 'Sunucu Paketi',
              description: 'Sunucunun zorunlu modları',
              mcVersion: '26.2',
              loader: 'fabric'
            },
            {
              id: 'arkadaslar',
              name: 'Arkadaş Paketi',
              description: 'Ek görsel modlar',
              mcVersion: '26.1.2',
              loader: 'fabric'
            }
          ],
          repo: 'ornek/mod-repo',
          error: null
        }
      }
    }
  }

  window.launcher = mock
  console.info('[MCTG] Tarayıcı önizlemesi: sahte launcher köprüsü aktif (Electron dışı).')
}
