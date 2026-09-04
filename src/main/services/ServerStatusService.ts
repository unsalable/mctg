import { BrowserWindow } from 'electron'
import net from 'net'
import { MC_SERVER_HOST, MC_SERVER_PORT } from '../../shared/constants'
import type { ServerStatus } from '../../shared/types'

const PING_TIMEOUT_MS = 5_000
/** Çevrimiçiyken bu aralıkla tazelenir (oyuncu sayısı, gecikme). */
const REFRESH_MS = 30_000
/** Çevrimdışıyken artan bekleme: 5s, 10s, 20s, 40s ve sonrası 60s. */
const RETRY_STEPS_MS = [5_000, 10_000, 20_000, 40_000, 60_000]

/** Sunucuya "hangi sürümdenim" demeden sorar; -1 "bilinmiyor" demektir. */
const PROTOCOL_UNKNOWN = -1

function writeVarInt(value: number): Buffer {
  const bytes: number[] = []
  let v = value | 0
  for (;;) {
    if ((v & ~0x7f) === 0) {
      bytes.push(v)
      break
    }
    bytes.push((v & 0x7f) | 0x80)
    // İşaretsiz kaydırma: negatif sayılar 5 bayta düzgün açılsın.
    v >>>= 7
  }
  return Buffer.from(bytes)
}

function writeString(text: string): Buffer {
  const body = Buffer.from(text, 'utf-8')
  return Buffer.concat([writeVarInt(body.length), body])
}

/** Paketi uzunluk öneki ile sarar. */
function packet(id: number, ...parts: Buffer[]): Buffer {
  const body = Buffer.concat([writeVarInt(id), ...parts])
  return Buffer.concat([writeVarInt(body.length), body])
}

/** Tampondan VarInt okur; veri yetmiyorsa null döner (daha fazla bayt bekle). */
function readVarInt(buffer: Buffer, offset: number): { value: number; size: number } | null {
  let result = 0
  let size = 0
  let byte = 0
  do {
    if (offset + size >= buffer.length) return null
    if (size >= 5) throw new Error('Bozuk VarInt')
    byte = buffer[offset + size]
    result |= (byte & 0x7f) << (7 * size)
    size += 1
  } while ((byte & 0x80) !== 0)
  return { value: result >>> 0, size }
}

const stripColors = (text: string): string => text.replace(/§[0-9a-fk-or]/gi, '')

/** MOTD düz metin, {text} ya da {extra:[…]} gelebilir; hepsi tek satıra indirgenir. */
function flattenMotd(description: unknown): string {
  if (description == null) return ''
  if (typeof description === 'string') return stripColors(description)
  if (Array.isArray(description)) return description.map(flattenMotd).join('')

  const node = description as { text?: unknown; extra?: unknown }
  let out = typeof node.text === 'string' ? node.text : ''
  if (Array.isArray(node.extra)) out += node.extra.map(flattenMotd).join('')
  return stripColors(out)
}

interface PingResult {
  online: boolean
  error: string | null
  players: { online: number; max: number }
  version: string | null
  motd: string | null
  latencyMs: number | null
}

const OFFLINE = (error: string): PingResult => ({
  online: false,
  error,
  players: { online: 0, max: 0 },
  version: null,
  motd: null,
  latencyMs: null
})

/**
 * Minecraft "Server List Ping" (1.7+ protokolü).
 *
 * Oyun içi sunucu listesinde görünen bilgiyi ham TCP ile çeker:
 * ayakta mı, kaç oyuncu var, sürüm, MOTD, gecikme.
 * Protokol: https://minecraft.wiki/w/Java_Edition_protocol
 */
function pingServer(host: string, port: number, timeoutMs = PING_TIMEOUT_MS): Promise<PingResult> {
  return new Promise((resolve) => {
    const startedAt = Date.now()
    let settled = false
    let chunks = Buffer.alloc(0)

    const finish = (result: PingResult): void => {
      if (settled) return
      settled = true
      socket.destroy()
      resolve(result)
    }

    const socket = net.createConnection({ host, port })
    socket.setTimeout(timeoutMs)

    socket.on('connect', () => {
      const portBuffer = Buffer.alloc(2)
      portBuffer.writeUInt16BE(port)
      socket.write(
        packet(
          0x00,
          writeVarInt(PROTOCOL_UNKNOWN),
          writeString(host),
          portBuffer,
          writeVarInt(1)
        )
      )
      socket.write(packet(0x00))
    })

    // setEncoding çağrılmadığı için akış her zaman Buffer verir; tip birleşimi
    // string'i de kapsadığından burada daraltılıyor.
    socket.on('data', (chunk: Buffer) => {
      chunks = Buffer.concat([chunks, chunk])
      try {
        const length = readVarInt(chunks, 0)
        if (!length) return
        if (chunks.length < length.size + length.value) return

        const id = readVarInt(chunks, length.size)
        if (!id) return
        if (id.value !== 0x00) return finish(OFFLINE('Sunucu beklenmeyen bir yanıt verdi.'))

        const strAt = length.size + id.size
        const strLen = readVarInt(chunks, strAt)
        if (!strLen) return

        const json = chunks
          .subarray(strAt + strLen.size, strAt + strLen.size + strLen.value)
          .toString('utf-8')
        const data = JSON.parse(json) as {
          version?: { name?: string }
          players?: { online?: number; max?: number }
          description?: unknown
        }

        finish({
          online: true,
          error: null,
          latencyMs: Date.now() - startedAt,
          version: stripColors(data.version?.name ?? '') || null,
          motd: flattenMotd(data.description).trim() || null,
          players: {
            online: Number(data.players?.online ?? 0),
            max: Number(data.players?.max ?? 0)
          }
        })
      } catch (err) {
        finish(OFFLINE(err instanceof Error ? err.message : String(err)))
      }
    })

    socket.on('timeout', () => finish(OFFLINE('Sunucu zaman aşımına uğradı.')))
    socket.on('error', (err) => finish(OFFLINE(friendlyNetworkError(err))))
    socket.on('close', () => finish(OFFLINE('Bağlantı kapandı.')))
  })
}

function friendlyNetworkError(err: Error & { code?: string }): string {
  switch (err.code) {
    case 'ENOTFOUND':
    case 'EAI_AGAIN':
      return 'Sunucu adresi çözümlenemedi.'
    case 'ECONNREFUSED':
      return 'Sunucu bağlantıyı reddetti (kapalı olabilir).'
    case 'ETIMEDOUT':
      return 'Sunucuya ulaşılamadı (zaman aşımı).'
    default:
      return 'Sunucuya ulaşılamadı.'
  }
}

/**
 * play.mctg.com.tr'ye sürekli bağlanmayı deneyen arka plan görevi.
 *
 * Launcher açılır açılmaz başlar ve BAŞARISIZ OLURSA KENDİ KENDİNE tekrar
 * dener (5s → 10s → 20s → 40s → 60s). Kullanıcının "yeniden dene" tuşuna
 * basması gerekmez; oyuna girmeden önce sunucunun ayakta olup olmadığı
 * ekranda görünür. Oyun da başlatılırken doğrudan bu adrese bağlanır.
 */
class ServerStatusService {
  private host = MC_SERVER_HOST
  private port = MC_SERVER_PORT
  private timer: NodeJS.Timeout | null = null
  private pinging: Promise<ServerStatus> | null = null
  private windows = new Set<BrowserWindow>()

  private status: ServerStatus = {
    host: MC_SERVER_HOST,
    port: MC_SERVER_PORT,
    online: false,
    players: { online: 0, max: 0 },
    version: null,
    motd: null,
    latencyMs: null,
    error: null,
    attempts: 0,
    retryInMs: null,
    checking: true
  }

  current(): ServerStatus {
    return { ...this.status }
  }

  /** Pencere kapanınca listeden düşer; kapalı pencereye olay gönderilmez. */
  watch(win: BrowserWindow): void {
    this.windows.add(win)
    win.on('closed', () => this.windows.delete(win))
    // Yeni pencere açılır açılmaz elindeki son durumu görsün.
    win.webContents.once('did-finish-load', () => this.broadcast())
  }

  /** Adres site yapılandırmasından geldiyse günceller ve hemen yeniden dener. */
  setAddress(host: string, port: number): void {
    if (host === this.host && port === this.port) return
    this.host = host
    this.port = port
    this.status = { ...this.status, host, port, attempts: 0 }
    void this.retryNow()
  }

  start(): void {
    if (this.timer) return
    void this.tick()
  }

  /** Zamanlayıcıyı beklemeden hemen dener (kullanıcı "tekrar dene" dediğinde). */
  async retryNow(): Promise<ServerStatus> {
    this.clearTimer()
    return this.tick()
  }

  private async tick(): Promise<ServerStatus> {
    // Aynı anda ikinci bir ping başlatma; süren varsa onun sonucunu paylaş.
    if (this.pinging) return this.pinging
    this.status = { ...this.status, checking: true, retryInMs: null }
    this.broadcast()

    this.pinging = pingServer(this.host, this.port).then((result) => {
      const attempts = result.online ? 0 : this.status.attempts + 1
      const delay = result.online
        ? REFRESH_MS
        : RETRY_STEPS_MS[Math.min(attempts - 1, RETRY_STEPS_MS.length - 1)]

      this.status = {
        host: this.host,
        port: this.port,
        online: result.online,
        players: result.players,
        version: result.version,
        motd: result.motd,
        latencyMs: result.latencyMs,
        error: result.error,
        attempts,
        retryInMs: result.online ? null : delay,
        checking: false
      }

      if (!result.online) {
        console.warn(
          `[sunucu] ${this.host}:${this.port} ulaşılamıyor (${attempts}. deneme): ${result.error} — ${delay / 1000}s sonra tekrar denenecek`
        )
      } else if (attempts === 0 && this.status.latencyMs !== null) {
        console.log(
          `[sunucu] ${this.host}:${this.port} çevrimiçi — ${result.players.online}/${result.players.max} oyuncu, ${result.latencyMs}ms`
        )
      }

      this.broadcast()
      this.schedule(delay)
      return this.current()
    })

    try {
      return await this.pinging
    } finally {
      this.pinging = null
    }
  }

  private schedule(delayMs: number): void {
    this.clearTimer()
    this.timer = setTimeout(() => {
      this.timer = null
      void this.tick()
    }, delayMs)
    // Bekleyen ping uygulamanın kapanmasını geciktirmesin.
    this.timer.unref?.()
  }

  private clearTimer(): void {
    if (!this.timer) return
    clearTimeout(this.timer)
    this.timer = null
  }

  private broadcast(): void {
    for (const win of this.windows) {
      if (!win.isDestroyed()) win.webContents.send('server:status', this.current())
    }
  }
}

export const serverStatusService = new ServerStatusService()
