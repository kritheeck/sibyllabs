'use client'

import { motion } from 'motion/react'
import { SemanticSignal } from './semantic-signal'

interface OperationalLedgerRowProps {
  name: string
  status: string
  metadata: string
  tone: string
  risk: number
  riskLabel: string
  reducedMotion?: boolean
  delay?: number
}

export function OperationalLedgerRow({
  name,
  status,
  metadata,
  tone,
  risk,
  riskLabel,
  reducedMotion = false,
  delay = 0,
}: OperationalLedgerRowProps) {
  return (
    <motion.li
      initial={reducedMotion ? false : { opacity: 0, x: -10 }}
      whileInView={reducedMotion ? undefined : { opacity: 1, x: 0 }}
      viewport={{ once: false, amount: 0.2 }}
      transition={{ delay, duration: 0.48, ease: [0.22, 1, 0.36, 1] }}
      className="ledger-row group relative grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4 py-3.5 sm:grid-cols-[minmax(0,1fr)_minmax(140px,190px)] sm:px-5"
    >
      <span
        aria-hidden
        className="ledger-row__marker absolute inset-y-3 left-0 w-px origin-left scale-y-0 bg-primary transition-transform duration-300 group-hover:scale-y-100 group-focus-within:scale-y-100"
      />
      <div className="flex min-w-0 items-start gap-3">
        <SemanticSignal tone={tone} className="mt-1" />
        <div className="min-w-0">
          <p className="truncate text-[13px] text-foreground/90">{name}</p>
          <p className="mt-1 truncate font-mono text-[9px] tracking-[0.15em] text-muted-foreground/70">
            {status} · {metadata}
          </p>
        </div>
      </div>

      <div className="min-w-0 sm:text-right">
        <div className="flex items-center gap-3 sm:justify-end">
          <span className="font-mono text-[9px] tracking-[0.15em] text-muted-foreground/65">{riskLabel}</span>
          <span className="relative h-[3px] w-20 overflow-hidden bg-white/8 sm:w-24">
            <span className="absolute inset-y-0 left-0 origin-left" style={{ width: `${Math.round(risk * 100)}%`, backgroundColor: tone }} />
          </span>
        </div>
        <p className="mt-1 font-mono text-[8px] tracking-[0.16em] text-muted-foreground/50 sm:text-right">
          {Math.round(risk * 100)} / 100
        </p>
      </div>
    </motion.li>
  )
}

export type { OperationalLedgerRowProps }
