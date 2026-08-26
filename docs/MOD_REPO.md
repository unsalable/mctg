# Mod Deposu Şeması (Sıfır Konfigürasyon)

Launcher, mod paketlerini herkese açık bir GitHub reposundan yönetir. **Manifest
üretmek, hash hesaplamak veya script çalıştırmak gerekmez** — dosya listesi ve
hash'ler doğrudan GitHub API'sinden okunur. Tek yapman gereken, mod dosyalarını
repoya yüklemek.

## Repo yapısı

Repodaki **her üst düzey klasör bir profildir**; içindeki dosyalar o profilin
paketidir:

```
varsayilan/
  sodium-fabric-0.9.1+mc26.2.jar
  lithium-fabric-0.25.3+mc26.2.jar
  ...
unsalable/
  iris-fabric-1.11.2+mc26.2.jar
  ...
```

- Klasör adı = profil kimliği (küçük harf, rakam, tire, alt çizgi).
- Klasörün doğrudan içindeki dosyalar oyunun `mods/` klasörüne eşitlenir.
- İstersen alt klasörler de kullanabilirsin: `varsayilan/config/...`,
  `varsayilan/resourcepacks/...` gibi bilinen klasörler (`mods`, `config`,
  `resourcepacks`, `shaderpacks`, `datapacks`) instance köküne birebir kopyalanır.

## Loader tespiti (Fabric)

Klasördeki dosya adlarında "fabric" geçiyorsa profil **Fabric** olarak işaretlenir;
launcher, oyunu başlatmadan önce uygun Fabric Loader sürümünü otomatik kurar.
Bu tespiti `profiles.json` ile elle de belirleyebilirsin.

## İsteğe bağlı: profiles.json

Görünen ad, açıklama, Minecraft sürümü veya loader'ı özelleştirmek istersen repo
köküne bir `profiles.json` ekleyebilirsin. Tamamen isteğe bağlıdır:

```json
[
  {
    "id": "varsayilan",
    "name": "Varsayılan Paket",
    "description": "Sunucunun zorunlu modları",
    "mcVersion": "26.2",
    "loader": "fabric"
  },
  {
    "id": "unsalable",
    "name": "Unsalable Paketi",
    "description": "Ek görsel modlar"
  }
]
```

Belirtilmeyen alanlar için varsayılanlar kullanılır: ad = klasör adı,
mcVersion = 26.2, loader = otomatik tespit.

## Anti-hile senkronizasyonu nasıl çalışır?

Oyun her başlatıldığında (Vanilla profili hariç):

1. Reponun dosya ağacı GitHub API'sinden çekilir (`git/trees`, hash'ler dahil).
2. Yerel `mods/` klasöründeki her dosyanın **git blob hash'i**
   (`sha1("blob <boyut>\0" + içerik)`) hesaplanır ve repodakiyle karşılaştırılır.
3. Listede olmayan veya hash'i uyuşmayan her dosya **silinir** (hile/değişiklik koruması).
4. Eksik dosyalar `raw.githubusercontent.com` üzerinden indirilir ve indirme
   sonrası hash tekrar doğrulanır.
5. `mods/` dışındaki dosyalar (ör. `config/`) silinmez; yalnızca eksik/bozuksa
   repodan tamamlanır.

## Güncelleme akışı

1. GitHub'da profil klasörüne yeni jar'ı yükle (veya eskisini sil).
2. Bitti. Oyuncular bir sonraki "OYNA" tıklamasında otomatik eşitlenir.

> Not: GitHub API'nin anonim istek sınırı IP başına saatte 60'tır. Launcher,
> ağacı kısa süreli önbelleğe alır ve repoya ulaşılamazsa son başarılı kopyayı
> kullanır.
