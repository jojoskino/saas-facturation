import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../styles/auth-pages.css";
import { apiFetch, setStoredToken } from "../api/client";
import PasswordField from "../components/PasswordField";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await apiFetch("/api/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      setStoredToken(data.token);
      navigate("/app", { replace: true });
    } catch (err) {
      const msg =
        err.body?.errors?.email?.[0] ||
        err.body?.message ||
        err.message ||
        "Connexion impossible.";
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
            <h2 className="auth-hero-title">Bienvenue sur Facturo</h2>
            <p className="auth-hero-line">Gérez vos devis et factures simplement.</p>
          </div>
          <div className="auth-hero-foot">Facturo</div>
        </aside>

        <div className="auth-panel">
          <div className="auth-card">
            <Link className="auth-back" to="/">
              <i className="fa-solid fa-arrow-left" aria-hidden />
              Retour au site
            </Link>
            <h1>Connexion</h1>
            <p className="subtitle">Entrez vos identifiants.</p>

            {error ? <div className="auth-error">{error}</div> : null}

            <form onSubmit={onSubmit} className="auth-form-box">
              <div className="auth-field">
                <label htmlFor="login-email">Email professionnel</label>
              <div className="auth-input-wrap">
                <i className="fa-solid fa-envelope auth-input-icon" aria-hidden />
                <input
                  id="login-email"
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
                id="login-password"
                label="Mot de passe"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Votre mot de passe"
                autoComplete="current-password"
              />
              <a href="#" className="auth-forgot" onClick={(e) => e.preventDefault()}>
                Mot de passe oublié ?
              </a>
              <button className="auth-submit" type="submit" disabled={loading}>
                {loading ? "Connexion…" : "Se connecter"}
              </button>
            </form>

            <p className="auth-footer">
              Pas encore de compte ? <Link to="/register">Créer un compte</Link>
            </p>
          </div>
        </div>
      </div>      
    </div>
  );
}
