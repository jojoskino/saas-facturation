import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import AppModal from "./AppModal";
import FormActions from "./FormActions";

const DEFAULT_CARD = {
  brand: "visa",
  last4: "4242",
  exp_month: "12",
  exp_year: String(new Date().getFullYear() + 3),
};

export function BillingSimCheckoutModal({ open, onClose, onConfirm, saving }) {
  const { t } = useTranslation("billing");
  const [last4, setLast4] = useState(DEFAULT_CARD.last4);
  const [expMonth, setExpMonth] = useState(DEFAULT_CARD.exp_month);
  const [expYear, setExpYear] = useState(DEFAULT_CARD.exp_year);

  useEffect(() => {
    if (!open) return;
    setLast4(DEFAULT_CARD.last4);
    setExpMonth(DEFAULT_CARD.exp_month);
    setExpYear(DEFAULT_CARD.exp_year);
  }, [open]);

  function handleSubmit(e) {
    e.preventDefault();
    onConfirm({
      brand: "visa",
      last4: last4.replace(/\D/g, "").slice(-4) || "4242",
      exp_month: Number.parseInt(expMonth, 10) || 12,
      exp_year: Number.parseInt(expYear, 10) || new Date().getFullYear() + 3,
    });
  }

  return (
    <AppModal
      open={open}
      onClose={onClose}
      title={t("sim.checkoutTitle")}
      description={t("sim.checkoutDesc")}
    >
      <form className="app-modal-form" onSubmit={handleSubmit}>
        <div className="app-modal-form__scroll billing-sim-form">
          <div className="billing-sim-badge">
            <i className="fa-solid fa-flask" aria-hidden /> {t("sim.badge")}
          </div>
          <p className="account-muted">{t("sim.checkoutAmount")}</p>
          <div className="account-field account-field--full">
            <label htmlFor="sim-last4">{t("sim.cardLast4")}</label>
            <input
              id="sim-last4"
              value={last4}
              onChange={(e) => setLast4(e.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder="4242"
              maxLength={4}
              required
            />
          </div>
          <div className="billing-sim-row">
            <div className="account-field">
              <label htmlFor="sim-exp-m">{t("sim.cardExpMonth")}</label>
              <input
                id="sim-exp-m"
                value={expMonth}
                onChange={(e) => setExpMonth(e.target.value.replace(/\D/g, "").slice(0, 2))}
                placeholder="12"
                maxLength={2}
                required
              />
            </div>
            <div className="account-field">
              <label htmlFor="sim-exp-y">{t("sim.cardExpYear")}</label>
              <input
                id="sim-exp-y"
                value={expYear}
                onChange={(e) => setExpYear(e.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="2028"
                maxLength={4}
                required
              />
            </div>
          </div>
        </div>
        <FormActions onCancel={onClose} submitLabel={t("sim.confirmPay")} saving={saving} />
      </form>
    </AppModal>
  );
}

export function BillingSimPortalModal({ open, onClose, currentPlan, onAction, saving }) {
  const { t } = useTranslation("billing");
  const [plan, setPlan] = useState(currentPlan || "free");
  const [last4, setLast4] = useState(DEFAULT_CARD.last4);
  const [expMonth, setExpMonth] = useState(DEFAULT_CARD.exp_month);
  const [expYear, setExpYear] = useState(DEFAULT_CARD.exp_year);

  useEffect(() => {
    if (!open) return;
    setPlan(currentPlan || "free");
    setLast4(DEFAULT_CARD.last4);
    setExpMonth(DEFAULT_CARD.exp_month);
    setExpYear(DEFAULT_CARD.exp_year);
  }, [open, currentPlan]);

  const card = {
    brand: "visa",
    last4: last4.replace(/\D/g, "").slice(-4) || "4242",
    exp_month: Number.parseInt(expMonth, 10) || 12,
    exp_year: Number.parseInt(expYear, 10) || new Date().getFullYear() + 3,
  };

  return (
    <AppModal open={open} onClose={onClose} title={t("sim.portalTitle")} description={t("sim.portalDesc")}>
      <div className="app-modal-form">
        <div className="app-modal-form__scroll billing-sim-form">
          <div className="billing-sim-badge">
            <i className="fa-solid fa-flask" aria-hidden /> {t("sim.badge")}
          </div>

          <fieldset className="billing-sim-plans">
            <legend>{t("sim.selectPlan")}</legend>
            {["free", "pro", "enterprise"].map((id) => (
              <label key={id} className="billing-sim-plan-option">
                <input
                  type="radio"
                  name="sim-plan"
                  value={id}
                  checked={plan === id}
                  onChange={() => setPlan(id)}
                />
                <span>{t(`sim.plans.${id}`)}</span>
              </label>
            ))}
          </fieldset>

          <div className="account-field account-field--full">
            <label htmlFor="portal-last4">{t("sim.cardLast4")}</label>
            <input
              id="portal-last4"
              value={last4}
              onChange={(e) => setLast4(e.target.value.replace(/\D/g, "").slice(0, 4))}
              maxLength={4}
            />
          </div>
          <div className="billing-sim-row">
            <div className="account-field">
              <label htmlFor="portal-exp-m">{t("sim.cardExpMonth")}</label>
              <input
                id="portal-exp-m"
                value={expMonth}
                onChange={(e) => setExpMonth(e.target.value.replace(/\D/g, "").slice(0, 2))}
                maxLength={2}
              />
            </div>
            <div className="account-field">
              <label htmlFor="portal-exp-y">{t("sim.cardExpYear")}</label>
              <input
                id="portal-exp-y"
                value={expYear}
                onChange={(e) => setExpYear(e.target.value.replace(/\D/g, "").slice(0, 4))}
                maxLength={4}
              />
            </div>
          </div>
        </div>

        <div className="billing-sim-portal-actions">
          <button
            type="button"
            className="account-btn account-btn--primary"
            disabled={saving}
            onClick={() => onAction({ action: "change_plan", plan, card })}
          >
            {saving ? t("sim.applying") : t("sim.applyPlan")}
          </button>
          <button
            type="button"
            className="account-btn account-btn--secondary"
            disabled={saving}
            onClick={() => onAction({ action: "update_card", card })}
          >
            {t("sim.updateCardOnly")}
          </button>
          <button
            type="button"
            className="account-btn account-btn--secondary"
            disabled={saving || currentPlan === "free"}
            onClick={() => onAction({ action: "cancel" })}
          >
            {t("sim.cancelSub")}
          </button>
          <button type="button" className="account-btn account-btn--secondary" onClick={onClose} disabled={saving}>
            {t("sim.close")}
          </button>
        </div>
      </div>
    </AppModal>
  );
}
