import { request } from 'undici'
import { DEFAULT_MC_VERSION, VANILLA_PROFILE, VANILLA_PROFILE_ID } from '../../shared/constants'
import type { ModProfile, ProfilesSnapshot } from '../../shared/types'
import { downloadDispatcher } from './downloader'
import { settingsService } from './SettingsService'
import { store } from './storage'

interface RepoRef {
  owner: string
  repo: string
  branch: string
}

interface GitTreeEntry {
  path: string
  type: 'blob' | 'tree' | string
  sha: string
  size?: number
}

export interface ManifestEntry {
  /** Instance köküne göre hedef yol, ör. "mods/sodium.jar" veya "config/foo.toml". */
  path: string
  /** Git'in blob hash'i: sha1("blob <boyut>\0" + içerik). GitHub API'den gelir. */
  gitSha: string
  size: number
  url: string
}

const PROFILE_ID_PATTERN = /^[a-z0-9][a-z0-9-_]{0,63}$/
const TREE_CACHE_KEY = 'repoTreeCache'
const TREE_TTL_MS = 60_000

/** Profil klasörü içinde bu köklerle başlayan yollar olduğu gibi kopyalanır; gerisi mods/ altına gider. */
const KNOWN_INSTANCE_DIRS = new Set(['mods', 'config', 'resourcepacks', 'shaderpacks', 'datapacks'])

/**
 * Sıfır-konfigürasyon mod deposu: repodaki her üst düzey klasör bir profildir,
 * içindeki dosyalar o profilin mod paketidir. Dosya listesi ve hash'ler GitHub
 * tree API'sinden okunur — manifest üretmeye veya commit'lemeye gerek yoktur.
 * İsteğe bağlı bir profiles.json ile ad/açıklama/sürüm/loader özelleştirilebilir.
 */
class ProfileService {
  private treeCache: { key: string; fetchedAt: number; entries: GitTreeEntry[] } | null = null

  /** "kullanici/repo", "kullanici/repo@dal" veya github.com URL'sini çözümler. */
  parseRepo(input: string): RepoRef | null {
    const trimmed = input.trim()
    if (!trimmed) return null

    const urlMatch = trimmed.match(
      /^https?:\/\/github\.com\/([^/\s]+)\/([^/\s]+?)(?:\.git)?(?:\/tree\/([^/\s]+))?\/?$/i
    )
    if (urlMatch) {
      return { owner: urlMatch[1], repo: urlMatch[2], branch: urlMatch[3] ?? 'main' }
    }

    let rest = trimmed
    let branch = 'main'
    const atIndex = rest.lastIndexOf('@')
    if (atIndex > 0) {
      branch = rest.slice(atIndex + 1) || 'main'
      rest = rest.slice(0, atIndex)
    }
    const parts = rest.split('/')
    if (parts.length === 2 && parts[0] && parts[1]) {
      return { owner: parts[0], repo: parts[1], branch }
    }
    return null
  }

  private currentRepo(): RepoRef | null {
    return this.parseRepo(settingsService.get().modRepo)
  }

  private rawUrl(ref: RepoRef, path: string): string {
    const encoded = path.split('/').map(encodeURIComponent).join('/')
    return `https://raw.githubusercontent.com/${ref.owner}/${ref.repo}/${encodeURIComponent(ref.branch)}/${encoded}`
  }

  private async fetchJson(url: string): Promise<unknown> {
    const response = await request(url, {
      dispatcher: downloadDispatcher,
      headers: { 'user-agent': 'mctg-launcher', accept: 'application/vnd.github+json' }
    })
    if (response.statusCode === 403 || response.statusCode === 429) {
      throw new Error('GitHub istek sınırı aşıldı; birkaç dakika sonra tekrar dene.')
    }
    if (response.statusCode === 404) {
      throw new Error('Repo, dal veya dosya bulunamadı. Repo adresini kontrol et.')
    }
    if (response.statusCode !== 200) {
      throw new Error(`GitHub isteği başarısız (HTTP ${response.statusCode}).`)
    }
    return response.body.json()
  }

  /** Reponun tüm dosya ağacını (yol + git hash + boyut) getirir; kısa süreli bellek ve kalıcı çevrimdışı önbelleği vardır. */
  private async getTree(ref: RepoRef): Promise<GitTreeEntry[]> {
    const key = `${ref.owner}/${ref.repo}@${ref.branch}`
    if (this.treeCache?.key === key && Date.now() - this.treeCache.fetchedAt < TREE_TTL_MS) {
      return this.treeCache.entries
    }

    try {
      const raw = (await this.fetchJson(
        `https://api.github.com/repos/${ref.owner}/${ref.repo}/git/trees/${encodeURIComponent(ref.branch)}?recursive=1`
      )) as { tree?: GitTreeEntry[]; truncated?: boolean }
      if (!Array.isArray(raw.tree)) throw new Error('GitHub ağaç yanıtı geçersiz.')
      if (raw.truncated) {
        console.warn('[profiles] uyarı: repo ağacı çok büyük, GitHub yanıtı kırpıldı')
      }
      this.treeCache = { key, fetchedAt: Date.now(), entries: raw.tree }
      store.set(TREE_CACHE_KEY, { key, entries: raw.tree })
      return raw.tree
    } catch (err) {
      const cached = store.get<{ key: string; entries: GitTreeEntry[] } | null>(TREE_CACHE_KEY, null)
      if (cached && cached.key === key && Array.isArray(cached.entries)) {
        console.warn('[profiles] repoya ulaşılamadı, çevrimdışı önbellek kullanılıyor')
        return cached.entries
      }
      throw err
    }
  }

  async list(): Promise<ProfilesSnapshot> {
    const rawSetting = settingsService.get().modRepo
    const ref = this.currentRepo()

    if (!ref) {
      return {
        profiles: [VANILLA_PROFILE],
        repo: null,
        error: rawSetting.trim()
          ? 'Repo adresi geçersiz. "kullanici/repo" biçiminde girilmeli.'
          : null
      }
    }

    const repoLabel = `${ref.owner}/${ref.repo}`
    try {
      const entries = await this.getTree(ref)
      const overrides = await this.loadOverrides(ref, entries)

      const folders = entries.filter(
        (e) => e.type === 'tree' && !e.path.includes('/') && PROFILE_ID_PATTERN.test(e.path)
      )

      const profiles: ModProfile[] = []
      for (const folder of folders) {
        if (folder.path === VANILLA_PROFILE_ID) continue
        const files = entries.filter(
          (e) => e.type === 'blob' && e.path.startsWith(`${folder.path}/`)
        )
        if (files.length === 0) continue

        const meta = overrides.get(folder.path)
        const fabricDetected = files.some((f) => /fabric/i.test(f.path))
        profiles.push({
          id: folder.path,
          name: meta?.name ?? folder.path.charAt(0).toUpperCase() + folder.path.slice(1),
          description: meta?.description ?? `${files.length} dosya`,
          mcVersion: meta?.mcVersion ?? DEFAULT_MC_VERSION,
          loader: meta?.loader ?? (fabricDetected ? 'fabric' : 'vanilla')
        })
      }

      console.log(`[profiles] ${repoLabel}: ${profiles.map((p) => `${p.id}(${p.loader})`).join(', ') || 'profil yok'}`)
      return { profiles: [VANILLA_PROFILE, ...profiles], repo: repoLabel, error: null }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error('[profiles] liste hatası:', message)
      return { profiles: [VANILLA_PROFILE], repo: repoLabel, error: message }
    }
  }

  async getProfile(id: string): Promise<ModProfile> {
    if (id === VANILLA_PROFILE_ID) return VANILLA_PROFILE
    const snapshot = await this.list()
    return snapshot.profiles.find((p) => p.id === id) ?? VANILLA_PROFILE
  }

  /** Profilin dosya listesini repo ağacından üretir: yol eşlemesi + git hash + raw indirme URL'si. */
  async getManifest(profileId: string): Promise<ManifestEntry[]> {
    const ref = this.currentRepo()
    if (!ref) throw new Error('Mod deposu ayarlanmamış.')
    if (!PROFILE_ID_PATTERN.test(profileId)) throw new Error(`Geçersiz profil kimliği: ${profileId}`)

    const entries = await this.getTree(ref)
    const prefix = `${profileId}/`
    const manifest: ManifestEntry[] = []

    for (const entry of entries) {
      if (entry.type !== 'blob' || !entry.path.startsWith(prefix)) continue
      const inner = entry.path.slice(prefix.length)
      const segments = inner.split('/')
      if (segments.some((s) => s === '' || s === '.' || s === '..')) continue
      if (!/^[a-f0-9]{40}$/i.test(entry.sha)) continue

      const target = KNOWN_INSTANCE_DIRS.has(segments[0]) && segments.length > 1 ? inner : `mods/${inner}`
      manifest.push({
        path: target,
        gitSha: entry.sha.toLowerCase(),
        size: entry.size ?? 0,
        url: this.rawUrl(ref, entry.path)
      })
    }

    if (manifest.length === 0) {
      throw new Error(`Repoda "${profileId}" klasörü boş veya bulunamadı.`)
    }
    return manifest
  }

  /** İsteğe bağlı profiles.json: [{ id, name?, description?, mcVersion?, loader? }] — sadece görünüm/sürüm bilgisini özelleştirir. */
  private async loadOverrides(
    ref: RepoRef,
    entries: GitTreeEntry[]
  ): Promise<Map<string, Partial<ModProfile>>> {
    const overrides = new Map<string, Partial<ModProfile>>()
    if (!entries.some((e) => e.type === 'blob' && e.path === 'profiles.json')) return overrides

    try {
      const raw = await this.fetchJson(this.rawUrl(ref, 'profiles.json'))
      if (!Array.isArray(raw)) return overrides
      for (const item of raw) {
        const p = item as Partial<ModProfile>
        if (typeof p.id !== 'string' || !PROFILE_ID_PATTERN.test(p.id)) continue
        overrides.set(p.id, {
          name: typeof p.name === 'string' ? p.name.trim().slice(0, 60) : undefined,
          description:
            typeof p.description === 'string' ? p.description.trim().slice(0, 160) : undefined,
          mcVersion: typeof p.mcVersion === 'string' ? p.mcVersion.trim() : undefined,
          loader: p.loader === 'fabric' || p.loader === 'vanilla' ? p.loader : undefined
        })
      }
    } catch (err) {
      console.warn('[profiles] profiles.json okunamadı, varsayılanlar kullanılıyor:', err)
    }
    return overrides
  }
}

export const profileService = new ProfileService()
