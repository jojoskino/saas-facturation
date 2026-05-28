import { apiFetch } from "../api/client";

const PREFETCH_PATHS = [
  "/api/me",
  "/api/dashboard/home",
  "/api/invoices?page=1&document_type=invoice",
  "/api/quotes?page=1",
  "/api/clients?page=1&per_page=12&sort=recent",
];

/** Précharge les données essentielles après connexion (fire-and-forget). */
export function prefetchAppData() {
  PREFETCH_PATHS.forEach((path) => {
    apiFetch(path, { cacheTtl: 180_000 }).catch(() => {});
  });
}
