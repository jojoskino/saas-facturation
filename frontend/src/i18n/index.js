import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import frCommon from "./locales/fr/common.json";
import enCommon from "./locales/en/common.json";
import frSettings from "./locales/fr/settings.json";
import enSettings from "./locales/en/settings.json";
import frProfile from "./locales/fr/profile.json";
import enProfile from "./locales/en/profile.json";
import frApp from "./locales/fr/app.json";
import enApp from "./locales/en/app.json";
import frReports from "./locales/fr/reports.json";
import enReports from "./locales/en/reports.json";
import frBilling from "./locales/fr/billing.json";
import enBilling from "./locales/en/billing.json";

const STORAGE_KEY = "facturo_locale";

function getInitialLanguage() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "fr" || stored === "en") return stored;
  const browser = (navigator.language || "fr").slice(0, 2);
  return browser === "en" ? "en" : "fr";
}

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
    en: {
      common: enCommon,
      settings: enSettings,
      profile: enProfile,
      app: enApp,
      reports: enReports,
      billing: enBilling,
    },
  },
  lng: getInitialLanguage(),
  fallbackLng: "fr",
  defaultNS: "common",
  ns: ["common", "settings", "profile", "app", "reports", "billing"],
  interpolation: { escapeValue: false },
});

export function setAppLanguage(locale) {
  const lang = locale === "en" ? "en" : "fr";
  localStorage.setItem(STORAGE_KEY, lang);
  return i18n.changeLanguage(lang);
}

export { STORAGE_KEY };
export default i18n;
