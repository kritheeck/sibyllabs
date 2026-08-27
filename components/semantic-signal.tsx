'use client'

import { motion } from 'motion/react'
import { cn } from '@/lib/utils'

interface SemanticSignalProps {
  tone: string
  label?: string
  pulse?: boolean
  reducedMotion?: boolean
  meterValue?: number
  className?: string
}

export function SemanticSignal({
  tone,
  label,
  pulse = false,
  reducedMotion = false,
  meterValue,
  className,
}: SemanticSignalProps) {
  return (
    <span className={cn('inline-flex min-w-0 items-center gap-2', className)}>
      <span className="relative grid size-2 shrink-0 place-items-center">
        {pulse && !reducedMotion && (
          <motion.span
            aria-hidden
            className="absolute size-2 rounded-full"
            style={{ backgroundColor: tone }}
            animate={{ scale: [1, 2.4, 1], opacity: [0.35, 0, 0.35] }}
            transition={{ duration: 2.4, repeat: Number.POSITIVE_INFINITY, ease: 'easeOut' }}
          />
        )}
        <span
          className="relative size-1.5 rounded-full"
          style={{ backgroundColor: tone, boxShadow: pulse ? `0 0 8px ${tone}` : undefined }}
        />
      </span>
      {label && (
        <span className="truncate font-mono text-[10px] tracking-[0.16em]" style={{ color: tone }}>
          {label}
        </span>
      )}
      {meterValue !== undefined && (
        <span className="relative ml-auto h-[3px] w-24 overflow-hidden bg-white/8">
          <span
            className="absolute inset-y-0 left-0 origin-left"
            style={{ width: `${Math.round(meterValue * 100)}%`, backgroundColor: tone }}
          />
        </span>
      )}
    </span>
  )
}

export type { SemanticSignalProps }
