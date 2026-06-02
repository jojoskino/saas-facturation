export const PAYMENT_METHODS = [
  { value: "bank_transfer", label: "Virement" },
  { value: "cash", label: "Espèces" },
  { value: "mobile_money", label: "Mobile money" },
  { value: "check", label: "Chèque" },
  { value: "card", label: "Carte bancaire" },
  { value: "other", label: "Autre" },
];

const LABELS = Object.fromEntries(PAYMENT_METHODS.map((m) => [m.value, m.label]));

export function paymentMethodLabel(method) {
  if (!method) return "—";
  return LABELS[method] || method;
}
