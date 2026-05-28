import { peekCache } from "../api/cache";

/** Hydrate une liste paginée depuis le cache mémoire (affichage instantané). */
export function paginatedFromCache(url) {
  const cached = peekCache(url);
  if (!cached) return null;

  return {
    rows: Array.isArray(cached?.data) ? cached.data : [],
    meta: {
      current_page: Number(cached?.current_page || 1),
      last_page: Number(cached?.last_page || 1),
      total: Number(cached?.total || 0),
    },
  };
}
