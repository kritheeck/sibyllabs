'use client'

import { AnimatePresence, motion } from 'motion/react'
import type { AgentState } from '@/lib/memory-data'
import { cn } from '@/lib/utils'

const STATE_META: Record<
  AgentState,
  { label: string; tint: string; ring: string; speed: number }
> = {
  IDLE: { label: 'IDLE', tint: 'var(--muted-foreground)', ring: 'oklch(0.66 0.02 250)', speed: 4.2 },
  LISTENING: { label: 'LISTENING', tint: 'var(--primary)', ring: 'oklch(0.83 0.115 205)', speed: 3 },
  RECALLING: { label: 'RECALLING MEMORY', tint: 'var(--primary)', ring: 'oklch(0.83 0.115 205)', speed: 1.7 },
  REASONING: { label: 'REASONING', tint: 'var(--secondary)', ring: 'oklch(0.66 0.14 292)', speed: 1.35 },
  EXECUTING: { label: 'EXECUTING', tint: 'var(--warning)', ring: 'oklch(0.79 0.13 78)', speed: 1 },
  SUCCESS: { label: 'SUCCESS', tint: 'var(--success)', ring: 'oklch(0.78 0.14 165)', speed: 2.4 },
  FAILED: { label: 'FAILED', tint: 'var(--critical)', ring: 'oklch(0.68 0.17 25)', speed: 1.1 },
}

interface AgentStatusProps {
  state: AgentState
  size?: 'sm' | 'md'
  className?: string
  reducedMotion?: boolean
}

export function AgentStatus({ state, size = 'md', className, reducedMotion }: AgentStatusProps) {
  const meta = STATE_META[state]
  const isSm = size === 'sm'

  return (
    <div
      className={cn(
        'relative inline-flex items-center gap-2.5 overflow-hidden rounded-full border px-3 py-1.5',
        isSm && 'gap-2 px-2.5 py-1',
        className,
      )}
      style={{
        borderColor: `color-mix(in oklab, ${meta.tint} 32%, transparent)`,
        background: `color-mix(in oklab, ${meta.tint} 9%, transparent)`,
      }}
      role="status"
      aria-live="polite"
    >
      {/* sweeping sheen on state change */}
      {!reducedMotion && (
        <motion.span
          key={state}
          aria-hidden
          className="pointer-events-none absolute inset-0"
          initial={{ x: '-110%' }}
          animate={{ x: '110%' }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          style={{
            background: `linear-gradient(90deg, transparent, color-mix(in oklab, ${meta.tint} 22%, transparent), transparent)`,
          }}
        />
      )}

      <span className="relative flex items-center justify-center">
        {!reducedMotion && (
          <motion.span
            aria-hidden
            className="absolute rounded-full"
            style={{ background: meta.tint, width: isSm ? 6 : 7, height: isSm ? 6 : 7 }}
            animate={{ scale: [1, 3.4, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: meta.speed, repeat: Number.POSITIVE_INFINITY, ease: 'easeOut' }}
          />
        )}
        <motion.span
          className="relative rounded-full"
          style={{
            background: meta.tint,
            width: isSm ? 6 : 7,
            height: isSm ? 6 : 7,
            boxShadow: `0 0 10px ${meta.ring}`,
          }}
          animate={reducedMotion ? undefined : { opacity: [1, 0.6, 1] }}
          transition={{ duration: meta.speed, repeat: Number.POSITIVE_INFINITY }}
        />
      </span>

      <span className="relative overflow-hidden">
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={meta.label}
            className={cn(
              'block font-mono tracking-[0.18em] whitespace-nowrap',
              isSm ? 'text-[10px]' : 'text-[11px]',
            )}
            style={{ color: meta.tint }}
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '-100%', opacity: 0 }}
            transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
          >
            {meta.label}
          </motion.span>
        </AnimatePresence>
      </span>
    </div>
  )
}

export { STATE_META }
