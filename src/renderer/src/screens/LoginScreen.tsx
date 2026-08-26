import { AnimatePresence, motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import { useAuthStore } from '../stores/useAuthStore'

function MicrosoftLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 21 21" aria-hidden>
      <rect x="1" y="1" width="9" height="9" fill="#f25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
      <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
      <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
    </svg>
  )
}

export default function LoginScreen() {
  const login = useAuthStore((s) => s.login)
  const status = useAuthStore((s) => s.status)
  const error = useAuthStore((s) => s.error)
  const authenticating = status === 'authenticating'

  return (
    <motion.div
      className="flex h-full items-center justify-center"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -24 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
    >
      <div className="w-[420px] rounded-3xl border border-zinc-200/80 bg-white p-10 shadow-[0_24px_70px_-24px_rgba(16,24,40,0.18)]">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 200, damping: 18 }}
          className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-accent-500 to-accent-700 shadow-lg shadow-accent-600/25"
        >
          <span className="text-2xl font-black text-white">M</span>
        </motion.div>

        <h1 className="mt-6 text-center text-2xl font-bold text-zinc-900">MCTG Launcher</h1>
        <p className="mt-2 text-center text-sm text-zinc-500">
          Devam etmek için Microsoft hesabınla giriş yap.
        </p>

        <motion.button
          whileHover={authenticating ? undefined : { scale: 1.02 }}
          whileTap={authenticating ? undefined : { scale: 0.98 }}
          disabled={authenticating}
          onClick={() => void login()}
          className="mt-8 flex h-12 w-full items-center justify-center gap-3 rounded-xl bg-zinc-900 font-semibold text-white transition-colors hover:bg-zinc-800 disabled:opacity-60"
        >
          {authenticating ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Giriş penceresi açık…
            </>
          ) : (
            <>
              <MicrosoftLogo />
              Microsoft Hesabı ile Giriş
            </>
          )}
        </motion.button>

        <AnimatePresence>
          {error && (
            <motion.p
              key="login-error"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-4 text-center text-sm text-red-600"
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>

        <p className="mt-8 text-center text-[11px] leading-relaxed text-zinc-400">
          Giriş, resmi Microsoft OAuth penceresi üzerinden yapılır; şifren launcher'a asla
          girilmez.
        </p>
      </div>
    </motion.div>
  )
}
