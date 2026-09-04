import { motion } from 'framer-motion'
import { Coffee, LogOut, MemoryStick, Moon, ShieldCheck, Sun } from 'lucide-react'
import type { ThemeMode } from '../../../shared/types'
import FaceAvatar from '../components/FaceAvatar'
import { useAuthStore } from '../stores/useAuthStore'
import { useSettingsStore } from '../stores/useSettingsStore'
import { useSiteStore } from '../stores/useSiteStore'

const RAM_MIN = 2
const RAM_MAX = 16

function ThemeSection() {
  const theme = useSettingsStore((s) => s.theme)
  const setTheme = useSettingsStore((s) => s.setTheme)

  const options: Array<{ value: ThemeMode; label: string; hint: string; preview: string }> = [
    { value: 'light', label: 'Açık', hint: 'Varsayılan aydınlık zemin', preview: '#f4f5f7' },
    { value: 'dark', label: 'Siyah', hint: 'Tam siyah zemin, düşük parlaklık', preview: '#000000' }
  ]

  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <div className="flex items-center gap-2.5">
        {theme === 'dark' ? (
          <Moon size={18} className="shrink-0 text-accent-600" />
        ) : (
          <Sun size={18} className="shrink-0 text-accent-600" />
        )}
        <div>
          <p className="text-sm font-medium text-fg">Görünüm</p>
          <p className="mt-0.5 text-xs text-muted">Launcher arka planı ve panel renkleri</p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        {options.map((option) => (
          <button
            key={option.value}
            onClick={() => setTheme(option.value)}
            className={`flex items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
              theme === option.value
                ? 'border-accent-500 bg-accent-50 dark:bg-accent-800/15'
                : 'border-line bg-elevated hover:bg-surface'
            }`}
          >
            <span
              className="h-9 w-9 shrink-0 rounded-lg border border-line"
              style={{ background: option.preview }}
            />
            <span className="min-w-0">
              <span className="block text-sm font-medium text-fg">{option.label}</span>
              <span className="block truncate text-[11px] text-muted">{option.hint}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

function RamSection() {
  const ramGb = useSettingsStore((s) => s.ramGb)
  const systemRamGb = useSettingsStore((s) => s.systemRamGb)
  const loaded = useSettingsStore((s) => s.loaded)
  const setRamGb = useSettingsStore((s) => s.setRamGb)

  const fillPercent = ((ramGb - RAM_MIN) / (RAM_MAX - RAM_MIN)) * 100
  const tooHigh = systemRamGb !== null && ramGb > Math.max(RAM_MIN, systemRamGb - 2)

  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <MemoryStick size={18} className="shrink-0 text-accent-600" />
          <div>
            <p className="text-sm font-medium text-fg">Bellek (RAM)</p>
            <p className="mt-0.5 text-xs text-muted">Oyuna ayrılacak maksimum bellek</p>
          </div>
        </div>
        <span className="text-lg font-bold tabular-nums text-accent-600">{ramGb} GB</span>
      </div>

      <input
        type="range"
        min={RAM_MIN}
        max={RAM_MAX}
        step={1}
        value={ramGb}
        disabled={!loaded}
        onChange={(e) => setRamGb(Number(e.target.value))}
        className="ram-slider mt-4 w-full disabled:opacity-50"
        style={{
          background: `linear-gradient(to right, var(--color-accent-500) ${fillPercent}%, var(--color-line) ${fillPercent}%)`
        }}
      />
      <div className="mt-1.5 flex justify-between text-[10px] text-subtle">
        <span>{RAM_MIN} GB</span>
        <span>{RAM_MAX} GB</span>
      </div>

      {systemRamGb !== null && (
        <p className="mt-2 text-[11px] text-muted">
          Sistem belleği: {systemRamGb} GB
          {tooHigh && (
            <span className="text-amber-600"> — seçim, sistemine göre yüksek olabilir.</span>
          )}
        </p>
      )}
    </div>
  )
}

function MicrosoftLogo() {
  return (
    <svg width="16" height="16" viewBox="0 0 21 21" aria-hidden>
      <rect x="1" y="1" width="9" height="9" fill="#f25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
      <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
      <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
    </svg>
  )
}

/**
 * İki hesap, iki ayrı çıkış.
 *
 * MCTG hesabından çıkmak launcher'ı en baştaki kapıya döndürür; Microsoft
 * hesabından çıkmak yalnızca oyun oturumunu bırakır, site oturumu açık kalır.
 */
function AccountsSection() {
  const siteUser = useSiteStore((s) => s.user)
  const siteLogout = useSiteStore((s) => s.logout)
  const session = useAuthStore((s) => s.session)
  const msLogout = useAuthStore((s) => s.logout)

  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <div className="flex items-center gap-2.5">
        <ShieldCheck size={18} className="shrink-0 text-accent-600" />
        <div>
          <p className="text-sm font-medium text-fg">Hesaplar</p>
          <p className="mt-0.5 text-xs text-muted">
            Launcher iki hesap kullanır: MCTG üyeliği ve Minecraft'ın Microsoft hesabı
          </p>
        </div>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {/* MCTG site hesabı */}
        <div className="flex flex-col rounded-lg border border-line bg-elevated p-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-500 text-sm font-bold text-white">
              {siteUser?.username.slice(0, 1).toLocaleUpperCase('tr') ?? '?'}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-fg">
                {siteUser?.username ?? 'Bilinmiyor'}
              </p>
              <p className="truncate text-[11px] text-subtle">{siteUser?.email ?? 'MCTG hesabı'}</p>
            </div>
          </div>

          <div className="mt-2 flex items-center gap-1.5">
            <span className="rounded-md bg-surface px-2 py-0.5 text-[10px] font-medium text-muted">
              MCTG hesabı
            </span>
            {siteUser?.isAdmin && (
              <span className="rounded-md bg-accent-100 px-2 py-0.5 text-[10px] font-semibold text-accent-700 dark:bg-accent-800/30 dark:text-accent-300">
                Yönetici
              </span>
            )}
          </div>

          <button
            onClick={() => void siteLogout()}
            className="mt-3 flex h-9 items-center justify-center gap-2 rounded-lg border border-line bg-surface text-sm font-medium text-muted transition-colors hover:border-red-300 hover:text-red-600"
          >
            <LogOut size={14} />
            MCTG hesabından çık
          </button>
        </div>

        {/* Microsoft / Minecraft hesabı */}
        <div className="flex flex-col rounded-lg border border-line bg-elevated p-3">
          <div className="flex min-w-0 items-center gap-2.5">
            {session?.skinDataUrl ? (
              <FaceAvatar skin={session.skinDataUrl} size={36} />
            ) : (
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface">
                <MicrosoftLogo />
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-fg">
                {session?.name ?? 'Bilinmiyor'}
              </p>
              <p className="truncate font-mono text-[10px] text-subtle">
                {session?.uuid ?? 'Microsoft hesabı'}
              </p>
            </div>
          </div>

          <div className="mt-2 flex items-center gap-1.5">
            <span className="flex items-center gap-1.5 rounded-md bg-surface px-2 py-0.5 text-[10px] font-medium text-muted">
              <MicrosoftLogo />
              Microsoft hesabı
            </span>
          </div>

          <button
            onClick={() => void msLogout()}
            className="mt-3 flex h-9 items-center justify-center gap-2 rounded-lg border border-line bg-surface text-sm font-medium text-muted transition-colors hover:border-red-300 hover:text-red-600"
          >
            <LogOut size={14} />
            Microsoft hesabından çık
          </button>
        </div>
      </div>
    </div>
  )
}

function JavaInfoSection() {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-line bg-surface p-4">
      <Coffee size={18} className="mt-0.5 shrink-0 text-accent-600" />
      <div>
        <p className="text-sm font-medium text-fg">Java Yönetimi</p>
        <p className="mt-0.5 text-xs leading-relaxed text-muted">
          Otomatik: sürümün gerektirdiği Java yüklüyse doğrulanır, değilse Mojang'ın resmi sürümü
          arka planda indirilir.
        </p>
      </div>
    </div>
  )
}

export default function SettingsView() {
  return (
    <motion.div
      className="flex h-full flex-col"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.28, ease: 'easeOut' }}
    >
      <header className="shrink-0">
        <h2 className="text-2xl font-bold tracking-tight text-fg">Ayarlar</h2>
        <p className="mt-1 text-sm text-muted">Hesaplar, görünüm, bellek ve oyun altyapısı.</p>
      </header>

      <div className="scroll-thin mt-4 min-h-0 flex-1 overflow-y-auto pr-1">
        <div className="mx-auto max-w-2xl space-y-3 pb-2">
          <AccountsSection />
          <ThemeSection />
          <RamSection />
          <JavaInfoSection />
        </div>
      </div>
    </motion.div>
  )
}
