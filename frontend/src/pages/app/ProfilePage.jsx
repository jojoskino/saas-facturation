import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { apiFetch } from "../../api/client";
import AppModal from "../../components/AppModal";
import FormActions from "../../components/FormActions";
import PlanBadge from "../../components/PlanBadge";
import { FieldLabel } from "../../components/AppFormControls";
import AccountAlerts from "../../components/account/AccountAlerts";
import ProfileSkeleton from "../../components/skeleton/ProfileSkeleton";
import { extractApiMessage, useAccountMe } from "../../hooks/useAccountMe";
import "../../styles/account-pages.css";

export default function ProfilePage() {
  const { t } = useTranslation("profile");
  const { user, loading, error, setError, setUser } = useAccountMe();
  const [success, setSuccess] = useState("");
  const [personalOpen, setPersonalOpen] = useState(false);
  const [securityOpen, setSecurityOpen] = useState(false);
  const [savingPersonal, setSavingPersonal] = useState(false);
  const [savingSecurity, setSavingSecurity] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    current_password: "",
    password: "",
    password_confirmation: "",
  });

  useEffect(() => {
    if (!user) return;
    setForm((prev) => ({
      ...prev,
      name: user.name || "",
      email: user.email || "",
    }));
  }, [user]);

  function onChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function saveProfile(e) {
    e.preventDefault();
    setSavingPersonal(true);
    setError("");
    setSuccess("");
    try {
      const data = await apiFetch("/api/me", {
        method: "PUT",
        body: JSON.stringify({ name: form.name, email: form.email }),
      });
      if (data?.user) setUser(data.user);
      setForm((prev) => ({
        ...prev,
        name: data?.user?.name || prev.name,
        email: data?.user?.email || prev.email,
      }));
      setSuccess(data?.message || t("personal.success"));
      setPersonalOpen(false);
    } catch (err) {
      setError(extractApiMessage(err, t("personal.error")));
    } finally {
      setSavingPersonal(false);
    }
  }

  async function savePassword(e) {
    e.preventDefault();
    setSavingSecurity(true);
    setError("");
    setSuccess("");
    try {
      const data = await apiFetch("/api/me/password", {
        method: "PUT",
        body: JSON.stringify({
          current_password: form.current_password,
          password: form.password,
          password_confirmation: form.password_confirmation,
        }),
      });
      setForm((prev) => ({ ...prev, current_password: "", password: "", password_confirmation: "" }));
      setSuccess(data?.message || t("security.success"));
      setSecurityOpen(false);
    } catch (err) {
      setError(extractApiMessage(err, t("security.error")));
    } finally {
      setSavingSecurity(false);
    }
  }

  const initial = (form.name || "U").trim().charAt(0).toUpperCase();

  if (loading && !user) {
    return <ProfileSkeleton />;
  }

  return (
    <div className="account-page">
      <header className="account-header">
        <h1>{t("title")}</h1>
        <p>{t("subtitle")}</p>
      </header>

      <AccountAlerts error={error} success={success} />

      <div className="account-profile-hero">
        <div className="account-avatar">{initial}</div>
        <div>
          <h2>{form.name || "—"}</h2>
          <p>{form.email || "—"}</p>
          {user?.plan ? <PlanBadge plan={user.plan} /> : null}
        </div>
      </div>

      <div className="profile-list">
        <button type="button" className="profile-row" onClick={() => setPersonalOpen(true)}>
          <span className="profile-row-icon" aria-hidden>
            <i className="fa-solid fa-id-card" />
          </span>
          <span className="profile-row-text">
            <strong>{t("personal.tileTitle")}</strong>
            <span>{t("personal.tileDesc")}</span>
          </span>
          <i className="fa-solid fa-chevron-right profile-row-chevron" aria-hidden />
        </button>

        <button type="button" className="profile-row" onClick={() => setSecurityOpen(true)}>
          <span className="profile-row-icon" aria-hidden>
            <i className="fa-solid fa-shield-halved" />
          </span>
          <span className="profile-row-text">
            <strong>{t("security.tileTitle")}</strong>
            <span>{t("security.tileDesc")}</span>
          </span>
          <i className="fa-solid fa-chevron-right profile-row-chevron" aria-hidden />
        </button>
      </div>

      <AppModal
        open={personalOpen}
        onClose={() => setPersonalOpen(false)}
        title={t("personal.modalTitle")}
        description={t("personal.modalDesc")}
      >
        <form className="account-form" onSubmit={saveProfile}>
          <div className="account-field account-field--full">
            <FieldLabel htmlFor="profile-name" required>
              {t("personal.name")}
            </FieldLabel>
            <input
              id="profile-name"
              name="name"
              value={form.name}
              onChange={onChange}
              placeholder={t("personal.namePlaceholder")}
              required
              disabled={loading}
            />
          </div>
          <div className="account-field account-field--full">
            <FieldLabel htmlFor="profile-email" required>
              {t("personal.email")}
            </FieldLabel>
            <input
              id="profile-email"
              type="email"
              name="email"
              value={form.email}
              onChange={onChange}
              placeholder={t("personal.emailPlaceholder")}
              required
              disabled={loading}
            />
          </div>
          <FormActions
            onCancel={() => setPersonalOpen(false)}
            submitLabel={t("personal.save")}
            saving={savingPersonal}
            submitDisabled={loading}
          />
        </form>
      </AppModal>

      <AppModal
        open={securityOpen}
        onClose={() => setSecurityOpen(false)}
        title={t("security.modalTitle")}
        description={t("security.modalDesc")}
      >
        <form className="account-form" onSubmit={savePassword}>
          <div className="account-field account-field--full">
            <FieldLabel htmlFor="current_password" required>
              {t("security.current")}
            </FieldLabel>
            <input
              id="current_password"
              type="password"
              name="current_password"
              value={form.current_password}
              onChange={onChange}
              autoComplete="current-password"
              required
            />
          </div>
          <div className="account-field">
            <FieldLabel htmlFor="password" required>
              {t("security.new")}
            </FieldLabel>
            <input
              id="password"
              type="password"
              name="password"
              value={form.password}
              onChange={onChange}
              autoComplete="new-password"
              required
              minLength={8}
            />
          </div>
          <div className="account-field">
            <FieldLabel htmlFor="password_confirmation" required>
              {t("security.confirm")}
            </FieldLabel>
            <input
              id="password_confirmation"
              type="password"
              name="password_confirmation"
              value={form.password_confirmation}
              onChange={onChange}
              autoComplete="new-password"
              required
              minLength={8}
            />
          </div>
          <p className="account-field account-field--full" style={{ margin: 0, fontSize: 12, color: "var(--color-text-muted)" }}>
            {t("security.hint")}
          </p>
          <FormActions
            onCancel={() => setSecurityOpen(false)}
            submitLabel={t("security.save")}
            saving={savingSecurity}
          />
        </form>
      </AppModal>
    </div>
  );
}
