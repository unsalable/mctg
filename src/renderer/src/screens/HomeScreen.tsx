import { AnimatePresence, motion } from 'framer-motion'
import { LogOut } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { DEFAULT_MC_VERSION } from '../../../shared/constants'
import FaceAvatar from '../components/FaceAvatar'
import PlayButton from '../components/PlayButton'
import ProfileSelector from '../components/ProfileSelector'
import SkinViewer3D from '../components/SkinViewer3D'
import { useAuthStore } from '../stores/useAuthStore'
import { useGameStore } from '../stores/useGameStore'
import { useProfileStore } from '../stores/useProfileStore'

export default function HomeScreen() {
  const session = useAuthStore((s) => s.session)
  const logout = useAuthStore((s) => s.logout)
  const gameUi = useGameStore((s) => s.ui)
  const gameProgress = useGameStore((s) => s.progress)
  const gameError = useGameStore((s) => s.error)
  const play = useGameStore((s) => s.play)
  const clearError = useGameStore((s) => s.clearError)
  const loadProfiles = useProfileStore((s) => s.load)
  const selectedProfile = useProfileStore((s) => s.profiles.find((p) => p.id === s.selectedId))
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<number | undefined>(undefined)

  const showToast = (message: string) => {
    window.clearTimeout(toastTimer.current)
    setToast(message)
    toastTimer.current = window.setTimeout(() => setToast(null), 4000)
  }

  useEffect(() => {
    void loadProfiles()
  }, [loadProfiles])

  useEffect(() => {
    if (gameError) {
      showToast(gameError)
      clearError()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameError, clearError])

  if (!session) return null

  return (
    <motion.div
      className="flex h-full gap-6 p-6 pt-2"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -24 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
    >
      {/* Sol: incelenebilir 3D skin alanı */}
      <section className="flex w-[360px] shrink-0 flex-col overflow-hidden rounded-3xl border border-zinc-200/80 bg-white shadow-[0_8px_30px_-14px_rgba(16,24,40,0.14)]">
        <div className="min-h-0 flex-1">
          {session.skinDataUrl ? (
            <SkinViewer3D skin={session.skinDataUrl} variant={session.skinVariant} />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-zinc-400">
              Skin yüklenemedi
            </div>
          )}
        </div>
        <div className="flex items-center gap-3 border-t border-zinc-100 p-4">
          {session.skinDataUrl && <FaceAvatar skin={session.skinDataUrl} size={36} />}
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-zinc-900">{session.name}</p>
            <p className="truncate font-mono text-[10px] text-zinc-400">{session.uuid}</p>
          </div>
          <button
            title="Çıkış Yap"
            onClick={() => void logout()}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-600"
          >
            <LogOut size={16} />
          </button>
        </div>
      </section>

      {/* Sağ: karşılama + OYNA + profil seçimi */}
      <section className="flex min-w-0 flex-1 flex-col items-center justify-center gap-8">
        <div className="text-center">
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="text-sm text-zinc-500"
          >
            Tekrar hoş geldin,
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-1 text-4xl font-extrabold tracking-tight text-zinc-900"
          >
            {session.name}
          </motion.h1>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex flex-col items-center gap-4"
        >
          <PlayButton ui={gameUi} progress={gameProgress} onClick={() => void play()} />
          <ProfileSelector />
        </motion.div>

        <p className="text-xs text-zinc-400">
          {selectedProfile
            ? `Minecraft ${selectedProfile.mcVersion} • ${selectedProfile.name}`
            : `Minecraft ${DEFAULT_MC_VERSION}`}
        </p>
      </section>

      {/* Bilgilendirme toast'ı */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 16, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 16, x: '-50%' }}
            className="absolute bottom-6 left-1/2 z-50 rounded-full border border-zinc-200 bg-white px-5 py-2.5 text-sm text-zinc-700 shadow-[0_12px_40px_-12px_rgba(16,24,40,0.3)]"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
