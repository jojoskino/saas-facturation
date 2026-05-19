import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../styles/auth-pages.css";
import { apiFetch, setStoredToken } from "../api/client";
import { AuthBrand } from "../components/AuthShell";
import PasswordField from "../components/PasswordField";
import { FieldLabel } from "../components/AppFormControls";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
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
    <AuthBrand
      title="Connexion"
      subtitle="Accédez à votre espace de facturation."
      footer={
        <>
          Pas encore de compte ? <Link to="/register">Créer un compte</Link>
        </>
      }
    >
      {error ? <div className="auth-error">{error}</div> : null}

      <form onSubmit={onSubmit} className="auth-form-box">
        <div className="auth-field">
          <FieldLabel htmlFor="login-email" required>
            E-mail
          </FieldLabel>
          <div className="auth-input-wrap">
            <i className="fa-solid fa-envelope auth-input-icon" aria-hidden />
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              placeholder="vous@exemple.com"
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

        <div className="auth-row">
          <label className="auth-check">
            <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
            <span>Se souvenir de moi</span>
          </label>
          <Link to="/forgot-password" className="auth-forgot">
            Mot de passe oublié ?
          </Link>
        </div>

        <button className="auth-submit" type="submit" disabled={loading}>
          {loading ? "Connexion..." : "Se connecter"}
        </button>
      </form>
    </AuthBrand>
  );
}
