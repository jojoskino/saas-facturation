import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { getStoredToken } from "../api/client";
import { APP_NAME, CONTACT_EMAIL } from "../constants/brand";
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
      "Devis et factures",
      "Créez des devis, convertissez-les en factures et bénéficiez d'une numérotation automatique.",
    ],
    [
      "fa-wave-square",
      "Suivi des statuts et paiements",
      "Pilotez le cycle de vie de vos documents (brouillon, envoyé, payé, en retard) et enregistrez les paiements.",
    ],
    [
      "fa-bell",
      "Rappels par e-mail",
      "Recevez des notifications sur les factures en retard lorsque l'option est activée dans vos paramètres.",
    ],
    [
      "fa-globe",
      "Devises XOF, EUR, USD, GBP",
      "Facturez en plusieurs devises ; les tableaux de bord s'expriment principalement en franc CFA.",
    ],
    [
      "fa-file-export",
      "Exports PDF et CSV",
      "Téléchargez vos PDF et exportez vos revenus (Pro) ou vos clients via CSV (Pro).",
    ],
    [
      "fa-chart-line",
      "Tableau de bord et rapports",
      "Visualisez votre CA, vos impayés et, avec l'offre Pro, des rapports et graphiques détaillés.",
    ],
  ];

  const faqs: Array<[string, string]> = [
    [
      "Comment personnaliser mes documents ?",
      "Renseignez votre profil société (logo, couleurs, pied de page légal) dans les paramètres : ces éléments apparaissent sur vos PDF.",
    ],
    [
      "Puis-je importer mes clients ?",
      "Oui, avec l'offre Pro : import CSV via un modèle d'en-têtes prédéfinis (prénom, nom, e-mail, etc.).",
    ],
    [
      "Le plan Gratuit est-il limité dans le temps ?",
      "Non. Il reste disponible sans limite de durée, avec un plafond de 10 factures par mois.",
    ],
    [
      "Puis-je partager mes données avec mon comptable ?",
      "Oui, en lui transmettant vos exports PDF ou CSV. Il n'existe pas encore de portail comptable dédié.",
    ],
    [
      "Le service est-il sécurisé ?",
      "Chaque compte est isolé, l'accès API est authentifié par jeton, et les données sont validées côté client et serveur.",
    ],
    [
      "Quels navigateurs sont supportés ?",
      "Chrome, Firefox, Safari et Edge dans leurs versions récentes.",
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
                LA<span>FACTURE</span>
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
        <div className="hero-float-icons" aria-hidden>
          <div className="hero-float-icon hero-float-icon--coin">
            <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" role="presentation">
              <ellipse cx="40" cy="68" rx="28" ry="8" fill="rgba(20,33,61,0.12)" />
              <circle cx="40" cy="38" r="30" fill="url(#heroCoinGrad)" />
              <circle cx="40" cy="38" r="30" stroke="rgba(255,255,255,0.35)" strokeWidth="2" />
              <text x="40" y="48" textAnchor="middle" fill="#14213d" fontSize="28" fontWeight="800" fontFamily="system-ui,sans-serif">$</text>
              <defs>
                <linearGradient id="heroCoinGrad" x1="20" y1="12" x2="60" y2="64" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#ffd166" />
                  <stop offset="1" stopColor="#fca311" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <div className="hero-float-icon hero-float-icon--chart">
            <svg viewBox="0 0 88 88" fill="none" xmlns="http://www.w3.org/2000/svg" role="presentation">
              <ellipse cx="44" cy="76" rx="30" ry="7" fill="rgba(20,33,61,0.1)" />
              <rect x="14" y="52" width="60" height="14" rx="6" fill="#e8edf5" />
              <rect x="22" y="36" width="14" height="30" rx="4" fill="#fff" stroke="rgba(20,33,61,0.08)" />
              <rect x="40" y="28" width="14" height="38" rx="4" fill="#fff" stroke="rgba(20,33,61,0.08)" />
              <rect x="58" y="20" width="14" height="46" rx="4" fill="#fca311" />
              <path d="M26 24 L44 18 L58 12 L72 8" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" />
              <path d="M72 8 L68 4 M72 8 L76 10" stroke="#fca311" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>
          <div className="hero-float-icon hero-float-icon--invoice">
            <svg viewBox="0 0 72 88" fill="none" xmlns="http://www.w3.org/2000/svg" role="presentation">
              <ellipse cx="36" cy="78" rx="26" ry="7" fill="rgba(20,33,61,0.1)" />
              <rect x="10" y="8" width="52" height="64" rx="8" fill="#fff" stroke="rgba(20,33,61,0.1)" strokeWidth="1.5" />
              <rect x="18" y="18" width="28" height="6" rx="3" fill="#14213d" opacity="0.85" />
              <text x="18" y="24" fill="#fff" fontSize="5" fontWeight="700" fontFamily="system-ui,sans-serif">Invoice</text>
              <rect x="18" y="32" width="36" height="4" rx="2" fill="#fca311" opacity="0.9" />
              <rect x="18" y="42" width="30" height="3" rx="1.5" fill="#cbd5e1" />
              <rect x="18" y="50" width="34" height="3" rx="1.5" fill="#cbd5e1" />
              <rect x="18" y="58" width="24" height="3" rx="1.5" fill="#fca311" opacity="0.5" />
            </svg>
          </div>
          <div className="hero-float-icon hero-float-icon--phone">
            <svg viewBox="0 0 80 96" fill="none" xmlns="http://www.w3.org/2000/svg" role="presentation">
              <ellipse cx="40" cy="86" rx="22" ry="6" fill="rgba(20,33,61,0.12)" />
              <text x="8" y="28" fill="#64748b" fontSize="14" fontWeight="700" fontFamily="system-ui,sans-serif">€</text>
              <text x="62" y="52" fill="#fca311" fontSize="12" fontWeight="700" fontFamily="system-ui,sans-serif">$</text>
              <rect x="22" y="14" width="36" height="68" rx="10" fill="#14213d" />
              <rect x="26" y="22" width="28" height="52" rx="6" fill="#f8faff" />
              <text x="40" y="48" textAnchor="middle" fill="#fca311" fontSize="18" fontWeight="800" fontFamily="system-ui,sans-serif">$</text>
              <rect x="30" y="54" width="20" height="3" rx="1.5" fill="#cbd5e1" />
              <rect x="30" y="60" width="16" height="3" rx="1.5" fill="#cbd5e1" />
            </svg>
          </div>
        </div>
        <div className="container hero-grid">
          <Reveal className="hero-reveal">
            <div className="hero-copy">
              <h1>
                Facturez plus vite.
                <span className="hero-title-accent"> Encaissez plus tôt.</span>
              </h1>
              <p className="hero-lead">
                Créez des devis et factures professionnels en quelques clics. Simple, rapide et pensé pour
                les freelances et les petites entreprises — gratuit pour commencer.
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
            <div className="section-head section-head--features">
              <h2>Tout ce dont vous avez besoin pour facturer au quotidien</h2>
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
                    "Créez votre compte en quelques minutes. Vos données sont isolées par utilisateur.",
                  ],
                  [
                    "Gérez devis et factures",
                    "Éditez vos lignes HT/TVA/TTC, convertissez un devis accepté et reliez-le à une facture.",
                  ],
                  [
                    "Pilotez vos revenus",
                    "Consultez le tableau de bord et les rapports pour suivre encours, retards et recouvrement.",
                  ],
                ].map(([title, text], i) => (
                  <article className="step" key={title}>
                    <div className="landing-step-num">{i + 1}</div>
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
                <h2>Des offres adaptées à vos besoins</h2>
                <p>
                  Commencez gratuitement, passez à Pro quand votre volume le demande. L&apos;offre Entreprise est étudiée sur devis.
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
                    items: ["10 factures / mois", "Devis et factures PDF", "Gestion clients", "Tableau de bord"],
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
                      "Import clients CSV",
                      "Exports CSV revenus",
                      "Rapports et graphiques avancés",
                      "Rappels e-mail configurables",
                    ],
                  },
                  {
                    id: "enterprise" as const,
                    eyebrow: "Équipes",
                    name: "Entreprise",
                    desc: "Pour les équipes : fonctionnalités et accompagnement définis ensemble.",
                    amount: "Sur devis",
                    suffix: "",
                    period: "selon périmètre",
                    cta: "Contacter les ventes",
                    primary: false,
                    badge: null as string | null,
                    items: ["Volume et périmètre sur mesure", "Accompagnement dédié", "Évolutions prioritaires", "Contact commercial"],
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
                <h2>Passez à une facturation plus fiable, plus rapide, plus pro</h2>
                <p className="muted">
                  Lancez-vous aujourd&apos;hui avec une plateforme adaptée aux freelances, TPE et petites équipes.
                </p>
                <div style={{ marginTop: 18 }}>
                  <a className="btn btn-primary" href="#pricing">
                    Démarrer avec {APP_NAME}
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
              LA<span>FACTURE</span>
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
              <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
            </p>
            <ul className="foot-links" style={{ marginTop: 12 }}>
              <li><Link to="/legal/mentions">Mentions légales</Link></li>
              <li><Link to="/legal/confidentialite">Confidentialité</Link></li>
              <li><Link to="/legal/cgu">CGU</Link></li>
              <li><Link to="/legal/cookies">Cookies</Link></li>
            </ul>
            <div className="socials">
              <a href="https://www.linkedin.com" target="_blank" rel="noreferrer" aria-label="LinkedIn">
                <i className="fa-brands fa-linkedin-in" />
              </a>
              <a href={`mailto:${CONTACT_EMAIL}`} aria-label="E-mail">
                <i className="fa-solid fa-envelope" />
              </a>
            </div>
          </div>
        </div>
        <div className="container foot-bottom">
          <span>© {new Date().getFullYear()} {APP_NAME}. Tous droits réservés.</span>
          <div className="foot-bottom-links">
            <Link to="/legal/mentions">Mentions légales</Link>
            <Link to="/legal/confidentialite">Confidentialité</Link>
            <Link to="/legal/cgu">CGU</Link>
            <Link to="/legal/cookies">Cookies</Link>
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
