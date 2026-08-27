'use client'

import { motion, useMotionValue, useTransform, type MotionValue } from 'motion/react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { FrameCorner, SegmentRail, TechnicalLabel, type FrameTone } from './system-primitives'
import type { SystemStage } from '@/hooks/use-system-timeline'

type StageFrame = 'core' | 'evidence' | 'recall' | 'reason' | 'activity' | 'telemetry' | 'ledger'

interface StageShellProps {
  stage: SystemStage
  frame: StageFrame
  tone?: FrameTone
  label?: string
  index?: string
  active?: boolean
  progress?: MotionValue<number>
  reducedMotion: boolean
  children: ReactNode
  className?: string
}

const FRAME_CORNERS: Record<StageFrame, Array<'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'>> = {
  core: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
  evidence: ['top-left', 'bottom-left', 'bottom-right'],
  recall: ['top-left', 'top-right', 'bottom-right'],
  reason: ['top-left', 'top-right', 'bottom-left'],
  activity: ['top-left', 'bottom-right'],
  telemetry: ['top-left', 'bottom-right'],
  ledger: ['top-left', 'bottom-right'],
}

export function StageShell({
  stage,
  frame,
  tone = 'neutral',
  label,
  index,
  active = false,
  progress,
  reducedMotion,
  children,
  className,
}: StageShellProps) {
  const frameClass = `stage-shell--${frame}`
  const fallbackProgress = useMotionValue(1)
  const progressValue = progress ?? fallbackProgress
  const topProgress = useTransform(progressValue, [0, 0.28, 0.68, 1], [0.1, 0.62, 1, 1])
  const sideProgress = useTransform(progressValue, [0, 0.38, 0.78, 1], [0.1, 0.42, 0.92, 1])
  const contentY = useTransform(progressValue, [0, 0.35, 1], [8, 2, 0])

  return (
    <motion.section
      data-stage={stage}
      data-frame={frame}
      data-active={active || undefined}
      initial={reducedMotion ? false : { opacity: 0.54, y: 12 }}
      whileInView={reducedMotion ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: false, amount: 0.12, margin: '-10% 0px -12%' }}
      transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
      className={cn('stage-shell relative min-w-0', frameClass, className)}
    >
      {FRAME_CORNERS[frame].map((corner) => (
        <FrameCorner key={corner} corner={corner} tone={active ? tone : 'neutral'} active={active} progress={sideProgress} reducedMotion={reducedMotion} />
      ))}
      <SegmentRail edge="top" length={frame === 'core' ? '34%' : frame === 'reason' ? '24%' : '20%'} tone={active ? tone : 'neutral'} active={active} progress={topProgress} reducedMotion={reducedMotion} />
      <SegmentRail edge="bottom" align="end" length={frame === 'core' ? '38%' : '28%'} tone={active ? tone : 'neutral'} active={active} progress={topProgress} reducedMotion={reducedMotion} />

      {(label || index) && (
        <div className="stage-shell__label absolute -top-2 left-4 z-30 flex items-center gap-2 bg-background px-2">
          {index && <TechnicalLabel tone={active ? tone : 'neutral'}>{index}</TechnicalLabel>}
          {label && <span className="type-label text-muted-foreground/75">{label}</span>}
        </div>
      )}

      <motion.div className="relative z-10" style={{ y: contentY }}>
        {children}
      </motion.div>
    </motion.section>
  )
}

export type { StageFrame, StageShellProps }
