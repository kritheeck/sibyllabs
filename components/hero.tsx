'use client'

import { motion } from 'motion/react'
import { METRICS } from '@/lib/memory-data'
import { MetricCard } from './metric-card'

const TITLE = 'MEMORYOS'

interface HeroProps {
  reducedMotion: boolean
}

export function Hero({ reducedMotion }: HeroProps) {
  return (
    <section className="relative" aria-label="Overview">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)] lg:items-end">
        <div>
          {/* eyebrow */}
          <motion.div
            initial={reducedMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 rounded-full border border-border px-2.5 py-1"
          >
            <span className="size-1 rounded-full bg-primary" />
            <span className="font-mono text-[9px] tracking-[0.24em] text-muted-foreground">
              PERSISTENT OPERATIONAL MEMORY
            </span>
          </motion.div>

          {/* headline — letters resolve into place */}
          <h1 className="mt-5 flex text-[clamp(2.6rem,8vw,5.2rem)] leading-[0.92] font-light tracking-[-0.03em] text-foreground">
            <span className="sr-only">MEMORYOS</span>
            {TITLE.split('').map((char, i) => (
              <motion.span
                key={`${char}-${i}`}
                aria-hidden
                className={i < 6 ? 'text-foreground' : 'text-primary text-shadow-glow'}
                initial={
                  reducedMotion ? false : { opacity: 0, y: 22, filter: 'blur(8px)' }
                }
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                transition={{
                  delay: 0.08 + i * 0.045,
                  duration: 0.75,
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                {char}
              </motion.span>
            ))}
          </h1>

          <motion.p
            initial={reducedMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="mt-5 max-w-xl text-[17px] leading-relaxed text-pretty text-foreground/85 sm:text-[19px]"
          >
            Your agent remembers what you don&apos;t.
          </motion.p>

          <motion.p
            initial={reducedMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.62, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="mt-2 max-w-lg text-[13px] leading-relaxed text-pretty text-muted-foreground"
          >
            Persistent operational memory that changes what your AI does next.
          </motion.p>
        </div>

        {/* metrics */}
        <div className="grid gap-2.5 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
          {METRICS.map((metric, i) => (
            <MetricCard
              key={metric.id}
              value={metric.value}
              label={metric.label}
              delta={metric.delta}
              index={i}
              reducedMotion={reducedMotion}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
