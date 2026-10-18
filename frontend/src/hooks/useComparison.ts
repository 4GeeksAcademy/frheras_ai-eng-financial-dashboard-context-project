import { useState, useEffect, useRef, useCallback } from "react"
import { useApiFetch } from "@/hooks/useApiFetch"
import { type CategoryEntry, type Category } from "@/lib/financial-types"
import { summarizeCategoryGroup } from "@/lib/financial-utils"

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

export function useComparison(
  startDate: string,
  endDate: string,
  allowedCategories?: Category[],
): UseComparisonResult {
  // Build URL helper
  const buildUrl = useCallback(
    (businessType: string) => {
      const params = new URLSearchParams({
        operation_type: "income",
        limit: "20",
        business_type: businessType,
      })
      if (startDate && startDate !== "") params.set("start_date", startDate)
      if (endDate && endDate !== "") params.set("end_date", endDate)
      return `/api/metrics/categories/top?${params.toString()}`
    },
    [startDate, endDate],
  )

  const b2bFetch = useApiFetch<CategoryEntry[]>(() => buildUrl("B2B"), [startDate, endDate])
  const b2cFetch = useApiFetch<CategoryEntry[]>(() => buildUrl("B2C"), [startDate, endDate])

  // Keep last successful data for Q20-A (preserve on error after Apply)
  const lastB2bRef = useRef<{ data: CategoryEntry[]; total: number }>({ data: [], total: 0 })
  const lastB2cRef = useRef<{ data: CategoryEntry[]; total: number }>({ data: [], total: 0 })

  // Use state for processed data (with summarizeCategoryGroup applied)
  const [b2bProcessed, setB2bProcessed] = useState<ComparisonGroup>({
    data: [], total: 0, isLoading: true, error: null,
  })
  const [b2cProcessed, setB2cProcessed] = useState<ComparisonGroup>({
    data: [], total: 0, isLoading: true, error: null,
  })

  // Update processed data when raw fetch data changes
  useEffect(() => {
    if (b2bFetch.data) {
      const result = summarizeCategoryGroup(b2bFetch.data, allowedCategories)
      lastB2bRef.current = { data: result.data, total: result.total }
      setB2bProcessed({ data: result.data, total: result.total, isLoading: false, error: null })
    } else if (!b2bFetch.isLoading && b2bFetch.error) {
      // On error: keep last successful data (Q20-A)
      setB2bProcessed((prev) => ({
        ...prev,
        data: lastB2bRef.current.data,
        total: lastB2bRef.current.total,
        isLoading: false,
        error: b2bFetch.error,
      }))
    }
  }, [b2bFetch.data, b2bFetch.isLoading, b2bFetch.error])

  useEffect(() => {
    if (b2cFetch.data) {
      const result = summarizeCategoryGroup(b2cFetch.data, allowedCategories)
      lastB2cRef.current = { data: result.data, total: result.total }
      setB2cProcessed({ data: result.data, total: result.total, isLoading: false, error: null })
    } else if (!b2cFetch.isLoading && b2cFetch.error) {
      setB2cProcessed((prev) => ({
        ...prev,
        data: lastB2cRef.current.data,
        total: lastB2cRef.current.total,
        isLoading: false,
        error: b2cFetch.error,
      }))
    }
  }, [b2cFetch.data, b2cFetch.isLoading, b2cFetch.error])

  // Re-run summarizeCategoryGroup when allowedCategories changes (without refetch)
  useEffect(() => {
    if (lastB2bRef.current.data.length > 0) {
      const result = summarizeCategoryGroup(lastB2bRef.current.data, allowedCategories)
      lastB2bRef.current = { data: result.data, total: result.total }
      setB2bProcessed((prev) => ({ ...prev, data: result.data, total: result.total }))
    }
    if (lastB2cRef.current.data.length > 0) {
      const result = summarizeCategoryGroup(lastB2cRef.current.data, allowedCategories)
      lastB2cRef.current = { data: result.data, total: result.total }
      setB2cProcessed((prev) => ({ ...prev, data: result.data, total: result.total }))
    }
  }, [allowedCategories])

  // Sync loading states from raw fetches
  useEffect(() => {
    if (b2bFetch.isLoading) {
      setB2bProcessed((prev) => ({ ...prev, isLoading: true }))
    }
  }, [b2bFetch.isLoading])

  useEffect(() => {
    if (b2cFetch.isLoading) {
      setB2cProcessed((prev) => ({ ...prev, isLoading: true }))
    }
  }, [b2cFetch.isLoading])

  const refetchAll = useCallback(() => {
    b2bFetch.refetch()
    b2cFetch.refetch()
  }, [b2bFetch.refetch, b2cFetch.refetch])

  return {
    b2b: b2bProcessed,
    b2c: b2cProcessed,
    refetchAll,
  }
}