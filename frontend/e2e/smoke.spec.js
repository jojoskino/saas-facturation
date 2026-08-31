import { test, expect } from "@playwright/test";

test.describe("Pages publiques", () => {
  test("accueil affiche le logo et les liens principaux", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/La Facture/);
    await expect(page.getByRole("img", { name: "La Facture" }).first()).toBeVisible();
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

  test("footer affiche le contact développeur", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: "essev2030@gmail.com" })).toBeVisible();
  });
});
