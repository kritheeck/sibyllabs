'use client'

import { useRef } from 'react'
import { useScroll, useTransform, type MotionValue } from 'motion/react'

interface ScrollNarrative {
  targetRef: React.RefObject<HTMLElement | null>
  progress: MotionValue<number>
  depth: MotionValue<number>
}

export function useScrollNarrative(): ScrollNarrative {
  const targetRef = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({
    target: targetRef,
    offset: ['start start', 'end end'],
  })
  const depth = useTransform(scrollYProgress, [0, 0.25, 0.62, 1], [0.02, 0.08, 0.045, 0.015])

  return { targetRef, progress: scrollYProgress, depth }
}

export type { ScrollNarrative }
