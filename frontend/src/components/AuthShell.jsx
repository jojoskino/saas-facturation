import { Link } from "react-router-dom";

export function AuthHero() {
  return (
    <aside className="auth-hero" aria-hidden="true">
      <img className="auth-hero-photo" src="/images/auth-hero.jpg" alt="" loading="lazy" decoding="async" />
      <div className="auth-hero-overlay" />
      <div className="auth-hero-caption">
        <p className="auth-hero-kicker">Facturo</p>
        <p className="auth-hero-quote">Facturation claire, professionnelle et sans friction.</p>
      </div>
    </aside>
  );
}

export function AuthBrand({ title, subtitle, children, footer }) {
  return (
    <div className="auth-page">
      <div className="auth-shell">
        <div className="auth-panel">
          <div className="auth-card">
            <Link className="auth-back" to="/">
              <i className="fa-solid fa-arrow-left" aria-hidden />
              Retour au site
            </Link>
            <div className="auth-logo">
              Factu<span>ro</span>
            </div>
            <h1>{title}</h1>
            {subtitle ? <p className="subtitle">{subtitle}</p> : null}
            {children}
            {footer ? <p className="auth-footer">{footer}</p> : null}
          </div>
        </div>
        <AuthHero />
      </div>
    </div>
  );
}
