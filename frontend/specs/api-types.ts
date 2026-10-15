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
 * A single alert entry from GET /api/metrics/alerts
 *
 * Represents a period where the outcome total exceeded the expected threshold
 * relative to the moving average of the previous 3 periods.
 *
 * @see {@link https://localhost:8000/api/metrics/alerts | GET /api/metrics/alerts}
 */
export interface AlertEntry {
  /** The period identifier. Format depends on the `group_by` parameter: `"YYYY"` (day), `"YYYY-Www"` (week), or `"YYYY-MM"` (month). Example: `"2025-12"`. */
  period: string;

  /** The total outcome (expense) amount recorded in this period. */
  outcome_total: number;

  /** The moving average of the outcome total over the 3 periods immediately preceding this one. */
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