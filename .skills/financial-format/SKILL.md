---
name: financial-format
description: Use it when you create, modify, or review dashboard components that display money amounts, percentages, or dates. Defines how these values must be formatted.
---

# Dashboard financial formatting

## Goal
Define a single standard for displaying money amounts, percentages, and dates in the dashboard, eliminating current inconsistencies (amounts with and without decimals, percentages with different precision, dates in ISO format). It is the single source of truth for formatting these values.

## Product locale and currency
- Use `en-US` locale and USD currency for dashboard monetary values unless the user explicitly changes the product requirements.
- The locale and currency are product defaults, not inferred from the viewer's browser. A product-level change must update this skill, the central formatters, and their tests together.

## Edge-case conventions
- Round displayed money and percentages to two fractional digits using the standard `Intl.NumberFormat` / JavaScript number formatting behavior; do not perform a separate business calculation solely for display.
- Preserve a negative sign for negative amounts and percentages. Render zero using the same two-decimal format as other values.
- Format dates from the calendar date supplied by the API as `DD/MM/YYYY`; do not shift date-only values through UTC parsing. For a `Date` value, use its local calendar date unless the feature explicitly defines a different timezone.

## Inputs
- Formatting utilities: `frontend/src/lib/financial-utils.ts` (`formatCurrency`, `formatPercent`, `formatPeriod`, `formatMonthYearLabel`).
- Dashboard components in `frontend/src/components/dashboard/`: KPIs, alerts table, income/expense and margin charts, date filter, and header.
- Comparison components in `frontend/src/components/comparison/`: B2B/B2C panels, category ranking table, and comparison chart.

## Outputs
Examples of how each value should appear correctly:
- Amount: `$1,234,567.89` — currency symbol, thousand separator, and exactly 2 decimal places.
- Percentage: `12.34%` — exactly 2 decimal places.
- Date: `15/12/2025` — DD/MM/YYYY format.

## Acceptance criteria
1. Does every money amount visible on the dashboard include a currency symbol, thousand separator, and exactly 2 decimal places?
2. Does every percentage visible on the dashboard display exactly 2 decimal places?
3. Does every date visible on the dashboard display in DD/MM/YYYY format?

## How to verify
1. Review every component that renders an amount, a percentage, or a date (KPIs, alerts table, chart tooltips and axes, category ranking, B2B/B2C totals, period badge, and date filters) and check that each visible value answers "yes" to its corresponding acceptance criteria.
2. Search for `toFixed(` and calls to `formatCurrency` / `formatPercent` in `frontend/src` to detect inline formats that do not comply with the standard.