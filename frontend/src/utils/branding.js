const DEFAULT_PRIMARY = "#14213D";
const DEFAULT_ACCENT = "#FCA311";

export function applyUserBranding(user) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const primary = user?.document_color_primary || DEFAULT_PRIMARY;
  const accent = user?.document_color_accent || DEFAULT_ACCENT;
  root.style.setProperty("--color-primary", primary);
  root.style.setProperty("--color-text", primary);
  root.style.setProperty("--color-accent", accent);
}
