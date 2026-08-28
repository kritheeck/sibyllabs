'use client'

import { useState, type CSSProperties } from 'react'
import { motion, type MotionValue, useTransform } from 'motion/react'
import { CURRENT_DECISION, PROJECTS } from '@/lib/memory-data'
import { useAgentRuntime } from './agent-runtime'
import { ActivityTimeline } from './activity-timeline'
import { CommandPanel } from './command-panel'
import { DecisionCard } from './decision-card'
import { Hero } from './hero'
import { MemoryInspector } from './memory-inspector'
import { NetworkStatus } from './network-status'
import { OperationalLedgerRow } from './operational-ledger-row'
import { Sidebar } from './sidebar'
import { StageShell } from './stage-shell'
import { SystemTimeline } from './system-timeline'
import { TopBar } from './top-bar'
import { useSystemTimeline, SYSTEM_STAGES, type SystemStage } from '@/hooks/use-system-timeline'

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

const NAV_STAGE: Record<string, SystemStage> = {
  command: 'system-init',
  projects: 'action',
  memory: 'memory',
  decisions: 'reason',
  agents: 'core',
  actions: 'action',
  network: 'action',
  settings: 'system-init',
}

const RISK_TONE = (risk: number) =>
  risk > 0.6 ? 'critical' : risk > 0.4 ? 'warning' : 'success'

interface ProjectRailProps {
  reducedMotion: boolean
  progress: MotionValue<number>
  active: boolean
}

function ProjectRail({ reducedMotion, progress, active }: ProjectRailProps) {
  return (
    <StageShell
      stage="action"
      frame="ledger"
      label="PROJECT LEDGER"
      tone="neutral"
      active={active}
      progress={progress}
      reducedMotion={reducedMotion}
      className="project-ledger"
    >
      <div className="mb-3 flex items-end justify-between gap-4 px-1">
        <h2 className="text-[15px] font-medium tracking-[0.08em] text-foreground">PROJECTS</h2>
        <span className="font-mono text-[9px] tracking-[0.16em] text-muted-foreground/55">
          148 MEMORIES TOTAL
        </span>
      </div>

      <div className="ledger-surface overflow-hidden">
        <ul>
          {PROJECTS.map((project, index) => (
            <OperationalLedgerRow
              key={project.id}
              name={project.name}
              status={project.status}
              metadata={`${project.memories} MEMORIES · ${project.owner}`}
              tone={`var(--${RISK_TONE(project.risk)})`}
              risk={project.risk}
              riskLabel="RISK"
              reducedMotion={reducedMotion}
              delay={index * 0.05}
            />
          ))}
        </ul>
      </div>
    </StageShell>
  )
}

export function Dashboard() {
  const { state, activeMemoryIds, activity, selectedId, select, runQuery, lastDecision, reducedMotion } =
    useAgentRuntime()
  const [section, setSection] = useState('command')
  const [menuOpen, setMenuOpen] = useState(false)
  const {
    targetRef,
    atmosphere,
    activeStage,
    stageProgress,
    stageRefs,
    progress,
    scrollToStage,
  } = useSystemTimeline({ state, selectedId, reducedMotion })
  const atmosphericShift = useTransform(progress, [0, 1], [0, -72])
  const activeStageMeta = SYSTEM_STAGES.find((stage) => stage.id === activeStage) ?? SYSTEM_STAGES[0]
  const activeNavLabel = section === 'command'
    ? `${activeStageMeta.index} / ${activeStageMeta.label}`
    : SECTION_LABEL[section] ?? activeStageMeta.label
  const coreActive = activeStage === 'core' || activeStage === 'memory' || activeStage === 'recall'

  return (
    <div className="flex min-h-screen">
      <Sidebar
        active={section}
        onNavigate={(id) => {
          setSection(id)
          setMenuOpen(false)
          scrollToStage(NAV_STAGE[id] ?? 'system-init')
        }}
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        reducedMotion={reducedMotion}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          section={activeNavLabel}
          onMenu={() => setMenuOpen(true)}
          reducedMotion={reducedMotion}
        />

        <motion.main
          ref={targetRef}
          style={{ '--scroll-depth': atmosphere } as CSSProperties}
          className="relative flex-1 px-4 py-8 sm:px-6 lg:px-8 lg:py-10"
        >
          <motion.div
            aria-hidden
            className="scroll-depth-wash pointer-events-none absolute inset-x-0 top-0 h-[52rem]"
            style={{ opacity: atmosphere, y: atmosphericShift }}
          />
          <motion.div
            aria-hidden
            className="ambient-depth-orbit pointer-events-none absolute top-[16rem] right-[-14rem] h-[34rem] w-[34rem]"
            style={{ opacity: atmosphere, y: atmosphericShift }}
          />

          <div className="relative mx-auto max-w-[1540px]">
            <div className="system-canvas">
              <SystemTimeline
                activeStage={activeStage}
                progress={progress}
                stageProgress={stageProgress}
                reducedMotion={reducedMotion}
                onStageSelect={scrollToStage}
              />

              <div className="system-narrative">
                <section
                  ref={stageRefs['system-init']}
                  data-system-stage="system-init"
                  className="system-stage system-stage--init"
                  aria-label="System initialization"
                >
                  <Hero reducedMotion={reducedMotion} />
                </section>

                <section
                  ref={stageRefs.core}
                  data-system-stage="core"
                  className="system-stage system-stage--core"
                  aria-label="Core memory field"
                >
                  <CommandPanel
                    state={state}
                    selectedId={selectedId}
                    activeIds={activeMemoryIds}
                    onSelect={select}
                    onSubmit={runQuery}
                    reducedMotion={reducedMotion}
                    stageProgress={stageProgress.core}
                    active={coreActive}
                    recallAnchorRef={stageRefs.recall}
                    lastDecision={lastDecision}
                  />
                </section>

                <section
                  ref={stageRefs.memory}
                  data-system-stage="memory"
                  className="system-stage system-stage--memory"
                  aria-label="Memory evidence"
                >
                  <MemoryInspector
                    memoryId={selectedId}
                    onClose={() => select(null)}
                    onSelect={select}
                    reducedMotion={reducedMotion}
                    progress={stageProgress.memory}
                    active={activeStage === 'memory'}
                  />
                </section>

                <section
                  ref={stageRefs.reason}
                  data-system-stage="reason"
                  className="system-stage system-stage--reason"
                  aria-label="Reasoned decision"
                >
                  <DecisionCard
                    decision={CURRENT_DECISION}
                    onSelect={select}
                    reducedMotion={reducedMotion}
                    progress={stageProgress.reason}
                    active={activeStage === 'reason'}
                  />
                </section>

                <section
                  ref={stageRefs.action}
                  data-system-stage="action"
                  className="system-stage system-stage--action"
                  aria-label="Action verification"
                >
                  <div className="action-deck">
                    <div className="action-deck__trace">
                      <ActivityTimeline
                        events={activity}
                        reducedMotion={reducedMotion}
                        onSelect={select}
                        progress={stageProgress.action}
                        active={activeStage === 'action'}
                      />
                    </div>
                    <div className="action-deck__verification">
                      <NetworkStatus
                        reducedMotion={reducedMotion}
                        progress={stageProgress.action}
                        active={activeStage === 'action'}
                      />
                      <ProjectRail
                        reducedMotion={reducedMotion}
                        progress={stageProgress.action}
                        active={activeStage === 'action'}
                      />
                    </div>
                  </div>
                </section>

                <footer className="mt-14 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border pt-5 pb-2">
                  <span className="type-label text-muted-foreground/55">MEMORYOS v2.4.1</span>
                  <span className="type-label text-muted-foreground/40">MEMORY LAYER: SIBYL</span>
                  <span className="ml-auto type-label text-muted-foreground/40">BUILT ON BASE · VIRTUALS ACP</span>
                </footer>
              </div>
            </div>
          </div>
        </motion.main>
      </div>
    </div>
  )
}
