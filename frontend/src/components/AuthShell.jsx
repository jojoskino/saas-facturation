import { Link } from "react-router-dom";

const AUTH_HINTS = [
  "Factures et devis conformes",
  "Suivi des paiements en direct",
  "Relances automatiques (Pro)",
];

export function AuthBrand({ title, subtitle, children, footer }) {
  return (
    <div className="auth-page auth-page--soft">
      <div className="auth-soft-glow auth-soft-glow--1" aria-hidden />
      <div className="auth-soft-glow auth-soft-glow--2" aria-hidden />

      <div className="auth-soft-layout">
        <header className="auth-soft-header">
          <Link className="auth-soft-logo" to="/">
            Factu<span>ro</span>
          </Link>
          <Link className="auth-soft-home" to="/">
            <i className="fa-solid fa-arrow-left" aria-hidden />
            Accueil
          </Link>
        </header>

        <div className="auth-soft-card">
          <h1>{title}</h1>
          {subtitle ? <p className="auth-soft-sub">{subtitle}</p> : null}
          <div className="auth-form-box">{children}</div>
          {footer ? <p className="auth-soft-foot">{footer}</p> : null}
        </div>

        <ul className="auth-soft-hints">
          {AUTH_HINTS.map((text) => (
            <li key={text}>{text}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
