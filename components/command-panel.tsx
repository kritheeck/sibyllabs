'use client'

import dynamic from 'next/dynamic'
import { useEffect, useRef, useState, type RefObject } from 'react'
import { AnimatePresence, motion, type MotionValue } from 'motion/react'
import { AGENT, type AgentState, type MemoryRecord } from '@/lib/memory-data'
import { AgentStatus } from './agent-status'
import { CommandRail } from './command-rail'
import { MemoryGraph2D } from './memory-graph-2d'
import { StageShell } from './stage-shell'
import { useMemoryGraph } from '@/lib/memory-context'

const MemoryGraph = dynamic(() => import('./memory-graph').then((module) => module.MemoryGraph), {
  ssr: false,
  loading: () => <GraphSkeleton />,
})

function GraphSkeleton() {
  return (
    <div className="absolute inset-0 grid place-items-center bg-surface-stage">
      <div className="flex flex-col items-center gap-3">
        <div className="size-8 rounded-full border border-primary/30 border-t-primary" />
        <p className="type-label text-muted-foreground/70">INITIALIZING MEMORY FIELD</p>
      </div>
    </div>
  )
}

const SUGGESTIONS = [
  'Deploy production release',
  'What constraints block this?',
  'Why did we choose Supabase?',
]

interface CommandPanelProps {
  state: AgentState
  selectedId: string | null
  activeIds: string[]
  onSelect: (id: string) => void
  onSubmit: (query: string) => Promise<void>
  reducedMotion: boolean
  stageProgress?: MotionValue<number>
  active?: boolean
  recallAnchorRef?: RefObject<HTMLElement | null>
  lastDecision?: {
    action: string
    reason: string
    memories: MemoryRecord[]
    constraintHit?: string
    confidence: number
  } | null
}

export function CommandPanel({
  state,
  selectedId,
  activeIds,
  onSelect,
  onSubmit,
  reducedMotion,
  stageProgress,
  active = false,
  recallAnchorRef,
  lastDecision,
}: CommandPanelProps) {
  const { nodes } = useMemoryGraph()
  const [value, setValue] = useState('')
  const [focused, setFocused] = useState(false)
  const [is3D, setIs3D] = useState(true)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 768px)')
    const sync = () => setIs3D(mediaQuery.matches)
    sync()
    mediaQuery.addEventListener('change', sync)
    return () => mediaQuery.removeEventListener('change', sync)
  }, [])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const submit = () => {
    const query = value.trim()
    if (!query) return
    onSubmit(query)
    setValue('')
  }

  const activeCount = activeIds.length
  const recalling = state === 'RECALLING' || state === 'REASONING'
  const coreIsActive = active || recalling

  return (
    <StageShell
      stage="core"
      frame="core"
      label="CORE / MEMORY"
      index="02"
      tone="primary"
      active={coreIsActive}
      progress={stageProgress}
      reducedMotion={reducedMotion}
      className="core-field overflow-visible"
    >
      <div className="flex min-w-0 flex-col">
        <div className="flex min-h-[54px] flex-wrap items-center gap-x-4 gap-y-2 border-b border-border px-5 py-3.5">
          <div className="flex items-center gap-3">
            <span className="relative grid size-2 shrink-0 place-items-center">
              <span className="relative size-1.5 rounded-full bg-primary shadow-[0_0_8px_color-mix(in_oklab,var(--primary)_70%,transparent)]" />
            </span>
            <div>
              <h2 className="text-[13px] font-medium tracking-[0.14em] text-foreground">
                {AGENT.workspace.toUpperCase()}
              </h2>
              <p className="type-label mt-1 text-muted-foreground/65">AGENT ONLINE · {AGENT.id}</p>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-3">
            <AnimatePresence initial={false}>
              {recalling && (
                <motion.span
                  initial={reducedMotion ? false : { opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
                  transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                  className="hidden font-mono text-[10px] tracking-[0.16em] text-primary/70 sm:block"
                >
                  {activeCount} MEMORIES IN CONTEXT
                </motion.span>
              )}
            </AnimatePresence>
            <AgentStatus state={state} reducedMotion={reducedMotion} />
          </div>
        </div>

        <div className="relative h-[clamp(360px,52vh,640px)] overflow-hidden bg-black/10 xl:h-[clamp(580px,61vh,660px)]">
          {is3D ? (
            <div className="relative h-full">
              <MemoryGraph
                selectedId={selectedId}
                activeIds={activeIds}
                onSelect={onSelect}
                reducedMotion={reducedMotion}
              />
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0"
                style={{
                  background:
                    'radial-gradient(120% 90% at 50% 50%, transparent 50%, oklch(0.13 0.015 255 / 0.28) 100%)',
                }}
              />
              <div className="pointer-events-none absolute top-4 right-5 flex flex-col items-end gap-1">
                <span className="type-label text-muted-foreground/55">MEMORY CONSTELLATION</span>
                <span className="type-label text-muted-foreground/38">{nodes.length} NODES · 22 EDGES</span>
              </div>
              <div className="pointer-events-none absolute bottom-4 right-5 hidden items-center gap-2 font-mono text-[9px] tracking-[0.16em] text-muted-foreground/35 sm:flex">
                <span className="size-1 rounded-full bg-primary/60" />
                <span>FIELD ACTIVE</span>
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
          {lastDecision && (
            <div className="pointer-events-none absolute bottom-16 left-5 right-5 flex justify-center">
              <div className="pointer-events-auto max-w-xl rounded-sm border border-border bg-surface/90 px-4 py-3 backdrop-blur">
                <p className="type-label text-muted-foreground/70">AGENT DECISION</p>
                <p className="mt-1 text-sm font-medium text-foreground">{lastDecision.action}</p>
                <p className="mt-1 text-xs text-muted-foreground">{lastDecision.reason}</p>
              </div>
            </div>
          )}
        </div>

        <CommandRail
          value={value}
          inputRef={inputRef}
          focused={focused}
          onChange={setValue}
          onFocusChange={setFocused}
          onSubmit={submit}
          onSuggestion={onSubmit}
          suggestions={SUGGESTIONS}
          recalling={recalling}
          activeCount={activeCount}
          active={coreIsActive}
          stageProgress={stageProgress}
          anchorRef={recallAnchorRef}
        />
      </div>
    </StageShell>
  )
}
