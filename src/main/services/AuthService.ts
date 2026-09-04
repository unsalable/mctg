import { safeStorage } from 'electron'
import { Auth } from 'msmc'
import type { AuthResult, PlayerSession } from '../../shared/types'
import { store } from './storage'

type Xbox = Awaited<ReturnType<Auth['launch']>>
type Minecraft = Awaited<ReturnType<Xbox['getMinecraft']>>

const TOKEN_KEY = 'auth.refreshToken'
const PROFILE_ENDPOINT = 'https://api.minecraftservices.com/minecraft/profile'

/** Mojang profil uçlarının döndürdüğü ham gövde (msmc'nin tipi pelerin durumlarını eksik modelliyor). */
export interface RawMcProfile {
  id: string
  name: string
  skins?: Array<{ id: string; state: string; url: string; variant?: string }>
  capes?: Array<{ id: string; state: string; url: string; alias?: string }>
}

/** Uzak görseli data URL'ye çevirir; renderer'da CORS/ağ sorunu yaşanmaması için main tarafında indirilir. */
export async function toDataUrl(url: string): Promise<string | null> {
  try {
    const response = await fetch(url)
    if (!response.ok) return null
    const buffer = Buffer.from(await response.arrayBuffer())
    return `data:image/png;base64,${buffer.toString('base64')}`
  } catch {
    return null
  }
}

class AuthService {
  /** Sonraki adımlarda oyunu başlatırken erişim token'ı buradan okunacak. */
  private minecraft: Minecraft | null = null

  async login(): Promise<AuthResult> {
    try {
      const auth = new Auth('select_account')
      const xbox = await auth.launch('electron', { width: 520, height: 660, resizable: false })
      return await this.completeLogin(xbox)
    } catch (err) {
      return this.toError(err)
    }
  }

  /** Uygulama açılışında saklanan refresh token ile sessiz giriş dener. */
  async restore(): Promise<AuthResult> {
    const refreshToken = this.readToken()
    if (!refreshToken) return { ok: false, error: 'NO_SESSION', cancelled: true }
    try {
      const auth = new Auth('select_account')
      const xbox = await auth.refresh(refreshToken)
      return await this.completeLogin(xbox)
    } catch (err) {
      this.clearToken()
      return this.toError(err)
    }
  }

  async logout(): Promise<void> {
    this.minecraft = null
    this.clearToken()
  }

  /** Oyun başlatılmadan önce geçerli (süresi dolmamış) bir Minecraft oturumu garanti eder. */
  async ensureMinecraft(): Promise<Minecraft> {
    if (this.minecraft) {
      try {
        if (this.minecraft.validate()) return this.minecraft
        await this.minecraft.refresh()
        return this.minecraft
      } catch {
        this.minecraft = null
      }
    }
    const result = await this.restore()
    if (!result.ok || !this.minecraft) {
      throw new Error('Oturum doğrulanamadı. Lütfen çıkış yapıp yeniden giriş yapın.')
    }
    return this.minecraft
  }

  /** Mojang servis uçlarında kullanılacak taze erişim token'ı. */
  async token(): Promise<string> {
    return (await this.ensureMinecraft()).mcToken
  }

  /** Profili Mojang'dan yeniden okur — skin/pelerin değişikliğinden sonra kullanılır. */
  async fetchProfile(): Promise<RawMcProfile> {
    const token = await this.token()
    const response = await fetch(PROFILE_ENDPOINT, {
      headers: { authorization: `Bearer ${token}` }
    })
    if (!response.ok) {
      throw new Error(`Profil bilgisi alınamadı (HTTP ${response.status}).`)
    }
    return (await response.json()) as RawMcProfile
  }

  /** Ham profili UI'ın kullandığı oturum nesnesine çevirir (skin ve pelerin görselleri gömülü). */
  async sessionFromProfile(profile: RawMcProfile): Promise<PlayerSession> {
    const skin = profile.skins?.find((s) => s.state === 'ACTIVE') ?? profile.skins?.[0]
    const skinVariant: PlayerSession['skinVariant'] =
      skin?.variant?.toUpperCase() === 'SLIM' ? 'slim' : 'classic'
    const cape = profile.capes?.find((c) => c.state === 'ACTIVE')

    return {
      name: profile.name,
      uuid: profile.id,
      skinUrl: skin?.url ?? null,
      skinDataUrl: skin?.url ? await toDataUrl(skin.url) : null,
      skinVariant,
      capeDataUrl: cape?.url ? await toDataUrl(cape.url) : null
    }
  }

  private async completeLogin(xbox: Xbox): Promise<AuthResult> {
    const minecraft = await xbox.getMinecraft()
    this.minecraft = minecraft
    this.saveToken(xbox.save())

    const profile = minecraft.profile
    if (!profile) throw new Error('Minecraft profili alınamadı.')
    return { ok: true, session: await this.sessionFromProfile(profile as RawMcProfile) }
  }

  private toError(err: unknown): AuthResult {
    const message = err instanceof Error ? err.message : String(err)
    const cancelled = /gui\.closed|closed|cancelled/i.test(message)
    return {
      ok: false,
      cancelled,
      error: cancelled ? 'Giriş penceresi kapatıldı.' : this.friendlyMessage(message)
    }
  }

  private friendlyMessage(message: string): string {
    if (/minecraft/i.test(message) && /own|entitle|profile/i.test(message)) {
      return 'Bu Microsoft hesabında Minecraft: Java Edition bulunamadı.'
    }
    if (/network|fetch|ENOTFOUND|ETIMEDOUT|ECONNREFUSED/i.test(message)) {
      return 'Ağ hatası: Microsoft sunucularına ulaşılamadı.'
    }
    return `Giriş başarısız: ${message}`
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

export const authService = new AuthService()
