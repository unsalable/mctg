import { VANILLA_PROFILE, VANILLA_PROFILE_ID } from '../../shared/constants'
import type { ModProfile, ProfilesSnapshot } from '../../shared/types'
import { siteService } from './SiteService'
import { store } from './storage'

export interface ManifestEntry {
  /** Instance köküne göre hedef yol, ör. "mods/sodium.jar". Sunucu söyler, İSTEMCİ DOĞRULAR. */
  path: string
  /** Dosyanın sha256'sı: hem kimliği hem doğrulaması. */
  sha256: string
  size: number
  /** Yerel üretilir; sunucudan gelen mutlak adres kabul edilmez. */
  url: string
}

/** Sitenin /launcher/v1/profiles yanıtındaki tek profil. */
interface SiteProfile {
  id: string
  name: string
  description?: string
  mcVersion?: string | null
  loader?: string
  official?: boolean
  visibility?: string
  mine?: boolean
}

/** Profil kimliği doğrudan instance klasör adı olur; bu yüzden daraltılmış alfabe. */
const PROFILE_ID_PATTERN = /^[a-z0-9][a-z0-9-_]{0,63}$/
const PROFILE_CACHE_KEY = 'profileCache'
const MANIFEST_CACHE_KEY = 'manifestCache'

/** Sunucunun yazdırabileceği klasörler. Bunların dışına dosya yazılmaz. */
const KNOWN_INSTANCE_DIRS = new Set(['mods', 'config', 'resourcepacks', 'shaderpacks', 'datapacks'])

/**
 * Mod profilleri MCTG sitesinden gelir.
 *
 * Eskiden GitHub'ın tree API'si okunuyordu ve dosyalar raw.githubusercontent'ten
 * iniyordu; artık üyenin siteye yüklediği, yöneticinin onayladığı dosyalar
 * `/api/launcher/v1` üzerinden dağıtılıyor. Böylece paket değişikliği bir
 * sonraki "OYNA" tıklamasında iniyor ve kimin hangi profili göreceğine site
 * karar veriyor (zorunlu paket + kişinin kendi profilleri + onaylı açık olanlar).
 *
 * Kısa ömürlü bellek önbelleği YOK: o yalnızca GitHub'ın saatlik istek sınırı
 * içindi. Kalıcı çevrimdışı önbellek duruyor — siteye ulaşılamadığında oyuncu
 * yine de son bilinen paketle oynayabilsin diye.
 */
class ProfileService {
  /**
   * Sunucu hedef yolu söyler, ama biz doğrularız.
   *
   * Launcher kullanıcının bilgisayarında çalışan bir .exe; uzak bir sunucuya
   * "dosyayı istediğin yere yaz" yetkisi verilmez. Ele geçirilmiş ya da hatalı
   * bir sunucuya karşı son savunma burası.
   */
  private safePath(raw: unknown): string | null {
    if (typeof raw !== 'string' || raw.length === 0 || raw.length > 512) return null
    if (raw.includes('\\') || raw.startsWith('/') || /^[a-zA-Z]:/.test(raw)) return null
    const segments = raw.split('/')
    if (segments.length < 2) return null
    if (segments.some((s) => s === '' || s === '.' || s === '..')) return null
    if (!KNOWN_INSTANCE_DIRS.has(segments[0])) return null
    return raw
  }

  /** Ağdan gelen her kimlik klasör adına dönüşüyor; traversal koruması. */
  private safeProfileId(raw: unknown): string | null {
    return typeof raw === 'string' && PROFILE_ID_PATTERN.test(raw) ? raw : null
  }

  async list(): Promise<ProfilesSnapshot> {
    try {
      const result = await siteService.launcherGet<{
        profiles?: SiteProfile[]
        warnings?: string[]
      }>('/profiles')

      const profiles: ModProfile[] = []
      const warnings = [...(result.warnings ?? [])]
      for (const raw of result.profiles ?? []) {
        const id = this.safeProfileId(raw.id)
        if (!id) {
          console.warn('[profiles] geçersiz profil kimliği atlandı:', raw.id)
          continue
        }
        const name = typeof raw.name === 'string' && raw.name ? raw.name : id
        // Site quilt/forge/neoforge da tutabiliyor; launcher yalnızca Fabric
        // kuruyor. Böyle bir profili "vanilla" diye açmak modları sessizce
        // devre dışı bırakır ya da oyunu çökertir — listelemeyip söylüyoruz.
        if (raw.loader && raw.loader !== 'vanilla' && raw.loader !== 'fabric') {
          warnings.push(
            `"${name}" profili ${raw.loader} gerektiriyor; launcher yalnızca Fabric kurabiliyor.`
          )
          continue
        }
        profiles.push({
          id,
          name,
          description: typeof raw.description === 'string' ? raw.description : undefined,
          // Site sürüm bildirmiyorsa uydurmuyoruz; sunucunun sürümü geçerli.
          mcVersion: typeof raw.mcVersion === 'string' && raw.mcVersion ? raw.mcVersion : null,
          loader: raw.loader === 'fabric' ? 'fabric' : 'vanilla',
          official: Boolean(raw.official),
          mine: Boolean(raw.mine)
        })
      }

      store.set(PROFILE_CACHE_KEY, profiles)
      console.log(
        `[profiles] siteden: ${profiles.map((p) => `${p.id}(${p.loader})`).join(', ') || 'profil yok'}`
      )
      return {
        profiles: [VANILLA_PROFILE, ...profiles],
        error: warnings.length ? warnings.join(' ') : null
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error('[profiles] liste hatası:', message)

      // Çevrimdışı: son başarılı liste gösterilir, oyuncu yine de oynayabilsin.
      const cached = store.get<ModProfile[] | null>(PROFILE_CACHE_KEY, null)
      if (Array.isArray(cached) && cached.length > 0) {
        return {
          profiles: [VANILLA_PROFILE, ...cached],
          error: 'Siteye ulaşılamadı; en son bilinen profil listesi gösteriliyor.'
        }
      }
      return { profiles: [VANILLA_PROFILE], error: message }
    }
  }

  async getProfile(id: string): Promise<ModProfile> {
    if (id === VANILLA_PROFILE_ID) return VANILLA_PROFILE
    const snapshot = await this.list()
    return snapshot.profiles.find((p) => p.id === id) ?? VANILLA_PROFILE
  }

  /** Profilin dosya listesi: hedef yol + sha256 + yerel üretilen indirme adresi. */
  async getManifest(profileId: string): Promise<ManifestEntry[]> {
    if (!this.safeProfileId(profileId)) {
      throw new Error(`Geçersiz profil kimliği: ${profileId}`)
    }

    let raw: { entries?: unknown[]; warnings?: string[] }
    try {
      raw = await siteService.launcherGet(`/profiles/${profileId}/manifest`)
      store.set(`${MANIFEST_CACHE_KEY}.${profileId}`, raw)
    } catch (err) {
      const cached = store.get<{ entries?: unknown[] } | null>(
        `${MANIFEST_CACHE_KEY}.${profileId}`,
        null
      )
      if (!cached) throw err
      console.warn('[mods] siteye ulaşılamadı, çevrimdışı manifest kullanılıyor')
      raw = cached
    }

    const manifest: ManifestEntry[] = []
    for (const item of raw.entries ?? []) {
      const entry = item as { path?: unknown; sha256?: unknown; size?: unknown }
      const path = this.safePath(entry.path)
      if (!path) {
        console.warn('[mods] güvensiz hedef yol reddedildi:', entry.path)
        continue
      }
      const sha256 = typeof entry.sha256 === 'string' ? entry.sha256.toLowerCase() : ''
      if (!/^[a-f0-9]{64}$/.test(sha256)) {
        console.warn('[mods] geçersiz sha256 atlandı:', entry.path)
        continue
      }
      manifest.push({
        path,
        sha256,
        size: typeof entry.size === 'number' ? entry.size : 0,
        url: siteService.fileUrl(sha256)
      })
    }

    for (const warning of raw.warnings ?? []) console.warn(`[mods] ${warning}`)

    if (manifest.length === 0) {
      throw new Error(`"${profileId}" profilinde indirilecek dosya yok.`)
    }
    return manifest
  }
}

/**
 * GitHub döneminden kalan repo ağacı önbelleği (yüz kilobaytlarca dosya
 * listesi) bir daha okunmuyor; ilk açılışta bir kez temizlenir.
 */
if (store.get('repoTreeCache', null) !== null) {
  store.delete('repoTreeCache')
  console.log('[profiles] eski GitHub ağaç önbelleği silindi')
}

export const profileService = new ProfileService()
