import { Agent, interceptors, type Dispatcher } from 'undici'

/**
 * Oyun dosyası indirmeleri için IPv4'e sabitlenmiş bağlantı ajanı.
 *
 * Neden: Mojang'ın asset CDN'i (resources.download.minecraft.net → Azure) hem IPv6 hem IPv4
 * adresi yayınlıyor. IPv6 yolu bozuk ağlarda undici IPv6'yı deneyip zaman aşımına düşüyor ve
 * binlerce asset indirmesi başarısız oluyor. IPv4'e zorlayarak bu sınıf hatayı kökten çözüyoruz.
 * Retry + redirect katmanları @xmcl/file-transfer'ın varsayılan ajanıyla birebir aynı tutuldu.
 */
export const downloadDispatcher: Dispatcher = new Agent({
  connections: 16,
  connect: { family: 4, timeout: 20000 }
}).compose(interceptors.retry(), interceptors.redirect({ maxRedirections: 5 }))
