import { Link } from "react-router-dom";

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
                <span className="auth-brand-mark auth-brand-mark--sm" aria-hidden>
                  <i className="fa-solid fa-file-invoice" />
                </span>
                <p className="auth-brand-name auth-brand-name--sm">
                  Factu<span>ro</span>
                </p>
                {tagline ? <p className="auth-brand-tagline auth-brand-tagline--mobile">{tagline}</p> : null}
              </div>
              <h1>{title}</h1>

              <div className="auth-form-box">{children}</div>
              {footer ? <p className="auth-foot">{footer}</p> : null}
            </div>
          </section>

          <aside className="auth-brand-panel auth-panel--glass" aria-label="Facturo">
            <div className="auth-brand-lockup">
              <span className="auth-brand-mark" aria-hidden>
                <i className="fa-solid fa-file-invoice" />
              </span>
              <p className="auth-brand-name">
                Factu<span>ro</span>
              </p>
              {tagline ? <p className="auth-brand-tagline">{tagline}</p> : null}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
