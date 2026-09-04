export interface PlayerSession {
  name: string
  uuid: string
  skinUrl: string | null
  /** Skin PNG'si CORS engeline takılmaması için main process'te indirilip data URL olarak taşınır. */
  skinDataUrl: string | null
  skinVariant: 'classic' | 'slim'
  /** Etkin pelerinin görseli (data URL) — pelerin yoksa null. */
  capeDataUrl: string | null
}

export type AuthResult =
  | { ok: true; session: PlayerSession }
  | { ok: false; error: string; cancelled: boolean }

/** Arayüz teması: açık zemin ya da tamamen siyah zemin. */
export type ThemeMode = 'light' | 'dark'

export interface LauncherSettings {
  /** Oyuna ayrılacak maksimum bellek (GB). Aralık: 2-16, varsayılan: 4. */
  ramGb: number
  /** Oyuncunun seçtiği profil kimliği. */
  selectedProfileId: string
  /** Arayüz teması. */
  theme: ThemeMode
}

export interface SettingsSnapshot {
  settings: LauncherSettings
  /** Kullanıcının toplam sistem belleği (GB) — UI'da bilgi amaçlı gösterilir. */
  systemRamGb: number
}

export interface ModProfile {
  id: string
  name: string
  description?: string
  /**
   * Profilin modlarının derlendiği Minecraft sürümü. Site bunu bildirmediyse
   * null kalır: profil sürüm iddiasında bulunmaz, sunucunun sürümüyle açılır.
   */
  mcVersion: string | null
  /** Mod yükleyici: Fabric modları için loader otomatik kurulur. */
  loader: 'vanilla' | 'fabric'
  /** Sunucunun resmî paketi mi (sitede yönetici işaretler). */
  official: boolean
  /** Profil, oturumu açık site hesabına mı ait. */
  mine: boolean
}

export interface ProfilesSnapshot {
  /** Her zaman en az yerleşik Vanilla profilini içerir. */
  profiles: ModProfile[]
  /** Siteye ulaşılamaması vb. kullanıcıya gösterilecek uyarı. */
  error: string | null
}

/** Mojang sürüm manifestinden sadeleştirilmiş sürüm kaydı. */
export interface MinecraftVersion {
  id: string
  /** "release", "snapshot", "old_beta", "old_alpha". */
  type: string
  releaseTime: string
}

export interface VersionsSnapshot {
  versions: MinecraftVersion[]
  latestRelease: string | null
  latestSnapshot: string | null
  /** Manifest çekilemediyse gösterilecek uyarı (önbellek varsa liste yine dolu gelir). */
  error: string | null
}

/* --- MCTG site hesabı --- */

/** Site sunucusunun döndürdüğü kullanıcı (server/lib/store.mjs → publicUser). */
export interface SiteUser {
  id: string
  email: string
  username: string
  /** "approved" dışındaki hesaplar launcher'ı kullanamaz. */
  status: 'unverified' | 'pending' | 'approved' | 'rejected'
  isAdmin: boolean
  superAdmin: boolean
}

export type SiteAuthResult =
  | { ok: true; user: SiteUser }
  | { ok: false; error: string; code: string }

/** Yöneticinin belirlediği, tüm oyunculara dağıtılan launcher yapılandırması. */
export interface LauncherConfig {
  /** Herkesin başlatacağı Minecraft sürümü. */
  mcVersion: string
  updatedAt: number | null
  updatedBy: string | null
  /** Oyunun otomatik bağlanacağı sunucu. */
  server: { host: string; port: number }
  /** Mod deposunun desteklediği sürümler — uyumsuz seçimde uyarı üretir. */
  supportedVersions: string[]
  /** Oturum sahibi sürümü değiştirebilir mi (yalnızca yönetici). */
  canEdit: boolean
  /** Sunucudan gelen uyarı ya da "önbellek kullanıldı" bilgisi. */
  warning: string | null
}

export type LauncherConfigResult =
  | { ok: true; config: LauncherConfig }
  | { ok: false; error: string }

/* --- Oyun sunucusu durumu --- */

/** play.mctg.com.tr'ye yapılan sunucu listesi ping'inin sonucu. */
export interface ServerStatus {
  host: string
  port: number
  online: boolean
  players: { online: number; max: number }
  version: string | null
  motd: string | null
  latencyMs: number | null
  error: string | null
  /** Art arda başarısız deneme sayısı; bağlantı kurulunca sıfırlanır. */
  attempts: number
  /** Bir sonraki otomatik denemeye kalan süre (ms); çevrimiçiyken null. */
  retryInMs: number | null
  /** Şu anda bir deneme sürüyor mu. */
  checking: boolean
}

export interface CapeInfo {
  id: string
  alias: string
  active: boolean
  imageDataUrl: string | null
}

export interface SkinLibraryItem {
  id: string
  name: string
  variant: 'classic' | 'slim'
  imageDataUrl: string
  addedAt: number
  /** Hesapta şu an etkin olan skin ile aynı görsel mi? */
  active: boolean
}

export interface AccountSnapshot {
  session: PlayerSession
  /** Hesabın sahip olduğu pelerinler; en fazla biri etkindir. */
  capes: CapeInfo[]
  /** Launcher'da saklanan kişisel skin kütüphanesi. */
  library: SkinLibraryItem[]
}

export type AccountResult =
  | { ok: true; account: AccountSnapshot }
  | { ok: false; error: string; cancelled?: boolean }

export type GamePhase = 'resolving' | 'downloading' | 'mods' | 'java' | 'launching' | 'running'

export interface GameProgress {
  phase: GamePhase
  label: string
  /** 0-100 arası; belirsiz süreli aşamalarda null. */
  percent: number | null
}

export type PlayResult = { ok: true } | { ok: false; error: string }

export interface GameExitInfo {
  code: number | null
}

export interface LauncherApi {
  windowControls: {
    minimize: () => void
    close: () => void
  }
  auth: {
    login: () => Promise<AuthResult>
    restore: () => Promise<AuthResult>
    logout: () => Promise<void>
  }
  settings: {
    get: () => Promise<SettingsSnapshot>
    set: (patch: Partial<LauncherSettings>) => Promise<LauncherSettings>
  }
  game: {
    play: () => Promise<PlayResult>
    /** İlerleme olaylarına abone olur; dönen fonksiyon aboneliği kaldırır. */
    onProgress: (callback: (progress: GameProgress) => void) => () => void
    onExit: (callback: (info: GameExitInfo) => void) => () => void
  }
  profiles: {
    list: () => Promise<ProfilesSnapshot>
  }
  versions: {
    list: () => Promise<VersionsSnapshot>
  }
  site: {
    /** MCTG site hesabıyla giriş — Microsoft girişinden önceki ilk kapı. */
    login: (email: string, password: string) => Promise<SiteAuthResult>
    /** Saklanan site oturumunu doğrular. */
    restore: () => Promise<SiteAuthResult>
    logout: () => Promise<void>
    /** Yöneticinin belirlediği sürüm + sunucu adresi. */
    config: () => Promise<LauncherConfigResult>
    /** Sürümü değiştirir; sunucu yönetici olmayanı reddeder. */
    setVersion: (versionId: string) => Promise<LauncherConfigResult>
  }
  server: {
    /** En son bilinen sunucu durumu. */
    status: () => Promise<ServerStatus>
    /** Otomatik denemeyi beklemeden hemen bağlanmayı dener. */
    retry: () => Promise<ServerStatus>
    onStatus: (callback: (status: ServerStatus) => void) => () => void
  }
  account: {
    /** Mojang'dan güncel profil (skin + pelerinler) ve yerel skin kütüphanesi. */
    get: () => Promise<AccountResult>
    /** Dosya seçtirip PNG'yi kütüphaneye ekler. */
    addSkin: () => Promise<AccountResult>
    removeSkin: (id: string) => Promise<AccountResult>
    /** Kütüphanedeki skini hesaba yükler. */
    applySkin: (id: string, variant: 'classic' | 'slim') => Promise<AccountResult>
    /** Hesabı varsayılan (Steve/Alex) skinine döndürür. */
    resetSkin: () => Promise<AccountResult>
    /** Pelerin seçer; null gönderilirse pelerin gizlenir. */
    setCape: (capeId: string | null) => Promise<AccountResult>
  }
}
