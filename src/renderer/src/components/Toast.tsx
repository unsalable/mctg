import { AnimatePresence, motion } from 'framer-motion'
import { useUiStore } from '../stores/useUiStore'

const TONE_CLASS = {
  info: 'border-line bg-surface text-fg',
  success: 'border-accent-200 bg-accent-50 text-accent-800 dark:border-accent-800 dark:bg-accent-800/20 dark:text-accent-300',
  error: 'border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/60 dark:text-red-300'
} as const

/** Ekranın altında beliren tek satırlık bilgilendirme. */
export default function Toast() {
  const toast = useUiStore((s) => s.toast)
  const hide = useUiStore((s) => s.hideToast)

  return (
    <AnimatePresence>
      {toast && (
        <motion.button
          key={toast.id}
          onClick={hide}
          initial={{ opacity: 0, y: 16, x: '-50%' }}
          animate={{ opacity: 1, y: 0, x: '-50%' }}
          exit={{ opacity: 0, y: 16, x: '-50%' }}
          className={`absolute bottom-6 left-1/2 z-50 max-w-[520px] rounded-full border px-5 py-2.5 text-sm shadow-[0_12px_40px_-12px_rgba(0,0,0,0.35)] ${TONE_CLASS[toast.tone]}`}
        >
          {toast.message}
        </motion.button>
      )}
    </AnimatePresence>
  )
}
