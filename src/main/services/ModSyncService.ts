import { download } from '@xmcl/file-transfer'
import { createHash } from 'crypto'
import { createReadStream } from 'fs'
import { mkdir, readdir, rm, stat } from 'fs/promises'
import { dirname, join, relative, sep } from 'path'
import type { GameProgress } from '../../shared/types'
import { downloadDispatcher } from './downloader'
import { profileService, type ManifestEntry } from './ProfileService'

type ProgressSink = (progress: GameProgress) => void

/**
 * Anti-hile mod senkronizasyonu: instance'ın mods klasörü, GitHub'daki profil
 * klasörünün birebir aynası olmaya zorlanır. Karşılaştırma Git'in kendi blob
 * hash'iyle yapılır (sha1("blob <boyut>\0" + içerik)) — böylece repoya yüklenen
 * dosyaların hash'i GitHub API'sinden hazır gelir, manifest üretmek gerekmez.
 * Listede olmayan veya içeriği değiştirilmiş her dosya silinir; eksikler
 * indirilir ve indirme sonrası hash doğrulanır.
 */
class ModSyncService {
  async sync(profileId: string, instanceDir: string, send: ProgressSink): Promise<void> {
    send({ phase: 'mods', label: 'Mod listesi GitHub’dan alınıyor…', percent: null })
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
      if (entry && (await this.matches(absolute, entry.gitSha))) {
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
        if (await this.matches(absolute, entry.gitSha)) continue
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
        validator: {
          validate: async (file) => {
            const actual = await this.gitBlobSha1(file)
            if (actual !== entry.gitSha) {
              throw new Error(`İndirilen dosya doğrulanamadı: ${entry.path}`)
            }
          }
        }
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

  /** Git blob hash'i: sha1("blob <boyut>\0" + içerik). GitHub'ın tree API'sindeki sha ile birebir aynıdır. */
  private async gitBlobSha1(file: string): Promise<string> {
    const { size } = await stat(file)
    return new Promise((resolve, reject) => {
      const hash = createHash('sha1')
      hash.update(`blob ${size}\0`)
      const stream = createReadStream(file)
      stream.on('data', (chunk) => hash.update(chunk))
      stream.on('error', reject)
      stream.on('end', () => resolve(hash.digest('hex').toLowerCase()))
    })
  }

  private async matches(file: string, expectedGitSha: string): Promise<boolean> {
    try {
      return (await this.gitBlobSha1(file)) === expectedGitSha
    } catch {
      return false
    }
  }
}

export const modSyncService = new ModSyncService()
