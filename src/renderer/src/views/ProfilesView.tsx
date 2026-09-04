import { motion } from 'framer-motion'
import { Boxes, Check, Package, RefreshCw } from 'lucide-react'
import { VANILLA_PROFILE_ID } from '../../../shared/constants'
import { useGameStore } from '../stores/useGameStore'
import { useProfileStore } from '../stores/useProfileStore'
import { useUiStore } from '../stores/useUiStore'

export default function ProfilesView() {
  const profiles = useProfileStore((s) => s.profiles)
  const selectedId = useProfileStore((s) => s.selectedId)
  const warning = useProfileStore((s) => s.warning)
  const loading = useProfileStore((s) => s.loading)
  const load = useProfileStore((s) => s.load)
  const select = useProfileStore((s) => s.select)
  const gameBusy = useGameStore((s) => s.ui !== 'idle')
  const showToast = useUiStore((s) => s.showToast)

  const handleSelect = (id: string, name: string): void => {
    if (gameBusy) return
    select(id)
    showToast(`Profil seçildi: ${name}`, 'success')
  }

  return (
    <motion.div
      className="flex h-full flex-col"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.28, ease: 'easeOut' }}
    >
      <header className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-fg">Profiller</h2>
          <p className="mt-1 text-sm text-muted">
            Mod paketini seç — oyun her açılışta bu profilin modlarıyla eşitlenir.
          </p>
        </div>
        <button
          onClick={() => void load()}
          className="flex h-9 items-center gap-2 rounded-lg border border-line bg-surface px-3 text-sm text-muted transition-colors hover:bg-elevated"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Yenile
        </button>
      </header>

      {warning && (
        <p className="mt-4 rounded-lg border border-amber-300/60 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
          {warning}
        </p>
      )}

      <div className="scroll-thin mt-4 min-h-0 flex-1 overflow-y-auto pr-1">
        <div className="grid grid-cols-2 gap-3 pb-2">
          {profiles.map((profile) => {
            const isSelected = profile.id === selectedId
            return (
              <button
                key={profile.id}
                onClick={() => handleSelect(profile.id, profile.name)}
                disabled={gameBusy}
                className={`group flex items-start gap-3 rounded-2xl border p-4 text-left transition-colors disabled:opacity-60 ${
                  isSelected
                    ? 'border-accent-500 bg-accent-50 dark:bg-accent-800/15'
                    : 'border-line bg-surface hover:bg-elevated'
                }`}
              >
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                    isSelected ? 'bg-accent-500 text-white' : 'bg-elevated text-muted'
                  }`}
                >
                  {profile.id === VANILLA_PROFILE_ID ? <Boxes size={18} /> : <Package size={18} />}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-semibold text-fg">{profile.name}</p>
                    {isSelected && <Check size={14} className="shrink-0 text-accent-600" />}
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-xs text-muted">
                    {profile.description ?? 'Açıklama yok'}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <span className="rounded-md bg-elevated px-2 py-0.5 text-[10px] font-medium text-muted">
                      {profile.mcVersion ? `Minecraft ${profile.mcVersion}` : 'Sunucu sürümü'}
                    </span>
                    <span
                      className={`rounded-md px-2 py-0.5 text-[10px] font-medium ${
                        profile.loader === 'fabric'
                          ? 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300'
                          : 'bg-elevated text-muted'
                      }`}
                    >
                      {profile.loader === 'fabric' ? 'Fabric' : 'Vanilla'}
                    </span>
                    {/* Sitedeki sahiplik bilgisi: hangi paket sunucunun resmî
                        paketi, hangisi oyuncunun kendi yüklediği. */}
                    {profile.official && (
                      <span className="rounded-md bg-accent-100 px-2 py-0.5 text-[10px] font-medium text-accent-700 dark:bg-accent-800/30 dark:text-accent-300">
                        Sunucu paketi
                      </span>
                    )}
                    {!profile.official && profile.mine && (
                      <span className="rounded-md bg-elevated px-2 py-0.5 text-[10px] font-medium text-muted">
                        Benim
                      </span>
                    )}
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        {profiles.length === 0 && !loading && (
          <p className="mt-8 text-center text-sm text-subtle">Profil bulunamadı.</p>
        )}
      </div>

      <p className="mt-3 shrink-0 text-[11px] text-subtle">
        Profiller ve mod dosyaları <span className="font-mono">mctg.com.tr</span> üzerinden
        dağıtılır; sitede yapılan değişiklik bir sonraki OYNA’da iner.
      </p>
    </motion.div>
  )
}
