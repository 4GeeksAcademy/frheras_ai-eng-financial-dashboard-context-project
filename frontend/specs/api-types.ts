import type { OperationType, Category, BusinessType } from '../src/lib/financial-types';

/**
 * Response from GET /api/metrics/facets
 *
 * Provides the available filter dimensions and the date range of the entire dataset.
 *
 * @see {@link https://localhost:8000/api/metrics/facets | GET /api/metrics/facets}
 */
export interface FacetsResponse {
  /** Array of available operation types. Valid values: `["income", "outcome"]`. */
  operation_types: OperationType[];

  /** Array of available business lines. Valid values: `["B2B", "B2C"]`. */
  business_types: BusinessType[];

  /** Array of available spending/revenue categories. Valid values: `["administrative", "operational", "others", "sales", "suppliers"]`. */
  categories: Category[];

  /** Earliest date in the dataset. Format: `YYYY-MM-DD`. */
  min_date: string;

  /** Latest date in the dataset. Format: `YYYY-MM-DD`. */
  max_date: string;
}

/**
 * A single alert entry from GET /api/metrics/alerts (raw API response).
 *
 * Not consumed by the UI (decision Q1-a): the API baseline is an expanding mean,
 * not a 3-period window. The UI uses {@link ComputedAlert} instead.
 *
 * @see {@link https://localhost:8000/api/metrics/alerts | GET /api/metrics/alerts}
 */
export interface AlertEntry {
  /** The period identifier. Format depends on the `group_by` parameter: `"YYYY-MM-DD"` (day), `"YYYY-Www"` (week), or `"YYYY-MM"` (month). Example: `"2025-12"`. */
  period: string;

  /** The total outcome (expense) amount recorded in this period. */
  outcome_total: number;

  /** Expanding mean of the outcome of ALL preceding periods (not a 3-period window; see verification.md, Q1-a). */
  baseline_average: number;

  /** The ratio of increase: `(outcome_total - baseline_average) / baseline_average`. A value of `1.0201` means a ~102% increase. */
  increase_ratio: number;
}

/**
 * Response from GET /api/metrics/alerts — an array of alert entries.
 *
 * @see {@link https://localhost:8000/api/metrics/alerts | GET /api/metrics/alerts}
 */
export type AlertsResponse = AlertEntry[];

/**
 * A single category entry from GET /api/metrics/categories/top
 *
 * Represents the aggregated total for one category within the requested
 * operation type, sorted by total_amount descending.
 *
 * @see {@link https://localhost:8000/api/metrics/categories/top | GET /api/metrics/categories/top}
 */
export interface CategoryEntry {
  /** The category name. Valid values: `"suppliers"`, `"sales"`, `"operational"`, `"administrative"`, `"others"`. */
  category: Category;

  /** The operation type of the aggregation. Valid values: `"income"`, `"outcome"`. */
  operation_type: OperationType;

  /** The total monetary amount aggregated for this category, rounded to 2 decimal places. */
  total_amount: number;
}

/**
 * Response from GET /api/metrics/categories/top — an array of category entries.
 *
 * @see {@link https://localhost:8000/api/metrics/categories/top | GET /api/metrics/categories/top}
 */
export type TopCategoriesResponse = CategoryEntry[];

/**
 * A single item from GET /api/metrics/summary
 *
 * Aggregated income/outcome per period. Periods without movements are omitted.
 *
 * @see {@link https://localhost:8000/api/metrics/summary | GET /api/metrics/summary}
 */
export interface SummaryItem {
  /** Period key: `"YYYY-MM-DD"` (day), `"YYYY-Www"` (week) or `"YYYY-MM"` (month). */
  period: string;

  /** Total income in the period, rounded to 2 decimals. */
  income: number;

  /** Total outcome in the period, rounded to 2 decimals. */
  outcome: number;

  /** `income - outcome`, rounded to 2 decimals. */
  net: number;
}

/**
 * Response from GET /api/metrics/summary — sorted ascending by `period`.
 */
export type SummaryResponse = SummaryItem[];

/**
 * Frontend-derived alert (decision Q13-b), computed from {@link SummaryResponse}.
 * Not returned by any endpoint.
 */
export interface ComputedAlert {
  /** Period key, same format as {@link SummaryItem.period}. */
  period: string;

  /** Outcome total of the period. */
  outcome_total: number;

  /** Mean outcome of up to 3 preceding periods present in the summary. */
  baseline_average: number;

  /** Number of preceding periods used for `baseline_average`: 1, 2 or 3 (decision Q3-b). */
  baseline_periods: 1 | 2 | 3;

  /** `(outcome_total - baseline_average) / baseline_average`. */
  increase_ratio: number;
}