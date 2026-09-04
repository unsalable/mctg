# Mod Deposu

Launcher, mod profillerini ve mod dosyalarını **MCTG sitesinden** okur. Bu
doküman eskiden bir GitHub reposu şemasını anlatıyordu; o sistem emekli edildi.

## Nasıl çalışır

```
üye siteye .jar yükler  →  yönetici onaylar  →  havuza girer
                                                  ↓
                          üye profiline ekler  →  launcher'a iner
```

Launcher, Profiller sekmesinde ve her **OYNA** tıklamasında siteden şunları
ister:

| Uç | Ne döner |
| --- | --- |
| `GET /api/launcher/v1/profiles` | Resmî profil + kullanıcının kendi profilleri + onaylı herkese açık profiller |
| `GET /api/launcher/v1/profiles/:id/manifest` | `{ path, sha256, size }` girdileri + uyarılar |
| `GET /api/launcher/v1/files/:sha256` | Dosyanın kendisi (Range destekli) |

Üçü de onaylı bir site hesabı ister; jeton `SiteService` içinde durur.

## Senkron nasıl çalışır?

Oyun her başlatıldığında (Vanilla profili hariç):

1. Profilin manifesti siteden çekilir.
2. Yerel `mods/` klasöründeki her dosyanın **sha256**'sı hesaplanır ve
   manifesttekiyle karşılaştırılır.
3. Listede olmayan veya hash'i uyuşmayan her dosya **silinir**.
4. Eksik dosyalar indirilir ve indirme sonrası hash tekrar doğrulanır.
5. `mods/` dışındaki dosyalar (ör. `config/`) silinmez; yalnızca eksik ya da
   bozuksa tamamlanır.

Bu bir bütünlük özelliğidir, güvenlik sınırı değil: kararlı bir oyuncu başka
bir launcher çalıştırır. Hileyi sunucudan uzak tutmak sunucu tarafı bir
eklentinin işi.

## İstemci tarafı doğrulama

Sunucu indirme adresini **göndermez**; launcher onu kendi sabit
`SITE_API_BASE`'inden üretir. İndirme isteklerine `Authorization` başlığı
eklendiği için sunucunun verdiği mutlak bir adres jeton sızdırma vektörü
olurdu.

Sunucunun söylediği hedef yol da istemcide ayrıca doğrulanır
(`mods`, `config`, `resourcepacks`, `shaderpacks`, `datapacks` ile başlamalı,
`..` ve mutlak yol yok): launcher kullanıcının bilgisayarında çalışan bir
`.exe`; uzak bir sunucuya dosyayı istediği yere yazdırma yetkisi verilmez.

## Loader desteği

Launcher yalnızca **Vanilla** ve **Fabric** profilleri açar. Site quilt/forge/
neoforge da tutabildiği için böyle bir profil listelenmez; yerine Profiller
sekmesinde uyarı gösterilir. Fabric profillerinde loader sürümü oyun
başlatılmadan önce otomatik kurulur.

## Profil kimlikleri

Profil kimliği doğrudan instance klasör adı olur
(`%APPDATA%/mctg-launcher/instances/<profileId>`) ve orada oyuncunun dünyaları
durur. Bu yüzden kimlik **asla değişmez**: sitede profil yeniden
adlandırılabilir, kimliği sabit kalır.

## Çevrimdışı davranış

Profil listesi ve manifest son başarılı hâliyle diske yazılır. Siteye
ulaşılamazsa liste "en son bilinen" uyarısıyla gösterilir, manifest
önbellekten okunur ve diskteki dosyalar yerel olarak doğrulanır — oyun yine
açılır. Kısa ömürlü bellek önbelleği yoktur (o yalnızca GitHub'ın saatlik
istek sınırı içindi), yani sitedeki bir değişiklik bir sonraki **OYNA**
tıklamasında iner.

## Güncelleme akışı

1. Siteden modu yükle veya profilden çıkar.
2. Yönetici yeni modu onaylar.
3. Bitti. Oyuncular bir sonraki **OYNA** tıklamasında eşitlenir.

## Adres yapılandırması

`src/shared/constants.ts` → `SITE_API_BASE` (`https://mctg.com.tr`).
Geliştirmede yerel siteye bakmak için:

```bash
MCTG_API_BASE=http://localhost:8787 npm run dev
```

> Launcher kendini güncellemiyor; paketlenmiş `.exe` bu adresi kalıcı taşır.
> Sunucu tarafında `/api/launcher/v1` sözleşmesi bu yüzden dondurulmuştur.
