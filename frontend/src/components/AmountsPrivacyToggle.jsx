import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAmountsPrivacy } from "../hooks/useAmountsPrivacy";
import AppModal from "./AppModal";
import AppPasswordField from "./AppPasswordField";
import FormActions from "./FormActions";

export default function AmountsPrivacyToggle({ compact = false, menuItem = false }) {
  const { t } = useTranslation("reports");
  const { amountsVisible, unlockWithPassword, hide } = useAmountsPrivacy();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const iconClass = amountsVisible ? "fa-solid fa-money-bill-wave" : "fa-solid fa-coins";
  const label = amountsVisible ? t("hideAmounts") : t("showAmounts");

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
    <AppModal open={open} onClose={closeModal} title={t("unlockTitle")} description={t("unlockDesc")}>
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
          submitLabel={loading ? "Vérification…" : t("showAmounts")}
          saving={loading}
          cancelDisabled={loading}
        />
      </form>
    </AppModal>
  );

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
