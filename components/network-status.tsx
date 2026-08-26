'use client'

import { motion } from 'motion/react'
import { INTEGRATIONS } from '@/lib/memory-data'

const STATUS_TONE = {
  CONNECTED: 'var(--success)',
  SYNCING: 'var(--warning)',
  OFFLINE: 'var(--muted-foreground)',
} as const

interface NetworkStatusProps {
  reducedMotion: boolean
}

export function NetworkStatus({ reducedMotion }: NetworkStatusProps) {
  return (
    <section aria-label="Network integrations">
      <div className="mb-2.5 flex items-baseline justify-between">
        <h2 className="font-mono text-[10px] tracking-[0.24em] text-muted-foreground/70">
          NETWORK
        </h2>
        <span className="font-mono text-[9px] tracking-[0.16em] text-muted-foreground/45">
          3 / 3 LINKED
        </span>
      </div>

      <div className="grid gap-2.5 sm:grid-cols-3">
        {INTEGRATIONS.map((item, i) => {
          const tone = STATUS_TONE[item.status]
          return (
            <motion.article
              key={item.id}
              initial={reducedMotion ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.08, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              whileHover={reducedMotion ? undefined : { y: -2 }}
              className="glass group relative overflow-hidden rounded-lg px-3.5 py-3"
            >
              {/* transmission bar */}
              {!reducedMotion && (
                <motion.span
                  aria-hidden
                  className="absolute top-0 left-0 h-px w-10"
                  style={{
                    background: `linear-gradient(90deg, transparent, ${tone}, transparent)`,
                  }}
                  animate={{ x: ['-2.5rem', '110%'] }}
                  transition={{
                    duration: 2.8,
                    repeat: Number.POSITIVE_INFINITY,
                    repeatDelay: 1.6 + i * 0.9,
                    ease: 'easeInOut',
                  }}
                />
              )}

              <div className="flex items-center gap-2">
                <motion.span
                  className="size-1.5 shrink-0 rounded-full"
                  style={{ background: tone, boxShadow: `0 0 8px ${tone}` }}
                  animate={reducedMotion ? undefined : { opacity: [1, 0.35, 1] }}
                  transition={{
                    duration: 2.4,
                    repeat: Number.POSITIVE_INFINITY,
                    delay: i * 0.5,
                  }}
                />
                <h3 className="truncate font-mono text-[10px] tracking-[0.16em] text-foreground/90">
                  {item.name}
                </h3>
              </div>

              <p className="mt-1.5 truncate text-[11px] text-muted-foreground/70">
                {item.descriptor}
              </p>

              <div className="mt-2.5 flex items-center justify-between gap-2">
                <span
                  className="font-mono text-[9px] tracking-[0.16em]"
                  style={{ color: tone }}
                >
                  {item.status}
                </span>
                <span className="font-mono text-[9px] text-muted-foreground/50 tabular-nums">
                  {item.latencyMs}ms
                </span>
              </div>

              <p className="mt-1 truncate font-mono text-[9px] text-muted-foreground/35">
                {item.hash}
              </p>
            </motion.article>
          )
        })}
      </div>
    </section>
  )
}
