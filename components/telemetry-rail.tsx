'use client'

import { METRICS } from '@/lib/memory-data'
import { cn } from '@/lib/utils'

const BAR_HEIGHTS = [0.34, 0.52, 0.4, 0.68, 0.56, 0.76, 1]

interface TelemetryMetric {
  id: string
  value: number
  label: string
  delta: string
}

interface TelemetryRailProps {
  metrics?: readonly TelemetryMetric[]
  reducedMotion?: boolean
  className?: string
}

function MetricValue({ value, label, delta }: { value: number; label: string; delta: string }) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-5">
      <div className="min-w-0">
        <p className="font-mono text-[clamp(1.8rem,3vw,2.65rem)] leading-none font-light tracking-[-0.04em] text-foreground tabular-nums">
          {value}
        </p>
        <p className="mt-2 type-label text-muted-foreground/80">{label}</p>
        <p className="mt-2 font-mono text-[9px] tracking-[0.16em] text-primary/75">{delta}</p>
      </div>
      <div className="flex h-12 shrink-0 items-end gap-[3px]" aria-hidden>
        {BAR_HEIGHTS.map((height, index) => (
          <span
            key={`${label}-${index}`}
            className={cn('w-[3px] origin-bottom bg-primary/25', index === BAR_HEIGHTS.length - 1 && 'bg-primary/80')}
            style={{ height: `${Math.round(height * 100)}%` }}
          />
        ))}
      </div>
    </div>
  )
}

export function TelemetryRail({ metrics = METRICS, className }: TelemetryRailProps) {
  return (
    <section className={cn('min-w-0', className)} aria-label="System telemetry">
      <div className="telemetry-rail hidden lg:grid lg:grid-cols-[1.18fr_1fr_1fr]">
        {metrics.map((metric, index) => (
          <div key={metric.id} className={cn('min-w-0 px-5 py-5', index !== 0 && 'border-l border-border')}>
            <MetricValue {...metric} />
          </div>
        ))}
      </div>

      <div className="telemetry-rail-mobile grid lg:hidden">
        {metrics.map((metric) => (
          <div key={metric.id} className="flex min-w-0 items-center justify-between gap-4 px-4 py-3.5">
            <div className="flex min-w-0 items-baseline gap-3">
              <span className="font-mono text-2xl leading-none font-light text-foreground tabular-nums">{metric.value}</span>
              <span className="type-label truncate text-muted-foreground/80">{metric.label}</span>
            </div>
            <span className="shrink-0 font-mono text-[9px] tracking-[0.16em] text-primary/75">{metric.delta}</span>
          </div>
        ))}
      </div>
    </section>
  )
}

export type { TelemetryRailProps }
