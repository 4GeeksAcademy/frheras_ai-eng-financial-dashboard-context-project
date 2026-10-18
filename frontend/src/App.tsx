import { useState, useCallback, lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { FiltersProvider, FacetsProvider } from "@/context/filters-context";
import { useFacets } from "@/hooks/useFacets";
import type { Granularity } from "@/lib/financial-types";

// ── Route-level code splitting (performance: Large bundle size) ──
// Las páginas se cargan bajo demanda con dynamic import() → chunk separado.
const DashboardPage = lazy(() =>
  import("@/pages/dashboard-page").then((m) => ({ default: m.DashboardPage })),
);
const ComparisonPage = lazy(() =>
  import("@/pages/comparison-page").then((m) => ({ default: m.ComparisonPage })),
);

function PageFallback() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="animate-pulse space-y-4"
    >
      <div className="h-12 w-64 rounded-lg bg-muted" />
      <div className="h-[280px] w-full rounded-lg bg-muted" />
    </div>
  );
}

function computePeriodLabel(startDate: string, endDate: string): string {
  if (startDate && endDate) return `${startDate} – ${endDate}`;
  if (startDate && !endDate) return `From ${startDate}`;
  if (!startDate && endDate) return `Until ${endDate}`;
  return "All time";
}

function App() {
  // ── Facets (available range) — shared via context (M-4, Q16-B) ──
  const facetsResult = useFacets();

  // ── Applied filter state (what drives the data fetches) ──
  const [appliedStartDate, setAppliedStartDate] = useState("");
  const [appliedEndDate, setAppliedEndDate] = useState("");
  const [appliedThreshold, setAppliedThreshold] = useState(0.3);
  const [appliedGranularity, setAppliedGranularity] = useState<Granularity>("month");

  // ── Apply filters callback (passed to context) ──
  const applyFilters = useCallback((patch: {
    startDate?: string;
    endDate?: string;
    threshold?: number;
    granularity?: Granularity;
  }) => {
    if (patch.startDate !== undefined) setAppliedStartDate(patch.startDate);
    if (patch.endDate !== undefined) setAppliedEndDate(patch.endDate);
    if (patch.threshold !== undefined) setAppliedThreshold(patch.threshold);
    if (patch.granularity !== undefined) setAppliedGranularity(patch.granularity);
  }, []);

  const filtersValue = {
    startDate: appliedStartDate,
    endDate: appliedEndDate,
    threshold: appliedThreshold,
    granularity: appliedGranularity,
    applyFilters,
  };

  // ── Period label for header ──
  const period = computePeriodLabel(appliedStartDate, appliedEndDate);

  return (
    <FacetsProvider value={facetsResult}>
      <FiltersProvider value={filtersValue}>
        <main id="main-content" className="dark min-h-screen bg-background text-foreground">
          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-background focus:text-foreground focus:rounded-md focus:shadow-lg">
              Skip to main content
            </a>
            <div className="flex flex-col gap-8">
              <DashboardHeader period={period} />
              <Suspense fallback={<PageFallback />}>
                <Routes>
                  <Route path="/" element={<DashboardPage />} />
                  <Route path="/comparison" element={<ComparisonPage />} />
                </Routes>
              </Suspense>
            </div>
          </div>
        </main>
      </FiltersProvider>
    </FacetsProvider>
  );
}

export default App;
