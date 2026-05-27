import { getStoredToken } from "../api/client";

export const BILLING_PLANS = {
  free: "free",
  pro: "pro",
  enterprise: "enterprise",
};

const ENTERPRISE_EMAIL = "contact@facturo.app";

/** Chemin app abonnement avec intention de plan. */
export function billingAppPath(plan, { startCheckout = false } = {}) {
  const params = new URLSearchParams();
  if (plan === BILLING_PLANS.pro) {
    params.set("plan", "pro");
    if (startCheckout) params.set("checkout", "start");
  }
  const query = params.toString();
  return query ? `/app/abonnement?${query}` : "/app/abonnement";
}

/** Lien CTA depuis la page publique tarifs. */
export function publicPlanCtaHref(planId) {
  const loggedIn = Boolean(getStoredToken());

  if (planId === BILLING_PLANS.enterprise) {
    return `mailto:${ENTERPRISE_EMAIL}?subject=Offre%20Entreprise%20Facturo`;
  }

  if (planId === BILLING_PLANS.free) {
    return loggedIn ? "/app" : "/register";
  }

  if (planId === BILLING_PLANS.pro) {
    return loggedIn ? billingAppPath("pro", { startCheckout: true }) : "/register?plan=pro";
  }

  return "/register";
}

/** Redirection post-login / post-register selon l'intention plan. */
export function authRedirectPath(searchParams) {
  const plan = searchParams.get("plan");
  const redirect = searchParams.get("redirect");

  if (redirect && redirect.startsWith("/")) {
    return redirect;
  }

  if (plan === BILLING_PLANS.pro) {
    return billingAppPath("pro", { startCheckout: true });
  }

  return "/app";
}

/** Construit login URL en conservant l'intention plan. */
export function loginPathWithPlan(plan) {
  if (plan === BILLING_PLANS.pro) {
    return `/login?plan=pro`;
  }
  return "/login";
}

/** Construit register URL avec plan optionnel. */
export function registerPathWithPlan(plan) {
  if (plan === BILLING_PLANS.pro) {
    return `/register?plan=pro`;
  }
  return "/register";
}

export function isExternalHref(href) {
  return href.startsWith("mailto:") || href.startsWith("http");
}
