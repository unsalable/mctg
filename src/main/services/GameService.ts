import { launch, Version, type ResolvedVersion } from '@xmcl/core'
import { getVersionList, installLibrariesTask, installTask } from '@xmcl/installer'
import { app, BrowserWindow } from 'electron'
import { mkdirSync } from 'fs'
import { join } from 'path'
import { DEFAULT_MC_VERSION, VANILLA_PROFILE_ID } from '../../shared/constants'
import type { GameProgress, PlayResult } from '../../shared/types'
import { authService } from './AuthService'
import { downloadDispatcher } from './downloader'
import { fabricService } from './FabricService'
import { javaService } from './JavaService'
import { modSyncService } from './ModSyncService'
import { profileService } from './ProfileService'
import { settingsService } from './SettingsService'
import { siteService } from './SiteService'

class GameService {
  private playing = false
  private lastSentAt = 0
  private lastLabel = ''

  /** Paylaşılan .minecraft kökü: versions / libraries / assets. */
  private get gameRoot(): string {
    return join(app.getPath('userData'), 'game')
  }

  /** Profil bazlı oyun dizini (saves, options.txt, mods…) — profiller birbirine karışmaz. */
  private instanceDir(profileId: string): string {
    return join(app.getPath('userData'), 'instances', profileId)
  }

  async play(win: BrowserWindow): Promise<PlayResult> {
    if (this.playing) return { ok: false, error: 'Oyun zaten başlatılıyor.' }
    this.playing = true

    const send = (progress: GameProgress): void => this.sendProgress(win, progress)

    try {
      console.log('[game] OYNA akışı başladı')
      send({ phase: 'resolving', label: 'Oturum doğrulanıyor…', percent: null })
      const minecraft = await authService.ensureMinecraft()
      const account = minecraft.profile
      if (!account) throw new Error('Minecraft profili bulunamadı.')
      console.log(`[game] oturum geçerli: ${account.name}`)

      const { ramGb, selectedProfileId } = settingsService.get()
      const modProfile = await profileService.getProfile(selectedProfileId)
      // Sürümü yönetici siteden belirler; oyuncu değiştiremez. Site hiç
      // okunamadıysa (ilk açılış + ağ yok) profilin kendi sürümüne düşülür.
      const enforcedVersion = await siteService.enforcedVersion()
      const mcVersion = enforcedVersion || modProfile.mcVersion || DEFAULT_MC_VERSION
      const versionSource = enforcedVersion
        ? 'sunucu sürümü'
        : modProfile.mcVersion
          ? 'profil sürümü — sunucuya ulaşılamadı'
          : 'son çare sürüm — sunucuya ulaşılamadı, profil de sürüm bildirmiyor'
      const instanceDir = this.instanceDir(modProfile.id)
      console.log(
        `[game] profil: ${modProfile.name} (${modProfile.id}) / Minecraft ${mcVersion} (${versionSource})`
      )

      send({ phase: 'resolving', label: 'Sürüm bilgileri alınıyor…', percent: null })
      const versionList = await getVersionList()
      const versionMeta = versionList.versions.find((v) => v.id === mcVersion)
      if (!versionMeta) {
        throw new Error(
          enforcedVersion
            ? `Sunucunun belirlediği Minecraft ${mcVersion} sürümü Mojang manifestinde bulunamadı. Yöneticiye bildir.`
            : modProfile.mcVersion
              ? `"${modProfile.name}" profilinin istediği Minecraft ${mcVersion} sürümü Mojang manifestinde bulunamadı.`
              : `Minecraft ${mcVersion} sürümü Mojang manifestinde bulunamadı.`
        )
      }

      mkdirSync(this.gameRoot, { recursive: true })
      mkdirSync(instanceDir, { recursive: true })

      // Sürüm json/jar + kütüphaneler + asset'ler; mevcut dosyalar checksum ile doğrulanır,
      // eksik/bozuk olanlar indirilir. İkinci çalıştırmadan itibaren hızlıdır.
      const installer = installTask(versionMeta, this.gameRoot, {
        dispatcher: downloadDispatcher
      })
      let resolved = await installer.startAndWait({
        onUpdate: () => {
          const percent = installer.total > 0 ? (installer.progress / installer.total) * 100 : null
          send({ phase: 'downloading', label: 'Oyun dosyaları indiriliyor…', percent })
        }
      })

      // Fabric profilleri: loader sürüm profili kurulur, Fabric kütüphaneleri indirilir
      // ve oyun vanilla yerine fabric-loader sürümüyle başlatılır.
      if (modProfile.loader === 'fabric') {
        const fabricId = await fabricService.ensureFabric(this.gameRoot, mcVersion, send)
        resolved = await Version.parse(this.gameRoot, fabricId)
        const libraryTask = installLibrariesTask(resolved, { dispatcher: downloadDispatcher })
        await libraryTask.startAndWait({
          onUpdate: () => {
            const percent =
              libraryTask.total > 0 ? (libraryTask.progress / libraryTask.total) * 100 : null
            send({ phase: 'downloading', label: 'Fabric bileşenleri indiriliyor…', percent })
          }
        })
        console.log(`[game] fabric hazır: ${fabricId}`)
      }

      console.log(
        `[game] oyun dosyaları hazır (Java gereksinimi: ${resolved.javaVersion.component} / ${resolved.javaVersion.majorVersion})`
      )

      // Anti-hile: mods klasörü, oyun her başlatılışta repodaki manifestle eşitlenir.
      if (modProfile.id !== VANILLA_PROFILE_ID) {
        await modSyncService.sync(modProfile.id, instanceDir, send)
      }

      const javaPath = await javaService.ensureJava(resolved.javaVersion, send)
      console.log(`[game] java: ${javaPath}`)

      send({ phase: 'launching', label: 'Oyun başlatılıyor…', percent: null })
      const maxMemory = ramGb * 1024
      console.log(`[game] başlatılıyor (RAM: ${ramGb} GB)`)

      // Oyun sunucu listesine değil, doğrudan MCTG sunucusuna girer.
      // 1.20+ bunu --quickPlayMultiplayer ile yapar; eski sürümler --server/--port.
      const server = await siteService.serverAddress()
      const quickPlay = this.supportsQuickPlay(resolved)
      console.log(
        `[game] otomatik bağlantı: ${server.host}:${server.port} (${quickPlay ? 'quickPlay' : '--server'})`
      )

      const gameProcess = await launch({
        gamePath: instanceDir,
        resourcePath: this.gameRoot,
        javaPath,
        version: resolved,
        gameProfile: { name: account.name, id: account.id },
        accessToken: minecraft.mcToken,
        // Microsoft hesapları için oyun argümanı 'msa' olmalı; tip tanımı henüz eski.
        userType: 'msa' as 'mojang',
        minMemory: Math.min(2048, maxMemory),
        maxMemory,
        launcherName: 'MCTGLauncher',
        ...(quickPlay
          ? { quickPlayMultiplayer: `${server.host}:${server.port}` }
          : { server: { ip: server.host, port: server.port } }),
        // Launcher kapansa bile oyun yaşamaya devam etsin.
        extraExecOption: { detached: true, stdio: 'ignore' }
      })

      console.log(`[game] oyun süreci başladı (pid: ${gameProcess.pid})`)
      send({ phase: 'running', label: 'Oyun çalışıyor', percent: null })
      win.minimize()

      gameProcess.on('exit', (code) => {
        console.log(`[game] oyun kapandı (çıkış kodu: ${code})`)
        this.playing = false
        if (!win.isDestroyed()) {
          win.webContents.send('game:exit', { code })
          win.restore()
          win.focus()
        }
      })

      return { ok: true }
    } catch (err) {
      this.playing = false
      console.error('[game] başlatma hatası:', err)
      return { ok: false, error: this.friendlyMessage(err) }
    }
  }

  /**
   * Sürüm doğrudan sunucuya girmeyi --quickPlayMultiplayer ile destekliyor mu?
   *
   * 1.20'den itibaren sürüm JSON'u bu argümanı `is_quick_play_multiplayer`
   * özelliğine bağlı bir kural olarak taşıyor. Eski sürümlerde argüman hiç
   * tanınmıyor ve oyun açılışta hata veriyor; onlarda --server/--port kalıyor.
   * Fabric profilleri vanilya argümanlarını miras aldığı için ayrım aynı çalışır.
   */
  private supportsQuickPlay(resolved: ResolvedVersion): boolean {
    return (resolved.arguments?.game ?? []).some(
      (argument) =>
        typeof argument === 'object' &&
        argument !== null &&
        (argument.rules ?? []).some((rule) => rule.features?.is_quick_play_multiplayer === true)
    )
  }

  /** UI'ı boğmamak için ilerleme olayları ~120ms aralıkla gönderilir (etiket değişimi hariç). */
  private sendProgress(win: BrowserWindow, progress: GameProgress): void {
    const now = Date.now()
    if (
      progress.label === this.lastLabel &&
      progress.percent !== null &&
      now - this.lastSentAt < 120
    ) {
      return
    }
    this.lastSentAt = now
    this.lastLabel = progress.label
    if (!win.isDestroyed()) {
      win.webContents.send('game:progress', progress)
    }
  }

  private friendlyMessage(err: unknown): string {
    // İndirici tüm dosya hatalarını tek AggregateError içinde toplar.
    if (err instanceof AggregateError) {
      const first = err.errors.find((e): e is Error => e instanceof Error)
      const count = err.errors.length
      if (first && /ConnectTimeout|UND_ERR|ETIMEDOUT|ENOTFOUND|ECONNREFUSED/i.test(String(first))) {
        return `Ağ hatası: ${count} dosya indirilemedi (sunucuya ulaşılamıyor). Tekrar dene; sorun sürerse bağlantını kontrol et.`
      }
      return `İndirme hatası: ${count} dosya doğrulanamadı. Tekrar dene, eksikler otomatik tamamlanır.`
    }
    const message = err instanceof Error ? err.message : String(err)
    if (/ENOTFOUND|ETIMEDOUT|ECONNREFUSED|ConnectTimeout|UND_ERR|fetch failed|network/i.test(message)) {
      return 'Ağ hatası: indirme sunucularına ulaşılamadı. Bağlantını kontrol edip tekrar dene.'
    }
    if (/EPERM|EACCES|EBUSY/i.test(message)) {
      return 'Dosya erişim hatası: başka bir program oyun dosyalarını kilitliyor olabilir.'
    }
    return `Başlatma hatası: ${message}`
  }
}

export const gameService = new GameService()
