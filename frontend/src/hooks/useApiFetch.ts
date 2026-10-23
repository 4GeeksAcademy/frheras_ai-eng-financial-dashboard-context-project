import { useState, useEffect, useRef, useCallback } from "react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

export interface UseApiFetchResult<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useApiFetch<T>(
  buildUrl: () => string,
  deps: unknown[],
  options?: { skip?: boolean },
): UseApiFetchResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(() => {
    if (options?.skip) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsLoading(true);
    setError(null);

    const url = buildUrl().startsWith("http")
      ? buildUrl()
      : `${API_BASE_URL}${buildUrl()}`;

    fetch(url, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<T>;
      })
      .then((json) => {
        setData(json);
        setError(null);
      })
      .catch((err) => {
        if (err.name === "AbortError") return;
        setError(err.message ?? "An error occurred");
      })
      .finally(() => {
        setIsLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    fetchData();
    return () => {
      abortRef.current?.abort();
    };
  }, [fetchData]);

  return { data, isLoading, error, refetch: fetchData };
}