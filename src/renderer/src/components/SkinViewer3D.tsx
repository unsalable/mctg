import { useEffect, useRef } from 'react'
import { IdleAnimation, SkinViewer } from 'skinview3d'

interface SkinViewer3DProps {
  skin: string
  variant: 'classic' | 'slim'
  /** Etkin pelerinin dokusu (data URL); yoksa model pelerinsiz gösterilir. */
  cape?: string | null
  /** Kamera otomatik dönsün mü? */
  autoRotate?: boolean
}

/** Oyuncu skinini incelenebilir (döndür/yakınlaştır) 3D model olarak gösterir. */
export default function SkinViewer3D({
  skin,
  variant,
  cape = null,
  autoRotate = true
}: SkinViewer3DProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const container = containerRef.current
    const canvas = canvasRef.current
    if (!container || !canvas) return

    const rect = container.getBoundingClientRect()
    const viewer = new SkinViewer({
      canvas,
      width: Math.max(rect.width, 1),
      height: Math.max(rect.height, 1)
    })
    viewer.fov = 35
    viewer.zoom = 0.9
    viewer.autoRotate = autoRotate
    viewer.autoRotateSpeed = 0.35
    viewer.animation = new IdleAnimation()
    viewer.controls.enablePan = false
    viewer.controls.enableZoom = true
    void viewer.loadSkin(skin, { model: variant === 'slim' ? 'slim' : 'default' })
    if (cape) {
      void viewer.loadCape(cape)
    } else {
      viewer.loadCape(null)
    }

    const resizeObserver = new ResizeObserver(() => {
      const r = container.getBoundingClientRect()
      viewer.setSize(Math.max(r.width, 1), Math.max(r.height, 1))
    })
    resizeObserver.observe(container)

    return () => {
      resizeObserver.disconnect()
      viewer.dispose()
    }
  }, [skin, variant, cape, autoRotate])

  return (
    <div ref={containerRef} className="h-full w-full cursor-grab active:cursor-grabbing">
      <canvas ref={canvasRef} />
    </div>
  )
}
