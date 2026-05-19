import Skeleton from "./Skeleton";

/**
 * Lignes squelette pour un tableau (aperçu du contenu à venir).
 */
export default function TableSkeleton({
  rows = 6,
  columns = 5,
  withActions = false,
  actionColumnIndex = null,
}) {
  const actionCol = actionColumnIndex ?? columns - 1;

  return Array.from({ length: rows }, (_, row) => (
    <tr key={row} className="skeleton-row">
      {Array.from({ length: columns }, (_, col) => (
        <td key={col}>
          {withActions && col === actionCol ? (
            <div className="skeleton-table-actions">
              <Skeleton width={32} height={32} />
              <Skeleton width={32} height={32} />
              <Skeleton width={32} height={32} />
            </div>
          ) : col === 0 ? (
            <>
              <Skeleton width="72%" height={14} block />
              <Skeleton width="48%" height={10} block style={{ marginTop: 8 }} />
            </>
          ) : col === columns - 1 && !withActions ? (
            <Skeleton width="55%" height={14} block />
          ) : (
            <Skeleton width={col % 2 === 0 ? "85%" : "62%"} height={14} block />
          )}
        </td>
      ))}
    </tr>
  ));
}
