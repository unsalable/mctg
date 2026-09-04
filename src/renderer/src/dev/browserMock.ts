import {
  MC_SERVER_HOST,
  MC_SERVER_PORT,
  VANILLA_PROFILE,
  VANILLA_PROFILE_ID
} from '../../../shared/constants'
import type {
  AccountSnapshot,
  GameExitInfo,
  GameProgress,
  LauncherApi,
  LauncherConfig,
  LauncherSettings,
  MinecraftVersion,
  PlayerSession,
  ServerStatus,
  SiteUser,
  SkinLibraryItem
} from '../../../shared/types'

/** Tarayıcı önizlemesi için geçerli ölçülerde (64x64) sahte bir skin dokusu üretir. */
function makeSkinDataUrl(skinColor: string, shirtColor: string): string {
  const canvas = document.createElement('canvas')
  canvas.width = 64
  canvas.height = 64
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''
  ctx.fillStyle = skinColor
  ctx.fillRect(0, 0, 64, 64)
  ctx.fillStyle = shirtColor
  ctx.fillRect(16, 16, 24, 16)
  ctx.fillStyle = '#00000022'
  ctx.fillRect(8, 8, 8, 8)
  return canvas.toDataURL('image/png')
}

/**
 * Yalnızca geliştirme sırasında, sayfa Electron dışında (tarayıcıda) açıldığında
 * kurulan sahte köprü. UI'ın tamamının Electron olmadan da gezilebilmesini sağlar.
 * Electron içinde preload gerçek `window.launcher`ı sağladığı için hiç devreye girmez.
 */
export function installBrowserMock(): void {
  const settings: LauncherSettings = {
    ramGb: 4,
    selectedProfileId: VANILLA_PROFILE_ID,
    theme: 'light'
  }
  const progressListeners = new Set<(progress: GameProgress) => void>()
  const exitListeners = new Set<(info: GameExitInfo) => void>()
  const serverListeners = new Set<(status: ServerStatus) => void>()

  // Önizlemede yönetici olarak giriliyor ki sürüm seçici de gezilebilsin.
  const siteUser: SiteUser = {
    id: 'mock-user',
    email: 'test@mctg.com.tr',
    username: 'TestÜye',
    status: 'approved',
    isAdmin: true,
    superAdmin: false
  }

  const launcherConfig: LauncherConfig = {
    mcVersion: '26.2',
    updatedAt: Date.now() - 3_600_000,
    updatedBy: 'TestÜye',
    server: { host: MC_SERVER_HOST, port: MC_SERVER_PORT },
    supportedVersions: ['26.2', '26.1.2'],
    canEdit: true,
    warning: null
  }

  const serverStatus: ServerStatus = {
    host: MC_SERVER_HOST,
    port: MC_SERVER_PORT,
    online: true,
    players: { online: 12, max: 60 },
    version: 'Paper 1.20.1',
    motd: 'MCTG Sunucusu',
    latencyMs: 34,
    error: null,
    attempts: 0,
    retryInMs: null,
    checking: false
  }

  const session: PlayerSession = {
    name: 'TestOyuncu',
    uuid: '00000000-0000-0000-0000-000000000000',
    skinUrl: null,
    skinDataUrl: makeSkinDataUrl('#c68642', '#2f6fed'),
    skinVariant: 'classic',
    capeDataUrl: null
  }

  const library: SkinLibraryItem[] = [
    {
      id: 'mock-skin-1',
      name: 'Mavi Tulum',
      variant: 'classic',
      imageDataUrl: makeSkinDataUrl('#c68642', '#2f6fed'),
      addedAt: Date.now() - 86_400_000,
      active: true
    },
    {
      id: 'mock-skin-2',
      name: 'Kırmızı Ceket',
      variant: 'slim',
      imageDataUrl: makeSkinDataUrl('#e0ac69', '#d64545'),
      addedAt: Date.now() - 3_600_000,
      active: false
    }
  ]

  const account: AccountSnapshot = { session, capes: [], library }

  const versions: MinecraftVersion[] = [
    { id: '26.2', type: 'release', releaseTime: '2026-04-02T10:00:00+00:00' },
    { id: '26.1.2', type: 'release', releaseTime: '2026-02-18T10:00:00+00:00' },
    { id: '26.1', type: 'release', releaseTime: '2026-01-20T10:00:00+00:00' },
    { id: '25.4.1', type: 'release', releaseTime: '2025-11-04T10:00:00+00:00' },
    { id: '26w14a', type: 'snapshot', releaseTime: '2026-04-08T10:00:00+00:00' },
    { id: 'b1.7.3', type: 'old_beta', releaseTime: '2011-07-08T10:00:00+00:00' }
  ]

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
              loader: 'fabric',
              official: true,
              mine: false
            },
            {
              id: 'arkadaslar',
              name: 'Arkadaş Paketi',
              description: 'Ek görsel modlar',
              mcVersion: '26.1.2',
              loader: 'fabric',
              official: false,
              mine: true
            }
          ],
          error: null
        }
      }
    },
    versions: {
      list: async () => {
        await new Promise((resolve) => setTimeout(resolve, 250))
        return {
          versions,
          latestRelease: '26.2',
          latestSnapshot: '26w14a',
          error: null
        }
      }
    },
    site: {
      restore: async () => ({ ok: false, error: 'NO_SESSION', code: 'no_session' }),
      login: async (email) => {
        await new Promise((resolve) => setTimeout(resolve, 500))
        return { ok: true, user: { ...siteUser, email: email || siteUser.email } }
      },
      logout: async () => {},
      config: async () => {
        await new Promise((resolve) => setTimeout(resolve, 200))
        return { ok: true, config: { ...launcherConfig } }
      },
      setVersion: async (versionId) => {
        launcherConfig.mcVersion = versionId
        launcherConfig.updatedAt = Date.now()
        launcherConfig.updatedBy = siteUser.username
        return { ok: true, config: { ...launcherConfig } }
      }
    },
    server: {
      status: async () => ({ ...serverStatus }),
      retry: async () => {
        await new Promise((resolve) => setTimeout(resolve, 400))
        serverListeners.forEach((listener) => listener({ ...serverStatus }))
        return { ...serverStatus }
      },
      onStatus: (callback) => {
        serverListeners.add(callback)
        return () => serverListeners.delete(callback)
      }
    },
    account: {
      get: async () => {
        await new Promise((resolve) => setTimeout(resolve, 250))
        return { ok: true, account }
      },
      addSkin: async () => ({ ok: false, error: 'Tarayıcı önizlemesinde dosya seçilemez.' }),
      removeSkin: async (id) => {
        account.library = account.library.filter((item) => item.id !== id)
        return { ok: true, account }
      },
      applySkin: async (id, variant) => {
        account.library = account.library.map((item) => ({
          ...item,
          variant: item.id === id ? variant : item.variant,
          active: item.id === id
        }))
        const applied = account.library.find((item) => item.id === id)
        if (applied) {
          account.session = {
            ...account.session,
            skinDataUrl: applied.imageDataUrl,
            skinVariant: variant
          }
        }
        return { ok: true, account }
      },
      resetSkin: async () => {
        account.library = account.library.map((item) => ({ ...item, active: false }))
        return { ok: true, account }
      },
      setCape: async () => ({ ok: true, account })
    }
  }

  window.launcher = mock
  console.info('[MCTG] Tarayıcı önizlemesi: sahte launcher köprüsü aktif (Electron dışı).')
}
