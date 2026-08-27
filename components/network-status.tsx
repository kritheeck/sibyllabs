'use client'

import { motion, type MotionValue } from 'motion/react'
import { INTEGRATIONS } from '@/lib/memory-data'
import { SemanticSignal } from './semantic-signal'
import { StageShell } from './stage-shell'
import { cn } from '@/lib/utils'

const STATUS_TONE = {
  CONNECTED: 'success',
  SYNCING: 'warning',
  OFFLINE: 'neutral',
} as const

interface NetworkStatusProps {
  reducedMotion: boolean
  progress?: MotionValue<number>
  active?: boolean
}

export function NetworkStatus({ reducedMotion, progress, active = false }: NetworkStatusProps) {
  return (
    <StageShell
      stage="action"
      frame="telemetry"
      label="SYSTEM LINKS"
      tone="success"
      active={active}
      progress={progress}
      reducedMotion={reducedMotion}
      className="network-status"
    >
      <div className="mb-3 flex items-end justify-between gap-4 px-1">
        <h2 className="text-[15px] font-medium tracking-[0.08em] text-foreground">NETWORK</h2>
        <span className="font-mono text-[9px] tracking-[0.16em] text-muted-foreground/55">3 / 3 LINKED</span>
      </div>

      <div className="network-rail grid md:grid-cols-3">
        {INTEGRATIONS.map((item, index) => {
          const tone = STATUS_TONE[item.status]
          const syncing = item.status === 'SYNCING'
          return (
            <div
              key={item.id}
              className={cn(
                'relative min-w-0 px-4 py-4 sm:px-5',
                index > 0 && 'border-t border-border md:border-t-0 md:border-l',
              )}
            >
              {syncing && !reducedMotion && (
                <motion.span
                  aria-hidden
                  className="absolute top-0 left-0 h-px w-14"
                  style={{ background: 'linear-gradient(90deg, transparent, var(--warning), transparent)' }}
                  animate={{ x: ['-3.5rem', 'calc(100% + 3.5rem)'] }}
                  transition={{ duration: 2.2, repeat: Number.POSITIVE_INFINITY, repeatDelay: 2.2, ease: 'easeInOut' }}
                />
              )}

              <div className="flex items-center gap-2">
                <SemanticSignal tone={`var(--${tone === 'neutral' ? 'muted-foreground' : tone})`} pulse={syncing} reducedMotion={reducedMotion} />
                <h3 className="truncate font-mono text-[10px] tracking-[0.16em] text-foreground/90">{item.name}</h3>
              </div>
              <p className="mt-2 truncate text-[11px] text-muted-foreground/75">{item.descriptor}</p>
              <div className="mt-3 flex items-center justify-between gap-2">
                <span className="font-mono text-[9px] tracking-[0.16em]" style={{ color: `var(--${tone === 'neutral' ? 'muted-foreground' : tone})` }}>
                  {item.status}
                </span>
                <span className="font-mono text-[9px] text-muted-foreground/55 tabular-nums">{item.latencyMs}ms</span>
              </div>
              <p className="mt-1.5 truncate font-mono text-[9px] text-muted-foreground/45">{item.hash}</p>
            </div>
          )
        })}
      </div>
    </StageShell>
  )
}
