import { useState, useEffect, useRef } from "react"
import { type CategoryEntry, type Category } from "@/lib/financial-types"
import { summarizeCategoryGroup } from "@/lib/financial-utils"

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ""

export interface ComparisonGroup {
  data: CategoryEntry[]
  total: number
  isLoading: boolean
  error: string | null
}

export interface UseComparisonResult {
  b2b: ComparisonGroup
  b2c: ComparisonGroup
  refetchAll: () => void
}

interface GroupState {
  data: CategoryEntry[]
  total: number
  isLoading: boolean
  error: string | null
}

export function useComparison(
  startDate: string,
  endDate: string,
  allowedCategories?: Category[],
): UseComparisonResult {
  const [b2b, setB2b] = useState<GroupState>({
    data: [],
    total: 0,
    isLoading: true,
    error: null,
  })
  const [b2c, setB2c] = useState<GroupState>({
    data: [],
    total: 0,
    isLoading: true,
    error: null,
  })

  const b2bAbortRef = useRef<AbortController | null>(null)
  const b2cAbortRef = useRef<AbortController | null>(null)

  // Keep last successful data for Q20-A (preserve on error after Apply)
  const lastB2bRef = useRef<{ data: CategoryEntry[]; total: number }>({
    data: [],
    total: 0,
  })
  const lastB2cRef = useRef<{ data: CategoryEntry[]; total: number }>({
    data: [],
    total: 0,
  })

  function fetchGroup(
    businessType: "B2B" | "B2C",
    setter: (value: GroupState | ((prev: GroupState) => GroupState)) => void,
    abortRef: { current: AbortController | null },
    lastRef: { current: { data: CategoryEntry[]; total: number } },
  ) {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setter((prev) => ({ ...prev, isLoading: true, error: null }))

    const params = new URLSearchParams({
      operation_type: "income",
      limit: "20",
      business_type: businessType,
    })
    if (startDate && startDate !== "") params.set("start_date", startDate)
    if (endDate && endDate !== "") params.set("end_date", endDate)

    const url = `${API_BASE_URL}/api/metrics/categories/top?${params.toString()}`

    fetch(url, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json() as Promise<CategoryEntry[]>
      })
      .then((json) => {
        const result = summarizeCategoryGroup(json, allowedCategories)
        // Save for Q20-A persistence
        lastRef.current = { data: result.data, total: result.total }
        setter({ data: result.data, total: result.total, isLoading: false, error: null })
      })
      .catch((err) => {
        if (err.name === "AbortError") return
        // Q20-A: keep last successful data on error
        setter((prev) => ({
          ...prev,
          data: lastRef.current.data,
          total: lastRef.current.total,
          isLoading: false,
          error: err.message ?? `Failed to load ${businessType} data. Check the backend API.`,
        }))
      })
  }

  function fetchAll() {
    fetchGroup("B2B", setB2b, b2bAbortRef, lastB2bRef)
    fetchGroup("B2C", setB2c, b2cAbortRef, lastB2cRef)
  }

  useEffect(() => {
    fetchAll()
    return () => {
      b2bAbortRef.current?.abort()
      b2cAbortRef.current?.abort()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate])

  // Re-run summarizeCategoryGroup when allowedCategories changes (without refetch)
  useEffect(() => {
    if (lastB2bRef.current.data.length > 0) {
      const result = summarizeCategoryGroup(lastB2bRef.current.data, allowedCategories)
      lastB2bRef.current = { data: result.data, total: result.total }
      setB2b((prev) => ({ ...prev, data: result.data, total: result.total }))
    }
    if (lastB2cRef.current.data.length > 0) {
      const result = summarizeCategoryGroup(lastB2cRef.current.data, allowedCategories)
      lastB2cRef.current = { data: result.data, total: result.total }
      setB2c((prev) => ({ ...prev, data: result.data, total: result.total }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowedCategories])

  return {
    b2b: { data: b2b.data, total: b2b.total, isLoading: b2b.isLoading, error: b2b.error },
    b2c: { data: b2c.data, total: b2c.total, isLoading: b2c.isLoading, error: b2c.error },
    refetchAll: fetchAll,
  }
}