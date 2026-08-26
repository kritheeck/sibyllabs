'use client'

import { useState } from 'react'
import { motion } from 'motion/react'
import { CURRENT_DECISION, PROJECTS } from '@/lib/memory-data'
import { useAgentRuntime } from './agent-runtime'
import { ActivityTimeline } from './activity-timeline'
import { CommandPanel } from './command-panel'
import { DecisionCard } from './decision-card'
import { Hero } from './hero'
import { MemoryInspector } from './memory-inspector'
import { NetworkStatus } from './network-status'
import { Sidebar } from './sidebar'
import { TopBar } from './top-bar'
import { cn } from '@/lib/utils'

const SECTION_LABEL: Record<string, string> = {
  command: 'Command Center',
  projects: 'Projects',
  memory: 'Memory',
  decisions: 'Decisions',
  agents: 'Agents',
  actions: 'Actions',
  network: 'Network',
  settings: 'Settings',
}

const RISK_TONE = (risk: number) =>
  risk > 0.6 ? 'var(--critical)' : risk > 0.4 ? 'var(--warning)' : 'var(--success)'

function ProjectRail({ reducedMotion }: { reducedMotion: boolean }) {
  return (
    <section aria-label="Projects">
      <div className="mb-2.5 flex items-baseline justify-between">
        <h2 className="font-mono text-[10px] tracking-[0.24em] text-muted-foreground/70">
          PROJECTS
        </h2>
        <span className="font-mono text-[9px] tracking-[0.16em] text-muted-foreground/45">
          148 MEMORIES TOTAL
        </span>
      </div>

      <div className="glass overflow-hidden rounded-lg">
        <ul>
          {PROJECTS.map((project, i) => {
            const tone = RISK_TONE(project.risk)
            return (
              <motion.li
                key={project.id}
                initial={reducedMotion ? false : { opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.34 + i * 0.07, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className={cn(
                  'group relative flex items-center gap-3 px-4 py-3 transition-colors hover:bg-white/[0.03]',
                  i !== PROJECTS.length - 1 && 'border-b border-border',
                )}
              >
                <span className="relative grid size-2 shrink-0 place-items-center">
                  {project.status === 'ACTIVE' && !reducedMotion && (
                    <motion.span
                      className="absolute size-2 rounded-full"
                      style={{ background: tone }}
                      animate={{ scale: [1, 2.4, 1], opacity: [0.4, 0, 0.4] }}
                      transition={{
                        duration: 2.6,
                        repeat: Number.POSITIVE_INFINITY,
                        delay: i * 0.4,
                      }}
                    />
                  )}
                  <span
                    className="size-1.5 rounded-full"
                    style={{
                      background: project.status === 'ARCHIVED' ? 'var(--muted-foreground)' : tone,
                      boxShadow:
                        project.status === 'ARCHIVED' ? 'none' : `0 0 8px ${tone}`,
                    }}
                  />
                </span>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12.5px] text-foreground/90">{project.name}</p>
                  <p className="font-mono text-[9px] tracking-[0.16em] text-muted-foreground/60">
                    {project.status} · {project.memories} MEMORIES · {project.owner}
                  </p>
                </div>

                {/* risk bar */}
                <div className="hidden w-20 shrink-0 sm:block">
                  <div className="h-[3px] overflow-hidden rounded-full bg-white/8">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: tone, boxShadow: `0 0 8px ${tone}` }}
                      initial={reducedMotion ? { width: `${project.risk * 100}%` } : { width: 0 }}
                      animate={{ width: `${project.risk * 100}%` }}
                      transition={{
                        delay: 0.5 + i * 0.08,
                        duration: 1,
                        ease: [0.16, 1, 0.3, 1],
                      }}
                    />
                  </div>
                  <p className="mt-1 font-mono text-[8px] tracking-[0.16em] text-muted-foreground/50">
                    RISK {Math.round(project.risk * 100)}
                  </p>
                </div>
              </motion.li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}

export function Dashboard() {
  const { state, activeMemoryIds, activity, selectedId, select, runQuery, reducedMotion } =
    useAgentRuntime()
  const [section, setSection] = useState('command')
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="flex min-h-screen">
      <Sidebar
        active={section}
        onNavigate={(id) => {
          setSection(id)
          setMenuOpen(false)
        }}
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        reducedMotion={reducedMotion}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          section={SECTION_LABEL[section] ?? section}
          onMenu={() => setMenuOpen(true)}
          reducedMotion={reducedMotion}
        />

        <main className="flex-1 px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
          <div className="mx-auto flex max-w-[1400px] flex-col gap-8">
            <Hero reducedMotion={reducedMotion} />

            {/* primary workspace */}
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
              <div className="flex flex-col gap-4">
                <CommandPanel
                  state={state}
                  selectedId={selectedId}
                  activeIds={activeMemoryIds}
                  onSelect={select}
                  onSubmit={runQuery}
                  reducedMotion={reducedMotion}
                />
                <NetworkStatus reducedMotion={reducedMotion} />
              </div>

              <div className="flex min-h-0 flex-col gap-4">
                <DecisionCard
                  decision={CURRENT_DECISION}
                  onSelect={select}
                  reducedMotion={reducedMotion}
                />
                <MemoryInspector
                  memoryId={selectedId}
                  onClose={() => select(null)}
                  onSelect={select}
                  reducedMotion={reducedMotion}
                />
                <div className="min-h-[280px] flex-1">
                  <ActivityTimeline
                    events={activity}
                    reducedMotion={reducedMotion}
                    onSelect={select}
                  />
                </div>
              </div>
            </div>

            <ProjectRail reducedMotion={reducedMotion} />

            <footer className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border pt-5 pb-2">
              <span className="font-mono text-[9px] tracking-[0.2em] text-muted-foreground/50">
                MEMORYOS v2.4.1
              </span>
              <span className="font-mono text-[9px] tracking-[0.2em] text-muted-foreground/35">
                MEMORY LAYER: SIBYL
              </span>
              <span className="ml-auto font-mono text-[9px] tracking-[0.2em] text-muted-foreground/35">
                BUILT ON BASE · VIRTUALS ACP
              </span>
            </footer>
          </div>
        </main>
      </div>
    </div>
  )
}
