import { motion } from 'framer-motion'
import { Loader2, Play } from 'lucide-react'
import type { GameProgress } from '../../../shared/types'

interface PlayButtonProps {
  ui: 'idle' | 'preparing' | 'running'
  progress: GameProgress | null
  onClick: () => void
}

export default function PlayButton({ ui, progress, onClick }: PlayButtonProps) {
  const busy = ui !== 'idle'
  const percent = progress?.percent ?? null

  return (
    <motion.button
      onClick={onClick}
      disabled={busy}
      whileHover={busy ? undefined : { scale: 1.03 }}
      whileTap={busy ? undefined : { scale: 0.97 }}
      className={`group relative flex h-[72px] w-full items-center justify-center gap-3 overflow-hidden rounded-2xl transition-shadow ${
        ui === 'preparing'
          ? 'cursor-default border border-line bg-surface text-fg shadow-sm'
          : ui === 'running'
            ? 'cursor-default border border-accent-200 bg-accent-50 text-accent-800 dark:border-accent-800 dark:bg-accent-800/20 dark:text-accent-300'
            : 'bg-gradient-to-b from-accent-500 to-accent-600 text-white shadow-[0_10px_32px_-10px_rgba(22,163,74,0.55)] hover:shadow-[0_12px_40px_-10px_rgba(22,163,74,0.7)]'
      }`}
    >
      {/* İndirme aşamasında buton içini dolduran ilerleme katmanı */}
      {ui === 'preparing' && percent !== null && (
        <motion.span
          className="absolute inset-y-0 left-0 bg-accent-500/15"
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ ease: 'easeOut', duration: 0.2 }}
        />
      )}

      {ui === 'idle' && (
        <>
          <span className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/20 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
          <Play size={22} fill="currentColor" />
          <span className="text-xl font-extrabold tracking-[0.25em]">OYNA</span>
        </>
      )}

      {ui === 'preparing' && (
        <span className="relative flex flex-col items-center gap-0.5 px-4">
          <span className="flex items-center gap-2 text-sm font-semibold">
            <Loader2 size={15} className="animate-spin text-accent-600" />
            {progress?.label ?? 'Hazırlanıyor…'}
          </span>
          {percent !== null && (
            <span className="text-xs font-bold tabular-nums text-accent-600">
              %{Math.floor(percent)}
            </span>
          )}
        </span>
      )}

      {ui === 'running' && (
        <span className="relative flex items-center gap-2.5 text-base font-bold tracking-wider">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent-500 opacity-60" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-accent-600" />
          </span>
          OYUN ÇALIŞIYOR
        </span>
      )}
    </motion.button>
  )
}
