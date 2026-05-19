import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../api/client";
import { peekCache, subscribeCache } from "../api/cache";

/**
 * Cached GET query — shows cached data instantly on revisit, revalidates in background.
 */
export function useApiQuery(path, { enabled = true, ttlMs } = {}) {
  const [data, setData] = useState(() => (enabled ? peekCache(path) : null));
  const [loading, setLoading] = useState(() => enabled && peekCache(path) == null);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    if (!enabled || !path) return null;
    const hasCache = peekCache(path) != null;
    if (!hasCache) setLoading(true);
    setError("");
    try {
      const result = await apiFetch(path, ttlMs != null ? { cacheTtl: ttlMs } : undefined);
      setData(result);
      return result;
    } catch (err) {
      setError(err?.message || "Chargement impossible.");
      if (peekCache(path) == null) setData(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, [enabled, path, ttlMs]);

  useEffect(() => {
    if (!enabled || !path) {
      setLoading(false);
      return undefined;
    }

    const cached = peekCache(path);
    if (cached != null) {
      setData(cached);
      setLoading(false);
    }

    refresh();

    return subscribeCache(path, () => {
      const next = peekCache(path);
      if (next != null) setData(next);
    });
  }, [enabled, path, refresh]);

  return { data, loading, error, setError, refresh, setData };
}
