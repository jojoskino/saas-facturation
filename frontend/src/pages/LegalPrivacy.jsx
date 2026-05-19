import { Link } from "react-router-dom";

export default function LegalPrivacy() {
  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: "32px 20px", color: "var(--color-text)" }}>
      <h1 style={{ marginBottom: 14 }}>Politique de confidentialité</h1>
      <section style={{ display: "grid", gap: 12, lineHeight: 1.55, fontSize: 15 }}>
        <p>
          Facturo traite vos données (identité, coordonnées, clients, devis et factures) pour fournir le service de
          facturation. Les données sont hébergées de manière sécurisée et isolées par compte utilisateur.
        </p>
        <p>
          <strong>Finalités :</strong> gestion de compte, émission de documents, tableaux de bord, relances e-mail
          (si activées), export PDF/CSV.
        </p>
        <p>
          <strong>Durée de conservation :</strong> tant que le compte est actif, puis suppression ou anonymisation selon
          la réglementation applicable.
        </p>
        <p>
          <strong>Vos droits (RGPD) :</strong> accès, rectification, effacement, limitation, portabilité — contact :
          privacy@facturo.app
        </p>
        <p>
          <strong>Cookies :</strong> jeton de session technique pour l&apos;authentification ; pas de publicité tierce
          par défaut.
        </p>
      </section>
      <p style={{ marginTop: 24 }}>
        <Link to="/legal/mentions">Mentions légales</Link>
        {" · "}
        <Link to="/">Accueil</Link>
      </p>
    </main>
  );
}
