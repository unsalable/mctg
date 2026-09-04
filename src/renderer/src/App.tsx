import { AnimatePresence } from 'framer-motion'
import { useEffect } from 'react'
import AmbientBackground from './components/AmbientBackground'
import AppNav from './components/AppNav'
import TitleBar from './components/TitleBar'
import Toast from './components/Toast'
import BootScreen from './screens/BootScreen'
import LauncherShell from './screens/LauncherShell'
import LoginScreen from './screens/LoginScreen'
import SiteLoginScreen from './screens/SiteLoginScreen'
import { useAccountStore } from './stores/useAccountStore'
import { useAuthStore } from './stores/useAuthStore'
import { useGameStore } from './stores/useGameStore'
import { useServerStore } from './stores/useServerStore'
import { useSettingsStore } from './stores/useSettingsStore'
import { useSiteStore } from './stores/useSiteStore'

export default function App() {
  const siteStatus = useSiteStore((s) => s.status)
  const restoreSite = useSiteStore((s) => s.restore)
  const status = useAuthStore((s) => s.status)
  const restore = useAuthStore((s) => s.restore)
  const loadSettings = useSettingsStore((s) => s.load)
  const initGame = useGameStore((s) => s.init)
  const initServer = useServerStore((s) => s.init)
  const resetAccount = useAccountStore((s) => s.reset)

  useEffect(() => {
    initGame()
    initServer()
    void restoreSite()
    void restore()
    void loadSettings()
  }, [restoreSite, restore, loadSettings, initGame, initServer])

  // Çıkış yapıldığında önceki hesabın skin/pelerin verisi bellekte kalmasın.
  useEffect(() => {
    if (status === 'loggedOut') resetAccount()
  }, [status, resetAccount])

  // İki kapı sırayla: önce MCTG site hesabı, sonra Microsoft. İkisi de
  // açılışta paralel denendiği için ikisinin de "booting"i bitmeden karar verilmez.
  const booting = siteStatus === 'booting' || status === 'booting'
  const shellActive = !booting && siteStatus === 'loggedIn' && status === 'loggedIn'

  return (
    <div className="relative flex h-full flex-col">
      <AmbientBackground />
      <TitleBar />
      {/* Gezinme barı başlık çubuğunun boş orta bandına biniyor: sekme içerikleri
          böylece pencerenin üstüne yakın başlıyor, başlıklar aşağı kaymıyor. */}
      {shellActive && (
        <div className="pointer-events-none absolute inset-x-0 top-1.5 z-50 flex justify-center">
          <AppNav />
        </div>
      )}
      <main className="relative flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          {booting ? (
            <BootScreen key="boot" />
          ) : siteStatus !== 'loggedIn' ? (
            <SiteLoginScreen key="site-login" />
          ) : status === 'loggedIn' ? (
            <LauncherShell key="shell" />
          ) : (
            <LoginScreen key="login" />
          )}
        </AnimatePresence>
        <Toast />
      </main>
    </div>
  )
}
