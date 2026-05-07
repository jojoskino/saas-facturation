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
  }
}

export async function apiFetch(path, options = {}) {
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
