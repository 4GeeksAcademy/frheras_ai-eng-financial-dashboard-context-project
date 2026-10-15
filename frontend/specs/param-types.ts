import type { OperationType, Category } from '../src/lib/financial-types';

/**
 * Reusable date range filter used across multiple endpoints.
 * Both fields are optional; when omitted the endpoint returns all available data.
 *
 * @see GET /api/metrics, GET /api/metrics/summary, GET /api/metrics/categories/top, GET /api/metrics/alerts
 */
export interface DateRangeFilter {
  /** The start of the date range (inclusive). Format: `YYYY-MM-DD`. */
  start_date?: string;

  /** The end of the date range (inclusive). Format: `YYYY-MM-DD`. */
  end_date?: string;
}

/**
 * Query parameters for GET /api/metrics/alerts
 *
 * The `/api/metrics/alerts` endpoint accepts threshold, group_by, and
 * optional date range filters — see verification.md decision.
 *
 * TODO: `business_type` was marked ❓ in verification.md. The OpenAPI spec
 * lists it but its type was uncertain. Revisit once confirmed.
 *
 * @see {@link https://localhost:8000/api/metrics/alerts | GET /api/metrics/alerts}
 */
export interface AlertsParams extends DateRangeFilter {
  /**
   * Anomaly detection threshold ratio. Must be between `0.01` and `1.0`
   * as required by the PM brief (the API itself accepts `minimum=0`).
   * Valid values: `0.01` to `1.0`. Default: `0.3`.
   */
  threshold?: number;

  /**
   * Granularity for grouping the time series.
   * Valid values: `"day"`, `"week"`, `"month"`. Default: `"month"`.
   */
  group_by?: 'day' | 'week' | 'month';

  // TODO: business_type (❓ in verification — confirm OpenAPI type)
}

/**
 * Query parameters for GET /api/metrics/categories/top
 *
 * TODO: `business_type` was marked ❓ in verification.md — the OpenAPI spec
 * lists it but its type was uncertain. Revisit once confirmed.
 *
 * @see {@link https://localhost:8000/api/metrics/categories/top | GET /api/metrics/categories/top}
 */
export interface TopCategoriesParams extends DateRangeFilter {
  /**
   * The type of financial operation to aggregate.
   * Valid values: `"income"`, `"outcome"`. Default: `"outcome"`.
   */
  operation_type: OperationType;

  /**
   * Maximum number of top categories to return.
   * Valid values: `1` to `20`. Default: `5`.
   */
  limit?: number;

  // TODO: business_type (❓ in verification — confirm OpenAPI type)
}

/**
 * Query parameters for GET /api/metrics (the main metrics endpoint).
 *
 * The existing `/api/metrics` endpoint accepts date range filters,
 * category, and operation_type.
 *
 * @see {@link https://localhost:8000/api/metrics | GET /api/metrics}
 */
export interface MetricsParams extends DateRangeFilter {
  /**
   * Filter by category.
   * Valid values: `"suppliers"`, `"sales"`, `"operational"`, `"administrative"`, `"others"`.
   */
  category?: Category;

  /**
   * Filter by operation type.
   * Valid values: `"income"`, `"outcome"`.
   */
  operation_type?: OperationType;
}