import { Link, useNavigate } from "react-router-dom";

export default function NotFound({ inApp = false }) {
  const navigate = useNavigate();

  return (
    <div className="nf-page">
      <style>{`
        .nf-page {
          min-height: ${inApp ? "calc(100vh - 120px)" : "100vh"};
          display: grid;
          place-items: center;
          padding: 24px;
          font-family: var(--sans);
          color: var(--color-text);
          background: ${inApp ? "transparent" : "var(--color-bg-subtle)"};
        }
        .nf-card {
          width: min(560px, 100%);
          border-radius: 14px;
          border: 1px solid var(--color-border);
          background: #fff;
          box-shadow: 0 12px 30px rgba(15, 23, 42, 0.09);
          padding: 24px;
          text-align: center;
        }
        .nf-code {
          font-size: 3rem;
          font-weight: 800;
          line-height: 1;
          letter-spacing: -0.03em;
          margin: 0;
          color: var(--color-primary);
          font-family: var(--heading);
        }
        .nf-title {
          margin: 10px 0 6px;
          font-size: 1.25rem;
          font-family: var(--heading);
        }
        .nf-sub {
          margin: 0;
          color: var(--color-text-muted);
          font-size: 14px;
        }
        .nf-actions {
          margin-top: 18px;
          display: flex;
          gap: 8px;
          justify-content: center;
          flex-wrap: wrap;
        }
        .nf-btn {
          border-radius: 10px;
          border: 1px solid var(--color-border-strong);
          background: #fff;
          color: var(--color-text);
          padding: 9px 12px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .nf-btn--primary {
          background: var(--color-primary);
          color: var(--color-primary-contrast);
          border-color: var(--color-primary);
        }
      `}</style>
      <section className="nf-card" role="status" aria-live="polite">
        <p className="nf-code">404</p>
        <h1 className="nf-title">Page introuvable</h1>
        <p className="nf-sub">Cette page n'existe pas ou a été déplacée. Vous pouvez continuer sans quitter le site.</p>
        <div className="nf-actions">
          {inApp ? (
            <button type="button" className="nf-btn nf-btn--primary" onClick={() => navigate("/app")}>
              <i className="fa-solid fa-house" /> Retour au tableau de bord
            </button>
          ) : (
            <Link className="nf-btn nf-btn--primary" to="/">
              <i className="fa-solid fa-house" /> Retour à l'accueil
            </Link>
          )}
          <button type="button" className="nf-btn" onClick={() => navigate(-1)}>
            <i className="fa-solid fa-arrow-left" /> Page précédente
          </button>
          <Link className="nf-btn" to={inApp ? "/app/clients" : "/login"}>
            <i className="fa-solid fa-compass" /> Continuer
          </Link>
        </div>
      </section>
    </div>
  );
}
