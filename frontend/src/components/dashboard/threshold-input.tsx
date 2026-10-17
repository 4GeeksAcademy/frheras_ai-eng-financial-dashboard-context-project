import { isValidThreshold } from '@/lib/financial-utils'
import { cn } from '@/lib/utils'

interface ThresholdInputProps {
  value: string
  onChange: (value: string) => void
}

export function ThresholdInput({ value, onChange }: ThresholdInputProps) {
  const valid = isValidThreshold(value)

  return (
    <label className="flex items-center gap-1.5 text-xs">
      <span className="text-muted-foreground">Threshold:</span>
      <input
        type="number"
        value={value}
        step="0.01"
        min="0.01"
        max="1"
        aria-describedby={!valid ? "threshold-error" : undefined}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'h-8 w-20 rounded-md border px-2.5 text-xs text-foreground',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          valid
            ? 'border-input bg-background'
            : 'border-destructive bg-background',
        )}
      />
      {!valid && (
        <span id="threshold-error" className="text-destructive-foreground">
          Threshold is required
        </span>
      )}
    </label>
  )
}