export type OperationType = 'income' | 'outcome'
export type Category = 'suppliers' | 'sales' | 'operational' | 'administrative' | 'others'
export type BusinessType = 'B2B' | 'B2C'
export type Granularity = 'day' | 'week' | 'month'

export interface FinancialMovement {
  create_date: string // ISO date
  amount: number
  operation_type: OperationType
  category: Category
  business_type: BusinessType
}

export interface KPIMetrics {
  totalIncome: number
  totalOutcome: number
  profit: number
  profitPercent: number
}

export interface MonthlyDataPoint {
  month: string
  income: number
  outcome: number
  profitPercent: number
}

// --- API response types ---

export interface FacetsResponse {
  operation_types: OperationType[]
  business_types: BusinessType[]
  categories: Category[]
  min_date: string
  max_date: string
}

export interface SummaryItem {
  period: string
  income: number
  outcome: number
  net: number
}

// --- Frontend-only computed types ---

export interface ComputedAlert {
  period: string
  outcome_total: number
  baseline_average: number
  baseline_periods: number
  increase_ratio: number
}

// --- Filter state ---

export interface FiltersState {
  startDate: string
  endDate: string
  threshold: number
  granularity: Granularity
}
