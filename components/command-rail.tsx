'use client'

import type { RefObject } from 'react'
import { ArrowUp, Mic } from 'lucide-react'
import { motion, useMotionValue, type MotionValue } from 'motion/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { SegmentRail, TechnicalLabel } from './system-primitives'

interface CommandRailProps {
  value: string
  inputRef: RefObject<HTMLInputElement | null>
  focused: boolean
  onChange: (value: string) => void
  onFocusChange: (focused: boolean) => void
  onSubmit: () => void
  onSuggestion: (value: string) => void
  suggestions: string[]
  recalling: boolean
  activeCount: number
  active?: boolean
  stageProgress?: MotionValue<number>
  anchorRef?: RefObject<HTMLElement | null>
}

export function CommandRail({
  value,
  inputRef,
  focused,
  onChange,
  onFocusChange,
  onSubmit,
  onSuggestion,
  suggestions,
  recalling,
  activeCount,
  active = false,
  stageProgress,
  anchorRef,
}: CommandRailProps) {
  const fallbackProgress = useMotionValue(1)
  const frameProgress = stageProgress ?? fallbackProgress

  return (
    <div ref={anchorRef as RefObject<HTMLDivElement | null>} className={cn('recall-bridge', active && 'recall-bridge--active')}>
      <SegmentRail edge="top" align="start" length="34%" tone="primary" active={active || focused} progress={frameProgress} />
      <SegmentRail edge="bottom" align="end" length="22%" tone="primary" active={active || focused} progress={frameProgress} />

      <div className="px-4 py-4 sm:px-5">
        <div className="mb-2 flex items-center justify-between gap-3">
          <TechnicalLabel tone={focused || active ? 'primary' : 'neutral'}>QUERY MEMORY LAYER</TechnicalLabel>
          {recalling && (
            <motion.span
              initial={{ opacity: 0, y: 3 }}
              animate={{ opacity: 1, y: 0 }}
              className="font-mono text-[9px] tracking-[0.16em] text-primary/75"
            >
              {activeCount} MEMORIES IN CONTEXT
            </motion.span>
          )}
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault()
            onSubmit()
          }}
          className={cn(
            'relative flex min-h-12 items-center gap-2 border bg-black/30 px-2.5 transition-[border-color,background-color,box-shadow] duration-300',
            focused ? 'border-primary/60 bg-primary/[0.04] shadow-[0_0_0_1px_color-mix(in_oklab,var(--primary)_14%,transparent)]' : 'border-border hover:border-primary/30',
          )}
        >
          <Input
            ref={inputRef}
            id="memoryos-command-input"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onFocus={() => onFocusChange(true)}
            onBlur={() => onFocusChange(false)}
            placeholder="Ask MEMORYOS anything..."
            aria-label="Ask MEMORYOS anything"
            className="h-10 min-w-0 flex-1 rounded-none border-0 bg-transparent px-1 text-[13px] text-foreground shadow-none placeholder:text-muted-foreground/55 focus-visible:border-0 focus-visible:ring-0"
          />

          <kbd className="hidden shrink-0 rounded-sm border border-border px-1.5 py-1 font-mono text-[9px] tracking-wider text-muted-foreground/70 sm:block">
            ⌘K
          </kbd>

          <Button
            type="button"
            variant="ghost"
            size="icon-lg"
            aria-label="Voice input"
            className="min-h-11 min-w-11 shrink-0 rounded-sm border border-border text-muted-foreground hover:border-secondary/40 hover:bg-secondary/[0.05] hover:text-secondary active:scale-[0.97]"
          >
            <Mic className="size-4" strokeWidth={1.7} />
          </Button>

          <Button
            type="submit"
            variant="ghost"
            size="icon-lg"
            disabled={!value.trim()}
            aria-label="Send command"
            className={cn(
              'min-h-11 min-w-11 shrink-0 rounded-sm border transition-[background-color,border-color,color,transform] active:scale-[0.97]',
              value.trim()
                ? 'border-primary/55 bg-primary/12 text-primary hover:bg-primary/18'
                : 'border-border text-muted-foreground/45',
            )}
          >
            <ArrowUp className="size-4" strokeWidth={2} />
          </Button>
        </form>

        <div className="mt-3 flex flex-wrap gap-2">
          {suggestions.map((suggestion) => (
            <Button
              key={suggestion}
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onSuggestion(suggestion)}
              className="suggestion-tab group relative min-h-9 rounded-sm border border-border px-3 text-[11px] font-normal text-muted-foreground hover:border-primary/35 hover:bg-primary/[0.03] hover:text-foreground active:scale-[0.98]"
            >
              <span aria-hidden className="suggestion-tab__rule absolute inset-x-2 top-0 h-px origin-left scale-x-0 bg-primary transition-transform duration-300 group-hover:scale-x-100 group-focus-visible:scale-x-100" />
              {suggestion}
            </Button>
          ))}
        </div>
      </div>
    </div>
  )
}

export type { CommandRailProps }
