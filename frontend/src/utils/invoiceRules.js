export function invoicePaidTotal(invoice) {
  return Number(invoice?.paid_total ?? 0);
}

export function canDeleteInvoice(invoice) {
  if (!invoice || invoice.document_type === "credit_note") return false;
  if (invoice.status !== "draft") return false;
  if (invoicePaidTotal(invoice) > 0.001) return false;
  if (Number(invoice.credit_notes_count ?? 0) > 0) return false;
  return true;
}

export function canEditFinancialFields(invoice) {
  if (!invoice || invoice.document_type === "credit_note") return false;
  if (invoice.status === "cancelled") return false;
  if (invoice.status !== "draft") return false;
  if (invoicePaidTotal(invoice) > 0.001) return false;
  return true;
}

export function canCreateCreditNote(invoice) {
  if (!invoice || invoice.document_type === "credit_note") return false;
  if (invoice.status === "draft" || invoice.status === "cancelled") return false;
  if (Number(invoice.credit_notes_count ?? 0) > 0) return false;
  return true;
}

export function isInvoiceLocked(invoice) {
  return invoice?.status === "cancelled" || invoice?.document_type === "credit_note";
}

export function invoiceBalanceDue(invoice) {
  const total = Number(invoice?.total ?? 0);
  const paid = invoicePaidTotal(invoice);
  return Math.max(0, Math.round((total - paid) * 100) / 100);
}

export function inlineStatusOptionsForInvoice(invoice, allOptions, t) {
  const paidOption = { value: "paid", label: t("invoices.statusPaid") };
  const cancelledOption = { value: "cancelled", label: t("invoices.statusCancelled") };

  if (invoice.status === "paid") return [paidOption];
  if (invoice.status === "cancelled") return [cancelledOption];

  const editable = allOptions.filter((opt) => opt.value !== "paid");

  if (invoice.status === "draft") {
    return editable;
  }

  return editable.filter((opt) => !["draft", "cancelled"].includes(opt.value));
}
