'use client'

import { AnimatePresence, motion } from 'motion/react'
import { type ActivityEvent, getMemoryLabel } from '@/lib/memory-data'

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
}

export function ActivityTimeline({ events, reducedMotion, onSelect }: ActivityTimelineProps) {
  return (
    <motion.section
      initial={reducedMotion ? false : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.24 }}
      className="glass relative flex min-h-0 flex-col overflow-hidden rounded-xl"
      aria-label="Agent activity"
    >
      <div className="hairline-top absolute inset-x-0 top-0 h-px opacity-50" />

      <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
        <h2 className="font-mono text-[10px] tracking-[0.24em] text-foreground/90">
          AGENT ACTIVITY
        </h2>
        <div className="flex items-center gap-1.5">
          <motion.span
            className="size-1 rounded-full bg-primary"
            animate={reducedMotion ? undefined : { opacity: [1, 0.2, 1] }}
            transition={{ duration: 1.6, repeat: Number.POSITIVE_INFINITY }}
          />
          <span className="font-mono text-[9px] tracking-[0.18em] text-muted-foreground/60">
            LIVE
          </span>
        </div>
      </div>

      <div className="scrollbar-thin relative min-h-0 flex-1 overflow-y-auto px-5 py-4">
        {/* rail */}
        <div
          aria-hidden
          className="absolute top-4 bottom-4 left-[27px] w-px"
          style={{
            background:
              'linear-gradient(180deg, color-mix(in oklab, var(--primary) 35%, transparent), oklch(1 0 0 / 6%) 60%, transparent)',
          }}
        />

        <ul className="flex flex-col gap-3.5">
          <AnimatePresence initial={false}>
            {events.map((event, i) => {
              const tone = KIND_TONE[event.kind]
              return (
                <motion.li
                  key={event.id}
                  layout
                  initial={
                    reducedMotion ? false : { opacity: 0, x: -14, filter: 'blur(4px)' }
                  }
                  animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  className="relative flex gap-3.5"
                >
                  {/* node */}
                  <span className="relative mt-1 grid size-2.5 shrink-0 place-items-center">
                    {i === 0 && !reducedMotion && (
                      <motion.span
                        className="absolute size-2.5 rounded-full"
                        style={{ background: tone }}
                        animate={{ scale: [1, 2.6, 1], opacity: [0.45, 0, 0.45] }}
                        transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
                      />
                    )}
                    <span
                      className="size-1.5 rounded-full"
                      style={{ background: tone, boxShadow: `0 0 8px ${tone}` }}
                    />
                  </span>

                  <div className="min-w-0 flex-1 pb-0.5">
                    <div className="flex items-baseline gap-2.5">
                      <span className="font-mono text-[10px] text-muted-foreground/70 tabular-nums">
                        {event.time}
                      </span>
                      <span
                        className="font-mono text-[10px] tracking-[0.16em]"
                        style={{ color: tone }}
                      >
                        {event.kind}
                      </span>
                    </div>
                    <p className="mt-1 text-[12px] leading-relaxed text-foreground/75">
                      {event.detail}
                    </p>
                    {event.memoryIds && event.memoryIds.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {event.memoryIds.map((id) => (
                          <button
                            key={id}
                            type="button"
                            onClick={() => onSelect(id)}
                            className="rounded border border-border/80 px-1.5 py-0.5 font-mono text-[9px] tracking-[0.1em] text-muted-foreground transition-colors hover:border-primary/35 hover:text-primary"
                          >
                            {getMemoryLabel(id)}
                          </button>
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
    </motion.section>
  )
}
