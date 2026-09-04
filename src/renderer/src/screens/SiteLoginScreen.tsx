import { AnimatePresence, motion } from 'framer-motion'
import { Loader2, Lock, Mail, RefreshCw } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { SITE_API_BASE } from '../../../shared/constants'
import { useSiteStore } from '../stores/useSiteStore'

/**
 * İlk kapı: MCTG site hesabı.
 *
 * Sitede kullanılan e-posta ve şifrenin aynısı; launcher ayrı bir hesap
 * açtırmaz. Microsoft penceresi ancak bu adım geçilince açılır.
 */
export default function SiteLoginScreen() {
  const login = useSiteStore((s) => s.login)
  const retryRestore = useSiteStore((s) => s.retryRestore)
  const status = useSiteStore((s) => s.status)
  const error = useSiteStore((s) => s.error)
  const offline = useSiteStore((s) => s.errorCode === 'network')
  const authenticating = status === 'authenticating'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const canSubmit = email.trim() !== '' && password !== '' && !authenticating

  const submit = (event: FormEvent): void => {
    event.preventDefault()
    if (!canSubmit) return
    void login(email.trim(), password)
  }

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

        <h1 className="mt-6 text-center text-2xl font-bold text-fg">MCTG Hesabı</h1>
        <p className="mt-2 text-center text-sm text-muted">
          Sitede kullandığın hesabın aynısıyla giriş yap.
        </p>

        <form onSubmit={submit} className="mt-8 space-y-3">
          <label className="relative block">
            <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-subtle" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={authenticating}
              autoFocus
              placeholder="E-posta"
              autoComplete="username"
              className="settings-input pl-9"
            />
          </label>

          <label className="relative block">
            <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-subtle" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={authenticating}
              placeholder="Şifre"
              autoComplete="current-password"
              className="settings-input pl-9"
            />
          </label>

          <motion.button
            type="submit"
            whileHover={canSubmit ? { scale: 1.02 } : undefined}
            whileTap={canSubmit ? { scale: 0.98 } : undefined}
            disabled={!canSubmit}
            className="flex h-12 w-full items-center justify-center gap-3 rounded-xl bg-fg font-semibold text-bg transition-colors hover:bg-fg/85 disabled:opacity-60"
          >
            {authenticating ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Giriş yapılıyor…
              </>
            ) : (
              'Giriş Yap'
            )}
          </motion.button>
        </form>

        <AnimatePresence>
          {error && (
            <motion.div
              key="site-login-error"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-4 text-center"
            >
              <p className="text-sm text-red-600">{error}</p>
              {/* Sunucuya ulaşılamadıysa oturum hâlâ geçerli olabilir: şifre
                  istemeden yeniden denenir. */}
              {offline && (
                <button
                  type="button"
                  onClick={() => void retryRestore()}
                  disabled={authenticating}
                  className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-accent-600 transition-colors hover:underline disabled:opacity-60"
                >
                  <RefreshCw size={12} className={authenticating ? 'animate-spin' : ''} />
                  Bağlantıyı tekrar dene
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <p className="mt-8 text-center text-[11px] leading-relaxed text-subtle">
          Hesabın yok mu?{' '}
          <button
            type="button"
            onClick={() => window.open(SITE_API_BASE, '_blank')}
            className="font-medium text-accent-600 hover:underline"
          >
            {SITE_API_BASE.replace(/^https?:\/\//, '')}
          </button>{' '}
          üzerinden kayıt ol. Giriş yaptıktan sonra Microsoft hesabın istenecek.
        </p>
      </div>
    </motion.div>
  )
}
