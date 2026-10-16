import { useState, useEffect } from "react"
import { type SummaryItem, type ComputedAlert, type Granularity } from "@/lib/financial-types"
import { computeAlerts } from "@/lib/financial-utils"

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ""

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
  const [alerts, setAlerts] = useState<ComputedAlert[]>([])
  const [isAlertsLoading, setIsAlertsLoading] = useState(true)
  const [alertsError, setAlertsError] = useState<string | null>(null)
  let abortController: AbortController | null = null
  let previousKey = ""

  function computeKey(): string {
    return `${startDate}|${endDate}|${granularity}|${threshold}`
  }

  function fetchSummaryAndCompute() {
    const currentKey = computeKey()
    // Skip duplicate calls
    if (currentKey === previousKey) return
    previousKey = currentKey

    abortController?.abort()
    const controller = new AbortController()
    abortController = controller

    setIsAlertsLoading(true)
    setAlertsError(null)

    // Build URL: /api/metrics/summary with operation_type=outcome and group_by=granularity
    const params = new URLSearchParams()
    params.set("operation_type", "outcome")
    params.set("group_by", granularity)
    if (startDate && startDate !== "") params.set("start_date", startDate)
    if (endDate && endDate !== "") params.set("end_date", endDate)
    const url = `${API_BASE_URL}/api/metrics/summary?${params.toString()}`

    fetch(url, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json() as Promise<SummaryItem[]>
      })
      .then((summary) => {
        const computed = computeAlerts(summary, {
          threshold,
          granularity,
          startDate,
          endDate,
        })
        setAlerts(computed)
        setAlertsError(null)
      })
      .catch((err) => {
        if (err.name === "AbortError") return
        setAlertsError(err.message ?? "Failed to compute alerts")
      })
      .finally(() => {
        setIsAlertsLoading(false)
      })
  }

  useEffect(() => {
    fetchSummaryAndCompute()
    return () => {
      abortController?.abort()
    }
  }, [startDate, endDate, granularity, threshold])

  return {
    alerts,
    isAlertsLoading,
    alertsError,
    refetch: fetchSummaryAndCompute,
  }
}