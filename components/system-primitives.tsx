'use client'

import { motion, type MotionValue } from 'motion/react'
import type { CSSProperties, ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type FrameTone = 'neutral' | 'primary' | 'secondary' | 'critical' | 'warning' | 'success' | 'memory'
export type FrameCorner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'

const TONE_COLORS: Record<FrameTone, string> = {
  neutral: 'var(--frame)',
  primary: 'var(--primary)',
  secondary: 'var(--secondary)',
  critical: 'var(--critical)',
  warning: 'var(--warning)',
  success: 'var(--success)',
  memory: 'var(--primary)',
}

export function toneColor(tone: FrameTone = 'neutral') {
  return TONE_COLORS[tone]
}

interface TechnicalLabelProps {
  children: ReactNode
  tone?: FrameTone
  className?: string
}

export function TechnicalLabel({ children, tone = 'neutral', className }: TechnicalLabelProps) {
  return (
    <span className={cn('type-label', className)} style={tone === 'neutral' ? undefined : { color: toneColor(tone) }}>
      {children}
    </span>
  )
}

interface DataReadoutProps {
  label: string
  value: ReactNode
  detail?: ReactNode
  tone?: FrameTone
  className?: string
}

export function DataReadout({ label, value, detail, tone = 'neutral', className }: DataReadoutProps) {
  return (
    <div className={cn('min-w-0', className)}>
      <TechnicalLabel tone="neutral" className="text-muted-foreground/65">{label}</TechnicalLabel>
      <p className="mt-1.5 font-mono text-[13px] tracking-[0.06em] text-foreground tabular-nums" style={{ color: tone === 'neutral' ? undefined : toneColor(tone) }}>
        {value}
      </p>
      {detail && <p className="mt-1 font-mono text-[9px] tracking-[0.12em] text-muted-foreground/50">{detail}</p>}
    </div>
  )
}

interface FrameCornerProps {
  corner: FrameCorner
  tone?: FrameTone
  active?: boolean
  progress?: MotionValue<number>
  reducedMotion?: boolean
  className?: string
}

export function FrameCorner({
  corner,
  tone = 'neutral',
  active = false,
  progress,
  reducedMotion = false,
  className,
}: FrameCornerProps) {
  const color = toneColor(tone)
  const isTop = corner.startsWith('top')
  const isLeft = corner.endsWith('left')
  const style = {
    '--corner-tone': color,
    ...(progress ? { scaleX: progress, scaleY: progress } : {}),
  } as CSSProperties

  return (
    <motion.span
      aria-hidden
      className={cn('frame-corner absolute z-20 block h-4 w-4', `frame-corner--${corner}`, active && 'frame-corner--active', className)}
      style={style}
      initial={reducedMotion ? false : { opacity: 0.38, scaleX: progress ? undefined : 0.25, scaleY: progress ? undefined : 0.25 }}
      animate={reducedMotion ? undefined : { opacity: active ? 0.92 : 0.56 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
    >
      <span className={cn('absolute h-px w-full bg-(--corner-tone)', isLeft ? 'left-0 origin-left' : 'right-0 origin-right', isTop ? 'top-0' : 'bottom-0')} />
      <span className={cn('absolute h-full w-px bg-(--corner-tone)', isTop ? 'top-0 origin-top' : 'bottom-0 origin-bottom', isLeft ? 'left-0' : 'right-0')} />
    </motion.span>
  )
}

interface SegmentRailProps {
  edge?: 'top' | 'bottom' | 'left' | 'right'
  align?: 'start' | 'center' | 'end'
  length?: string
  tone?: FrameTone
  active?: boolean
  progress?: MotionValue<number>
  reducedMotion?: boolean
  className?: string
}

export function SegmentRail({
  edge = 'top',
  align = 'start',
  length = '34%',
  tone = 'neutral',
  active = false,
  progress,
  reducedMotion = false,
  className,
}: SegmentRailProps) {
  const isHorizontal = edge === 'top' || edge === 'bottom'
  const style = {
    '--rail-tone': toneColor(tone),
    '--rail-length': length,
    ...(progress
      ? isHorizontal
        ? { scaleX: progress }
        : { scaleY: progress }
      : {}),
  } as unknown as CSSProperties

  return (
    <motion.span
      aria-hidden
      className={cn('segment-rail absolute z-20 block', `segment-rail--${edge}`, `segment-rail--${align}`, className)}
      style={style}
      initial={reducedMotion ? false : { opacity: 0.12, scaleX: isHorizontal && !progress ? 0.12 : 1, scaleY: !isHorizontal && !progress ? 0.12 : 1 }}
      animate={reducedMotion ? undefined : { opacity: active ? 0.82 : 0.45 }}
      transition={{ duration: 0.82, ease: [0.16, 1, 0.3, 1] }}
    />
  )
}

interface SignalLineProps {
  tone?: FrameTone
  active?: boolean
  direction?: 'horizontal' | 'vertical'
  className?: string
}

export function SignalLine({ tone = 'primary', active = false, direction = 'horizontal', className }: SignalLineProps) {
  return (
    <span
      aria-hidden
      className={cn('signal-line', `signal-line--${direction}`, active && 'signal-line--active', className)}
      style={{ '--signal-tone': toneColor(tone) } as CSSProperties}
    >
      <span className="signal-line__pulse" />
    </span>
  )
}

interface SystemMarkerProps {
  active?: boolean
  complete?: boolean
  tone?: FrameTone
  className?: string
}

export function SystemMarker({ active = false, complete = false, tone = 'primary', className }: SystemMarkerProps) {
  return (
    <span className={cn('system-marker', active && 'system-marker--active', complete && 'system-marker--complete', className)}>
      <span className="system-marker__dot" style={{ backgroundColor: toneColor(tone) }} />
    </span>
  )
}

export function TimelineMarker({ active = false, complete = false, tone = 'primary', className }: SystemMarkerProps) {
  return <SystemMarker active={active} complete={complete} tone={tone} className={className} />
}

export type {
  DataReadoutProps,
  FrameCornerProps,
  SegmentRailProps,
  SignalLineProps,
  SystemMarkerProps,
  TechnicalLabelProps,
}
