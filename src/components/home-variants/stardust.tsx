import { useEffect, useRef } from "react"

// Draw only on mount/resize: thousands of stars, one canvas, no animation loop.
export function Stardust() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const context = canvas.getContext("2d")
    if (!context) return
    let frame = 0
    const draw = () => {
      const { width, height } = canvas.getBoundingClientRect()
      if (!width || !height) return
      const ratio = Math.min(window.devicePixelRatio || 1, 1.5)
      canvas.width = Math.round(width * ratio)
      canvas.height = Math.round(height * ratio)
      context.setTransform(ratio, 0, 0, ratio, 0, 0)
      let seed = 74129
      const random = () => {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
        return seed / 4294967296
      }
      const gaussian = () => Math.sqrt(-2 * Math.log(Math.max(random(), .00001))) * Math.cos(2 * Math.PI * random())
      const count = width < 600 ? 3000 : 7600
      for (let i = 0; i < count; i++) {
        const cloud = i > count * .16
        const x = cloud ? width * (.5 + gaussian() * .235) : random() * width
        const y = cloud ? height * .5 + gaussian() * Math.min(height * .16, width * .13) : random() * height
        const distance = Math.abs(x / width - .5)
        const alpha = (.2 + random() * .75) * Math.max(.12, 1 - distance)
        const radius = random() < .015 ? 1 + random() * .65 : .25 + random() * .65
        context.fillStyle = `rgba(245,239,224,${alpha})`
        context.beginPath()
        context.arc(x, y, radius, 0, Math.PI * 2)
        context.fill()
      }
    }
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(draw)
    })
    observer.observe(canvas)
    return () => { observer.disconnect(); cancelAnimationFrame(frame) }
  }, [])
  return <canvas ref={canvasRef} className="home-stardust" aria-hidden="true" />
}

