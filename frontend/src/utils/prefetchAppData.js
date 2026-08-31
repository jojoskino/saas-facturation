import { apiFetch } from "../api/client";

/** Une requête par route — évite de saturer le serveur PHP local au chargement. */
const ROUTE_PREFETCH = {
  "/app": ["/api/dashboard/home"],
  "/app/factures": ["/api/invoices?page=1&document_type=invoice"],
  "/app/devis": [
    "/api/quotes?page=1",
    "/api/clients?per_page=200&minimal=1",
  ],
  "/app/clients": ["/api/clients?page=1&per_page=12&sort=recent"],
  "/app/rapports": ["/api/reports/summary?period=year"],
};

function resolvePrefetchPaths(pathname) {
  const base = (pathname || "/app").split("?")[0];
  return ROUTE_PREFETCH[base] ?? ROUTE_PREFETCH["/app"];
}

/** Précharge les données de la page courante (fire-and-forget). /api/me est déjà chargé par AppLayout. */
export function prefetchAppData(pathname = "/app") {
  resolvePrefetchPaths(pathname).forEach((path) => {
    apiFetch(path, { cacheTtl: 180_000 }).catch(() => {});
  });
}
