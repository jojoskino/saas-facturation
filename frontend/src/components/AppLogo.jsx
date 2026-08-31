import { LOGO_ALT, LOGO_SRC } from "../constants/brand";

/** Hauteur + largeur max — logo horizontal dans public/logo.png */
const SIZES = {
  /** Sidebar repliée : crop sur l’icône document (droite) */
  icon: { height: 32, maxWidth: 36, fit: "cover", position: "right center" },
  sm: { height: 30, maxWidth: 118 },
  md: { height: 34, maxWidth: 148 },
  lg: { height: 50, maxWidth: 210 },
  nav: { height: 32, maxWidth: 138 },
  foot: { height: 40, maxWidth: 168 },
};

/** Logo image — tailles calibrées pour le lockup horizontal. */
export default function AppLogo({ size = "md", className = "" }) {
  const spec = SIZES[size] ?? SIZES.md;

  return (
    <span className={`app-logo app-logo--${size} ${className}`.trim()}>
      <img
        src={LOGO_SRC}
        alt={LOGO_ALT}
        height={spec.height}
        className="app-logo__img"
        decoding="async"
        style={{
          maxWidth: spec.maxWidth,
          objectFit: spec.fit ?? "contain",
          objectPosition: spec.position,
        }}
      />
    </span>
  );
}
