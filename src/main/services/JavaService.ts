import type { ResolvedVersion } from '@xmcl/core'
import {
  DEFAULT_RUNTIME_ALL_URL,
  installJavaRuntimeTask,
  type JavaRuntimeManifest,
  type JavaRuntimes
} from '@xmcl/installer'
import { spawn } from 'child_process'
import { app } from 'electron'
import { existsSync } from 'fs'
import { join } from 'path'
import { request } from 'undici'
import type { GameProgress } from '../../shared/types'
import { downloadDispatcher } from './downloader'

type JavaRequirement = ResolvedVersion['javaVersion']
type ProgressSink = (progress: GameProgress) => void

class JavaService {
  private runtimeDir(component: string): string {
    return join(app.getPath('userData'), 'runtime', 'java', component)
  }

  /**
   * Sürümün gerektirdiği Java'yı garanti eder ve javaw.exe yolunu döndürür.
   * Sıra: yönetilen JRE → sistemdeki uygun sürüm → Mojang'ın resmi JRE'sini indir.
   */
  async ensureJava(java: JavaRequirement, send: ProgressSink): Promise<string> {
    const destination = this.runtimeDir(java.component)
    const managedJavaw = join(destination, 'bin', 'javaw.exe')

    if (existsSync(managedJavaw)) {
      console.log('[java] yönetilen JRE bulundu')
      send({ phase: 'java', label: 'Java doğrulanıyor…', percent: null })
      return managedJavaw
    }

    send({ phase: 'java', label: 'Sistemdeki Java denetleniyor…', percent: null })
    const systemJavaw = await this.findSystemJava(java.majorVersion)
    if (systemJavaw) {
      console.log(`[java] sistemdeki Java uygun: ${systemJavaw}`)
      return systemJavaw
    }

    console.log(`[java] uygun Java yok, Mojang JRE indiriliyor (${java.component})`)
    send({ phase: 'java', label: `Java ${java.majorVersion} indiriliyor…`, percent: 0 })
    const manifest = await this.fetchRuntimeManifest(java.component)
    const task = installJavaRuntimeTask({ manifest, destination, dispatcher: downloadDispatcher })
    await task.startAndWait({
      onUpdate: () => {
        const percent = task.total > 0 ? (task.progress / task.total) * 100 : null
        send({ phase: 'java', label: `Java ${java.majorVersion} indiriliyor…`, percent })
      }
    })

    if (!existsSync(managedJavaw)) {
      throw new Error('Java kurulumu tamamlanamadı (javaw.exe bulunamadı).')
    }
    return managedJavaw
  }

  /**
   * Mojang'ın Java runtime manifestini indirir.
   * Not: @xmcl/installer'ın fetchJavaRuntimeManifest fonksiyonu undici 7'de kaldırılan
   * `throwOnError` seçeneğini kullandığı için hata veriyor; aynı işi burada kendimiz yapıyoruz.
   */
  private async fetchRuntimeManifest(component: string): Promise<JavaRuntimeManifest> {
    const platformKey = process.arch === 'arm64' ? 'windows-arm64' : 'windows-x64'

    const indexResponse = await request(DEFAULT_RUNTIME_ALL_URL, {
      dispatcher: downloadDispatcher
    })
    if (indexResponse.statusCode !== 200) {
      throw new Error(`Java runtime listesi alınamadı (HTTP ${indexResponse.statusCode}).`)
    }
    const index = (await indexResponse.body.json()) as JavaRuntimes

    const targets = index[platformKey]?.[component]
    if (!targets || targets.length === 0) {
      throw new Error(`Mojang '${component}' Java çalışma zamanını bu platform için sunmuyor.`)
    }
    const target = targets[0]

    const manifestResponse = await request(target.manifest.url, {
      dispatcher: downloadDispatcher
    })
    if (manifestResponse.statusCode !== 200) {
      throw new Error(`Java runtime manifesti alınamadı (HTTP ${manifestResponse.statusCode}).`)
    }
    const manifestJson = (await manifestResponse.body.json()) as {
      files: JavaRuntimeManifest['files']
    }

    return { target: component, files: manifestJson.files, version: target.version }
  }

  /** PATH üzerindeki javaw'ı bulur ve ana sürümü gereksinimle birebir eşleşiyorsa kullanır. */
  private async findSystemJava(requiredMajor: number): Promise<string | null> {
    const javawPath = await this.whereJavaw()
    if (!javawPath) return null
    const major = await this.readJavaMajor(javawPath)
    return major === requiredMajor ? javawPath : null
  }

  private whereJavaw(): Promise<string | null> {
    return new Promise((resolve) => {
      let output = ''
      const child = spawn('where', ['javaw'], { windowsHide: true })
      child.stdout.on('data', (chunk: Buffer) => (output += chunk.toString()))
      child.on('error', () => resolve(null))
      child.on('close', (code) => {
        const first = output.split(/\r?\n/).find((line) => line.trim().length > 0)
        resolve(code === 0 && first ? first.trim() : null)
      })
    })
  }

  /** `java -version` çıktısından ana sürümü ayrıştırır ("1.8.0_x" → 8, "21.0.2" → 21). */
  private readJavaMajor(javawPath: string): Promise<number | null> {
    const javaExe = javawPath.replace(/javaw\.exe$/i, 'java.exe')
    return new Promise((resolve) => {
      let output = ''
      const child = spawn(javaExe, ['-version'], { windowsHide: true })
      child.stderr.on('data', (chunk: Buffer) => (output += chunk.toString()))
      child.stdout.on('data', (chunk: Buffer) => (output += chunk.toString()))
      child.on('error', () => resolve(null))
      child.on('close', () => {
        const match = output.match(/version "(\d+)(?:\.(\d+))?/)
        if (!match) return resolve(null)
        const major = match[1] === '1' ? Number(match[2]) : Number(match[1])
        resolve(Number.isFinite(major) ? major : null)
      })
    })
  }
}

export const javaService = new JavaService()
