import { create } from 'zustand'
import type { ServerStatus } from '../../../shared/types'

interface ServerState {
  status: ServerStatus | null
  /** Bir sonraki otomatik denemeye kalan saniye; ana süreç değil, burası sayar. */
  countdown: number | null
  init: () => void
  retry: () => Promise<void>
}

let unsubscribe: (() => void) | null = null
let countdownTimer: number | undefined

/**
 * Oyun sunucusunun durumu.
 *
 * Bağlantıyı ana süreç sürekli deniyor (ServerStatusService); burası yalnızca
 * sonucu gösteriyor ve "x saniye sonra tekrar denenecek" geri sayımını yerelde
 * işletiyor — saniyede bir IPC olayı göndermeye gerek yok.
 */
export const useServerStore = create<ServerState>((set, get) => ({
  status: null,
  countdown: null,

  init: () => {
    if (unsubscribe || !window.launcher) return

    const apply = (status: ServerStatus): void => {
      set({ status, countdown: status.retryInMs === null ? null : Math.ceil(status.retryInMs / 1000) })
    }

    unsubscribe = window.launcher.server.onStatus(apply)
    void window.launcher.server.status().then(apply)

    window.clearInterval(countdownTimer)
    countdownTimer = window.setInterval(() => {
      const { countdown } = get()
      if (countdown === null) return
      set({ countdown: Math.max(0, countdown - 1) })
    }, 1000)
  },

  retry: async () => {
    if (!window.launcher) return
    set((state) => ({
      status: state.status ? { ...state.status, checking: true } : null,
      countdown: null
    }))
    const status = await window.launcher.server.retry()
    set({ status, countdown: status.retryInMs === null ? null : Math.ceil(status.retryInMs / 1000) })
  }
}))
