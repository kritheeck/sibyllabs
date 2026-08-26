'use client'

import dynamic from 'next/dynamic'
import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowUp, Mic, Sparkles } from 'lucide-react'
import { AGENT, MEMORY_NODES, type AgentState } from '@/lib/memory-data'
import { AgentStatus } from './agent-status'
import { MemoryGraph2D } from './memory-graph-2d'
import { cn } from '@/lib/utils'

const MemoryGraph = dynamic(() => import('./memory-graph').then((m) => m.MemoryGraph), {
  ssr: false,
  loading: () => <GraphSkeleton />,
})

function GraphSkeleton() {
  return (
    <div className="absolute inset-0 grid place-items-center">
      <div className="flex flex-col items-center gap-3">
        <motion.div
          className="size-8 rounded-full border border-primary/30 border-t-primary"
          animate={{ rotate: 360 }}
          transition={{ duration: 1.1, repeat: Number.POSITIVE_INFINITY, ease: 'linear' }}
        />
        <p className="font-mono text-[10px] tracking-[0.2em] text-muted-foreground/70">
          INITIALIZING MEMORY FIELD
        </p>
      </div>
    </div>
  )
}

const SUGGESTIONS = [
  'Should we deploy Atlas today?',
  'What went wrong in incident #12?',
  'Which constraints block the release?',
]

interface CommandPanelProps {
  state: AgentState
  selectedId: string | null
  activeIds: string[]
  onSelect: (id: string) => void
  onSubmit: (query: string) => void
  reducedMotion: boolean
}

export function CommandPanel({
  state,
  selectedId,
  activeIds,
  onSelect,
  onSubmit,
  reducedMotion,
}: CommandPanelProps) {
  const [value, setValue] = useState('')
  const [focused, setFocused] = useState(false)
  const [is3D, setIs3D] = useState(true)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)')
    const sync = () => setIs3D(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const submit = () => {
    if (!value.trim()) return
    onSubmit(value)
    setValue('')
  }

  const activeCount = activeIds.length
  const recalling = state === 'RECALLING' || state === 'REASONING'

  return (
    <motion.section
      initial={reducedMotion ? false : { opacity: 0, y: 26 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.12 }}
      className="glass relative overflow-hidden rounded-xl"
      aria-label="Command center"
    >
      <div className="hairline-top absolute inset-x-0 top-0 h-px opacity-70" />

      {/* header */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-border px-5 py-3.5">
        <div className="flex items-center gap-3">
          <div className="relative">
            <motion.div
              className="size-2 rounded-full bg-primary"
              style={{ boxShadow: '0 0 10px oklch(0.83 0.115 205 / 0.9)' }}
              animate={reducedMotion ? undefined : { opacity: [1, 0.4, 1] }}
              transition={{ duration: 2.4, repeat: Number.POSITIVE_INFINITY }}
            />
          </div>
          <div>
            <h2 className="text-[13px] font-medium tracking-[0.14em] text-foreground">
              {AGENT.workspace.toUpperCase()}
            </h2>
            <p className="font-mono text-[9px] tracking-[0.2em] text-muted-foreground/70">
              AGENT ONLINE · {AGENT.id}
            </p>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-3">
          <AnimatePresence>
            {recalling && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                className="hidden overflow-hidden font-mono text-[10px] whitespace-nowrap tracking-[0.16em] text-primary/70 sm:block"
              >
                {activeCount} MEMORIES IN CONTEXT
              </motion.span>
            )}
          </AnimatePresence>
          <AgentStatus state={state} reducedMotion={reducedMotion} />
        </div>
      </div>

      {/* visualization stage */}
      <div className="relative">
        {is3D ? (
          <div className="relative h-[clamp(340px,48vh,540px)]">
            <MemoryGraph
              selectedId={selectedId}
              activeIds={activeIds}
              onSelect={onSelect}
              reducedMotion={reducedMotion}
            />
            {/* stage vignette so nodes fall away into depth */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  'radial-gradient(120% 90% at 50% 50%, transparent 45%, oklch(0.13 0.015 255 / 0.6) 100%)',
              }}
            />
            {/* legend */}
            <div className="pointer-events-none absolute top-3 right-4 flex flex-col items-end gap-1">
              <span className="font-mono text-[9px] tracking-[0.2em] text-muted-foreground/50">
                MEMORY CONSTELLATION
              </span>
              <span className="font-mono text-[9px] tracking-[0.2em] text-muted-foreground/35">
                {MEMORY_NODES.length} NODES · 22 EDGES
              </span>
            </div>
          </div>
        ) : (
          <MemoryGraph2D
            selectedId={selectedId}
            activeIds={activeIds}
            onSelect={onSelect}
            reducedMotion={reducedMotion}
          />
        )}
      </div>

      {/* command input */}
      <div className="border-t border-border px-4 py-4 sm:px-5">
        <div
          className={cn(
            'relative flex items-center gap-2 rounded-lg border px-3 py-2 transition-all duration-300',
            focused
              ? 'border-primary/45 bg-primary/[0.04]'
              : 'border-border bg-black/25 hover:border-primary/20',
          )}
          style={
            focused
              ? { boxShadow: '0 0 0 1px oklch(0.83 0.115 205 / 0.14), 0 0 32px -12px oklch(0.83 0.115 205 / 0.4)' }
              : undefined
          }
        >
          <Sparkles
            className={cn(
              'size-4 shrink-0 transition-colors',
              focused ? 'text-primary' : 'text-muted-foreground/60',
            )}
            strokeWidth={1.6}
          />
          <input
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onKeyDown={(e) => {
              if (e.key !== 'Enter') return
              if (e.nativeEvent.isComposing || e.keyCode === 229) return
              e.preventDefault()
              submit()
            }}
            placeholder="Ask MEMORYOS anything..."
            aria-label="Ask MEMORYOS anything"
            className="min-w-0 flex-1 bg-transparent text-[13px] text-foreground placeholder:text-muted-foreground/55 focus:outline-none"
          />

          <kbd className="hidden shrink-0 rounded border border-border px-1.5 py-0.5 font-mono text-[9px] tracking-wider text-muted-foreground/70 sm:block">
            ⌘K
          </kbd>

          <button
            type="button"
            aria-label="Voice input"
            className="grid size-8 shrink-0 place-items-center rounded-md border border-border text-muted-foreground transition-colors hover:border-secondary/40 hover:text-secondary"
          >
            <Mic className="size-3.5" strokeWidth={1.7} />
          </button>

          <motion.button
            type="button"
            onClick={submit}
            disabled={!value.trim()}
            aria-label="Send command"
            whileTap={reducedMotion ? undefined : { scale: 0.94 }}
            className={cn(
              'grid size-8 shrink-0 place-items-center rounded-md border transition-all duration-200',
              value.trim()
                ? 'border-primary/50 bg-primary/15 text-primary'
                : 'border-border text-muted-foreground/50',
            )}
            style={
              value.trim()
                ? { boxShadow: '0 0 18px -6px oklch(0.83 0.115 205 / 0.6)' }
                : undefined
            }
          >
            <ArrowUp className="size-3.5" strokeWidth={2} />
          </motion.button>
        </div>

        {/* suggestions */}
        <div className="mt-3 flex flex-wrap gap-2">
          {SUGGESTIONS.map((s, i) => (
            <motion.button
              key={s}
              type="button"
              onClick={() => onSubmit(s)}
              initial={reducedMotion ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + i * 0.08, duration: 0.45 }}
              className="rounded-full border border-border px-3 py-1 text-[11px] text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
            >
              {s}
            </motion.button>
          ))}
        </div>
      </div>
    </motion.section>
  )
}
