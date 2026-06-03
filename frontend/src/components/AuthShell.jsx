import { Link } from "react-router-dom";
import AppLogo from "./AppLogo";

export function AuthBrand({ title, tagline, children, footer }) {
  return (
    <div className="auth-page">
      <div className="auth-frame auth-frame--glass">
        <div className="auth-split">
          <section className="auth-form-panel auth-panel--glass">
            <Link className="auth-back-link" to="/">
              <i className="fa-solid fa-arrow-left" aria-hidden />
              Retour à l&apos;accueil
            </Link>

            <div className="auth-form-inner">
              <div className="auth-mobile-logo">
                <AppLogo size="md" className="auth-brand-lockup-inline" />
                {tagline ? <p className="auth-brand-tagline auth-brand-tagline--mobile">{tagline}</p> : null}
              </div>
              <h1>{title}</h1>

              <div className="auth-form-box">{children}</div>
              {footer ? <p className="auth-foot">{footer}</p> : null}
            </div>
          </section>

          <aside className="auth-brand-panel auth-panel--glass" aria-label="LAFACTURE">
            <div className="auth-brand-lockup">
              <AppLogo size="lg" className="auth-brand-lockup-inline" />
              {tagline ? <p className="auth-brand-tagline">{tagline}</p> : null}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
