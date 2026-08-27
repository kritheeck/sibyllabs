'use client'

import { useCallback, useMemo, useRef, useState, type RefObject } from 'react'
import {
  useMotionValueEvent,
  useScroll,
  useTransform,
  type MotionValue,
} from 'motion/react'
import type { AgentState } from '@/lib/memory-data'

export const SYSTEM_STAGES = [
  { id: 'system-init', index: '01', label: 'SYSTEM INIT' },
  { id: 'core', index: '02', label: 'CORE' },
  { id: 'memory', index: '03', label: 'MEMORY' },
  { id: 'recall', index: '04', label: 'RECALL' },
  { id: 'reason', index: '05', label: 'REASON' },
  { id: 'action', index: '06', label: 'ACTION' },
] as const

export type SystemStage = (typeof SYSTEM_STAGES)[number]['id']

export const STAGE_RANGES: Record<SystemStage, [number, number]> = {
  'system-init': [0, 0.16],
  core: [0.11, 0.42],
  memory: [0.24, 0.52],
  recall: [0.34, 0.6],
  reason: [0.5, 0.78],
  action: [0.68, 1],
}

const ACTIVE_STAGE_THRESHOLDS: Array<{ at: number; stage: SystemStage }> = [
  { at: 0, stage: 'system-init' },
  { at: 0.14, stage: 'core' },
  { at: 0.29, stage: 'memory' },
  { at: 0.43, stage: 'recall' },
  { at: 0.58, stage: 'reason' },
  { at: 0.75, stage: 'action' },
]

interface SystemTimelineController {
  targetRef: RefObject<HTMLElement | null>
  progress: MotionValue<number>
  atmosphere: MotionValue<number>
  activeStage: SystemStage
  stageProgress: Record<SystemStage, MotionValue<number>>
  stageRefs: Record<SystemStage, RefObject<HTMLElement | null>>
  scrollToStage: (stage: SystemStage) => void
}

interface UseSystemTimelineOptions {
  state?: AgentState
  selectedId?: string | null
  reducedMotion?: boolean
}

function stageForProgress(value: number): SystemStage {
  let current: SystemStage = 'system-init'
  for (const threshold of ACTIVE_STAGE_THRESHOLDS) {
    if (value >= threshold.at) current = threshold.stage
  }
  return current
}

export function useSystemTimeline({
  state = 'IDLE',
  selectedId = null,
  reducedMotion = false,
}: UseSystemTimelineOptions = {}): SystemTimelineController {
  const targetRef = useRef<HTMLElement>(null)
  const systemInitRef = useRef<HTMLElement>(null)
  const coreRef = useRef<HTMLElement>(null)
  const memoryRef = useRef<HTMLElement>(null)
  const recallRef = useRef<HTMLElement>(null)
  const reasonRef = useRef<HTMLElement>(null)
  const actionRef = useRef<HTMLElement>(null)

  const stageRefs = useMemo(
    () => ({
      'system-init': systemInitRef,
      core: coreRef,
      memory: memoryRef,
      recall: recallRef,
      reason: reasonRef,
      action: actionRef,
    }),
    [],
  )

  const { scrollYProgress } = useScroll({
    target: targetRef,
    offset: ['start start', 'end end'],
  })

  const stageProgress = {
    'system-init': useTransform(scrollYProgress, STAGE_RANGES['system-init'], [0, 1]),
    core: useTransform(scrollYProgress, STAGE_RANGES.core, [0, 1]),
    memory: useTransform(scrollYProgress, STAGE_RANGES.memory, [0, 1]),
    recall: useTransform(scrollYProgress, STAGE_RANGES.recall, [0, 1]),
    reason: useTransform(scrollYProgress, STAGE_RANGES.reason, [0, 1]),
    action: useTransform(scrollYProgress, STAGE_RANGES.action, [0, 1]),
  }

  const atmosphere = useTransform(scrollYProgress, [0, 0.25, 0.58, 1], [0.02, 0.08, 0.055, 0.02])
  const [scrollStage, setScrollStage] = useState<SystemStage>('system-init')

  useMotionValueEvent(scrollYProgress, 'change', (value) => {
    const nextStage = stageForProgress(value)
    setScrollStage((current) => (current === nextStage ? current : nextStage))
  })

  const activeStage = selectedId
    ? 'memory'
    : state === 'RECALLING' || state === 'REASONING'
      ? 'recall'
      : scrollStage

  const scrollToStage = useCallback(
    (stage: SystemStage) => {
      const node = stageRefs[stage].current
      if (!node) return
      node.scrollIntoView({
        behavior: reducedMotion ? 'auto' : 'smooth',
        block: 'start',
      })
    },
    [reducedMotion, stageRefs],
  )

  return {
    targetRef,
    progress: scrollYProgress,
    atmosphere,
    activeStage,
    stageProgress,
    stageRefs,
    scrollToStage,
  }
}

export type { SystemTimelineController, UseSystemTimelineOptions }
