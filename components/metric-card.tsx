'use client'

import { useEffect, useRef, useState } from 'react'
import { animate, motion, useInView, useMotionValue, useTransform } from 'motion/react'
import { cn } from '@/lib/utils'

interface MetricCardProps {
  value: number
  label: string
  delta: string
  index: number
  reducedMotion?: boolean
}

export function MetricCard({ value, label, delta, index, reducedMotion }: MetricCardProps) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.4 })
  const count = useMotionValue(0)
  const rounded = useTransform(count, (v) => Math.round(v).toString())
  const [display, setDisplay] = useState('0')
  const [drift, setDrift] = useState(0)

  useEffect(() => {
    const unsub = rounded.on('change', setDisplay)
    return unsub
  }, [rounded])

  useEffect(() => {
    if (!inView) return
    if (reducedMotion) {
      count.set(value)
      return
    }
    const controls = animate(count, value, {
      duration: 1.6,
      delay: 0.25 + index * 0.12,
      ease: [0.16, 1, 0.3, 1],
    })
    return () => controls.stop()
  }, [inView, value, count, index, reducedMotion])

  /* subtle live drift so the numbers feel connected to a running system */
  useEffect(() => {
    if (reducedMotion) return
    const id = setInterval(
      () => setDrift((d) => (d === 0 ? 1 : 0)),
      6000 + index * 1700,
    )
    return () => clearInterval(id)
  }, [index, reducedMotion])

  return (
    <motion.div
      ref={ref}
      initial={reducedMotion ? false : { opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 + index * 0.09, duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
      whileHover={reducedMotion ? undefined : { y: -3 }}
      className="glass group relative overflow-hidden rounded-lg px-5 py-4"
    >
      {/* top luminous edge */}
      <div className="hairline-top absolute inset-x-0 top-0 h-px opacity-50 transition-opacity duration-500 group-hover:opacity-100" />

      {/* scanning sheen */}
      {!reducedMotion && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'linear-gradient(105deg, transparent 30%, oklch(0.83 0.115 205 / 0.07) 50%, transparent 70%)',
          }}
          animate={{ x: ['-120%', '120%'] }}
          transition={{
            duration: 4.2,
            repeat: Number.POSITIVE_INFINITY,
            repeatDelay: 5 + index * 1.4,
            ease: 'easeInOut',
          }}
        />
      )}

      <div className="relative flex items-start justify-between gap-4">
        <div>
          <motion.p
            className="font-mono text-[38px] leading-none font-light tracking-tight text-foreground tabular-nums"
            animate={reducedMotion ? undefined : { opacity: drift === 0 ? 1 : 0.86 }}
            transition={{ duration: 1.8 }}
          >
            {display}
          </motion.p>
          <p className="mt-2.5 font-mono text-[10px] tracking-[0.22em] text-muted-foreground">
            {label}
          </p>
        </div>

        {/* mini activity bars */}
        <div className="flex h-10 items-end gap-[3px]" aria-hidden>
          {Array.from({ length: 7 }).map((_, i) => (
            <motion.span
              key={i}
              className={cn('w-[3px] rounded-full', i === 6 ? 'bg-primary' : 'bg-primary/25')}
              initial={{ height: 4 }}
              animate={
                reducedMotion
                  ? { height: 6 + ((i * 5) % 18) }
                  : { height: [6 + ((i * 5) % 14), 10 + ((i * 7) % 26), 6 + ((i * 5) % 14)] }
              }
              transition={{
                duration: 3 + i * 0.35,
                repeat: Number.POSITIVE_INFINITY,
                ease: 'easeInOut',
                delay: i * 0.12,
              }}
            />
          ))}
        </div>
      </div>

      <p className="relative mt-3 font-mono text-[9px] tracking-[0.18em] text-primary/70">
        {delta}
      </p>
    </motion.div>
  )
}
