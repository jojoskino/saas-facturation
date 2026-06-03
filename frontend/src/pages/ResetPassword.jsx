import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import "../styles/auth-pages.css";
import { apiFetch } from "../api/client";
import { AuthBrand } from "../components/AuthShell";
import PasswordField from "../components/PasswordField";
import PasswordRequirements from "../components/PasswordRequirements";
import { evaluatePassword, passwordsMatch, PASSWORD_POLICY_HINT } from "../utils/passwordPolicy";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const email = params.get("email") || "";
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const passwordValid = evaluatePassword(password).valid;
  const confirmationValid = passwordsMatch(password, passwordConfirmation);
  const canSubmit = passwordValid && confirmationValid && Boolean(token) && Boolean(email);
  const linkInvalid = !token || !email;

  async function onSubmit(e) {
    e.preventDefault();
    if (!canSubmit) {
      setError(PASSWORD_POLICY_HINT);
      return;
    }
    setLoading(true);
    setError("");
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
      navigate("/login", {
        replace: true,
        state: {
          passwordResetMessage:
            res?.message || "Mot de passe réinitialisé. Connectez-vous avec votre nouveau mot de passe.",
        },
      });
    } catch (err) {
      setError(err?.body?.errors?.email?.[0] || err?.body?.message || err?.message || "Erreur.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthBrand
      title="Nouveau mot de passe"
      tagline="Choisissez un mot de passe robuste. Le lien ne fonctionne qu'une seule fois."
      footer={<Link to="/login">Connexion</Link>}
    >
      {linkInvalid ? (
        <div className="auth-error">
          Lien invalide ou incomplet.{" "}
          <Link to="/forgot-password">Demandez un nouveau lien</Link>.
        </div>
      ) : null}
      {error ? <div className="auth-error">{error}</div> : null}

      {!linkInvalid ? (
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
      ) : null}
    </AuthBrand>
  );
}
