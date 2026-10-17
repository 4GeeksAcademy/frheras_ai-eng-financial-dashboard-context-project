import { type ComputedAlert, type Granularity } from '@/lib/financial-types'
import { formatCurrency, formatPeriod } from '@/lib/financial-utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ThresholdInput } from '@/components/dashboard/threshold-input'
import { GranularitySelect } from '@/components/dashboard/granularity-select'
import { cn } from '@/lib/utils'

interface AlertsTableProps {
  alerts: ComputedAlert[]
  granularity: Granularity
  threshold: number
  isLoading: boolean
  error?: string | null
  draftThreshold: string
  draftGranularity: Granularity
  onThresholdChange: (value: string) => void
  onGranularityChange: (value: Granularity) => void
}

function renderArrow(ratio: number): string {
  if (ratio > 0) return '↑'
  if (ratio < 0) return '↓'
  return ''
}

export function AlertsTable({
  alerts,
  granularity,
  threshold,
  isLoading,
  error,
  draftThreshold,
  draftGranularity,
  onThresholdChange,
  onGranularityChange,
}: AlertsTableProps) {
  // ── Shared controls rendered in CardHeader ──
  function renderControls() {
    return (
      <span data-slot="card-action" className="flex items-center gap-3">
        <ThresholdInput value={draftThreshold} onChange={onThresholdChange} />
        <GranularitySelect value={draftGranularity} onChange={onGranularityChange} />
      </span>
    )
  }

  // Error state
  if (error) {
    return (
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle>Spending alerts</CardTitle>
          <div data-slot="card-action">{renderControls()}</div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive-foreground">
            Failed to load alerts. Please try again later.
          </p>
        </CardContent>
      </Card>
    )
  }

  // Loading state — show skeleton rows
  if (isLoading) {
    return (
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle>Spending alerts</CardTitle>
          <div data-slot="card-action">{renderControls()}</div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="pb-2 font-medium">Period</th>
                  <th className="pb-2 font-medium">Recorded outcome</th>
                  <th className="pb-2 font-medium">3-period moving average</th>
                  <th className="pb-2 font-medium">Increase</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/60">
                    <td className="py-2"><Skeleton className="h-4 w-28" /></td>
                    <td className="py-2"><Skeleton className="h-4 w-24" /></td>
                    <td className="py-2"><Skeleton className="h-4 w-24" /></td>
                    <td className="py-2"><Skeleton className="h-4 w-16" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Empty state — no anomalies detected
  if (alerts.length === 0) {
    return (
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle>Spending alerts</CardTitle>
          <div data-slot="card-action">{renderControls()}</div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No anomalies detected for threshold {threshold.toFixed(2)}
          </p>
        </CardContent>
      </Card>
    )
  }

  // Normal state — render table rows
  return (
    <Card className="border-border/60">
      <CardHeader>
        <CardTitle>Spending alerts</CardTitle>
        <div data-slot="card-action">{renderControls()}</div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="pb-2 font-medium">Period</th>
                <th className="pb-2 font-medium">Recorded outcome</th>
                <th className="pb-2 font-medium">3-period moving average</th>
                <th className="pb-2 font-medium">Increase</th>
              </tr>
            </thead>
            <tbody>
              {alerts.map((alert) => {
                const formattedPeriod = formatPeriod(alert.period, granularity)
                const formattedOutcome = formatCurrency(alert.outcome_total, 2)
                const formattedBaseline = formatCurrency(alert.baseline_average, 2)
                const absPercent = Math.abs(alert.increase_ratio * 100)
                const arrow = renderArrow(alert.increase_ratio)
                const increaseText = `${absPercent.toFixed(2)}% ${arrow}`

                return (
                  <tr
                    key={alert.period}
                    className="border-b border-border/60 last:border-b-0"
                  >
                    <td className="py-2 text-foreground">{formattedPeriod}</td>
                    <td className="py-2 text-foreground">{formattedOutcome}</td>
                    <td className="py-2 text-foreground">
                      {formattedBaseline}
                      {alert.baseline_periods < 3 && (
                        <span className="block text-muted-foreground">
                          average of {alert.baseline_periods}{' '}
                          {alert.baseline_periods === 1 ? 'period' : 'periods'}
                        </span>
                      )}
                    </td>
                    <td
                      className={cn(
                        'py-2 font-medium',
                        alert.increase_ratio > 0
                          ? 'text-destructive-foreground'
                          : 'text-foreground',
                      )}
                    >
                      {increaseText}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}