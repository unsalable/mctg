import { existsSync } from 'fs'
import { mkdir, readdir, writeFile } from 'fs/promises'
import { join } from 'path'
import { request } from 'undici'
import type { GameProgress } from '../../shared/types'
import { downloadDispatcher } from './downloader'

type ProgressSink = (progress: GameProgress) => void

interface LoaderInfo {
  loader: { version: string; stable?: boolean }
}

/**
 * Fabric Loader otomasyonu: seçili Minecraft sürümü için en yeni kararlı
 * loader'ı Fabric meta API'sinden bulur, hazır sürüm profilini (version json)
 * game/versions altına yazar. Kütüphaneleri GameService indirir.
 */
class FabricService {
  /** Fabric sürümünü kurar (gerekirse) ve başlatılacak sürüm kimliğini döndürür. */
  async ensureFabric(gameRoot: string, mcVersion: string, send: ProgressSink): Promise<string> {
    send({ phase: 'downloading', label: 'Fabric yükleyici hazırlanıyor…', percent: null })

    let loaderVersion: string
    try {
      const loaders = (await this.fetchJson(
        `https://meta.fabricmc.net/v2/versions/loader/${encodeURIComponent(mcVersion)}`
      )) as LoaderInfo[]
      if (!Array.isArray(loaders) || loaders.length === 0) {
        throw new Error(`Fabric, Minecraft ${mcVersion} için henüz yayınlanmamış.`)
      }
      loaderVersion = (loaders.find((l) => l.loader?.stable) ?? loaders[0]).loader.version
    } catch (err) {
      // Çevrimdışıysak daha önce kurulmuş bir Fabric sürümüyle devam et.
      const existing = await this.findInstalled(gameRoot, mcVersion)
      if (existing) {
        console.warn('[fabric] meta API erişilemedi, kurulu sürüm kullanılıyor:', existing)
        return existing
      }
      throw err
    }

    const versionId = `fabric-loader-${loaderVersion}-${mcVersion}`
    const versionDir = join(gameRoot, 'versions', versionId)
    const jsonPath = join(versionDir, `${versionId}.json`)

    if (!existsSync(jsonPath)) {
      const profile = await this.fetchJson(
        `https://meta.fabricmc.net/v2/versions/loader/${encodeURIComponent(mcVersion)}/${encodeURIComponent(loaderVersion)}/profile/json`
      )
      await mkdir(versionDir, { recursive: true })
      await writeFile(jsonPath, JSON.stringify(profile, null, 2))
      console.log(`[fabric] sürüm profili yazıldı: ${versionId}`)
    }

    return versionId
  }

  private async findInstalled(gameRoot: string, mcVersion: string): Promise<string | null> {
    try {
      const versions = await readdir(join(gameRoot, 'versions'))
      const matches = versions
        .filter((v) => v.startsWith('fabric-loader-') && v.endsWith(`-${mcVersion}`))
        .filter((v) => existsSync(join(gameRoot, 'versions', v, `${v}.json`)))
        .sort()
      return matches.at(-1) ?? null
    } catch {
      return null
    }
  }

  private async fetchJson(url: string): Promise<unknown> {
    const response = await request(url, {
      dispatcher: downloadDispatcher,
      headers: { 'user-agent': 'mctg-launcher' }
    })
    if (response.statusCode !== 200) {
      throw new Error(`Fabric meta isteği başarısız (HTTP ${response.statusCode}).`)
    }
    return response.body.json()
  }
}

export const fabricService = new FabricService()
