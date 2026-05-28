import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import "../styles/auth-pages.css";
import { apiFetch } from "../api/client";
import { AuthBrand } from "../components/AuthShell";
import PasswordField from "../components/PasswordField";
import PasswordRequirements from "../components/PasswordRequirements";
import { evaluatePassword, passwordsMatch, PASSWORD_POLICY_HINT } from "../utils/passwordPolicy";

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const email = params.get("email") || "";
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const passwordValid = evaluatePassword(password).valid;
  const confirmationValid = passwordsMatch(password, passwordConfirmation);
  const canSubmit = passwordValid && confirmationValid && Boolean(token) && Boolean(email);

  async function onSubmit(e) {
    e.preventDefault();
    if (!canSubmit) {
      setError(PASSWORD_POLICY_HINT);
      return;
    }
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const res = await apiFetch("/api/reset-password", {
        method: "POST",
        body: JSON.stringify({
          token,
          email,
          password,
          password_confirmation: passwordConfirmation,
        }),
      });
      setMessage(res?.message || "Mot de passe mis à jour.");
    } catch (err) {
      setError(err?.body?.errors?.email?.[0] || err?.body?.message || err?.message || "Erreur.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthBrand
      title="Nouveau mot de passe"
      tagline="Choisissez un nouveau mot de passe pour retrouver votre compte."
      footer={<Link to="/login">Connexion</Link>}
    >
      {!token || !email ? <div className="auth-error">Lien invalide ou expiré.</div> : null}
      {error ? <div className="auth-error">{error}</div> : null}
      {message ? <div className="auth-success">{message}</div> : null}

      <form onSubmit={onSubmit} className="auth-form-box">
        <PasswordField
          id="reset-password"
          label="Mot de passe"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Ex. : MonSecret1!"
          autoComplete="new-password"
          minLength={8}
        />
        <PasswordRequirements
          password={password}
          confirmPassword={passwordConfirmation}
          showConfirmation
        />
        <PasswordField
          id="reset-password2"
          label="Confirmation"
          value={passwordConfirmation}
          onChange={(e) => setPasswordConfirmation(e.target.value)}
          autoComplete="new-password"
          minLength={8}
        />
        <button className="auth-submit" type="submit" disabled={loading || !canSubmit}>
          {loading ? "Enregistrement..." : "Réinitialiser"}
        </button>
      </form>
    </AuthBrand>
  );
}
