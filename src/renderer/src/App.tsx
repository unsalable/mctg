import { AnimatePresence } from 'framer-motion'
import { useEffect } from 'react'
import AmbientBackground from './components/AmbientBackground'
import SettingsPanel from './components/SettingsPanel'
import TitleBar from './components/TitleBar'
import BootScreen from './screens/BootScreen'
import HomeScreen from './screens/HomeScreen'
import LoginScreen from './screens/LoginScreen'
import { useAuthStore } from './stores/useAuthStore'
import { useGameStore } from './stores/useGameStore'
import { useSettingsStore } from './stores/useSettingsStore'

export default function App() {
  const status = useAuthStore((s) => s.status)
  const restore = useAuthStore((s) => s.restore)
  const loadSettings = useSettingsStore((s) => s.load)
  const initGame = useGameStore((s) => s.init)

  useEffect(() => {
    initGame()
    void restore()
    void loadSettings()
  }, [restore, loadSettings, initGame])

  return (
    <div className="relative flex h-full flex-col">
      <AmbientBackground />
      <TitleBar />
      <main className="relative flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          {status === 'booting' ? (
            <BootScreen key="boot" />
          ) : status === 'loggedIn' ? (
            <HomeScreen key="home" />
          ) : (
            <LoginScreen key="login" />
          )}
        </AnimatePresence>
        <SettingsPanel />
      </main>
    </div>
  )
}
