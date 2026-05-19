export default function AccountAlerts({ error, success }) {
  return (
    <>
      {error ? <div className="account-banner account-banner--error">{error}</div> : null}
      {success ? <div className="account-banner account-banner--success">{success}</div> : null}
    </>
  );
}
