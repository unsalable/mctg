import { AnimatePresence, motion } from 'framer-motion'
import { useEffect } from 'react'
import { useAccountStore } from '../stores/useAccountStore'
import { useAuthStore } from '../stores/useAuthStore'
import { useGameStore } from '../stores/useGameStore'
import { useProfileStore } from '../stores/useProfileStore'
import { useSiteStore } from '../stores/useSiteStore'
import { useUiStore } from '../stores/useUiStore'
import { useVersionStore } from '../stores/useVersionStore'
import AccountView from '../views/AccountView'
import PlayView from '../views/PlayView'
import ProfilesView from '../views/ProfilesView'
import SettingsView from '../views/SettingsView'
import VersionsView from '../views/VersionsView'

/** Giriş yapıldıktan sonraki ana kabuk: üstte gezinme barı, altında etkin sekme. */
export default function LauncherShell() {
  const session = useAuthStore((s) => s.session)
  const tab = useUiStore((s) => s.tab)
  const showToast = useUiStore((s) => s.showToast)
  const loadProfiles = useProfileStore((s) => s.load)
  const loadConfig = useSiteStore((s) => s.loadConfig)
  const isAdmin = useSiteStore((s) => Boolean(s.user?.isAdmin))
  const loadVersions = useVersionStore((s) => s.load)
  const versionsLoaded = useVersionStore((s) => s.loaded)
  const loadAccount = useAccountStore((s) => s.load)
  const gameError = useGameStore((s) => s.error)
  const clearError = useGameStore((s) => s.clearError)

  useEffect(() => {
    void loadProfiles()
    void loadConfig()
  }, [loadProfiles, loadConfig])

  // Mojang sürüm listesi yalnızca yöneticiye lazım — seçim yapabilen tek kişi o.
  // Hesap bilgisi de yalnızca ilgili sekmeye girilince çekilir.
  useEffect(() => {
    if (tab === 'versions' && isAdmin && !versionsLoaded) void loadVersions()
    if (tab === 'account') void loadAccount()
  }, [tab, isAdmin, versionsLoaded, loadVersions, loadAccount])

  useEffect(() => {
    if (gameError) {
      showToast(gameError, 'error')
      clearError()
    }
  }, [gameError, clearError, showToast])

  if (!session) return null

  return (
    <motion.div
      className="flex h-full flex-col"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
    >
      {/* Gezinme barı App katmanında başlık çubuğunun boş orta bandına biniyor
          (main'in overflow'u onu kırpardı); burada sadece altına boşluk bırakıyoruz. */}
      <div className="min-h-0 flex-1 px-6 pb-6 pt-10">
        <AnimatePresence mode="wait">
          {tab === 'home' && <PlayView key="home" />}
          {tab === 'profiles' && <ProfilesView key="profiles" />}
          {tab === 'versions' && <VersionsView key="versions" />}
          {tab === 'account' && <AccountView key="account" />}
          {tab === 'settings' && <SettingsView key="settings" />}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
