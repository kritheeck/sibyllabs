'use client'

import { AnimatePresence, motion } from 'motion/react'
import { ArrowUpRight, X } from 'lucide-react'
import { TYPE_META, getMemory, type MemoryRecord } from '@/lib/memory-data'
import { cn } from '@/lib/utils'

const IMPORTANCE_TONE: Record<MemoryRecord['importance'], string> = {
  CRITICAL: 'var(--critical)',
  HIGH: 'var(--warning)',
  MEDIUM: 'var(--primary)',
  LOW: 'var(--muted-foreground)',
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
      <div className="relative h-[3px] flex-1 overflow-hidden rounded-full bg-white/8">
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ background: color, boxShadow: `0 0 10px ${color}` }}
          initial={reducedMotion ? { width: `${value * 100}%` } : { width: 0 }}
          animate={{ width: `${value * 100}%` }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
        />
      </div>
      <span className="font-mono text-[12px] text-foreground tabular-nums">
        {Math.round(value * 100)}%
      </span>
    </div>
  )
}

interface MemoryInspectorProps {
  memoryId: string | null
  onClose: () => void
  onSelect: (id: string) => void
  reducedMotion: boolean
}

export function MemoryInspector({
  memoryId,
  onClose,
  onSelect,
  reducedMotion,
}: MemoryInspectorProps) {
  const memory = memoryId ? getMemory(memoryId) : undefined

  return (
    <AnimatePresence mode="wait">
      {memory && (
        <motion.aside
          key={memory.id}
          initial={reducedMotion ? { opacity: 0 } : { opacity: 0, x: 28 }}
          animate={{ opacity: 1, x: 0 }}
          exit={reducedMotion ? { opacity: 0 } : { opacity: 0, x: 28 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="glass relative overflow-hidden rounded-xl"
          aria-label="Memory inspector"
        >
          <div
            className="absolute inset-x-0 top-0 h-px"
            style={{
              background: `linear-gradient(90deg, transparent, ${TYPE_META[memory.type].hex}, transparent)`,
            }}
          />

          {/* header */}
          <div className="flex items-start gap-3 border-b border-border px-5 py-4">
            <div className="min-w-0 flex-1">
              <p className="font-mono text-[9px] tracking-[0.24em] text-muted-foreground/70">
                MEMORY
              </p>
              <p
                className="mt-1 font-mono text-[11px] tracking-[0.18em]"
                style={{ color: TYPE_META[memory.type].hex }}
              >
                {memory.ref}
              </p>
              <motion.h3
                className="mt-2 text-[15px] leading-snug font-medium tracking-[0.06em] text-balance text-foreground"
                initial={reducedMotion ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08, duration: 0.4 }}
              >
                {memory.label}
              </motion.h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close inspector"
              className="grid size-8 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="scrollbar-thin max-h-[52vh] overflow-y-auto px-5 py-4 lg:max-h-[calc(100vh-24rem)]">
            {/* meta grid */}
            <dl className="grid grid-cols-2 gap-y-4">
              <div>
                <dt className="font-mono text-[9px] tracking-[0.2em] text-muted-foreground/70">
                  TYPE
                </dt>
                <dd
                  className="mt-1 font-mono text-[11px] tracking-[0.16em]"
                  style={{ color: TYPE_META[memory.type].hex }}
                >
                  {memory.type}
                </dd>
              </div>
              <div>
                <dt className="font-mono text-[9px] tracking-[0.2em] text-muted-foreground/70">
                  IMPORTANCE
                </dt>
                <dd
                  className="mt-1 font-mono text-[11px] tracking-[0.16em]"
                  style={{ color: IMPORTANCE_TONE[memory.importance] }}
                >
                  {memory.importance}
                </dd>
              </div>
              <div className="col-span-2">
                <dt className="font-mono text-[9px] tracking-[0.2em] text-muted-foreground/70">
                  CONFIDENCE
                </dt>
                <dd className="mt-2">
                  <ConfidenceMeter
                    value={memory.confidence}
                    color={TYPE_META[memory.type].hex}
                    reducedMotion={reducedMotion}
                  />
                </dd>
              </div>
              <div>
                <dt className="font-mono text-[9px] tracking-[0.2em] text-muted-foreground/70">
                  CREATED
                </dt>
                <dd className="mt-1 font-mono text-[11px] text-foreground/85">
                  {memory.createdAt}
                </dd>
              </div>
              <div>
                <dt className="font-mono text-[9px] tracking-[0.2em] text-muted-foreground/70">
                  USED IN
                </dt>
                <dd className="mt-1 font-mono text-[11px] text-foreground/85">
                  {memory.usedInDecisions} decisions
                </dd>
              </div>
            </dl>

            {/* reason */}
            <div className="mt-6">
              <p className="font-mono text-[9px] tracking-[0.2em] text-muted-foreground/70">
                REASON
              </p>
              <blockquote
                className="mt-2 border-l pl-3 text-[13px] leading-relaxed text-pretty text-foreground/80"
                style={{ borderColor: `color-mix(in oklab, ${TYPE_META[memory.type].hex} 45%, transparent)` }}
              >
                &ldquo;{memory.reason}&rdquo;
              </blockquote>
            </div>

            {/* related */}
            <div className="mt-6">
              <p className="font-mono text-[9px] tracking-[0.2em] text-muted-foreground/70">
                RELATED MEMORIES
              </p>
              <ul className="mt-2 flex flex-col gap-1">
                {memory.relatedIds.map((id, i) => {
                  const related = getMemory(id)
                  if (!related) return null
                  return (
                    <motion.li
                      key={id}
                      initial={reducedMotion ? false : { opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.12 + i * 0.05, duration: 0.35 }}
                    >
                      <button
                        type="button"
                        onClick={() => onSelect(id)}
                        className="group flex w-full items-center gap-2.5 rounded-md border border-transparent px-2 py-1.5 text-left transition-colors hover:border-border hover:bg-white/[0.03]"
                      >
                        <span
                          className="size-1.5 shrink-0 rounded-full"
                          style={{
                            background: TYPE_META[related.type].hex,
                            boxShadow: `0 0 6px ${TYPE_META[related.type].hex}`,
                          }}
                        />
                        <span className="min-w-0 flex-1 truncate text-[12px] text-foreground/80 transition-colors group-hover:text-foreground">
                          {related.label}
                        </span>
                        <ArrowUpRight className="size-3 shrink-0 text-muted-foreground/40 transition-all group-hover:translate-x-px group-hover:-translate-y-px group-hover:text-primary" />
                      </button>
                    </motion.li>
                  )
                })}
              </ul>
            </div>

            {/* tags */}
            <div className="mt-6 flex flex-wrap gap-1.5">
              {memory.tags.map((tag) => (
                <span
                  key={tag}
                  className={cn(
                    'rounded border border-border px-1.5 py-0.5 font-mono text-[9px] tracking-[0.12em] text-muted-foreground',
                  )}
                >
                  {tag.toUpperCase()}
                </span>
              ))}
            </div>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  )
}
