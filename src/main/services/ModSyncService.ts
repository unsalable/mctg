import { download } from '@xmcl/file-transfer'
import { createHash } from 'crypto'
import { createReadStream } from 'fs'
import { mkdir, readdir, rm } from 'fs/promises'
import { dirname, join, relative, sep } from 'path'
import type { GameProgress } from '../../shared/types'
import { downloadDispatcher } from './downloader'
import { profileService, type ManifestEntry } from './ProfileService'
import { siteService } from './SiteService'

type ProgressSink = (progress: GameProgress) => void

/**
 * Mod senkronizasyonu: instance'ın mods klasörü, sitedeki profilin birebir
 * aynası olmaya zorlanır. Karşılaştırma dosyanın sha256'sıyla yapılır — bu
 * aynı zamanda dosyanın sitedeki kimliği (indirme adresi de ondan üretiliyor),
 * yani manifest ayrı bir hash alanı taşımıyor. Listede olmayan veya içeriği
 * değiştirilmiş her dosya silinir; eksikler indirilir ve indirme sonrası hash
 * doğrulanır.
 *
 * Not: bu bir bütünlük özelliği, güvenlik sınırı değil — kararlı bir oyuncu
 * başka bir launcher çalıştırır. Hileyi sunucudan uzak tutmak sunucu tarafı
 * bir eklentinin işi.
 */
class ModSyncService {
  async sync(profileId: string, instanceDir: string, send: ProgressSink): Promise<void> {
    const token = siteService.accessToken
    if (!token) throw new Error('Site oturumu bulunamadı. Çıkış yapıp yeniden giriş yap.')

    send({ phase: 'mods', label: 'Mod listesi siteden alınıyor…', percent: null })
    const entries = await profileService.getManifest(profileId)
    const byPath = new Map(entries.map((e) => [e.path, e] as const))

    const modsDir = join(instanceDir, 'mods')
    await mkdir(modsDir, { recursive: true })

    send({ phase: 'mods', label: 'Mod dosyaları denetleniyor…', percent: null })
    const localModFiles = await this.walk(modsDir)
    const validPaths = new Set<string>()
    let removedCount = 0

    for (const absolute of localModFiles) {
      const relPath = 'mods/' + relative(modsDir, absolute).split(sep).join('/')
      const entry = byPath.get(relPath)
      if (entry && (await this.matches(absolute, entry.sha256))) {
        validPaths.add(relPath)
      } else {
        await rm(absolute, { force: true })
        removedCount++
      }
    }
    if (removedCount > 0) {
      console.log(`[mods] ${removedCount} yabancı/değiştirilmiş dosya kaldırıldı`)
    }

    // mods/ dışındaki dosyalar (config vb.) silinmez ama eksik/bozuksa tamamlanır.
    const toDownload: ManifestEntry[] = []
    for (const entry of entries) {
      if (validPaths.has(entry.path)) continue
      if (!entry.path.startsWith('mods/')) {
        const absolute = join(instanceDir, ...entry.path.split('/'))
        if (await this.matches(absolute, entry.sha256)) continue
      }
      toDownload.push(entry)
    }

    const totalBytes = Math.max(
      toDownload.reduce((sum, e) => sum + e.size, 0),
      1
    )
    let downloadedBytes = 0

    for (let i = 0; i < toDownload.length; i++) {
      const entry = toDownload[i]
      send({
        phase: 'mods',
        label: `Modlar indiriliyor… (${i + 1}/${toDownload.length})`,
        percent: (downloadedBytes / totalBytes) * 100
      })
      const destination = join(instanceDir, ...entry.path.split('/'))
      await mkdir(dirname(destination), { recursive: true })
      await download({
        url: entry.url,
        destination,
        dispatcher: downloadDispatcher,
        // Dosya ucu kimlik istiyor; adres ProfileService'te YEREL üretiliyor.
        headers: { authorization: `Bearer ${token}` },
        // sha256 standart bir algoritma; yerleşik doğrulayıcı yeterli.
        validator: { algorithm: 'sha256', hash: entry.sha256 },
        // Yarıda kalan indirme diskteki geçerli dosyayı sıfırlamasın.
        pendingFile: `${destination}.part`,
        expectedTotal: entry.size
      })
      downloadedBytes += entry.size
    }

    console.log(`[mods] senkron tamam: ${toDownload.length} indirildi, ${removedCount} kaldırıldı`)
    send({ phase: 'mods', label: 'Modlar eşitlendi', percent: 100 })
  }

  /** Klasördeki tüm dosyaları (alt klasörler dahil) mutlak yol olarak döndürür. */
  private async walk(dir: string): Promise<string[]> {
    const result: string[] = []
    let items
    try {
      items = await readdir(dir, { withFileTypes: true })
    } catch {
      return result
    }
    for (const item of items) {
      const full = join(dir, item.name)
      if (item.isDirectory()) {
        result.push(...(await this.walk(full)))
      } else if (item.isFile()) {
        result.push(full)
      }
    }
    return result
  }

  /** Dosyanın sha256'sı — manifestteki kimlikle birebir karşılaştırılır. */
  private async sha256File(file: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = createHash('sha256')
      const stream = createReadStream(file)
      stream.on('data', (chunk) => hash.update(chunk))
      stream.on('error', reject)
      stream.on('end', () => resolve(hash.digest('hex').toLowerCase()))
    })
  }

  private async matches(file: string, expected: string): Promise<boolean> {
    try {
      return (await this.sha256File(file)) === expected
    } catch {
      return false
    }
  }
}

export const modSyncService = new ModSyncService()
