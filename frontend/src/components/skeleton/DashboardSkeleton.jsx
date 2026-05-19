import Skeleton from "./Skeleton";
import TableSkeleton from "./TableSkeleton";

export default function DashboardSkeleton() {
  return (
    <div className="dash-skeleton" aria-busy="true" aria-label="Chargement du tableau de bord">
      <div className="dash-grid">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="dash-kpi dash-kpi--skeleton">
            <Skeleton width="70%" height={11} block />
            <Skeleton width="55%" height={28} block style={{ marginTop: 12 }} />
            <Skeleton width="40%" height={12} block style={{ marginTop: 14 }} />
          </div>
        ))}
      </div>

      <div className="dash-layout">
        <section className="dash-chart dash-chart--skeleton">
          <Skeleton width="55%" height={16} block />
          <Skeleton width="30%" height={22} block style={{ marginTop: 10 }} />
          <Skeleton width="100%" height={230} block style={{ marginTop: 18, borderRadius: 12 }} />
        </section>
        <section className="dash-side dash-side--skeleton">
          <Skeleton width="50%" height={14} block />
          <Skeleton width="100%" height={36} block style={{ marginTop: 12 }} />
          <Skeleton width="100%" height={36} block style={{ marginTop: 8 }} />
          <Skeleton width="100%" height={80} block style={{ marginTop: 16 }} />
        </section>
      </div>

      <div className="dash-panels">
        {[0, 1].map((panel) => (
          <section key={panel} className="dash-panel dash-panel--skeleton">
            <div className="dash-chart-head">
              <Skeleton width="40%" height={18} block />
              <Skeleton width={72} height={28} />
            </div>
            <table className="dash-table">
              <thead>
                <tr>
                  {Array.from({ length: 4 }).map((_, i) => (
                    <th key={i}>
                      <Skeleton width="60%" height={10} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <TableSkeleton rows={4} columns={4} />
              </tbody>
            </table>
          </section>
        ))}
      </div>

      <style>{`
        .dash-skeleton .dash-kpi--skeleton {
          pointer-events: none;
        }
        .dash-chart--skeleton,
        .dash-side--skeleton,
        .dash-panel--skeleton {
          border-radius: 14px;
          border: 1px solid var(--color-border);
          background: #fff;
          padding: 16px;
        }
        .dash-layout {
          display: grid;
          grid-template-columns: 1.4fr 0.9fr;
          gap: 14px;
          margin-top: 14px;
        }
        @media (max-width: 1000px) {
          .dash-layout { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}
