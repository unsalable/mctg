import { motion } from 'framer-motion'

export default function BootScreen() {
  return (
    <motion.div
      className="flex h-full flex-col items-center justify-center gap-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="h-12 w-12 rounded-2xl bg-gradient-to-br from-accent-500 to-accent-700 shadow-lg shadow-accent-600/20"
        animate={{ scale: [1, 1.08, 1] }}
        transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
      />
      <p className="text-sm text-subtle">Oturum denetleniyor…</p>
    </motion.div>
  )
}
