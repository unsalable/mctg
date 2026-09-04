import { motion } from 'framer-motion'
import { Check, Lock, RefreshCw, Search, Server, Sparkles } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useGameStore } from '../stores/useGameStore'
import { useSiteStore } from '../stores/useSiteStore'
import { useVersionStore } from '../stores/useVersionStore'

const MAX_ROWS = 200

function formatDate(timestamp: number | null): string | null {
  if (!timestamp) return null
  return new Date(timestamp).toLocaleString('tr-TR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

/**
 * Sürüm sekmesi.
 *
 * Sürümü yönetici siteden belirler ve o seçim bütün oyunculara iner; burası
 * yönetici olmayan için SALT BİLGİ. Böylece herkes sunucunun çalıştığı
 * sürümle oyuna girer, "ben 1.20.1 seçmiştim" diye ayrılan kimse kalmaz.
 */
export default function VersionsView() {
  const versions = useVersionStore((s) => s.versions)
  const latestRelease = useVersionStore((s) => s.latestRelease)
  const listWarning = useVersionStore((s) => s.warning)
  const loading = useVersionStore((s) => s.loading)
  const load = useVersionStore((s) => s.load)

  const config = useSiteStore((s) => s.config)
  const configError = useSiteStore((s) => s.configError)
  const configLoading = useSiteStore((s) => s.configLoading)
  const loadConfig = useSiteStore((s) => s.loadConfig)
  const setVersion = useSiteStore((s) => s.setVersion)
  const isAdmin = useSiteStore((s) => Boolean(s.user?.isAdmin))

  const gameBusy = useGameStore((s) => s.ui !== 'idle')
  const [query, setQuery] = useState('')
  const [saving, setSaving] = useState<string | null>(null)

  const activeVersion = config?.mcVersion ?? null
  const updatedAt = formatDate(config?.updatedAt ?? null)

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (needle === '') return versions
    return versions.filter((version) => version.id.toLowerCase().includes(needle))
  }, [versions, query])

  const choose = async (id: string): Promise<void> => {
    if (gameBusy || saving || id === activeVersion) return
    setSaving(id)
    try {
      await setVersion(id)
    } finally {
      setSaving(null)
    }
  }

  const refresh = (): void => {
    void loadConfig()
    void load()
  }

  return (
    <motion.div
      className="flex h-full flex-col"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.28, ease: 'easeOut' }}
    >
      <header className="flex shrink-0 items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-fg">Sürüm</h2>
          <p className="mt-1 text-sm text-muted">
            {isAdmin
              ? 'Seçtiğin sürüm bütün oyuncuların launcher’ında geçerli olur.'
              : 'Sunucunun çalıştığı sürüm — yönetici belirler.'}
          </p>
        </div>
        <button
          onClick={refresh}
          className="flex h-9 items-center gap-2 rounded-lg border border-line bg-surface px-3 text-sm text-muted transition-colors hover:bg-elevated"
        >
          <RefreshCw size={14} className={loading || configLoading ? 'animate-spin' : ''} />
          Yenile
        </button>
      </header>

      {/* Yürürlükteki sürüm — herkeste aynı */}
      <div className="mt-4 shrink-0 rounded-2xl border border-accent-500 bg-accent-50 p-4 dark:bg-accent-800/15">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-500 text-white">
            <Server size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted">
              Yürürlükteki sürüm
            </p>
            <p className="truncate text-xl font-bold text-fg">
              {activeVersion ? `Minecraft ${activeVersion}` : configLoading ? 'Yükleniyor…' : '—'}
            </p>
          </div>
          {!isAdmin && (
            <span className="flex shrink-0 items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-[11px] font-medium text-muted">
              <Lock size={12} />
              Kilitli
            </span>
          )}
        </div>

        <p className="mt-3 text-xs leading-relaxed text-muted">
          {updatedAt
            ? `${updatedAt} tarihinde ${config?.updatedBy ?? 'yönetici'} tarafından ayarlandı.`
            : 'Henüz elle ayarlanmadı; sunucunun varsayılan sürümü kullanılıyor.'}
          {config && ` Oyun açılışta ${config.server.host} adresine bağlanır.`}
        </p>

        {config?.warning && <p className="mt-1.5 text-[11px] text-amber-600">{config.warning}</p>}
        {configError && <p className="mt-1.5 text-[11px] text-red-600">{configError}</p>}
      </div>

      {!isAdmin ? (
        <div className="mt-4 flex flex-1 items-center justify-center">
          <div className="max-w-sm text-center">
            <Lock size={28} className="mx-auto text-subtle" />
            <p className="mt-3 text-sm font-medium text-fg">Sürüm değiştirilemez</p>
            <p className="mt-1.5 text-xs leading-relaxed text-muted">
              Herkesin aynı sürümle oynaması için sürümü yalnızca yönetici değiştirebilir. Burası
              yürürlükteki sürümü görmen için.
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="mt-4 flex shrink-0 items-center gap-2">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-subtle" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Sürüm ara (ör. 1.20.1)"
                className="settings-input pl-8"
              />
            </div>
          </div>

          {listWarning && (
            <p className="mt-3 shrink-0 rounded-lg border border-amber-300/60 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
              {listWarning}
            </p>
          )}

          <div className="scroll-thin mt-3 min-h-0 flex-1 overflow-y-auto pr-1">
            <div className="space-y-1 pb-2">
              {filtered.slice(0, MAX_ROWS).map((version) => {
                const isActive = version.id === activeVersion
                return (
                  <button
                    key={version.id}
                    onClick={() => void choose(version.id)}
                    disabled={gameBusy || saving !== null}
                    className={`flex w-full items-center gap-3 rounded-xl border px-4 py-2.5 text-left transition-colors disabled:opacity-60 ${
                      isActive
                        ? 'border-accent-500 bg-accent-50 dark:bg-accent-800/15'
                        : 'border-line bg-surface hover:bg-elevated'
                    }`}
                  >
                    <span className="min-w-0 flex-1 truncate font-medium text-fg">{version.id}</span>

                    {version.id === latestRelease && (
                      <span className="flex shrink-0 items-center gap-1 rounded-md bg-accent-100 px-2 py-0.5 text-[10px] font-semibold text-accent-700 dark:bg-accent-800/30 dark:text-accent-300">
                        <Sparkles size={10} /> En son
                      </span>
                    )}
                    {config?.supportedVersions.includes(version.id) && (
                      <span className="shrink-0 rounded-md bg-elevated px-2 py-0.5 text-[10px] font-medium text-muted">
                        Modlar hazır
                      </span>
                    )}

                    <span className="w-24 shrink-0 text-right text-[11px] tabular-nums text-subtle">
                      {version.releaseTime.slice(0, 10)}
                    </span>
                    {saving === version.id ? (
                      <RefreshCw size={16} className="shrink-0 animate-spin text-accent-600" />
                    ) : (
                      <Check
                        size={16}
                        className={`shrink-0 ${isActive ? 'text-accent-600' : 'text-transparent'}`}
                      />
                    )}
                  </button>
                )
              })}
            </div>

            {filtered.length === 0 && (
              <p className="mt-8 text-center text-sm text-subtle">
                {loading ? 'Sürümler yükleniyor…' : 'Eşleşen sürüm yok.'}
              </p>
            )}
            {filtered.length > MAX_ROWS && (
              <p className="pb-2 text-center text-[11px] text-subtle">
                {filtered.length - MAX_ROWS} sürüm daha var — aramayı daraltarak bulabilirsin.
              </p>
            )}
          </div>
        </>
      )}
    </motion.div>
  )
}
