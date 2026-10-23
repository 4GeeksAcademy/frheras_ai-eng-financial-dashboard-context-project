import { type Granularity } from '@/lib/financial-types'
import { cn } from '@/lib/utils'

interface GranularitySelectProps {
  value: Granularity
  onChange: (value: Granularity) => void
}

const options: { value: Granularity; label: string }[] = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
]

export function GranularitySelect({ value, onChange }: GranularitySelectProps) {
  return (
    <label className="flex items-center gap-1.5 text-xs">
      <span className="text-muted-foreground">Granularity:</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as Granularity)}
        className={cn(
          'h-8 rounded-md border border-input bg-background px-2.5 text-xs text-foreground',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        )}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  )
}