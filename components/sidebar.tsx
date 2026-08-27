'use client'

import { AnimatePresence, motion } from 'motion/react'
import {
  Activity,
  Boxes,
  BrainCircuit,
  GitBranch,
  Layers,
  Radar,
  Settings2,
  Terminal,
  X,
} from 'lucide-react'
import { AGENT } from '@/lib/memory-data'
import { cn } from '@/lib/utils'

const NAV = [
  { id: 'command', label: 'Command Center', icon: Terminal },
  { id: 'projects', label: 'Projects', icon: Layers },
  { id: 'memory', label: 'Memory', icon: BrainCircuit },
  { id: 'decisions', label: 'Decisions', icon: GitBranch },
  { id: 'agents', label: 'Agents', icon: Boxes },
  { id: 'actions', label: 'Actions', icon: Activity },
  { id: 'network', label: 'Network', icon: Radar },
  { id: 'settings', label: 'Settings', icon: Settings2 },
] as const

interface SidebarProps {
  active: string
  onNavigate: (id: string) => void
  /** mobile drawer */
  open?: boolean
  onClose?: () => void
  reducedMotion?: boolean
}

function SidebarBody({ active, onNavigate, reducedMotion, onClose }: SidebarProps) {
  return (
    <div className="flex h-full flex-col">
      {/* logo */}
      <div className="flex items-center gap-3 px-5 py-5">
        <motion.div
          className="relative grid size-9 place-items-center rounded-md border border-primary/25"
          style={{
            background:
              'linear-gradient(145deg, color-mix(in oklab, var(--primary) 18%, transparent), transparent)',
          }}
          animate={reducedMotion ? undefined : { boxShadow: [
            '0 0 0px oklch(0.83 0.115 205 / 0)',
            '0 0 18px oklch(0.83 0.115 205 / 0.28)',
            '0 0 0px oklch(0.83 0.115 205 / 0)',
          ] }}
          transition={{ duration: 4.5, repeat: Number.POSITIVE_INFINITY }}
        >
          <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
            <g stroke="var(--primary)" strokeWidth="1.2" fill="none" strokeLinecap="round">
              <circle cx="12" cy="12" r="2.1" fill="var(--primary)" stroke="none" />
              <circle cx="5" cy="6.5" r="1.35" />
              <circle cx="19" cy="6.5" r="1.35" />
              <circle cx="5" cy="17.5" r="1.35" />
              <circle cx="19" cy="17.5" r="1.35" />
              <path d="M6.2 7.4 10.3 10.8M17.8 7.4 13.7 10.8M6.2 16.6 10.3 13.2M17.8 16.6 13.7 13.2" />
            </g>
          </svg>
        </motion.div>
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold tracking-[0.22em] text-foreground">
            MEMORYOS
          </p>
          <p className="font-mono text-[9px] tracking-[0.2em] text-muted-foreground">v2.4.1 / OS</p>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
             className="ml-auto grid size-8 min-h-11 min-w-11 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground lg:hidden"
            aria-label="Close navigation"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      <div className="mx-5 h-px bg-border" />

      {/* nav */}
      <nav className="scrollbar-thin flex-1 overflow-y-auto px-3 py-4" aria-label="Primary">
        <p className="px-2 pb-2 font-mono text-[9px] tracking-[0.24em] text-muted-foreground/70">
          MODULES
        </p>
        <ul className="flex flex-col gap-0.5">
          {NAV.map((item, i) => {
            const isActive = item.id === active
            const Icon = item.icon
            return (
              <motion.li
                key={item.id}
                initial={reducedMotion ? false : { opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05 + i * 0.035, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              >
                <button
                  type="button"
                  onClick={() => onNavigate(item.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    'group relative flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-[13px] transition-colors duration-200',
                    isActive
                      ? 'text-foreground'
                      : 'text-muted-foreground hover:text-foreground/90',
                  )}
                >
                  {isActive && (
                    <motion.span
                      layoutId="nav-active"
                      className="absolute inset-0 rounded-md border border-primary/20"
                      style={{
                        background:
                          'linear-gradient(90deg, color-mix(in oklab, var(--primary) 14%, transparent), transparent)',
                      }}
                      transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                    />
                  )}
                  {isActive && (
                    <motion.span
                      layoutId="nav-active-bar"
                      className="absolute top-1/2 left-0 h-4 w-[2px] -translate-y-1/2 rounded-full bg-primary"
                      style={{ boxShadow: '0 0 10px oklch(0.83 0.115 205 / 0.7)' }}
                      transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                    />
                  )}
                  <Icon
                    className={cn(
                      'relative size-4 shrink-0 transition-transform duration-300 group-hover:translate-x-px',
                      isActive ? 'text-primary' : 'text-muted-foreground',
                    )}
                    strokeWidth={1.6}
                  />
                  <span className="relative truncate">{item.label}</span>
                </button>
              </motion.li>
            )
          })}
        </ul>
      </nav>

      {/* footer */}
      <div className="mx-5 h-px bg-border" />
      <div className="px-5 py-4">
        <div className="flex items-center gap-2">
          <motion.span
            className="size-1.5 rounded-full bg-success"
            style={{ boxShadow: '0 0 8px oklch(0.78 0.14 165 / 0.8)' }}
            animate={reducedMotion ? undefined : { opacity: [1, 0.35, 1] }}
            transition={{ duration: 2.6, repeat: Number.POSITIVE_INFINITY }}
          />
          <span className="font-mono text-[10px] tracking-[0.2em] text-success">SYSTEM ONLINE</span>
        </div>

        <dl className="mt-3.5 grid gap-2.5">
          <div>
            <dt className="font-mono text-[9px] tracking-[0.2em] text-muted-foreground/70">AGENT</dt>
            <dd className="font-mono text-[11px] text-foreground/90">{AGENT.id}</dd>
          </div>
          <div>
            <dt className="font-mono text-[9px] tracking-[0.2em] text-muted-foreground/70">
              WORKSPACE
            </dt>
            <dd className="text-[12px] text-foreground/90">{AGENT.workspace}</dd>
          </div>
        </dl>
      </div>
    </div>
  )
}

export function Sidebar(props: SidebarProps) {
  return (
    <>
      {/* desktop rail */}
      <aside className="hidden w-[248px] shrink-0 border-r border-border bg-[color-mix(in_oklab,var(--surface)_55%,transparent)] backdrop-blur-xl lg:block">
        <SidebarBody {...props} onClose={undefined} />
      </aside>

      {/* mobile drawer */}
      <AnimatePresence>
        {props.open && (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={props.onClose}
            />
            <motion.aside
              className="fixed inset-y-0 left-0 z-50 w-[264px] border-r border-border bg-[color-mix(in_oklab,var(--surface)_92%,transparent)] backdrop-blur-2xl lg:hidden"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 380, damping: 36 }}
            >
              <SidebarBody {...props} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
