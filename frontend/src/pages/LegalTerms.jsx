import { Link } from "react-router-dom";
import { APP_NAME, CONTACT_EMAIL } from "../constants/brand";

const sectionStyle = { display: "grid", gap: 12, lineHeight: 1.6, fontSize: 15 };

export default function LegalTerms() {
  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: "32px 20px", color: "var(--color-text)" }}>
      <h1 style={{ marginBottom: 14 }}>Conditions générales d&apos;utilisation</h1>
      <p className="muted" style={{ marginBottom: 24 }}>
        Dernière mise à jour : mai 2026 — {APP_NAME}, service de facturation en ligne.
      </p>

      <section style={sectionStyle}>
        <h2>1. Objet</h2>
        <p>
          Les présentes conditions régissent l&apos;accès et l&apos;utilisation de l&apos;application {APP_NAME} (site vitrine et
          espace connecté). En créant un compte, vous acceptez ces conditions dans leur intégralité.
        </p>

        <h2>2. Description du service</h2>
        <p>{APP_NAME} permet notamment de :</p>
        <ul style={{ paddingLeft: 20, margin: 0 }}>
          <li>gérer une fiche clients ;</li>
          <li>créer, modifier et suivre des devis et factures ;</li>
          <li>convertir un devis accepté en facture ;</li>
          <li>enregistrer des paiements et suivre les statuts documentaires ;</li>
          <li>générer des PDF et des exports CSV (selon votre offre) ;</li>
          <li>consulter un tableau de bord et des rapports d&apos;activité.</li>
        </ul>
        <p>
          Les fonctionnalités disponibles dépendent de votre plan (Gratuit, Pro). L&apos;offre Entreprise est proposée sur
          devis et peut inclure des prestations non encore déployées dans l&apos;application standard.
        </p>

        <h2>3. Compte utilisateur</h2>
        <p>
          Vous êtes responsable de la confidentialité de vos identifiants et de toute activité réalisée depuis votre
          compte. Vous vous engagez à fournir des informations exactes et à maintenir vos coordonnées à jour.
        </p>

        <h2>4. Données et contenus</h2>
        <p>
          Vous conservez la propriété des données saisies (clients, documents, paramètres société). Vous nous accordez
          une licence limitée pour héberger, traiter et afficher ces données afin de fournir le service. Vous garantissez
          disposer des droits nécessaires sur les informations importées ou communiquées à vos clients.
        </p>

        <h2>5. Abonnements et facturation</h2>
        <p>
          Le plan Gratuit est soumis à des limites d&apos;usage (notamment le nombre de factures par mois). L&apos;offre Pro est
          facturée selon les tarifs affichés sur le site au moment de la souscription. Les paiements sont traités
          par un prestataire tiers (Stripe) lorsque la facturation en ligne est activée.
        </p>

        <h2>6. Disponibilité et évolutions</h2>
        <p>
          Nous nous efforçons d&apos;assurer une disponibilité continue du service, sans garantie de disponibilité absolue.
          Des maintenances, mises à jour ou incidents techniques peuvent entraîner une interruption temporaire. Nous
          pouvons faire évoluer les fonctionnalités pour améliorer le produit.
        </p>

        <h2>7. Responsabilité</h2>
        <p>
          {APP_NAME} aide à produire des documents commerciaux mais ne se substitue pas à un conseil juridique, fiscal ou
          comptable. Vous restez responsable de la conformité de vos factures et devis au regard de la réglementation
          applicable, ainsi que du choix des mentions affichées sur vos PDF (paramètres société).
        </p>
        <p>
          Dans les limites autorisées par la loi, notre responsabilité est limitée aux dommages directs prouvés, à
          hauteur des montants versés au cours des douze derniers mois pour l&apos;abonnement concerné.
        </p>

        <h2>8. Résiliation</h2>
        <p>
          Vous pouvez cesser d&apos;utiliser le service à tout moment. Nous pouvons suspendre ou clôturer un compte en cas de
          violation des présentes conditions ou d&apos;usage frauduleux. Les données pourront être supprimées conformément à
          notre politique de confidentialité.
        </p>

        <h2>9. Droit applicable</h2>
        <p>
          Les présentes conditions sont soumises au droit applicable dans le pays d&apos;établissement de l&apos;éditeur, sous
          réserve des dispositions impératives protectrices du consommateur le cas échéant. En cas de litige, une
          solution amiable sera recherchée avant toute action judiciaire.
        </p>

        <h2>10. Contact</h2>
        <p>
          Questions relatives aux CGU : <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
        </p>
      </section>

      <p style={{ marginTop: 24 }}>
        <Link to="/legal/confidentialite">Politique de confidentialité</Link>
        {" · "}
        <Link to="/legal/cookies">Cookies</Link>
        {" · "}
        <Link to="/">Accueil</Link>
      </p>
    </main>
  );
}
