import Skeleton from "./Skeleton";
import "../../styles/landing.css";

export default function LandingSkeleton() {
  return (
    <div className="facturo landing-skeleton" aria-busy="true" aria-label="Chargement de la page d'accueil">
      <main>
        <section className="hero">
          <header className="navbar">
            <div className="nav-shell">
              <div className="nav-pill">
                <Skeleton width={138} height={32} />
                <div className="landing-skeleton__nav-links" aria-hidden>
                  <Skeleton width={100} height={14} />
                  <Skeleton width={48} height={14} />
                </div>
                <div className="landing-skeleton__nav-actions" aria-hidden>
                  <Skeleton width={96} height={36} style={{ borderRadius: 999 }} />
                  <Skeleton width={110} height={36} style={{ borderRadius: 999 }} />
                </div>
              </div>
            </div>
          </header>
          <div className="container hero-grid">
            <div className="hero-copy">
              <Skeleton width="85%" height={42} block />
              <Skeleton width="70%" height={42} block style={{ marginTop: 8 }} />
              <Skeleton width="92%" height={16} block style={{ marginTop: 20 }} />
              <Skeleton width="78%" height={16} block style={{ marginTop: 8 }} />
              <div className="landing-skeleton__hero-cta">
                <Skeleton width={180} height={44} style={{ borderRadius: 12 }} />
                <Skeleton width={140} height={44} style={{ borderRadius: 12 }} />
              </div>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="container">
            <Skeleton width="55%" height={28} block style={{ margin: "0 auto 28px" }} />
            <div className="features">
              {Array.from({ length: 6 }).map((_, i) => (
                <article key={i} className="card">
                  <Skeleton width={40} height={40} style={{ borderRadius: 10 }} />
                  <Skeleton width="70%" height={18} block style={{ marginTop: 14 }} />
                  <Skeleton width="100%" height={12} block style={{ marginTop: 10 }} />
                  <Skeleton width="88%" height={12} block style={{ marginTop: 6 }} />
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>

      <style>{`
        .landing-skeleton .nav-pill {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          flex-wrap: wrap;
        }
        .landing-skeleton__nav-links,
        .landing-skeleton__nav-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .landing-skeleton__hero-cta {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin-top: 24px;
        }
        @media (max-width: 1000px) {
          .landing-skeleton__nav-links { display: none; }
        }
      `}</style>
    </div>
  );
}
