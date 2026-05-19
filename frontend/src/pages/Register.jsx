import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../styles/auth-pages.css";
import { apiFetch, setStoredToken } from "../api/client";
import { AuthBrand } from "../components/AuthShell";
import PasswordField from "../components/PasswordField";
import { FieldLabel } from "../components/AppFormControls";

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
    <AuthBrand
      title="Créer un compte"
      subtitle="Gérez devis et factures en quelques minutes."
      footer={
        <>
          Déjà inscrit ? <Link to="/login">Se connecter</Link>
        </>
      }
    >
      {error ? <div className="auth-error">{error}</div> : null}

      <form onSubmit={onSubmit} className="auth-form-box">
        <div className="auth-field">
          <FieldLabel htmlFor="reg-name" required>
            Nom complet
          </FieldLabel>
          <div className="auth-input-wrap">
            <i className="fa-solid fa-user auth-input-icon" aria-hidden />
            <input
              id="reg-name"
              type="text"
              autoComplete="name"
              placeholder="Prénom et nom"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="auth-field">
          <FieldLabel htmlFor="reg-email" required>
            E-mail
          </FieldLabel>
          <div className="auth-input-wrap">
            <i className="fa-solid fa-envelope auth-input-icon" aria-hidden />
            <input
              id="reg-email"
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
          id="reg-password"
          label="Mot de passe"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="8 caractères minimum"
          autoComplete="new-password"
          minLength={8}
          pattern="^(?=.*[A-Za-z])(?=.*\\d)(?=.*[^A-Za-z\\d]).{8,}$"
          title="Au moins 8 caractères avec une lettre, un chiffre et un symbole."
        />

        <PasswordField
          id="reg-password2"
          label="Confirmer le mot de passe"
          value={passwordConfirmation}
          onChange={(e) => setPasswordConfirmation(e.target.value)}
          placeholder="Répétez le mot de passe"
          autoComplete="new-password"
          minLength={8}
          pattern="^(?=.*[A-Za-z])(?=.*\\d)(?=.*[^A-Za-z\\d]).{8,}$"
          title="Au moins 8 caractères avec une lettre, un chiffre et un symbole."
        />

        <button className="auth-submit" type="submit" disabled={loading}>
          {loading ? "Création..." : "Créer mon compte"}
        </button>
      </form>
    </AuthBrand>
  );
}
