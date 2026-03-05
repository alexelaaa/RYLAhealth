"use client";

import { useState, useEffect, useCallback } from "react";
import { cacheGet, cacheSet } from "@/lib/offline-cache";

interface UseOfflineFetchOptions<T> {
  /** Cache key (usually the URL) */
  key: string;
  /** Fetch function that returns the data */
  fetcher: () => Promise<T>;
  /** Max cache age in ms before considered stale (default: 1 hour) */
  maxAge?: number;
}

interface UseOfflineFetchResult<T> {
  data: T | null;
  loading: boolean;
  error: boolean;
  isFromCache: boolean;
  refetch: () => Promise<void>;
}

/**
 * Network-first fetch with IndexedDB fallback.
 * Tries network first, caches on success, falls back to cache if offline/error.
 */
export function useOfflineFetch<T>({
  key,
  fetcher,
  maxAge = 60 * 60 * 1000, // 1 hour default
}: UseOfflineFetchOptions<T>): UseOfflineFetchResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isFromCache, setIsFromCache] = useState(false);

  const doFetch = useCallback(async () => {
    setLoading(true);
    setError(false);

    try {
      // Try network first
      const result = await fetcher();
      setData(result);
      setIsFromCache(false);
      // Cache the result
      await cacheSet(key, result);
    } catch {
      // Network failed — try cache
      const cached = await cacheGet<T>(key, maxAge);
      if (cached !== null) {
        setData(cached);
        setIsFromCache(true);
      } else {
        setError(true);
      }
    } finally {
      setLoading(false);
    }
  }, [key, fetcher, maxAge]);

  useEffect(() => {
    doFetch();
  }, [doFetch]);

  return { data, loading, error, isFromCache, refetch: doFetch };
}
