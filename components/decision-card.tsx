'use client'

import { useEffect, useState } from 'react'
import { animate, motion, useMotionValue } from 'motion/react'
import { ShieldAlert, ShieldCheck, Timer } from 'lucide-react'
import { type DecisionRecord, getMemory } from '@/lib/memory-data'
import { EvidenceRow } from './evidence-row'
import { SignalLine, TechnicalLabel } from './system-primitives'
import { StageShell } from './stage-shell'
import type { FrameTone } from './system-primitives'
import type { MotionValue } from 'motion/react'

const OUTCOME_META: Record<
  DecisionRecord['outcome'],
  { tone: string; frameTone: FrameTone; icon: typeof ShieldAlert; label: string }
> = {
  BLOCKED: { tone: 'var(--critical)', frameTone: 'critical', icon: ShieldAlert, label: 'BLOCKED' },
  APPROVED: { tone: 'var(--success)', frameTone: 'success', icon: ShieldCheck, label: 'APPROVED' },
  DEFERRED: { tone: 'var(--warning)', frameTone: 'warning', icon: Timer, label: 'DEFERRED' },
}

function ConfidenceDial({
  value,
  tone,
  reducedMotion,
}: {
  value: number
  tone: string
  reducedMotion: boolean
}) {
  const radius = 34
  const circumference = 2 * Math.PI * radius
  const progress = useMotionValue(reducedMotion ? value : 0)
  const [percentage, setPercentage] = useState(reducedMotion ? Math.round(value * 100) : 0)
  const [dashOffset, setDashOffset] = useState(reducedMotion ? circumference * (1 - value) : circumference)

  useEffect(() => {
    const unsubscribe = progress.on('change', (nextValue) => {
      setPercentage(Math.round(nextValue * 100))
      setDashOffset(circumference * (1 - nextValue))
    })
    return unsubscribe
  }, [circumference, progress])

  useEffect(() => {
    if (reducedMotion) {
      progress.set(value)
      return
    }
    const controls = animate(progress, value, {
      duration: 1.2,
      delay: 0.25,
      ease: [0.16, 1, 0.3, 1],
    })
    return () => controls.stop()
  }, [progress, reducedMotion, value])

  return (
    <div className="confidence-dial relative grid size-[86px] shrink-0 place-items-center">
      <svg viewBox="0 0 80 80" className="absolute size-full -rotate-90" aria-hidden>
        <circle cx="40" cy="40" r={radius} fill="none" stroke="oklch(1 0 0 / 7%)" strokeWidth="2" />
        <circle
          cx="40"
          cy="40"
          r={radius}
          fill="none"
          stroke={tone}
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          style={{ filter: `drop-shadow(0 0 5px ${tone})` }}
        />
      </svg>
      <div className="relative text-center">
        <p className="font-mono text-[19px] leading-none font-light text-foreground tabular-nums">{percentage}%</p>
        <p className="mt-1 type-label text-muted-foreground/70">CONF</p>
      </div>
    </div>
  )
}

interface DecisionCardProps {
  decision: DecisionRecord
  onSelect: (id: string) => void
  reducedMotion: boolean
  progress?: MotionValue<number>
  active?: boolean
}

export function DecisionCard({ decision, onSelect, reducedMotion, progress, active = false }: DecisionCardProps) {
  const meta = OUTCOME_META[decision.outcome]
  const Icon = meta.icon

  return (
    <StageShell
      stage="reason"
      frame="reason"
      label="DECISION"
      tone={meta.frameTone}
      active={active}
      progress={progress}
      reducedMotion={reducedMotion}
      className="reason-chamber overflow-visible"
    >
      <SignalLine tone="primary" direction="vertical" active={active && !reducedMotion} className="reason-chamber__connector" />
      <div className="px-5 py-6 sm:px-7 sm:py-7">
        <div className="mb-5 flex items-center justify-between gap-4 border-b border-border pb-3">
          <div className="flex items-center gap-2.5">
            <span className="size-1.5 rounded-full" style={{ backgroundColor: meta.tone, boxShadow: `0 0 8px ${meta.tone}` }} />
            <TechnicalLabel tone={meta.frameTone}>REASONED OUTPUT</TechnicalLabel>
          </div>
          <span className="font-mono text-[9px] tracking-[0.16em] text-muted-foreground/55">{decision.timestamp} UTC</span>
        </div>

        <div className="flex items-start justify-between gap-5">
          <div className="min-w-0">
            <motion.h2
              className="text-[22px] leading-[1.2] font-light tracking-tight text-balance text-foreground sm:text-[25px]"
              initial={reducedMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            >
              &ldquo;{decision.statement}&rdquo;
            </motion.h2>
            <p className="mt-3 font-mono text-[10px] tracking-[0.14em] text-muted-foreground/65">
              {decision.project.toUpperCase()} · {decision.timestamp}
            </p>
          </div>

          <ConfidenceDial value={decision.confidence} tone={meta.tone} reducedMotion={reducedMotion} />
        </div>

        <div className="mt-7">
          <p className="type-label text-muted-foreground/70">MEMORIES USED</p>
          <ul className="mt-2.5 flex flex-col gap-1">
            {decision.memoriesUsed.map((id) => {
              const memory = getMemory(id)
              if (!memory) return null
              return (
                <li key={id}>
                  <EvidenceRow memoryId={memory.id} onSelect={onSelect} reducedMotion={reducedMotion} compact />
                </li>
              )
            })}
          </ul>
        </div>

        <div className="mt-5 flex items-center gap-3 border-t border-border pt-4">
          <span
            className="grid size-9 shrink-0 place-items-center rounded-sm border"
            style={{
              color: meta.tone,
              borderColor: `color-mix(in oklab, ${meta.tone} 30%, transparent)`,
              background: `color-mix(in oklab, ${meta.tone} 8%, transparent)`,
            }}
          >
            <Icon className="size-4" style={{ color: meta.tone }} strokeWidth={1.7} />
          </span>
          <div className="min-w-0">
            <TechnicalLabel className="text-muted-foreground/70">ACTION</TechnicalLabel>
            <p className="truncate text-[13px] text-foreground">{decision.action}</p>
          </div>
          <span
            className="ml-auto shrink-0 border px-2 py-1 font-mono text-[9px] tracking-[0.16em]"
            style={{ color: meta.tone, borderColor: `color-mix(in oklab, ${meta.tone} 35%, transparent)` }}
          >
            {meta.label}
          </span>
        </div>
      </div>
    </StageShell>
  )
}
