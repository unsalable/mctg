import type { ModProfile } from './types'

/**
 * Sunucuya hiç ulaşılamadığında (ilk açılış + ağ yok) ve profil de sürüm
 * bildirmediğinde başvurulan son çare sürüm. Normalde sürümü site belirler.
 */
export const DEFAULT_MC_VERSION = '26.2'

export const VANILLA_PROFILE_ID = 'vanilla'

/**
 * Launcher'ın yerleşik "modsuz" seçeneği. Siteden gelmez, silinemez: site
 * kapalıyken bile oyuncunun oyuna girebileceği bir yol kalsın diye burada.
 */
export const VANILLA_PROFILE: ModProfile = {
  id: VANILLA_PROFILE_ID,
  name: 'Vanilla',
  description: 'Modsuz saf Minecraft',
  // Modu olmadığı için sürüm dayatmaz: sunucu hangi sürümdeyse onunla açılır.
  mcVersion: null,
  loader: 'vanilla',
  official: false,
  mine: false
}

/**
 * MCTG site/hesap sunucusunun adresi.
 *
 * Launcher hesapları kendi başına tutmaz: giriş, yetki (yönetici mi) ve
 * başlatılacak sürüm bilgisi hep buradan gelir. Geliştirirken siteyi yerelde
 * çalıştırmak için MCTG_API_BASE ortam değişkeni ile ezilebilir
 * (ör. MCTG_API_BASE=http://localhost:8787).
 */
export const SITE_API_BASE = 'https://mctg.com.tr'

/** Oyunun otomatik bağlanacağı sunucu. Site de aynı adresi kullanır (.env → MC_HOST). */
export const MC_SERVER_HOST = 'play.mctg.com.tr'
export const MC_SERVER_PORT = 25565
