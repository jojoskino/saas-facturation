import { Link } from "react-router-dom";

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
          <strong>Facturo</strong> — application SaaS de facturation pour freelances et TPE.
          <br />
          E-mail : <a href="mailto:contact@facturo.app">contact@facturo.app</a>
        </p>
        <p>
          <strong>Statut juridique :</strong> renseignez ici la forme sociale, le capital, le siège social et le numéro
          d&apos;immatriculation (RCCM / SIREN ou équivalent) de votre structure avant mise en production publique.
        </p>

        <h2>Directeur de la publication</h2>
        <p>Le représentant légal de la société éditrice, désigné dans les statuts de la structure exploitant Facturo.</p>

        <h2>Hébergement</h2>
        <p>
          L&apos;application et les données sont hébergées chez un prestataire d&apos;infrastructure cloud. Les coordonnées
          complètes de l&apos;hébergeur (raison sociale, adresse, contact) doivent figurer ici pour la version publiée en
          production.
        </p>

        <h2>Propriété intellectuelle</h2>
        <p>
          L&apos;interface, les textes, la charte graphique, le nom Facturo et les éléments logiciels associés sont protégés.
          Toute reproduction, représentation ou extraction non autorisée est interdite.
        </p>

        <h2>Signalement</h2>
        <p>
          Pour signaler un contenu illicite ou une faille de sécurité : <a href="mailto:contact@facturo.app">contact@facturo.app</a>
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
