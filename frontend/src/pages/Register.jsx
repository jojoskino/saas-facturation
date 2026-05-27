import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import "../styles/auth-pages.css";
import { apiFetch } from "../api/client";
import { AuthBrand } from "../components/AuthShell";
import PasswordField from "../components/PasswordField";
import PasswordRequirements from "../components/PasswordRequirements";
import { FieldLabel } from "../components/AppFormControls";
import { evaluatePassword, passwordsMatch, PASSWORD_POLICY_HINT } from "../utils/passwordPolicy";
import { BILLING_PLANS, loginPathWithPlan } from "../utils/billingFlow";

export default function Register() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const selectedPlan = searchParams.get("plan") === BILLING_PLANS.pro ? BILLING_PLANS.pro : null;
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const passwordValid = evaluatePassword(password).valid;
  const confirmationValid = passwordsMatch(password, passwordConfirmation);
  const canSubmit = passwordValid && confirmationValid;

  async function onSubmit(e) {
    e.preventDefault();
    if (!canSubmit) {
      setError(PASSWORD_POLICY_HINT);
      return;
    }
    setError("");
    setLoading(true);
    try {
      await apiFetch("/api/register", {
        method: "POST",
        body: JSON.stringify({
          name,
          email,
          password,
          password_confirmation: passwordConfirmation,
        }),
      });
      const loginQs = new URLSearchParams({ registered: "1" });
      if (selectedPlan === BILLING_PLANS.pro) loginQs.set("plan", "pro");
      navigate(`/login?${loginQs.toString()}`, { replace: true });
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
          Déjà inscrit ? <Link to={loginPathWithPlan(selectedPlan || "")}>Se connecter</Link>
        </>
      }
    >
      {selectedPlan === BILLING_PLANS.pro ? (
        <div className="auth-success" role="status">
          Offre Pro sélectionnée — après connexion, vous serez guidé vers le paiement sécurisé.
        </div>
      ) : null}
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
          id="reg-password2"
          label="Confirmer le mot de passe"
          value={passwordConfirmation}
          onChange={(e) => setPasswordConfirmation(e.target.value)}
          placeholder="Répétez le mot de passe"
          autoComplete="new-password"
          minLength={8}
        />

        <button className="auth-submit" type="submit" disabled={loading || !canSubmit}>
          {loading ? "Création..." : "Créer mon compte"}
        </button>
      </form>
    </AuthBrand>
  );
}
