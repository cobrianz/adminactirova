"use client";

import { useState, useEffect, useCallback } from "react";

export function useApi<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(path !== null);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (!path) return;
    let cancelled = false;
    fetch(path, { cache: "no-store" })
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return;
        if (json.error) {
          setError(json.error);
          setData(null);
        } else {
          setError(null);
          setData(json as T);
        }
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load data");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [path, tick]);

  return { data, loading, error, refetch };
}

export async function apiCall<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, options);
  const json = await res.json();
  if (!res.ok || json.error) {
    throw new Error(json.error || "Request failed");
  }
  return json as T;
}
