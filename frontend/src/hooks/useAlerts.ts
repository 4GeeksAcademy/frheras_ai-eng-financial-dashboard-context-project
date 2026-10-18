import { useMemo } from "react"
import { useApiFetch } from "@/hooks/useApiFetch"
import { type SummaryItem, type ComputedAlert, type Granularity } from "@/lib/financial-types"
import { computeAlerts } from "@/lib/financial-utils"

export interface UseAlertsResult {
  alerts: ComputedAlert[]
  isAlertsLoading: boolean
  alertsError: string | null
  refetch: () => void
}

export function useAlerts(
  startDate: string,
  endDate: string,
  granularity: Granularity,
  threshold: number,
): UseAlertsResult {
  // El servidor NO usa `threshold` (el cálculo de anomalías es 100% cliente).
  // Excluirlo del key del fetch evita un refetch innecesario al cambiar el
  // umbral: solo cambia el useMemo de computeAlerts. (perf: over-fetching / red redundante)
  const fetchKey = `${startDate}|${endDate}|${granularity}`

  const { data: summary, isLoading, error, refetch } = useApiFetch<SummaryItem[]>(
    () => {
      const params = new URLSearchParams()
      params.set("operation_type", "outcome")
      params.set("group_by", granularity)
      if (startDate && startDate !== "") params.set("start_date", startDate)
      if (endDate && endDate !== "") params.set("end_date", endDate)
      return `/api/metrics/summary?${params.toString()}`
    },
    [fetchKey],
  )

  const alerts = useMemo(
    () =>
      summary
        ? computeAlerts(summary, { threshold, granularity, startDate, endDate })
        : [],
    [summary, threshold, granularity, startDate, endDate],
  )

  return { alerts, isAlertsLoading: isLoading, alertsError: error, refetch }
}