import { Link } from "react-router-dom";
import { APP_NAME, PRIVACY_EMAIL } from "../constants/brand";

export default function LegalPrivacy() {
  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: "32px 20px", color: "var(--color-text)" }}>
      <h1 style={{ marginBottom: 14 }}>Politique de confidentialité</h1>
      <p className="muted" style={{ marginBottom: 24 }}>
        Cette politique décrit comment {APP_NAME} traite les données personnelles dans le cadre du service de facturation.
      </p>

      <section style={{ display: "grid", gap: 14, lineHeight: 1.6, fontSize: 15 }}>
        <h2>1. Responsable du traitement</h2>
        <p>
          L&apos;éditeur de {APP_NAME}, joignable à <a href={`mailto:${PRIVACY_EMAIL}`}>{PRIVACY_EMAIL}</a>, agit en qualité
          de responsable du traitement pour les données liées à votre compte et à l&apos;utilisation de l&apos;application.
        </p>

        <h2>2. Données collectées</h2>
        <ul style={{ paddingLeft: 20, margin: 0 }}>
          <li>identité et contact du compte (nom, e-mail, mot de passe chiffré) ;</li>
          <li>profil société (coordonnées, logo, mentions PDF, préférences) ;</li>
          <li>données clients que vous saisissez ou importez ;</li>
          <li>devis, factures, paiements et historiques associés ;</li>
          <li>données techniques (journaux, adresse IP lors des connexions).</li>
        </ul>

        <h2>3. Finalités et bases légales</h2>
        <p>
          <strong>Exécution du contrat :</strong> création de compte, émission de documents, tableau de bord, exports.
          <br />
          <strong>Intérêt légitime :</strong> sécurité, prévention des abus, amélioration du service.
          <br />
          <strong>Consentement / paramétrage :</strong> notifications e-mail de relance lorsque vous les activez dans les
          paramètres.
        </p>

        <h2>4. Hébergement et sous-traitants</h2>
        <p>
          Les données sont stockées de manière isolée par compte utilisateur. Selon la configuration, des sous-traitants
          peuvent intervenir pour l&apos;hébergement, l&apos;envoi d&apos;e-mails transactionnels ou le paiement en ligne (Stripe).
          Une liste actualisée peut être obtenue sur demande à {PRIVACY_EMAIL}.
        </p>

        <h2>5. Durées de conservation</h2>
        <p>
          Les données sont conservées tant que votre compte est actif, puis supprimées ou anonymisées dans un délai raisonnable
          après clôture, sauf obligation légale de conservation (pièces comptables, litiges).
        </p>

        <h2>6. Sécurité</h2>
        <p>
          Nous appliquons des mesures techniques et organisationnelles adaptées : authentification par jeton, contrôle
          d&apos;accès par utilisateur, validation des entrées, limitation des erreurs exposées en production.
        </p>

        <h2>7. Vos droits</h2>
        <p>
          Vous disposez des droits d&apos;accès, de rectification, d&apos;effacement, de limitation, d&apos;opposition et de portabilité
          lorsque applicable. Adressez votre demande à <a href={`mailto:${PRIVACY_EMAIL}`}>{PRIVACY_EMAIL}</a> avec une
          preuve d&apos;identité. Vous pouvez introduire une réclamation auprès de l&apos;autorité de protection des données compétente.
        </p>

        <h2>8. Cookies et traceurs</h2>
        <p>
          Voir la <Link to="/legal/cookies">politique de cookies</Link> pour le détail des stockages utilisés (session API,
          préférences).
        </p>
      </section>

      <p style={{ marginTop: 24 }}>
        <Link to="/legal/mentions">Mentions légales</Link>
        {" · "}
        <Link to="/legal/cgu">CGU</Link>
        {" · "}
        <Link to="/">Accueil</Link>
      </p>
    </main>
  );
}
