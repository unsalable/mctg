import { safeStorage } from 'electron'
import { Auth } from 'msmc'
import type { AuthResult, PlayerSession } from '../../shared/types'
import { store } from './storage'

type Xbox = Awaited<ReturnType<Auth['launch']>>
type Minecraft = Awaited<ReturnType<Xbox['getMinecraft']>>

const TOKEN_KEY = 'auth.refreshToken'

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

  private async completeLogin(xbox: Xbox): Promise<AuthResult> {
    const minecraft = await xbox.getMinecraft()
    this.minecraft = minecraft
    this.saveToken(xbox.save())
    return { ok: true, session: await this.buildSession(minecraft) }
  }

  private async buildSession(minecraft: Minecraft): Promise<PlayerSession> {
    const profile = minecraft.profile
    if (!profile) throw new Error('Minecraft profili alınamadı.')

    const skin = profile.skins?.find((s) => s.state === 'ACTIVE') ?? profile.skins?.[0]
    const skinVariant: PlayerSession['skinVariant'] =
      skin?.variant?.toUpperCase() === 'SLIM' ? 'slim' : 'classic'

    let skinDataUrl: string | null = null
    if (skin?.url) {
      try {
        const response = await fetch(skin.url)
        const buffer = Buffer.from(await response.arrayBuffer())
        skinDataUrl = `data:image/png;base64,${buffer.toString('base64')}`
      } catch {
        // Skin indirilemezse UI placeholder gösterir; giriş engellenmez.
      }
    }

    return {
      name: profile.name,
      uuid: profile.id,
      skinUrl: skin?.url ?? null,
      skinDataUrl,
      skinVariant
    }
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
