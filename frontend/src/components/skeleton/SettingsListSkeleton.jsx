import Skeleton from "./Skeleton";

export default function SettingsListSkeleton() {
  return (
    <div className="settings-list" aria-busy="true" aria-label="Chargement des paramètres">
      {[0, 1].map((row) => (
        <div key={row} className="settings-row settings-row--skeleton">
          <Skeleton width={40} height={40} style={{ borderRadius: 10, flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <Skeleton width="45%" height={14} block />
            <Skeleton width="70%" height={11} block style={{ marginTop: 8 }} />
          </div>
          <Skeleton width={12} height={12} />
        </div>
      ))}
      <style>{`
        .settings-row--skeleton {
          pointer-events: none;
          cursor: default;
        }
      `}</style>
    </div>
  );
}
