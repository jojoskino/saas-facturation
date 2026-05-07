import { useEffect, useState } from "react";
import { apiFetch } from "../../api/client";

export default function ProfilePage() {
  const [tab, setTab] = useState("profile");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    current_password: "",
    password: "",
    password_confirmation: "",
    locale: "fr",
    timezone: "Africa/Abidjan",
    notifications_email: true,
  });

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError("");
      try {
        const me = await apiFetch("/api/me");
        setForm((prev) => ({
          ...prev,
          name: me?.name || "",
          email: me?.email || "",
        }));
      } catch (err) {
        setError(err?.message || "Impossible de charger le profil.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function onChange(e) {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
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
      setForm((prev) => ({ ...prev, name: data?.user?.name || prev.name, email: data?.user?.email || prev.email }));
      setSuccess(data?.message || "Profil mis à jour.");
    } catch (err) {
      setError(extractApiMessage(err, "Impossible de mettre à jour le profil."));
    } finally {
      setSaving(false);
    }
  }

  async function savePassword(e) {
    e.preventDefault();
    setSaving(true);
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
      setSuccess(data?.message || "Mot de passe mis à jour.");
    } catch (err) {
      setError(extractApiMessage(err, "Impossible de mettre à jour le mot de passe."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="profile-page">
      <style>{`
        .profile-page { display: grid; gap: 16px; color: var(--color-text); font-family: var(--sans); }
        .profile-grid {
          display: grid;
          grid-template-columns: 260px 1fr;
          gap: 16px;
          align-items: start;
        }
        .profile-card {
          border-radius: 14px;
          background: #fff;
          border: 1px solid var(--color-border);
          padding: 16px;
          box-shadow: 0 8px 22px rgba(20, 33, 61, 0.05);
        }
        .profile-summary {
          border-radius: 14px;
          background: linear-gradient(125deg, #fff9ef 0%, #fff 72%);
          border: 1px solid #f1e2be;
          padding: 16px;
          position: sticky;
          top: 78px;
        }
        .profile-avatar {
          width: 52px;
          height: 52px;
          border-radius: 12px;
          background: #14213d;
          color: #fff;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          margin-bottom: 10px;
        }
        .profile-summary h3 { margin: 0; font-family: var(--heading); font-size: 1.05rem; }
        .profile-summary p { margin: 6px 0 0; font-size: 13px; color: var(--color-text-muted); }
        .profile-head h2 { margin: 0; font-family: var(--heading); }
        .profile-sub { margin-top: 6px; color: var(--color-text-muted); font-size: 14px; }
        .profile-tabs { display: flex; gap: 8px; flex-wrap: wrap; }
        .profile-tab {
          border-radius: 10px;
          border: 1px solid var(--color-border-strong);
          background: #fff;
          padding: 8px 12px;
          cursor: pointer;
          font-weight: 700;
          font-size: 13px;
          color: var(--color-text);
        }
        .profile-tab.active {
          border-color: #fca311;
          background: #fff7ea;
          color: #14213d;
        }
        .profile-form {
          display: grid;
          gap: 10px;
          margin-top: 10px;
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
        .profile-field { display: grid; gap: 6px; }
        .profile-field label {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--color-text-muted);
          font-weight: 700;
        }
        .profile-field input, .profile-field select {
          border-radius: 10px;
          border: 1px solid var(--color-border-strong);
          padding: 10px 12px;
          font: 14px/1.3 var(--sans);
          color: var(--color-text);
          background: #fff;
        }
        .profile-field input::placeholder {
          color: #94a3b8;
        }
        .profile-field input:focus::placeholder {
          color: transparent;
        }
        .profile-field--full { grid-column: 1 / -1; }
        .profile-switch {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border: 1px solid var(--color-border);
          border-radius: 10px;
          padding: 10px 12px;
        }
        .profile-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 6px; }
        .profile-btn {
          border-radius: 10px;
          border: 1px solid var(--color-border-strong);
          background: #fff;
          color: var(--color-text);
          padding: 9px 12px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
        }
        .profile-btn--primary {
          background: var(--color-primary);
          color: #fff;
          border-color: var(--color-primary);
        }
        .profile-banner {
          border-radius: 10px;
          padding: 10px 12px;
          font-size: 13px;
          border: 1px solid;
        }
        .profile-banner--error { background: #fff3f0; border-color: #f4c0b6; color: #b3412d; }
        .profile-banner--success { background: #effaf2; border-color: #b8e2c2; color: #1c6a33; }
        @media (max-width: 900px) {
          .profile-grid { grid-template-columns: 1fr; }
          .profile-summary { position: static; }
          .profile-form { grid-template-columns: 1fr; }
        }
      `}</style>

      <section className="profile-card profile-head">
        <h2>Profil et paramètres</h2>
        <p className="profile-sub">Gérez vos informations personnelles, votre sécurité et vos préférences.</p>
      </section>

      {error ? <div className="profile-banner profile-banner--error">{error}</div> : null}
      {success ? <div className="profile-banner profile-banner--success">{success}</div> : null}

      <div className="profile-grid">
        <aside className="profile-summary">
          <div className="profile-avatar">{(form.name || "U").trim().charAt(0).toUpperCase()}</div>
          <h3>{form.name || "Utilisateur"}</h3>
          <p>{form.email || "—"}</p>
          <div className="profile-tabs" style={{ marginTop: 14 }}>
            <button className={`profile-tab ${tab === "profile" ? "active" : ""}`} type="button" onClick={() => setTab("profile")}>
              Profil
            </button>
            <button className={`profile-tab ${tab === "security" ? "active" : ""}`} type="button" onClick={() => setTab("security")}>
              Sécurité
            </button>
            <button className={`profile-tab ${tab === "settings" ? "active" : ""}`} type="button" onClick={() => setTab("settings")}>
              Paramètres
            </button>
          </div>
        </aside>

        <section className="profile-card">

        {tab === "profile" ? (
          <form className="profile-form" onSubmit={saveProfile}>
            <div className="profile-field profile-field--full">
              <label htmlFor="profile-name">Nom complet</label>
              <input id="profile-name" name="name" value={form.name} onChange={onChange} placeholder="Ex: Amina Traoré" required disabled={loading} />
            </div>
            <div className="profile-field profile-field--full">
              <label htmlFor="profile-email">Email</label>
              <input id="profile-email" type="email" name="email" value={form.email} onChange={onChange} placeholder="exemple@entreprise.com" required disabled={loading} />
            </div>
            <div className="profile-actions profile-field--full">
              <button className="profile-btn profile-btn--primary" type="submit" disabled={saving || loading}>
                {saving ? "Enregistrement..." : "Enregistrer"}
              </button>
            </div>
          </form>
        ) : null}

        {tab === "security" ? (
          <form className="profile-form" onSubmit={savePassword}>
            <div className="profile-field profile-field--full">
              <label htmlFor="current_password">Mot de passe actuel</label>
              <input
                id="current_password"
                type="password"
                name="current_password"
                value={form.current_password}
                onChange={onChange}
                placeholder="Votre mot de passe actuel"
                required
              />
            </div>
            <div className="profile-field">
              <label htmlFor="password">Nouveau mot de passe</label>
              <input
                id="password"
                type="password"
                name="password"
                value={form.password}
                onChange={onChange}
                placeholder="8+ caractères, lettre, chiffre, symbole"
                required
                minLength={8}
                pattern="^(?=.*[A-Za-z])(?=.*\\d)(?=.*[^A-Za-z\\d]).{8,}$"
                title="Minimum 8 caractères avec au moins une lettre, un chiffre et un symbole."
              />
            </div>
            <div className="profile-field">
              <label htmlFor="password_confirmation">Confirmation mot de passe</label>
              <input
                id="password_confirmation"
                type="password"
                name="password_confirmation"
                value={form.password_confirmation}
                onChange={onChange}
                placeholder="Retapez le nouveau mot de passe"
                required
                minLength={8}
              />
            </div>
            <div className="profile-actions profile-field--full">
              <button className="profile-btn profile-btn--primary" type="submit" disabled={saving}>
                {saving ? "Enregistrement..." : "Mettre à jour le mot de passe"}
              </button>
            </div>
          </form>
        ) : null}

        {tab === "settings" ? (
          <form className="profile-form" onSubmit={(e) => e.preventDefault()}>
            <div className="profile-field">
              <label htmlFor="locale">Langue</label>
              <select id="locale" name="locale" value={form.locale} onChange={onChange}>
                <option value="fr">Français</option>
                <option value="en">English</option>
              </select>
            </div>
            <div className="profile-field">
              <label htmlFor="timezone">Fuseau horaire</label>
              <select id="timezone" name="timezone" value={form.timezone} onChange={onChange}>
                <option value="Africa/Abidjan">Afrique/Abidjan (UTC+0)</option>
                <option value="Africa/Douala">Afrique/Douala (UTC+1)</option>
                <option value="Europe/Paris">Europe/Paris (UTC+1/+2)</option>
              </select>
            </div>
            <label className="profile-switch profile-field--full">
              Notifications par e-mail
              <input type="checkbox" name="notifications_email" checked={form.notifications_email} onChange={onChange} />
            </label>
            <div className="profile-actions profile-field--full">
              <button className="profile-btn profile-btn--primary" type="button" onClick={() => setSuccess("Paramètres enregistrés localement.")}>
                Enregistrer les paramètres
              </button>
            </div>
          </form>
        ) : null}
        </section>
      </div>
    </div>
  );
}

function extractApiMessage(error, fallback) {
  if (error?.body?.errors && typeof error.body.errors === "object") {
    const firstError = Object.values(error.body.errors)[0];
    if (Array.isArray(firstError) && firstError[0]) return String(firstError[0]);
  }
  if (error?.body?.message) return String(error.body.message);
  return error?.message || fallback;
}
