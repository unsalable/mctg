import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import type {
  AuthResult,
  GameExitInfo,
  GameProgress,
  LauncherApi,
  LauncherSettings,
  PlayResult,
  ProfilesSnapshot,
  SettingsSnapshot
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
  }
}

contextBridge.exposeInMainWorld('launcher', api)
