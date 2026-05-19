import { Link } from "react-router-dom";

export default function LegalMentions() {
  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: "32px 20px", color: "var(--color-text)" }}>
      <h1 style={{ marginBottom: 14 }}>Mentions légales</h1>
      <section style={{ display: "grid", gap: 12, lineHeight: 1.55 }}>
        <p>
          <strong>Éditeur :</strong> Facturo — SaaS de facturation pour freelances et TPE.
          <br />
          Contact : contact@facturo.app
        </p>
        <p>
          <strong>Directeur de la publication :</strong> à compléter avec le représentant légal de votre structure.
        </p>
        <p>
          <strong>Hébergeur :</strong> à compléter (raison sociale, adresse, téléphone de l&apos;hébergeur en production).
        </p>
        <p>
          <strong>Propriété intellectuelle :</strong> l&apos;ensemble des éléments du site et de l&apos;application sont protégés.
          Toute reproduction non autorisée est interdite.
        </p>
      </section>
      <p style={{ marginTop: 24 }}>
        <Link to="/">Retour à l&apos;accueil</Link>
      </p>
    </main>
  );
}
