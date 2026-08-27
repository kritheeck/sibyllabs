'use client'

import { AnimatePresence, motion, type MotionValue } from 'motion/react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TYPE_META, getMemory, type MemoryRecord } from '@/lib/memory-data'
import { EvidenceRow } from './evidence-row'
import { DataReadout, TechnicalLabel } from './system-primitives'
import { StageShell } from './stage-shell'
import type { FrameTone } from './system-primitives'

const IMPORTANCE_TONE: Record<MemoryRecord['importance'], FrameTone> = {
  CRITICAL: 'critical',
  HIGH: 'warning',
  MEDIUM: 'primary',
  LOW: 'neutral',
}

const MEMORY_FRAME_TONE: Record<MemoryRecord['type'], FrameTone> = {
  PROJECT: 'primary',
  DECISION: 'secondary',
  CONSTRAINT: 'warning',
  INCIDENT: 'critical',
  LESSON: 'success',
  EVENT: 'primary',
  ACTION: 'secondary',
}

function ConfidenceMeter({
  value,
  color,
  reducedMotion,
}: {
  value: number
  color: string
  reducedMotion: boolean
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="relative h-[3px] flex-1 overflow-hidden bg-white/8">
        <motion.div
          className="absolute inset-y-0 left-0 origin-left"
          style={{ background: color, boxShadow: `0 0 8px ${color}` }}
          initial={reducedMotion ? { width: `${value * 100}%` } : { width: 0 }}
          animate={{ width: `${value * 100}%` }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
        />
      </div>
      <span className="type-readout text-foreground">{Math.round(value * 100)}%</span>
    </div>
  )
}

interface MemoryInspectorProps {
  memoryId: string | null
  onClose: () => void
  onSelect: (id: string) => void
  reducedMotion: boolean
  progress?: MotionValue<number>
  active?: boolean
}

export function MemoryInspector({
  memoryId,
  onClose,
  onSelect,
  reducedMotion,
  progress,
  active = false,
}: MemoryInspectorProps) {
  const memory = memoryId ? getMemory(memoryId) : undefined
  const tone = memory ? MEMORY_FRAME_TONE[memory.type] : 'neutral'
  const color = memory ? TYPE_META[memory.type].hex : 'var(--primary)'

  return (
    <StageShell
      stage="memory"
      frame="evidence"
      label="MEMORY"
      index="03"
      tone={tone}
      active={active || Boolean(memory)}
      progress={progress}
      reducedMotion={reducedMotion}
      className="memory-evidence-cavity"
    >
      {!memory ? (
        <div className="memory-evidence-empty">
          <span className="size-1.5 shrink-0 rounded-full bg-primary/45" />
          <TechnicalLabel className="text-muted-foreground/65">SELECT A MEMORY TO INSPECT</TechnicalLabel>
        </div>
      ) : (
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={memory.id}
            initial={reducedMotion ? { opacity: 0 } : { opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, x: -8 }}
            transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
            className="memory-evidence-content"
          >
            <div className="flex items-start gap-3 border-b border-border px-5 py-5">
              <div className="min-w-0 flex-1">
                <TechnicalLabel className="text-muted-foreground/70">MEMORY RECORD</TechnicalLabel>
                <p className="mt-2 font-mono text-[11px] tracking-[0.18em]" style={{ color }}>
                  {memory.ref}
                </p>
                <h3 className="mt-2 text-[15px] leading-snug font-medium tracking-[0.04em] text-balance text-foreground">
                  {memory.label}
                </h3>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-lg"
                onClick={onClose}
                aria-label="Close inspector"
                className="min-h-11 min-w-11 shrink-0 rounded-sm text-muted-foreground hover:bg-white/5 hover:text-foreground"
              >
                <X className="size-4" />
              </Button>
            </div>

            <div className="scrollbar-thin max-h-[52vh] overflow-y-auto px-5 py-5 lg:max-h-[calc(100vh-24rem)]">
              <div className="grid grid-cols-2 gap-x-5 gap-y-5">
                <DataReadout label="TYPE" value={memory.type} tone={tone} />
                <DataReadout label="IMPORTANCE" value={memory.importance} tone={IMPORTANCE_TONE[memory.importance]} />
                <div className="col-span-2">
                  <TechnicalLabel className="text-muted-foreground/70">CONFIDENCE</TechnicalLabel>
                  <div className="mt-2.5">
                    <ConfidenceMeter value={memory.confidence} color={color} reducedMotion={reducedMotion} />
                  </div>
                </div>
                <DataReadout label="CREATED" value={memory.createdAt} />
                <DataReadout label="USED IN" value={`${memory.usedInDecisions} decisions`} />
              </div>

              <div className="mt-7">
                <TechnicalLabel className="text-muted-foreground/70">REASON</TechnicalLabel>
                <blockquote
                  className="mt-2.5 border-l pl-3 text-[13px] leading-relaxed text-pretty text-foreground/80"
                  style={{ borderColor: `color-mix(in oklab, ${color} 45%, transparent)` }}
                >
                  &ldquo;{memory.reason}&rdquo;
                </blockquote>
              </div>

              <div className="mt-7">
                <TechnicalLabel className="text-muted-foreground/70">RELATED MEMORIES</TechnicalLabel>
                <ul className="mt-2 flex flex-col gap-1">
                  {memory.relatedIds.map((id) => (
                    <li key={id}>
                      <EvidenceRow memoryId={id} onSelect={onSelect} reducedMotion={reducedMotion} showArrow />
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-7 flex flex-wrap gap-1.5">
                {memory.tags.map((tag) => (
                  <span key={tag} className="border border-border px-1.5 py-1 font-mono text-[9px] tracking-[0.12em] text-muted-foreground">
                    {tag.toUpperCase()}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      )}
    </StageShell>
  )
}
