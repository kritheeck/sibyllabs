'use client'

import { useEffect, useRef } from 'react'
import { useReducedMotion } from '@/hooks/use-reduced-motion'

interface Particle {
  x: number
  y: number
  z: number
  vx: number
  vy: number
}

interface Stream {
  /** 0 = horizontal, 1 = vertical */
  axis: 0 | 1
  /** position along the perpendicular axis, 0..1 */
  offset: number
  progress: number
  speed: number
  length: number
  hue: 'cyan' | 'violet'
}

/**
 * Atmospheric depth layer: faint drifting particle field + occasional data
 * streams tracing along the grid. Canvas based so it costs nothing in React
 * render terms and never re-renders the tree.
 */
export function AmbientBackdrop() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const reduced = useReducedMotion()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let width = 0
    let height = 0
    let dpr = 1
    let raf = 0

    const particles: Particle[] = []
    const streams: Stream[] = []

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = canvas.clientWidth
      height = canvas.clientHeight
      canvas.width = Math.floor(width * dpr)
      canvas.height = Math.floor(height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      const target = Math.min(90, Math.round((width * height) / 22000))
      particles.length = 0
      for (let i = 0; i < target; i++) {
        const z = Math.random()
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          z,
          vx: (Math.random() - 0.5) * 0.09 * (0.35 + z),
          vy: (-0.05 - Math.random() * 0.09) * (0.35 + z),
        })
      }
    }

    const spawnStream = () => {
      if (streams.length > 3) return
      streams.push({
        axis: Math.random() > 0.45 ? 1 : 0,
        offset: Math.random(),
        progress: 0,
        speed: 0.0022 + Math.random() * 0.0028,
        length: 0.1 + Math.random() * 0.14,
        hue: Math.random() > 0.72 ? 'violet' : 'cyan',
      })
    }

    const drawStatic = () => {
      ctx.clearRect(0, 0, width, height)
      for (const p of particles) {
        ctx.globalAlpha = 0.06 + p.z * 0.14
        ctx.fillStyle = '#9ad9ee'
        ctx.fillRect(p.x, p.y, 1 + p.z, 1 + p.z)
      }
      ctx.globalAlpha = 1
    }

    let last = performance.now()
    let streamTimer = 0

    const frame = (now: number) => {
      const dt = Math.min(now - last, 48)
      last = now

      ctx.clearRect(0, 0, width, height)

      // particle field
      for (const p of particles) {
        p.x += p.vx * dt * 0.06
        p.y += p.vy * dt * 0.06
        if (p.y < -8) {
          p.y = height + 8
          p.x = Math.random() * width
        }
        if (p.x < -8) p.x = width + 8
        if (p.x > width + 8) p.x = -8

        const size = 0.7 + p.z * 1.5
        ctx.globalAlpha = 0.05 + p.z * 0.16
        ctx.fillStyle = '#9ad9ee'
        ctx.beginPath()
        ctx.arc(p.x, p.y, size, 0, Math.PI * 2)
        ctx.fill()
      }

      // data streams
      streamTimer += dt
      if (streamTimer > 2600) {
        streamTimer = 0
        spawnStream()
      }

      for (let i = streams.length - 1; i >= 0; i--) {
        const s = streams[i]
        s.progress += s.speed * (dt / 16)
        if (s.progress > 1 + s.length) {
          streams.splice(i, 1)
          continue
        }
        const head = s.progress
        const tail = Math.max(0, s.progress - s.length)
        const fade =
          head < 0.12 ? head / 0.12 : head > 0.88 ? Math.max(0, (1 + s.length - head) / 0.24) : 1

        const color = s.hue === 'violet' ? '167,139,250' : '125,216,240'
        let x0: number, y0: number, x1: number, y1: number
        if (s.axis === 1) {
          const gx = Math.round((s.offset * width) / 56) * 56
          x0 = x1 = gx
          y0 = tail * height
          y1 = Math.min(head, 1) * height
        } else {
          const gy = Math.round((s.offset * height) / 56) * 56
          y0 = y1 = gy
          x0 = tail * width
          x1 = Math.min(head, 1) * width
        }

        const grad = ctx.createLinearGradient(x0, y0, x1, y1)
        grad.addColorStop(0, `rgba(${color},0)`)
        grad.addColorStop(1, `rgba(${color},${0.34 * fade})`)
        ctx.strokeStyle = grad
        ctx.lineWidth = 1
        ctx.globalAlpha = 1
        ctx.beginPath()
        ctx.moveTo(x0, y0)
        ctx.lineTo(x1, y1)
        ctx.stroke()

        ctx.fillStyle = `rgba(${color},${0.5 * fade})`
        ctx.beginPath()
        ctx.arc(x1, y1, 1.6, 0, Math.PI * 2)
        ctx.fill()
      }

      ctx.globalAlpha = 1
      raf = requestAnimationFrame(frame)
    }

    resize()
    window.addEventListener('resize', resize)

    if (reduced) {
      drawStatic()
    } else {
      raf = requestAnimationFrame(frame)
    }

    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(raf)
    }
  }, [reduced])

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* base atmospheric gradient */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(120% 80% at 50% -10%, oklch(0.27 0.055 245 / 0.55) 0%, transparent 60%), radial-gradient(90% 60% at 85% 105%, oklch(0.28 0.07 292 / 0.28) 0%, transparent 65%), linear-gradient(180deg, oklch(0.135 0.014 255) 0%, oklch(0.115 0.012 258) 100%)',
        }}
      />
      {/* faint grid */}
      <div className="grid-fade absolute inset-0" />
      {/* particles + streams */}
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      {/* vignette depth */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(130% 100% at 50% 45%, transparent 40%, oklch(0.08 0.01 255 / 0.75) 100%)',
        }}
      />
    </div>
  )
}
