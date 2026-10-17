import { createContext, useContext, type ReactNode } from "react";
import type { Granularity, FacetsResponse } from "@/lib/financial-types";

// ─── FiltersContext ─────────────────────────────────────────────────────

export interface FiltersState {
  startDate: string;
  endDate: string;
  threshold: number;
  granularity: Granularity;
}

export interface FiltersContextValue extends FiltersState {
  applyFilters: (patch: Partial<FiltersState>) => void;
}

const FiltersContext = createContext<FiltersContextValue | null>(null);

export function FiltersProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: FiltersContextValue;
}) {
  return (
    <FiltersContext.Provider value={value}>
      {children}
    </FiltersContext.Provider>
  );
}

export function useFilters(): FiltersContextValue {
  const ctx = useContext(FiltersContext);
  if (!ctx) throw new Error("useFilters must be used within FiltersProvider");
  return ctx;
}

// ─── FacetsContext ──────────────────────────────────────────────────────

export interface FacetsContextValue {
  data: FacetsResponse | null;
  isLoading: boolean;
  error: string | null;
  retry: () => void;
}

const FacetsContext = createContext<FacetsContextValue | null>(null);

export function FacetsProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: FacetsContextValue;
}) {
  return (
    <FacetsContext.Provider value={value}>
      {children}
    </FacetsContext.Provider>
  );
}

export function useFacetsContext(): FacetsContextValue {
  const ctx = useContext(FacetsContext);
  if (!ctx) throw new Error("useFacetsContext must be used within FacetsProvider");
  return ctx;
}