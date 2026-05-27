import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { getStoredToken } from "../api/client";
import { isExternalHref, publicPlanCtaHref } from "../utils/billingFlow";

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
        html { scroll-behavior: smooth; }
        .facturo {
          min-height: 100vh;
          background: linear-gradient(165deg, #f8faff 0%, #eef3fc 50%, #f4f7ff 100%);
          color: var(--color-text);
          font-family: var(--sans);
          position: relative;
          overflow-x: hidden;
        }
        .facturo::before {
          content: "";
          position: fixed;
          inset: 0;
          pointer-events: none;
          opacity: 0.05;
          background-image: radial-gradient(rgba(20, 33, 61, 0.16) 0.55px, transparent 0.55px);
          background-size: 4px 4px;
        }
        h1, h2, h3 { font-family: var(--heading); letter-spacing: -0.03em; margin: 0; color: var(--color-text); }
        .container { width: min(1120px, 92vw); margin: 0 auto; }
        .muted { color: var(--color-text-muted); line-height: 1.65; }

        .btn {
          border-radius: 12px;
          padding: 11px 18px;
          text-decoration: none;
          font-weight: 700;
          transition: transform .2s ease, filter .2s ease, box-shadow .2s ease;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        .btn:hover { transform: translateY(-1px); filter: brightness(1.01); box-shadow: 0 8px 18px rgba(20, 33, 61, 0.1); }
        .btn-primary { background: #14213d; color: #fff; border: 1px solid #14213d; }
        .btn-secondary { border: 1px solid #cfd9ec; color: #14213d; background: rgba(255, 255, 255, 0.92); }
        .btn-pill-nav {
          border-radius: 999px;
          padding: 10px 20px;
          font-size: 14px;
        }

        .navbar {
          position: sticky;
          top: 0;
          z-index: 40;
          padding: max(12px, env(safe-area-inset-top, 0px)) clamp(12px, 3vw, 20px) 10px;
          margin-bottom: 0;
          background: transparent;
          border: none;
        }
        .nav-pill {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          width: min(1120px, 100%);
          margin: 0 auto;
          padding: 8px 10px 8px 22px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.94);
          box-shadow:
            0 18px 48px rgba(26, 24, 64, 0.08),
            0 0 0 1px rgba(26, 24, 64, 0.05);
          backdrop-filter: blur(16px);
          transition: box-shadow 0.25s ease, transform 0.25s ease;
        }
        .navbar.is-scrolled .nav-pill {
          box-shadow:
            0 14px 36px rgba(26, 24, 64, 0.12),
            0 0 0 1px rgba(26, 24, 64, 0.07);
        }
        .nav-wrap { display: contents; }
        .logo {
          font-family: var(--heading);
          font-size: 22px;
          font-weight: 800;
          color: #14213d;
          letter-spacing: -0.03em;
          flex-shrink: 0;
        }
        .logo span { color: #fca311; }
        a.logo { text-decoration: none; color: inherit; }
        .nav-pill .links {
          display: flex;
          gap: 4px;
          align-items: center;
          flex: 1;
          justify-content: center;
        }
        .links { display: flex; gap: 8px; align-items: center; }
        .links a {
          position: relative;
          color: #4b5a74;
          text-decoration: none;
          font-weight: 600;
          font-size: 14px;
          padding: 8px 12px;
          border-radius: 8px;
          transition: color 0.2s ease, background 0.2s ease;
        }
        .links a::after {
          content: "";
          position: absolute;
          left: 12px;
          right: 12px;
          bottom: 5px;
          height: 2px;
          border-radius: 2px;
          background: #fca311;
          transform: scaleX(0);
          transform-origin: center;
          transition: transform 0.22s ease;
        }
        .links a:hover,
        .links a:focus-visible {
          color: #14213d;
          background: rgba(20, 33, 61, 0.05);
        }
        .links a:hover::after,
        .links a:focus-visible::after {
          transform: scaleX(1);
        }
        .nav-pill .links a::after {
          background: #fca311;
        }
        .nav-actions { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
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
          padding: 10px 12px;
          margin: 0 -12px;
          color: #4b5a74;
          text-decoration: none;
          font-weight: 600;
          border-radius: 8px;
          transition: color 0.2s ease, background 0.2s ease, padding-left 0.2s ease;
        }
        .mobile-menu a:hover,
        .mobile-menu a:focus-visible {
          color: #14213d;
          background: rgba(20, 33, 61, 0.06);
          padding-left: 18px;
        }

        .hero {
          position: relative;
          padding: 0 0 clamp(56px, 6vw, 80px);
          overflow: hidden;
          min-height: min(78vh, 720px);
        }
        .hero::before {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          background:
            radial-gradient(ellipse 55% 45% at 82% 8%, rgba(252, 163, 17, 0.18), transparent 55%),
            radial-gradient(ellipse 45% 40% at 6% 78%, rgba(20, 33, 61, 0.06), transparent 50%),
            linear-gradient(165deg, #f8faff 0%, #eef3fc 50%, #f4f7ff 100%);
        }
        .hero-blob {
          position: absolute;
          border-radius: 50%;
          filter: blur(48px);
          pointer-events: none;
          z-index: 0;
          animation: hero-float 9s ease-in-out infinite;
        }
        .hero-blob--1 {
          width: min(320px, 50vw);
          height: min(320px, 50vw);
          top: 8%;
          right: 12%;
          background: rgba(252, 163, 17, 0.22);
        }
        .hero-blob--2 {
          width: min(240px, 40vw);
          height: min(240px, 40vw);
          bottom: 12%;
          left: 4%;
          background: rgba(20, 33, 61, 0.08);
          animation-delay: -3s;
        }
        @keyframes hero-float {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(8px, -12px) scale(1.04); }
        }
        .hero-grid {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(0, 1.05fr);
          gap: clamp(28px, 4vw, 52px);
          align-items: center;
          position: relative;
          z-index: 1;
        }
        .hero-copy {
          max-width: 32rem;
          padding-top: clamp(8px, 2vw, 20px);
        }
        .hero h1 {
          font-size: clamp(34px, 5.2vw, 56px);
          line-height: 1.08;
          max-width: 12ch;
          font-weight: 800;
          color: #14213d;
          letter-spacing: -0.035em;
        }
        .hero h1 em {
          font-style: normal;
          color: #fca311;
        }
        .hero-lead {
          margin-top: 16px;
          font-size: clamp(16px, 1.9vw, 18px);
          line-height: 1.55;
          max-width: 36ch;
          color: #4b5a74;
        }
        .hero-cta {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin-top: 28px;
          align-items: center;
        }
        .btn-hero-primary {
          border-radius: 999px;
          padding: 14px 28px;
          font-size: 15px;
          box-shadow: 0 12px 28px rgba(20, 33, 61, 0.18);
        }
        .btn-hero-secondary {
          border-radius: 999px;
          padding: 14px 22px;
          font-size: 15px;
        }
        .hero-visual-wrap {
          position: relative;
          min-height: clamp(280px, 38vw, 420px);
        }
        .hero-visual-card {
          position: relative;
          border-radius: 20px;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.95);
          box-shadow:
            0 0 0 1px rgba(20, 33, 61, 0.08),
            0 28px 56px rgba(20, 33, 61, 0.14);
          background: #fff;
          transform: perspective(900px) rotateY(-3deg) rotateX(1deg);
          transition: transform 0.35s ease;
        }
        .hero-visual-wrap:hover .hero-visual-card {
          transform: perspective(900px) rotateY(-1deg) translateY(-6px);
        }
        .hero-visual-card img {
          display: block;
          width: 100%;
          height: auto;
          aspect-ratio: 16 / 11;
          object-fit: cover;
        }
        .hero-chip {
          position: absolute;
          z-index: 2;
          padding: 10px 14px;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.96);
          border: 1px solid rgba(20, 33, 61, 0.1);
          box-shadow: 0 12px 28px rgba(20, 33, 61, 0.1);
          font-size: 12px;
          font-weight: 700;
          color: #14213d;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          backdrop-filter: blur(8px);
          animation: hero-float 7s ease-in-out infinite;
        }
        .hero-chip i { color: #fca311; }
        .hero-chip--top { top: 12%; right: -4%; animation-delay: -1s; }
        .hero-chip--bottom { bottom: 14%; left: -6%; animation-delay: -4s; }
        .hero-ring {
          position: absolute;
          width: 120px;
          height: 120px;
          border-radius: 50%;
          border: 2px dashed rgba(252, 163, 17, 0.35);
          top: 50%;
          left: -20px;
          transform: translateY(-50%);
          pointer-events: none;
          animation: hero-spin 24s linear infinite;
        }
        @keyframes hero-spin {
          to { transform: translateY(-50%) rotate(360deg); }
        }

        .section { padding: 74px 0; }
        .section-head { margin-bottom: 24px; }
        .section-head h2 { font-size: clamp(30px, 4.2vw, 44px); }

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
          gap: 18px;
        }
        .features, .steps, .testimonials { grid-template-columns: repeat(3, minmax(0,1fr)); }
        .pricing-grid {
          grid-template-columns: repeat(3, minmax(0, 1fr));
          align-items: stretch;
          gap: 20px;
        }
        .card, .step, .testimonial, .faq-item, .cta-band {
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.72);
          border: 1px solid #d9e2f2;
          backdrop-filter: blur(10px);
          box-shadow: 0 12px 28px rgba(20, 33, 61, 0.08);
        }
        .card, .step, .testimonial { padding: 20px; }
        .price-card {
          position: relative;
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.76);
          border: 1px solid #d7e1f2;
          padding: 24px 22px 22px;
          display: flex;
          flex-direction: column;
          min-height: 100%;
        }
        .price-card.featured {
          border-color: rgba(252, 163, 17, 0.65);
          box-shadow:
            0 0 0 1px rgba(252, 163, 17, 0.1),
            0 16px 34px rgba(20, 33, 61, 0.11);
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
          padding: 34px;
          background:
            radial-gradient(circle at 20% 20%, rgba(252,163,17,0.2), transparent 40%),
            radial-gradient(circle at 80% 20%, rgba(20,33,61,0.12), transparent 36%),
            var(--color-surface);
        }

        .site-footer {
          margin-top: 64px;
          background: #14213d;
          color: rgba(255, 255, 255, 0.82);
        }
        .site-footer a {
          color: rgba(255, 255, 255, 0.88);
          text-decoration: none;
          transition: color 0.2s ease;
        }
        .site-footer a:hover { color: #fca311; }
        .foot {
          display: grid;
          grid-template-columns: 1.35fr repeat(3, minmax(0, 1fr));
          gap: clamp(24px, 4vw, 40px);
          padding: clamp(40px, 5vw, 52px) 0 32px;
        }
        .foot-brand .logo { color: #fff; font-size: 26px; }
        .foot-brand .logo span { color: #fca311; }
        .foot-brand p {
          margin: 12px 0 0;
          max-width: 28ch;
          line-height: 1.55;
          font-size: 14px;
          color: rgba(255, 255, 255, 0.72);
        }
        .foot-cta {
          display: inline-flex;
          margin-top: 16px;
          padding: 10px 18px;
          border-radius: 999px;
          background: #fca311;
          color: #14213d !important;
          font-weight: 700;
          font-size: 14px;
        }
        .foot-cta:hover { filter: brightness(1.05); color: #14213d !important; }
        .foot-title {
          margin: 0 0 12px;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #fca311;
        }
        .foot-links {
          list-style: none;
          margin: 0;
          padding: 0;
          display: grid;
          gap: 8px;
        }
        .foot-links a { font-size: 14px; font-weight: 500; }
        .foot-contact {
          margin: 0;
          font-size: 14px;
          line-height: 1.5;
        }
        .socials {
          display: flex;
          gap: 8px;
          margin-top: 14px;
        }
        .socials a {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          display: grid;
          place-items: center;
          color: #fff !important;
        }
        .socials a:hover {
          border-color: #fca311;
          background: rgba(252, 163, 17, 0.15);
          color: #fca311 !important;
        }
        .foot-bottom {
          border-top: 1px solid rgba(255, 255, 255, 0.12);
          padding: 18px 0 24px;
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          font-size: 13px;
          color: rgba(255, 255, 255, 0.55);
        }
        .foot-bottom-links {
          display: flex;
          flex-wrap: wrap;
          gap: 16px;
        }
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
          .hero { min-height: auto; padding-bottom: 48px; }
          .hero, .section { padding-top: 42px; }
          .hero-grid, .features, .steps, .pricing-grid, .testimonials, .foot { grid-template-columns: 1fr; }
          .hero-visual-wrap { min-height: 240px; }
          .hero-chip--top { right: 4px; }
          .hero-chip--bottom { left: 4px; }
          .foot-bottom { flex-direction: column; align-items: flex-start; }
          .cta-band { text-align: left; }
          .btn { width: 100%; }
          .nav-actions .btn { width: auto; }
        }
      `}</style>

      <main>
      <section className="hero">
        <header className={`navbar ${scrolled ? "is-scrolled" : ""}`}>
          <div className="nav-pill">
            <div className="nav-wrap">
            <Link className="logo" to="/">
              Factu<span>ro</span>
            </Link>
            <nav className="links">
              <a href="#features">Fonctionnalités</a>
              <a href="#pricing">Tarifs</a>
              <a href="#faq">FAQ</a>
            </nav>
            <div className="nav-actions">
              <Link className="btn btn-secondary btn-pill-nav" to={isLoggedIn ? "/app" : "/login"}>
                {isLoggedIn ? "Mon espace" : "Connexion"}
              </Link>
              <Link className="btn btn-primary btn-pill-nav" to={isLoggedIn ? "/app/abonnement?plan=pro&checkout=start" : "/register"}>
                {isLoggedIn ? "Passer à Pro" : "Commencer"}
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
          </div>
          <div className={`container mobile-menu ${menuOpen ? "open" : ""}`}>
            <a href="#features" onClick={() => setMenuOpen(false)}>Fonctionnalites</a>
            <a href="#pricing" onClick={() => setMenuOpen(false)}>Tarifs</a>
            <a href="#faq" onClick={() => setMenuOpen(false)}>FAQ</a>
            <Link to="/login" onClick={() => setMenuOpen(false)}>Connexion</Link>
            <Link to="/register" onClick={() => setMenuOpen(false)}>Creer un compte</Link>
          </div>
        </header>
        <div className="hero-blob hero-blob--1" aria-hidden />
        <div className="hero-blob hero-blob--2" aria-hidden />
        <div className="container hero-grid">
          <Reveal>
            <div className="hero-copy">
              <h1>
                Facturez <em>simple</em>, vite.
              </h1>
              <p className="hero-lead">
                Devis et factures conformes pour freelances et TPE — gratuit pour démarrer.
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

          <Reveal>
            <div className="hero-visual-wrap">
              <div className="hero-ring" aria-hidden />
              <div className="hero-visual-card">
                <img
                  src="/images/hero-app.png"
                  alt="Tableau de bord Facturo"
                  loading="eager"
                  decoding="async"
                />
              </div>
              <span className="hero-chip hero-chip--top">
                <i className="fa-solid fa-file-invoice" aria-hidden />
                Factures conformes
              </span>
              <span className="hero-chip hero-chip--bottom">
                <i className="fa-solid fa-bolt" aria-hidden />
                Devis → facture en 1 clic
              </span>
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
          <div className="container" id="tarifs">
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
                        <li key={item}>{item}</li>
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
