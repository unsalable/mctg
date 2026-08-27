import type { ModProfile } from './types'

/** Yerleşik modsuz profilin sürümü; repo profilleri kendi sürümlerini taşır. */
export const DEFAULT_MC_VERSION = '26.2'

export const VANILLA_PROFILE_ID = 'vanilla'

/** Official mod profile repository; this is intentionally not user-configurable. */
export const MOD_REPO = 'unsalable/Minecraft-Mod-Profilleri'

export const VANILLA_PROFILE: ModProfile = {
  id: VANILLA_PROFILE_ID,
  name: 'Vanilla',
  description: 'Modsuz saf Minecraft',
  mcVersion: DEFAULT_MC_VERSION,
  loader: 'vanilla'
}
