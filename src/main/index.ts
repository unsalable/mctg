import { app, BrowserWindow, shell } from 'electron'
import { join } from 'path'
import { registerIpc } from './ipc'
import { serverStatusService } from './services/ServerStatusService'

function createWindow(): void {
  const win = new BrowserWindow({
    title: 'MCTG Launcher',
    width: 1200,
    height: 740,
    minWidth: 1000,
    minHeight: 640,
    frame: false,
    show: false,
    backgroundColor: '#f4f5f7',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  win.on('ready-to-show', () => win.show())

  // Launcher açılır açılmaz MCTG sunucusuna bağlanmayı dener; başarısız
  // olursa kendi kendine tekrar dener (bkz. ServerStatusService).
  serverStatusService.watch(win)

  // Dış bağlantılar uygulama içinde değil, varsayılan tarayıcıda açılır.
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  app.setAppUserModelId('com.mctg.launcher')
  registerIpc()
  createWindow()
  serverStatusService.start()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
