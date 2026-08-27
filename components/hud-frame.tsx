'use client'

import { motion } from 'motion/react'
import type { CSSProperties, ReactNode } from 'react'
import { cn } from '@/lib/utils'

type HudFrameTone = 'neutral' | 'primary' | 'secondary' | 'critical' | 'warning' | 'success' | 'memory'
type HudFrameVariant = 'primary' | 'secondary' | 'tertiary'

const TONE_COLORS: Record<HudFrameTone, string> = {
  neutral: 'var(--frame)',
  primary: 'var(--primary)',
  secondary: 'var(--secondary)',
  critical: 'var(--critical)',
  warning: 'var(--warning)',
  success: 'var(--success)',
  memory: 'var(--primary)',
}

interface HudFrameProps {
  children: ReactNode
  label?: string
  index?: string
  tone?: HudFrameTone
  variant?: HudFrameVariant
  active?: boolean
  reducedMotion?: boolean
  className?: string
}

/**
 * A quiet structural enclosure for high-value system surfaces. The rails draw
 * as a section enters the viewport; the content never relies on the frame for
 * its meaning and remains fully readable with reduced motion enabled.
 */
export function HudFrame({
  children,
  label,
  index,
  tone = 'neutral',
  variant = 'primary',
  active = false,
  reducedMotion = false,
  className,
}: HudFrameProps) {
  const toneColor = TONE_COLORS[tone]
  const railOpacity = active ? 0.82 : 0.42

  return (
    <motion.div
      role="region"
      aria-label={label}
      initial={reducedMotion ? false : { opacity: 0.62, y: 18 }}
      whileInView={reducedMotion ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: false, amount: 0.14, margin: '-8% 0px -8%' }}
      transition={{ duration: 0.72, ease: [0.22, 1, 0.36, 1] }}
      data-active={active || undefined}
      data-variant={variant}
      className={cn('hud-frame relative', className)}
      style={{ '--hud-tone': toneColor } as CSSProperties}
    >
      <motion.span
        aria-hidden
        className="hud-frame__rail hud-frame__rail--top absolute inset-x-0 top-0 h-px"
        style={{ backgroundColor: 'var(--hud-tone)', transformOrigin: 'left', opacity: railOpacity }}
        initial={reducedMotion ? false : { scaleX: 0.16, opacity: 0.16 }}
        whileInView={reducedMotion ? undefined : { scaleX: 1, opacity: railOpacity }}
        viewport={{ once: false, amount: 0.14 }}
        transition={{ duration: 0.9, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
      />
      <motion.span
        aria-hidden
        className="hud-frame__rail hud-frame__rail--bottom absolute right-0 bottom-0 h-px w-[38%]"
        style={{ backgroundColor: 'var(--hud-tone)', transformOrigin: 'right', opacity: Math.max(0.2, railOpacity - 0.2) }}
        initial={reducedMotion ? false : { scaleX: 0.12, opacity: 0.1 }}
        whileInView={reducedMotion ? undefined : { scaleX: 1, opacity: Math.max(0.2, railOpacity - 0.2) }}
        viewport={{ once: false, amount: 0.14 }}
        transition={{ duration: 0.78, delay: 0.16, ease: [0.16, 1, 0.3, 1] }}
      />

      <span aria-hidden className="hud-frame__corner hud-frame__corner--tl" style={{ borderColor: 'var(--hud-tone)' }} />
      <span aria-hidden className="hud-frame__corner hud-frame__corner--tr" style={{ borderColor: 'var(--hud-tone)' }} />
      <span aria-hidden className="hud-frame__corner hud-frame__corner--bl" style={{ borderColor: 'var(--hud-tone)' }} />
      <span aria-hidden className="hud-frame__corner hud-frame__corner--br" style={{ borderColor: 'var(--hud-tone)' }} />

      {(label || index) && (
        <div className="hud-frame__label absolute -top-2 left-4 z-20 flex items-center gap-2 bg-surface-stage px-2">
          {index && <span className="font-mono text-[9px] tracking-[0.18em] text-primary/70">{index}</span>}
          {label && <span className="font-mono text-[9px] tracking-[0.2em] text-muted-foreground/70">{label}</span>}
        </div>
      )}

      <div className="relative z-10 h-full">{children}</div>
    </motion.div>
  )
}

export type { HudFrameProps, HudFrameTone, HudFrameVariant }
