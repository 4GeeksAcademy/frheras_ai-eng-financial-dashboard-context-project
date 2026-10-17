import { formatCurrency } from "@/lib/financial-utils"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"

interface ComparisonChartProps {
  b2bTotal: number
  b2cTotal: number
  isLoading: boolean
  failedGroups: ("B2B" | "B2C")[]
}

interface TooltipPayload {
  name: string
  value: number
  color: string
}

interface CustomTooltipProps {
  active?: boolean
  payload?: TooltipPayload[]
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3 shadow-lg text-sm">
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center gap-2 py-0.5">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-medium text-foreground ml-auto pl-4">
            {formatCurrency(entry.value, 2)}
          </span>
        </div>
      ))}
    </div>
  )
}

export function ComparisonChart({ b2bTotal, b2cTotal, isLoading, failedGroups }: ComparisonChartProps) {
  // Loading skeleton (P4-a)
  if (isLoading) {
    return (
      <Card className="border-border/60">
        <CardContent className="pt-6">
          <Skeleton className="h-[280px] w-full rounded-lg" />
        </CardContent>
      </Card>
    )
  }

  // Error: don't render chart (P4-a)
  if (failedGroups.length > 0) {
    const label =
      failedGroups.length === 2
        ? "B2B and B2C data"
        : `${failedGroups[0]} data`
    return (
      <Card className="border-border/60">
        <CardContent className="pt-6">
          <div className="flex h-[280px] items-center justify-center rounded-lg border border-dashed border-border/60">
            <p className="text-sm text-muted-foreground">
              Comparison unavailable: failed to load {label}
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Empty: both totals are 0
  const noData = b2bTotal === 0 && b2cTotal === 0

  const chartData = [
    { name: "B2B", value: b2bTotal },
    { name: "B2C", value: b2cTotal },
  ]

  return (
    <Card className="border-border/60">
      <CardContent className="pt-6">
        {noData ? (
          <div className="flex h-[280px] items-center justify-center rounded-lg border border-dashed border-border/60">
            <p className="text-sm text-muted-foreground">No data for the selected period</p>
          </div>
        ) : (
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 8, right: 16, left: 16, bottom: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" strokeOpacity={0.6} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 13, fill: 'var(--color-muted-foreground)' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: 'var(--color-muted-foreground)' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) => formatCurrency(v)}
                />
                <Tooltip content={<CustomTooltip />} cursor={false} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={80}>
                  {chartData.map((entry, index) => (
                    <Cell
                      key={entry.name}
                      fill={index === 0 ? "var(--chart-outcome)" : "var(--chart-income)"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}