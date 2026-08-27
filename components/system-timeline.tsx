'use client'

import { motion, type MotionValue } from 'motion/react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { SYSTEM_STAGES, type SystemStage } from '@/hooks/use-system-timeline'
import { SystemMarker, TechnicalLabel } from './system-primitives'

interface SystemTimelineProps {
  activeStage: SystemStage
  progress: MotionValue<number>
  stageProgress: Record<SystemStage, MotionValue<number>>
  reducedMotion: boolean
  onStageSelect: (stage: SystemStage) => void
}

export function SystemTimeline({
  activeStage,
  progress,
  stageProgress,
  reducedMotion,
  onStageSelect,
}: SystemTimelineProps) {
  const railScale = progress

  return (
    <>
      <aside className="system-timeline hidden xl:block" aria-label="System stages">
        <motion.span
          aria-hidden
          className="system-timeline__rail absolute top-3 bottom-3 left-[21px] w-px origin-top bg-(--timeline-rail)"
          style={{ scaleY: reducedMotion ? 1 : railScale }}
        />
        <div className="system-timeline__stages">
          {SYSTEM_STAGES.map((stage, index) => {
            const active = activeStage === stage.id
            const complete = SYSTEM_STAGES.findIndex((item) => item.id === activeStage) > index
            const local = stageProgress[stage.id]
            return (
              <Button
                key={stage.id}
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onStageSelect(stage.id)}
                aria-current={active ? 'step' : undefined}
                className={cn('system-timeline__stage group relative min-h-14 w-full justify-start gap-3 rounded-none px-0 pl-0 text-left hover:bg-transparent', active && 'system-timeline__stage--active')}
              >
                <SystemMarker active={active} complete={complete} tone={active ? 'primary' : 'neutral'} className="relative z-10" />
                <span className="min-w-0 pt-0.5">
                  <span className={cn('block font-mono text-[9px] tracking-[0.18em] transition-colors duration-300', active ? 'text-primary' : complete ? 'text-muted-foreground/75' : 'text-muted-foreground/48')}>
                    {stage.index}
                  </span>
                  <span className={cn('mt-1 block whitespace-nowrap font-mono text-[9px] tracking-[0.14em] transition-colors duration-300', active ? 'text-foreground' : 'text-muted-foreground/58')}>
                    {stage.label}
                  </span>
                </span>
                <motion.span
                  aria-hidden
                  className="system-timeline__extension absolute left-7 top-1/2 h-px origin-left bg-primary"
                  style={{ scaleX: reducedMotion ? (active ? 1 : 0) : local, opacity: active ? 0.72 : 0 }}
                />
              </Button>
            )
          })}
        </div>
        <TechnicalLabel className="system-timeline__caption absolute bottom-0 left-0 -rotate-90 origin-left text-muted-foreground/40">OPERATING SEQUENCE</TechnicalLabel>
      </aside>

      <div className="system-timeline-mobile sticky top-14 z-20 xl:hidden">
        <div className="flex h-8 items-center gap-3 border-y border-border bg-background/92 px-4 backdrop-blur-md sm:px-6">
          <TechnicalLabel tone="primary">{SYSTEM_STAGES.find((stage) => stage.id === activeStage)?.index}</TechnicalLabel>
          <span className="font-mono text-[10px] tracking-[0.18em] text-foreground">{SYSTEM_STAGES.find((stage) => stage.id === activeStage)?.label}</span>
          <span className="ml-auto flex items-center gap-1" aria-hidden>
            {SYSTEM_STAGES.map((stage) => (
              <span key={stage.id} className={cn('h-px w-4 bg-border transition-colors duration-300', activeStage === stage.id && 'bg-primary', SYSTEM_STAGES.findIndex((item) => item.id === activeStage) > SYSTEM_STAGES.findIndex((item) => item.id === stage.id) && 'bg-frame')} />
            ))}
          </span>
        </div>
      </div>
    </>
  )
}

export type { SystemTimelineProps }
