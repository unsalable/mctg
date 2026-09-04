import { useEffect, useRef } from 'react'

interface CapePreviewProps {
  /** Pelerin dokusu (data URL). */
  texture: string
  width?: number
}

/** Pelerin dokusunun ön yüzünü (1,1 10x16) kırpıp piksel önizleme üretir. */
export default function CapePreview({ texture, width = 40 }: CapePreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const height = Math.round((width / 10) * 16)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    const img = new Image()
    img.onload = () => {
      // Dokular 64x32'nin katları olabilir; ölçek buna göre hesaplanır.
      const scale = img.width / 64
      ctx.imageSmoothingEnabled = false
      ctx.clearRect(0, 0, width, height)
      ctx.drawImage(img, 1 * scale, 1 * scale, 10 * scale, 16 * scale, 0, 0, width, height)
    }
    img.src = texture
  }, [texture, width, height])

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="pixelated rounded-md"
      style={{ width, height }}
    />
  )
}
