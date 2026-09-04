import { motion } from 'framer-motion'

/** Zemin üzerinde çok hafif, yavaş süzülen renk yumuşamaları — açık ve siyah temada da sade durur. */
export default function AmbientBackground() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <motion.div
        className="absolute -left-48 top-1/4 h-[480px] w-[480px] rounded-full bg-accent-200/40 blur-3xl dark:bg-accent-700/12"
        animate={{ x: [0, 50, 0], y: [0, -30, 0] }}
        transition={{ duration: 26, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute -right-48 bottom-0 h-[520px] w-[520px] rounded-full bg-sky-200/30 blur-3xl dark:bg-sky-800/12"
        animate={{ x: [0, -40, 0], y: [0, 25, 0] }}
        transition={{ duration: 30, repeat: Infinity, ease: 'easeInOut' }}
      />
      <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-white/60 to-transparent dark:from-white/[0.03]" />
    </div>
  )
}
