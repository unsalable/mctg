import { AnimatePresence, motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import { useAuthStore } from '../stores/useAuthStore'
import { useSiteStore } from '../stores/useSiteStore'

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
  const siteUser = useSiteStore((s) => s.user)
  const siteLogout = useSiteStore((s) => s.logout)
  const authenticating = status === 'authenticating'

  return (
    <motion.div
      className="flex h-full items-center justify-center"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -24 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
    >
      <div className="w-[420px] rounded-3xl border border-line bg-surface p-10 shadow-[0_24px_70px_-24px_rgba(16,24,40,0.18)]">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 200, damping: 18 }}
          className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-accent-500 to-accent-700 shadow-lg shadow-accent-600/25"
        >
          <span className="text-2xl font-black text-white">M</span>
        </motion.div>

        <h1 className="mt-6 text-center text-2xl font-bold text-fg">Microsoft Hesabı</h1>
        <p className="mt-2 text-center text-sm text-muted">
          Oyunu başlatmak için Minecraft sahibi Microsoft hesabınla giriş yap.
        </p>

        {/* İlk kapı geçildi; hangi MCTG hesabıyla girildiği burada görünür. */}
        {siteUser && (
          <div className="mt-5 flex items-center gap-3 rounded-xl border border-line bg-elevated px-3 py-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-500 text-sm font-bold text-white">
              {siteUser.username.slice(0, 1).toLocaleUpperCase('tr')}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-fg">{siteUser.username}</p>
              <p className="truncate text-[11px] text-subtle">MCTG hesabı</p>
            </div>
            <button
              onClick={() => void siteLogout()}
              className="shrink-0 text-[11px] font-medium text-muted transition-colors hover:text-red-600"
            >
              Değiştir
            </button>
          </div>
        )}

        <motion.button
          whileHover={authenticating ? undefined : { scale: 1.02 }}
          whileTap={authenticating ? undefined : { scale: 0.98 }}
          disabled={authenticating}
          onClick={() => void login()}
          className="mt-8 flex h-12 w-full items-center justify-center gap-3 rounded-xl bg-fg font-semibold text-bg transition-colors hover:bg-fg/85 disabled:opacity-60"
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

        <p className="mt-8 text-center text-[11px] leading-relaxed text-subtle">
          Giriş, resmi Microsoft OAuth penceresi üzerinden yapılır; şifren launcher'a asla
          girilmez.
        </p>
      </div>
    </motion.div>
  )
}
