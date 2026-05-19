import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { apiFetch, apiUpload } from "../../api/client";
import { applyUserBranding } from "../../utils/branding";
import { peekCache, setCache } from "../../api/cache";
import { setAppLanguage } from "../../i18n";
import AppModal from "../../components/AppModal";
import AccountAlerts from "../../components/account/AccountAlerts";
import SettingsListSkeleton from "../../components/skeleton/SettingsListSkeleton";
import FormActions from "../../components/FormActions";
import { extractApiMessage, useAccountMe } from "../../hooks/useAccountMe";
import "../../styles/account-pages.css";

const TIMEZONE_KEYS = [
  { value: "Africa/Abidjan", labelKey: "timezones.abidjan" },
  { value: "Africa/Lagos", labelKey: "timezones.lagos" },
  { value: "Africa/Casablanca", labelKey: "timezones.casablanca" },
  { value: "Europe/Paris", labelKey: "timezones.paris" },
  { value: "UTC", labelKey: "timezones.utc" },
];

const DEFAULT_DOC_PRIMARY = "#14213D";
const DEFAULT_DOC_ACCENT = "#FCA311";

const emptyCompany = {
  company_name: "",
  company_address: "",
  company_phone: "",
  company_email: "",
  company_tax_id: "",
  company_bank_name: "",
  company_bank_iban: "",
  company_bank_bic: "",
  company_legal_footer: "",
  document_color_primary: DEFAULT_DOC_PRIMARY,
  document_color_accent: DEFAULT_DOC_ACCENT,
};

export default function SettingsPage() {
  const { t } = useTranslation("settings");
  const { user, loading, error, setError } = useAccountMe();
  const [success, setSuccess] = useState("");
  const [companyOpen, setCompanyOpen] = useState(false);
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [savingCompany, setSavingCompany] = useState(false);
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState("");
  const [removeLogo, setRemoveLogo] = useState(false);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [company, setCompany] = useState(emptyCompany);
  const [prefs, setPrefs] = useState({
    locale: "fr",
    timezone: "Africa/Abidjan",
    notifications_email: true,
  });

  useEffect(() => {
    if (!user) return;
    setCompany({
      company_name: user.company_name || "",
      company_address: user.company_address || "",
      company_phone: user.company_phone || "",
      company_email: user.company_email || "",
      company_tax_id: user.company_tax_id || "",
      company_bank_name: user.company_bank_name || "",
      company_bank_iban: user.company_bank_iban || "",
      company_bank_bic: user.company_bank_bic || "",
      company_legal_footer: user.company_legal_footer || "",
      document_color_primary: user.document_color_primary || DEFAULT_DOC_PRIMARY,
      document_color_accent: user.document_color_accent || DEFAULT_DOC_ACCENT,
    });
    setLogoPreview(user.company_logo_url || "");
    setLogoFile(null);
    setRemoveLogo(false);
    applyUserBranding(user);
    setPrefs({
      locale: user.locale || "fr",
      timezone: user.timezone || "Africa/Abidjan",
      notifications_email: user.notifications_email ?? true,
    });
  }, [user]);

  function onCompanyChange(e) {
    const { name, value } = e.target;
    setCompany((prev) => ({ ...prev, [name]: value }));
  }

  function onPrefsChange(e) {
    const { name, value, type, checked } = e.target;
    setPrefs((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  }

  function onLogoPick(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    setRemoveLogo(false);
    setLogoPreview(URL.createObjectURL(file));
  }

  async function saveCompany(e) {
    e.preventDefault();
    setSavingCompany(true);
    setError("");
    setSuccess("");
    try {
      const fd = new FormData();
      Object.entries(company).forEach(([key, value]) => {
        fd.append(key, value ?? "");
      });
      if (logoFile) fd.append("company_logo", logoFile);
      if (removeLogo) fd.append("remove_company_logo", "1");
      fd.append("_method", "PUT");

      const data = await apiUpload("/api/me/company-profile", fd);
      const u = data?.user;
      if (u) {
        const me = peekCache("/api/me");
        if (me) setCache("/api/me", { ...me, ...u });
        setCompany({
          company_name: u.company_name || "",
          company_address: u.company_address || "",
          company_phone: u.company_phone || "",
          company_email: u.company_email || "",
          company_tax_id: u.company_tax_id || "",
          company_bank_name: u.company_bank_name || "",
          company_bank_iban: u.company_bank_iban || "",
          company_bank_bic: u.company_bank_bic || "",
          company_legal_footer: u.company_legal_footer || "",
          document_color_primary: u.document_color_primary || DEFAULT_DOC_PRIMARY,
          document_color_accent: u.document_color_accent || DEFAULT_DOC_ACCENT,
        });
        setLogoPreview(u.company_logo_url || "");
        setLogoFile(null);
        setRemoveLogo(false);
        applyUserBranding(u);
      }
      setSuccess(data?.message || t("company.success"));
      setCompanyOpen(false);
    } catch (err) {
      setError(extractApiMessage(err, t("company.error")));
    } finally {
      setSavingCompany(false);
    }
  }

  async function savePreferences(e) {
    e.preventDefault();
    setSavingPrefs(true);
    setError("");
    setSuccess("");
    try {
      const data = await apiFetch("/api/me/settings", {
        method: "PUT",
        body: JSON.stringify(prefs),
      });
      const u = data?.user;
      if (u) {
        const me = peekCache("/api/me");
        if (me) setCache("/api/me", { ...me, ...u });
        setPrefs({
          locale: u.locale || "fr",
          timezone: u.timezone || "Africa/Abidjan",
          notifications_email: u.notifications_email ?? true,
        });
        await setAppLanguage(u.locale || "fr");
      }
      setSuccess(data?.message || t("preferences.success"));
      setPrefsOpen(false);
    } catch (err) {
      setError(extractApiMessage(err, t("preferences.error")));
    } finally {
      setSavingPrefs(false);
    }
  }

  return (
    <div className="account-page">
      <header className="account-header">
        <h1>{t("title")}</h1>
        <p>{t("subtitle")}</p>
      </header>

      <AccountAlerts error={error} success={success} />

      {loading && !user ? (
        <SettingsListSkeleton />
      ) : (
      <div className="settings-list">
        <button type="button" className="settings-row" onClick={() => setCompanyOpen(true)}>
          <span className="settings-row-icon" aria-hidden>
            <i className="fa-solid fa-building" />
          </span>
          <span className="settings-row-text">
            <strong>{t("company.tileTitle")}</strong>
            <span>{t("company.tileDesc")}</span>
          </span>
          <i className="fa-solid fa-chevron-right settings-row-chevron" aria-hidden />
        </button>

        <button type="button" className="settings-row" onClick={() => setPrefsOpen(true)}>
          <span className="settings-row-icon" aria-hidden>
            <i className="fa-solid fa-globe" />
          </span>
          <span className="settings-row-text">
            <strong>{t("preferences.tileTitle")}</strong>
            <span>{t("preferences.tileDesc")}</span>
          </span>
          <i className="fa-solid fa-chevron-right settings-row-chevron" aria-hidden />
        </button>
      </div>
      )}

      <AppModal
        open={companyOpen}
        onClose={() => setCompanyOpen(false)}
        title={t("company.modalTitle")}
        description={t("company.modalDesc")}
        wide
      >
        <form className="app-modal-form account-form" onSubmit={saveCompany}>
          <div className="app-modal-form__scroll">
          <div className="account-field account-field--full account-branding-logo">
            <label htmlFor="company_logo">{t("company.logo")}</label>
            <div className="account-logo-row">
              {logoPreview ? (
                <img src={logoPreview} alt="" className="account-logo-preview" />
              ) : (
                <div className="account-logo-placeholder" aria-hidden>
                  <i className="fa-regular fa-image" />
                </div>
              )}
              <div className="account-logo-actions">
                <input
                  id="company_logo"
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  onChange={onLogoPick}
                  disabled={loading || savingCompany}
                />
                {logoPreview ? (
                  <button
                    type="button"
                    className="account-link-btn"
                    onClick={() => {
                      setLogoFile(null);
                      setLogoPreview("");
                      setRemoveLogo(true);
                    }}
                    disabled={loading || savingCompany}
                  >
                    {t("company.logoRemove")}
                  </button>
                ) : null}
              </div>
            </div>
            <p className="account-field-hint">{t("company.logoHint")}</p>
          </div>
          <div className="account-field-row account-field-row--colors">
            <div className="account-field">
              <label htmlFor="document_color_primary">{t("company.colorPrimary")}</label>
              <div className="account-color-input">
                <input
                  id="document_color_primary"
                  name="document_color_primary"
                  type="color"
                  value={company.document_color_primary}
                  onChange={onCompanyChange}
                  disabled={loading}
                />
                <input
                  type="text"
                  name="document_color_primary"
                  value={company.document_color_primary}
                  onChange={onCompanyChange}
                  pattern="^#[0-9A-Fa-f]{6}$"
                  maxLength={7}
                  disabled={loading}
                />
              </div>
            </div>
            <div className="account-field">
              <label htmlFor="document_color_accent">{t("company.colorAccent")}</label>
              <div className="account-color-input">
                <input
                  id="document_color_accent"
                  name="document_color_accent"
                  type="color"
                  value={company.document_color_accent}
                  onChange={onCompanyChange}
                  disabled={loading}
                />
                <input
                  type="text"
                  name="document_color_accent"
                  value={company.document_color_accent}
                  onChange={onCompanyChange}
                  pattern="^#[0-9A-Fa-f]{6}$"
                  maxLength={7}
                  disabled={loading}
                />
              </div>
            </div>
          </div>
          <p className="account-field-hint account-field-hint--block">{t("company.colorsHint")}</p>
          <div className="account-field account-field--full">
            <label htmlFor="company_name">{t("company.name")}</label>
            <input
              id="company_name"
              name="company_name"
              value={company.company_name}
              onChange={onCompanyChange}
              placeholder={t("company.namePlaceholder")}
              disabled={loading}
            />
          </div>
          <div className="account-field account-field--full">
            <label htmlFor="company_address">{t("company.address")}</label>
            <textarea
              id="company_address"
              name="company_address"
              value={company.company_address}
              onChange={onCompanyChange}
              placeholder={t("company.addressPlaceholder")}
              disabled={loading}
            />
          </div>
          <div className="account-field">
            <label htmlFor="company_phone">{t("company.phone")}</label>
            <input
              id="company_phone"
              name="company_phone"
              value={company.company_phone}
              onChange={onCompanyChange}
              placeholder={t("company.phonePlaceholder")}
              disabled={loading}
            />
          </div>
          <div className="account-field">
            <label htmlFor="company_email">{t("company.email")}</label>
            <input
              id="company_email"
              type="email"
              name="company_email"
              value={company.company_email}
              onChange={onCompanyChange}
              placeholder={t("company.emailPlaceholder")}
              disabled={loading}
            />
          </div>
          <div className="account-field account-field--full">
            <label htmlFor="company_tax_id">{t("company.taxId")}</label>
            <input
              id="company_tax_id"
              name="company_tax_id"
              value={company.company_tax_id}
              onChange={onCompanyChange}
              placeholder={t("company.taxIdPlaceholder")}
              disabled={loading}
            />
          </div>
          <div className="account-field">
            <label htmlFor="company_bank_name">{t("company.bank")}</label>
            <input
              id="company_bank_name"
              name="company_bank_name"
              value={company.company_bank_name}
              onChange={onCompanyChange}
              placeholder={t("company.bankPlaceholder")}
              disabled={loading}
            />
          </div>
          <div className="account-field">
            <label htmlFor="company_bank_iban">{t("company.iban")}</label>
            <input
              id="company_bank_iban"
              name="company_bank_iban"
              value={company.company_bank_iban}
              onChange={onCompanyChange}
              disabled={loading}
            />
          </div>
          <div className="account-field account-field--full">
            <label htmlFor="company_bank_bic">{t("company.bic")}</label>
            <input
              id="company_bank_bic"
              name="company_bank_bic"
              value={company.company_bank_bic}
              onChange={onCompanyChange}
              disabled={loading}
            />
          </div>
          <div className="account-field account-field--full">
            <label htmlFor="company_legal_footer">{t("company.legalFooter")}</label>
            <textarea
              id="company_legal_footer"
              name="company_legal_footer"
              value={company.company_legal_footer}
              onChange={onCompanyChange}
              placeholder={t("company.legalFooterPlaceholder")}
              disabled={loading}
            />
          </div>
          </div>
          <FormActions
            onCancel={() => setCompanyOpen(false)}
            submitLabel={t("company.save")}
            saving={savingCompany}
            submitDisabled={loading}
          />
        </form>
      </AppModal>

      <AppModal
        open={prefsOpen}
        onClose={() => setPrefsOpen(false)}
        title={t("preferences.modalTitle")}
        description={t("preferences.modalDesc")}
      >
        <form className="account-form" onSubmit={savePreferences}>
          <div className="account-field account-field--full">
            <label htmlFor="locale">{t("preferences.language")}</label>
            <select id="locale" name="locale" value={prefs.locale} onChange={onPrefsChange} disabled={loading}>
              <option value="fr">{t("preferences.languageFr")}</option>
              <option value="en">{t("preferences.languageEn")}</option>
            </select>
          </div>
          <div className="account-field account-field--full">
            <label htmlFor="timezone">{t("preferences.timezone")}</label>
            <select id="timezone" name="timezone" value={prefs.timezone} onChange={onPrefsChange} disabled={loading}>
              {TIMEZONE_KEYS.map((tz) => (
                <option key={tz.value} value={tz.value}>
                  {t(tz.labelKey)}
                </option>
              ))}
            </select>
          </div>
          <div className="account-field account-field--full">
            <label className="account-switch" htmlFor="notifications_email">
              <span>
                {t("preferences.notifications")}
                <small>{t("preferences.notificationsHint")}</small>
              </span>
              <input
                id="notifications_email"
                type="checkbox"
                name="notifications_email"
                checked={prefs.notifications_email}
                onChange={onPrefsChange}
                disabled={loading}
              />
            </label>
          </div>
          <FormActions
            onCancel={() => setPrefsOpen(false)}
            submitLabel={t("preferences.save")}
            saving={savingPrefs}
            submitDisabled={loading}
          />
        </form>
      </AppModal>
    </div>
  );
}
