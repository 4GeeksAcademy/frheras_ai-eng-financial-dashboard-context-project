import { useApiFetch } from "@/hooks/useApiFetch"
import { type FinancialMovement } from "@/lib/financial-types"

export interface UseMetricsResult {
  movements: FinancialMovement[]
  isDataLoading: boolean
  dataError: string | null
  refetch: () => void
}

export function useMetrics(startDate: string, endDate: string): UseMetricsResult {
  const { data, isLoading, error, refetch } = useApiFetch<FinancialMovement[]>(
    () => {
      const params = new URLSearchParams()
      if (startDate && startDate !== "") params.set("start_date", startDate)
      if (endDate && endDate !== "") params.set("end_date", endDate)
      const queryString = params.toString()
      return `/api/metrics${queryString ? "?" + queryString : ""}`
    },
    [startDate, endDate],
  )

  return {
    movements: data ?? [],
    isDataLoading: isLoading,
    dataError: error,
    refetch,
  }
}