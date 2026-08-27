# MCTG Launcher

Modern, animasyonlu Minecraft launcher. Electron + React + TypeScript ile geliştirilmektedir.

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
