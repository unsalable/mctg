import { BrowserWindow, ipcMain } from 'electron'
import type { AccountResult, AccountSnapshot, LauncherSettings, PlayResult } from '../shared/types'
import { authService } from './services/AuthService'
import { gameService } from './services/GameService'
import { profileService } from './services/ProfileService'
import { serverStatusService } from './services/ServerStatusService'
import { settingsService } from './services/SettingsService'
import { siteService } from './services/SiteService'
import { skinService } from './services/SkinService'
import { versionService } from './services/VersionService'

/** Hesap işlemlerinin hatalarını renderer'a taşınabilir sonuç nesnesine çevirir. */
async function accountResult(
  run: () => Promise<AccountSnapshot | 'cancelled'>
): Promise<AccountResult> {
  try {
    const account = await run()
    if (account === 'cancelled') {
      return { ok: false, error: 'İşlem iptal edildi.', cancelled: true }
    }
    return { ok: true, account }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[account] hata:', message)
    return { ok: false, error: message }
  }
}

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

  ipcMain.handle('site:login', (_event, email: string, password: string) =>
    siteService.login(String(email ?? ''), String(password ?? ''))
  )
  ipcMain.handle('site:restore', () => siteService.restore())
  ipcMain.handle('site:logout', () => siteService.logout())

  ipcMain.handle('site:config', async () => {
    const result = await siteService.config(true)
    // Sunucu adresi yapılandırmadan geliyor; durum görevi de aynı adrese baksın.
    if (result.ok) {
      serverStatusService.setAddress(result.config.server.host, result.config.server.port)
    }
    return result
  })

  ipcMain.handle('site:version:set', (_event, versionId: string) =>
    siteService.setVersion(String(versionId ?? ''))
  )

  ipcMain.handle('server:status', () => serverStatusService.current())
  ipcMain.handle('server:retry', () => serverStatusService.retryNow())

  ipcMain.handle('settings:get', () => settingsService.snapshot())
  ipcMain.handle('settings:set', (_event, patch: Partial<LauncherSettings>) =>
    settingsService.set(patch)
  )

  ipcMain.handle('game:play', (event): Promise<PlayResult> | PlayResult => {
    const win = BrowserWindow.fromWebContents(event.sender)
    return win ? gameService.play(win) : { ok: false, error: 'Pencere bulunamadı.' }
  })

  ipcMain.handle('profiles:list', () => profileService.list())
  ipcMain.handle('versions:list', () => versionService.list())

  ipcMain.handle('account:get', () => accountResult(() => skinService.snapshot()))

  ipcMain.handle('account:skin:add', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    return accountResult(() => skinService.addSkin(win))
  })

  ipcMain.handle('account:skin:remove', (_event, id: string) =>
    accountResult(() => skinService.removeSkin(String(id)))
  )

  ipcMain.handle('account:skin:apply', (_event, id: string, variant: 'classic' | 'slim') =>
    accountResult(() =>
      skinService.applySkin(String(id), variant === 'slim' ? 'slim' : 'classic')
    )
  )

  ipcMain.handle('account:skin:reset', () => accountResult(() => skinService.resetSkin()))

  ipcMain.handle('account:cape:set', (_event, capeId: string | null) =>
    accountResult(() => skinService.setCape(typeof capeId === 'string' ? capeId : null))
  )
}
