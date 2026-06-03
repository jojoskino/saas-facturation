/** Logo LAFACTURE — icône + wordmark (même rendu partout dans l’app). */
import React from "react";

export default function AppLogo({ size = "md", showText = true, className = "" }) {
  const markSize = size === "sm" ? 28 : size === "lg" ? 40 : 32;

  return (
    <span className={`app-logo app-logo--${size} ${className}`.trim()}>
      <img
        src="/favicon.svg"
        alt=""
        width={markSize}
        height={markSize}
        className="app-logo__mark"
        decoding="async"
      />
      {showText ? (
        <span className="app-logo__text">
          LA<span>FACTURE</span>
        </span>
      ) : null}
    </span>
  );
}
