import { useEffect, useMemo, useState } from "react";
import { apiFetch, peekCache } from "../../api/client";
import TableSkeleton from "../../components/skeleton/TableSkeleton";
import FormActions from "../../components/FormActions";
import DocumentPreviewModal from "../../components/DocumentPreviewModal";
import { useTranslation } from "react-i18next";
import { AppDateField, AppSelect, FieldLabel } from "../../components/AppFormControls";
import InlineStatusSelect from "../../components/InlineStatusSelect";
import ConfirmDialog from "../../components/ConfirmDialog";
import ModalPortal from "../../components/ModalPortal";

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
};

export default function FacturesPage() {
  const { t } = useTranslation("app");
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
  const [invoices, setInvoices] = useState([]);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0 });
  const [clients, setClients] = useState([]);
  const [quotes, setQuotes] = useState([]);

  const [loading, setLoading] = useState(() => peekCache("/api/invoices?page=1") == null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [paymentsOpen, setPaymentsOpen] = useState(null);
  const [payments, setPayments] = useState([]);
  const [balanceDue, setBalanceDue] = useState(0);
  const [paymentForm, setPaymentForm] = useState({ amount: "", method: "", reference: "", paid_at: "" });
  const [paymentSaving, setPaymentSaving] = useState(false);
  const [previewTarget, setPreviewTarget] = useState(null);
  const [confirmState, setConfirmState] = useState(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [editingSnapshot, setEditingSnapshot] = useState(null);

  const isEditing = editingId !== null;

  useEffect(() => {
    loadInvoices(page);
  }, [page]);

  useEffect(() => {
    loadReferences();
  }, []);

  async function loadReferences() {
    try {
      const [clientsRes, quotesRes] = await Promise.all([
        apiFetch("/api/clients?per_page=200"),
        apiFetch("/api/quotes?per_page=200"),
      ]);
      setClients(Array.isArray(clientsRes?.data) ? clientsRes.data : []);
      setQuotes(Array.isArray(quotesRes?.data) ? quotesRes.data : []);
    } catch {
      // Keep page usable even if references fail.
    }
  }

  async function loadInvoices(requestedPage = 1) {
    const url = `/api/invoices?page=${requestedPage}`;
    if (peekCache(url) == null) setLoading(true);
    setError("");
    try {
      const res = await apiFetch(url);
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

  function resetForm() {
    setEditingId(null);
    setEditingSnapshot(null);
    setForm(defaultForm);
  }

  function openCreate() {
    setSuccess("");
    setError("");
    resetForm();
    setModalOpen(true);
  }

  function openEdit(invoice) {
    setSuccess("");
    setError("");
    setEditingId(invoice.id);
    setForm({
      client_id: invoice.client_id ? String(invoice.client_id) : "",
      quote_id: invoice.quote_id ? String(invoice.quote_id) : "",
      number: invoice.number || "",
      status: invoice.status || "draft",
      issue_date: toDateInput(invoice.issue_date),
      due_date: toDateInput(invoice.due_date),
      currency: invoice.currency || "XOF",
      subtotal: toMoneyInput(invoice.subtotal),
      tax_amount: toMoneyInput(invoice.tax_amount),
      total: toMoneyInput(invoice.total),
      paid_at: toDateInput(invoice.paid_at),
      notes: invoice.notes || "",
    });
    setEditingSnapshot({ number: invoice.number || `#${invoice.id}`, status: invoice.status || "draft" });
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    resetForm();
  }

  function onChangeField(e) {
    const { name, value } = e.target;
    setForm((prev) => {
      if (name === "status" && editingId && value !== prev.status) {
        const invoiceRef = {
          id: editingId,
          number: editingSnapshot?.number || (editingId ? `#${editingId}` : "—"),
          status: prev.status,
        };
        setConfirmState({ type: "status", invoice: invoiceRef, toStatus: value });
        return prev;
      }
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
      if (name === "status" && value !== "paid") {
        next.paid_at = "";
      }
      if (name === "status" && value === "paid" && !next.paid_at) {
        next.paid_at = new Date().toISOString().slice(0, 10);
      }
      if (name === "quote_id" && value) {
        const quote = quotes.find((q) => String(q.id) === String(value));
        if (quote) {
          next.client_id = quote.client_id ? String(quote.client_id) : next.client_id;
          next.subtotal = toMoneyInput(quote.subtotal);
          next.tax_amount = toMoneyInput(quote.tax_amount);
          next.total = toMoneyInput(quote.total);
          next.currency = quote.currency || next.currency;
        }
      }
      return next;
    });
  }

  function openPreview(invoice) {
    setPreviewTarget(invoice);
  }

  async function openPayments(invoice) {
    setPaymentsOpen(invoice);
    setError("");
    try {
      const res = await apiFetch(`/api/invoices/${invoice.id}/payments`);
      setPayments(Array.isArray(res?.payments) ? res.payments : []);
      setBalanceDue(Number(res?.balance_due ?? 0));
    } catch (err) {
      setError(extractApiMessage(err, "Impossible de charger les paiements."));
    }
  }

  async function submitPayment(e) {
    e.preventDefault();
    if (!paymentsOpen) return;
    setPaymentSaving(true);
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
      setPaymentForm({ amount: "", method: "", reference: "", paid_at: "" });
      await openPayments(paymentsOpen);
      await loadInvoices(page);
      setSuccess("Paiement enregistre.");
    } catch (err) {
      setError(extractApiMessage(err, "Paiement impossible."));
    } finally {
      setPaymentSaving(false);
    }
  }

  function requestStatusChange(invoice, status) {
    if (status === invoice.status) return;
    setConfirmState({ type: "status", invoice, toStatus: status });
  }

  function requestCreditNote(invoice) {
    setConfirmState({ type: "creditNote", invoice });
  }

  async function confirmPendingAction() {
    if (!confirmState) return;
    setConfirmLoading(true);
    setError("");
    setSuccess("");
    try {
      if (confirmState.type === "status") {
        const { invoice, toStatus } = confirmState;
        if (modalOpen && editingId === invoice.id) {
          setForm((prev) => {
            const next = { ...prev, status: toStatus };
            if (toStatus !== "paid") next.paid_at = "";
            if (toStatus === "paid" && !next.paid_at) {
              next.paid_at = new Date().toISOString().slice(0, 10);
            }
            return next;
          });
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
        setSuccess("Avoir cree.");
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
    const validation = validateInvoiceForm(form);
    if (!validation.valid) {
      setError(validation.message);
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const payload = buildPayload(form);
      if (isEditing) {
        await apiFetch(`/api/invoices/${editingId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        setSuccess("Facture mise a jour.");
      } else {
        await apiFetch("/api/invoices", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setSuccess("Facture creee.");
      }
      closeModal();
      await loadInvoices(page);
    } catch (err) {
      setError(extractApiMessage(err, "Impossible d'enregistrer la facture."));
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeletingId(deleteTarget.id);
    setError("");
    setSuccess("");
    try {
      await apiFetch(`/api/invoices/${deleteTarget.id}`, { method: "DELETE" });
      setSuccess("Facture supprimee.");
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

  const displayedInvoices = useMemo(() => {
    return invoices.filter((invoice) => {
      const matchesStatus = filterStatus === "all" || invoice.status === filterStatus;
      const q = search.trim().toLowerCase();
      if (!q) return matchesStatus;
      const fields = [
        invoice.number,
        invoice.client?.name,
        invoice.quote?.number,
        invoice.currency,
        invoice.status,
      ]
        .filter(Boolean)
        .map((v) => String(v).toLowerCase());
      return matchesStatus && fields.some((v) => v.includes(q));
    });
  }, [invoices, filterStatus, search]);

  const statusFilterOptions = useMemo(
    () => [{ value: "all", label: "Tous" }, ...statusOptions],
    [statusOptions]
  );
  const clientOptions = useMemo(
    () => [{ value: "", label: "Aucun" }, ...clients.map((client) => ({ value: String(client.id), label: client.name }))],
    [clients]
  );
  const quoteOptions = useMemo(
    () => [
      { value: "", label: "Aucun" },
      ...quotes.map((quote) => ({ value: String(quote.id), label: quote.number || `Devis #${quote.id}` })),
    ],
    [quotes]
  );
  const currencyOptions = useMemo(
    () => [
      { value: "XOF", label: "XOF" },
      { value: "EUR", label: "EUR" },
      { value: "USD", label: "USD" },
      { value: "GBP", label: "GBP" },
    ],
    []
  );

  return (
    <div className="inv">
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
        .inv-table-wrap { overflow-x: auto; }
        .inv-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 860px;
          font-size: 14px;
          background: #fff;
          border-radius: 12px;
          overflow: hidden;
        }
        .inv-table th {
          text-align: left;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: #14213d;
          font-weight: 800;
          padding: 8px 6px;
          border-bottom: 1px solid var(--color-border);
          background: #f7f9fc;
        }
        .inv-table td {
          padding: 10px 6px;
          border-bottom: 1px solid var(--color-border);
          vertical-align: top;
        }
        .inv-mini { color: var(--color-text-muted); font-size: 12px; }
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
      `}</style>

      {error ? <div className="inv-banner inv-banner--error">{error}</div> : null}
      {success ? <div className="inv-banner inv-banner--success">{success}</div> : null}

      <section className="inv-search-card doc-filter-bar">
        <div className="inv-toolbar">
          <div className="inv-field">
            <label>Rechercher</label>
            <input
              className="inv-input"
              type="text"
              placeholder="Numero, client, devis..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
          <div className="inv-field">
            <label>Statut</label>
            <AppSelect value={filterStatus} onChange={setFilterStatus} options={statusFilterOptions} />
          </div>
          <button className="inv-btn inv-btn--primary" type="button" onClick={() => setSearch(searchInput.trim())}>
            <i className="fa-solid fa-filter" /> Filtrer
          </button>
        </div>
      </section>

      <section className="inv-card doc-list-card">
        <div className="inv-topbar">
          <h2>Liste des factures</h2>
          <button className="inv-btn inv-btn--accent" type="button" onClick={openCreate}>
            <i className="fa-solid fa-plus" /> Nouvelle facture
          </button>
        </div>
        <p className="inv-sub">{meta.total} facture(s) enregistree(s)</p>

        <div className="inv-table-wrap">
          <table className="inv-table">
            <thead>
              <tr>
                <th>Numero</th>
                <th>Client</th>
                <th>Devis</th>
                <th>Dates</th>
                <th>Montants</th>
                <th>Statut</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <TableSkeleton rows={7} columns={7} withActions actionColumnIndex={6} />
              ) : displayedInvoices.length === 0 ? (
                <tr>
                  <td colSpan={7}>Aucune facture trouvee.</td>
                </tr>
              ) : (
                displayedInvoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td>
                      <strong>{invoice.number}</strong>
                      <div className="inv-mini">{invoice.currency || "XOF"}</div>
                    </td>
                    <td>{invoice.client?.name || "—"}</td>
                    <td>{invoice.quote?.number || "—"}</td>
                    <td>
                      <div className="inv-mini">Emission: {formatDate(invoice.issue_date)}</div>
                      <div className="inv-mini">Echeance: {formatDate(invoice.due_date)}</div>
                    </td>
                    <td>
                      <div className="inv-mini">HT: {formatMoney(invoice.subtotal)}</div>
                      <div className="inv-mini">TVA: {formatMoney(invoice.tax_amount)}</div>
                      <strong>TTC: {formatMoney(invoice.total)}</strong>
                    </td>
                    <td>
                      <InlineStatusSelect
                        value={invoice.status || "draft"}
                        options={statusOptions}
                        onChange={(next) => requestStatusChange(invoice, next)}
                      />
                    </td>
                    <td>
                      <div className="inv-actions">
                        <button className="inv-icon-btn" type="button" onClick={() => openPreview(invoice)} title="Aperçu / PDF">
                          <i className="fa-solid fa-eye" />
                        </button>
                        {invoice.document_type !== "credit_note" ? (
                          <>
                            <button className="inv-icon-btn" type="button" onClick={() => openPayments(invoice)} title="Paiements">
                              <i className="fa-solid fa-coins" />
                            </button>
                            <button className="inv-icon-btn" type="button" onClick={() => requestCreditNote(invoice)} title="Creer un avoir">
                              <i className="fa-solid fa-rotate-left" />
                            </button>
                          </>
                        ) : null}
                        <button className="inv-icon-btn" type="button" onClick={() => openEdit(invoice)} title="Modifier">
                          <i className="fa-solid fa-pen" />
                        </button>
                        <button
                          className="inv-icon-btn inv-icon-btn--danger"
                          type="button"
                          title="Supprimer"
                          onClick={() => setDeleteTarget(invoice)}
                          disabled={deletingId === invoice.id}
                        >
                          <i className={`fa-solid ${deletingId === invoice.id ? "fa-spinner fa-spin" : "fa-trash"}`} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="inv-pagination">
          <button
            className="inv-btn"
            type="button"
            disabled={meta.current_page <= 1 || loading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Precedent
          </button>
          <span>
            Page {meta.current_page} / {meta.last_page}
          </span>
          <button
            className="inv-btn"
            type="button"
            disabled={meta.current_page >= meta.last_page || loading}
            onClick={() => setPage((p) => Math.min(meta.last_page, p + 1))}
          >
            Suivant
          </button>
        </div>
      </section>

      {modalOpen ? (
        <ModalPortal>
        <div className="doc-modal-backdrop" role="dialog" aria-modal="true" onClick={closeModal}>
          <section className="doc-modal" onClick={(e) => e.stopPropagation()}>
            <div className="doc-modal-head">
              <h2>{isEditing ? t("invoices.editModal") : t("invoices.createModal")}</h2>
              <button className="doc-modal-close" type="button" onClick={closeModal} aria-label="Fermer">
                <i className="fa-solid fa-xmark" />
              </button>
            </div>

            <form className="doc-modal-form" onSubmit={onSubmit}>
              <div className="doc-modal-body">
              <div className="inv-form-grid">
                <div className="inv-field">
                  <FieldLabel required>Statut</FieldLabel>
                  <AppSelect
                    value={form.status}
                    onChange={(next) => onChangeField({ target: { name: "status", value: next } })}
                    options={statusOptions}
                  />
                </div>

                <div className="inv-field">
                  <FieldLabel required>Client</FieldLabel>
                  <AppSelect
                    value={form.client_id}
                    onChange={(next) => onChangeField({ target: { name: "client_id", value: next } })}
                    options={clientOptions}
                  />
                </div>
                <div className="inv-field">
                  <label>Devis source</label>
                  <AppSelect
                    value={form.quote_id}
                    onChange={(next) => onChangeField({ target: { name: "quote_id", value: next } })}
                    options={quoteOptions}
                  />
                </div>

                <div className="inv-field">
                  <label>Date emission</label>
                  <AppDateField
                    value={form.issue_date}
                    onChange={(next) => onChangeField({ target: { name: "issue_date", value: next } })}
                  />
                </div>
                <div className="inv-field">
                  <label>Date echeance</label>
                  <AppDateField
                    value={form.due_date}
                    onChange={(next) => onChangeField({ target: { name: "due_date", value: next } })}
                  />
                </div>

                <div className="inv-field">
                  <label>Devise</label>
                  <AppSelect
                    value={form.currency}
                    onChange={(next) => onChangeField({ target: { name: "currency", value: next } })}
                    options={currencyOptions}
                  />
                </div>

                {form.status === "paid" ? (
                  <div className="inv-field inv-field--full">
                    <label>{t("invoices.fieldPaidAt")}</label>
                    <AppDateField
                      value={form.paid_at}
                      onChange={(next) => onChangeField({ target: { name: "paid_at", value: next } })}
                    />
                  </div>
                ) : null}
                <div className="inv-field inv-field--full">
                  <p className="inv-sub" style={{ margin: 0 }}>
                    {t("invoices.amountsHint")}
                    {form.quote_id ? (
                      <>
                        {" "}
                        TTC : <strong>{formatMoney(form.total)} {form.currency}</strong>
                      </>
                    ) : null}
                  </p>
                </div>
                <div className="inv-field inv-field--full">
                  <label>Notes</label>
                  <textarea className="inv-textarea" name="notes" value={form.notes} onChange={onChangeField} placeholder="Informations internes..." />
                </div>
              </div>
              </div>

              <FormActions
                onCancel={closeModal}
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

      {paymentsOpen ? (
        <ModalPortal>
        <div className="inv-modal-backdrop" role="dialog" aria-modal="true" onClick={() => setPaymentsOpen(null)}>
          <section className="inv-modal" onClick={(e) => e.stopPropagation()}>
            <div className="inv-modal-head">
              <h2>Paiements — {paymentsOpen.number}</h2>
              <button className="inv-icon-btn" type="button" onClick={() => setPaymentsOpen(null)} aria-label="Fermer">
                <i className="fa-solid fa-xmark" />
              </button>
            </div>
            <p className="inv-sub">Solde restant : <strong>{formatMoney(balanceDue)} {paymentsOpen.currency}</strong></p>
            <ul className="inv-sub" style={{ marginBottom: 12 }}>
              {payments.length === 0 ? <li>Aucun paiement enregistre.</li> : null}
              {payments.map((p) => (
                <li key={p.id}>
                  {formatMoney(p.amount)} — {p.method || "—"} — {formatDate(p.paid_at)}
                </li>
              ))}
            </ul>
            <form onSubmit={submitPayment}>
              <div className="inv-form-grid">
                <div className="inv-field">
                  <FieldLabel required>Montant</FieldLabel>
                  <input
                    className="inv-input"
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm((prev) => ({ ...prev, amount: e.target.value }))}
                  />
                </div>
                <div className="inv-field">
                  <label>Methode</label>
                  <input
                    className="inv-input"
                    value={paymentForm.method}
                    onChange={(e) => setPaymentForm((prev) => ({ ...prev, method: e.target.value }))}
                    placeholder="Virement, especes..."
                  />
                </div>
              </div>
              <FormActions
                onCancel={() => setPaymentsOpen(null)}
                submitLabel="Ajouter un paiement"
                saving={paymentSaving}
              />
            </form>
          </section>
        </div>
        </ModalPortal>
      ) : null}

      {deleteTarget ? (
        <ConfirmDialog
          open
          title="Supprimer la facture"
          description={`Confirmer la suppression de ${deleteTarget.number} ?`}
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

function statusLabel(options, value) {
  return options.find((opt) => opt.value === value)?.label || value || "—";
}

function validateInvoiceForm(form) {
  if (form.due_date && form.issue_date && form.due_date < form.issue_date) {
    return { valid: false, message: "La date d'echeance doit etre superieure a la date d'emission." };
  }
  return { valid: true, message: "" };
}

function buildPayload(form) {
  const payload = {
    number: normalizeNullable(form.number),
    status: form.status || "draft",
    currency: String(form.currency || "XOF").trim().toUpperCase(),
    subtotal: roundMoney(form.subtotal),
    tax_amount: roundMoney(form.tax_amount),
    total: roundMoney(form.total),
    notes: normalizeNullable(form.notes),
    issue_date: normalizeNullable(form.issue_date),
    due_date: normalizeNullable(form.due_date),
    paid_at: normalizeNullable(form.paid_at),
  };
  const clientId = Number.parseInt(form.client_id, 10);
  const quoteId = Number.parseInt(form.quote_id, 10);
  payload.client_id = Number.isFinite(clientId) ? clientId : null;
  payload.quote_id = Number.isFinite(quoteId) ? quoteId : null;
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

function extractApiMessage(error, fallback) {
  if (error?.body?.errors && typeof error.body.errors === "object") {
    const first = Object.values(error.body.errors)[0];
    if (Array.isArray(first) && first[0]) return String(first[0]);
  }
  if (error?.body?.message) return String(error.body.message);
  return error?.message || fallback;
}
