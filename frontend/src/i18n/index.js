import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import frCommon from "./locales/fr/common.json";
import frSettings from "./locales/fr/settings.json";
import frProfile from "./locales/fr/profile.json";
import frApp from "./locales/fr/app.json";
import frReports from "./locales/fr/reports.json";
import frBilling from "./locales/fr/billing.json";

const STORAGE_KEY = "facturo_locale";

function getInitialLanguage() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "fr" || stored === "en") return stored;
  const browser = (navigator.language || "fr").slice(0, 2);
  return browser === "en" ? "en" : "fr";
}

let englishLoadPromise = null;

export async function ensureEnglishLoaded() {
  if (i18n.hasResourceBundle("en", "common")) return;

  if (!englishLoadPromise) {
    englishLoadPromise = Promise.all([
      import("./locales/en/common.json"),
      import("./locales/en/settings.json"),
      import("./locales/en/profile.json"),
      import("./locales/en/app.json"),
      import("./locales/en/reports.json"),
      import("./locales/en/billing.json"),
    ]).then(([common, settings, profile, app, reports, billing]) => {
      i18n.addResourceBundle("en", "common", common.default, true, true);
      i18n.addResourceBundle("en", "settings", settings.default, true, true);
      i18n.addResourceBundle("en", "profile", profile.default, true, true);
      i18n.addResourceBundle("en", "app", app.default, true, true);
      i18n.addResourceBundle("en", "reports", reports.default, true, true);
      i18n.addResourceBundle("en", "billing", billing.default, true, true);
    });
  }

  return englishLoadPromise;
}

const initialLanguage = getInitialLanguage();

i18n.use(initReactI18next).init({
  resources: {
    fr: {
      common: frCommon,
      settings: frSettings,
      profile: frProfile,
      app: frApp,
      reports: frReports,
      billing: frBilling,
    },
  },
  lng: initialLanguage === "en" ? "fr" : initialLanguage,
  fallbackLng: "fr",
  defaultNS: "common",
  ns: ["common", "settings", "profile", "app", "reports", "billing"],
  interpolation: { escapeValue: false },
});

if (initialLanguage === "en") {
  ensureEnglishLoaded().then(() => i18n.changeLanguage("en"));
}

export function setAppLanguage(locale) {
  const lang = locale === "en" ? "en" : "fr";
  localStorage.setItem(STORAGE_KEY, lang);
  if (lang === "en") {
    return ensureEnglishLoaded().then(() => i18n.changeLanguage(lang));
  }
  return i18n.changeLanguage(lang);
}

export { STORAGE_KEY };
export default i18n;
