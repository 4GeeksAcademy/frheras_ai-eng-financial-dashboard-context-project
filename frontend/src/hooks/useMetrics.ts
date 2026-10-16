import { useState, useEffect } from "react"
import { type FinancialMovement } from "@/lib/financial-types"

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ""

export interface UseMetricsResult {
  movements: FinancialMovement[]
  isDataLoading: boolean
  dataError: string | null
  refetch: () => void
}

export function useMetrics(startDate: string, endDate: string): UseMetricsResult {
  const [movements, setMovements] = useState<FinancialMovement[]>([])
  const [isDataLoading, setIsDataLoading] = useState(true)
  const [dataError, setDataError] = useState<string | null>(null)
  let abortController: AbortController | null = null

  function fetchMetrics() {
    abortController?.abort()
    const controller = new AbortController()
    abortController = controller

    setIsDataLoading(true)
    setDataError(null)

    // Build URL with optional query params (D-2: omit when empty/rang-full)
    const params = new URLSearchParams()
    if (startDate && startDate !== "") params.set("start_date", startDate)
    if (endDate && endDate !== "") params.set("end_date", endDate)
    const queryString = params.toString()
    const url = `${API_BASE_URL}/api/metrics${queryString ? "?" + queryString : ""}`

    fetch(url, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json() as Promise<FinancialMovement[]>
      })
      .then((json) => {
        setMovements(json)
        setDataError(null)
      })
      .catch((err) => {
        if (err.name === "AbortError") return
        setDataError(err.message ?? "Failed to load financial data. Check the backend API.")
      })
      .finally(() => {
        setIsDataLoading(false)
      })
  }

  useEffect(() => {
    fetchMetrics()
    return () => {
      abortController?.abort()
    }
  }, [startDate, endDate])

  return { movements, isDataLoading, dataError, refetch: fetchMetrics }
}