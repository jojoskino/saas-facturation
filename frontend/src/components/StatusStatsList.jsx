/** Liste de statistiques par statut — libellés colorés, sans barres ni badges. */
export default function StatusStatsList({ items, emptyLabel = "Aucune donnée sur la période." }) {
  const rows = items || [];

  if (rows.length === 0) {
    return <p className="stat-list-empty">{emptyLabel}</p>;
  }

  return (
    <>
      <style>{`
        .stat-list {
          list-style: none;
          margin: 0;
          padding: 0;
          display: grid;
          gap: 10px;
        }
        .stat-list li {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 12px;
          font-size: 13px;
        }
        .stat-list__label {
          font-weight: 600;
        }
        .stat-list__value {
          font-variant-numeric: tabular-nums;
          color: var(--color-text);
          font-weight: 700;
        }
        .stat-list-empty {
          margin: 0;
          font-size: 13px;
          color: var(--color-text-muted);
        }
      `}</style>
      <ul className="stat-list">
        {rows.map((item) => (
          <li key={item.key}>
            <span className="stat-list__label" style={{ color: item.color }}>
              {item.label}
            </span>
            <strong className="stat-list__value">{item.value}</strong>
          </li>
        ))}
      </ul>
    </>
  );
}
