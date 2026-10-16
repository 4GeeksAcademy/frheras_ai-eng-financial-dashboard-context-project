import * as React from 'react'
import { cn } from '@/lib/utils'
import { Calendar } from 'lucide-react'

interface DateRangeFilterProps {
  startDate: string
  endDate: string
  availableMinDate?: string
  availableMaxDate?: string
  onStartDateChange: (date: string) => void
  onEndDateChange: (date: string) => void
  onApply: () => void
  canApply: boolean
  extraInvalid?: boolean
  isApplying: boolean
  isLoadingFacets: boolean
  facetsError: string | null
  onRetryFacets: () => void
}

export function DateRangeFilter(props: DateRangeFilterProps) {
  const {
    startDate,
    endDate,
    availableMinDate,
    availableMaxDate,
    onStartDateChange,
    onEndDateChange,
    onApply,
    canApply,
    extraInvalid = false,
    isApplying,
    isLoadingFacets,
    facetsError,
    onRetryFacets,
  } = props

  // Determine if the date range is invalid (start > end)
  const isRangeInvalid =
    startDate !== '' && endDate !== '' && startDate > endDate

  // Determine if Apply should be disabled
  const isApplyDisabled =
    isRangeInvalid || extraInvalid || !canApply || isApplying

  // Build the available range display text
  function renderAvailableRange() {
    if (isLoadingFacets) {
      return <span className="text-xs text-muted-foreground">Available range: —</span>
    }

    if (facetsError) {
      return (
        <span className="text-xs text-muted-foreground">
          Could not load the available range.{' '}
          <button
            type="button"
            onClick={onRetryFacets}
            className="cursor-pointer text-primary underline hover:no-underline"
          >
            Retry
          </button>
        </span>
      )
    }

    if (availableMinDate && availableMaxDate) {
      return (
        <span className="text-xs text-muted-foreground">
          Available range: {availableMinDate} – {availableMaxDate}
        </span>
      )
    }

    return null
  }

  return (
    <div
      data-slot="date-range-filter"
      className="flex flex-col sm:flex-row sm:items-center gap-3"
    >
      {/* Left side: date inputs + Apply */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
          <Calendar size={14} />
        </span>
        <input
          type="date"
          value={startDate}
          min={availableMinDate ?? ''}
          max={availableMaxDate ?? ''}
          onChange={(e) => onStartDateChange(e.target.value)}
          className={cn(
            'h-8 rounded-md border border-input bg-background px-2.5 text-xs text-foreground',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          )}
          placeholder="YYYY-MM-DD"
        />
        <span className="text-xs text-muted-foreground">—</span>
        <input
          type="date"
          value={endDate}
          min={availableMinDate ?? ''}
          max={availableMaxDate ?? ''}
          onChange={(e) => onEndDateChange(e.target.value)}
          className={cn(
            'h-8 rounded-md border border-input bg-background px-2.5 text-xs text-foreground',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          )}
          placeholder="YYYY-MM-DD"
        />
        <button
          type="button"
          disabled={isApplyDisabled}
          onClick={onApply}
          className={cn(
            'inline-flex h-8 items-center justify-center rounded-md px-3 text-xs font-medium',
            'bg-primary text-primary-foreground',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          )}
        >
          {isApplying ? 'Applying…' : 'Apply'}
        </button>
      </div>

      {/* Right side: available range info */}
      <div className="flex items-center gap-2 ml-auto">
        {renderAvailableRange()}
      </div>

      {/* Error message for invalid range */}
      {isRangeInvalid && (
        <p className="text-xs text-destructive-foreground">
          Start date cannot be after end date
        </p>
      )}
    </div>
  )
}