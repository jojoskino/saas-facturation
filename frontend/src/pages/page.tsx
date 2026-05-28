import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { getStoredToken } from "../api/client";
import { isExternalHref, publicPlanCtaHref } from "../utils/billingFlow";
import "../styles/landing.css";

function useReveal<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          node.classList.add("is-visible");
          observer.disconnect();
        }
      },
      { threshold: 0.2, rootMargin: "0px 0px -5% 0px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return ref;
}

function Reveal({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useReveal<HTMLDivElement>();
  return (
    <div ref={ref} className={`reveal-on-scroll ${className}`.trim()}>
      {children}
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
  index,
}: {
  icon: string;
  title: string;
  description: string;
  index: number;
}) {
  const ref = useReveal<HTMLElement>();
  return (
    <article
      ref={ref}
      className="card reveal-stagger"
      style={{ "--reveal-delay": `${index * 50}ms` } as React.CSSProperties}
    >
      <div className="icon">
        <i className={`fa-solid ${icon}`} />
      </div>
      <h3>{title}</h3>
      <p className="muted">{description}</p>
    </article>
  );
}

export default function Page() {
  const [scrolled, setScrolled] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState(0);
  const [isLoggedIn, setIsLoggedIn] = useState(() => Boolean(getStoredToken()));

  useEffect(() => {
    setIsLoggedIn(Boolean(getStoredToken()));
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

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  const features: Array<[string, string, string]> = [
    [
      "fa-file-invoice",
      "Création de factures en 1 clic",
      "Générez des factures conformes avec numérotation automatique et mentions obligatoires.",
    ],
    [
      "fa-wave-square",
      "Suivi des paiements en temps réel",
      "Visualisez le cycle de vie des factures : émise, envoyée, payée ou en retard.",
    ],
    [
      "fa-bell",
      "Relances automatiques",
      "Activez des rappels élégants pour limiter les impayés sans charge administrative.",
    ],
    [
      "fa-globe",
      "Multi-devises",
      "Facturez vos clients internationaux en gardant une expérience simple et claire.",
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
      <main>
      <section className="hero">
        <header className={`navbar ${scrolled ? "is-scrolled" : ""} ${menuOpen ? "is-menu-open" : ""}`}>
          <button
            type="button"
            className="mobile-backdrop"
            aria-label="Fermer le menu"
            tabIndex={menuOpen ? 0 : -1}
            onClick={() => setMenuOpen(false)}
          />
          <div className="nav-shell">
            <div className="nav-pill">
              <Link className="logo" to="/" onClick={() => setMenuOpen(false)}>
                Factu<span>ro</span>
              </Link>
              <nav className="links nav-desktop" aria-label="Navigation principale">
                <a href="#features">Fonctionnalités</a>
                <a href="#pricing">Tarifs</a>
                <a href="#faq">FAQ</a>
              </nav>
              <div className="nav-actions nav-desktop">
                <Link className="btn btn-secondary btn-pill-nav" to={isLoggedIn ? "/app" : "/login"}>
                  {isLoggedIn ? "Mon espace" : "Connexion"}
                </Link>
                <Link className="btn btn-primary btn-pill-nav" to={isLoggedIn ? "/app/abonnement?plan=pro&checkout=start" : "/register"}>
                  {isLoggedIn ? "Passer à Pro" : "Commencer"}
                </Link>
              </div>
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
            <nav className={`mobile-menu ${menuOpen ? "open" : ""}`} aria-hidden={!menuOpen}>
              <a href="#features" onClick={() => setMenuOpen(false)}>
                <i className="fa-solid fa-layer-group" aria-hidden />
                Fonctionnalités
              </a>
              <a href="#pricing" onClick={() => setMenuOpen(false)}>
                <i className="fa-solid fa-tags" aria-hidden />
                Tarifs
              </a>
              <a href="#faq" onClick={() => setMenuOpen(false)}>
                <i className="fa-solid fa-circle-question" aria-hidden />
                FAQ
              </a>
              <div className="mobile-menu-divider" />
              <div className="mobile-menu-cta">
                <Link className="btn btn-secondary" to={isLoggedIn ? "/app" : "/login"} onClick={() => setMenuOpen(false)}>
                  {isLoggedIn ? "Mon espace" : "Connexion"}
                </Link>
                <Link
                  className="btn btn-primary"
                  to={isLoggedIn ? "/app/abonnement?plan=pro&checkout=start" : "/register"}
                  onClick={() => setMenuOpen(false)}
                >
                  {isLoggedIn ? "Passer à Pro" : "Commencer gratuitement"}
                </Link>
              </div>
            </nav>
          </div>
        </header>
        <div className="hero-blob hero-blob--1" aria-hidden />
        <div className="hero-blob hero-blob--2" aria-hidden />
        <div className="container hero-grid">
          <Reveal className="hero-reveal">
            <div className="hero-copy">
              <h1>
                Facturez plus vite.
                <br />
                Encaissez <em>plus tôt</em>.
              </h1>
              <p className="hero-lead">
                Créez des devis et factures professionnels en quelques clics. Simple, rapide et pensé pour les
                freelances et les petites entreprises — gratuit pour commencer.
              </p>
              <div className="hero-cta">
                <Link
                  className="btn btn-primary btn-hero-primary"
                  to={isLoggedIn ? "/app" : "/register"}
                >
                  Commencer gratuitement
                </Link>
                <a className="btn btn-secondary btn-hero-secondary" href="#pricing">
                  Voir les tarifs
                </a>
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
                  <FeatureCard
                    key={title}
                    icon={icon}
                    title={title}
                    description={description}
                    index={index}
                  />
                ))}
              </div>
            </Reveal>
          </div>
        </section>

        <section className="section" id="how">
          <div className="container">
            <Reveal>
              <div className="section-head">
                <h2>Comment ça marche</h2>
              </div>
              <div className="steps">
                {[
                  [
                    "Créez votre espace",
                    "Inscription simple avec données isolées et sécurisées par compte utilisateur.",
                  ],
                  [
                    "Gérez devis et factures",
                    "Passez du devis à la facture sans ressaisie avec calculs automatiques HT/TVA/TTC.",
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

        <section className="section section--pricing" id="pricing">
          <div className="container" id="tarifs">
            <Reveal>
              <div className="pricing-intro">
                <p className="pricing-kicker">Tarification</p>
                <h2>Des offres lisibles, en franc CFA</h2>
                <p>
                  Pas de surprise : une hiérarchie claire entre l’entrée gratuite, l’usage intensif et le sur-mesure équipe.
                </p>
              </div>
              <div className="pricing-grid">
                {[
                  {
                    id: "free" as const,
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
                    id: "pro" as const,
                    eyebrow: "Le plus choisi",
                    name: "Pro",
                    desc: "Pour les indépendants et TPE qui facturent chaque semaine.",
                    amount: "5 000",
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
                    id: "enterprise" as const,
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
                ].map((plan) => {
                  const ctaHref = publicPlanCtaHref(plan.id);
                  const ctaClass = `btn ${plan.primary ? "btn-primary" : "btn-secondary"}`;
                  const ctaLabel = plan.id === "pro" && isLoggedIn ? "Passer à Pro" : plan.cta;

                  return (
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
                        <li key={item}>
                          <i className="fa-solid fa-check" aria-hidden />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                    {isExternalHref(ctaHref) ? (
                      <a className={ctaClass} href={ctaHref}>{ctaLabel}</a>
                    ) : (
                      <Link className={ctaClass} to={ctaHref}>{ctaLabel}</Link>
                    )}
                  </article>
                  );
                })}
              </div>
            </Reveal>
          </div>
        </section>

        <section className="section" id="faq">
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
                      <span className={`faq-toggle-icon ${openFaq === i ? "is-open" : ""}`}>+</span>
                    </button>
                    <div className={`faq-panel ${openFaq === i ? "is-open" : ""}`}>
                      <p className="a">{answer}</p>
                    </div>
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

      </main>

      <footer className="site-footer">
        <div className="container foot">
          <div className="foot-brand">
            <div className="logo">
              Factu<span>ro</span>
            </div>
            <p>Facturation claire pour freelances et petites entreprises en Afrique de l&apos;Ouest.</p>
            <Link className="foot-cta" to={isLoggedIn ? "/app" : "/register"}>
              {isLoggedIn ? "Ouvrir l'application" : "Créer un compte gratuit"}
            </Link>
          </div>
          <div>
            <p className="foot-title">Produit</p>
            <ul className="foot-links">
              <li><a href="#features">Fonctionnalités</a></li>
              <li><a href="#how">Comment ça marche</a></li>
              <li><a href="#pricing">Tarifs</a></li>
              <li><a href="#faq">FAQ</a></li>
            </ul>
          </div>
          <div>
            <p className="foot-title">Compte</p>
            <ul className="foot-links">
              <li><Link to="/login">Connexion</Link></li>
              <li><Link to="/register">Inscription</Link></li>
              <li><Link to={isLoggedIn ? "/app" : "/register"}>Espace app</Link></li>
            </ul>
          </div>
          <div>
            <p className="foot-title">Contact & légal</p>
            <p className="foot-contact">
              <a href="mailto:contact@facturo.app">contact@facturo.app</a>
            </p>
            <ul className="foot-links" style={{ marginTop: 12 }}>
              <li><Link to="/legal/mentions">Mentions légales</Link></li>
              <li><Link to="/legal/confidentialite">Confidentialité</Link></li>
            </ul>
            <div className="socials">
              <a href="https://www.linkedin.com" target="_blank" rel="noreferrer" aria-label="LinkedIn">
                <i className="fa-brands fa-linkedin-in" />
              </a>
              <a href="mailto:contact@facturo.app" aria-label="E-mail">
                <i className="fa-solid fa-envelope" />
              </a>
            </div>
          </div>
        </div>
        <div className="container foot-bottom">
          <span>© {new Date().getFullYear()} Facturo. Tous droits réservés.</span>
          <div className="foot-bottom-links">
            <Link to="/legal/mentions">Mentions légales</Link>
            <Link to="/legal/confidentialite">Confidentialité</Link>
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
