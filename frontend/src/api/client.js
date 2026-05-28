import { cachedGet, clearApiCache, invalidateForMutation } from "./cache.js";

function resolveApiBase() {
  const raw = import.meta.env?.VITE_API_BASE_URL;
  const trimmed = typeof raw === "string" ? raw.trim() : "";
  if (trimmed) return trimmed.replace(/\/$/, "");
  if (import.meta.env.DEV) return "";
  return "http://127.0.0.1:8000";
}

const base = resolveApiBase();

function networkError() {
  const isLocal =
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
  const msg = isLocal
    ? "Impossible de joindre l'API locale. Lancez le backend : cd backend && php artisan serve"
    : "Le service est momentanément indisponible. L'API backend doit être relancée (Render ou Railway).";
  const err = new Error(msg);
  err.status = 0;
  err.body = null;
  return err;
}

export function apiUrl(path) {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}

export function getStoredToken() {
  const sessionToken = sessionStorage.getItem("facturo_token");
  if (sessionToken) return sessionToken;

  const persistentToken = localStorage.getItem("facturo_token");
  return persistentToken;
}

export function setStoredToken(token, { remember = false } = {}) {
  if (token) {
    if (remember) {
      localStorage.setItem("facturo_token", token);
      sessionStorage.removeItem("facturo_token");
    } else {
      sessionStorage.setItem("facturo_token", token);
      localStorage.removeItem("facturo_token");
    }
  } else {
    sessionStorage.removeItem("facturo_token");
    localStorage.removeItem("facturo_token");
    clearApiCache();
  }
}

async function rawApiFetch(path, options = {}) {
  const headers = new Headers(options.headers || {});
  if (!headers.has("Accept")) headers.set("Accept", "application/json");
  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json; charset=utf-8");
  }
  const token = getStoredToken();
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  let res;
  try {
    res = await fetch(apiUrl(path), { ...options, headers });
  } catch {
    throw networkError();
  }
  const text = await res.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }
  if (!res.ok) {
    const err = new Error((data && data.message) || res.statusText || "Erreur API");
    err.status = res.status;
    err.body = data;
    throw err;
  }
  return data;
}

export async function apiUpload(path, formData, method = "POST") {
  const headers = new Headers({ Accept: "application/json" });
  const token = getStoredToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  let res;
  try {
    res = await fetch(apiUrl(path), { method, headers, body: formData });
  } catch {
    throw networkError();
  }
  const text = await res.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }
  if (!res.ok) {
    const err = new Error((data && data.message) || res.statusText || "Erreur API");
    err.status = res.status;
    err.body = data;
    throw err;
  }
  invalidateForMutation(path);
  if (path.includes("company-profile")) {
    invalidateForMutation("/api/me");
  }
  return data;
}

export async function apiFetch(path, options = {}) {
  const method = (options.method || "GET").toUpperCase();

  if (method === "GET" && options.cache !== false) {
    const ttlMs = options.cacheTtl;
    return cachedGet(path, () => rawApiFetch(path, options), ttlMs);
  }

  const data = await rawApiFetch(path, options);
  invalidateForMutation(path);
  return data;
}

export { peekCache } from "./cache.js";

export async function apiFetchHtml(path) {
  const headers = new Headers({ Accept: "text/html" });
  const token = getStoredToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const res = await fetch(apiUrl(path), { headers });
  const text = await res.text();
  if (!res.ok) {
    let data = null;
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: text };
    }
    const err = new Error(data?.message || "Aperçu indisponible");
    err.status = res.status;
    err.body = data;
    throw err;
  }
  const { assertDocumentPreviewHtml } = await import("../utils/documentPreview.js");
  return assertDocumentPreviewHtml(text);
}

export async function apiDownload(path, filename = "document.pdf", accept = "application/pdf") {
  const headers = new Headers({ Accept: accept });
  const token = getStoredToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const res = await fetch(apiUrl(path), { headers });
  if (!res.ok) {
    const text = await res.text();
    let data = null;
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: text };
    }
    const err = new Error(data?.message || "Téléchargement impossible");
    err.status = res.status;
    err.body = data;
    throw err;
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
