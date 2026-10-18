import { useApiFetch } from "@/hooks/useApiFetch"
import { type FacetsResponse } from "@/lib/financial-types"

export interface UseFacetsResult {
  data: FacetsResponse | null
  isLoading: boolean
  error: string | null
  retry: () => void
}

export function useFacets(): UseFacetsResult {
  const { data, isLoading, error, refetch } = useApiFetch<FacetsResponse>(
    () => "/api/metrics/facets",
    [],
  )

  return { data, isLoading, error, retry: refetch }
}