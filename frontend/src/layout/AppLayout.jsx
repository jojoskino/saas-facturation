import { useEffect, useMemo, useRef, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { apiFetch, getStoredToken, setStoredToken } from "../api/client";
import { useApiQuery } from "../hooks/useApiQuery";
import I18nSync from "../components/I18nSync";
import PlanBadge from "../components/PlanBadge";
import { applyUserBranding } from "../utils/branding";

const navItems = [
  { to: "/app", labelKey: "nav.dashboard", icon: "fa-chart-pie", end: true },
  { to: "/app/clients", labelKey: "nav.clients", icon: "fa-address-book" },
  { to: "/app/devis", labelKey: "nav.quotes", icon: "fa-file-signature" },
  { to: "/app/factures", labelKey: "nav.invoices", icon: "fa-file-invoice-dollar" },
  { to: "/app/parametres", labelKey: "nav.settings", icon: "fa-sliders" },
];

const titleKeys = {
  "/app": "nav.dashboard",
  "/app/clients": "nav.clients",
  "/app/devis": "nav.quotes",
  "/app/factures": "nav.invoices",
  "/app/profil": "profileMenu.myProfile",
  "/app/parametres": "nav.settings",
};

export default function AppLayout() {
  const { t } = useTranslation("common");
  const navigate = useNavigate();
  const location = useLocation();
  const [userName, setUserName] = useState("");
  const { data: me, error: meError } = useApiQuery("/api/me", { enabled: Boolean(getStoredToken()) });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(localStorage.getItem("facturo_sidebar_collapsed") === "1");
  const [profileOpen, setProfileOpen] = useState(false);
  const [confirmLogoutOpen, setConfirmLogoutOpen] = useState(false);
  const profileRef = useRef(null);

  const pageTitle = useMemo(() => {
    const key = titleKeys[location.pathname];
    return key ? t(key) : t("nav.app");
  }, [location.pathname, t]);

  useEffect(() => {
    if (!getStoredToken()) {
      navigate("/login", { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    if (meError && getStoredToken()) {
      setStoredToken(null);
      navigate("/login", { replace: true });
    }
  }, [meError, navigate]);

  useEffect(() => {
    setUserName(me?.name || "");
    if (me) applyUserBranding(me);
  }, [me]);

  useEffect(() => {
    setSidebarOpen(false);
    setProfileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    function onDocClick(e) {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    }
    if (profileOpen) document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [profileOpen]);

  function logout() {
    apiFetch("/api/logout", { method: "POST" }).finally(() => {
      setStoredToken(null);
      navigate("/", { replace: true });
    });
  }

  function goTo(path) {
    setProfileOpen(false);
    navigate(path);
  }

  return (
    <div className="app-shell">
      <I18nSync />
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=Syne:wght@600;700;800&display=swap');
        .app-shell {
          min-height: 100vh;
          display: flex;
          background: var(--color-bg-subtle);
          color: var(--color-text);
          font-family: var(--sans);
        }
        .app-shell__backdrop {
          display: none;
          position: fixed;
          inset: 0;
          background: rgba(20, 33, 61, 0.35);
          z-index: 25;
        }
        .app-shell__backdrop.open { display: block; }
        .app-shell__sidebar {
          width: 248px;
          flex-shrink: 0;
          background:
            radial-gradient(120% 70% at 0% 0%, rgba(20, 33, 61, 0.08), transparent 52%),
            var(--glass-surface-strong);
          border-right: 1px solid var(--color-border);
          display: flex;
          flex-direction: column;
          position: sticky;
          top: 0;
          align-self: flex-start;
          height: 100vh;
          z-index: 30;
          transition: width 0.2s ease;
          box-shadow: inset -1px 0 0 rgba(20, 33, 61, 0.03);
        }
        .app-shell__sidebar.collapsed {
          width: 76px;
        }
        .app-shell__brand {
          height: 62px;
          box-sizing: border-box;
          padding: 0 12px 0 14px;
          border-bottom: 1px solid #e9eef7;
          font-family: var(--heading);
          font-weight: 800;
          font-size: 1.2rem;
          letter-spacing: -0.03em;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }
        .app-shell__brand-title {
          display: inline-flex;
          align-items: center;
          white-space: nowrap;
          overflow: hidden;
          font-size: 1.24rem;
          letter-spacing: -0.03em;
          text-shadow: 0 1px 0 rgba(255, 255, 255, 0.9);
        }
        .app-shell__brand span { color: var(--color-accent); }
        .app-shell__sidebar.collapsed .app-shell__brand-title { display: none; }
        .app-shell__nav {
          flex: 1;
          padding: 12px 10px 14px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          overflow-y: auto;
        }
        .app-shell__nav-title {
          padding: 6px 10px 4px;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--color-text-muted);
        }
        .app-shell__sidebar.collapsed .app-shell__nav-title { display: none; }
        .app-shell__nav a {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 12px;
          border-radius: 12px;
          text-decoration: none;
          color: var(--color-text);
          font-weight: 600;
          font-size: 14px;
          border: 1px solid transparent;
          position: relative;
          transition: background 0.18s ease, border-color 0.18s ease, color 0.18s ease, transform 0.18s ease, box-shadow 0.18s ease;
        }
        .app-shell__nav a:hover {
          background: #f7faff;
          border-color: #dfe7f4;
          transform: translateX(1px);
          box-shadow: 0 2px 8px rgba(20, 33, 61, 0.04);
        }
        .app-shell__sidebar.collapsed .app-shell__nav a {
          justify-content: center;
          padding: 11px 8px;
        }
        .app-shell__sidebar.collapsed .app-shell__nav a span {
          display: none;
        }
        .app-shell__nav a i {
          width: 22px;
          height: 22px;
          border-radius: 7px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          opacity: 0.9;
          color: #334155;
          background: rgba(20, 33, 61, 0.05);
          font-size: 11px;
        }
        .app-shell__nav a.active {
          background:
            linear-gradient(90deg, rgba(20, 33, 61, 0.08) 0%, rgba(20, 33, 61, 0.03) 100%),
            #ffffff;
          border-color: #c7d4ea;
          color: #0f172a;
          box-shadow: 0 5px 14px rgba(20, 33, 61, 0.08);
        }
        .app-shell__nav a.active::before {
          content: "";
          position: absolute;
          left: -10px;
          top: 8px;
          bottom: 8px;
          width: 3px;
          border-radius: 999px;
          background: linear-gradient(180deg, #14213d 0%, #314b82 100%);
        }
        .app-shell__nav a.active i {
          color: #14213d;
          background: rgba(20, 33, 61, 0.1);
        }
        .app-shell__footer {
          padding: 12px;
          border-top: 1px solid #e9eef7;
          position: relative;
          display: flex;
          justify-content: center;
        }
        .app-shell__collapse-btn {
          width: 32px;
          border-radius: 8px;
          border: 1px solid var(--color-border);
          background: transparent;
          color: var(--color-text-muted);
          height: 32px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-size: 12px;
          margin-bottom: 0;
        }
        .app-shell__collapse-btn:hover {
          color: var(--color-text);
          border-color: var(--color-border-strong);
          background: #fff;
        }
        .app-shell__logout-btn {
          width: calc(100% - 4px);
          border-radius: 12px;
          border: 1px solid #e3e9f4;
          background: #ffffff;
          color: #9d2f2f;
          height: 40px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          cursor: pointer;
          font-weight: 700;
          font-size: 13px;
          margin-top: 0;
          transition: border-color 0.18s ease, background 0.18s ease, transform 0.18s ease;
        }
        .app-shell__logout-btn:hover {
          border-color: #efc2c2;
          background: #fff6f6;
          transform: translateY(-1px);
        }
        .app-shell__sidebar.collapsed .app-shell__logout-btn {
          width: 40px;
          height: 40px;
          margin: 0 auto;
          padding: 0;
        }
        .app-shell__sidebar.collapsed .app-shell__logout-btn span {
          display: none;
        }
        .app-shell__profile-btn {
          width: 100%;
          border-radius: 10px;
          border: 1px solid var(--color-border-strong);
          background: #fff;
          color: var(--color-text);
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          cursor: pointer;
          font-weight: 700;
          font-size: 13px;
        }
        .app-shell__profile-menu {
          position: absolute;
          bottom: calc(100% + 8px);
          left: 12px;
          right: 12px;
          background: #fff;
          border: 1px solid var(--color-border);
          border-radius: 10px;
          box-shadow: var(--shadow-soft);
          overflow: hidden;
          z-index: 35;
        }
        .app-shell__profile-item {
          width: 100%;
          border: 0;
          border-bottom: 1px solid var(--color-border);
          background: #fff;
          color: var(--color-text-muted);
          text-align: left;
          padding: 10px 12px;
          cursor: pointer;
          font-size: 13px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .app-shell__profile-item:hover { background: #f8fafc; color: var(--color-text); }
        .app-shell__profile-item:last-child { border-bottom: 0; }
        .app-shell__profile-name {
          display: block;
          color: var(--color-text-muted);
          font-size: 12px;
          padding: 8px 12px 0;
        }
        .app-shell__main-col {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
        }
        .app-shell__header {
          height: 62px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 0 20px 0 16px;
          background: var(--color-overlay);
          backdrop-filter: blur(10px);
          border-bottom: 1px solid var(--color-border);
          position: sticky;
          top: 0;
          z-index: 100;
          isolation: isolate;
        }
        .app-shell__header-left {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 0;
        }
        .app-shell__menu-btn {
          display: none;
          width: 40px;
          height: 40px;
          border-radius: 10px;
          border: 1px solid var(--color-border-strong);
          background: var(--color-surface);
          color: var(--color-text);
          cursor: pointer;
          align-items: center;
          justify-content: center;
        }
        .app-shell__title {
          font-family: var(--heading);
          font-size: 1.05rem;
          font-weight: 700;
          letter-spacing: -0.02em;
          margin: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .app-shell__title-accent { color: var(--color-accent); }
        .app-shell__header-right { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
        .app-shell__plan-wrap { display: flex; align-items: center; }
        @media (max-width: 560px) {
          .app-shell__plan-wrap { display: none; }
        }
        .app-shell__hello {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          line-height: 1.1;
        }
        .app-shell__hello-greet { font-size: 11px; color: var(--color-text-muted); font-weight: 600; }
        .app-shell__hello-name { font-size: 13px; color: var(--color-text); font-weight: 700; }
        .app-shell__profile-wrap { position: relative; z-index: 120; }
        .app-shell__profile-icon {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          border: 1px solid var(--color-border-strong);
          background: #fff;
          color: var(--color-text);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }
        .app-shell__profile-popover {
          position: absolute;
          right: 0;
          top: calc(100% + 8px);
          width: 210px;
          background: #fff;
          border: 1px solid var(--color-border);
          border-radius: 10px;
          box-shadow: 0 16px 40px rgba(20, 33, 61, 0.18);
          z-index: 200;
          overflow: hidden;
        }
        .app-shell__btn {
          border-radius: 10px;
          padding: 9px 14px;
          font-weight: 700;
          font-size: 13px;
          cursor: pointer;
          border: 1px solid var(--color-border-strong);
          background: var(--color-surface);
          color: var(--color-text);
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          transition: filter 0.2s ease, transform 0.2s ease;
        }
        .app-shell__btn:hover {
          filter: brightness(1.02);
          transform: translateY(-1px);
        }
        .app-shell__btn--primary {
          background: var(--color-primary);
          color: var(--color-primary-contrast);
          border-color: var(--color-primary);
        }
        .app-shell__content {
          flex: 1;
          padding: 24px 20px 40px;
          max-width: 1200px;
          width: 100%;
          margin: 0 auto;
          box-sizing: border-box;
        }
        .app-shell__confirm-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(20, 33, 61, 0.35);
          z-index: 90;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 18px;
        }
        .app-shell__confirm-modal {
          width: min(480px, 100%);
          border-radius: 12px;
          background: var(--glass-surface-strong);
          border: 1px solid var(--color-border);
          box-shadow: var(--shadow-soft);
          padding: 16px;
        }
        .app-shell__confirm-modal h3 {
          margin: 0 0 8px;
          font-family: var(--heading);
          font-size: 1.05rem;
        }
        .app-shell__confirm-modal p {
          margin: 0;
          color: var(--color-text-muted);
          font-size: 14px;
        }
        .app-shell__confirm-actions {
          display: flex;
          justify-content: flex-start;
          gap: 8px;
          margin-top: 14px;
        }
        .app-shell__btn--soft-danger {
          border-color: #efc2c2;
          background: #fff6f6;
          color: #9d2f2f;
        }
        @media (max-width: 900px) {
          .app-shell__menu-btn { display: inline-flex; }
          .app-shell__header { padding: 0 12px; }
          .app-shell__title { font-size: 0.98rem; max-width: 45vw; }
          .app-shell__hello { max-width: 34vw; }
          .app-shell__hello-name {
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            font-size: 12px;
          }
          .app-shell__profile-icon {
            width: 34px;
            height: 34px;
          }
          .app-shell__sidebar {
            position: fixed;
            left: 0;
            top: 0;
            width: 248px;
            transform: translateX(-100%);
            transition: transform 0.22s ease;
            box-shadow: var(--shadow-soft);
          }
          .app-shell__sidebar.collapsed { width: 248px; }
          .app-shell__sidebar.collapsed .app-shell__nav a span { display: inline; }
          .app-shell__sidebar.collapsed .app-shell__nav-title { display: block; }
          .app-shell__sidebar.open { transform: translateX(0); }
          .app-shell__backdrop.open { display: block; }
        }
        @media (max-width: 560px) {
          .app-shell__header { height: 58px; }
          .app-shell__brand { height: 58px; }
          .app-shell__title { max-width: 48vw; font-size: 0.95rem; }
          .app-shell__hello { display: none; }
          .app-shell__content { padding: 14px 12px 30px; }
        }
      `}</style>

      <div
        className={`app-shell__backdrop ${sidebarOpen ? "open" : ""}`}
        aria-hidden="true"
        onClick={() => setSidebarOpen(false)}
      />

      <aside className={`app-shell__sidebar ${sidebarOpen ? "open" : ""} ${sidebarCollapsed ? "collapsed" : ""}`}>
        <div className="app-shell__brand">
          <div className="app-shell__brand-title">
            Factu<span>ro</span>
          </div>
          <button
            type="button"
            className="app-shell__collapse-btn"
            aria-label={sidebarCollapsed ? "Déplier la sidebar" : "Plier la sidebar"}
            onClick={() => {
              setSidebarCollapsed((prev) => {
                const next = !prev;
                localStorage.setItem("facturo_sidebar_collapsed", next ? "1" : "0");
                return next;
              });
            }}
          >
            <i className={`fa-solid ${sidebarCollapsed ? "fa-angles-right" : "fa-angles-left"}`} />
          </button>
        </div>
        <nav className="app-shell__nav">
          <div className="app-shell__nav-title">Navigation</div>
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => (isActive ? "active" : "")}>
              <i className={`fa-solid ${item.icon}`} />
              <span>{t(item.labelKey)}</span>
            </NavLink>
          ))}
        </nav>
        <div className="app-shell__footer">
          <button type="button" className="app-shell__logout-btn" onClick={() => setConfirmLogoutOpen(true)}>
            <i className="fa-solid fa-right-from-bracket" />
            <span>{t("profileMenu.logout")}</span>
          </button>
        </div>
      </aside>

      <div className="app-shell__main-col">
        <header className="app-shell__header">
          <div className="app-shell__header-left">
            <button
              type="button"
              className="app-shell__menu-btn"
              aria-label="Menu"
              onClick={() => setSidebarOpen((o) => !o)}
            >
              <i className={`fa-solid ${sidebarOpen ? "fa-xmark" : "fa-bars"}`} />
            </button>
            <h1 className="app-shell__title">{pageTitle}</h1>
          </div>
          <div className="app-shell__header-right">
            {userName ? (
              <span className="app-shell__hello">
                <span className="app-shell__hello-greet">{t("greeting")}</span>
                <span className="app-shell__hello-name">{userName}</span>
              </span>
            ) : null}
            <div className="app-shell__profile-wrap" ref={profileRef}>
              <button
                type="button"
                className="app-shell__profile-icon"
                aria-label="Menu profil"
                onClick={() => setProfileOpen((v) => !v)}
              >
                <i className="fa-solid fa-user" />
              </button>
              {profileOpen ? (
                <div className="app-shell__profile-popover">
                  {me?.plan ? (
                    <div className="app-shell__profile-plan" style={{ padding: "10px 12px", borderBottom: "1px solid var(--color-border)" }}>
                      <PlanBadge plan={me.plan} />
                    </div>
                  ) : null}
                  <button type="button" className="app-shell__profile-item" onClick={() => goTo("/app/profil")}>
                    <i className="fa-solid fa-user" /> {t("profileMenu.myProfile")}
                  </button>
                  <button type="button" className="app-shell__profile-item" onClick={() => setConfirmLogoutOpen(true)}>
                    <i className="fa-solid fa-right-from-bracket" /> {t("profileMenu.logout")}
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        <main className="app-shell__content">
          <Outlet context={{ userName }} />
        </main>
      </div>

      {confirmLogoutOpen ? (
        <div className="app-shell__confirm-backdrop" onClick={() => setConfirmLogoutOpen(false)} role="dialog" aria-modal="true">
          <div className="app-shell__confirm-modal" onClick={(e) => e.stopPropagation()}>
            <h3>{t("logout.title")}</h3>
            <p>{t("logout.message")}</p>
            <div className="app-shell__confirm-actions">
              <button
                type="button"
                className="app-shell__btn app-shell__btn--primary"
                onClick={logout}
              >
                {t("logout.confirm")}
              </button>
              <button
                type="button"
                className="app-shell__btn app-shell__btn--soft-danger"
                onClick={() => setConfirmLogoutOpen(false)}
              >
                {t("actions.cancel")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
