import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../styles/auth-pages.css";
import { apiFetch, setStoredToken } from "../api/client";
import PasswordField from "../components/PasswordField";

export default function Register() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await apiFetch("/api/register", {
        method: "POST",
        body: JSON.stringify({
          name,
          email,
          password,
          password_confirmation: passwordConfirmation,
        }),
      });
      setStoredToken(data.token);
      navigate("/app", { replace: true });
    } catch (err) {
      const body = err.body;
      let msg = body?.message || err.message || "Inscription impossible.";
      if (body?.errors) {
        const first = Object.values(body.errors)[0];
        if (Array.isArray(first) && first[0]) msg = first[0];
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-shell">
        <aside className="auth-hero">
          <div className="auth-brand">
            Factu<span>ro</span>
          </div>
          <div className="auth-hero-inner">
            <h2 className="auth-hero-title">Rejoignez Facturo</h2>
            <p className="auth-hero-line">Créez votre compte en quelques secondes.</p>
          </div>
          <div className="auth-hero-foot">Facturo</div>
        </aside>

        <div className="auth-panel">
          <div className="auth-card">
            <Link className="auth-back" to="/">
              <i className="fa-solid fa-arrow-left" aria-hidden />
              Retour au site
            </Link>
            <h1>Créer un compte</h1>
            <p className="subtitle">Renseignez vos informations.</p>

            {error ? <div className="auth-error">{error}</div> : null}

            <form onSubmit={onSubmit} className="auth-form-box">
              <div className="auth-field">
                <label htmlFor="reg-name">Nom complet</label>
                <div className="auth-input-wrap">
                  <i className="fa-solid fa-user auth-input-icon" aria-hidden />
                  <input
                    id="reg-name"
                    type="text"
                    autoComplete="name"
                    placeholder="Ex: Aminata Diop"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="auth-field">
                <label htmlFor="reg-email">Email professionnel</label>
                <div className="auth-input-wrap">
                  <i className="fa-solid fa-envelope auth-input-icon" aria-hidden />
                  <input
                    id="reg-email"
                    type="email"
                    autoComplete="email"
                    placeholder="exemple@entreprise.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
              <PasswordField
                id="reg-password"
                label="Mot de passe"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="8+ caractères, lettre, chiffre, symbole"
                autoComplete="new-password"
                minLength={8}
                pattern="^(?=.*[A-Za-z])(?=.*\\d)(?=.*[^A-Za-z\\d]).{8,}$"
                title="Minimum 8 caractères avec au moins une lettre, un chiffre et un symbole."
              />
              <PasswordField
                id="reg-password2"
                label="Confirmation"
                value={passwordConfirmation}
                onChange={(e) => setPasswordConfirmation(e.target.value)}
                placeholder="Retapez le mot de passe"
                autoComplete="new-password"
                minLength={8}
                pattern="^(?=.*[A-Za-z])(?=.*\\d)(?=.*[^A-Za-z\\d]).{8,}$"
                title="Minimum 8 caractères avec au moins une lettre, un chiffre et un symbole."
              />
              <button className="auth-submit" type="submit" disabled={loading}>
                {loading ? "Création…" : "Créer mon compte"}
              </button>
            </form>

            <p className="auth-footer">
              Déjà inscrit ? <Link to="/login">Se connecter</Link>
            </p>
          </div>
        </div>
      </div>      
    </div>
  );
}
