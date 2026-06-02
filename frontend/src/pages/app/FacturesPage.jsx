import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch, peekCache } from "../../api/client";
import { paginatedFromCache } from "../../utils/listCache";
import TableSkeleton from "../../components/skeleton/TableSkeleton";
import FormActions from "../../components/FormActions";
import DocumentPreviewModal from "../../components/DocumentPreviewModal";
import { invoiceHistoryPaths } from "../../utils/documentPreview";
import { useTranslation } from "react-i18next";
import { AppDateField, AppSelect, FieldLabel } from "../../components/AppFormControls";
import InlineStatusSelect from "../../components/InlineStatusSelect";
import ConfirmDialog from "../../components/ConfirmDialog";
import ModalPortal from "../../components/ModalPortal";
import ToastStack, { useToasts } from "../../components/ToastStack";
import DocumentLinesEditor, { computeLineTotals, createEmptyLine, validateDocumentLines } from "../../components/DocumentLinesEditor";
import { useAccountMe } from "../../hooks/useAccountMe";
import { useAmountsPrivacy } from "../../hooks/useAmountsPrivacy";
import { invoiceQuotaFromUser } from "../../utils/planFeatures";
import ListFilterBar, { ListFilterField, ListFilterGrid } from "../../components/list/ListFilterBar";
import ListPageHeader from "../../components/list/ListPageHeader";
import ListPagination from "../../components/list/ListPagination";
import ListIconButton from "../../components/list/ListIconButton";
import { PAYMENT_METHODS, paymentMethodLabel } from "../../constants/paymentMethods";
import {
  canCreateCreditNote,
  canDeleteInvoice,
  canEditFinancialFields,
  inlineStatusOptionsForInvoice,
  invoiceBalanceDue,
  invoicePaidTotal,
} from "../../utils/invoiceRules";

const defaultForm = {
  client_id: "",
  quote_id: "",
  number: "",
  status: "draft",
  issue_date: "",
  due_date: "",
  currency: "XOF",
  subtotal: "",
  tax_amount: "",
  total: "",
  paid_at: "",
  notes: "",
  discount_percent: "0",
  items: [createEmptyLine()],
};

export default function FacturesPage() {
  const { t } = useTranslation("app");
  const { user } = useAccountMe();
  const { toasts, pushToast, dismissToast } = useToasts();
  const { maskMoney } = useAmountsPrivacy();
  const showMoney = (value) => maskMoney(value, formatMoney);
  const invoiceQuota = invoiceQuotaFromUser(user);
  const statusOptions = useMemo(
    () => [
      { value: "draft", label: t("invoices.statusDraft") },
      { value: "sent", label: t("invoices.statusSent") },
      { value: "paid", label: t("invoices.statusPaid") },
      { value: "overdue", label: t("invoices.statusOverdue") },
      { value: "cancelled", label: t("invoices.statusCancelled") },
    ],
    [t]
  );
  const editableStatusOptions = useMemo(
    () => statusOptions.filter((opt) => !["paid", "cancelled"].includes(opt.value)),
    [statusOptions]
  );
  const [listTab, setListTab] = useState("invoice");
  const [invoices, setInvoices] = useState(() => paginatedFromCache(buildInvoicesUrl(1, "", "all", "invoice"))?.rows ?? []);
  const [meta, setMeta] = useState(
    () => paginatedFromCache(buildInvoicesUrl(1, "", "all", "invoice"))?.meta ?? { current_page: 1, last_page: 1, total: 0 },
  );
  const [clients, setClients] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [pinnedQuote, setPinnedQuote] = useState(null);
  const formBaselineRef = useRef("");

  const [loading, setLoading] = useState(() => paginatedFromCache(buildInvoicesUrl(1, "", "all", "invoice")) == null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState("");
  const [modalError, setModalError] = useState("");
  const [lineHints, setLineHints] = useState(null);

  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [paymentsOpen, setPaymentsOpen] = useState(null);
  const [payments, setPayments] = useState([]);
  const [balanceDue, setBalanceDue] = useState(0);
  const [paymentForm, setPaymentForm] = useState({ amount: "", method: "bank_transfer", reference: "", paid_at: "" });
  const [paymentSaving, setPaymentSaving] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [paymentDeleteTarget, setPaymentDeleteTarget] = useState(null);
  const [previewTarget, setPreviewTarget] = useState(null);
  const [historyTarget, setHistoryTarget] = useState(null);
  const [confirmState, setConfirmState] = useState(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [editingSnapshot, setEditingSnapshot] = useState(null);

  const isEditing = editingId !== null;
  const financialEditable = !editingInvoice || canEditFinancialFields(editingInvoice);
  const quotaBlocked = invoiceQuota.limit != null && invoiceQuota.remaining === 0;

  useEffect(() => {
    loadInvoices(page);
  }, [page, search, filterStatus, listTab]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPage(1);
      setSearch(searchInput.trim());
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    loadReferences();
  }, []);

  async function loadReferences() {
    try {
      const [clientsRes, quotesRes] = await Promise.all([
        apiFetch("/api/clients?per_page=100&minimal=1", { cacheTtl: 300_000 }),
        apiFetch("/api/quotes?per_page=100&status=accepted", { cacheTtl: 180_000 }),
      ]);
      setClients(Array.isArray(clientsRes?.data) ? clientsRes.data : []);
      const quoteRows = Array.isArray(quotesRes?.data) ? quotesRes.data : [];
      setQuotes(quoteRows.filter((quote) => !quote.has_invoice));
    } catch {
      // Keep page usable even if references fail.
    }
  }

  async function loadInvoices(requestedPage = 1) {
    const url = buildInvoicesUrl(requestedPage, search, filterStatus, listTab);
    const cached = paginatedFromCache(url);
    if (cached) {
      setInvoices(cached.rows);
      setMeta(cached.meta);
    }
    if (peekCache(url) == null) setLoading(true);
    setError("");
    try {
      const res = await apiFetch(url, { cacheTtl: 180_000 });
      setInvoices(Array.isArray(res?.data) ? res.data : []);
      setMeta({
        current_page: Number(res?.current_page || requestedPage || 1),
        last_page: Number(res?.last_page || 1),
        total: Number(res?.total || 0),
      });
    } catch (err) {
      setInvoices([]);
      setMeta({ current_page: 1, last_page: 1, total: 0 });
      setError(extractApiMessage(err, "Impossible de charger les factures."));
    } finally {
      setLoading(false);
    }
  }

  const captureFormBaseline = useCallback((nextForm) => {
    formBaselineRef.current = serializeFormSnapshot(nextForm);
  }, []);

  const isFormDirty = useCallback(() => {
    return formBaselineRef.current !== "" && formBaselineRef.current !== serializeFormSnapshot(form);
  }, [form]);

  function resetForm() {
    setEditingId(null);
    setEditingInvoice(null);
    setEditingSnapshot(null);
    setPinnedQuote(null);
    setForm(defaultForm);
    setModalError("");
    setLineHints(null);
    formBaselineRef.current = "";
  }

  function requestCloseModal() {
    if (isFormDirty() && !window.confirm("Des modifications non enregistrées seront perdues. Fermer quand même ?")) {
      return;
    }
    closeModal();
  }

  function openCreate() {
    if (quotaBlocked) {
      pushToast(t("invoices.quotaReached"), "error");
      return;
    }
    setError("");
    resetForm();
    captureFormBaseline(defaultForm);
    setModalOpen(true);
  }

  useEffect(() => {
    if (!modalOpen || !isFormDirty()) return undefined;
    const onBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [modalOpen, isFormDirty]);

  async function openEdit(invoice) {
    if (invoice.document_type === "credit_note" || invoice.status === "cancelled") {
      pushToast(t("invoices.lockedEditHint"), "info");
      return;
    }
    setError("");
    setModalError("");
    setEditingId(invoice.id);
    setEditingInvoice(invoice);
    let full = invoice;
    try {
      full = await apiFetch(`/api/invoices/${invoice.id}`);
    } catch {
      // fallback list row
    }
    const items = Array.isArray(full.items) && full.items.length > 0
      ? full.items.map((item) => ({
          description: item.description || "",
          quantity: String(Math.max(0, Number.parseFloat(item.quantity) || 1)),
          unit_price: String(item.unit_price ?? ""),
          tax_rate: String(item.tax_rate ?? "0"),
        }))
      : [createEmptyLine()];
    const nextForm = {
      client_id: full.client_id ? String(full.client_id) : "",
      quote_id: full.quote_id ? String(full.quote_id) : "",
      number: full.number || "",
      status: full.status || "draft",
      issue_date: toDateInput(full.issue_date),
      due_date: toDateInput(full.due_date),
      currency: full.currency || "XOF",
      subtotal: toMoneyInput(full.subtotal),
      tax_amount: toMoneyInput(full.tax_amount),
      total: toMoneyInput(full.total),
      paid_at: toDateInput(full.paid_at),
      notes: full.notes || "",
      discount_percent: String(full.discount_percent ?? "0"),
      items,
    };
    setForm(nextForm);
    captureFormBaseline(nextForm);
    if (full.quote_id) {
      setPinnedQuote({
        id: full.quote_id,
        number: full.quote?.number || `Devis #${full.quote_id}`,
        client_id: full.client_id,
        subtotal: full.subtotal,
        tax_amount: full.tax_amount,
        total: full.total,
        currency: full.currency,
        discount_percent: full.discount_percent,
      });
    } else {
      setPinnedQuote(null);
    }
    setEditingSnapshot({ number: invoice.number || `#${invoice.id}`, status: invoice.status || "draft" });
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    resetForm();
  }

  async function hydrateQuoteSelection(quoteId) {
    const listQuote = quotes.find((q) => String(q.id) === String(quoteId));
    let quote = listQuote;
    try {
      quote = await apiFetch(`/api/quotes/${quoteId}`);
    } catch {
      if (!listQuote) {
        setModalError("Impossible de charger le devis source.");
        return;
      }
    }
    setForm((prev) => {
      if (String(prev.quote_id) !== String(quoteId)) return prev;
      return mapQuoteToForm(quote, prev);
    });
    setPinnedQuote(quote);
  }

  function onChangeField(e) {
    const { name, value } = e.target;
    if (name === "status" && editingId && value !== form.status) {
      const invoiceRef = {
        id: editingId,
        number: editingSnapshot?.number || (editingId ? `#${editingId}` : "—"),
        status: form.status,
      };
      setConfirmState({ type: "status", invoice: invoiceRef, toStatus: value });
      return;
    }
    if (name === "quote_id" && value) {
      const listQuote = quotes.find((q) => String(q.id) === String(value));
      setForm((prev) => mapQuoteToForm(listQuote || { id: value }, prev));
      void hydrateQuoteSelection(value);
      return;
    }
    setForm((prev) => {
      const next = { ...prev, [name]: value };
      if (name === "subtotal" || name === "tax_amount") {
        const subtotal = Number.parseFloat(next.subtotal);
        const taxAmount = Number.parseFloat(next.tax_amount);
        if (Number.isFinite(subtotal) && Number.isFinite(taxAmount)) {
          next.total = (subtotal + taxAmount).toFixed(2);
        }
      }
      if (name === "issue_date" && value && !next.due_date) {
        const issueDate = new Date(value);
        if (!Number.isNaN(issueDate.getTime())) {
          issueDate.setDate(issueDate.getDate() + 30);
          next.due_date = issueDate.toISOString().slice(0, 10);
        }
      }
      if (name === "client_id" && prev.quote_id) {
        const linked = pinnedQuote || quotes.find((q) => String(q.id) === String(prev.quote_id));
        if (linked?.client_id && String(value) !== String(linked.client_id)) {
          next.quote_id = "";
          setPinnedQuote(null);
          const totals = computeLineTotals(next.items || [], next.discount_percent);
          next.subtotal = totals.subtotal.toFixed(2);
          next.tax_amount = totals.taxAmount.toFixed(2);
          next.total = totals.total.toFixed(2);
        }
      }
      if (name === "quote_id" && !value && financialEditable) {
        setPinnedQuote(null);
        const totals = computeLineTotals(next.items || [], next.discount_percent);
        next.subtotal = totals.subtotal.toFixed(2);
        next.tax_amount = totals.taxAmount.toFixed(2);
        next.total = totals.total.toFixed(2);
      }
      return next;
    });
  }

  function openPreview(invoice) {
    setPreviewTarget(invoice);
  }

  function openHistory(invoice) {
    setHistoryTarget(invoice);
  }

  async function openPayments(invoice) {
    setPaymentsOpen(invoice);
    setPaymentError("");
    setError("");
    try {
      const res = await apiFetch(`/api/invoices/${invoice.id}/payments`);
      setPayments(Array.isArray(res?.payments) ? res.payments : []);
      setBalanceDue(Number(res?.balance_due ?? 0));
    } catch (err) {
      setPaymentError(extractApiMessage(err, "Impossible de charger les paiements."));
    }
  }

  async function submitPayment(e) {
    e.preventDefault();
    if (!paymentsOpen) return;
    setPaymentSaving(true);
    setPaymentError("");
    try {
      await apiFetch(`/api/invoices/${paymentsOpen.id}/payments`, {
        method: "POST",
        body: JSON.stringify({
          amount: Number.parseFloat(paymentForm.amount),
          method: paymentForm.method || null,
          reference: paymentForm.reference || null,
          paid_at: paymentForm.paid_at || null,
        }),
      });
      setPaymentForm({ amount: "", method: "bank_transfer", reference: "", paid_at: "" });
      await openPayments(paymentsOpen);
      await loadInvoices(page);
      pushToast("Paiement enregistré.", "success");
    } catch (err) {
      setPaymentError(extractApiMessage(err, "Paiement impossible."));
    } finally {
      setPaymentSaving(false);
    }
  }

  async function confirmDeletePayment() {
    if (!paymentDeleteTarget || !paymentsOpen) return;
    setPaymentSaving(true);
    setPaymentError("");
    try {
      await apiFetch(`/api/invoices/${paymentsOpen.id}/payments/${paymentDeleteTarget.id}`, { method: "DELETE" });
      setPaymentDeleteTarget(null);
      await openPayments(paymentsOpen);
      await loadInvoices(page);
      pushToast("Paiement supprimé.", "success");
    } catch (err) {
      setPaymentError(extractApiMessage(err, "Suppression impossible."));
    } finally {
      setPaymentSaving(false);
    }
  }

  function requestStatusChange(invoice, status) {
    if (status === invoice.status) return;
    if (status === "paid") {
      setError(t("invoices.paidRequiresPayment"));
      return;
    }
    if (status === "cancelled" && invoice.status !== "draft") {
      setError(t("invoices.confirmCreditNoteDesc", { number: invoice.number }));
      return;
    }
    setConfirmState({ type: "status", invoice, toStatus: status });
  }

  function requestCreditNote(invoice) {
    if (!canCreateCreditNote(invoice)) return;
    setConfirmState({ type: "creditNote", invoice });
  }

  async function confirmPendingAction() {
    if (!confirmState) return;
    setConfirmLoading(true);
    setError("");
    setModalError("");
    try {
      if (confirmState.type === "status") {
        const { invoice, toStatus } = confirmState;
        if (modalOpen && editingId === invoice.id) {
          setForm((prev) => ({ ...prev, status: toStatus, paid_at: "" }));
          setEditingSnapshot((prev) => (prev ? { ...prev, status: toStatus } : prev));
        } else {
          await apiFetch(`/api/invoices/${invoice.id}`, {
            method: "PUT",
            body: JSON.stringify({ status: toStatus }),
          });
          setInvoices((prev) => prev.map((inv) => (inv.id === invoice.id ? { ...inv, status: toStatus } : inv)));
        }
      } else if (confirmState.type === "creditNote") {
        const { invoice } = confirmState;
        await apiFetch(`/api/invoices/${invoice.id}/credit-note`, { method: "POST" });
        pushToast("Avoir créé.", "success");
        await loadInvoices(page);
      }
      setConfirmState(null);
    } catch (err) {
      setError(extractApiMessage(err, "Action impossible."));
    } finally {
      setConfirmLoading(false);
    }
  }

  async function onSubmit(e) {
    e.preventDefault();
    const validation = validateInvoiceForm(form, t);
    if (!validation.valid) {
      if (validation.lineIssues) {
        setLineHints(validation.lineIssues);
        setModalError("");
      } else {
        setLineHints(null);
        setModalError(validation.message);
      }
      return;
    }

    setLineHints(null);
    setSaving(true);
    setModalError("");
    setError("");
    try {
      const payload = buildPayload(form, financialEditable);
      if (isEditing) {
        await apiFetch(`/api/invoices/${editingId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        pushToast("Facture mise à jour.", "success");
      } else {
        await apiFetch("/api/invoices", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        pushToast("Facture créée.", "success");
      }
      closeModal();
      await loadInvoices(page);
    } catch (err) {
      setModalError(extractApiMessage(err, "Impossible d'enregistrer la facture."));
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    if (!canDeleteInvoice(deleteTarget)) {
      pushToast(t("invoices.deleteDraftOnly"), "error");
      setDeleteTarget(null);
      return;
    }
    setDeletingId(deleteTarget.id);
    setError("");
    try {
      await apiFetch(`/api/invoices/${deleteTarget.id}`, { method: "DELETE" });
      pushToast("Facture archivée.", "success");
      const nextPage = invoices.length === 1 && page > 1 ? page - 1 : page;
      if (nextPage !== page) setPage(nextPage);
      await loadInvoices(nextPage);
      setDeleteTarget(null);
    } catch (err) {
      setError(extractApiMessage(err, "Impossible de supprimer la facture."));
    } finally {
      setDeletingId(null);
    }
  }

  const statusFilterOptions = useMemo(
    () => [{ value: "all", label: "Tous" }, ...statusOptions],
    [statusOptions]
  );
  const clientOptions = useMemo(
    () => [{ value: "", label: "Aucun" }, ...clients.map((client) => ({ value: String(client.id), label: client.name }))],
    [clients]
  );
  const quoteOptions = useMemo(() => {
    const rows = [...quotes];
    const pinnedId = form.quote_id || pinnedQuote?.id;
    if (pinnedId && !rows.some((q) => String(q.id) === String(pinnedId))) {
      rows.push(
        pinnedQuote || {
          id: pinnedId,
          number: `Devis #${pinnedId}`,
        },
      );
    }
    return [
      { value: "", label: "Aucun" },
      ...rows.map((quote) => ({ value: String(quote.id), label: quote.number || `Devis #${quote.id}` })),
    ];
  }, [quotes, form.quote_id, pinnedQuote]);
  const currencyOptions = useMemo(
    () => [
      { value: "XOF", label: "XOF" },
      { value: "EUR", label: "EUR" },
      { value: "USD", label: "USD" },
      { value: "GBP", label: "GBP" },
    ],
    []
  );
  const formStatusOptions = useMemo(() => {
    if (!editingInvoice || editingInvoice.status === "draft") {
      return [...editableStatusOptions, { value: "cancelled", label: t("invoices.statusCancelled") }];
    }
    return editableStatusOptions.filter((opt) => opt.value !== "draft");
  }, [editableStatusOptions, editingInvoice, t]);

  const showLinesEditor = financialEditable && !form.quote_id;

  function renderInvoiceActions(invoice) {
    return (
      <>
        <ListIconButton title="Aperçu / PDF" icon="fa-eye" onClick={() => openPreview(invoice)} />
        <ListIconButton title="Historique" icon="fa-clock-rotate-left" onClick={() => openHistory(invoice)} />
        {listTab === "invoice" && invoice.document_type !== "credit_note" ? (
          <>
            <ListIconButton
              title="Paiements"
              icon="fa-coins"
              onClick={() => openPayments(invoice)}
              disabled={invoice.status === "cancelled"}
            />
            <ListIconButton
              title="Créer un avoir"
              icon="fa-rotate-left"
              onClick={() => requestCreditNote(invoice)}
              disabled={!canCreateCreditNote(invoice)}
            />
          </>
        ) : null}
        {listTab === "invoice" ? (
          <ListIconButton
            title="Modifier"
            icon="fa-pen"
            onClick={() => openEdit(invoice)}
            disabled={invoice.status === "cancelled"}
          />
        ) : null}
        {listTab === "invoice" ? (
          <ListIconButton
            title={canDeleteInvoice(invoice) ? "Supprimer" : t("invoices.deleteDraftOnly")}
            icon="fa-trash"
            danger
            spinning={deletingId === invoice.id}
            onClick={() => setDeleteTarget(invoice)}
            disabled={deletingId === invoice.id || !canDeleteInvoice(invoice)}
          />
        ) : null}
      </>
    );
  }

  return (
    <div className="inv app-list-page">
      <style>{`
        .inv { color: var(--color-text); font-family: var(--sans); display: grid; gap: 14px; }
        .inv-card {
          border-radius: 14px;
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          padding: 14px;
          box-shadow: 0 8px 22px rgba(20, 33, 61, 0.05);
        }
        .inv-search-card {
          border-radius: 14px;
          border: 1px solid #dde5f2;
          background: linear-gradient(180deg, #fbfcff 0%, #ffffff 100%);
          padding: 12px;
          box-shadow: 0 4px 14px rgba(20, 33, 61, 0.04);
        }
        .inv-toolbar {
          display: grid;
          grid-template-columns: minmax(300px, 1.35fr) 170px auto;
          gap: 8px;
          align-items: end;
        }
        .inv-field { display: grid; gap: 6px; }
        .inv-field { min-width: 0; }
        .inv-field label {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          color: var(--color-text-muted);
        }
        .inv-required { color: #c63737; margin-left: 4px; }
        .inv-input, .inv-select, .inv-textarea {
          width: 100%;
          box-sizing: border-box;
          border-radius: 10px;
          border: 1px solid var(--color-border-strong);
          background: #fff;
          color: var(--color-text);
          padding: 9px 11px;
          font: 14px/1.3 var(--sans);
          outline: none;
        }
        .inv-textarea { min-height: 74px; resize: vertical; }
        .inv-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          margin-bottom: 12px;
          flex-wrap: wrap;
        }
        .inv-head h2 {
          margin: 0;
          font-size: 1.1rem;
          font-family: var(--heading);
          letter-spacing: -0.02em;
        }
        .inv-topbar {
          display: flex;
          gap: 8px;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
          flex-wrap: wrap;
        }
        .inv-topbar h2 { margin: 0; font-family: var(--heading); font-size: 1.05rem; letter-spacing: -0.02em; }
        .inv-sub {
          margin: 0;
          color: var(--color-text-muted);
          font-size: 13px;
        }
        .inv-btn {
          border-radius: 10px;
          border: 1px solid var(--color-border-strong);
          background: var(--color-surface);
          color: var(--color-text);
          padding: 9px 11px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
        }
        .inv-btn--primary {
          background: var(--color-primary);
          color: var(--color-primary-contrast);
          border-color: var(--color-primary);
        }
        .inv-btn--accent {
          background: #fca311;
          color: #14213d;
          border-color: #fca311;
        }
        .inv-btn--danger-soft {
          background: #fff6f6;
          color: #9d2f2f;
          border-color: #efc2c2;
        }
        .inv-btn:disabled { opacity: 0.65; cursor: not-allowed; }
        .inv-banner {
          border-radius: 10px;
          padding: 10px 12px;
          font-size: 13px;
          border: 1px solid;
        }
        .inv-banner--error { background: #fff3f0; border-color: #f4c0b6; color: #b3412d; }
        .inv-banner--success { background: #effaf2; border-color: #b8e2c2; color: #1c6a33; }
        .inv-tag {
          display: inline-flex;
          border-radius: 999px;
          padding: 3px 8px;
          font-size: 11px;
          font-weight: 700;
          border: 1px solid transparent;
        }
        .inv-tag--draft { background: #f4f4f5; color: #3f3f46; border-color: #e4e4e7; }
        .inv-tag--sent { background: #eaf5ff; color: #145ea8; border-color: #c9e4ff; }
        .inv-tag--paid { background: #ebfaef; color: #196f38; border-color: #bae8c8; }
        .inv-tag--overdue { background: #fff5ea; color: #a25411; border-color: #f8d6b4; }
        .inv-tag--cancelled { background: #fff1f2; color: #a11a3a; border-color: #f4c6d1; }
        .inv-actions { display: flex; gap: 6px; justify-content: flex-end; }
        .inv-icon-btn {
          border: 1px solid var(--color-border-strong);
          background: #fff;
          border-radius: 8px;
          font-size: 13px;
          padding: 7px 9px;
          cursor: pointer;
          min-width: 34px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.18s ease, background 0.18s ease, border-color 0.18s ease;
        }
        .inv-icon-btn:hover {
          transform: translateY(-1px);
          background: #f8fafc;
          border-color: #c6d1e7;
        }
        .inv-pagination {
          margin-top: 12px;
          display: grid;
          grid-template-columns: auto 1fr auto;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          color: var(--color-text-muted);
          max-width: 320px;
          margin-left: auto;
          margin-right: auto;
          background: #f8fafd;
          border: 1px solid #e3e9f4;
          border-radius: 10px;
          padding: 6px 8px;
        }
        .inv-icon-btn {
          border-radius: 9px;
          border: 1px solid var(--color-border-strong);
          background: #fff;
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }
        .inv-form-grid {
          display: grid;
          gap: 10px;
          grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
        }
        .inv-form-grid .inv-field--full { grid-column: 1 / -1; }
        .inv-form-actions {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
          flex-wrap: wrap;
          margin-top: 4px;
        }
        @media (max-width: 900px) {
          .inv-toolbar { grid-template-columns: 1fr; }
        }
        @media (max-width: 760px) {
          .inv-form-grid { grid-template-columns: 1fr; }
          .inv-head { align-items: flex-start; }
        }
        .inv-tabs {
          display: flex;
          gap: 8px;
          margin-bottom: 12px;
          flex-wrap: wrap;
        }
        .inv-tab {
          border-radius: 999px;
          border: 1px solid var(--color-border-strong);
          background: #fff;
          padding: 8px 12px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
        }
        .inv-tab--active {
          background: #14213d;
          color: #fff;
          border-color: #14213d;
        }
        .inv-quota {
          border-radius: 10px;
          border: 1px solid #f8d6b4;
          background: #fff8ef;
          padding: 10px 12px;
          font-size: 13px;
        }
      `}</style>

      <ToastStack toasts={toasts} onDismiss={dismissToast} />

      {error ? <div className="inv-banner inv-banner--error">{error}</div> : null}

      {invoiceQuota.limit != null ? (
        <div className="inv-quota">
          {t("invoices.quotaBanner", { used: invoiceQuota.used, limit: invoiceQuota.limit })}
          {quotaBlocked ? (
            <>
              {" "}
              <Link to="/app/abonnement?plan=pro&checkout=start">{t("invoices.quotaReached")}</Link>
            </>
          ) : null}
        </div>
      ) : null}

      <div className="inv-tabs">
        <button
          type="button"
          className={`inv-tab${listTab === "invoice" ? " inv-tab--active" : ""}`}
          onClick={() => {
            setListTab("invoice");
            setPage(1);
          }}
        >
          {t("invoices.tabInvoices")}
        </button>
        <button
          type="button"
          className={`inv-tab${listTab === "credit_note" ? " inv-tab--active" : ""}`}
          onClick={() => {
            setListTab("credit_note");
            setPage(1);
          }}
        >
          {t("invoices.tabCreditNotes")}
        </button>
      </div>

      <ListFilterBar>
        <ListFilterGrid>
          <ListFilterField label="Rechercher">
            <input
              className="inv-input"
              type="text"
              placeholder={t("invoices.searchPlaceholder")}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </ListFilterField>
          <ListFilterField label="Statut">
            <AppSelect value={filterStatus} onChange={setFilterStatus} options={statusFilterOptions} />
          </ListFilterField>
        </ListFilterGrid>
      </ListFilterBar>

      <section className="inv-card app-list-card doc-list-card">
        <ListPageHeader
          title={listTab === "credit_note" ? t("invoices.tabCreditNotes") : t("invoices.listTitle")}
          count={`${meta.total} ${listTab === "credit_note" ? "avoir(s)" : "facture(s)"} enregistré(s)`}
          actions={
            listTab === "invoice" ? (
              <button className="inv-btn inv-btn--accent app-list-btn" type="button" onClick={openCreate} disabled={quotaBlocked}>
                <i className="fa-solid fa-plus" /> <span className="btn-label-long">{t("invoices.new")}</span>
              </button>
            ) : null
          }
        />

        <div className="app-list-table-wrap">
          <table className="entity-list-table entity-list-table--wide app-list-table">
            <thead>
              <tr>
                <th>Numéro</th>
                <th>Client</th>
                <th>{listTab === "credit_note" ? "Facture d'origine" : "Devis"}</th>
                <th>
                  Dates
                  <span className="entity-list-table__unit">Émission → échéance</span>
                </th>
                <th className="entity-list-table__amount">
                  Montant
                  <span className="entity-list-table__unit">XOF</span>
                </th>
                <th>Statut</th>
                <th className="entity-list-table__actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <TableSkeleton rows={7} columns={7} withActions actionColumnIndex={6} />
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={7}>Aucune facture trouvée.</td>
                </tr>
              ) : (
                invoices.map((invoice) => {
                  const rowStatusOptions = inlineStatusOptionsForInvoice(invoice, editableStatusOptions, t);
                  return (
                  <tr key={invoice.id} className={invoiceRowClassName(invoice)}>
                    <td>
                      <strong>{invoice.number}</strong>
                    </td>
                    <td>{invoice.client?.name || "—"}</td>
                    <td>
                      {listTab === "credit_note"
                        ? invoice.parent_invoice?.number || "—"
                        : invoice.quote?.number || "—"}
                    </td>
                    <td>
                      {formatDate(invoice.issue_date)} → {formatDate(invoice.due_date)}
                    </td>
                    <td className="entity-list-table__amount-cell">
                      <strong>{showMoney(invoice.total)}</strong>
                    </td>
                    <td>
                      {listTab === "credit_note" ? (
                        <span className="inv-tag inv-tag--sent">{t("invoices.tabCreditNotes")}</span>
                      ) : (
                        <InlineStatusSelect
                          value={invoice.status || "draft"}
                          options={rowStatusOptions}
                          disabled={invoice.status === "paid" || invoice.status === "cancelled"}
                          onChange={(next) => requestStatusChange(invoice, next)}
                        />
                      )}
                    </td>
                    <td>
                      <div className="entity-list-row-actions">{renderInvoiceActions(invoice)}</div>
                    </td>
                  </tr>
                );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="app-list-cards">
          {loading && invoices.length === 0 ? (
            <>
              <div className="app-list-card-item app-list-card-item--skeleton" />
              <div className="app-list-card-item app-list-card-item--skeleton" />
              <div className="app-list-card-item app-list-card-item--skeleton" />
            </>
          ) : invoices.length === 0 ? (
            <div className="app-list-card-item app-list-card-item--empty">Aucune facture trouvee.</div>
          ) : (
            invoices.map((invoice) => {
              const rowStatusOptions = inlineStatusOptionsForInvoice(invoice, editableStatusOptions, t);
              return (
                <article key={invoice.id} className={invoiceCardClassName(invoice)}>
                  <div className="app-list-card-item__head">
                    <div>
                      <div className="app-list-card-item__ref">{invoice.number}</div>
                      <div className="app-list-card-item__sub">{invoice.client?.name || "—"}</div>
                    </div>
                    <div className="app-list-card-item__amount-stack">
                      <span className="app-list-card-item__amount-label">XOF</span>
                      <strong>{showMoney(invoice.total)}</strong>
                    </div>
                  </div>
                  <div className="app-list-card-item__row">
                    <span className="app-list-card-item__label">{listTab === "credit_note" ? "Origine" : "Devis"}</span>
                    <span>
                      {listTab === "credit_note"
                        ? invoice.parent_invoice?.number || "—"
                        : invoice.quote?.number || "—"}
                    </span>
                  </div>
                  <div className="app-list-card-item__row">
                    <span className="app-list-card-item__label">Échéance</span>
                    <span>{formatDate(invoice.due_date)}</span>
                  </div>
                  <div className="app-list-card-item__foot">
                    {listTab === "credit_note" ? (
                      <span className="app-list-tag app-list-tag--sent">{t("invoices.tabCreditNotes")}</span>
                    ) : (
                      <InlineStatusSelect
                        value={invoice.status || "draft"}
                        options={rowStatusOptions}
                        disabled={invoice.status === "paid" || invoice.status === "cancelled"}
                        onChange={(next) => requestStatusChange(invoice, next)}
                      />
                    )}
                    <div className="app-list-card-item__actions">{renderInvoiceActions(invoice)}</div>
                  </div>
                </article>
              );
            })
          )}
        </div>

        <ListPagination
          page={meta.current_page}
          lastPage={meta.last_page}
          loading={loading}
          onPrev={() => setPage((p) => Math.max(1, p - 1))}
          onNext={() => setPage((p) => Math.min(meta.last_page, p + 1))}
        />
      </section>

      {modalOpen ? (
        <ModalPortal>
        <div className="doc-modal-backdrop" role="dialog" aria-modal="true" onClick={requestCloseModal}>
          <section className="doc-modal doc-modal--wide" onClick={(e) => e.stopPropagation()}>
            <div className="doc-modal-head">
              <h2>{isEditing ? t("invoices.editModal") : t("invoices.createModal")}</h2>
              <button className="doc-modal-close" type="button" onClick={requestCloseModal} aria-label="Fermer">
                <i className="fa-solid fa-xmark" />
              </button>
            </div>

            <form className="doc-modal-form" onSubmit={onSubmit}>
              <div className="doc-modal-body">
              {modalError ? <div className="inv-banner inv-banner--error">{modalError}</div> : null}
              {!financialEditable ? (
                <p className="inv-sub">{t("invoices.lockedEditHint")}</p>
              ) : null}
              <div className="doc-form-sections">
                <section className="doc-form-card">
                  <h3 className="doc-form-card__title">Document</h3>
                  <div className="doc-form-card__grid">
                    <div className="doc-form-field">
                      <FieldLabel required>Statut</FieldLabel>
                      <AppSelect
                        value={form.status === "paid" ? "sent" : form.status}
                        onChange={(next) => onChangeField({ target: { name: "status", value: next } })}
                        options={formStatusOptions}
                        disabled={!financialEditable && editingInvoice?.status !== "draft"}
                      />
                    </div>
                    <div className="doc-form-field">
                      <label>Devise</label>
                      <AppSelect
                        value={form.currency}
                        onChange={(next) => onChangeField({ target: { name: "currency", value: next } })}
                        options={currencyOptions}
                        disabled={!financialEditable}
                      />
                    </div>
                  </div>
                </section>

                <section className="doc-form-card">
                  <h3 className="doc-form-card__title">Client & devis</h3>
                  <div className="doc-form-card__grid">
                    <div className="doc-form-field">
                      <FieldLabel required>Client</FieldLabel>
                      <AppSelect
                        value={form.client_id}
                        onChange={(next) => onChangeField({ target: { name: "client_id", value: next } })}
                        options={clientOptions}
                        disabled={!financialEditable || Boolean(form.quote_id)}
                      />
                    </div>
                    <div className="doc-form-field">
                      <label>Devis source</label>
                      <AppSelect
                        value={form.quote_id}
                        onChange={(next) => onChangeField({ target: { name: "quote_id", value: next } })}
                        options={quoteOptions}
                        disabled={!financialEditable}
                      />
                    </div>
                  </div>
                </section>

                <section className="doc-form-card">
                  <h3 className="doc-form-card__title">Dates</h3>
                  <div className="doc-form-card__grid">
                    <div className="doc-form-field">
                      <label>Date d&apos;émission</label>
                      <AppDateField
                        value={form.issue_date}
                        onChange={(next) => onChangeField({ target: { name: "issue_date", value: next } })}
                        disabled={!financialEditable}
                      />
                    </div>
                    <div className="doc-form-field">
                      <label>Date d&apos;échéance</label>
                      <AppDateField
                        value={form.due_date}
                        onChange={(next) => onChangeField({ target: { name: "due_date", value: next } })}
                      />
                    </div>
                  </div>
                </section>

                {(form.quote_id || !showLinesEditor) && Number.parseFloat(form.total) > 0 ? (
                  <div className="doc-form-total" aria-live="polite">
                    <span className="doc-form-total__label">Total TTC</span>
                    <span className="doc-form-total__value">
                      {showMoney(form.total)} {form.currency}
                    </span>
                  </div>
                ) : null}

                {showLinesEditor ? (
                  <section className="doc-form-card doc-form-card--lines">
                    <h3 className="doc-form-card__title">Lignes</h3>
                    <DocumentLinesEditor
                      lines={form.items}
                      lineHints={lineHints}
                      discountPercent={form.discount_percent}
                      onDiscountChange={(value) =>
                        setForm((prev) => {
                          const totals = computeLineTotals(prev.items, value);
                          return {
                            ...prev,
                            discount_percent: value,
                            subtotal: totals.subtotal.toFixed(2),
                            tax_amount: totals.taxAmount.toFixed(2),
                            total: totals.total.toFixed(2),
                          };
                        })
                      }
                      onChange={(items) => {
                        setLineHints(null);
                        setForm((prev) => {
                          const totals = computeLineTotals(items, prev.discount_percent);
                          return {
                            ...prev,
                            items,
                            subtotal: totals.subtotal.toFixed(2),
                            tax_amount: totals.taxAmount.toFixed(2),
                            total: totals.total.toFixed(2),
                          };
                        });
                      }}
                    />
                  </section>
                ) : null}

                <section className="doc-form-card">
                  <h3 className="doc-form-card__title">Notes</h3>
                  <div className="doc-form-field doc-form-field--full">
                    <textarea className="inv-textarea" name="notes" value={form.notes} onChange={onChangeField} placeholder="Optionnel — visible sur le PDF si renseigné" rows={3} />
                  </div>
                </section>
              </div>
              </div>

              <FormActions
                onCancel={requestCloseModal}
                submitLabel={isEditing ? "Mettre a jour" : "Creer"}
                saving={saving}
              />
            </form>
          </section>
        </div>
        </ModalPortal>
      ) : null}

      <DocumentPreviewModal
        open={Boolean(previewTarget)}
        onClose={() => setPreviewTarget(null)}
        previewPath={previewTarget ? `/api/invoices/${previewTarget.id}/preview` : ""}
        pdfPath={previewTarget ? `/api/invoices/${previewTarget.id}/pdf` : ""}
        filename={previewTarget ? `${previewTarget.number}.pdf` : "document.pdf"}
        title={previewTarget ? `Aperçu — ${previewTarget.number}` : ""}
      />

      <DocumentPreviewModal
        open={Boolean(historyTarget)}
        onClose={() => setHistoryTarget(null)}
        previewPath={historyTarget ? invoiceHistoryPaths(historyTarget)?.preview : ""}
        pdfPath={historyTarget ? invoiceHistoryPaths(historyTarget)?.pdf : ""}
        filename={historyTarget ? invoiceHistoryPaths(historyTarget)?.filename : "historique.pdf"}
        title={historyTarget ? invoiceHistoryPaths(historyTarget)?.title : ""}
        subtitle="Chronologie du document — exportable en PDF."
        downloadLabel="Télécharger l'historique PDF"
      />

      {paymentsOpen ? (
        <ModalPortal>
        <div className="inv-modal-backdrop" role="dialog" aria-modal="true" onClick={() => setPaymentsOpen(null)}>
          <section className="inv-modal inv-modal--payments" onClick={(e) => e.stopPropagation()}>
            <div className="inv-modal-head">
              <div>
                <h2>Paiements — {paymentsOpen.number}</h2>
                <p className="inv-modal-sub">
                  Solde {formatMoney(balanceDue)} {paymentsOpen.currency || "XOF"}
                  {balanceDue <= 0.001 ? ` · ${t("invoices.statusPaid")}` : null}
                </p>
              </div>
              <button className="inv-icon-btn" type="button" onClick={() => setPaymentsOpen(null)} aria-label="Fermer">
                <i className="fa-solid fa-xmark" />
              </button>
            </div>
            {paymentError ? <div className="inv-banner inv-banner--error">{paymentError}</div> : null}
            {payments.length > 0 ? (
              <ul className="inv-payment-list">
                {payments.map((p) => (
                  <li key={p.id} className="inv-payment-item">
                    <span>
                      <strong>{formatMoney(p.amount)}</strong>
                      <small>{paymentMethodLabel(p.method)} · {formatDate(p.paid_at)}</small>
                    </span>
                    <button
                      className="inv-btn inv-btn--danger-soft"
                      type="button"
                      onClick={() => setPaymentDeleteTarget(p)}
                      disabled={paymentSaving}
                    >
                      Supprimer
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            {balanceDue > 0.001 ? (
            <form onSubmit={submitPayment}>
              <div className="inv-form-grid">
                <div className="inv-field">
                  <FieldLabel required>Montant</FieldLabel>
                  <input
                    className="inv-input"
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={balanceDue}
                    required
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm((prev) => ({ ...prev, amount: e.target.value }))}
                    placeholder={formatMoney(balanceDue)}
                  />
                </div>
                <div className="inv-field">
                  <FieldLabel required>Méthode</FieldLabel>
                  <AppSelect
                    value={paymentForm.method}
                    onChange={(method) => setPaymentForm((prev) => ({ ...prev, method }))}
                    options={PAYMENT_METHODS}
                  />
                </div>
              </div>
              <FormActions
                onCancel={() => setPaymentsOpen(null)}
                submitLabel="Ajouter un paiement"
                saving={paymentSaving}
              />
            </form>
            ) : null}
          </section>
        </div>
        </ModalPortal>
      ) : null}

      {paymentDeleteTarget ? (
        <ConfirmDialog
          open
          title="Supprimer le paiement"
          description={t("invoices.paymentDeleteConfirm", { amount: formatMoney(paymentDeleteTarget.amount) })}
          onClose={() => setPaymentDeleteTarget(null)}
          onConfirm={confirmDeletePayment}
          saving={paymentSaving}
        />
      ) : null}

      {deleteTarget ? (
        <ConfirmDialog
          open
          title="Supprimer la facture"
          description={t("invoices.deleteConfirmDraft", { number: deleteTarget.number })}
          onClose={() => setDeleteTarget(null)}
          onConfirm={confirmDelete}
          saving={deletingId !== null}
        />
      ) : null}

      {confirmState?.type === "status" ? (
        <ConfirmDialog
          open
          title={t("invoices.confirmStatusTitle")}
          description={t("invoices.confirmStatusDesc", {
            number: confirmState.invoice.number,
            from: statusLabel(statusOptions, confirmState.invoice.status),
            to: statusLabel(statusOptions, confirmState.toStatus),
          })}
          onClose={() => setConfirmState(null)}
          onConfirm={confirmPendingAction}
          saving={confirmLoading}
        />
      ) : null}

      {confirmState?.type === "creditNote" ? (
        <ConfirmDialog
          open
          title={t("invoices.confirmCreditNoteTitle")}
          description={t("invoices.confirmCreditNoteDesc", { number: confirmState.invoice.number })}
          onClose={() => setConfirmState(null)}
          onConfirm={confirmPendingAction}
          saving={confirmLoading}
        />
      ) : null}
    </div>
  );
}

function mapQuoteToForm(quote, prev) {
  if (!quote) return prev;
  const items =
    Array.isArray(quote.items) && quote.items.length > 0
      ? quote.items.map((item) => ({
          description: item.description || "",
          quantity: String(item.quantity ?? "1"),
          unit_price: String(item.unit_price ?? ""),
          tax_rate: String(item.tax_rate ?? "0"),
        }))
      : prev.items;
  return {
    ...prev,
    quote_id: String(quote.id),
    client_id: quote.client_id ? String(quote.client_id) : "",
    subtotal: toMoneyInput(quote.subtotal),
    tax_amount: toMoneyInput(quote.tax_amount),
    total: toMoneyInput(quote.total),
    currency: quote.currency || prev.currency,
    discount_percent: String(quote.discount_percent ?? "0"),
    notes: quote.notes ?? prev.notes,
    items,
  };
}

function serializeFormSnapshot(form) {
  return JSON.stringify({
    client_id: form.client_id || "",
    quote_id: form.quote_id || "",
    status: form.status || "draft",
    issue_date: form.issue_date || "",
    due_date: form.due_date || "",
    currency: form.currency || "XOF",
    subtotal: form.subtotal || "",
    tax_amount: form.tax_amount || "",
    total: form.total || "",
    notes: form.notes || "",
    discount_percent: form.discount_percent || "0",
    items: (form.items || []).map((line) => ({
      description: line.description || "",
      quantity: line.quantity || "",
      unit_price: line.unit_price || "",
      tax_rate: line.tax_rate || "",
    })),
  });
}

function statusLabel(options, value) {
  return options.find((opt) => opt.value === value)?.label || value || "—";
}

function isInvoiceRowMuted(invoice) {
  return invoice.status === "paid" || invoice.status === "cancelled";
}

function invoiceRowClassName(invoice) {
  return isInvoiceRowMuted(invoice) ? "entity-list-table-row--muted" : "";
}

function invoiceCardClassName(invoice) {
  return isInvoiceRowMuted(invoice) ? "app-list-card-item app-list-card-item--muted" : "app-list-card-item";
}

function validateInvoiceForm(form, t) {
  if (form.status === "paid") {
    return { valid: false, message: t("invoices.paidRequiresPayment") };
  }
  if (form.due_date && form.issue_date && form.due_date < form.issue_date) {
    return { valid: false, message: "La date d'échéance doit être postérieure à la date d'émission." };
  }
  if (!form.quote_id) {
    const lineCheck = validateDocumentLines(form.items);
    if (!lineCheck.valid) {
      return { valid: false, message: "", lineIssues: lineCheck.issues };
    }
    const totals = computeLineTotals(form.items, form.discount_percent);
    if (totals.total <= 0) {
      return { valid: false, message: "Le montant TTC doit être supérieur à zéro." };
    }
  } else {
    const total = Number.parseFloat(form.total);
    if (!(Number.isFinite(total) && total > 0)) {
      return { valid: false, message: "Sélectionnez un devis source avec un montant valide." };
    }
    if (!form.client_id) {
      return { valid: false, message: "Le devis source doit être associé à un client." };
    }
  }
  return { valid: true, message: "" };
}

function buildPayload(form, includeFinancial = true) {
  const payload = {
    status: form.status === "paid" ? "sent" : form.status || "draft",
    notes: normalizeNullable(form.notes),
    due_date: normalizeNullable(form.due_date),
  };

  if (includeFinancial) {
    payload.number = normalizeNullable(form.number);
    payload.currency = String(form.currency || "XOF").trim().toUpperCase();
    payload.issue_date = normalizeNullable(form.issue_date);
    payload.discount_percent = Number.parseFloat(form.discount_percent) || 0;
    const clientId = Number.parseInt(form.client_id, 10);
    const quoteId = Number.parseInt(form.quote_id, 10);
    payload.client_id = Number.isFinite(clientId) ? clientId : null;
    payload.quote_id = Number.isFinite(quoteId) ? quoteId : null;

    if (!form.quote_id) {
      const validLines = (form.items || [])
        .filter(
          (line) =>
            String(line.description || "").trim() !== "" && String(line.unit_price ?? "").trim() !== "",
        )
        .map((line) => ({
          description: String(line.description).trim(),
          quantity: Number.parseFloat(line.quantity) || 0,
          unit_price: Number.parseFloat(line.unit_price) || 0,
          tax_rate: Number.parseFloat(line.tax_rate) || 0,
        }));
      const totals = computeLineTotals(form.items, form.discount_percent);
      payload.items = validLines;
      payload.subtotal = totals.subtotal;
      payload.tax_amount = totals.taxAmount;
      payload.total = totals.total;
    } else {
      payload.subtotal = roundMoney(form.subtotal);
      payload.tax_amount = roundMoney(form.tax_amount);
      payload.total = roundMoney(form.total);
    }
  }

  return payload;
}

function normalizeNullable(value) {
  const trimmed = String(value ?? "").trim();
  return trimmed === "" ? null : trimmed;
}

function roundMoney(value) {
  const numeric = Number.parseFloat(value);
  if (!Number.isFinite(numeric)) return 0;
  return Number(numeric.toFixed(2));
}

function formatMoney(value) {
  const amount = Number.parseFloat(value);
  if (!Number.isFinite(amount)) return "0";
  return amount.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("fr-FR");
}

function toDateInput(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function toMoneyInput(value) {
  const amount = Number.parseFloat(value);
  if (!Number.isFinite(amount)) return "";
  return amount.toFixed(2);
}

function buildInvoicesUrl(requestedPage, search, filterStatus, listTab) {
  const params = new URLSearchParams({
    page: String(requestedPage),
    document_type: listTab === "credit_note" ? "credit_note" : "invoice",
  });
  if (search.trim()) params.set("q", search.trim());
  if (filterStatus !== "all") params.set("status", filterStatus);
  return `/api/invoices?${params.toString()}`;
}

function extractApiMessage(error, fallback) {
  if (error?.body?.errors && typeof error.body.errors === "object") {
    const first = Object.values(error.body.errors)[0];
    if (Array.isArray(first) && first[0]) return String(first[0]);
  }
  if (error?.body?.message) return String(error.body.message);
  return error?.message || fallback;
}
