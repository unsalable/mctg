import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import type {
  AccountResult,
  AuthResult,
  GameExitInfo,
  GameProgress,
  LauncherApi,
  LauncherConfigResult,
  LauncherSettings,
  PlayResult,
  ProfilesSnapshot,
  ServerStatus,
  SettingsSnapshot,
  SiteAuthResult,
  VersionsSnapshot
} from '../shared/types'

const api: LauncherApi = {
  windowControls: {
    minimize: () => ipcRenderer.send('window:minimize'),
    close: () => ipcRenderer.send('window:close')
  },
  auth: {
    login: (): Promise<AuthResult> => ipcRenderer.invoke('auth:login'),
    restore: (): Promise<AuthResult> => ipcRenderer.invoke('auth:restore'),
    logout: (): Promise<void> => ipcRenderer.invoke('auth:logout')
  },
  settings: {
    get: (): Promise<SettingsSnapshot> => ipcRenderer.invoke('settings:get'),
    set: (patch: Partial<LauncherSettings>): Promise<LauncherSettings> =>
      ipcRenderer.invoke('settings:set', patch)
  },
  game: {
    play: (): Promise<PlayResult> => ipcRenderer.invoke('game:play'),
    onProgress: (callback: (progress: GameProgress) => void) => {
      const listener = (_event: IpcRendererEvent, progress: GameProgress): void =>
        callback(progress)
      ipcRenderer.on('game:progress', listener)
      return () => ipcRenderer.removeListener('game:progress', listener)
    },
    onExit: (callback: (info: GameExitInfo) => void) => {
      const listener = (_event: IpcRendererEvent, info: GameExitInfo): void => callback(info)
      ipcRenderer.on('game:exit', listener)
      return () => ipcRenderer.removeListener('game:exit', listener)
    }
  },
  profiles: {
    list: (): Promise<ProfilesSnapshot> => ipcRenderer.invoke('profiles:list')
  },
  versions: {
    list: (): Promise<VersionsSnapshot> => ipcRenderer.invoke('versions:list')
  },
  site: {
    login: (email: string, password: string): Promise<SiteAuthResult> =>
      ipcRenderer.invoke('site:login', email, password),
    restore: (): Promise<SiteAuthResult> => ipcRenderer.invoke('site:restore'),
    logout: (): Promise<void> => ipcRenderer.invoke('site:logout'),
    config: (): Promise<LauncherConfigResult> => ipcRenderer.invoke('site:config'),
    setVersion: (versionId: string): Promise<LauncherConfigResult> =>
      ipcRenderer.invoke('site:version:set', versionId)
  },
  server: {
    status: (): Promise<ServerStatus> => ipcRenderer.invoke('server:status'),
    retry: (): Promise<ServerStatus> => ipcRenderer.invoke('server:retry'),
    onStatus: (callback: (status: ServerStatus) => void) => {
      const listener = (_event: IpcRendererEvent, status: ServerStatus): void => callback(status)
      ipcRenderer.on('server:status', listener)
      return () => ipcRenderer.removeListener('server:status', listener)
    }
  },
  account: {
    get: (): Promise<AccountResult> => ipcRenderer.invoke('account:get'),
    addSkin: (): Promise<AccountResult> => ipcRenderer.invoke('account:skin:add'),
    removeSkin: (id: string): Promise<AccountResult> =>
      ipcRenderer.invoke('account:skin:remove', id),
    applySkin: (id: string, variant: 'classic' | 'slim'): Promise<AccountResult> =>
      ipcRenderer.invoke('account:skin:apply', id, variant),
    resetSkin: (): Promise<AccountResult> => ipcRenderer.invoke('account:skin:reset'),
    setCape: (capeId: string | null): Promise<AccountResult> =>
      ipcRenderer.invoke('account:cape:set', capeId)
  }
}

contextBridge.exposeInMainWorld('launcher', api)
