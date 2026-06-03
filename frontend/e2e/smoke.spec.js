import { test, expect } from "@playwright/test";

test.describe("Pages publiques LAFACTURE", () => {
  test("accueil affiche la marque et les liens principaux", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/LAFACTURE/);
    await expect(page.getByRole("link", { name: /LA\s*FACTURE|LAFACTURE/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Connexion" }).first()).toBeVisible();
  });

  test("page connexion affiche le formulaire", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "Connexion" })).toBeVisible();
    await expect(page.locator("#login-email")).toBeVisible();
    await expect(page.locator("#login-password")).toBeVisible();
    await expect(page.getByRole("button", { name: /Se connecter/i })).toBeVisible();
  });

  test("page inscription affiche le formulaire", async ({ page }) => {
    await page.goto("/register");
    await expect(page.getByRole("heading", { name: /Créer un compte/i })).toBeVisible();
    await expect(page.locator("#reg-email")).toBeVisible();
    await expect(page.getByRole("button", { name: /Créer mon compte/i })).toBeVisible();
  });

  test("mot de passe oublié affiche le formulaire", async ({ page }) => {
    await page.goto("/forgot-password");
    await expect(page.getByRole("heading", { name: /Mot de passe oublié/i })).toBeVisible();
    await expect(page.locator("#forgot-email")).toBeVisible();
    await expect(page.getByRole("button", { name: /Envoyer le lien/i })).toBeVisible();
  });

  test("mentions légales affichent LAFACTURE", async ({ page }) => {
    await page.goto("/legal/mentions");
    await expect(page.getByRole("heading", { name: /Mentions légales/i })).toBeVisible();
    await expect(page.getByText("LAFACTURE", { exact: true })).toBeVisible();
  });

  test("CGU et confidentialité sont accessibles", async ({ page }) => {
    await page.goto("/legal/cgu");
    await expect(page.getByRole("heading", { name: /Conditions générales/i })).toBeVisible();

    await page.goto("/legal/confidentialite");
    await expect(page.getByRole("heading", { name: /Politique de confidentialité/i })).toBeVisible();

    await page.goto("/legal/cookies");
    await expect(page.getByRole("heading", { name: /Politique de cookies/i })).toBeVisible();
  });

  test("offre Entreprise propose un contact commercial", async ({ page }) => {
    await page.goto("/#tarifs");
    await expect(page.getByRole("link", { name: /Contacter les ventes/i })).toBeVisible();
  });
});
