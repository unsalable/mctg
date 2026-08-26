# MCTG Launcher

Modern, animasyonlu Minecraft launcher. Electron + React + TypeScript ile geliştirilmektedir.

## Özellikler (yol haritası)

- [x] Adım 1 — Microsoft OAuth girişi + UI iskeleti (3D skin görüntüleyici, OYNA butonu, özel titlebar)
- [x] Adım 2 — Ayarlar: RAM slider (2-16 GB, varsayılan 4 GB), kalıcı depolama
- [x] Adım 3 — Otomatik Java yönetimi + oyun başlatma (Minecraft 26.2, IPv4 sabitlenmiş indirmeler, otomatik Java 25 kurulumu)
- [x] Adım 4 — GitHub tabanlı profil sistemi ve mod senkronizasyonu (anti-cheat, sıfır konfigürasyon) + otomatik Fabric Loader kurulumu — bkz. [docs/MOD_REPO.md](docs/MOD_REPO.md)
- [ ] Adım 5 — Cila + paketleme (electron-builder)

## Teknoloji Yığını

- **Çatı:** Electron + electron-vite
- **UI:** React 19, TypeScript, Tailwind CSS v4, Framer Motion
- **3D Skin:** skinview3d
- **Microsoft OAuth:** msmc
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
- `src/renderer/` — React arayüzü: ekranlar, bileşenler, zustand store'ları
- `src/shared/` — Ana süreç ile renderer arasında paylaşılan tipler
