import React, { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { Link } from "react-router-dom";

function useCountUp(target: number, start: boolean) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!start) return;
    let frame = 0;
    let startTime = 0;
    const duration = 1100;
    const tick = (time: number) => {
      if (!startTime) startTime = time;
      const progress = Math.min((time - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.floor(target * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [start, target]);
  return value;
}

function Reveal({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.45 }}
    >
      {children}
    </motion.div>
  );
}

export default function Page() {
  const [scrolled, setScrolled] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState(0);
  const trustRef = useRef<HTMLDivElement | null>(null);
  const trustVisible = useInView(trustRef, { once: true, amount: 0.45 });

  const enterprises = useCountUp(500, trustVisible);
  const score = useCountUp(49, trustVisible);
  const conformiteLocale = useCountUp(99, trustVisible);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 8);
      setShowScrollTop(y > 420);
    };
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const closeOnResize = () => {
      if (window.innerWidth > 1000) setMenuOpen(false);
    };
    window.addEventListener("resize", closeOnResize);
    return () => window.removeEventListener("resize", closeOnResize);
  }, [menuOpen]);

  const features: Array<[string, string, string]> = [
    [
      "fa-file-invoice",
      "Creation de factures en 1 clic",
      "Generez des factures conformes avec numerotation automatique et mentions obligatoires.",
    ],
    [
      "fa-wave-square",
      "Suivi des paiements en temps reel",
      "Visualisez le cycle de vie des factures : emise, envoyee, payee ou en retard.",
    ],
    [
      "fa-bell",
      "Relances automatiques",
      "Activez des rappels elegants pour limiter les impayes sans charge administrative.",
    ],
    [
      "fa-globe",
      "Multi-devises",
      "Facturez vos clients internationaux en gardant une experience simple et claire.",
    ],
    [
      "fa-file-export",
      "Export comptable",
      "Exportez vers votre comptable avec des fichiers structurés et facilement exploitables.",
    ],
    [
      "fa-chart-line",
      "Tableau de bord analytique",
      "Suivez le chiffre d'affaires, les devis en attente et le taux de recouvrement.",
    ],
  ];

  const faqs: Array<[string, string]> = [
    [
      "Facturo est-il conforme aux obligations de facturation ?",
      "Oui. Mentions obligatoires, numerotation chronologique et structuration des documents sont integrees.",
    ],
    [
      "Puis-je importer mes clients existants ?",
      "Oui, import CSV avec mise en correspondance rapide des champs.",
    ],
    [
      "Le plan Gratuit est-il limite dans le temps ?",
      "Non. Il reste disponible sans limite de duree.",
    ],
    [
      "Puis-je collaborer avec mon comptable ?",
      "Oui. Vous pouvez partager vos exports et donner un acces adapte.",
    ],
    [
      "Le service est-il securise ?",
      "Oui. Isolation des comptes, protections d'acces et bonnes pratiques de securite applicative.",
    ],
    [
      "Quels navigateurs sont supportes ?",
      "Chrome, Firefox, Safari et Edge dans leurs versions recentes.",
    ],
  ];

  return (
    <div className="facturo">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=Syne:wght@600;700;800&display=swap');
        html { scroll-behavior: smooth; }
        .facturo {
          min-height: 100vh;
          background: var(--color-bg);
          color: var(--color-text);
          font-family: "DM Sans", system-ui, sans-serif;
          position: relative;
          overflow-x: hidden;
        }
        .facturo::before {
          content: "";
          position: fixed;
          inset: 0;
          pointer-events: none;
          opacity: 0.08;
          background-image: radial-gradient(rgba(20, 33, 61, 0.2) 0.6px, transparent 0.6px);
          background-size: 3px 3px;
        }
        h1, h2, h3 { font-family: var(--heading); letter-spacing: -0.03em; margin: 0; color: var(--color-text); }
        .container { width: min(1140px, 92vw); margin: 0 auto; }
        .muted { color: var(--color-text-muted); line-height: 1.65; }

        .btn {
          border-radius: 8px;
          padding: 11px 16px;
          text-decoration: none;
          font-weight: 700;
          transition: transform .2s ease, filter .2s ease;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        .btn:hover { transform: translateY(-1px); filter: brightness(1.02); }
        .btn-primary { background: var(--color-primary); color: var(--color-primary-contrast); border: 1px solid var(--color-primary); }
        .btn-secondary { border: 1px solid var(--color-primary); color: var(--color-primary); background: var(--color-surface); }

        .navbar {
          position: sticky;
          top: 0;
          z-index: 40;
          backdrop-filter: blur(10px);
          background: ${scrolled ? "var(--color-overlay)" : "rgba(255,255,255,0.78)"};
          border-bottom: 1px solid ${scrolled ? "rgba(20,33,61,0.18)" : "transparent"};
          transition: border-color .2s ease, background-color .2s ease;
        }
        .nav-wrap { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 14px 0; }
        .logo { font-family: var(--heading); font-size: 24px; font-weight: 800; }
        .logo span { color: var(--color-accent); }
        .links { display: flex; gap: 22px; }
        .links a { color: var(--color-text); text-decoration: none; font-weight: 500; }
        .nav-actions { display: flex; align-items: center; gap: 10px; }
        .menu-toggle {
          display: none;
          border: 1px solid var(--color-border-strong);
          border-radius: 8px;
          background: var(--color-surface);
          color: var(--color-text);
          width: 44px;
          height: 44px;
          cursor: pointer;
          align-items: center;
          justify-content: center;
        }
        .menu-burger {
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 5px;
          width: 20px;
          height: 14px;
        }
        .menu-burger span {
          display: block;
          height: 2px;
          width: 100%;
          background: var(--color-text);
          border-radius: 2px;
          transition: transform 0.22s ease, opacity 0.2s ease;
        }
        .menu-toggle.is-open .menu-burger span:nth-child(1) {
          transform: translateY(7px) rotate(45deg);
        }
        .menu-toggle.is-open .menu-burger span:nth-child(2) {
          opacity: 0;
        }
        .menu-toggle.is-open .menu-burger span:nth-child(3) {
          transform: translateY(-7px) rotate(-45deg);
        }
        .mobile-menu {
          display: none;
          padding: 12px 0 18px;
          border-top: 1px solid var(--color-border);
        }
        .mobile-menu a {
          display: block;
          padding: 10px 0;
          color: var(--color-text);
          text-decoration: none;
          font-weight: 500;
        }

        .hero { padding: 76px 0 42px; }
        .hero-grid {
          display: grid;
          grid-template-columns: 1.08fr 0.92fr;
          gap: 30px;
          align-items: center;
          position: relative;
        }
        .orb {
          position: absolute;
          top: -160px;
          left: -130px;
          width: 500px;
          height: 500px;
          border-radius: 999px;
          filter: blur(40px);
          background:
            radial-gradient(circle at 35% 30%, rgba(252,163,17,0.35), transparent 55%),
            radial-gradient(circle at 70% 40%, rgba(20,33,61,0.18), transparent 45%);
        }
        .badge {
          display: inline-flex;
          gap: 8px;
          border-radius: 8px;
          border: 1px solid rgba(20,33,61,0.2);
          background: var(--color-surface);
          color: var(--color-text);
          padding: 8px 12px;
          font-size: 13px;
          margin-bottom: 20px;
        }
        .hero h1 { font-size: clamp(40px, 7vw, 72px); line-height: 0.95; max-width: 12ch; }
        .cta { display: flex; gap: 12px; margin-top: 24px; flex-wrap: wrap; }

        .trust { display: grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap: 10px; margin-top: 24px; }
        .trust-item {
          padding: 12px;
          border-radius: 10px;
          background: #FFFFFF;
          border: 1px solid #E5E5E5;
        }
        .trust-item strong { display: block; font-size: 20px; color: #14213D; }
        .trust-item span { color: #4b5a74; font-size: 13px; }

        .mockup {
          border-radius: 12px;
          background: #FFFFFF;
          border: 1px solid #E5E5E5;
          box-shadow: var(--shadow-soft);
          padding: 16px;
        }
        .screen {
          border-radius: 10px;
          border: 1px solid #E5E5E5;
          background: #FAFBFD;
          padding: 16px;
        }
        .row { display: flex; gap: 10px; margin-bottom: 10px; }
        .block { height: 12px; border-radius: 4px; background: #D7DCE5; }

        .section { padding: 72px 0; }
        .section-head { margin-bottom: 20px; }
        .section-head h2 { font-size: clamp(28px, 4.6vw, 46px); }

        .logos-marquee-wrap { margin-top: 8px; }
        .marquee {
          overflow: hidden;
          mask-image: linear-gradient(90deg, transparent, #000 6%, #000 94%, transparent);
        }
        .marquee-track {
          display: flex;
          align-items: center;
          gap: 20px;
          width: max-content;
          animation: marquee-scroll 56s linear infinite;
        }
        .marquee-item {
          flex: 0 0 auto;
          padding: 14px 28px;
          border-radius: 12px;
          border: 1px solid var(--color-border);
          background: var(--color-surface);
          font-weight: 800;
          font-family: var(--heading);
          letter-spacing: 0.14em;
          font-size: 12px;
          color: var(--color-text-muted);
        }
        @keyframes marquee-scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }

        .features, .steps, .pricing-grid, .testimonials {
          display: grid;
          gap: 16px;
        }
        .features, .steps, .testimonials { grid-template-columns: repeat(3, minmax(0,1fr)); }
        .pricing-grid {
          grid-template-columns: repeat(3, minmax(0, 1fr));
          align-items: stretch;
          gap: 20px;
        }
        .card, .step, .testimonial, .faq-item, .cta-band {
          border-radius: 10px;
          background: #FFFFFF;
          border: 1px solid #E5E5E5;
        }
        .card, .step, .testimonial { padding: 18px; }
        .price-card {
          position: relative;
          border-radius: 16px;
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          padding: 24px 22px 22px;
          display: flex;
          flex-direction: column;
          min-height: 100%;
        }
        .price-card.featured {
          border-color: rgba(252, 163, 17, 0.65);
          box-shadow:
            0 0 0 1px rgba(252, 163, 17, 0.12),
            0 18px 40px rgba(20, 33, 61, 0.1);
          background:
            radial-gradient(120% 80% at 10% 0%, rgba(252, 163, 17, 0.12), transparent 55%),
            var(--color-surface);
        }
        .price-eyebrow {
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--color-text-muted);
          margin-bottom: 10px;
        }
        .price-card.featured .price-eyebrow { color: var(--color-primary); }
        .price-card h3 {
          font-family: var(--heading);
          font-size: 1.35rem;
          letter-spacing: -0.03em;
          margin: 0 0 6px;
        }
        .price-desc {
          font-size: 14px;
          color: var(--color-text-muted);
          line-height: 1.55;
          margin: 0 0 18px;
          min-height: 2.8em;
        }
        .price-row {
          display: flex;
          align-items: baseline;
          gap: 8px;
          flex-wrap: wrap;
          margin-bottom: 6px;
        }
        .price-amount {
          font-family: var(--heading);
          font-size: clamp(1.75rem, 3.2vw, 2.25rem);
          letter-spacing: -0.03em;
          color: var(--color-text);
          line-height: 1;
        }
        .price-period {
          font-size: 13px;
          color: var(--color-text-muted);
          font-weight: 600;
        }
        .price-badge {
          position: absolute;
          top: 16px;
          right: 16px;
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          padding: 6px 10px;
          border-radius: 999px;
          background: var(--color-accent-soft);
          color: var(--color-text);
        }
        .price-card .list {
          flex: 1;
          margin: 18px 0 20px;
        }
        .price-card .list li {
          font-size: 14px;
          line-height: 1.45;
        }
        .price-card .btn { width: 100%; margin-top: auto; }

        .icon {
          width: 40px;
          height: 40px;
          border-radius: 8px;
          display: grid;
          place-items: center;
          margin-bottom: 12px;
          background: var(--color-accent-soft);
          color: var(--color-text);
        }
        .num {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          display: grid;
          place-items: center;
          margin-bottom: 12px;
          background: var(--color-primary);
          color: var(--color-primary-contrast);
          font-weight: 700;
        }

        .list {
          list-style: none;
          padding: 0;
          margin: 14px 0;
          display: grid;
          gap: 10px;
          color: #2f3f59;
        }
        .list li::before { content: "✓"; color: var(--color-primary); margin-right: 8px; }

        .avatar {
          width: 40px;
          height: 40px;
          border-radius: 8px;
          display: grid;
          place-items: center;
          margin-bottom: 12px;
          background: #E9EEF7;
          color: var(--color-text);
          font-weight: 700;
        }

        .faq-wrap { display: grid; gap: 10px; }
        .faq-item { overflow: hidden; }
        .q {
          width: 100%;
          border: 0;
          background: transparent;
          padding: 16px;
          text-align: left;
          display: flex;
          justify-content: space-between;
          align-items: center;
          color: #14213D;
          cursor: pointer;
          font: inherit;
          font-weight: 700;
        }
        .a { margin: 0; padding: 0 16px 16px; color: #4b5a74; line-height: 1.6; }

        .cta-band {
          text-align: center;
          padding: 30px;
          background:
            radial-gradient(circle at 20% 20%, rgba(252,163,17,0.2), transparent 40%),
            radial-gradient(circle at 80% 20%, rgba(20,33,61,0.12), transparent 36%),
            var(--color-surface);
        }

        footer { margin-top: 66px; padding: 26px 0 40px; border-top: 1px solid #E5E5E5; }
        .foot { display: grid; grid-template-columns: 1.4fr 1fr 1fr 1fr; gap: 18px; color: #4b5a74; }
        .foot-title { color: var(--color-text); font-weight: 700; margin-bottom: 8px; }
        .socials { display: flex; gap: 8px; }
        .socials a {
          width: 30px;
          height: 30px;
          border-radius: 8px;
          border: 1px solid #D6DCE8;
          color: var(--color-text);
          display: grid;
          place-items: center;
          text-decoration: none;
        }

        .scroll-top {
          position: fixed;
          right: 22px;
          bottom: 22px;
          z-index: 50;
          width: 48px;
          height: 48px;
          border-radius: 12px;
          border: 1px solid rgba(20, 33, 61, 0.35);
          background: #14213d;
          color: #ffffff;
          box-shadow: 0 6px 20px rgba(20, 33, 61, 0.22);
          cursor: pointer;
          display: grid;
          place-items: center;
          font-size: 18px;
          opacity: 0;
          pointer-events: none;
          transform: translateY(8px);
          transition: opacity 0.25s ease, transform 0.25s ease, filter 0.2s ease, box-shadow 0.2s ease;
        }
        .scroll-top.visible {
          opacity: 1;
          pointer-events: auto;
          transform: translateY(0);
        }
        .scroll-top:hover {
          filter: brightness(1.08);
          box-shadow: 0 8px 24px rgba(20, 33, 61, 0.28);
        }
        .scroll-top i { color: #ffffff; }

        @media (max-width: 1000px) {
          .hero-grid, .features, .steps, .pricing-grid, .testimonials, .foot { grid-template-columns: 1fr 1fr; }
          .links { display: none; }
          .nav-actions > a.btn { display: none !important; }
          .menu-toggle { display: inline-flex; }
          .mobile-menu.open { display: block; }
        }
        @media (max-width: 720px) {
          .hero, .section { padding-top: 42px; }
          .hero-grid, .features, .steps, .pricing-grid, .testimonials, .foot, .trust { grid-template-columns: 1fr; }
          .cta-band { text-align: left; }
          .btn { width: 100%; }
          .nav-actions .btn { width: auto; }
        }
      `}</style>

      <header className="navbar">
        <div className="container nav-wrap">
          <div className="logo">
            Factu<span>ro</span>
          </div>
          <nav className="links">
            <a href="#features">Fonctionnalites</a>
            <a href="#pricing">Tarifs</a>
            <a href="#testimonials">Temoignages</a>
          </nav>
          <div className="nav-actions">
            <Link className="btn btn-secondary" to="/login">
              Connexion
            </Link>
            <Link className="btn btn-primary" to="/register">
              Commencer gratuitement
            </Link>
            <button
              type="button"
              className={`menu-toggle ${menuOpen ? "is-open" : ""}`}
              aria-expanded={menuOpen}
              aria-label={menuOpen ? "Fermer le menu" : "Ouvrir le menu"}
              onClick={() => setMenuOpen((prev) => !prev)}
            >
              <span className="menu-burger" aria-hidden="true">
                <span />
                <span />
                <span />
              </span>
            </button>
          </div>
        </div>
        <div className={`container mobile-menu ${menuOpen ? "open" : ""}`}>
          <a href="#features" onClick={() => setMenuOpen(false)}>Fonctionnalites</a>
          <a href="#pricing" onClick={() => setMenuOpen(false)}>Tarifs</a>
          <a href="#testimonials" onClick={() => setMenuOpen(false)}>Temoignages</a>
          <Link to="/login" onClick={() => setMenuOpen(false)}>Connexion</Link>
          <Link to="/register" onClick={() => setMenuOpen(false)}>Creer un compte</Link>
        </div>
      </header>

      <main>
      <section className="hero">
        <div className="container hero-grid">
          <div className="orb" />
          <Reveal>
            <div>
              <motion.div
                className="badge"
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
              >
                ✦ Nouveau - Export Sage & QuickBooks
              </motion.div>

              <h1>Facturez en 30 secondes.</h1>

              <p className="muted" style={{ marginTop: 20 }}>
                Devis, factures et relances automatiques pour freelances et TPE.
              </p>

              <div className="cta">
                <a className="btn btn-primary" href="#pricing">
                  Commencer gratuitement
                </a>
                <a className="btn btn-secondary" href="#how">
                  Voir une demo
                </a>
              </div>

              <div className="trust" ref={trustRef}>
                <div className="trust-item">
                  <strong>{enterprises}+</strong>
                  <span>entreprises actives</span>
                </div>
                <div className="trust-item">
                  <strong>{score}/5</strong>
                  <span>satisfaction client</span>
                </div>
                <div className="trust-item">
                  <strong>{conformiteLocale}%</strong>
                  <span>conforme fiscalite locale (OHADA)</span>
                </div>
              </div>
            </div>
          </Reveal>

          <Reveal>
            <div className="mockup">
              <div className="screen">
                <div className="row">
                  <div className="block" style={{ width: "45%" }} />
                  <div className="block" style={{ width: "22%" }} />
                  <div className="block" style={{ width: "21%" }} />
                </div>
                <div className="row">
                  <div className="block" style={{ width: "100%", height: 120 }} />
                </div>
                <div className="row">
                  <div className="block" style={{ width: "58%" }} />
                  <div className="block" style={{ width: "37%" }} />
                </div>
                <div className="row">
                  <div className="block" style={{ width: "100%", height: 90 }} />
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

        <section className="section" id="features">
          <div className="container">
            <Reveal>
              <div className="section-head">
                <h2>Une solution claire pour la facturation moderne</h2>
              </div>
              <div className="features">
                {features.map(([icon, title, description], index) => (
                  <motion.article
                    key={title}
                    className="card"
                    initial={{ opacity: 0, y: 14 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <div className="icon">
                      <i className={`fa-solid ${icon}`} />
                    </div>
                    <h3>{title}</h3>
                    <p className="muted">{description}</p>
                  </motion.article>
                ))}
              </div>
            </Reveal>
          </div>
        </section>

        <section className="section" id="how">
          <div className="container">
            <Reveal>
              <div className="section-head">
                <h2>Comment ca marche</h2>
              </div>
              <div className="steps">
                {[
                  [
                    "Creez votre espace",
                    "Inscription simple avec donnees isolees et securisees par compte utilisateur.",
                  ],
                  [
                    "Gerez devis et factures",
                    "Passez du devis a la facture sans ressaisie avec calculs automatiques HT/TVA/TTC.",
                  ],
                  [
                    "Pilotez vos revenus",
                    "Suivez KPIs, taux de recouvrement et impayes depuis un tableau de bord lisible.",
                  ],
                ].map(([title, text], i) => (
                  <article className="step" key={title}>
                    <div className="num">{i + 1}</div>
                    <h3>{title}</h3>
                    <p className="muted">{text}</p>
                  </article>
                ))}
              </div>
            </Reveal>
          </div>
        </section>

        <section className="section" id="pricing">
          <div className="container">
            <Reveal>
              <div className="section-head" style={{ maxWidth: 720 }}>
                <p className="muted" style={{ fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", fontSize: 11, marginBottom: 10 }}>
                  Tarification
                </p>
                <h2>Des offres lisibles, en franc CFA</h2>
                <p className="muted" style={{ marginTop: 12 }}>
                  Pas de surprise : une hiérarchie claire entre l’entrée gratuite, l’usage intensif et le sur-mesure équipe.
                </p>
              </div>
              <div className="pricing-grid">
                {[
                  {
                    eyebrow: "Démarrage",
                    name: "Gratuit",
                    desc: "Idéal pour valider le produit et vos premiers flux documentaires.",
                    amount: "0",
                    suffix: "F CFA",
                    period: "par mois",
                    cta: "Démarrer",
                    primary: false,
                    badge: null as string | null,
                    items: ["10 factures / mois", "Export PDF", "Suivi client basique", "Support communautaire"],
                  },
                  {
                    eyebrow: "Le plus choisi",
                    name: "Pro",
                    desc: "Pour les indépendants et TPE qui facturent chaque semaine.",
                    amount: "19 000",
                    suffix: "F CFA",
                    period: "par mois · facturation locale",
                    cta: "Choisir Pro",
                    primary: true,
                    badge: "Populaire",
                    items: [
                      "Factures illimitées",
                      "Relances automatiques",
                      "Exports comptables avancés",
                      "Tableau de bord analytique",
                      "Support prioritaire e-mail",
                    ],
                  },
                  {
                    eyebrow: "Équipes",
                    name: "Entreprise",
                    desc: "Multi-utilisateurs, gouvernance et accompagnement dédié.",
                    amount: "Sur devis",
                    suffix: "",
                    period: "selon périmètre",
                    cta: "Contacter les ventes",
                    primary: false,
                    badge: null as string | null,
                    items: ["Gestion multi-utilisateurs", "SLA 99,5 %", "Onboarding dédié", "Intégrations sur mesure"],
                  },
                ].map((plan) => (
                  <article key={plan.name} className={`price-card ${plan.primary ? "featured" : ""}`}>
                    {plan.badge ? <span className="price-badge">{plan.badge}</span> : null}
                    <div className="price-eyebrow">{plan.eyebrow}</div>
                    <h3>{plan.name}</h3>
                    <p className="price-desc">{plan.desc}</p>
                    <div className="price-row">
                      <span className="price-amount">{plan.amount}{plan.suffix ? `\u00A0${plan.suffix}` : ""}</span>
                    </div>
                    <div className="price-period">{plan.period}</div>
                    <ul className="list">
                      {plan.items.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                    <Link className={`btn ${plan.primary ? "btn-primary" : "btn-secondary"}`} to="/register">
                      {plan.cta}
                    </Link>
                  </article>
                ))}
              </div>
            </Reveal>
          </div>
        </section>

        <section className="section" id="testimonials">
          <div className="container">
            <Reveal>
              <div className="section-head">
                <h2>Temoignages</h2>
              </div>
              <div className="testimonials">
                {[
                  [
                    "ML",
                    "Marie Leroy",
                    "Fondatrice - Nova Conseil",
                    "Nous avons reduit de 70% le temps passe sur la facturation.",
                  ],
                  [
                    "TB",
                    "Thomas Brun",
                    "Dirigeant - Atelier Pixel",
                    "Conversion devis-facture ultra rapide, sans erreur de saisie.",
                  ],
                  [
                    "SR",
                    "Sophie Richard",
                    "Operations - Lyra Studio",
                    "Vision claire des revenus et des impayes chaque semaine.",
                  ],
                ].map(([initials, name, role, quote]) => (
                  <article className="testimonial" key={String(name)}>
                    <div className="avatar">{initials}</div>
                    <h3>{name}</h3>
                    <p className="muted">{role}</p>
                    <p>"{quote}"</p>
                  </article>
                ))}
              </div>
            </Reveal>
          </div>
        </section>

        <section className="section">
          <div className="container">
            <Reveal>
              <div className="section-head">
                <h2>FAQ</h2>
              </div>
              <div className="faq-wrap">
                {faqs.map(([question, answer], i) => (
                  <div className="faq-item" key={question}>
                    <button type="button" className="q" onClick={() => setOpenFaq((prev) => (prev === i ? -1 : i))}>
                      <span>{question}</span>
                      <motion.span animate={{ rotate: openFaq === i ? 45 : 0 }}>+</motion.span>
                    </button>
                    <motion.div
                      initial={false}
                      animate={{ height: openFaq === i ? "auto" : 0, opacity: openFaq === i ? 1 : 0 }}
                      style={{ overflow: "hidden" }}
                    >
                      <p className="a">{answer}</p>
                    </motion.div>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </section>

        <section className="section">
          <div className="container">
            <Reveal>
              <div className="cta-band">
                <h2>Passez a une facturation plus fiable, plus rapide, plus pro</h2>
                <p className="muted">
                  Lancez-vous aujourd'hui avec une plateforme adaptee aux freelances, TPE et petites equipes B2B.
                </p>
                <div style={{ marginTop: 18 }}>
                  <a className="btn btn-primary" href="#pricing">
                    Demarrer avec Facturo
                  </a>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        <section className="section">
          <div className="container">
            <Reveal>
              <div className="section-head">
                <h2>Ils nous font confiance</h2>
                <p className="muted" style={{ marginTop: 10 }}>
                  Marques fictives d’illustration — défilement continu pour prévisualiser un bandeau premium.
                </p>
              </div>
              <div className="logos-marquee-wrap" aria-hidden>
                <div className="marquee">
                  <div className="marquee-track">
                    {[
                      ...["NOVA", "KYRO", "HEXA", "PIXORA", "ALTED", "MINTA", "BLOOM", "CIRCE", "VELUM", "ORIA"],
                      ...["NOVA", "KYRO", "HEXA", "PIXORA", "ALTED", "MINTA", "BLOOM", "CIRCE", "VELUM", "ORIA"],
                    ].map((name, i) => (
                      <div className="marquee-item" key={`${name}-${i}`}>
                        {name}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </section>


      </main>

      <footer>
        <div className="container foot">
          <div>
            <div className="logo">
              Factu<span>ro</span>
            </div>
            <p className="muted">Facturation B2B simple, moderne et orientee performance.</p>
          </div>
          <div>
            <p className="foot-title">Produit</p>
            <p>Fonctionnalites</p>
            <p>Tarifs</p>
            <p>Tableau de bord</p>
          </div>
          <div>
            <p className="foot-title">Ressources</p>
            <p>Documentation</p>
            <p>Centre d'aide</p>
            <p>Guide de demarrage</p>
          </div>
          <div>
            <p className="foot-title">Legal</p>
            <p>Mentions legales</p>
            <p>Confidentialite</p>
            <div className="socials">
              <a href="#" aria-label="LinkedIn">
                <i className="fa-brands fa-linkedin-in" />
              </a>
              <a href="#" aria-label="X">
                <i className="fa-brands fa-x-twitter" />
              </a>
              <a href="#" aria-label="GitHub">
                <i className="fa-brands fa-github" />
              </a>
            </div>
          </div>
        </div>
      </footer>

      <button
        type="button"
        className={`scroll-top ${showScrollTop ? "visible" : ""}`}
        aria-label="Retour en haut de page"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      >
        <i className="fa-solid fa-arrow-up" aria-hidden />
      </button>
    </div>
  );
}
