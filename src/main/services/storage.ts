import { app } from 'electron'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'

/** Bağımlılıksız, basit JSON dosya deposu (oturum ve ayarlar için). */
class JsonStore {
  private data: Record<string, unknown> | null = null

  private get filePath(): string {
    return join(app.getPath('userData'), 'mctg-store.json')
  }

  private load(): Record<string, unknown> {
    if (this.data) return this.data
    try {
      this.data = existsSync(this.filePath)
        ? (JSON.parse(readFileSync(this.filePath, 'utf-8')) as Record<string, unknown>)
        : {}
    } catch {
      this.data = {}
    }
    return this.data
  }

  get<T>(key: string, fallback: T): T {
    const value = this.load()[key]
    return value === undefined ? fallback : (value as T)
  }

  set(key: string, value: unknown): void {
    const data = this.load()
    if (value === undefined) {
      delete data[key]
    } else {
      data[key] = value
    }
    mkdirSync(dirname(this.filePath), { recursive: true })
    writeFileSync(this.filePath, JSON.stringify(data, null, 2), 'utf-8')
  }

  delete(key: string): void {
    this.set(key, undefined)
  }
}

export const store = new JsonStore()
