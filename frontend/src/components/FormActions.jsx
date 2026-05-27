import { useTranslation } from "react-i18next";
import "../styles/form-actions.css";

/**
 * Pied de formulaire standard : Annuler (gauche) puis Enregistrer (droite), alignés à droite.
 */
export default function FormActions({
  onCancel,
  cancelLabel,
  submitLabel,
  saving = false,
  savingLabel,
  submitDisabled = false,
  cancelDisabled = false,
}) {
  const { t } = useTranslation("common");

  return (
    <div className="form-actions">
      <button
        type="button"
        className="form-actions__btn"
        onClick={onCancel}
        disabled={cancelDisabled || saving}
      >
        {cancelLabel ?? t("actions.cancel")}
      </button>
      <button
        type="submit"
        className="form-actions__btn form-actions__btn--primary"
        disabled={submitDisabled || saving}
      >
        {saving ? savingLabel ?? t("actions.saving") : submitLabel ?? t("actions.save")}
      </button>
    </div>
  );
}
