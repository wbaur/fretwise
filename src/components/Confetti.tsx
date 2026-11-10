import { useEffect, useRef } from 'react'

const COLORS = ['#6c4cf5', '#ff7a59', '#17b3a3', '#f5a623', '#3b8beb', '#22d58a', '#ff6b8b']

/** A short burst of confetti over the whole screen. Skipped when the user prefers reduced motion. */
export function Confetti({ pieces = 140, duration = 2600 }: { pieces?: number; duration?: number }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    const canvas = ref.current!
    const ctx = canvas.getContext('2d')!
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const W = window.innerWidth
    const H = window.innerHeight
    canvas.width = W * dpr
    canvas.height = H * dpr
    ctx.scale(dpr, dpr)
    const parts = Array.from({ length: pieces }, () => ({
      x: W / 2 + (Math.random() - 0.5) * W * 0.3,
      y: H * 0.35,
      vx: (Math.random() - 0.5) * 14,
      vy: -6 - Math.random() * 10,
      w: 6 + Math.random() * 6,
      h: 8 + Math.random() * 8,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.3,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
    }))
    const start = performance.now()
    let raf = 0
    const tick = (t: number) => {
      const age = t - start
      ctx.clearRect(0, 0, W, H)
      ctx.globalAlpha = Math.max(0, 1 - Math.max(0, age - duration * 0.6) / (duration * 0.4))
      for (const p of parts) {
        p.vy += 0.35
        p.vx *= 0.99
        p.x += p.vx
        p.y += p.vy
        p.rot += p.vr
        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rot)
        ctx.fillStyle = p.color
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.rot * 2)))
        ctx.restore()
      }
      if (age < duration) raf = requestAnimationFrame(tick)
      else ctx.clearRect(0, 0, W, H)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [pieces, duration])

  return <canvas ref={ref} className="confetti" aria-hidden="true" />
}
