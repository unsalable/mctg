import { Bookmark, Home, PlusCircle, Settings, User } from 'lucide-react'
import { LimelightNav, type NavItem } from './ui/limelight-nav'
import { TAB_ORDER, useUiStore, type LauncherTab } from '../stores/useUiStore'

const TAB_LABELS: Record<LauncherTab, string> = {
  home: 'Ana Sayfa',
  profiles: 'Profiller',
  versions: 'Sürüm',
  account: 'Hesap',
  settings: 'Ayarlar'
}

/** Üst ortadaki gezinme barı — sekme sırası TAB_ORDER ile birebir aynıdır. */
export default function AppNav() {
  const tab = useUiStore((s) => s.tab)
  const setTab = useUiStore((s) => s.setTab)

  const items: NavItem[] = [
    { id: 'home', icon: <Home />, label: TAB_LABELS.home },
    { id: 'profiles', icon: <Bookmark />, label: TAB_LABELS.profiles },
    { id: 'versions', icon: <PlusCircle />, label: TAB_LABELS.versions },
    { id: 'account', icon: <User />, label: TAB_LABELS.account },
    { id: 'settings', icon: <Settings />, label: TAB_LABELS.settings }
  ]

  return (
    <LimelightNav
      items={items}
      activeIndex={Math.max(TAB_ORDER.indexOf(tab), 0)}
      onTabChange={(index) => setTab(TAB_ORDER[index] ?? 'home')}
      className="app-no-drag pointer-events-auto rounded-2xl border-line bg-surface/85 shadow-[0_10px_40px_-18px_rgba(0,0,0,0.45)] backdrop-blur-xl"
      iconClassName="text-fg"
    />
  )
}
