import { useEffect, useState } from "react";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
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
import { useFacets } from "@/hooks/useFacets";
import { useMetrics } from "@/hooks/useMetrics";
import { useAlerts } from "@/hooks/useAlerts";

function computePeriodLabel(startDate: string, endDate: string): string {
  if (startDate && endDate) return `${startDate} – ${endDate}`;
  if (startDate && !endDate) return `From ${startDate}`;
  if (!startDate && endDate) return `Until ${endDate}`;
  return "All time";
}

function App() {
  // ── Facets (available range) ──
  const { data: facets, isLoading: isFacetsLoading, error: facetsError, retry: retryFacets } = useFacets();

  // ── Draft filter state (edited by user in the UI) ──
  const [draftStartDate, setDraftStartDate] = useState("");
  const [draftEndDate, setDraftEndDate] = useState("");
  const [draftThreshold, setDraftThreshold] = useState("0.30");
  const [draftGranularity, setDraftGranularity] = useState<Granularity>("month");

  // ── Applied filter state (what drives the data fetches) ──
  const [appliedStartDate, setAppliedStartDate] = useState("");
  const [appliedEndDate, setAppliedEndDate] = useState("");
  const [appliedThreshold, setAppliedThreshold] = useState(0.3);
  const [appliedGranularity, setAppliedGranularity] = useState<Granularity>("month");

  // ── hasAppliedOnce: tracks whether data was ever loaded successfully (D-1) ──
  const [hasAppliedOnce, setHasAppliedOnce] = useState(false);

  // ── Prefill drafts when facets loads (Q6-B) ──
  useEffect(() => {
    if (facets) {
      if (draftStartDate === "") setDraftStartDate(facets.min_date);
      if (draftEndDate === "") setDraftEndDate(facets.max_date);
    }
  }, [facets]);

  // ── Metrics (KPIs + charts) ──
  const { movements, isDataLoading, dataError } =
    useMetrics(appliedStartDate, appliedEndDate);

  // Compute KPIs and monthly data from movements
  const kpiMetrics = movements.length > 0 ? computeKPIs(movements) : null;
  const monthlyData = movements.length > 0 ? computeMonthlyData(movements) : [];

  // ── Track first successful data load ──
  useEffect(() => {
    if (movements.length > 0 && !hasAppliedOnce) setHasAppliedOnce(true);
  }, [movements]);

  // ── Alerts ──
  const { alerts, isAlertsLoading, alertsError } =
    useAlerts(appliedStartDate, appliedEndDate, appliedGranularity, appliedThreshold);

  // ── Apply handler: copies drafts → applied, triggering refetches (B2, J2) ──
  function onApply() {
    setAppliedStartDate(draftStartDate);
    setAppliedEndDate(draftEndDate);
    setAppliedThreshold(clampThreshold(draftThreshold));
    setAppliedGranularity(draftGranularity);
  }

  // ── Determine if Apply should be enabled ──
  const isApplying = isDataLoading || isAlertsLoading;
  const canApply = !isApplying;
  const extraInvalid = !isValidThreshold(draftThreshold);

  // ── Error banner (D-1): only shown on first load, before any successful fetch ──
  const showDataError = !hasAppliedOnce && dataError !== null;

  // ── Period label for header ──
  const period = computePeriodLabel(appliedStartDate, appliedEndDate);

  // ── Render ──
  return (
    <main className="dark min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-8">
          <DashboardHeader period={period} />

          {/* Startup connectivity banner (Q16-B): only when facets never loaded */}
          {facetsError && !facets ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive-foreground">
              Failed to load financial data. Check the backend API.
            </div>
          ) : null}

          {/* Date range filter row (N1-A): below header, before KPIs */}
          <DateRangeFilter
            startDate={draftStartDate}
            endDate={draftEndDate}
            availableMinDate={facets?.min_date}
            availableMaxDate={facets?.max_date}
            onStartDateChange={setDraftStartDate}
            onEndDateChange={setDraftEndDate}
            onApply={onApply}
            canApply={canApply}
            extraInvalid={extraInvalid}
            isApplying={isApplying}
            isLoadingFacets={isFacetsLoading}
            facetsError={facetsError}
            onRetryFacets={retryFacets}
          />

          {/* Data error banner (D-1): first-load fetch failure */}
          {showDataError ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive-foreground">
              {dataError}
            </div>
          ) : null}

          {/* KPIs */}
          <section aria-label="Key performance indicators">
            <KPIRow metrics={kpiMetrics} loading={isDataLoading} />
          </section>

          {/* Charts */}
          <section
            aria-label="Financial charts"
            className="grid grid-cols-1 gap-4 xl:grid-cols-2"
          >
            <IncomeOutcomeChart data={monthlyData} loading={isDataLoading} />
            <ProfitPercentChart data={monthlyData} loading={isDataLoading} />
          </section>

          {/* Alerts table (R1-B): below chart grid */}
          <AlertsTable
            alerts={alerts}
            granularity={appliedGranularity}
            threshold={appliedThreshold}
            isLoading={isAlertsLoading}
            error={alertsError}
            draftThreshold={draftThreshold}
            draftGranularity={draftGranularity}
            onThresholdChange={setDraftThreshold}
            onGranularityChange={setDraftGranularity}
          />
        </div>
      </div>
    </main>
  );
}

export default App;
