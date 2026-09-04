import { motion } from 'framer-motion'
import {
  AlertTriangle,
  Bookmark,
  ChevronRight,
  Loader2,
  Package,
  Server,
  Users
} from 'lucide-react'
import { DEFAULT_MC_VERSION } from '../../../shared/constants'
import type { ModProfile, ServerStatus } from '../../../shared/types'
import FaceAvatar from '../components/FaceAvatar'
import PlayButton from '../components/PlayButton'
import { useAuthStore } from '../stores/useAuthStore'
import { useGameStore } from '../stores/useGameStore'
import { useProfileStore } from '../stores/useProfileStore'
import { useServerStore } from '../stores/useServerStore'
import { useSiteStore } from '../stores/useSiteStore'
import { useUiStore } from '../stores/useUiStore'
import SkinViewer3D from '../components/SkinViewer3D'

/**
 * OYNA'nın altındaki iki bilgi kartının ortak iskeleti.
 *
 * Kartlar eşit genişlikte ve aynı hizada duruyor: oyuncunun "hangi paketle,
 * hangi sunucuya gireceğim" sorusunu butona basmadan önce tek bakışta
 * cevaplaması gerekiyor, bu yüzden değerler küçük etiket değil, kartın en
 * büyük satırı.
 */
function InfoCard({
  icon,
  label,
  value,
  detail,
  onClick,
  action
}: {
  icon: React.ReactNode
  label: string
  value: string
  detail: React.ReactNode
  onClick?: () => void
  action?: string
}): React.JSX.Element {
  const body = (
    <>
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-subtle">
          {label}
        </span>
        {action && (
          <span className="ml-auto flex items-center gap-0.5 text-[11px] font-medium text-subtle transition-colors group-hover:text-accent-600">
            {action}
            <ChevronRight size={12} />
          </span>
        )}
      </div>
      <p className="mt-2 truncate text-lg font-bold leading-tight text-fg">{value}</p>
      <div className="mt-1 flex min-h-[18px] items-center gap-1.5 text-xs text-muted">{detail}</div>
    </>
  )

  const shell =
    'group flex w-full flex-col rounded-2xl border border-line bg-surface p-4 text-left shadow-[0_6px_24px_-20px_rgba(0,0,0,0.4)]'

  if (!onClick) return <div className={shell}>{body}</div>
  return (
    <button
      onClick={onClick}
      className={`${shell} transition-colors hover:border-accent-300 hover:bg-elevated`}
    >
      {body}
    </button>
  )
}

const LOADER_LABEL: Record<ModProfile['loader'], string> = {
  vanilla: 'Vanilla',
  fabric: 'Fabric'
}

/**
 * Sunucu kartı.
 *
 * Adres ve oyuncu sayısı sitenin launcher yapılandırmasından gelir; launcher
 * yalnızca gösterir. Sunucuya ulaşılamadığında oyuncuya kırmızı "çevrimdışı"
 * uyarısı ve geri sayım GÖSTERİLMEZ: sunucunun ayakta olup olmaması yöneticinin
 * siteden çözeceği bir konu, oyuncunun launcher'da uğraşacağı bir hata değil.
 * Arka plandaki yoklama sürer, sonuç sessizce (nokta ve oyuncu satırı) yansır.
 */
function ServerCard({ status }: { status: ServerStatus | null }): React.JSX.Element {
  const dotClass = !status
    ? 'bg-subtle/50'
    : status.checking && !status.online
      ? 'bg-amber-500'
      : status.online
        ? 'bg-emerald-500'
        : 'bg-subtle/50'

  const detail = !status ? null : status.online ? (
    <>
      <Users size={12} className="text-subtle" />
      <span className="font-medium text-fg">
        {status.players.online}/{status.players.max}
      </span>
      oyuncu
      {status.latencyMs !== null && <span className="text-subtle">• {status.latencyMs}ms</span>}
    </>
  ) : status.checking ? (
    <>
      <Loader2 size={12} className="animate-spin text-subtle" />
      bağlanılıyor…
    </>
  ) : (
    <span className="text-subtle">Port {status.port}</span>
  )

  return (
    <InfoCard
      icon={
        <span className="relative flex h-2.5 w-2.5 items-center justify-center">
          {status?.online && (
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />
          )}
          <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${dotClass}`} />
        </span>
      }
      label="Sunucu"
      value={status?.host ?? '—'}
      detail={detail}
    />
  )
}

export default function PlayView(): React.JSX.Element | null {
  const session = useAuthStore((s) => s.session)
  const gameUi = useGameStore((s) => s.ui)
  const gameProgress = useGameStore((s) => s.progress)
  const play = useGameStore((s) => s.play)
  const selectedProfile = useProfileStore((s) => s.profiles.find((p) => p.id === s.selectedId))
  const enforcedVersion = useSiteStore((s) => s.config?.mcVersion ?? null)
  const serverStatus = useServerStore((s) => s.status)
  const setTab = useUiStore((s) => s.setTab)

  if (!session) return null

  // Profil sürüm bildirmediyse (repo profiles.json'da yazmıyorsa) hiçbir sürüm
  // iddiası yoktur; sunucunun sürümüyle açılır, uydurma bir sürüm gösterilmez.
  const profileVersion = selectedProfile?.mcVersion ?? null
  const effectiveVersion = enforcedVersion || profileVersion || DEFAULT_MC_VERSION
  // Modlar profilin sürümüne göre derlendiği için sunucunun sürümü farklıysa
  // modlu profil açılmayabilir — oyuncu değil, yönetici çözmeli.
  const versionMismatch =
    !!enforcedVersion && !!profileVersion && enforcedVersion !== profileVersion

  return (
    <motion.div
      className="flex h-full gap-6"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.28, ease: 'easeOut' }}
    >
      {/* Sol: incelenebilir 3D skin alanı */}
      <section className="flex w-[340px] shrink-0 flex-col overflow-hidden rounded-3xl border border-line bg-surface shadow-[0_8px_30px_-18px_rgba(0,0,0,0.35)]">
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
        <button
          onClick={() => setTab('account')}
          className="flex items-center gap-3 border-t border-line p-4 text-left transition-colors hover:bg-elevated"
        >
          {session.skinDataUrl && <FaceAvatar skin={session.skinDataUrl} size={36} />}
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-fg">{session.name}</p>
            <p className="truncate font-mono text-[10px] text-subtle">{session.uuid}</p>
          </div>
          <span className="shrink-0 text-[11px] font-medium text-accent-600">Hesabım</span>
        </button>
      </section>

      {/* Sağ: karşılama + OYNA + "neyle nereye giriyorum" kartları */}
      <section className="flex min-w-0 flex-1 flex-col items-center justify-center gap-7">
        <div className="text-center">
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-sm text-muted"
          >
            Tekrar hoş geldin,
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mt-1 text-4xl font-extrabold tracking-tight text-fg"
          >
            {session.name}
          </motion.h1>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex w-full max-w-[520px] flex-col items-center gap-6"
        >
          <PlayButton ui={gameUi} progress={gameProgress} onClick={() => void play()} />

          {/* Butona basmadan önce görülmesi gereken iki şey: hangi paket,
              hangi sunucu. Küçük rozet yerine eşit iki kart. */}
          <div className="grid w-full grid-cols-2 gap-3">
            <InfoCard
              icon={<Bookmark size={13} className="text-subtle" />}
              label="Profil"
              value={selectedProfile?.name ?? 'Yükleniyor…'}
              action={gameUi === 'idle' ? 'Değiştir' : undefined}
              onClick={gameUi === 'idle' ? () => setTab('profiles') : undefined}
              detail={
                selectedProfile ? (
                  <>
                    <Package size={12} className="text-subtle" />
                    Minecraft {profileVersion ?? effectiveVersion}
                    <span className="text-subtle">• {LOADER_LABEL[selectedProfile.loader]}</span>
                  </>
                ) : null
              }
            />
            <ServerCard status={serverStatus} />
          </div>
        </motion.div>

        {versionMismatch ? (
          <p className="flex max-w-md items-start gap-2 text-center text-xs leading-relaxed text-amber-600">
            <AlertTriangle size={14} className="mt-px shrink-0" />
            <span>
              “{selectedProfile?.name}” profili Minecraft {profileVersion} için hazırlandı; sunucu{' '}
              {enforcedVersion} sürümünde. Modlar bu sürümde açılmayabilir.
            </span>
          </p>
        ) : (
          <p className="flex items-center gap-1.5 text-xs text-subtle">
            <Server size={12} />
            Oyun Minecraft {effectiveVersion} ile açılacak
          </p>
        )}
      </section>
    </motion.div>
  )
}
