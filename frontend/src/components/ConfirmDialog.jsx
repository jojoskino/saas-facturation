import { useTranslation } from "react-i18next";
import AppModal from "./AppModal";
import FormActions from "./FormActions";

export default function ConfirmDialog({
  open,
  onClose,
  title,
  description,
  onConfirm,
  confirmLabel,
  saving = false,
  children,
}) {
  const { t } = useTranslation("common");

  return (
    <AppModal open={open} title={title} description={description} onClose={onClose}>
      <form
        className="app-modal-form"
        onSubmit={(e) => {
          e.preventDefault();
          onConfirm();
        }}
      >
        {children ? <div className="app-modal-form__scroll">{children}</div> : null}
        <FormActions
          onCancel={onClose}
          submitLabel={confirmLabel ?? t("actions.confirm")}
          saving={saving}
          cancelDisabled={saving}
        />
      </form>
    </AppModal>
  );
}
