import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { apiFetch } from "../../api/client";
import FormActions from "../../components/FormActions";
import { FieldLabel } from "../../components/AppFormControls";
import AccountAlerts from "../../components/account/AccountAlerts";
import ProfileSkeleton from "../../components/skeleton/ProfileSkeleton";
import { extractApiMessage, useAccountMe } from "../../hooks/useAccountMe";
import "../../styles/account-pages.css";

export default function ProfilePage() {
  const { t } = useTranslation("profile");
  const { user, loading, error, setError, setUser } = useAccountMe();
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", email: "" });

  useEffect(() => {
    if (!user) return;
    setForm({
      name: user.name || "",
      email: user.email || "",
    });
  }, [user]);

  function onChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function saveProfile(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const data = await apiFetch("/api/me", {
        method: "PUT",
        body: JSON.stringify({ name: form.name, email: form.email }),
      });
      if (data?.user) setUser(data.user);
      setForm({
        name: data?.user?.name || form.name,
        email: data?.user?.email || form.email,
      });
      setSuccess(data?.message || t("personal.success"));
    } catch (err) {
      setError(extractApiMessage(err, t("personal.error")));
    } finally {
      setSaving(false);
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
        </div>
      </div>

      <section className="account-form-card">
        <h3 className="account-form-card__title">{t("personal.title")}</h3>
        <p className="account-form-card__desc">{t("personal.desc")}</p>
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
            submitLabel={t("personal.save")}
            saving={saving}
            submitDisabled={loading}
            hideCancel
          />
        </form>
      </section>
    </div>
  );
}
