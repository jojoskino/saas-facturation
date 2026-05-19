import { cachedGet, clearApiCache, invalidateForMutation } from "./cache.js";

const base =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE_URL?.replace(/\/$/, "")) ||
  "http://127.0.0.1:8000";

export function apiUrl(path) {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}

export function getStoredToken() {
  const sessionToken = sessionStorage.getItem("facturo_token");
  if (sessionToken) return sessionToken;

  const legacyToken = localStorage.getItem("facturo_token");
  if (legacyToken) {
    sessionStorage.setItem("facturo_token", legacyToken);
    localStorage.removeItem("facturo_token");
  }

  return legacyToken;
}

export function setStoredToken(token) {
  if (token) {
    sessionStorage.setItem("facturo_token", token);
    localStorage.removeItem("facturo_token");
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
    const err = new Error("Impossible de joindre le serveur. Vérifiez que l'API est démarrée.");
    err.status = 0;
    err.body = null;
    throw err;
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
    const err = new Error("Impossible de joindre le serveur. Vérifiez que l'API est démarrée.");
    err.status = 0;
    err.body = null;
    throw err;
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
  return text;
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
