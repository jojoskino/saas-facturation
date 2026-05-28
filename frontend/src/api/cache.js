const DEFAULT_TTL_MS = 180_000;

/** @type {Map<string, { data: unknown, fetchedAt: number }>} */
const store = new Map();

/** @type {Map<string, Promise<unknown>>} */
const inflight = new Map();

/** @type {Map<string, Set<() => void>>} */
const listeners = new Map();

function notify(key) {
  listeners.get(key)?.forEach((fn) => fn());
}

export function peekCache(key) {
  return store.get(key)?.data ?? null;
}

export function getCacheEntry(key) {
  return store.get(key) ?? null;
}

export function isCacheFresh(entry, ttlMs = DEFAULT_TTL_MS) {
  return Boolean(entry && Date.now() - entry.fetchedAt < ttlMs);
}

export function setCache(key, data) {
  store.set(key, { data, fetchedAt: Date.now() });
  notify(key);
}

export function subscribeCache(key, listener) {
  if (!listeners.has(key)) listeners.set(key, new Set());
  listeners.get(key).add(listener);
  return () => listeners.get(key)?.delete(listener);
}

export function clearApiCache() {
  store.clear();
  inflight.clear();
  for (const key of listeners.keys()) notify(key);
}

export function invalidateApiCache(matcher) {
  const match =
    typeof matcher === "string"
      ? (key) => key.startsWith(matcher)
      : matcher;

  for (const key of [...store.keys()]) {
    if (match(key)) {
      store.delete(key);
      notify(key);
    }
  }
}

export function invalidateForMutation(path) {
  if (path.startsWith("/api/clients")) {
    invalidateApiCache("/api/clients");
    invalidateApiCache("/api/dashboard");
    return;
  }
  if (path.startsWith("/api/quotes")) {
    invalidateApiCache("/api/quotes");
    invalidateApiCache("/api/dashboard");
    invalidateApiCache("/api/invoices");
    return;
  }
  if (path.startsWith("/api/invoices")) {
    invalidateApiCache("/api/invoices");
    invalidateApiCache("/api/dashboard");
    return;
  }
  if (path.startsWith("/api/me")) {
    invalidateApiCache("/api/me");
    return;
  }
  if (path.startsWith("/api/dashboard")) {
    invalidateApiCache("/api/dashboard");
    return;
  }
  if (path.startsWith("/api/clients/import")) {
    invalidateApiCache("/api/clients");
    invalidateApiCache("/api/dashboard");
    return;
  }
  if (path.startsWith("/api/reports")) {
    invalidateApiCache("/api/reports");
  }
}

/**
 * GET with in-memory cache, request deduplication and stale-while-revalidate.
 */
export async function cachedGet(path, fetcher, ttlMs = DEFAULT_TTL_MS) {
  const key = path;
  const entry = getCacheEntry(key);

  if (entry && isCacheFresh(entry, ttlMs)) {
    return entry.data;
  }

  if (inflight.has(key)) {
    return inflight.get(key);
  }

  const request = fetcher()
    .then((data) => {
      setCache(key, data);
      inflight.delete(key);
      return data;
    })
    .catch((err) => {
      inflight.delete(key);
      if (entry) return entry.data;
      throw err;
    });

  inflight.set(key, request);

  if (entry) {
    request.catch(() => {});
    return entry.data;
  }

  return request;
}

