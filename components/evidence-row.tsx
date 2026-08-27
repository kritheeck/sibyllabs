'use client'

import { ArrowUpRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TYPE_META, getMemory, type MemoryRecord } from '@/lib/memory-data'
import { cn } from '@/lib/utils'

interface EvidenceRowProps {
  memoryId: string
  onSelect: (id: string) => void
  reducedMotion?: boolean
  compact?: boolean
  showArrow?: boolean
  selected?: boolean
  className?: string
}

export function EvidenceRow({
  memoryId,
  onSelect,
  compact = false,
  showArrow = false,
  selected = false,
  className,
}: EvidenceRowProps) {
  const memory = getMemory(memoryId)
  if (!memory) return null

  const meta = TYPE_META[memory.type]

  return (
    <Button
      type="button"
      variant="ghost"
      size={compact ? 'xs' : 'sm'}
      aria-pressed={selected}
      onClick={() => onSelect(memory.id)}
      className={cn(
        'group relative w-full justify-start gap-3 rounded-sm border border-transparent bg-transparent px-3 text-left text-foreground transition-[background-color,border-color,color] duration-200 hover:border-border hover:bg-white/[0.025] hover:text-foreground focus-visible:border-primary/55 focus-visible:bg-primary/[0.04]',
        compact ? 'min-h-11 py-1.5' : 'min-h-11 py-2',
        selected && 'border-primary/35 bg-primary/[0.05]',
        className,
      )}
    >
      <span
        className="relative size-1.5 shrink-0 rounded-full"
        style={{ backgroundColor: meta.hex, boxShadow: `0 0 7px ${meta.hex}` }}
      />
      <span className="min-w-0 flex-1 truncate text-[12px] text-foreground/85 transition-colors group-hover:text-foreground">
        {memory.label}
      </span>
      <span className="shrink-0 font-mono text-[9px] tracking-[0.14em]" style={{ color: meta.hex }}>
        {compact ? meta.short : memory.ref}
      </span>
      {showArrow && (
        <ArrowUpRight
          aria-hidden
          className="size-3 shrink-0 text-muted-foreground/45 transition-transform group-hover:translate-x-px group-hover:-translate-y-px group-hover:text-primary"
          strokeWidth={1.7}
        />
      )}
    </Button>
  )
}

export type { EvidenceRowProps }
