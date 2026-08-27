'use client'

import { motion } from 'motion/react'
import { METRICS } from '@/lib/memory-data'
import { SignalLine, TechnicalLabel } from './system-primitives'
import { TelemetryRail } from './telemetry-rail'

const TITLE = 'MEMORYOS'

interface HeroProps {
  reducedMotion: boolean
}

export function Hero({ reducedMotion }: HeroProps) {
  return (
    <motion.section
      initial={reducedMotion ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.72, ease: [0.22, 1, 0.36, 1] }}
      className="identity-mast relative"
      aria-label="Overview"
    >
      <div className="grid gap-9 md:grid-cols-[minmax(0,3fr)_minmax(240px,2fr)] md:items-end lg:grid-cols-[minmax(0,1fr)_minmax(360px,1.08fr)] lg:gap-12">
        <div className="relative min-w-0 pl-5 sm:pl-7">
          <span className="identity-datum" aria-hidden />

          <motion.div
            initial={reducedMotion ? false : { opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.12, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="inline-flex max-w-full items-center gap-2 border-b border-border pb-2"
          >
            <span className="size-1.5 shrink-0 rounded-full bg-primary" />
            <span className="type-label truncate text-muted-foreground">PERSISTENT OPERATIONAL MEMORY</span>
          </motion.div>

          <h1 className="type-display mt-5 max-w-full whitespace-nowrap text-foreground">
            <span className="sr-only">MEMORYOS</span>
            {TITLE.split('').map((char, index) => (
              <motion.span
                key={`${char}-${index}`}
                aria-hidden
                className={index < 6 ? 'text-foreground' : 'text-primary text-shadow-glow'}
                initial={reducedMotion ? false : { opacity: 0, y: 18, filter: 'blur(6px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                transition={{
                  delay: 0.16 + index * 0.04,
                  duration: 0.66,
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                {char}
              </motion.span>
            ))}
          </h1>

          <motion.p
            initial={reducedMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="mt-4 max-w-xl text-[17px] leading-[1.35] text-foreground/85 sm:text-[19px]"
          >
            Your agent remembers what you don&apos;t.
          </motion.p>

          <motion.p
            initial={reducedMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="type-body mt-2 max-w-lg text-[13px] text-muted-foreground"
          >
            Persistent operational memory that changes what your AI does next.
          </motion.p>

          <div className="mt-6 flex max-w-md items-center gap-3">
            <TechnicalLabel tone="neutral" className="shrink-0 text-muted-foreground/55">SYSTEM INDEX</TechnicalLabel>
            <SignalLine tone="primary" active={!reducedMotion} className="opacity-55" />
            <span className="font-mono text-[9px] tracking-[0.16em] text-muted-foreground/45">SIBYL</span>
          </div>
        </div>

        <TelemetryRail metrics={METRICS} reducedMotion={reducedMotion} />
      </div>
    </motion.section>
  )
}
