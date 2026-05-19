import { useState } from "react";
import { Link } from "react-router-dom";
import "../styles/auth-pages.css";
import { apiFetch } from "../api/client";
import { AuthBrand } from "../components/AuthShell";
import { FieldLabel } from "../components/AppFormControls";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const res = await apiFetch("/api/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setMessage(res?.message || "Si cette adresse existe, un e-mail a été envoyé.");
    } catch (err) {
      setError(err?.body?.message || err?.message || "Erreur.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthBrand
      title="Mot de passe oublié"
      subtitle="Nous vous enverrons un lien de réinitialisation."
      footer={
        <Link to="/login">Retour à la connexion</Link>
      }
    >
      {error ? <div className="auth-error">{error}</div> : null}
      {message ? <div className="auth-success">{message}</div> : null}

      <form onSubmit={onSubmit} className="auth-form-box">
        <div className="auth-field">
          <FieldLabel htmlFor="forgot-email" required>
            E-mail
          </FieldLabel>
          <div className="auth-input-wrap">
            <i className="fa-solid fa-envelope auth-input-icon" aria-hidden />
            <input
              id="forgot-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="vous@exemple.com"
            />
          </div>
        </div>
        <button className="auth-submit" type="submit" disabled={loading}>
          {loading ? "Envoi..." : "Envoyer le lien"}
        </button>
      </form>
    </AuthBrand>
  );
}
