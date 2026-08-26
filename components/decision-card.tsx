'use client'

import { useEffect, useRef, useState } from 'react'
import { animate, motion, useMotionValue } from 'motion/react'
import { ShieldAlert, ShieldCheck, Timer } from 'lucide-react'
import { type DecisionRecord, TYPE_META, getMemory } from '@/lib/memory-data'

const OUTCOME_META = {
  BLOCKED: { tone: 'var(--critical)', icon: ShieldAlert, label: 'BLOCKED' },
  APPROVED: { tone: 'var(--success)', icon: ShieldCheck, label: 'APPROVED' },
  DEFERRED: { tone: 'var(--warning)', icon: Timer, label: 'DEFERRED' },
} as const

function ConfidenceDial({
  value,
  tone,
  reducedMotion,
}: {
  value: number
  tone: string
  reducedMotion: boolean
}) {
  const R = 34
  const C = 2 * Math.PI * R
  const progress = useMotionValue(reducedMotion ? value : 0)
  const [pct, setPct] = useState(reducedMotion ? Math.round(value * 100) : 0)
  const [dash, setDash] = useState(reducedMotion ? C * (1 - value) : C)

  useEffect(() => {
    const unsub = progress.on('change', (v) => {
      setPct(Math.round(v * 100))
      setDash(C * (1 - v))
    })
    return unsub
  }, [progress, C])

  useEffect(() => {
    if (reducedMotion) {
      progress.set(value)
      return
    }
    const controls = animate(progress, value, {
      duration: 1.5,
      delay: 0.4,
      ease: [0.16, 1, 0.3, 1],
    })
    return () => controls.stop()
  }, [value, progress, reducedMotion])

  return (
    <div className="relative grid size-[86px] shrink-0 place-items-center">
      <svg viewBox="0 0 80 80" className="absolute size-full -rotate-90" aria-hidden>
        <circle cx="40" cy="40" r={R} fill="none" stroke="oklch(1 0 0 / 7%)" strokeWidth="2" />
        <circle
          cx="40"
          cy="40"
          r={R}
          fill="none"
          stroke={tone}
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={dash}
          style={{ filter: `drop-shadow(0 0 6px ${tone})` }}
        />
      </svg>
      {!reducedMotion && (
        <motion.div
          className="absolute inset-1 rounded-full"
          style={{ border: `1px solid color-mix(in oklab, ${tone} 22%, transparent)` }}
          animate={{ scale: [1, 1.06, 1], opacity: [0.6, 0.15, 0.6] }}
          transition={{ duration: 3.4, repeat: Number.POSITIVE_INFINITY }}
        />
      )}
      <div className="relative text-center">
        <p className="font-mono text-[19px] leading-none font-light text-foreground tabular-nums">
          {pct}%
        </p>
        <p className="mt-1 font-mono text-[8px] tracking-[0.18em] text-muted-foreground/70">CONF</p>
      </div>
    </div>
  )
}

interface DecisionCardProps {
  decision: DecisionRecord
  onSelect: (id: string) => void
  reducedMotion: boolean
}

export function DecisionCard({ decision, onSelect, reducedMotion }: DecisionCardProps) {
  const meta = OUTCOME_META[decision.outcome]
  const Icon = meta.icon
  const ref = useRef<HTMLDivElement>(null)

  return (
    <motion.section
      ref={ref}
      initial={reducedMotion ? false : { opacity: 0, y: 22 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1], delay: 0.18 }}
      className="glass relative overflow-hidden rounded-xl"
      aria-label="Current decision"
    >
      {/* outcome-tinted top edge + corner wash */}
      <div
        className="absolute inset-x-0 top-0 h-px"
        style={{ background: `linear-gradient(90deg, transparent, ${meta.tone}, transparent)` }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -right-20 size-64 rounded-full opacity-40"
        style={{
          background: `radial-gradient(circle, color-mix(in oklab, ${meta.tone} 22%, transparent) 0%, transparent 65%)`,
        }}
      />

      <div className="relative px-5 py-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="font-mono text-[9px] tracking-[0.24em] text-muted-foreground/70">
              DECISION
            </p>
            <motion.h2
              className="mt-2.5 text-[22px] leading-[1.2] font-light tracking-tight text-balance text-foreground sm:text-[25px]"
              initial={reducedMotion ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            >
              &ldquo;{decision.statement}&rdquo;
            </motion.h2>
            <p className="mt-2.5 font-mono text-[10px] tracking-[0.14em] text-muted-foreground/60">
              {decision.project.toUpperCase()} · {decision.timestamp}
            </p>
          </div>

          <ConfidenceDial value={decision.confidence} tone={meta.tone} reducedMotion={reducedMotion} />
        </div>

        {/* memories used — animated evidence chain */}
        <div className="mt-6">
          <p className="font-mono text-[9px] tracking-[0.22em] text-muted-foreground/70">
            MEMORIES USED
          </p>
          <ul className="mt-2.5 flex flex-col gap-1.5">
            {decision.memoriesUsed.map((id, i) => {
              const memory = getMemory(id)
              if (!memory) return null
              const hex = TYPE_META[memory.type].hex
              return (
                <motion.li
                  key={id}
                  initial={reducedMotion ? false : { opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.42 + i * 0.09, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                >
                  <button
                    type="button"
                    onClick={() => onSelect(id)}
                    className="group relative flex w-full items-center gap-3 overflow-hidden rounded-md border border-border/70 bg-black/20 px-3 py-2 text-left transition-colors hover:border-primary/30"
                  >
                    {/* evidence flow line */}
                    {!reducedMotion && (
                      <motion.span
                        aria-hidden
                        className="absolute inset-y-0 left-0 w-16"
                        style={{
                          background: `linear-gradient(90deg, color-mix(in oklab, ${hex} 16%, transparent), transparent)`,
                        }}
                        animate={{ x: ['-4rem', '100%'] }}
                        transition={{
                          duration: 3.4,
                          repeat: Number.POSITIVE_INFINITY,
                          repeatDelay: 2.6 + i * 0.8,
                          ease: 'easeInOut',
                        }}
                      />
                    )}
                    <span
                      className="relative size-1.5 shrink-0 rounded-full"
                      style={{ background: hex, boxShadow: `0 0 7px ${hex}` }}
                    />
                    <span className="relative min-w-0 flex-1 truncate text-[12px] text-foreground/85">
                      {memory.label}
                    </span>
                    <span
                      className="relative shrink-0 font-mono text-[9px] tracking-[0.14em]"
                      style={{ color: hex }}
                    >
                      {TYPE_META[memory.type].short}
                    </span>
                  </button>
                </motion.li>
              )
            })}
          </ul>
        </div>

        {/* action */}
        <motion.div
          initial={reducedMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.75, duration: 0.5 }}
          className="mt-5 flex items-center gap-3 rounded-lg border px-3.5 py-3"
          style={{
            borderColor: `color-mix(in oklab, ${meta.tone} 30%, transparent)`,
            background: `color-mix(in oklab, ${meta.tone} 7%, transparent)`,
          }}
        >
          <span
            className="grid size-8 shrink-0 place-items-center rounded-md"
            style={{ background: `color-mix(in oklab, ${meta.tone} 16%, transparent)` }}
          >
            <Icon className="size-4" style={{ color: meta.tone }} strokeWidth={1.7} />
          </span>
          <div className="min-w-0">
            <p className="font-mono text-[9px] tracking-[0.2em] text-muted-foreground/70">ACTION</p>
            <p className="truncate text-[13px] text-foreground">{decision.action}</p>
          </div>
          <span
            className="ml-auto shrink-0 rounded-full border px-2 py-0.5 font-mono text-[9px] tracking-[0.16em]"
            style={{
              color: meta.tone,
              borderColor: `color-mix(in oklab, ${meta.tone} 35%, transparent)`,
            }}
          >
            {meta.label}
          </span>
        </motion.div>
      </div>
    </motion.section>
  )
}
