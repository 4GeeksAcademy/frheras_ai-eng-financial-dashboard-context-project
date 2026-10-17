import {
  type FinancialMovement,
  type KPIMetrics,
  type MonthlyDataPoint,
  type SummaryItem,
  type ComputedAlert,
  type Granularity,
  type Category,
  type CategoryEntry,
} from "./financial-types";

// ─── Date parsing (no `new Date("YYYY-MM-DD")` — avoids timezone shift, P6-a) ───

function parseDate(dateStr: string): { year: number; month: number; day: number } {
  const parts = dateStr.split("-");
  return {
    year: Number(parts[0]),
    month: Number(parts[1]),
    day: Number(parts[2]),
  };
}

function toYearMonthKey(value: Date): string {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonthYearLabel(yearMonthKey: string): string {
  const [yearText, monthText] = yearMonthKey.split("-");
  const year = Number(yearText);
  const month = Number(monthText) - 1;
  return new Date(year, month, 1).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
}

// ─── KPIs & monthly data (existing, unchanged) ───

export function computeKPIs(movements: FinancialMovement[]): KPIMetrics {
  const totalIncome = movements
    .filter((m) => m.operation_type === "income")
    .reduce((sum, m) => sum + m.amount, 0);

  const totalOutcome = movements
    .filter((m) => m.operation_type === "outcome")
    .reduce((sum, m) => sum + m.amount, 0);

  const profit = totalIncome - totalOutcome;
  const profitPercent = totalIncome > 0 ? (profit / totalIncome) * 100 : 0;

  return { totalIncome, totalOutcome, profit, profitPercent };
}

export function computeMonthlyData(
  movements: FinancialMovement[],
): MonthlyDataPoint[] {
  const monthlyMap: Record<string, { income: number; outcome: number }> = {};

  for (const m of movements) {
    const yearMonthKey = toYearMonthKey(new Date(m.create_date));
    if (!monthlyMap[yearMonthKey]) {
      monthlyMap[yearMonthKey] = { income: 0, outcome: 0 };
    }

    if (m.operation_type === "income") {
      monthlyMap[yearMonthKey].income += m.amount;
    } else {
      monthlyMap[yearMonthKey].outcome += m.amount;
    }
  }

  return Object.keys(monthlyMap)
    .sort()
    .map((yearMonthKey) => {
      const { income, outcome } = monthlyMap[yearMonthKey];
      const profit = income - outcome;
      const profitPercent = income > 0 ? (profit / income) * 100 : 0;
      return {
        month: formatMonthYearLabel(yearMonthKey),
        income,
        outcome,
        profitPercent,
      };
    });
}

// ─── Formatters ───

export function formatCurrency(value: number, decimals: number = 0): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

// ─── Threshold utilities (P11-a, U2-A) ───

export function isValidThreshold(value: string): boolean {
  if (value === undefined || value === null || value.trim() === "") return false;
  const num = Number(value);
  return !Number.isNaN(num);
}

export function clampThreshold(value: string): number {
  const num = Number(value);
  if (Number.isNaN(num) || value.trim() === "") return 0.3;
  return Math.round(Math.max(0.01, Math.min(1.0, num)) * 100) / 100;
}

// ─── Period utilities (P6-a, Q11-B, B-1) ───

function isoWeekKey(date: { year: number; month: number; day: number }): string {
  // Compute ISO week number (same algorithm as Python isocalendar)
  const d = new Date(date.year, date.month - 1, date.day);
  const dayOfWeek = d.getDay(); // 0=Sun, need Mon=1 … Sun=7
  const isoDay = dayOfWeek === 0 ? 7 : dayOfWeek;
  d.setDate(d.getDate() + (4 - isoDay));
  const isoYear = d.getFullYear();
  const firstDayOfYear = new Date(isoYear, 0, 1);
  const days = (d.getTime() - firstDayOfYear.getTime()) / 86400000;
  const weekNum = Math.ceil((days + firstDayOfYear.getDay() + 1) / 7);
  return `${isoYear}-W${String(weekNum).padStart(2, "0")}`;
}

export function periodKeyOf(dateStr: string, granularity: Granularity): string {
  const { year, month, day } = parseDate(dateStr);
  switch (granularity) {
    case "day":
      return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    case "week":
      return isoWeekKey({ year, month, day });
    case "month":
      return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}`;
  }
}

export function isPeriodStart(dateStr: string, granularity: Granularity): boolean {
  const { year, month, day } = parseDate(dateStr);
  switch (granularity) {
    case "day":
      return true;
    case "week": {
      // Monday is the start of the week (ISO)
      const d = new Date(year, month - 1, day);
      return d.getDay() === 1;
    }
    case "month":
      return day === 1;
  }
}

export function formatPeriod(period: string, granularity: Granularity): string {
  switch (granularity) {
    case "day": {
      // YYYY-MM-DD → "Dec 15, 2025"
      const { year, month, day } = parseDate(period);
      const d = new Date(year, month - 1, day);
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    }
    case "week": {
      // YYYY-Www → "Week 05, 2026"
      const [y, w] = period.split("-W");
      return `Week ${w}, ${y}`;
    }
    case "month": {
      // YYYY-MM → "Dec 2025"
      const { year, month } = parseDate(period + "-01");
      const d = new Date(year, month - 1, 1);
      return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
    }
  }
}

// ─── Alerts computation (Q1-a, Q9-B, Q10-B, Q3-b) ───

export interface ComputeAlertsOptions {
  threshold: number;
  granularity: Granularity;
  startDate?: string;
  endDate?: string;
}

export function computeAlerts(
  summary: SummaryItem[],
  options: ComputeAlertsOptions,
): ComputedAlert[] {
  const { threshold, granularity, startDate, endDate } = options;
  const hasDateRange = startDate !== undefined && startDate !== "" && endDate !== undefined && endDate !== "";

  // Determine the first period key we should evaluate (P5-c)
  let minPeriod: string | undefined;
  if (startDate && startDate !== "") {
    const pk = periodKeyOf(startDate, granularity);
    if (isPeriodStart(startDate, granularity)) {
      minPeriod = pk;
    } else {
      // If startDate is not the first day of its period, skip that period too (P5-c)
      // We need to find the next period
      minPeriod = pk; // We'll handle the skipping in the loop below
    }
  }

  const alerts: ComputedAlert[] = [];
  const outcomes: Array<{ period: string; outcome: number }> = [];

  for (const item of summary) {
    // Track all outcomes in order for lookback
    outcomes.push({ period: item.period, outcome: item.outcome });

    // First item never generates an alert (Q3-b)
    if (outcomes.length < 2) continue;

    // Skip periods before startDate (P5-c)
    if (minPeriod && item.period < minPeriod) continue;

    // If startDate is not a period start, skip the period that contains startDate (P5-c)
    if (startDate && startDate !== "" && !isPeriodStart(startDate, granularity)) {
      const pk = periodKeyOf(startDate, granularity);
      if (item.period === pk) continue;
    }

    // With date range: only evaluate if we have 3 previous periods within the range (Q10-B)
    // Without date range: use whatever previous periods are available (Q3-b)
    const prevOutcomes = outcomes.slice(0, -1); // all before current

    let prevInRange: Array<{ period: string; outcome: number }>;

    if (hasDateRange) {
      // Only consider previous periods that are within the date range (Q9-B + Q10-B)
      const rangeStart = minPeriod || "";
      prevInRange = prevOutcomes.filter((p) => !rangeStart || p.period >= rangeStart);

      // With date range, require exactly 3 previous periods (Q10-B)
      if (prevInRange.length < 3) continue;
      prevInRange = prevInRange.slice(-3);
    } else {
      // Without date range, use up to 3 previous periods (Q3-b)
      prevInRange = prevOutcomes.slice(-3);
    }

    const baselinePeriods = prevInRange.length;
    const baselineAverage = prevInRange.reduce((sum, p) => sum + p.outcome, 0) / baselinePeriods;

    // B-2: if baseline_average === 0, skip (ratio undefined)
    if (baselineAverage === 0) continue;

    const increaseRatio = (item.outcome - baselineAverage) / baselineAverage;

    // Strict comparison (Q3-A)
    if (increaseRatio > threshold) {
      alerts.push({
        period: item.period,
        outcome_total: Math.round(item.outcome * 100) / 100,
        baseline_average: Math.round(baselineAverage * 100) / 100,
        baseline_periods: baselinePeriods,
        increase_ratio: Math.round(increaseRatio * 10000) / 10000,
      });
    }
  }

  // Sort by period descending (P9-b)
  return alerts.sort((a, b) => b.period.localeCompare(a.period));
}

// ─── Category helpers (G1) ───

const CATEGORY_LABELS: Record<Category, string> = {
  sales: "Sales",
  administrative: "Administrative",
  operational: "Operational",
  suppliers: "Suppliers",
  others: "Others",
};

export function capitalizeCategory(cat: Category): string {
  return CATEGORY_LABELS[cat] ?? cat;
}

// ─── Comparison helpers (F3) ───

export interface CategoryGroupResult {
  data: CategoryEntry[];
  total: number;
}

export function summarizeCategoryGroup(
  entries: CategoryEntry[],
  allowedCategories?: Category[],
): CategoryGroupResult {
  // Filter by allowed categories if facets data is available (R2-a, U1-A)
  let filtered = entries;
  if (allowedCategories && allowedCategories.length > 0) {
    filtered = entries.filter((e) => allowedCategories.includes(e.category));
  }

  // Total = sum of all filtered entries (R3-a)
  const total = filtered.reduce((sum, e) => sum + e.total_amount, 0);

  // Top 5 for display (API already returns descending order)
  const data = filtered.slice(0, 5);

  return { data, total };
}
