import { useEffect, useRef } from 'react'
import { IdleAnimation, SkinViewer } from 'skinview3d'

interface SkinViewer3DProps {
  skin: string
  variant: 'classic' | 'slim'
}

/** Oyuncu skinini incelenebilir (döndür/yakınlaştır) 3D model olarak gösterir. */
export default function SkinViewer3D({ skin, variant }: SkinViewer3DProps) {
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
    viewer.autoRotate = true
    viewer.autoRotateSpeed = 0.35
    viewer.animation = new IdleAnimation()
    viewer.controls.enablePan = false
    viewer.controls.enableZoom = true
    void viewer.loadSkin(skin, { model: variant === 'slim' ? 'slim' : 'default' })

    const resizeObserver = new ResizeObserver(() => {
      const r = container.getBoundingClientRect()
      viewer.setSize(Math.max(r.width, 1), Math.max(r.height, 1))
    })
    resizeObserver.observe(container)

    return () => {
      resizeObserver.disconnect()
      viewer.dispose()
    }
  }, [skin, variant])

  return (
    <div ref={containerRef} className="h-full w-full cursor-grab active:cursor-grabbing">
      <canvas ref={canvasRef} />
    </div>
  )
}
