import { AnimatePresence, motion } from 'framer-motion'
import { Coffee, FolderGit2, MemoryStick, X } from 'lucide-react'
import { useAuthStore } from '../stores/useAuthStore'
import { useProfileStore } from '../stores/useProfileStore'
import { useSettingsStore } from '../stores/useSettingsStore'
import { useUiStore } from '../stores/useUiStore'

const RAM_MIN = 2
const RAM_MAX = 16

function RamSection() {
  const ramGb = useSettingsStore((s) => s.ramGb)
  const systemRamGb = useSettingsStore((s) => s.systemRamGb)
  const loaded = useSettingsStore((s) => s.loaded)
  const setRamGb = useSettingsStore((s) => s.setRamGb)

  const fillPercent = ((ramGb - RAM_MIN) / (RAM_MAX - RAM_MIN)) * 100
  const tooHigh = systemRamGb !== null && ramGb > Math.max(RAM_MIN, systemRamGb - 2)

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <MemoryStick size={18} className="shrink-0 text-accent-600" />
          <div>
            <p className="text-sm font-medium text-zinc-900">Bellek (RAM)</p>
            <p className="mt-0.5 text-xs text-zinc-500">Oyuna ayrılacak maksimum bellek</p>
          </div>
        </div>
        <span className="text-lg font-bold tabular-nums text-accent-700">{ramGb} GB</span>
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
          background: `linear-gradient(to right, var(--color-accent-500) ${fillPercent}%, #e4e4e7 ${fillPercent}%)`
        }}
      />
      <div className="mt-1.5 flex justify-between text-[10px] text-zinc-400">
        <span>{RAM_MIN} GB</span>
        <span>{RAM_MAX} GB</span>
      </div>

      {systemRamGb !== null && (
        <p className="mt-2 text-[11px] text-zinc-500">
          Sistem belleği: {systemRamGb} GB
          {tooHigh && (
            <span className="text-amber-600"> — seçim, sistemine göre yüksek olabilir.</span>
          )}
        </p>
      )}
    </div>
  )
}

function ModRepoSection() {
  const modRepo = useSettingsStore((s) => s.modRepo)
  const loaded = useSettingsStore((s) => s.loaded)
  const setModRepo = useSettingsStore((s) => s.setModRepo)
  const warning = useProfileStore((s) => s.warning)

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2.5">
        <FolderGit2 size={18} className="shrink-0 text-accent-600" />
        <div>
          <p className="text-sm font-medium text-zinc-900">Mod Deposu (GitHub)</p>
          <p className="mt-0.5 text-xs text-zinc-500">
            Profiller ve anti-hile mod senkronu bu repodan yönetilir
          </p>
        </div>
      </div>

      <input
        type="text"
        spellCheck={false}
        disabled={!loaded}
        value={modRepo}
        onChange={(e) => setModRepo(e.target.value)}
        placeholder="kullanici/repo veya github.com adresi"
        className="settings-input mt-3 disabled:opacity-50"
      />
      <p className="mt-2 text-[11px] leading-relaxed text-zinc-400">
        Repo kökünde <span className="font-mono">profiles.json</span> bulunmalı.{' '}
        <span className="font-mono">kullanici/repo@dal</span> yazarak dal seçebilirsin. Boş
        bırakılırsa yalnızca Vanilla profili görünür.
      </p>
      {warning && <p className="mt-1.5 text-[11px] text-amber-600">{warning}</p>}
    </div>
  )
}

function JavaInfoSection() {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      <Coffee size={18} className="mt-0.5 shrink-0 text-accent-600" />
      <div>
        <p className="text-sm font-medium text-zinc-900">Java Yönetimi</p>
        <p className="mt-0.5 text-xs leading-relaxed text-zinc-500">
          Otomatik: sürümün gerektirdiği Java yüklüyse doğrulanır, değilse Mojang'ın resmi
          sürümü arka planda indirilir.
        </p>
      </div>
    </div>
  )
}

export default function SettingsPanel() {
  const loggedIn = useAuthStore((s) => s.status === 'loggedIn')
  const open = useUiStore((s) => s.settingsOpen)
  const setOpen = useUiStore((s) => s.setSettingsOpen)

  return (
    <AnimatePresence>
      {open && loggedIn && (
        <>
          <motion.div
            key="settings-backdrop"
            className="absolute inset-0 z-30 bg-zinc-900/25"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
          />
          <motion.aside
            key="settings-panel"
            className="absolute inset-y-0 right-0 z-40 w-[380px] overflow-y-auto border-l border-zinc-200 bg-[#fafbfc] p-6"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-zinc-900">Ayarlar</h2>
              <button
                onClick={() => setOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
              >
                <X size={16} />
              </button>
            </div>

            <div className="mt-6 space-y-4">
              <RamSection />
              <ModRepoSection />
              <JavaInfoSection />
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
