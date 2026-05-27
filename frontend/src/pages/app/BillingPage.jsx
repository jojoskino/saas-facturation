import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { apiFetch, getStoredToken } from "../../api/client";
import { useApiQuery } from "../../hooks/useApiQuery";
import PlanBadge from "../../components/PlanBadge";
import AccountAlerts from "../../components/account/AccountAlerts";
import { BillingSimCheckoutModal, BillingSimPortalModal } from "../../components/BillingSimulateModals";
import { BILLING_PLANS } from "../../utils/billingFlow";
import { normalizePlan } from "../../utils/planFeatures";
import { useAccountMe } from "../../hooks/useAccountMe";
import "../../styles/account-pages.css";

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });
}

function cardBrandLabel(brand) {
  const map = { visa: "Visa", mastercard: "Mastercard", amex: "Amex" };
  return map[brand?.toLowerCase?.()] || brand || "Carte";
}

export default function BillingPage() {
  const { t } = useTranslation("billing");
  const { t: tc } = useTranslation("common");
  const [searchParams, setSearchParams] = useSearchParams();
  const { setUser } = useAccountMe();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [actionLoading, setActionLoading] = useState("");
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [portalModalOpen, setPortalModalOpen] = useState(false);
  const autoCheckoutStarted = useRef(false);

  const planIntent = searchParams.get("plan");
  const checkoutIntent = searchParams.get("checkout");

  const { data, loading, error: loadError, refresh } = useApiQuery("/api/billing", {
    enabled: Boolean(getStoredToken()),
  });

  useEffect(() => {
    const checkout = searchParams.get("checkout");
    if (checkout === "success") {
      setSuccess(t("checkoutSuccess"));
      refresh();
      apiFetch("/api/me")
        .then((me) => {
          if (me) setUser(me);
        })
        .catch(() => {});
    } else if (checkout === "cancel") {
      setError(t("checkoutCancel"));
    }
    if (checkout === "success" || checkout === "cancel") {
      const next = new URLSearchParams(searchParams);
      next.delete("checkout");
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams, t, refresh, setUser]);

  const plan = normalizePlan(data?.plan);
  const plans = Array.isArray(data?.plans) ? data.plans : [];
  const paymentMethod = data?.payment_method;
  const isSimulation = Boolean(data?.simulation);
  const hasActiveSub = data?.has_subscription && ["active", "trialing"].includes(data?.billing_status);
  const billingReady = Boolean(data?.configured);

  async function applySimulation(payload) {
    setActionLoading("simulate");
    setError("");
    try {
      const res = await apiFetch("/api/billing/simulate", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setSuccess(res?.message || t("checkoutSuccess"));
      setCheckoutModalOpen(false);
      setPortalModalOpen(false);
      await refresh();
      const me = await apiFetch("/api/me");
      if (me) {
        setUser(me);
        if (normalizePlan(me.plan) === BILLING_PLANS.pro) {
          const next = new URLSearchParams(searchParams);
          next.delete("plan");
          next.delete("checkout");
          setSearchParams(next, { replace: true });
        }
      }
    } catch (err) {
      setError(err?.body?.message || err?.message || t("errors.checkout"));
    } finally {
      setActionLoading("");
    }
  }

  async function startCheckout(targetPlan) {
    setActionLoading(`checkout-${targetPlan}`);
    setError("");
    try {
      const res = await apiFetch("/api/billing/checkout", {
        method: "POST",
        body: JSON.stringify({ plan: targetPlan }),
      });
      if (res?.mode === "simulation" && res?.requires_confirmation) {
        setCheckoutModalOpen(true);
        return;
      }
      if (res?.url) {
        window.location.href = res.url;
        return;
      }
      setError(t("errors.checkout"));
    } catch (err) {
      const message = err?.body?.message || err?.message || t("errors.checkout");
      if (message.includes("déjà abonné") || message.includes("already")) {
        await openPortal();
        return;
      }
      setError(message);
    } finally {
      setActionLoading("");
    }
  }

  async function openPortal() {
    setActionLoading("portal");
    setError("");
    try {
      const res = await apiFetch("/api/billing/portal", { method: "POST" });
      if (res?.mode === "simulation" && res?.portal) {
        setPortalModalOpen(true);
        return;
      }
      if (res?.url) {
        window.location.href = res.url;
        return;
      }
      setError(t("errors.portal"));
    } catch (err) {
      setError(err?.body?.message || err?.message || t("errors.portal"));
    } finally {
      setActionLoading("");
    }
  }
  const planFeatures = useMemo(() => {
    if (plan === "enterprise" || plan === "pro") {
      return [t("features.proInvoices"), t("features.csvExport"), t("features.csvImport"), t("features.reports")];
    }
    return [t("features.freeInvoices"), t("features.csvExport"), t("features.csvImport"), t("features.reports")];
  }, [plan, t]);

  useEffect(() => {
    if (!data || loading || autoCheckoutStarted.current) return;
    if (checkoutIntent !== "start" || planIntent !== BILLING_PLANS.pro) return;

    if (hasActiveSub || plan === BILLING_PLANS.pro) {
      autoCheckoutStarted.current = true;
      const next = new URLSearchParams(searchParams);
      next.delete("checkout");
      next.delete("plan");
      setSearchParams(next, { replace: true });
      setSuccess(t("alreadyProPortal"));
      openPortal();
      return;
    }

    if (!billingReady || plan !== BILLING_PLANS.free) return;

    autoCheckoutStarted.current = true;
    const next = new URLSearchParams(searchParams);
    next.delete("checkout");
    setSearchParams(next, { replace: true });

    if (isSimulation) {
      setCheckoutModalOpen(true);
      return;
    }

    startCheckout(BILLING_PLANS.pro);
  }, [
    data,
    loading,
    checkoutIntent,
    planIntent,
    plan,
    hasActiveSub,
    billingReady,
    isSimulation,
    searchParams,
    setSearchParams,
    t,
  ]);

  const billingStatusLabel = data?.billing_status
    ? t(`status.${data.billing_status}`, { defaultValue: data.billing_status })
    : null;

  function renderPlanAction(item) {
    const isCurrent = Boolean(item.current);
    const isPro = item.id === BILLING_PLANS.pro;
    const isEnterprise = item.id === BILLING_PLANS.enterprise;
    const isFree = item.id === BILLING_PLANS.free;

    if (isCurrent) {
      return (
        <>
          <span className="account-billing-current-tag">{t("current")}</span>
          {isPro && data?.can_manage_portal ? (
            <button
              type="button"
              className="account-btn account-btn--secondary"
              onClick={openPortal}
              disabled={actionLoading === "portal"}
            >
              {actionLoading === "portal" ? tc("actions.saving") : t("manageCurrentPlan")}
            </button>
          ) : null}
        </>
      );
    }

    if (isPro && billingReady) {
      return (
        <>
          <button
            type="button"
            className="account-btn account-btn--primary"
            onClick={() => (hasActiveSub ? openPortal() : startCheckout(BILLING_PLANS.pro))}
            disabled={actionLoading === "checkout-pro" || actionLoading === "portal"}
          >
            {actionLoading === "checkout-pro" || actionLoading === "portal"
              ? tc("actions.saving")
              : hasActiveSub
                ? t("switchToPro")
                : t("upgradePro")}
          </button>
          <p className="account-muted account-billing-plan-note">
            {hasActiveSub ? t("changeViaPortal") : t("upgradeProDesc")}
          </p>
        </>
      );
    }

    if (isFree && plan !== BILLING_PLANS.free && data?.can_manage_portal) {
      return (
        <>
          <button
            type="button"
            className="account-btn account-btn--secondary"
            onClick={openPortal}
            disabled={actionLoading === "portal"}
          >
            {actionLoading === "portal" ? tc("actions.saving") : t("downgradeViaPortal")}
          </button>
          <p className="account-muted account-billing-plan-note">{t("downgradeHint")}</p>
        </>
      );
    }

    if (isEnterprise && item.contact_email) {
      return (
        <>
          <a className="account-btn account-btn--secondary" href={`mailto:${item.contact_email}`}>
            {t("contactEnterprise")}
          </a>
          <p className="account-muted account-billing-plan-note">{t("contactEnterpriseDesc")}</p>
        </>
      );
    }

    return null;
  }

  return (
    <div className="account-page">
      <nav className="account-subnav" aria-label="Compte">
        <Link to="/app/profil">{tc("profileMenu.myProfile")}</Link>
        <Link to="/app/abonnement" className="active">
          {t("title")}
        </Link>
        <Link to="/app/parametres">{tc("nav.settings")}</Link>
      </nav>

      <header className="account-header">
        <h1>{t("title")}</h1>
        <p>{t("subtitle")}</p>
      </header>

      {planIntent === BILLING_PLANS.pro && plan === BILLING_PLANS.free ? (
        <div className="account-card account-billing-intent">
          <p>{t("proIntentBanner")}</p>
          {billingReady ? (
            <button
              type="button"
              className="account-btn account-btn--primary account-billing-action"
              onClick={() => (isSimulation ? setCheckoutModalOpen(true) : startCheckout(BILLING_PLANS.pro))}
              disabled={actionLoading === "checkout-pro" || actionLoading === "simulate"}
            >
              {actionLoading === "checkout-pro" || actionLoading === "simulate"
                ? tc("actions.saving")
                : t("upgradePro")}
            </button>
          ) : null}
        </div>
      ) : null}

      <AccountAlerts error={error || (loadError ? t("errors.load") : "")} success={success} />

      {loading && !data ? (
        <div className="account-card">
          <p className="account-muted">{t("loading")}</p>
        </div>
      ) : null}

      {isSimulation ? (
        <div className="account-card account-billing-intent">
          <p>{t("sim.banner")}</p>
        </div>
      ) : null}

      {data && !billingReady ? (
        <div className="account-card account-billing-notice">
          <h2>{t("notConfiguredTitle")}</h2>
          <p>{t("notConfiguredDesc")}</p>
        </div>
      ) : null}

      {data ? (
        <>
          <section className="account-grid account-grid--2">
            <div className="account-card">
              <div className="account-card-head">
                <div>
                  <h2>{t("currentPlan")}</h2>
                  <p>
                    {billingStatusLabel ? `${billingStatusLabel}` : null}
                    {data.plan_period_end
                      ? ` · ${t("renewal")} : ${formatDate(data.plan_period_end)}`
                      : ` · ${t("noRenewal")}`}
                  </p>
                </div>
                <PlanBadge plan={plan} />
              </div>
              <ul className="account-plan-features">
                {planFeatures.map((feature) => (
                  <li
                    key={feature}
                    className={plan === "free" && feature !== t("features.freeInvoices") ? "is-locked" : "is-included"}
                  >
                    <i
                      className={`fa-solid ${plan === "free" && feature !== t("features.freeInvoices") ? "fa-lock" : "fa-check"}`}
                      aria-hidden
                    />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>

            <div className="account-card">
              <div className="account-card-head">
                <div>
                  <h2>{t("paymentMethod")}</h2>
                  <p>{paymentMethod ? cardBrandLabel(paymentMethod.brand) : t("paymentMethodHint")}</p>
                </div>
                <span className="account-card-icon" aria-hidden>
                  <i className="fa-solid fa-credit-card" />
                </span>
              </div>
              {paymentMethod ? (
                <div className="account-payment-card">
                  <strong>•••• •••• •••• {paymentMethod.last4}</strong>
                  <span>{t("cardExpires", { month: paymentMethod.exp_month, year: paymentMethod.exp_year })}</span>
                </div>
              ) : (
                <p className="account-muted">{t("noPaymentMethod")}</p>
              )}
              {billingReady && (data.can_manage_portal || plan === BILLING_PLANS.free) ? (
                <button
                  type="button"
                  className="account-btn account-btn--secondary account-billing-action"
                  onClick={() => (data.can_manage_portal && (hasActiveSub || paymentMethod) ? openPortal() : startCheckout(BILLING_PLANS.pro))}
                  disabled={actionLoading === "portal" || actionLoading === "checkout-pro"}
                >
                  {actionLoading === "portal" || actionLoading === "checkout-pro"
                    ? tc("actions.saving")
                    : data.can_manage_portal
                      ? t("managePortal")
                      : t("addPaymentMethod")}
                </button>
              ) : null}
            </div>
          </section>

          {(data.can_manage_portal || isSimulation) ? (
            <div className="account-card account-billing-portal-hint">
              <h2>{t("changePlanTitle")}</h2>
              <p>{isSimulation ? t("sim.portalDesc") : t("changePlanDesc")}</p>
              <button
                type="button"
                className="account-btn account-btn--primary"
                onClick={openPortal}
                disabled={actionLoading === "portal"}
              >
                {actionLoading === "portal" ? tc("actions.saving") : t("managePortal")}
              </button>
            </div>
          ) : null}

          <section className="account-billing-plans">
            <h2 className="account-billing-plans-title">{t("comparePlans")}</h2>
            {plans.map((item) => (
              <article
                key={item.id}
                className={`account-card account-billing-plan ${item.current ? "is-current" : ""}`}
              >
                <div className="account-billing-plan-head">
                  <h3>{item.label}</h3>
                  <p className="account-billing-price">{item.price_label}</p>
                </div>
                {renderPlanAction(item)}
              </article>
            ))}
          </section>
        </>
      ) : null}

      <BillingSimCheckoutModal
        open={checkoutModalOpen}
        onClose={() => setCheckoutModalOpen(false)}
        saving={actionLoading === "simulate"}
        onConfirm={(card) => applySimulation({ action: "checkout_pro", card })}
      />

      <BillingSimPortalModal
        open={portalModalOpen}
        onClose={() => setPortalModalOpen(false)}
        currentPlan={plan}
        saving={actionLoading === "simulate"}
        onAction={applySimulation}
      />
    </div>
  );
}
