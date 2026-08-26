import { AnimatePresence, motion } from 'framer-motion'
import { Check, ChevronDown, FolderGit2, RefreshCw } from 'lucide-react'
import { useState } from 'react'
import { useGameStore } from '../stores/useGameStore'
import { useProfileStore } from '../stores/useProfileStore'

export default function ProfileSelector() {
  const [open, setOpen] = useState(false)
  const profiles = useProfileStore((s) => s.profiles)
  const selectedId = useProfileStore((s) => s.selectedId)
  const warning = useProfileStore((s) => s.warning)
  const repo = useProfileStore((s) => s.repo)
  const loading = useProfileStore((s) => s.loading)
  const load = useProfileStore((s) => s.load)
  const select = useProfileStore((s) => s.select)
  const gameBusy = useGameStore((s) => s.ui !== 'idle')

  const selected = profiles.find((p) => p.id === selectedId)

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={gameBusy}
        className="flex h-9 items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 text-sm text-zinc-500 shadow-sm transition-colors hover:bg-zinc-50 disabled:opacity-50"
      >
        <FolderGit2 size={14} className="text-zinc-400" />
        Profil: <span className="font-medium text-zinc-900">{selected?.name ?? '…'}</span>
        <ChevronDown
          size={14}
          className={`text-zinc-400 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.97 }}
              transition={{ duration: 0.16 }}
              className="absolute bottom-11 left-1/2 z-20 w-72 -translate-x-1/2 rounded-xl border border-zinc-200 bg-white p-1.5 shadow-[0_16px_50px_-16px_rgba(16,24,40,0.25)]"
            >
              <div className="flex items-center justify-between px-3 pb-1 pt-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                  Profiller
                </p>
                <button
                  title="Yenile"
                  onClick={() => void load()}
                  className="flex h-6 w-6 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
                >
                  <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
                </button>
              </div>

              <div className="max-h-64 space-y-0.5 overflow-y-auto">
                {profiles.map((profile) => {
                  const isSelected = profile.id === selectedId
                  return (
                    <button
                      key={profile.id}
                      onClick={() => {
                        select(profile.id)
                        setOpen(false)
                      }}
                      className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                        isSelected ? 'bg-accent-50' : 'hover:bg-zinc-50'
                      }`}
                    >
                      <Check
                        size={14}
                        className={`shrink-0 ${isSelected ? 'text-accent-600' : 'text-transparent'}`}
                      />
                      <div className="min-w-0">
                        <p className="truncate font-medium text-zinc-800">{profile.name}</p>
                        <p className="truncate text-xs text-zinc-400">
                          Minecraft {profile.mcVersion}
                          {profile.description ? ` • ${profile.description}` : ''}
                        </p>
                      </div>
                    </button>
                  )
                })}
              </div>

              {warning && (
                <p className="px-3 py-2 text-[11px] leading-relaxed text-amber-600">{warning}</p>
              )}
              {!repo && !warning && (
                <p className="px-3 py-2 text-[11px] leading-relaxed text-zinc-400">
                  Mod profilleri için Ayarlar'dan bir GitHub deposu ekleyebilirsin.
                </p>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
