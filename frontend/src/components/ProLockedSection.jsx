import { Link } from "react-router-dom";

/** Section Pro verrouillée — overlay léger, sans masquer brutalement le contenu. */
export default function ProLockedSection({ title, hint, children, locked, upgradeLabel = "Passer à Pro" }) {
  return (
    <section className={`pro-lock${locked ? " pro-lock--locked" : ""}`}>
      <style>{`
        .pro-lock {
          border-radius: 14px;
          background: var(--glass-surface-strong, #fff);
          border: 1px solid var(--color-border);
          padding: 16px;
          min-height: 0;
          display: flex;
          flex-direction: column;
          height: 100%;
        }
        .pro-lock__head {
          margin-bottom: 12px;
        }
        .pro-lock__head h3 {
          margin: 0;
          font-family: var(--heading);
          font-size: 1rem;
        }
        .pro-lock__hint {
          margin: 4px 0 0;
          font-size: 12px;
          color: var(--color-text-muted);
          line-height: 1.45;
        }
        .pro-lock__body {
          position: relative;
          min-height: 0;
          flex: 1;
          display: flex;
          flex-direction: column;
        }
        .pro-lock__content {
          min-height: 0;
          flex: 1;
        }
        .pro-lock__gate {
          display: none;
        }
        .pro-lock--locked .pro-lock__gate {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 10px;
          flex: 1;
          min-height: 208px;
          padding: 28px 20px;
          border-radius: 12px;
          border: 1px dashed #cbd5e1;
          background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
          text-align: center;
        }
        .pro-lock__gate i {
          font-size: 1.2rem;
          color: #64748b;
        }
        .pro-lock__gate p {
          margin: 0;
          font-size: 13px;
          font-weight: 600;
          color: #475569;
          line-height: 1.45;
          max-width: 300px;
        }
        .pro-lock__gate a {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          margin-top: 2px;
          padding: 8px 14px;
          border-radius: 999px;
          background: #14213d;
          color: #fff;
          font-size: 12px;
          font-weight: 700;
          text-decoration: none;
        }
        .pro-lock__gate a:hover { background: #0f1a2e; }
      `}</style>
      <div className="pro-lock__head">
        {title ? <h3>{title}</h3> : null}
        {hint ? <p className="pro-lock__hint">{hint}</p> : null}
      </div>
      <div className="pro-lock__body">
        {locked ? (
          <div className="pro-lock__gate">
            <i className="fa-solid fa-lock" aria-hidden />
            <p>Fonctionnalité réservée à l&apos;offre Pro.</p>
            <Link to="/app/abonnement?plan=pro&checkout=start">
              <i className="fa-solid fa-gem" aria-hidden /> {upgradeLabel}
            </Link>
          </div>
        ) : (
          <div className="pro-lock__content">{children}</div>
        )}
      </div>
    </section>
  );
}
