import { useState, useEffect, useRef } from "react"
import { type FacetsResponse } from "@/lib/financial-types"

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ""

export interface UseFacetsResult {
  data: FacetsResponse | null
  isLoading: boolean
  error: string | null
  retry: () => void
}

export function useFacets(): UseFacetsResult {
  const [data, setData] = useState<FacetsResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  function fetchFacets() {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setIsLoading(true)
    setError(null)

    fetch(`${API_BASE_URL}/api/metrics/facets`, {
      signal: controller.signal,
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json() as Promise<FacetsResponse>
      })
      .then((json) => {
        setData(json)
        setError(null)
      })
      .catch((err) => {
        if (err.name === "AbortError") return
        setError(err.message ?? "Failed to load available range")
      })
      .finally(() => {
        setIsLoading(false)
      })
  }

  useEffect(() => {
    fetchFacets()
    return () => {
      abortRef.current?.abort()
    }
  }, [])

  return { data, isLoading, error, retry: fetchFacets }
}