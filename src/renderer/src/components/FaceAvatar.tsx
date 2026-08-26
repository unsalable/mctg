import { useEffect, useRef } from 'react'

interface FaceAvatarProps {
  skin: string
  size?: number
}

/** Skin PNG'sinden yüz bölgesini (8,8 8x8 + şapka katmanı 40,8) kırpıp piksel avatar üretir. */
export default function FaceAvatar({ skin, size = 32 }: FaceAvatarProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    const img = new Image()
    img.onload = () => {
      ctx.imageSmoothingEnabled = false
      ctx.clearRect(0, 0, size, size)
      ctx.drawImage(img, 8, 8, 8, 8, 0, 0, size, size)
      ctx.drawImage(img, 40, 8, 8, 8, 0, 0, size, size)
    }
    img.src = skin
  }, [skin, size])

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className="rounded-md"
      style={{ width: size, height: size }}
    />
  )
}
