import { safeStorage } from 'electron'
import { MC_SERVER_HOST, MC_SERVER_PORT, SITE_API_BASE } from '../../shared/constants'
import type {
  LauncherConfig,
  LauncherConfigResult,
  SiteAuthResult,
  SiteUser
} from '../../shared/types'
import { store } from './storage'

const TOKEN_KEY = 'site.token'
const CONFIG_CACHE_KEY = 'site.configCache'
const REQUEST_TIMEOUT_MS = 12_000
const LAUNCHER_PREFIX = '/api/launcher/v1'

/** Geliştirirken siteyi yerelde çalıştırmak için: MCTG_API_BASE=http://localhost:8787 */
const API_BASE = (process.env['MCTG_API_BASE'] || SITE_API_BASE).replace(/\/+$/, '')

/** Yerel adresler yalnızca site de yereldeyken anlamlıdır. */
const LOOPBACK_HOST = /^(localhost|127(\.\d+){3}|::1|0\.0\.0\.0)$/i

/** Geliştirme sitesine bakılıyorsa 127.0.0.1 gibi adresler geçerli sayılır. */
const API_BASE_IS_LOCAL = LOOPBACK_HOST.test(new URL(API_BASE).hostname)

/** Sunucunun hata gövdesi: { error: { code, message } }. */
interface ApiError {
  error?: { code?: string; message?: string }
}

class SiteApiError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status: number
  ) {
    super(message)
  }
}

/** Ağ katmanı hatası (DNS, zaman aşımı, bağlantı reddi) — jetonu geçersiz kılmaz. */
class SiteNetworkError extends Error {
  readonly code = 'network'
}

/**
 * MCTG sitesinin hesap sunucusuyla konuşan tek nokta.
 *
 * Launcher kendi kullanıcı veritabanını tutmaz: giriş de, "yönetici mi"
 * kararı da, başlatılacak sürüm de siteden gelir. Böylece sunucu sürüm
 * atladığında yöneticinin tek bir değişikliği herkesin launcher'ına iner.
 */
class SiteService {
  private token: string | null = null
  private user: SiteUser | null = null
  /** Aynı oturumda tekrar tekrar sorulmasın diye kısa ömürlü yapılandırma önbelleği. */
  private configMemory: { fetchedAt: number; config: LauncherConfig } | null = null

  /** Site oturumu açık mı — Microsoft girişine ancak bundan sonra geçilir. */
  get currentUser(): SiteUser | null {
    return this.user
  }

  get isAdmin(): boolean {
    return Boolean(this.user?.isAdmin)
  }

  async login(email: string, password: string): Promise<SiteAuthResult> {
    try {
      const data = await this.request<{ token: string; user: SiteUser }>('/api/auth/login', {
        method: 'POST',
        body: { email, password, remember: true },
        auth: false
      })
      const gate = this.approvalGate(data.user)
      if (gate) return { ok: false, error: gate, code: data.user.status }

      this.token = data.token
      this.user = data.user
      this.saveToken(data.token)
      console.log(`[site] giriş: ${data.user.username}${data.user.isAdmin ? ' (yönetici)' : ''}`)
      return { ok: true, user: data.user }
    } catch (err) {
      return this.toAuthError(err)
    }
  }

  /** Açılışta saklanan jetonla sessiz giriş dener. */
  async restore(): Promise<SiteAuthResult> {
    const saved = this.readToken()
    if (!saved) return { ok: false, error: 'NO_SESSION', code: 'no_session' }
    this.token = saved
    try {
      const data = await this.request<{ user: SiteUser }>('/api/auth/me', {})
      const gate = this.approvalGate(data.user)
      if (gate) return { ok: false, error: gate, code: data.user.status }

      this.user = data.user
      return { ok: true, user: data.user }
    } catch (err) {
      // Jeton gerçekten geçersizse silinir; ağ hatasında saklanır — internet
      // gelince kullanıcıdan tekrar şifre istememek için.
      if (err instanceof SiteApiError && err.status === 401) {
        this.token = null
        this.clearToken()
      }
      return this.toAuthError(err)
    }
  }

  async logout(): Promise<void> {
    const token = this.token
    this.token = null
    this.user = null
    this.configMemory = null
    this.clearToken()
    if (!token) return
    try {
      await fetch(`${API_BASE}/api/auth/logout`, {
        method: 'POST',
        headers: { authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
      })
    } catch {
      // Jeton yerelde zaten silindi; sunucuya haber verememek çıkışı engellemez.
    }
  }

  /**
   * Yöneticinin belirlediği sürüm ve sunucu adresi.
   *
   * Ağ yoksa son başarılı yanıt diskten döner: internet kesikken de oyunun
   * doğru sürümle açılabilmesi gerekiyor.
   */
  async config(force = false): Promise<LauncherConfigResult> {
    if (!force && this.configMemory && Date.now() - this.configMemory.fetchedAt < 60_000) {
      return { ok: true, config: this.configMemory.config }
    }
    try {
      const data = await this.request<LauncherConfig>(`${LAUNCHER_PREFIX}/config`, {})
      const config = this.normalizeConfig(data, null)
      this.configMemory = { fetchedAt: Date.now(), config }
      this.cacheConfig(config)
      return { ok: true, config }
    } catch (err) {
      const cached = this.cachedConfig()
      if (cached && typeof cached.mcVersion === 'string' && cached.mcVersion !== '') {
        console.warn('[site] yapılandırma alınamadı, önbellek kullanılıyor:', this.describe(err))
        return {
          ok: true,
          config: this.normalizeConfig(
            cached,
            'Sunucuya ulaşılamadı; en son bilinen sürüm gösteriliyor.'
          )
        }
      }
      return { ok: false, error: this.describe(err) }
    }
  }

  /** Sürümü değiştirir. Yetki kararı sunucuda; buradaki bayrak yalnızca UI içindir. */
  async setVersion(versionId: string): Promise<LauncherConfigResult> {
    try {
      const data = await this.request<LauncherConfig>(`${LAUNCHER_PREFIX}/config`, {
        method: 'PUT',
        body: { mcVersion: versionId }
      })
      const config = this.normalizeConfig(data, data.warning ?? null)
      this.configMemory = { fetchedAt: Date.now(), config }
      this.cacheConfig(config)
      console.log(`[site] sürüm ${config.mcVersion} olarak ayarlandı`)
      return { ok: true, config }
    } catch (err) {
      return { ok: false, error: this.describe(err) }
    }
  }

  /**
   * Mod dosyası indirmelerinde kullanılacak jeton.
   *
   * Dosyalar @xmcl/file-transfer ile (Range destekli, paralel) indirildiği için
   * istek bu sınıfın dışında kuruluyor; jeton yalnızca bu yüzden dışarı açık.
   */
  get accessToken(): string | null {
    return this.token
  }

  /** Launcher uçlarına kimlikli GET — profil listesi, manifest vb. */
  async launcherGet<T>(path: string): Promise<T> {
    try {
      return await this.request<T>(`${LAUNCHER_PREFIX}${path}`, {})
    } catch (err) {
      // Çağıran mesajı doğrudan kullanıcıya gösteriyor; ham fetch hatası değil,
      // sitenin kendi Türkçe metni ya da yerel ağ mesajı dönsün.
      throw new Error(this.describe(err))
    }
  }

  /**
   * Bir dosyanın indirme adresi.
   *
   * Sunucu mutlak adres GÖNDERMEZ, launcher kendi sabit kökünden üretir:
   * indirme isteklerine Authorization eklendiği için sunucunun verdiği bir
   * adres jetonu üçüncü bir yere sızdırma vektörü olurdu.
   */
  fileUrl(sha256: string): string {
    return `${API_BASE}${LAUNCHER_PREFIX}/files/${sha256}`
  }

  /** Oyun başlatılırken kullanılacak sürüm; sunucu da önbellek de yoksa null. */
  async enforcedVersion(): Promise<string | null> {
    const result = await this.config()
    return result.ok && result.config.mcVersion ? result.config.mcVersion : null
  }

  /** Oyunun bağlanacağı sunucu adresi; yapılandırma yoksa yerleşik adrese düşer. */
  async serverAddress(): Promise<{ host: string; port: number }> {
    const result = await this.config()
    return result.ok ? result.config.server : { host: MC_SERVER_HOST, port: MC_SERVER_PORT }
  }

  /**
   * Önbellek hangi sunucudan geldiyse onunla birlikte saklanır.
   *
   * MCTG_API_BASE ile yerel siteye bakıldığında oradaki yapılandırma (ör.
   * sunucu adresi 127.0.0.1) diske yazılıyor; anahtar adresle birlikte
   * tutulmazsa üretim derlemesi de o değeri kendi önbelleği sanıp gösterir.
   */
  private cacheConfig(config: LauncherConfig): void {
    store.set(CONFIG_CACHE_KEY, { base: API_BASE, config })
  }

  private cachedConfig(): LauncherConfig | null {
    const saved = store.get<{ base?: string; config?: LauncherConfig } | null>(
      CONFIG_CACHE_KEY,
      null
    )
    if (!saved || saved.base !== API_BASE || !saved.config) return null
    return saved.config
  }

  private normalizeConfig(raw: Partial<LauncherConfig>, warning: string | null): LauncherConfig {
    return {
      mcVersion: typeof raw.mcVersion === 'string' ? raw.mcVersion : '',
      updatedAt: typeof raw.updatedAt === 'number' ? raw.updatedAt : null,
      updatedBy: typeof raw.updatedBy === 'string' ? raw.updatedBy : null,
      server: this.normalizeServer(raw.server),
      supportedVersions: Array.isArray(raw.supportedVersions) ? raw.supportedVersions : [],
      // Yetki her zaman içinde bulunulan oturumdan okunur, önbellekteki eski değerden değil.
      canEdit: this.isAdmin,
      warning: warning ?? raw.warning ?? null
    }
  }

  /**
   * Sitenin bildirdiği oyun sunucusu adresi.
   *
   * Üretim derlemesi siteden 127.0.0.1 duyarsa bunu YOK SAYAR: o değer sitenin
   * veritabanında kalmış bir geliştirme kaydıdır ve her oyuncunun launcher'ında
   * "kendi bilgisayarına bağlan" anlamına gelirdi — kimse bağlanamaz, rozet de
   * boşuna çevrimdışı görünürdü. Yerel siteyle (MCTG_API_BASE) çalışılırken
   * adres olduğu gibi kullanılır.
   */
  private normalizeServer(raw: LauncherConfig['server'] | undefined): LauncherConfig['server'] {
    const host = raw?.host?.trim() || ''
    const port = Number(raw?.port) || MC_SERVER_PORT
    if (!host) return { host: MC_SERVER_HOST, port }
    if (LOOPBACK_HOST.test(host) && !API_BASE_IS_LOCAL) {
      console.warn(
        `[site] yapılandırmadaki yerel sunucu adresi (${host}) yok sayıldı; ${MC_SERVER_HOST} kullanılıyor`
      )
      return { host: MC_SERVER_HOST, port }
    }
    return { host, port }
  }

  /** Onaylanmamış hesap launcher uçlarının hiçbirini kullanamaz; giriş orada bitmeli. */
  private approvalGate(user: SiteUser): string | null {
    if (user.status === 'approved') return null
    if (user.status === 'pending') {
      return 'Hesabın yönetici onayı bekliyor. Onaylandığında launcher açılacak.'
    }
    if (user.status === 'unverified') {
      return 'Önce e-posta adresini doğrula (siteden gelen 6 haneli kod).'
    }
    return 'Hesabın launcher kullanmak için yetkili değil.'
  }

  private async request<T>(
    path: string,
    options: { method?: string; body?: unknown; auth?: boolean }
  ): Promise<T> {
    const { method = 'GET', body, auth = true } = options
    if (auth && !this.token) {
      throw new SiteApiError('Site oturumu bulunamadı.', 'no_session', 401)
    }

    const headers: Record<string, string> = { accept: 'application/json' }
    if (body !== undefined) headers['content-type'] = 'application/json'
    if (auth && this.token) headers.authorization = `Bearer ${this.token}`

    let response: Response
    try {
      response = await fetch(`${API_BASE}${path}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
      })
    } catch (err) {
      throw new SiteNetworkError(err instanceof Error ? err.message : String(err))
    }

    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as ApiError
      throw new SiteApiError(
        payload.error?.message ?? `Sunucu hatası (HTTP ${response.status}).`,
        payload.error?.code ?? 'http_error',
        response.status
      )
    }
    return (await response.json()) as T
  }

  private toAuthError(err: unknown): SiteAuthResult {
    if (err instanceof SiteApiError) return { ok: false, error: err.message, code: err.code }
    return { ok: false, error: this.describe(err), code: 'network' }
  }

  private describe(err: unknown): string {
    if (err instanceof SiteApiError) return err.message
    if (err instanceof Error) {
      if (/timeout|aborted/i.test(err.message)) {
        return 'MCTG sunucusu yanıt vermedi. Bağlantını kontrol edip tekrar dene.'
      }
      return 'MCTG sunucusuna ulaşılamadı. Bağlantını kontrol edip tekrar dene.'
    }
    return String(err)
  }

  private saveToken(token: string): void {
    if (safeStorage.isEncryptionAvailable()) {
      store.set(TOKEN_KEY, {
        encrypted: true,
        value: safeStorage.encryptString(token).toString('base64')
      })
    } else {
      store.set(TOKEN_KEY, { encrypted: false, value: token })
    }
  }

  private readToken(): string | null {
    const saved = store.get<{ encrypted: boolean; value: string } | null>(TOKEN_KEY, null)
    if (!saved) return null
    try {
      return saved.encrypted
        ? safeStorage.decryptString(Buffer.from(saved.value, 'base64'))
        : saved.value
    } catch {
      return null
    }
  }

  private clearToken(): void {
    store.delete(TOKEN_KEY)
  }
}

export const siteService = new SiteService()
