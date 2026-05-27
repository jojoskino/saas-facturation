import Skeleton from "./Skeleton";
import TableSkeleton from "./TableSkeleton";

export default function ReportsSkeleton() {
  return (
    <div className="rpt-skeleton" aria-busy="true" aria-label="Chargement des rapports">
      <div className="rpt-toolbar">
        <Skeleton width={200} height={36} />
        <Skeleton width={120} height={36} />
      </div>
      <div className="rpt-grid">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rpt-kpi">
            <Skeleton width="65%" height={11} block />
            <Skeleton width="50%" height={26} block style={{ marginTop: 12 }} />
          </div>
        ))}
      </div>
      <div className="rpt-panels">
        <section className="rpt-panel">
          <Skeleton width="40%" height={18} block />
          <Skeleton width="100%" height={220} block style={{ marginTop: 16, borderRadius: 12 }} />
        </section>
        <section className="rpt-panel">
          <Skeleton width="40%" height={18} block />
          <Skeleton width="100%" height={180} block style={{ marginTop: 16, borderRadius: 12 }} />
        </section>
      </div>
      <section className="rpt-panel" style={{ marginTop: 16 }}>
        <Skeleton width="30%" height={18} block />
        <TableSkeleton rows={5} columns={4} />
      </section>
    </div>
  );
}
