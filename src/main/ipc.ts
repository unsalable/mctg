import { BrowserWindow, ipcMain } from 'electron'
import type { LauncherSettings, PlayResult } from '../shared/types'
import { authService } from './services/AuthService'
import { gameService } from './services/GameService'
import { profileService } from './services/ProfileService'
import { settingsService } from './services/SettingsService'

export function registerIpc(): void {
  ipcMain.on('window:minimize', (event) => {
    BrowserWindow.fromWebContents(event.sender)?.minimize()
  })

  ipcMain.on('window:close', (event) => {
    BrowserWindow.fromWebContents(event.sender)?.close()
  })

  ipcMain.handle('auth:login', () => authService.login())
  ipcMain.handle('auth:restore', () => authService.restore())
  ipcMain.handle('auth:logout', () => authService.logout())

  ipcMain.handle('settings:get', () => settingsService.snapshot())
  ipcMain.handle('settings:set', (_event, patch: Partial<LauncherSettings>) =>
    settingsService.set(patch)
  )

  ipcMain.handle('game:play', (event): Promise<PlayResult> | PlayResult => {
    const win = BrowserWindow.fromWebContents(event.sender)
    return win ? gameService.play(win) : { ok: false, error: 'Pencere bulunamadı.' }
  })

  ipcMain.handle('profiles:list', () => profileService.list())
}
