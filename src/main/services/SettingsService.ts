import os from 'os'
import { VANILLA_PROFILE_ID } from '../../shared/constants'
import type { LauncherSettings, SettingsSnapshot } from '../../shared/types'
import { store } from './storage'

const SETTINGS_KEY = 'settings'
const DEFAULT_SETTINGS: LauncherSettings = {
  ramGb: 4,
  modRepo: '',
  selectedProfileId: VANILLA_PROFILE_ID
}

/** Renderer'dan gelen değer güvenilmez kabul edilir; her zaman 2-16 aralığına sıkıştırılır. */
function clampRam(value: unknown): number {
  const num = Math.round(Number(value))
  if (!Number.isFinite(num)) return DEFAULT_SETTINGS.ramGb
  return Math.min(16, Math.max(2, num))
}

function cleanString(value: unknown, fallback: string, maxLength: number): string {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : fallback
}

class SettingsService {
  get(): LauncherSettings {
    const saved = store.get<Partial<LauncherSettings>>(SETTINGS_KEY, {})
    return {
      ramGb: clampRam(saved.ramGb ?? DEFAULT_SETTINGS.ramGb),
      modRepo: cleanString(saved.modRepo, DEFAULT_SETTINGS.modRepo, 200),
      selectedProfileId: cleanString(
        saved.selectedProfileId,
        DEFAULT_SETTINGS.selectedProfileId,
        64
      )
    }
  }

  set(patch: Partial<LauncherSettings>): LauncherSettings {
    const current = this.get()
    const next: LauncherSettings = {
      ramGb: patch.ramGb !== undefined ? clampRam(patch.ramGb) : current.ramGb,
      modRepo:
        patch.modRepo !== undefined ? cleanString(patch.modRepo, current.modRepo, 200) : current.modRepo,
      selectedProfileId:
        patch.selectedProfileId !== undefined
          ? cleanString(patch.selectedProfileId, current.selectedProfileId, 64)
          : current.selectedProfileId
    }
    store.set(SETTINGS_KEY, next)
    return next
  }

  snapshot(): SettingsSnapshot {
    return {
      settings: this.get(),
      systemRamGb: Math.round(os.totalmem() / 1024 ** 3)
    }
  }
}

export const settingsService = new SettingsService()
