'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Bell, ChevronRight, Menu } from 'lucide-react'
import { AGENT } from '@/lib/memory-data'

interface TopBarProps {
  section: string
  onMenu: () => void
  reducedMotion?: boolean
}

export function TopBar({ section, onMenu, reducedMotion }: TopBarProps) {
  const [clock, setClock] = useState('--:--:--')

  useEffect(() => {
    const tick = () => {
      const d = new Date()
      setClock(
        [d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds()]
          .map((n) => String(n).padStart(2, '0'))
          .join(':'),
      )
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-[color-mix(in_oklab,var(--background)_72%,transparent)] backdrop-blur-xl">
      <div className="flex h-14 items-center gap-3 px-4 sm:px-6">
        <button
          type="button"
          onClick={onMenu}
          className="grid size-9 place-items-center rounded-md border border-border text-muted-foreground transition-colors hover:text-foreground lg:hidden"
          aria-label="Open navigation"
        >
          <Menu className="size-4" />
        </button>

        {/* breadcrumb */}
        <div className="flex min-w-0 items-center gap-1.5 font-mono text-[11px] tracking-[0.18em]">
          <span className="text-muted-foreground/70">MEMORYOS</span>
          <ChevronRight className="size-3 shrink-0 text-muted-foreground/40" />
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={section}
              className="truncate text-foreground"
              initial={reducedMotion ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.24 }}
            >
              {section.toUpperCase()}
            </motion.span>
          </AnimatePresence>
        </div>

        <div className="ml-auto flex items-center gap-2 sm:gap-4">
          {/* system status */}
          <div className="hidden items-center gap-2 rounded-full border border-success/25 bg-success/8 px-3 py-1.5 md:flex">
            <motion.span
              className="size-1.5 rounded-full bg-success"
              style={{ boxShadow: '0 0 8px oklch(0.78 0.14 165 / 0.8)' }}
              animate={reducedMotion ? undefined : { opacity: [1, 0.4, 1] }}
              transition={{ duration: 2.8, repeat: Number.POSITIVE_INFINITY }}
            />
            <span className="font-mono text-[10px] tracking-[0.16em] text-success">
              ALL SYSTEMS OPERATIONAL
            </span>
          </div>

          {/* current project */}
          <div className="hidden min-w-0 flex-col items-end xl:flex">
            <span className="font-mono text-[9px] tracking-[0.2em] text-muted-foreground/70">
              CURRENT PROJECT
            </span>
            <span className="truncate text-[12px] text-foreground/90">{AGENT.project}</span>
          </div>

          <div className="hidden h-7 w-px bg-border xl:block" />

          <span className="hidden font-mono text-[11px] text-muted-foreground tabular-nums sm:block">
            {clock} <span className="text-muted-foreground/50">UTC</span>
          </span>

          <button
            type="button"
            className="relative grid size-9 place-items-center rounded-md border border-border text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
            aria-label="Notifications, 3 unread"
          >
            <Bell className="size-4" strokeWidth={1.6} />
            <motion.span
              className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-primary"
              style={{ boxShadow: '0 0 8px oklch(0.83 0.115 205 / 0.9)' }}
              animate={reducedMotion ? undefined : { scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
              transition={{ duration: 2.2, repeat: Number.POSITIVE_INFINITY }}
            />
          </button>

          <button
            type="button"
            className="grid size-9 place-items-center rounded-md border border-primary/25 font-mono text-[11px] text-primary transition-colors hover:border-primary/50"
            style={{
              background:
                'linear-gradient(145deg, color-mix(in oklab, var(--primary) 16%, transparent), transparent)',
            }}
            aria-label="Account: A. Reyes"
          >
            AR
          </button>
        </div>
      </div>

      {/* luminous hairline */}
      <div className="hairline-top h-px opacity-40" />
    </header>
  )
}
