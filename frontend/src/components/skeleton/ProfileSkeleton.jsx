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

      <div className="account-form-card">
        <Skeleton width="40%" height={16} block />
        <Skeleton width="70%" height={12} block style={{ marginTop: 8, marginBottom: 18 }} />
        <Skeleton width="100%" height={40} block style={{ marginBottom: 14 }} />
        <Skeleton width="100%" height={40} block style={{ marginBottom: 18 }} />
        <Skeleton width={140} height={38} block />
      </div>
    </div>
  );
}
