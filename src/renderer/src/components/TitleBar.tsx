import { Minus, Settings, X } from 'lucide-react'
import { useAuthStore } from '../stores/useAuthStore'
import { useUiStore } from '../stores/useUiStore'

export default function TitleBar() {
  const loggedIn = useAuthStore((s) => s.status === 'loggedIn')
  const setSettingsOpen = useUiStore((s) => s.setSettingsOpen)

  return (
    <header className="app-drag relative z-40 flex h-10 shrink-0 items-center justify-between pl-4">
      <div className="flex items-center gap-2">
        <div className="h-4 w-4 rounded-[5px] bg-gradient-to-br from-accent-500 to-accent-700" />
        <span className="text-xs font-semibold tracking-[0.2em] text-zinc-500">MCTG LAUNCHER</span>
      </div>

      <div className="app-no-drag flex h-full items-center">
        {loggedIn && (
          <button
            title="Ayarlar"
            onClick={() => setSettingsOpen(!useUiStore.getState().settingsOpen)}
            className="flex h-full w-12 items-center justify-center text-zinc-500 transition-colors hover:bg-zinc-900/[0.06] hover:text-zinc-800"
          >
            <Settings size={16} />
          </button>
        )}
        <button
          title="Alta Al"
          onClick={() => window.launcher.windowControls.minimize()}
          className="flex h-full w-12 items-center justify-center text-zinc-500 transition-colors hover:bg-zinc-900/[0.06] hover:text-zinc-800"
        >
          <Minus size={16} />
        </button>
        <button
          title="Kapat"
          onClick={() => window.launcher.windowControls.close()}
          className="flex h-full w-12 items-center justify-center text-zinc-500 transition-colors hover:bg-red-500 hover:text-white"
        >
          <X size={16} />
        </button>
      </div>
    </header>
  )
}
