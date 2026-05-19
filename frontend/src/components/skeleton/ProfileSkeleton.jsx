import Skeleton from "./Skeleton";

export default function ProfileSkeleton() {
  return (
    <div className="account-page" aria-busy="true" aria-label="Chargement du profil">
      <header className="account-header">
        <Skeleton width={180} height={28} block />
        <Skeleton width="min(420px, 90%)" height={14} block style={{ marginTop: 10 }} />
      </header>

      <div className="account-profile-hero">
        <Skeleton circle width={56} height={56} />
        <div style={{ flex: 1 }}>
          <Skeleton width={160} height={18} block />
          <Skeleton width={220} height={13} block style={{ marginTop: 10 }} />
        </div>
      </div>

      <div className="profile-list">
        {[0, 1].map((row) => (
          <div key={row} className="profile-row profile-row--skeleton">
            <Skeleton width={40} height={40} style={{ borderRadius: 10, flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <Skeleton width="50%" height={14} block />
              <Skeleton width="72%" height={11} block style={{ marginTop: 8 }} />
            </div>
            <Skeleton width={12} height={12} />
          </div>
        ))}
      </div>
      <style>{`
        .profile-row--skeleton {
          pointer-events: none;
          cursor: default;
        }
      `}</style>
    </div>
  );
}
