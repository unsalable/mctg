import { app, dialog } from 'electron'
import electronUpdater from 'electron-updater'

const { autoUpdater } = electronUpdater

/** Açılıştaki ilk kontrolü pencere yerleşsin diye biraz geciktirir. */
const FIRST_CHECK_DELAY_MS = 4_000
/** Uygulama uzun süre açık kalırsa saatte bir tekrar bakar. */
const RECHECK_MS = 60 * 60_000

/**
 * GitHub Releases üzerinden otomatik güncelleme.
 *
 * Yeni sürüm sessizce indirilir; indirme bittiğinde kullanıcıya "şimdi
 * yeniden başlat" sorulur. Reddederse kurulum, launcher kapanırken yapılır.
 * Paketlenmemiş (npm run dev) çalıştırmalarda tamamen devre dışıdır.
 */
class UpdateService {
  private timer: NodeJS.Timeout | null = null
  private prompting = false

  start(): void {
    if (!app.isPackaged) {
      console.log('[update] geliştirme modunda güncelleme kontrolü atlandı')
      return
    }

    autoUpdater.autoDownload = true
    // Kullanıcı "sonra" derse kurulum kapanışta yapılsın.
    autoUpdater.autoInstallOnAppQuit = true

    autoUpdater.on('checking-for-update', () => console.log('[update] kontrol ediliyor'))
    autoUpdater.on('update-available', (info) =>
      console.log(`[update] yeni sürüm bulundu: ${info.version}`)
    )
    autoUpdater.on('update-not-available', () => console.log('[update] güncel'))
    autoUpdater.on('download-progress', (progress) =>
      console.log(`[update] indiriliyor: %${Math.round(progress.percent)}`)
    )
    autoUpdater.on('update-downloaded', (info) => void this.promptInstall(info.version))
    autoUpdater.on('error', (err) => console.error('[update] hata:', err?.message ?? err))

    setTimeout(() => void this.check(), FIRST_CHECK_DELAY_MS)
    this.timer = setInterval(() => void this.check(), RECHECK_MS)
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer)
    this.timer = null
  }

  private async check(): Promise<void> {
    try {
      await autoUpdater.checkForUpdates()
    } catch (err) {
      // Ağ yoksa sessizce geç; bir sonraki turda yeniden denenir.
      console.error('[update] kontrol başarısız:', err instanceof Error ? err.message : err)
    }
  }

  private async promptInstall(version: string): Promise<void> {
    if (this.prompting) return
    this.prompting = true

    const { response } = await dialog.showMessageBox({
      type: 'info',
      buttons: ['Şimdi yeniden başlat', 'Sonra'],
      defaultId: 0,
      cancelId: 1,
      title: 'Güncelleme hazır',
      message: `MCTG Launcher ${version} indirildi.`,
      detail: 'Kurulum için launcher yeniden başlatılacak. Sonra dersen güncelleme, launcher’ı kapattığında kurulur.'
    })

    this.prompting = false
    if (response === 0) {
      setImmediate(() => autoUpdater.quitAndInstall())
    }
  }
}

export const updateService = new UpdateService()
