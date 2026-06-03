import { Link } from "react-router-dom";
import { APP_NAME, CONTACT_EMAIL } from "../constants/brand";

export default function LegalMentions() {
  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: "32px 20px", color: "var(--color-text)" }}>
      <h1 style={{ marginBottom: 14 }}>Mentions légales</h1>
      <p className="muted" style={{ marginBottom: 24 }}>
        Conformément aux dispositions applicables aux services en ligne.
      </p>

      <section style={{ display: "grid", gap: 14, lineHeight: 1.6, fontSize: 15 }}>
        <h2>Éditeur du service</h2>
        <p>
          <strong>{APP_NAME}</strong> — application SaaS de facturation pour freelances et TPE.
          <br />
          E-mail : <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
        </p>

        <h2>Directeur de la publication</h2>
        <p>Le représentant légal de la société éditrice de {APP_NAME}.</p>

        <h2>Hébergement</h2>
        <p>
          L&apos;application est hébergée par des prestataires d&apos;infrastructure cloud (frontend et API). Les
          coordonnées détaillées de l&apos;hébergeur sont disponibles sur demande à {CONTACT_EMAIL}.
        </p>

        <h2>Propriété intellectuelle</h2>
        <p>
          L&apos;interface, les textes, la charte graphique, le nom {APP_NAME} et les éléments logiciels associés sont
          protégés. Toute reproduction, représentation ou extraction non autorisée est interdite.
        </p>

        <h2>Signalement</h2>
        <p>
          Pour signaler un contenu illicite ou une faille de sécurité :{" "}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
        </p>
      </section>

      <p style={{ marginTop: 24 }}>
        <Link to="/legal/confidentialite">Confidentialité</Link>
        {" · "}
        <Link to="/legal/cgu">CGU</Link>
        {" · "}
        <Link to="/legal/cookies">Cookies</Link>
        {" · "}
        <Link to="/">Accueil</Link>
      </p>
    </main>
  );
}
