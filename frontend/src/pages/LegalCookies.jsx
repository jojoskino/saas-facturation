import { Link } from "react-router-dom";

export default function LegalCookies() {
  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: "32px 20px", color: "var(--color-text)" }}>
      <h1 style={{ marginBottom: 14 }}>Politique de cookies</h1>
      <p className="muted" style={{ marginBottom: 24 }}>
        Dernière mise à jour : mai 2026
      </p>

      <section style={{ display: "grid", gap: 14, lineHeight: 1.6, fontSize: 15 }}>
        <h2>1. Qu&apos;est-ce qu&apos;un cookie ?</h2>
        <p>
          Un cookie est un petit fichier texte déposé sur votre terminal lors de la consultation d&apos;un site ou de
          l&apos;utilisation d&apos;une application web. Facturo utilise principalement le stockage local du navigateur pour
          l&apos;authentification API.
        </p>

        <h2>2. Cookies et stockages utilisés</h2>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "1px solid #e2e8f0" }}>
              <th style={{ padding: "8px 4px" }}>Nom / type</th>
              <th style={{ padding: "8px 4px" }}>Finalité</th>
              <th style={{ padding: "8px 4px" }}>Durée</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
              <td style={{ padding: "8px 4px" }}>Jeton API (localStorage)</td>
              <td style={{ padding: "8px 4px" }}>Maintenir votre session connectée de façon sécurisée</td>
              <td style={{ padding: "8px 4px" }}>Jusqu&apos;à déconnexion ou expiration (24 h par défaut)</td>
            </tr>
            <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
              <td style={{ padding: "8px 4px" }}>Préférences interface</td>
              <td style={{ padding: "8px 4px" }}>Langue, masquage des montants, état de navigation</td>
              <td style={{ padding: "8px 4px" }}>Persistant côté navigateur</td>
            </tr>
          </tbody>
        </table>

        <h2>3. Cookies non utilisés</h2>
        <p>
          Par défaut, Facturo ne dépose pas de cookies publicitaires, de reciblage ou de mesure d&apos;audience tiers. Aucun
          réseau social n&apos;est intégré au cœur de l&apos;application métier.
        </p>

        <h2>4. Gestion de vos choix</h2>
        <p>
          Vous pouvez supprimer le jeton de session en vous déconnectant ou en effaçant les données du site dans les
          paramètres de votre navigateur. Le refus ou la suppression du stockage de session empêche l&apos;utilisation de
          l&apos;espace connecté.
        </p>

        <h2>5. Contact</h2>
        <p>
          Pour toute question : <a href="mailto:privacy@facturo.app">privacy@facturo.app</a>
        </p>
      </section>

      <p style={{ marginTop: 24 }}>
        <Link to="/legal/confidentialite">Confidentialité</Link>
        {" · "}
        <Link to="/legal/cgu">CGU</Link>
        {" · "}
        <Link to="/">Accueil</Link>
      </p>
    </main>
  );
}
