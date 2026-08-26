'use client'

import { motion } from 'motion/react'
import { MEMORY_NODES, TYPE_META } from '@/lib/memory-data'
import { cn } from '@/lib/utils'

interface MemoryGraph2DProps {
  selectedId: string | null
  activeIds: string[]
  onSelect: (id: string) => void
  reducedMotion: boolean
}

/**
 * Performant list representation used on small screens in place of the WebGL
 * constellation. Same data, same selection contract.
 */
export function MemoryGraph2D({
  selectedId,
  activeIds,
  onSelect,
  reducedMotion,
}: MemoryGraph2DProps) {
  return (
    <ul className="scrollbar-thin flex max-h-[420px] flex-col gap-1.5 overflow-y-auto p-3">
      {MEMORY_NODES.map((node, i) => {
        const meta = TYPE_META[node.type]
        const isActive = activeIds.includes(node.id)
        const isSelected = selectedId === node.id
        return (
          <motion.li
            key={node.id}
            initial={reducedMotion ? false : { opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.03, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            <button
              type="button"
              onClick={() => onSelect(node.id)}
              aria-pressed={isSelected}
              className={cn(
                'flex w-full items-center gap-3 rounded-md border px-3 py-2.5 text-left transition-colors',
                isSelected
                  ? 'border-primary/40 bg-primary/8'
                  : 'border-border/70 hover:border-primary/25 hover:bg-white/[0.03]',
              )}
            >
              <span className="relative grid size-2.5 shrink-0 place-items-center">
                <motion.span
                  className="absolute size-2.5 rounded-full"
                  style={{ background: meta.hex, opacity: 0.25 }}
                  animate={
                    reducedMotion || !isActive
                      ? undefined
                      : { scale: [1, 2.2, 1], opacity: [0.35, 0, 0.35] }
                  }
                  transition={{ duration: 1.8, repeat: Number.POSITIVE_INFINITY }}
                />
                <span
                  className="size-1.5 rounded-full"
                  style={{ background: meta.hex, boxShadow: `0 0 8px ${meta.hex}` }}
                />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12px] text-foreground/90">{node.label}</span>
                <span className="font-mono text-[9px] tracking-[0.16em] text-muted-foreground/70">
                  {node.ref} · {node.relatedIds.length} LINKS
                </span>
              </span>
              <span
                className="shrink-0 font-mono text-[9px] tracking-[0.14em]"
                style={{ color: meta.hex }}
              >
                {meta.short}
              </span>
            </button>
          </motion.li>
        )
      })}
    </ul>
  )
}
