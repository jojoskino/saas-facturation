import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import ModalPortal from "./ModalPortal";
import "../styles/app-modal.css";

export default function AppModal({ open, title, description, onClose, children, wide = false }) {
  const { t } = useTranslation("common");

  useEffect(() => {
    if (!open) return undefined;
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <ModalPortal>
      <div className="app-modal-backdrop" role="dialog" aria-modal="true" onClick={onClose}>
        <section
          className={`app-modal ${wide ? "app-modal--wide" : ""}`}
          onClick={(e) => e.stopPropagation()}
          aria-labelledby="app-modal-title"
        >
          <div className="app-modal-head">
            <div>
              <h2 id="app-modal-title">{title}</h2>
              {description ? <p className="app-modal-desc">{description}</p> : null}
            </div>
            <button type="button" className="app-modal-close" onClick={onClose} aria-label={t("actions.close")}>
              <i className="fa-solid fa-xmark" />
            </button>
          </div>
          <div className="app-modal-body">{children}</div>
        </section>
      </div>
    </ModalPortal>
  );
}
