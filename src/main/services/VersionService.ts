import { getVersionList } from '@xmcl/installer'
import type { MinecraftVersion, VersionsSnapshot } from '../../shared/types'
import { store } from './storage'

const CACHE_KEY = 'versionListCache'
const MEMORY_TTL_MS = 5 * 60_000

interface CachedList {
  versions: MinecraftVersion[]
  latestRelease: string | null
  latestSnapshot: string | null
}

/**
 * Mojang sürüm manifestini okur ve UI'ın sürüm seçicisine besler.
 * Ağ yoksa en son başarılı liste diskteki önbellekten döner; böylece
 * çevrimdışıyken de daha önce kurulmuş bir sürüm seçilebilir.
 */
class VersionService {
  private memory: { fetchedAt: number; data: CachedList } | null = null

  async list(): Promise<VersionsSnapshot> {
    if (this.memory && Date.now() - this.memory.fetchedAt < MEMORY_TTL_MS) {
      return { ...this.memory.data, error: null }
    }

    try {
      const manifest = await getVersionList()
      const data: CachedList = {
        versions: manifest.versions.map((v) => ({
          id: v.id,
          type: v.type,
          releaseTime: v.releaseTime
        })),
        latestRelease: manifest.latest?.release ?? null,
        latestSnapshot: manifest.latest?.snapshot ?? null
      }
      this.memory = { fetchedAt: Date.now(), data }
      store.set(CACHE_KEY, data)
      return { ...data, error: null }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      const cached = store.get<CachedList | null>(CACHE_KEY, null)
      if (cached && Array.isArray(cached.versions) && cached.versions.length > 0) {
        console.warn('[versions] manifest alınamadı, önbellek kullanılıyor:', message)
        return { ...cached, error: 'Sürüm listesi güncellenemedi; kayıtlı liste gösteriliyor.' }
      }
      console.error('[versions] manifest hatası:', message)
      return {
        versions: [],
        latestRelease: null,
        latestSnapshot: null,
        error: 'Sürüm listesi alınamadı. İnternet bağlantını kontrol et.'
      }
    }
  }

  /** Seçili sürüm gerçekten var mı? Yalnızca uyarı üretmek için kullanılır. */
  async exists(versionId: string): Promise<boolean> {
    const snapshot = await this.list()
    return snapshot.versions.some((v) => v.id === versionId)
  }
}

export const versionService = new VersionService()
