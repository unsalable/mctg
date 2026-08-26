export interface PlayerSession {
  name: string
  uuid: string
  skinUrl: string | null
  /** Skin PNG'si CORS engeline takılmaması için main process'te indirilip data URL olarak taşınır. */
  skinDataUrl: string | null
  skinVariant: 'classic' | 'slim'
}

export type AuthResult =
  | { ok: true; session: PlayerSession }
  | { ok: false; error: string; cancelled: boolean }

export interface LauncherSettings {
  /** Oyuna ayrılacak maksimum bellek (GB). Aralık: 2-16, varsayılan: 4. */
  ramGb: number
  /** Mod profillerinin çekildiği GitHub deposu: "kullanici/repo", "kullanici/repo@dal" veya tam URL. Boş = yalnızca Vanilla. */
  modRepo: string
  /** Oyuncunun seçtiği profil kimliği. */
  selectedProfileId: string
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
  /** Bu profilin başlatacağı Minecraft sürümü. */
  mcVersion: string
  /** Mod yükleyici: Fabric modları için loader otomatik kurulur. */
  loader: 'vanilla' | 'fabric'
}

export interface ProfilesSnapshot {
  /** Her zaman en az yerleşik Vanilla profilini içerir. */
  profiles: ModProfile[]
  /** Ayarlanmış geçerli repo ("kullanici/repo") ya da null. */
  repo: string | null
  /** Repo erişim sorunu vb. kullanıcıya gösterilecek uyarı. */
  error: string | null
}

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
}
