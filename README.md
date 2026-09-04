# MCTG Launcher

Modern, animasyonlu Minecraft launcher. Electron + React + TypeScript ile geliştirilmektedir.

## Özellikler (yol haritası)

- [x] Adım 1 — Microsoft OAuth girişi + UI iskeleti (3D skin görüntüleyici, OYNA butonu, özel titlebar)
- [x] Adım 2 — Ayarlar: RAM slider (2-16 GB, varsayılan 4 GB), kalıcı depolama
- [x] Adım 3 — Otomatik Java yönetimi + oyun başlatma (Minecraft 26.2, IPv4 sabitlenmiş indirmeler, otomatik Java 25 kurulumu)
- [x] Adım 4 — Profil sistemi ve mod senkronizasyonu + otomatik Fabric Loader kurulumu — bkz. [docs/MOD_REPO.md](docs/MOD_REPO.md)
- [x] Adım 5 — Sekmeli arayüz: üst ortada limelight gezinme barı, ayrı **Profiller** ve **Sürümler** sekmeleri, **Hesap** sekmesi (skin kütüphanesi, skin/pelerin değiştirme, çıkış) ve **Ayarlar** (siyah tema + RAM)
- [x] Adım 6 — MCTG site hesabı entegrasyonu: iki aşamalı giriş, yönetici kontrollü sürüm, sunucuya otomatik bağlanma — bkz. [Site entegrasyonu](#site-entegrasyonu)
- [x] Adım 7 — Mod profilleri de siteden: GitHub deposu emekli edildi, profiller ve mod dosyaları `mctg.com.tr` üzerinden dağıtılıyor — bkz. [docs/MOD_REPO.md](docs/MOD_REPO.md)
- [ ] Adım 8 — Cila + paketleme (electron-builder)

## Site entegrasyonu

Launcher kendi kullanıcı veritabanını tutmaz; hesaplar, yetkiler ve
başlatılacak sürüm MCTG sitesinin hesap sunucusundan gelir
(`https://mctg.com.tr/api` → nginx → `localhost:8787`).

**Giriş iki kapıdan geçer.** Önce MCTG site hesabı (sitedeki e-posta + şifre),
sonra Microsoft hesabı. Onayı bekleyen ya da reddedilmiş bir hesap ilk kapıda
durur; Microsoft penceresini hiç görmez. İki oturum birbirinden bağımsızdır ve
**Ayarlar → Hesaplar** altında ayrı ayrı kapatılabilir.

**Sürümü yönetici belirler.** `PUT /api/launcher/v1/config` yalnızca `isAdmin`
hesaplara açıktır; herkesin launcher'ı `GET /api/launcher/v1/config` ile aynı
sürümü okur ve Sürüm sekmesi yönetici olmayan için salt bilgidir. Sürüm
oyuncunun makinesinde tutulmadığı için sunucu sürüm atladığında tek bir
değişiklik herkese iner. Listede yalnızca yayınlanmış sürümler vardır — anlık
görüntüler ve eski beta/alfa sürümleri hiç gösterilmez.

**Mod paketleri de siteden gelir.** Profil listesi
`GET /api/launcher/v1/profiles`, dosya listesi `.../profiles/:id/manifest` ve
dosyaların kendisi `.../files/:sha256` uçlarından okunur; hangi profilin
görüneceğine (resmî paket + kişinin kendi profilleri + onaylı açık profiller)
site karar verir. Doğrulama sha256 iledir ve indirme adresi sunucudan değil,
launcher'ın kendi sabit adresinden üretilir. Ayrıntı: [docs/MOD_REPO.md](docs/MOD_REPO.md).

**Oyun doğrudan sunucuya girer.** Launcher açılışta `play.mctg.com.tr`
adresine bağlanmayı dener ve başarısız olursa kendi kendine tekrar dener
(5s → 10s → 20s → 40s → 60s); durum Ana Sayfa'daki rozette görünür. Oyun
başlatıldığında sunucu listesi yerine doğrudan bu adrese bağlanılır
(1.20+ `--quickPlayMultiplayer`, daha eski sürümlerde `--server/--port`).

Adresler `src/shared/constants.ts` içinde. Siteyi yerelde çalıştırırken
`MCTG_API_BASE` ortam değişkeni ile başka bir adrese yönlendirilebilir:

```bash
MCTG_API_BASE=http://localhost:8787 npm run dev
```

## Teknoloji Yığını

- **Çatı:** Electron + electron-vite
- **UI:** React 19, TypeScript, Tailwind CSS v4, Framer Motion
- **3D Skin:** skinview3d
- **Gezinme:** limelight-nav (`src/renderer/src/components/ui/limelight-nav.tsx`)
- **Microsoft OAuth:** msmc
- **Hesap/yetki/sürüm:** MCTG site hesap sunucusu (`/api/launcher/v1`)
- **Oyun çekirdeği (Adım 3+):** @xmcl/core, @xmcl/installer

## Geliştirme

```bash
npm install        # bağımlılıkları kur
npm run dev        # geliştirme modunda başlat
npm run typecheck  # tip denetimi
npm run build      # üretim derlemesi
```

## Mimari

- `src/main/` — Electron ana süreç: pencere yönetimi, IPC, servisler (auth, ayarlar, java, oyun, mod sync)
- `src/preload/` — contextBridge köprüsü (`window.launcher` API'si)
- `src/renderer/` — React arayüzü: ekranlar (`screens/`), sekme içerikleri (`views/`), bileşenler (`components/`, paylaşılan UI parçaları `components/ui/`) ve zustand store'ları
- `src/shared/` — Ana süreç ile renderer arasında paylaşılan tipler
