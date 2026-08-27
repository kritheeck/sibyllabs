'use client'

import { AnimatePresence, motion, type MotionValue } from 'motion/react'
import { type ActivityEvent } from '@/lib/memory-data'
import { EvidenceRow } from './evidence-row'
import { SignalLine, TechnicalLabel } from './system-primitives'
import { StageShell } from './stage-shell'

const KIND_TONE: Record<ActivityEvent['kind'], string> = {
  'MEMORY RECALLED': 'var(--primary)',
  'CONSTRAINT EVALUATED': 'var(--warning)',
  REASONING: 'var(--secondary)',
  DECISION: 'var(--critical)',
  'MEMORY UPDATED': 'var(--success)',
  'ACTION DISPATCHED': 'var(--secondary)',
}

interface ActivityTimelineProps {
  events: ActivityEvent[]
  reducedMotion: boolean
  onSelect: (id: string) => void
  progress?: MotionValue<number>
  active?: boolean
}

export function ActivityTimeline({
  events,
  reducedMotion,
  onSelect,
  progress,
  active = false,
}: ActivityTimelineProps) {
  const latestEvent = events[0]

  return (
    <StageShell
      stage="action"
      frame="activity"
      label="ACTIVITY TRACE"
      index="06"
      tone="primary"
      active={active}
      progress={progress}
      reducedMotion={reducedMotion}
      className="activity-log flex min-h-[420px] flex-col overflow-hidden"
    >
      <div className="activity-log__header flex items-center justify-between gap-4 px-5 py-4">
        <div>
          <TechnicalLabel tone={active ? 'primary' : 'neutral'}>AGENT ACTIVITY</TechnicalLabel>
          {latestEvent && (
            <p className="mt-1 font-mono text-[9px] tracking-[0.14em] text-muted-foreground/50">
              LAST EVENT {latestEvent.time}
            </p>
          )}
        </div>
        <SignalLine tone="primary" active={active && !reducedMotion} className="max-w-12 opacity-50" />
      </div>

      <div className="scrollbar-thin relative min-h-0 flex-1 overflow-y-auto px-5 py-4">
        <div
          aria-hidden
          className="absolute top-4 bottom-4 left-[27px] w-px"
          style={{
            background:
              'linear-gradient(180deg, color-mix(in oklab, var(--primary) 35%, transparent), oklch(1 0 0 / 6%) 60%, transparent)',
          }}
        />

        <ul className="flex flex-col gap-4">
          <AnimatePresence initial={false}>
            {events.map((event) => {
              const tone = KIND_TONE[event.kind]
              return (
                <motion.li
                  key={event.id}
                  initial={reducedMotion ? false : { opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
                  className="relative flex gap-3.5"
                >
                  <span className="relative mt-1 grid size-2.5 shrink-0 place-items-center">
                    <span className="relative size-1.5 rounded-full" style={{ background: tone, boxShadow: `0 0 7px ${tone}` }} />
                  </span>

                  <div className="min-w-0 flex-1 pb-0.5">
                    <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                      <span className="font-mono text-[10px] text-muted-foreground/70 tabular-nums">{event.time}</span>
                      <span className="font-mono text-[10px] tracking-[0.16em]" style={{ color: tone }}>
                        {event.kind}
                      </span>
                    </div>
                    <p className="mt-1 text-[12px] leading-relaxed text-foreground/75">{event.detail}</p>
                    {event.memoryIds && event.memoryIds.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {event.memoryIds.map((id) => (
                          <EvidenceRow
                            key={id}
                            memoryId={id}
                            onSelect={onSelect}
                            reducedMotion={reducedMotion}
                            compact
                            className="min-h-9 w-auto max-w-full px-2 text-[9px]"
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </motion.li>
              )
            })}
          </AnimatePresence>
        </ul>
      </div>
    </StageShell>
  )
}
