import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAmountsPrivacy } from "../hooks/useAmountsPrivacy";
import AppModal from "./AppModal";
import AppPasswordField from "./AppPasswordField";
import FormActions from "./FormActions";

export default function AmountsPrivacyToggle({ compact = false, menuItem = false, profileRow = false, settingsRow = false }) {
  const namespace = settingsRow ? "settings" : profileRow ? "profile" : "reports";
  const { t } = useTranslation(namespace);
  const ns = settingsRow || profileRow ? "privacy" : undefined;
  const labelKey = (key) => (ns ? `${ns}.${key}` : key);
  const { amountsVisible, unlockWithPassword, hide } = useAmountsPrivacy();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const iconClass = amountsVisible ? "fa-solid fa-money-bill-wave" : "fa-solid fa-coins";
  const label = amountsVisible ? t(labelKey("hideAmounts")) : t(labelKey("showAmounts"));

  function closeModal() {
    setOpen(false);
    setPassword("");
    setError("");
  }

  async function onSubmit(e) {
    e.preventDefault();
    if (amountsVisible) {
      hide();
      closeModal();
      return;
    }
    if (!password.trim()) {
      setError("Veuillez saisir votre mot de passe.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await unlockWithPassword(password.trim());
      closeModal();
    } catch (err) {
      setError(
        err.body?.errors?.password?.[0] || err.body?.message || "Mot de passe incorrect.",
      );
    } finally {
      setLoading(false);
    }
  }

  function handleClick() {
    if (amountsVisible) {
      hide();
      return;
    }
    setPassword("");
    setError("");
    setOpen(true);
  }

  const modal = (
    <AppModal open={open} onClose={closeModal} title={t(labelKey("unlockTitle"))} description={t(labelKey("unlockDesc"))}>
      <form className="app-modal-form app-modal-form--compact" onSubmit={onSubmit}>
        <div className="app-modal-form__scroll account-form">
          <AppPasswordField
            id="amounts-privacy-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
          />
          {error ? (
            <p className="app-modal-form__error" role="alert">
              {error}
            </p>
          ) : null}
        </div>
        <FormActions
          onCancel={closeModal}
          submitLabel={loading ? "Vérification…" : t(labelKey("showAmounts"))}
          saving={loading}
          cancelDisabled={loading}
        />
      </form>
    </AppModal>
  );

  if (settingsRow) {
    return (
      <>
        <button type="button" className="settings-row" onClick={handleClick}>
          <span className="settings-row-icon" aria-hidden>
            <i className={iconClass} />
          </span>
          <span className="settings-row-text">
            <strong>{t("privacy.tileTitle")}</strong>
            <span>{t("privacy.tileDesc")}</span>
          </span>
          <i className="fa-solid fa-chevron-right settings-row-chevron" aria-hidden />
        </button>
        {modal}
      </>
    );
  }

  if (profileRow) {
    return (
      <>
        <button type="button" className="profile-row" onClick={handleClick}>
          <span className="profile-row-icon" aria-hidden>
            <i className={iconClass} />
          </span>
          <span className="profile-row-text">
            <strong>{t("privacy.tileTitle")}</strong>
            <span>{t("privacy.tileDesc")}</span>
          </span>
          <i className="fa-solid fa-chevron-right profile-row-chevron" aria-hidden />
        </button>
        {modal}
      </>
    );
  }

  if (menuItem) {
    return (
      <>
        <button type="button" className="app-shell__profile-item" onClick={handleClick}>
          <i className={iconClass} aria-hidden />
          {label}
        </button>
        {modal}
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        className={compact ? "amounts-privacy-btn amounts-privacy-btn--compact" : "amounts-privacy-btn"}
        onClick={handleClick}
        title={label}
        aria-pressed={amountsVisible}
        aria-label={label}
      >
        <i className={iconClass} aria-hidden />
        {!compact ? <span>{label}</span> : null}
      </button>
      {modal}
    </>
  );
}
