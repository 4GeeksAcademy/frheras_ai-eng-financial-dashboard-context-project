import { useEffect, useState, useMemo } from "react";
import { DateRangeFilter } from "@/components/dashboard/date-range-filter";
import { AlertsTable } from "@/components/dashboard/alerts-table";
import { KPIRow } from "@/components/dashboard/kpi-row";
import { IncomeOutcomeChart } from "@/components/dashboard/income-outcome-chart";
import { ProfitPercentChart } from "@/components/dashboard/profit-percent-chart";
import { type Granularity } from "@/lib/financial-types";
import {
  computeKPIs,
  computeMonthlyData,
  clampThreshold,
  isValidThreshold,
} from "@/lib/financial-utils";
import { useFacetsContext, useFilters } from "@/context/filters-context";
import { useMetrics } from "@/hooks/useMetrics";
import { useAlerts } from "@/hooks/useAlerts";

export function DashboardPage() {
  // ── Shared contexts ──
  const facetsCtx = useFacetsContext();
  const filtersCtx = useFilters();

  // ── Draft filter state (local to this page, initialized from applied on mount — M-6) ──
  const [draftStartDate, setDraftStartDate] = useState(filtersCtx.startDate);
  const [draftEndDate, setDraftEndDate] = useState(filtersCtx.endDate);
  const [draftThreshold, setDraftThreshold] = useState(filtersCtx.threshold.toFixed(2));
  const [draftGranularity, setDraftGranularity] = useState<Granularity>(filtersCtx.granularity);

  // ── hasAppliedOnce: tracks whether data was ever loaded successfully (D-1) ──
  const [hasAppliedOnce, setHasAppliedOnce] = useState(false);

  // ── Prefill drafts when facets loads (Q6-B) — only if never explicitly set ──
  useEffect(() => {
    if (facetsCtx.data) {
      if (draftStartDate === "" && draftEndDate === "") {
        setDraftStartDate(facetsCtx.data.min_date);
        setDraftEndDate(facetsCtx.data.max_date);
      }
    }
  }, [facetsCtx.data]);

  // ── Metrics (KPIs + charts) ──
  const { movements, isDataLoading, dataError } =
    useMetrics(filtersCtx.startDate, filtersCtx.endDate);

  // Compute KPIs and monthly data from movements
  const kpiMetrics = useMemo(
    () => (movements.length > 0 ? computeKPIs(movements) : null),
    [movements],
  );
  const monthlyData = useMemo(
    () => (movements.length > 0 ? computeMonthlyData(movements) : []),
    [movements],
  );

  // ── Track first successful data load (D-1) ──
  useEffect(() => {
    if (movements.length > 0 && !hasAppliedOnce) setHasAppliedOnce(true);
  }, [movements]);

  // ── Alerts ──
  const { alerts, isAlertsLoading, alertsError } =
    useAlerts(filtersCtx.startDate, filtersCtx.endDate, filtersCtx.granularity, filtersCtx.threshold);

  // ── Apply handler: copies drafts → applied via context (B2, J2) ──
  // D-2: if draft equals min_date–max_date (full range), pass empty strings (omitted) ──
  function onApply() {
    const facets = facetsCtx.data;
    let sd = draftStartDate;
    let ed = draftEndDate;
    if (facets && draftStartDate === facets.min_date && draftEndDate === facets.max_date) {
      sd = "";
      ed = "";
    }
    filtersCtx.applyFilters({
      startDate: sd,
      endDate: ed,
      threshold: clampThreshold(draftThreshold),
      granularity: draftGranularity,
    });
  }

  // ── Determine if Apply should be enabled ──
  const isApplying = isDataLoading || isAlertsLoading;
  const extraInvalid = !isValidThreshold(draftThreshold);
  const canApply = !isApplying;

  // ── Error banner (D-1): only shown on first load, before any successful fetch ──
  const showDataError = !hasAppliedOnce && dataError !== null;

  // ── Q20-A: show transient error toast after subsequent failed applies ──
  const [showErrorToast, setShowErrorToast] = useState(false);
  useEffect(() => {
    if (hasAppliedOnce && dataError) {
      setShowErrorToast(true);
      const timer = setTimeout(() => setShowErrorToast(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [dataError, hasAppliedOnce]);

  // ── M-5: check if applied range is outside available range ──
  const showOutOfRangeNote =
    facetsCtx.data &&
    filtersCtx.startDate !== "" &&
    filtersCtx.endDate !== "" &&
    (filtersCtx.startDate < facetsCtx.data.min_date || filtersCtx.endDate > facetsCtx.data.max_date);

  return (
    <>
      {/* Startup connectivity banner (Q16-B): only when facets never loaded */}
      {facetsCtx.error && !facetsCtx.data ? (
        <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive-foreground">
          Failed to load financial data. Check the backend API.
        </div>
      ) : null}

      {/* Date range filter row (N1-A): below header, before KPIs */}
      <DateRangeFilter
        startDate={draftStartDate}
        endDate={draftEndDate}
        availableMinDate={facetsCtx.data?.min_date}
        availableMaxDate={facetsCtx.data?.max_date}
        onStartDateChange={setDraftStartDate}
        onEndDateChange={setDraftEndDate}
        onApply={onApply}
        canApply={canApply}
        extraInvalid={extraInvalid}
        isApplying={isApplying}
        isLoadingFacets={facetsCtx.isLoading}
        facetsError={facetsCtx.error}
        onRetryFacets={facetsCtx.retry}
      />

      {/* M-5: out of range note */}
      {showOutOfRangeNote && facetsCtx.data ? (
        <p className="text-xs text-muted-foreground">
          No financial data in the selected range. Available: {facetsCtx.data.min_date} – {facetsCtx.data.max_date}
        </p>
      ) : null}

      {/* Data error banner (D-1): first-load fetch failure */}
      {showDataError ? (
        <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive-foreground">
          {dataError}
        </div>
      ) : null}

      {/* Q20-A: transient error toast */}
      {showErrorToast && dataError ? (
        <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive-foreground">
          {dataError}
        </div>
      ) : null}

      {/* KPIs */}
      <section aria-label="Key performance indicators">
        <h2 className="sr-only">Key performance indicators</h2>
        <KPIRow metrics={kpiMetrics} loading={isDataLoading} />
      </section>

      {/* Charts */}
      <section
        aria-label="Financial charts"
        className="grid grid-cols-1 gap-4 xl:grid-cols-2"
      >
        <h2 className="sr-only">Financial charts</h2>
        <IncomeOutcomeChart data={monthlyData} loading={isDataLoading} />
        <ProfitPercentChart data={monthlyData} loading={isDataLoading} />
      </section>

      {/* Alerts table (R1-B): below chart grid */}
      <AlertsTable
        alerts={alerts}
        granularity={filtersCtx.granularity}
        threshold={filtersCtx.threshold}
        isLoading={isAlertsLoading}
        error={alertsError}
        draftThreshold={draftThreshold}
        draftGranularity={draftGranularity}
        onThresholdChange={setDraftThreshold}
        onGranularityChange={setDraftGranularity}
      />
    </>
  );
}