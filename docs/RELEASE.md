# Sürüm çıkarma ve dağıtım

Launcher, Windows için tek tıklık bir NSIS setup dosyası olarak paketlenir ve
GitHub Releases üzerinden dağıtılır. Kurulu launcher'lar aynı Releases
akışını dinlediği için, yeni sürüm yayınlandığında kullanıcı hiçbir şey
yapmadan güncellenir.

## 1. Sürüm çıkarmak (tek yol)

Sürüm numarasını yükselt, etiketi push et; gerisini GitHub Actions yapar.

```bash
npm version patch
```

`npm version` hem `package.json` sürümünü yükseltir hem de bir commit ve
`v1.0.1` biçiminde bir etiket oluşturur. Sonra ikisini birden gönder:

```bash
git push --follow-tags
```

`v` ile başlayan etiket [.github/workflows/release.yml](../.github/workflows/release.yml)
iş akışını tetikler: bağımlılıklar kurulur, tip denetimi çalışır, launcher
derlenir ve `MCTG-Launcher-Setup.exe` + `latest.yml` yeni bir GitHub
Release'e yüklenir. Ekstra bir token gerekmez; Actions'ın kendi
`GITHUB_TOKEN`'ı yeterlidir.

Küçük değişiklik için `patch`, yeni özellik için `minor`, kırıcı değişiklik
için `major` kullan.

Actions çıktısı taslak değil, doğrudan yayınlanmış bir release'tir; yani
etiketi push ettikten birkaç dakika sonra herkesin launcher'ı güncellemeyi
görmeye başlar. Önce kendin denemek istersen `releaseType`'ı `package.json`
içindeki `build.publish` altında `draft` yap, release'i GitHub'da elle
"Publish" edene kadar kimseye inmez.

## 2. Yerelde setup üretmek

Yayınlamadan sadece kurulum dosyasını görmek için:

```bash
npm run package
```

Çıktı `dist/MCTG-Launcher-Setup.exe`. Bu komut GitHub'a hiçbir şey
göndermez (`--publish never`). `npm run release` ise aynı derlemeyi yapıp
sonucu Releases'a yükler; yerelden çalıştıracaksan `GH_TOKEN` ortam
değişkenine `repo` yetkili bir kişisel erişim anahtarı vermen gerekir —
normalde buna ihtiyaç yok, etiketi push etmek yeterli.

## 3. Launcher'ı insanlara nasıl veriyorsun

Tek bir bağlantı paylaşman yeter; bu adres her zaman en son setup'ı verir:

```
https://github.com/unsalable/mctg/releases/latest
```

Doğrudan dosyaya inen bağlantı (siteye buton koyacaksan bunu kullan):

```
https://github.com/unsalable/mctg/releases/latest/download/MCTG-Launcher-Setup.exe
```

> Setup dosyasının adında sürüm numarası yok (`win.artifactName` sabit), bu
> yüzden yukarıdaki adres hiç değişmez — siteye bir kere koyarsın, her yeni
> sürümde kendiliğinden en yeni dosyayı verir.

Kullanıcı tarafında akış şu: dosyayı indirir, çift tıklar, kurulum sorusuz
biter (tek tıklık kurulum), masaüstüne ve başlat menüsüne kısayol düşer,
launcher kendiliğinden açılır. Kurulum kullanıcı klasörüne yapıldığı için
yönetici izni istemez.

**SmartScreen uyarısı.** Setup imzalanmadığı için Windows ilk çalıştırmada
"Bilinmeyen yayımcı" uyarısı gösterebilir; kullanıcı **Daha fazla bilgi →
Yine de çalıştır** demeli. Bunu tamamen kaldırmanın tek yolu ücretli bir kod
imzalama sertifikasıdır (electron-builder `win.certificateFile` /
`CSC_LINK` ile destekler).

## 4. Otomatik güncelleme nasıl çalışıyor

[src/main/services/UpdateService.ts](../src/main/services/UpdateService.ts):
launcher açıldıktan ~4 saniye sonra ve ardından saatte bir GitHub Releases'a
bakar. Yeni sürüm varsa arka planda sessizce indirir, bitince "Şimdi yeniden
başlat / Sonra" diye sorar. Kullanıcı "Sonra" derse güncelleme, launcher bir
sonraki kapanışında kurulur.

Geliştirme modunda (`npm run dev`) kontrol tamamen atlanır — `app.isPackaged`
false olduğunda servis hiç başlamaz.

Güncellemenin çalışması için release'de `latest.yml` dosyasının bulunması
şart; Actions bunu setup ile birlikte otomatik yükler. Release varlıklarını
elle silip yeniden yüklersen `latest.yml`'yi unutma.
