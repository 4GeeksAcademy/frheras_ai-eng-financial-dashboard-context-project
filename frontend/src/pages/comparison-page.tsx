import { useState, useEffect } from "react";
import { useFilters, useFacetsContext } from "@/context/filters-context";
import { useComparison } from "@/hooks/useComparison";
import { DateRangeFilter } from "@/components/dashboard/date-range-filter";
import { BusinessPanel } from "@/components/comparison/business-panel";
import { ComparisonChart } from "@/components/comparison/comparison-chart";
import type { Category } from "@/lib/financial-types";

export function ComparisonPage() {
  const { startDate, endDate, applyFilters } = useFilters();
  const facets = useFacetsContext();

  // ── Draft dates (local state, M-6: initialized from applied on mount) ──
  const [startDraft, setStartDraft] = useState(startDate);
  const [endDraft, setEndDraft] = useState(endDate);

  // M-6: synchronize drafts when applied filter changes (e.g. navigation from dashboard)
  useEffect(() => {
    setStartDraft(startDate);
    setEndDraft(endDate);
  }, [startDate, endDate]);

  // ── Allowed categories from facets (R2-a) ──
  const allowedCategories: Category[] | undefined = facets.data?.categories;

  // ── Comparison data (H1, I1: two independent fetches) ──
  const { b2b, b2c } = useComparison(startDate, endDate, allowedCategories);

  // ── Derive isApplying for the Apply button ──
  const isApplying = b2b.isLoading || b2c.isLoading;

  // ── Determine if range is valid ──
  const rangeInvalid =
    startDraft.length > 0 && endDraft.length > 0 && startDraft > endDraft;

  // ── D-2: empty-range check for apply ──
  const minDate = facets.data?.min_date ?? "";
  const maxDate = facets.data?.max_date ?? "";

  function handleApply() {
    let effectiveStart = startDraft;
    let effectiveEnd = endDraft;

    // D-2: if draft matches full available range, pass empty strings
    if (
      facets.data &&
      effectiveStart === minDate &&
      effectiveEnd === maxDate
    ) {
      effectiveStart = "";
      effectiveEnd = "";
    }

    applyFilters({
      startDate: effectiveStart,
      endDate: effectiveEnd,
      // comparison only sends date changes (threshold/granularity kept from context)
    });
  }

  // ── canApply: range invalid or isApplying (no extraInvalid for comparison, D-3) ──
  const canApply = !rangeInvalid && !isApplying;

  // ── Collect failed groups for chart (P4-a) ──
  const failedGroups: ("B2B" | "B2C")[] = [];
  if (b2b.error) failedGroups.push("B2B");
  if (b2c.error) failedGroups.push("B2C");

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-bold tracking-tight">
        Revenue comparison — B2B vs B2C
      </h1>

      <DateRangeFilter
        startDate={startDraft}
        endDate={endDraft}
        availableMinDate={facets.data?.min_date}
        availableMaxDate={facets.data?.max_date}
        onStartDateChange={setStartDraft}
        onEndDateChange={setEndDraft}
        onApply={handleApply}
        canApply={canApply}
        isApplying={isApplying}
        isLoadingFacets={facets.isLoading}
        facetsError={facets.error}
        onRetryFacets={facets.retry}
      />

      <div className="flex flex-col gap-6 sm:flex-row">
        <BusinessPanel
          businessType="B2B"
          categories={b2b.data}
          groupTotal={b2b.total}
          isLoading={b2b.isLoading}
          error={b2b.error}
        />
        <BusinessPanel
          businessType="B2C"
          categories={b2c.data}
          groupTotal={b2c.total}
          isLoading={b2c.isLoading}
          error={b2c.error}
        />
      </div>

      <ComparisonChart
        b2bTotal={b2b.total}
        b2cTotal={b2c.total}
        isLoading={isApplying}
        failedGroups={failedGroups}
      />
    </div>
  );
}