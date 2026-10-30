import { useEffect, useRef } from "react"
import { World } from "./character-ocean/world"
import { AsciiRenderer } from "./character-ocean/renderer"
import "./character-ocean.css"

export function CharacterOceanHome() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    window.scrollTo(0, 0)
    const world = new World()
    const renderer = new AsciiRenderer(canvas)
    const motion = matchMedia("(prefers-reduced-motion: reduce)")
    let frame = 0
    let disposed = false
    let visible = true
    let last = 0
    let accumulator = 0
    const step = 1 / 60
    const draw = () => renderer.render(world)
    const animate = (now: number) => {
      accumulator += Math.min((now - last) / 1000, .1) * .65
      last = now
      let steps = 0
      while (accumulator >= step && steps < 4) {
        world.step(step)
        accumulator -= step
        steps++
      }
      if (steps === 4) accumulator = 0
      draw()
      frame = requestAnimationFrame(animate)
    }
    const schedule = () => {
      cancelAnimationFrame(frame)
      if (disposed || !visible || document.hidden || motion.matches) return
      last = performance.now()
      frame = requestAnimationFrame(animate)
    }
    const resize = () => {
      const { width, height } = canvas.getBoundingClientRect()
      if (!width || !height) return
      renderer.resize(width, height, Math.min(devicePixelRatio || 1, 1.5))
      world.resize(width, height, renderer.cellWidth, renderer.cellHeight)
      if (world.time < 2) for (let i = 0; i < 120; i++) world.step(step)
      draw()
    }
    const onMotion = () => { draw(); schedule() }
    const resizeObserver = new ResizeObserver(resize)
    const intersectionObserver = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
      schedule()
    })
    resizeObserver.observe(canvas)
    intersectionObserver.observe(canvas)
    motion.addEventListener("change", onMotion)
    document.addEventListener("visibilitychange", schedule)
    resize()
    // Canvas does not load fonts by itself. Redraw once the existing local face loads.
    void document.fonts.load(`600 16px ${getComputedStyle(canvas).fontFamily}`, "TYPE").then(() => {
      if (!disposed) draw()
    })
    schedule()
    return () => {
      disposed = true
      cancelAnimationFrame(frame)
      resizeObserver.disconnect()
      intersectionObserver.disconnect()
      motion.removeEventListener("change", onMotion)
      document.removeEventListener("visibilitychange", schedule)
    }
  }, [])
  return (
    <section className="character-ocean-home" aria-labelledby="ocean-home-title" lang="zh-CN">
      <canvas ref={canvasRef} aria-hidden="true" />
      <h1 id="ocean-home-title">全自动大物实验</h1>
    </section>
  )
}
