import { motion } from 'framer-motion'
import {
  Ban,
  Check,
  ImagePlus,
  Loader2,
  LogOut,
  RefreshCw,
  RotateCcw,
  Trash2,
  Upload
} from 'lucide-react'
import { useState } from 'react'
import CapePreview from '../components/CapePreview'
import FaceAvatar from '../components/FaceAvatar'
import SkinViewer3D from '../components/SkinViewer3D'
import { useAccountStore } from '../stores/useAccountStore'
import { useAuthStore } from '../stores/useAuthStore'

type Variant = 'classic' | 'slim'

export default function AccountView() {
  const session = useAuthStore((s) => s.session)
  const logout = useAuthStore((s) => s.logout)
  const account = useAccountStore((s) => s.account)
  const busy = useAccountStore((s) => s.busy)
  const busyId = useAccountStore((s) => s.busyId)
  const error = useAccountStore((s) => s.error)
  const load = useAccountStore((s) => s.load)
  const addSkin = useAccountStore((s) => s.addSkin)
  const removeSkin = useAccountStore((s) => s.removeSkin)
  const applySkin = useAccountStore((s) => s.applySkin)
  const resetSkin = useAccountStore((s) => s.resetSkin)
  const setCape = useAccountStore((s) => s.setCape)

  // Her skin için hangi modelin uygulanacağı kart bazında seçilir.
  const [variants, setVariants] = useState<Record<string, Variant>>({})

  if (!session) return null

  const library = account?.library ?? []
  const capes = account?.capes ?? []
  const hasActiveCape = capes.some((c) => c.active)
  const anyBusy = busy !== null

  return (
    <motion.div
      className="flex h-full gap-6"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.28, ease: 'easeOut' }}
    >
      {/* Sol: hesap kartı + 3D görünüm */}
      <section className="flex w-[320px] shrink-0 flex-col overflow-hidden rounded-3xl border border-line bg-surface shadow-[0_8px_30px_-18px_rgba(0,0,0,0.35)]">
        <div className="min-h-0 flex-1">
          {session.skinDataUrl ? (
            <SkinViewer3D
              skin={session.skinDataUrl}
              variant={session.skinVariant}
              cape={session.capeDataUrl}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-subtle">
              Skin yüklenemedi
            </div>
          )}
        </div>

        <div className="border-t border-line p-4">
          <div className="flex items-center gap-3">
            {session.skinDataUrl && <FaceAvatar skin={session.skinDataUrl} size={40} />}
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-fg">{session.name}</p>
              <p className="truncate font-mono text-[10px] text-subtle">{session.uuid}</p>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-2 text-[11px] text-subtle">
            <span className="rounded-md bg-elevated px-2 py-0.5 font-medium text-muted">
              Model: {session.skinVariant === 'slim' ? 'İnce (Alex)' : 'Klasik (Steve)'}
            </span>
            <span className="rounded-md bg-elevated px-2 py-0.5 font-medium text-muted">
              {hasActiveCape ? 'Pelerin açık' : 'Pelerin yok'}
            </span>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              onClick={() => void load(true)}
              disabled={anyBusy}
              className="flex h-9 flex-1 items-center justify-center gap-2 rounded-lg border border-line bg-surface text-sm text-muted transition-colors hover:bg-elevated disabled:opacity-50"
            >
              <RefreshCw size={14} className={busy === 'loading' ? 'animate-spin' : ''} />
              Yenile
            </button>
            <button
              onClick={() => void logout()}
              className="flex h-9 flex-1 items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 text-sm font-medium text-red-600 transition-colors hover:bg-red-100 dark:border-red-900 dark:bg-red-950/40 dark:hover:bg-red-950"
            >
              <LogOut size={14} />
              Çıkış Yap
            </button>
          </div>
        </div>
      </section>

      {/* Sağ: skin kütüphanesi + pelerinler */}
      <section className="scroll-thin min-w-0 flex-1 space-y-4 overflow-y-auto pr-1">
        <header>
          <h2 className="text-2xl font-bold tracking-tight text-fg">Hesap</h2>
          <p className="mt-1 text-sm text-muted">
            Skinini değiştir, kendi skinlerini ekle ve pelerinini seç.
          </p>
        </header>

        {error && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </p>
        )}

        {/* Skin kütüphanesi */}
        <div className="rounded-2xl border border-line bg-surface p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-fg">Skin Kütüphanesi</p>
              <p className="mt-0.5 text-xs text-muted">
                64x64 PNG dosyaları launcher'da saklanır, istediğinde hesabına uygulanır.
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                onClick={() => void resetSkin()}
                disabled={anyBusy}
                className="flex h-9 items-center gap-2 rounded-lg border border-line bg-surface px-3 text-sm text-muted transition-colors hover:bg-elevated disabled:opacity-50"
              >
                {busy === 'resetting' ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <RotateCcw size={14} />
                )}
                Varsayılan
              </button>
              <button
                onClick={() => void addSkin()}
                disabled={anyBusy}
                className="flex h-9 items-center gap-2 rounded-lg bg-accent-500 px-3 text-sm font-medium text-white transition-colors hover:bg-accent-600 disabled:opacity-50"
              >
                {busy === 'adding' ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <ImagePlus size={14} />
                )}
                Skin Ekle
              </button>
            </div>
          </div>

          {library.length === 0 ? (
            <p className="mt-6 mb-2 text-center text-sm text-subtle">
              {busy === 'loading'
                ? 'Hesap bilgileri yükleniyor…'
                : 'Henüz skin eklemedin. “Skin Ekle” ile bilgisayarından PNG seç.'}
            </p>
          ) : (
            <div className="mt-4 grid grid-cols-2 gap-3">
              {library.map((item) => {
                const variant = variants[item.id] ?? item.variant
                const itemBusy = busyId === item.id
                return (
                  <div
                    key={item.id}
                    className={`rounded-xl border p-3 transition-colors ${
                      item.active
                        ? 'border-accent-500 bg-accent-50 dark:bg-accent-800/15'
                        : 'border-line bg-elevated'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <FaceAvatar skin={item.imageDataUrl} size={44} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-fg">{item.name}</p>
                        {item.active ? (
                          <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-accent-600">
                            <Check size={11} /> Hesapta etkin
                          </span>
                        ) : (
                          <span className="mt-1 block text-[11px] text-subtle">
                            {new Date(item.addedAt).toLocaleDateString('tr-TR')}
                          </span>
                        )}
                      </div>
                      <button
                        title="Kütüphaneden sil"
                        onClick={() => void removeSkin(item.id)}
                        disabled={anyBusy}
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-subtle transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-40 dark:hover:bg-red-950/50"
                      >
                        {itemBusy && busy === 'removing' ? (
                          <Loader2 size={13} className="animate-spin" />
                        ) : (
                          <Trash2 size={13} />
                        )}
                      </button>
                    </div>

                    <div className="mt-3 flex items-center gap-2">
                      <div className="flex rounded-lg border border-line bg-surface p-0.5">
                        {(['classic', 'slim'] as Variant[]).map((option) => (
                          <button
                            key={option}
                            onClick={() => setVariants((v) => ({ ...v, [item.id]: option }))}
                            className={`rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${
                              variant === option
                                ? 'bg-accent-500 text-white'
                                : 'text-muted hover:bg-elevated'
                            }`}
                          >
                            {option === 'classic' ? 'Klasik' : 'İnce'}
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={() => void applySkin(item.id, variant)}
                        disabled={anyBusy}
                        className="flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg border border-line bg-surface text-xs font-medium text-fg transition-colors hover:bg-accent-50 hover:text-accent-700 disabled:opacity-50 dark:hover:bg-accent-800/20 dark:hover:text-accent-300"
                      >
                        {itemBusy && busy === 'applying' ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <Upload size={12} />
                        )}
                        Uygula
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Pelerinler */}
        <div className="rounded-2xl border border-line bg-surface p-4">
          <p className="font-semibold text-fg">Pelerinler</p>
          <p className="mt-0.5 text-xs text-muted">
            Hesabının sahip olduğu pelerinler. Seçim anında Mojang hesabına işlenir.
          </p>

          {capes.length === 0 ? (
            <p className="mt-6 mb-2 text-center text-sm text-subtle">
              Bu hesapta pelerin yok.
            </p>
          ) : (
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                onClick={() => void setCape(null)}
                disabled={anyBusy || !hasActiveCape}
                className={`flex h-[92px] w-[72px] flex-col items-center justify-center gap-1.5 rounded-xl border text-[11px] transition-colors disabled:opacity-50 ${
                  hasActiveCape
                    ? 'border-line bg-elevated text-muted hover:bg-surface'
                    : 'border-accent-500 bg-accent-50 text-accent-700 dark:bg-accent-800/15 dark:text-accent-300'
                }`}
              >
                {busy === 'cape' && busyId === null ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Ban size={16} />
                )}
                Pelerinsiz
              </button>

              {capes.map((cape) => (
                <button
                  key={cape.id}
                  onClick={() => void setCape(cape.id)}
                  disabled={anyBusy}
                  title={cape.alias}
                  className={`flex w-[72px] flex-col items-center gap-1.5 rounded-xl border p-2 text-[11px] transition-colors disabled:opacity-50 ${
                    cape.active
                      ? 'border-accent-500 bg-accent-50 text-accent-700 dark:bg-accent-800/15 dark:text-accent-300'
                      : 'border-line bg-elevated text-muted hover:bg-surface'
                  }`}
                >
                  {busy === 'cape' && busyId === cape.id ? (
                    <div className="flex h-[64px] items-center justify-center">
                      <Loader2 size={16} className="animate-spin" />
                    </div>
                  ) : cape.imageDataUrl ? (
                    <CapePreview texture={cape.imageDataUrl} width={40} />
                  ) : (
                    <div className="h-[64px] w-10 rounded-md bg-line" />
                  )}
                  <span className="w-full truncate text-center">{cape.alias}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>
    </motion.div>
  )
}
