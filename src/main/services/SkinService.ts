import { randomUUID } from 'crypto'
import { app, BrowserWindow, dialog } from 'electron'
import { mkdir, readFile, rm, writeFile } from 'fs/promises'
import { basename, join } from 'path'
import type { AccountSnapshot, CapeInfo, SkinLibraryItem } from '../../shared/types'
import { authService, toDataUrl, type RawMcProfile } from './AuthService'
import { store } from './storage'

const LIBRARY_KEY = 'skinLibrary'
const ACTIVE_KEY = 'skinLibraryActive'
const SKINS_ENDPOINT = 'https://api.minecraftservices.com/minecraft/profile/skins'
const ACTIVE_SKIN_ENDPOINT = `${SKINS_ENDPOINT}/active`
const ACTIVE_CAPE_ENDPOINT = 'https://api.minecraftservices.com/minecraft/profile/capes/active'
const MAX_SKIN_BYTES = 2 * 1024 * 1024

interface LibraryRecord {
  id: string
  name: string
  variant: 'classic' | 'slim'
  /** skins klasöründeki dosya adı. */
  file: string
  addedAt: number
}

/** Kütüphaneden yüklenen skinin hâlâ hesapta etkin olup olmadığını izlemek için. */
interface ActiveMark {
  libraryId: string
  skinUrl: string
}

/**
 * Hesap sekmesinin çekirdeği: Mojang profilinden skin/pelerin bilgisini okur,
 * kullanıcının kendi skin kütüphanesini diskte tutar ve seçilen skini/pelerini
 * resmi Minecraft Services API'si üzerinden hesaba uygular.
 */
class SkinService {
  private get skinsDir(): string {
    return join(app.getPath('userData'), 'skins')
  }

  async snapshot(): Promise<AccountSnapshot> {
    return this.buildSnapshot(await authService.fetchProfile())
  }

  async addSkin(win: BrowserWindow | null): Promise<AccountSnapshot | 'cancelled'> {
    const options = {
      title: 'Skin dosyası seç',
      buttonLabel: 'Ekle',
      filters: [{ name: 'Minecraft skini (PNG)', extensions: ['png'] }],
      properties: ['openFile', 'multiSelections'] as Array<'openFile' | 'multiSelections'>
    }
    const result = win
      ? await dialog.showOpenDialog(win, options)
      : await dialog.showOpenDialog(options)
    if (result.canceled || result.filePaths.length === 0) return 'cancelled'

    await mkdir(this.skinsDir, { recursive: true })
    const records = this.records()

    for (const filePath of result.filePaths) {
      const buffer = await readFile(filePath)
      this.assertValidSkin(buffer, basename(filePath))

      const id = randomUUID()
      const file = `${id}.png`
      await writeFile(join(this.skinsDir, file), buffer)
      records.push({
        id,
        name: basename(filePath).replace(/\.png$/i, '').slice(0, 40) || 'Skin',
        variant: 'classic',
        file,
        addedAt: Date.now()
      })
    }

    store.set(LIBRARY_KEY, records)
    return this.snapshot()
  }

  async removeSkin(id: string): Promise<AccountSnapshot> {
    const records = this.records()
    const record = records.find((r) => r.id === id)
    if (record) {
      await rm(join(this.skinsDir, record.file), { force: true })
      store.set(
        LIBRARY_KEY,
        records.filter((r) => r.id !== id)
      )
      const mark = store.get<ActiveMark | null>(ACTIVE_KEY, null)
      if (mark?.libraryId === id) store.delete(ACTIVE_KEY)
    }
    return this.snapshot()
  }

  async applySkin(id: string, variant: 'classic' | 'slim'): Promise<AccountSnapshot> {
    const record = this.records().find((r) => r.id === id)
    if (!record) throw new Error('Skin kütüphanede bulunamadı.')

    const buffer = await readFile(join(this.skinsDir, record.file))
    this.assertValidSkin(buffer, record.name)

    const form = new FormData()
    form.set('variant', variant)
    form.set('file', new Blob([new Uint8Array(buffer)], { type: 'image/png' }), 'skin.png')

    const response = await fetch(SKINS_ENDPOINT, {
      method: 'POST',
      headers: { authorization: `Bearer ${await authService.token()}` },
      body: form
    })
    if (!response.ok) throw new Error(await this.describeFailure(response, 'Skin yüklenemedi'))

    // Seçilen model kütüphanede de hatırlansın; bir dahaki uygulamada aynı gelsin.
    store.set(
      LIBRARY_KEY,
      this.records().map((r) => (r.id === id ? { ...r, variant } : r))
    )

    const body = (await response.json().catch(() => null)) as RawMcProfile | null
    const fresh = body?.skins ? body : await authService.fetchProfile()
    const activeUrl = fresh.skins?.find((s) => s.state === 'ACTIVE')?.url
    if (activeUrl) {
      const mark: ActiveMark = { libraryId: id, skinUrl: activeUrl }
      store.set(ACTIVE_KEY, mark)
    }

    return this.buildSnapshot(fresh)
  }

  async resetSkin(): Promise<AccountSnapshot> {
    const response = await fetch(ACTIVE_SKIN_ENDPOINT, {
      method: 'DELETE',
      headers: { authorization: `Bearer ${await authService.token()}` }
    })
    if (!response.ok) throw new Error(await this.describeFailure(response, 'Skin sıfırlanamadı'))
    store.delete(ACTIVE_KEY)
    return this.snapshot()
  }

  async setCape(capeId: string | null): Promise<AccountSnapshot> {
    const token = await authService.token()
    const response = capeId
      ? await fetch(ACTIVE_CAPE_ENDPOINT, {
          method: 'PUT',
          headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
          body: JSON.stringify({ capeId })
        })
      : await fetch(ACTIVE_CAPE_ENDPOINT, {
          method: 'DELETE',
          headers: { authorization: `Bearer ${token}` }
        })

    if (!response.ok) {
      throw new Error(await this.describeFailure(response, 'Pelerin değiştirilemedi'))
    }
    const body = (await response.json().catch(() => null)) as RawMcProfile | null
    return this.buildSnapshot(body?.capes ? body : await authService.fetchProfile())
  }

  private async buildSnapshot(profile: RawMcProfile): Promise<AccountSnapshot> {
    const session = await authService.sessionFromProfile(profile)

    const capes: CapeInfo[] = []
    for (const cape of profile.capes ?? []) {
      capes.push({
        id: cape.id,
        alias: cape.alias ?? 'Pelerin',
        active: cape.state === 'ACTIVE',
        imageDataUrl: await toDataUrl(cape.url)
      })
    }

    const mark = store.get<ActiveMark | null>(ACTIVE_KEY, null)
    const activeUrl = profile.skins?.find((s) => s.state === 'ACTIVE')?.url ?? null
    const library: SkinLibraryItem[] = []
    for (const record of this.records()) {
      const imageDataUrl = await this.readLibraryImage(record)
      if (!imageDataUrl) continue
      library.push({
        id: record.id,
        name: record.name,
        variant: record.variant,
        imageDataUrl,
        addedAt: record.addedAt,
        active: mark?.libraryId === record.id && mark.skinUrl === activeUrl
      })
    }
    library.sort((a, b) => b.addedAt - a.addedAt)

    return { session, capes, library }
  }

  private records(): LibraryRecord[] {
    const saved = store.get<LibraryRecord[]>(LIBRARY_KEY, [])
    return Array.isArray(saved) ? saved.filter((r) => typeof r?.id === 'string' && !!r.file) : []
  }

  private async readLibraryImage(record: LibraryRecord): Promise<string | null> {
    try {
      const buffer = await readFile(join(this.skinsDir, record.file))
      return `data:image/png;base64,${buffer.toString('base64')}`
    } catch {
      // Dosya elle silinmişse kayıt sessizce atlanır.
      return null
    }
  }

  /** PNG imzası + Minecraft skin ölçüleri (64x64 ya da eski 64x32) doğrulanır. */
  private assertValidSkin(buffer: Buffer, label: string): void {
    if (buffer.length > MAX_SKIN_BYTES) {
      throw new Error(`"${label}" çok büyük (en fazla 2 MB).`)
    }
    const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    if (buffer.length < 24 || !buffer.subarray(0, 8).equals(signature)) {
      throw new Error(`"${label}" geçerli bir PNG dosyası değil.`)
    }
    const width = buffer.readUInt32BE(16)
    const height = buffer.readUInt32BE(20)
    if (width !== 64 || (height !== 64 && height !== 32)) {
      throw new Error(`"${label}" ölçüsü uygun değil (${width}x${height}); 64x64 olmalı.`)
    }
  }

  private async describeFailure(response: Response, prefix: string): Promise<string> {
    if (response.status === 401 || response.status === 403) {
      return `${prefix}: oturum yetkisi geçersiz. Çıkış yapıp yeniden giriş yap.`
    }
    if (response.status === 429) {
      return `${prefix}: Mojang istek sınırı aşıldı, birkaç dakika sonra tekrar dene.`
    }
    const body = await response.text().catch(() => '')
    const detail = body.slice(0, 160)
    return `${prefix} (HTTP ${response.status})${detail ? `: ${detail}` : '.'}`
  }
}

export const skinService = new SkinService()
