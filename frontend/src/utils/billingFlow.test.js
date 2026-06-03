import { describe, it, expect, vi, beforeEach } from "vitest";
import * as client from "../api/client";
import {
  authRedirectPath,
  billingAppPath,
  publicPlanCtaHref,
  BILLING_PLANS,
  isExternalHref,
} from "./billingFlow";

vi.mock("../api/client", () => ({
  getStoredToken: vi.fn(),
}));

describe("billingFlow", () => {
  beforeEach(() => {
    vi.mocked(client.getStoredToken).mockReturnValue(null);
  });

  it("construit le chemin abonnement Pro avec checkout", () => {
    expect(billingAppPath("pro", { startCheckout: true })).toBe("/app/abonnement?plan=pro&checkout=start");
  });

  it("redirige vers /app par défaut après auth", () => {
    const params = new URLSearchParams();
    expect(authRedirectPath(params)).toBe("/app");
  });

  it("honore le redirect interne après auth", () => {
    const params = new URLSearchParams({ redirect: "/app/factures" });
    expect(authRedirectPath(params)).toBe("/app/factures");
  });

  it("envoie vers register Pro si non connecté", () => {
    expect(publicPlanCtaHref(BILLING_PLANS.pro)).toBe("/register?plan=pro");
  });

  it("détecte les liens externes", () => {
    expect(isExternalHref("mailto:test@example.com")).toBe(true);
    expect(isExternalHref("/login")).toBe(false);
  });
});
