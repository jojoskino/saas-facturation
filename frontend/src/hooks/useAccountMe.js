import { useApiQuery } from "./useApiQuery";
import { setCache } from "../api/cache";

export function useAccountMe() {
  const { data: user, loading, error, setError, refresh, setData } = useApiQuery("/api/me");

  function setUser(next) {
    const value = typeof next === "function" ? next(user) : next;
    setData(value);
    if (value) setCache("/api/me", value);
  }

  return { user, setUser, loading, error, setError, refresh };
}

export function extractApiMessage(error, fallback) {
  if (error?.body?.errors && typeof error.body.errors === "object") {
    const firstError = Object.values(error.body.errors)[0];
    if (Array.isArray(firstError) && firstError[0]) return String(firstError[0]);
  }
  if (error?.body?.message) return String(error.body.message);
  return error?.message || fallback;
}
