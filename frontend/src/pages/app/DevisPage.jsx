import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { apiFetch, peekCache } from "../../api/client";
import TableSkeleton from "../../components/skeleton/TableSkeleton";
import FormActions from "../../components/FormActions";
import DocumentPreviewModal from "../../components/DocumentPreviewModal";
import { AppDateField, AppSelect, FieldLabel } from "../../components/AppFormControls";
import InlineStatusSelect from "../../components/InlineStatusSelect";
import ConfirmDialog from "../../components/ConfirmDialog";
import DocumentLinesEditor, { computeLineTotals, createEmptyLine } from "../../components/DocumentLinesEditor";
import ModalPortal from "../../components/ModalPortal";

const defaultForm = {
  client_id: "",
  status: "draft",
  issue_date: "",
  valid_until: "",
  currency: "XOF",
  notes: "",
  discount_percent: "0",
  items: [createEmptyLine()],
};

export default function DevisPage() {
  const { t } = useTranslation("app");
  const statusOptions = useMemo(
    () => [
      { value: "draft", label: t("quotes.statusDraft") },
      { value: "sent", label: t("quotes.statusSent") },
      { value: "accepted", label: t("quotes.statusAccepted") },
      { value: "rejected", label: t("quotes.statusRejected") },
      { value: "expired", label: t("quotes.statusExpired") },
    ],
    [t]
  );
  const [quotes, setQuotes] = useState([]);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0 });
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(() => peekCache("/api/quotes?page=1") == null);
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
  const [previewTarget, setPreviewTarget] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [confirmState, setConfirmState] = useState(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [editingSnapshot, setEditingSnapshot] = useState(null);

  const isEditing = editingId !== null;

  useEffect(() => {
    loadQuotes(page);
  }, [page]);

  useEffect(() => {
    loadClients();
  }, []);

  async function loadClients() {
    try {
      const response = await apiFetch("/api/clients?per_page=200");
      setClients(Array.isArray(response?.data) ? response.data : []);
    } catch {
      // Keep module usable even if clients fail.
    }
  }

  async function loadQuotes(requestedPage = 1) {
    const url = `/api/quotes?page=${requestedPage}`;
    if (peekCache(url) == null) setLoading(true);
    setError("");
    try {
      const response = await apiFetch(url);
      setQuotes(Array.isArray(response?.data) ? response.data : []);
      setMeta({
        current_page: Number(response?.current_page || requestedPage || 1),
        last_page: Number(response?.last_page || 1),
        total: Number(response?.total || 0),
      });
    } catch (err) {
      setQuotes([]);
      setMeta({ current_page: 1, last_page: 1, total: 0 });
      setError(extractApiMessage(err, "Impossible de charger les devis."));
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
    setError("");
    setSuccess("");
    resetForm();
    setModalOpen(true);
  }

  async function openEdit(quote) {
    setError("");
    setSuccess("");
    setEditingId(quote.id);
    let full = quote;
    try {
      full = await apiFetch(`/api/quotes/${quote.id}`);
    } catch {
      // fallback list row
    }
    const items = Array.isArray(full.items) && full.items.length > 0
      ? full.items.map((item) => ({
          description: item.description || "",
          quantity: String(Math.max(0, Math.round(Number(item.quantity) || 1))),
          unit_price: String(item.unit_price ?? ""),
          tax_rate: String(item.tax_rate ?? "0"),
        }))
      : [createEmptyLine()];
    setForm({
      client_id: full.client_id ? String(full.client_id) : "",
      status: full.status || "draft",
      issue_date: toDateInput(full.issue_date),
      valid_until: toDateInput(full.valid_until),
      currency: full.currency || "XOF",
      notes: full.notes || "",
      discount_percent: String(full.discount_percent ?? "0"),
      items,
    });
    setEditingSnapshot({ number: full.number || `#${full.id}`, status: full.status || "draft" });
    setModalOpen(true);
  }

  function openPreview(quote) {
    setPreviewTarget(quote);
  }

  function requestStatusChange(quote, status) {
    if (status === quote.status) return;
    setConfirmState({ type: "status", quote, toStatus: status });
  }

  function requestConvertToInvoice(quote) {
    if (quote.has_invoice) return;
    setConfirmState({ type: "convert", quote });
  }

  async function confirmPendingAction() {
    if (!confirmState) return;
    setConfirmLoading(true);
    setError("");
    setSuccess("");
    try {
      if (confirmState.type === "status") {
        const { quote, toStatus } = confirmState;
        if (modalOpen && editingId === quote.id) {
          setForm((prev) => ({ ...prev, status: toStatus }));
          setEditingSnapshot((prev) => (prev ? { ...prev, status: toStatus } : prev));
        } else {
          await apiFetch(`/api/quotes/${quote.id}`, {
            method: "PUT",
            body: JSON.stringify({ status: toStatus }),
          });
          setQuotes((prev) => prev.map((q) => (q.id === quote.id ? { ...q, status: toStatus } : q)));
        }
      } else if (confirmState.type === "convert") {
        const { quote } = confirmState;
        const res = await apiFetch(`/api/quotes/${quote.id}/convert-to-invoice`, { method: "POST" });
        setSuccess(res?.message || "Facture creee.");
        await loadQuotes(page);
      }
      setConfirmState(null);
    } catch (err) {
      setError(extractApiMessage(err, "Action impossible."));
    } finally {
      setConfirmLoading(false);
    }
  }

  function closeModal() {
    setModalOpen(false);
    resetForm();
  }

  function onChangeField(e) {
    const { name, value } = e.target;
    setForm((prev) => {
      if (name === "status" && editingId && value !== prev.status) {
        const quoteRef = {
          id: editingId,
          number: editingSnapshot?.number || (editingId ? `#${editingId}` : "—"),
          status: prev.status,
        };
        setConfirmState({ type: "status", quote: quoteRef, toStatus: value });
        return prev;
      }
      const next = { ...prev, [name]: value };
      if (name === "issue_date" && value && !next.valid_until) {
        const start = new Date(value);
        if (!Number.isNaN(start.getTime())) {
          start.setDate(start.getDate() + 30);
          next.valid_until = start.toISOString().slice(0, 10);
        }
      }
      return next;
    });
  }

  async function onSubmit(e) {
    e.preventDefault();
    const validation = validateQuoteForm(form);
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
        await apiFetch(`/api/quotes/${editingId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        setSuccess("Devis mis a jour.");
      } else {
        await apiFetch("/api/quotes", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setSuccess("Devis cree.");
      }
      closeModal();
      await loadQuotes(page);
    } catch (err) {
      setError(extractApiMessage(err, "Impossible d'enregistrer le devis."));
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
      await apiFetch(`/api/quotes/${deleteTarget.id}`, { method: "DELETE" });
      setSuccess("Devis supprime.");
      const nextPage = quotes.length === 1 && page > 1 ? page - 1 : page;
      if (nextPage !== page) setPage(nextPage);
      await loadQuotes(nextPage);
      setDeleteTarget(null);
    } catch (err) {
      setError(extractApiMessage(err, "Impossible de supprimer le devis."));
    } finally {
      setDeletingId(null);
    }
  }

  const displayedQuotes = useMemo(() => {
    return quotes.filter((quote) => {
      const matchesStatus = filterStatus === "all" || quote.status === filterStatus;
      const q = search.trim().toLowerCase();
      if (!q) return matchesStatus;
      const fields = [quote.number, quote.client?.name, quote.currency, quote.status]
        .filter(Boolean)
        .map((value) => String(value).toLowerCase());
      return matchesStatus && fields.some((value) => value.includes(q));
    });
  }, [quotes, filterStatus, search]);

  const statusFilterOptions = useMemo(
    () => [{ value: "all", label: "Tous" }, ...statusOptions],
    [statusOptions]
  );
  const clientOptions = useMemo(
    () => [{ value: "", label: "Aucun" }, ...clients.map((client) => ({ value: String(client.id), label: client.name }))],
    [clients]
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
    <div className="quo">
      <style>{`
        .quo { color: var(--color-text); font-family: var(--sans); display: grid; gap: 14px; }
        .quo-card {
          border-radius: 14px;
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          padding: 14px;
          box-shadow: 0 8px 22px rgba(20, 33, 61, 0.05);
        }
        .quo-search-card {
          border-radius: 14px;
          border: 1px solid #dde5f2;
          background: linear-gradient(180deg, #fbfcff 0%, #ffffff 100%);
          padding: 12px;
          box-shadow: 0 4px 14px rgba(20, 33, 61, 0.04);
        }
        .quo-toolbar {
          display: grid;
          grid-template-columns: minmax(300px, 1.35fr) 170px auto;
          gap: 8px;
          align-items: end;
        }
        .quo-field { display: grid; gap: 6px; }
        .quo-required { color: #c63737; margin-left: 4px; }
        .quo-input, .quo-select, .quo-textarea {
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
        .quo-textarea { min-height: 74px; resize: vertical; }
        .quo-btn {
          border-radius: 10px;
          border: 1px solid var(--color-border-strong);
          background: var(--color-surface);
          color: var(--color-text);
          padding: 9px 11px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
        }
        .quo-btn--primary {
          background: var(--color-primary);
          color: var(--color-primary-contrast);
          border-color: var(--color-primary);
        }
        .quo-btn--accent {
          background: #fca311;
          color: #14213d;
          border-color: #fca311;
        }
        .quo-btn--danger-soft {
          background: #fff6f6;
          color: #9d2f2f;
          border-color: #efc2c2;
        }
        .quo-btn:disabled { opacity: 0.65; cursor: not-allowed; }
        .quo-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
        .quo-head h2 { margin: 0; font-size: 1.1rem; font-family: var(--heading); letter-spacing: -0.02em; }
        .quo-topbar {
          display: flex;
          gap: 8px;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
          flex-wrap: wrap;
        }
        .quo-topbar h2 { margin: 0; font-family: var(--heading); font-size: 1.05rem; letter-spacing: -0.02em; }
        .quo-sub { margin: 0; color: var(--color-text-muted); font-size: 13px; }
        .quo-banner {
          border-radius: 10px;
          padding: 10px 12px;
          font-size: 13px;
          border: 1px solid;
        }
        .quo-banner--error { background: #fff3f0; border-color: #f4c0b6; color: #b3412d; }
        .quo-banner--success { background: #effaf2; border-color: #b8e2c2; color: #1c6a33; }
        .quo-table-wrap { overflow-x: auto; }
        .quo-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 760px;
          font-size: 14px;
          background: #fff;
          border-radius: 12px;
          overflow: hidden;
        }
        .quo-table th {
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
        .quo-table td {
          padding: 10px 6px;
          border-bottom: 1px solid var(--color-border);
          vertical-align: top;
        }
        .quo-mini { color: var(--color-text-muted); font-size: 12px; }
        .quo-tag {
          display: inline-flex;
          border-radius: 999px;
          padding: 3px 8px;
          font-size: 11px;
          font-weight: 700;
          border: 1px solid transparent;
        }
        .quo-tag--draft { background: #f4f4f5; color: #3f3f46; border-color: #e4e4e7; }
        .quo-tag--sent { background: #eaf5ff; color: #145ea8; border-color: #c9e4ff; }
        .quo-tag--accepted { background: #ebfaef; color: #196f38; border-color: #bae8c8; }
        .quo-tag--rejected { background: #fff1f2; color: #a11a3a; border-color: #f4c6d1; }
        .quo-actions { display: flex; gap: 6px; justify-content: flex-end; }
        .quo-icon-btn {
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
        .quo-icon-btn:hover {
          transform: translateY(-1px);
          background: #f8fafc;
          border-color: #c6d1e7;
        }
        .quo-pagination {
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
        .quo-form-grid { display: grid; gap: 10px; grid-template-columns: 1fr 1fr; }
        .quo-form-grid .quo-field--full { grid-column: 1 / -1; }
        .quo-modal-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 10px; }
        @media (max-width: 900px) {
          .quo-toolbar { grid-template-columns: 1fr; }
        }
        @media (max-width: 760px) {
          .quo-form-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      {error ? <div className="quo-banner quo-banner--error">{error}</div> : null}
      {success ? <div className="quo-banner quo-banner--success">{success}</div> : null}

      <section className="quo-search-card doc-filter-bar">
        <div className="quo-toolbar">
          <div className="quo-field">
            <label>Rechercher</label>
            <input
              className="quo-input"
              type="text"
              placeholder="Numero, client..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
          <div className="quo-field">
            <label>Statut</label>
            <AppSelect value={filterStatus} onChange={setFilterStatus} options={statusFilterOptions} />
          </div>
          <button className="quo-btn quo-btn--primary" type="button" onClick={() => setSearch(searchInput.trim())}>
            <i className="fa-solid fa-filter" /> Filtrer
          </button>
        </div>
      </section>

      <section className="quo-card doc-list-card">
        <div className="quo-topbar">
          <h2>Liste des devis</h2>
          <button className="quo-btn quo-btn--accent" type="button" onClick={openCreate}>
            <i className="fa-solid fa-plus" /> Nouveau devis
          </button>
        </div>
        <p className="quo-sub">{meta.total} devis enregistre(s)</p>

        <div className="quo-table-wrap">
          <table className="quo-table">
            <thead>
              <tr>
                <th>Numero</th>
                <th>Client</th>
                <th>Dates</th>
                <th>Montants</th>
                <th>Statut</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <TableSkeleton rows={7} columns={6} withActions actionColumnIndex={5} />
              ) : displayedQuotes.length === 0 ? (
                <tr>
                  <td colSpan={6}>Aucun devis trouve.</td>
                </tr>
              ) : (
                displayedQuotes.map((quote) => (
                  <tr key={quote.id}>
                    <td>
                      <strong>{quote.number}</strong>
                      <div className="quo-mini">{quote.currency || "XOF"}</div>
                    </td>
                    <td>{quote.client?.name || "—"}</td>
                    <td>
                      <div className="quo-mini">Emission: {formatDate(quote.issue_date)}</div>
                      <div className="quo-mini">Validite: {formatDate(quote.valid_until)}</div>
                    </td>
                    <td>
                      <div className="quo-mini">HT: {formatMoney(quote.subtotal)}</div>
                      <div className="quo-mini">TVA: {formatMoney(quote.tax_amount)}</div>
                      <strong>TTC: {formatMoney(quote.total)}</strong>
                    </td>
                    <td>
                      <InlineStatusSelect
                        value={quote.status || "draft"}
                        options={statusOptions}
                        onChange={(next) => requestStatusChange(quote, next)}
                      />
                    </td>
                    <td>
                      <div className="quo-actions">
                        <button className="quo-icon-btn" type="button" title="Aperçu / PDF" onClick={() => openPreview(quote)}>
                          <i className="fa-solid fa-eye" />
                        </button>
                        {quote.status === "accepted" ? (
                          <button
                            className="quo-icon-btn"
                            type="button"
                            title={quote.has_invoice ? "Facture deja creee pour ce devis" : "Convertir en facture"}
                            onClick={() => requestConvertToInvoice(quote)}
                            disabled={Boolean(quote.has_invoice)}
                          >
                            <i className="fa-solid fa-file-invoice" />
                          </button>
                        ) : null}
                        <button className="quo-icon-btn" type="button" title="Modifier" onClick={() => openEdit(quote)}>
                          <i className="fa-solid fa-pen" />
                        </button>
                        <button
                          className="quo-icon-btn quo-icon-btn--danger"
                          type="button"
                          title="Supprimer"
                          onClick={() => setDeleteTarget(quote)}
                          disabled={deletingId === quote.id}
                        >
                          <i className={`fa-solid ${deletingId === quote.id ? "fa-spinner fa-spin" : "fa-trash"}`} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="quo-pagination">
          <button
            className="quo-btn"
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
            className="quo-btn"
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
              <h2>{isEditing ? "Modifier le devis" : "Creer un devis"}</h2>
              <button className="doc-modal-close" type="button" onClick={closeModal} aria-label="Fermer">
                <i className="fa-solid fa-xmark" />
              </button>
            </div>

            <form className="doc-modal-form" onSubmit={onSubmit}>
              <div className="doc-modal-body">
                <div className="quo-form-grid">
                  <div className="quo-field">
                    <FieldLabel required>Statut</FieldLabel>
                    <AppSelect
                      value={form.status}
                      onChange={(next) => onChangeField({ target: { name: "status", value: next } })}
                      options={statusOptions}
                    />
                  </div>
                  <div className="quo-field">
                    <FieldLabel required>Client</FieldLabel>
                    <AppSelect
                      value={form.client_id}
                      onChange={(next) => onChangeField({ target: { name: "client_id", value: next } })}
                      options={clientOptions}
                    />
                  </div>
                  <div className="quo-field">
                    <label>Devise</label>
                    <AppSelect
                      value={form.currency}
                      onChange={(next) => onChangeField({ target: { name: "currency", value: next } })}
                      options={currencyOptions}
                    />
                  </div>
                  <div className="quo-field">
                    <FieldLabel required>Date emission</FieldLabel>
                    <AppDateField
                      value={form.issue_date}
                      onChange={(next) => onChangeField({ target: { name: "issue_date", value: next } })}
                    />
                  </div>
                  <div className="quo-field">
                    <label>Date validite</label>
                    <AppDateField
                      value={form.valid_until}
                      onChange={(next) => onChangeField({ target: { name: "valid_until", value: next } })}
                    />
                  </div>
                  <div className="quo-field quo-field--full">
                    <label>Notes</label>
                    <textarea className="quo-textarea" name="notes" value={form.notes} onChange={onChangeField} />
                  </div>
                  <div className="quo-field quo-field--full">
                    <FieldLabel required>Lignes de prestation</FieldLabel>
                    <DocumentLinesEditor
                      lines={form.items}
                      discountPercent={form.discount_percent}
                      onDiscountChange={(value) => setForm((prev) => ({ ...prev, discount_percent: value }))}
                      onChange={(items) => setForm((prev) => ({ ...prev, items }))}
                    />
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
        previewPath={previewTarget ? `/api/quotes/${previewTarget.id}/preview` : ""}
        pdfPath={previewTarget ? `/api/quotes/${previewTarget.id}/pdf` : ""}
        filename={previewTarget ? `${previewTarget.number}.pdf` : "document.pdf"}
        title={previewTarget ? `Aperçu — ${previewTarget.number}` : ""}
      />

      {deleteTarget ? (
        <ConfirmDialog
          open
          title={t("quotes.deleteModal")}
          description={t("quotes.deleteConfirm", { number: deleteTarget.number })}
          onClose={() => setDeleteTarget(null)}
          onConfirm={confirmDelete}
          saving={deletingId !== null}
        />
      ) : null}

      {confirmState?.type === "status" ? (
        <ConfirmDialog
          open
          title={t("quotes.confirmStatusTitle")}
          description={t("quotes.confirmStatusDesc", {
            number: confirmState.quote.number,
            from: statusLabel(statusOptions, confirmState.quote.status),
            to: statusLabel(statusOptions, confirmState.toStatus),
          })}
          onClose={() => setConfirmState(null)}
          onConfirm={confirmPendingAction}
          saving={confirmLoading}
        />
      ) : null}

      {confirmState?.type === "convert" ? (
        <ConfirmDialog
          open
          title={t("quotes.confirmConvertTitle")}
          description={t("quotes.confirmConvertDesc", { number: confirmState.quote.number })}
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

function validateQuoteForm(form) {
  if (form.valid_until && form.issue_date && form.valid_until < form.issue_date) {
    return { valid: false, message: "La date de validite doit etre superieure a la date d'emission." };
  }
  const validLines = (form.items || []).filter((line) => String(line.description || "").trim() !== "");
  if (validLines.length === 0) {
    return { valid: false, message: "Ajoutez au moins une ligne de prestation." };
  }
  for (const line of validLines) {
    if (!(Number.parseFloat(line.quantity) > 0)) {
      return { valid: false, message: "Chaque ligne doit avoir une quantite positive." };
    }
  }
  return { valid: true, message: "" };
}

function buildPayload(form) {
  const validLines = (form.items || [])
    .filter((line) => String(line.description || "").trim() !== "")
    .map((line) => ({
      description: String(line.description).trim(),
      quantity: Number.parseFloat(line.quantity) || 0,
      unit_price: Number.parseFloat(line.unit_price) || 0,
      tax_rate: Number.parseFloat(line.tax_rate) || 0,
    }));
  const payload = {
    status: form.status || "draft",
    currency: String(form.currency || "XOF").trim().toUpperCase(),
    issue_date: normalizeNullable(form.issue_date),
    valid_until: normalizeNullable(form.valid_until),
    notes: normalizeNullable(form.notes),
    discount_percent: Number.parseFloat(form.discount_percent) || 0,
    items: validLines,
  };
  const clientId = Number.parseInt(form.client_id, 10);
  payload.client_id = Number.isFinite(clientId) ? clientId : null;
  return payload;
}

function normalizeNullable(value) {
  const trimmed = String(value ?? "").trim();
  return trimmed === "" ? null : trimmed;
}

function toDateInput(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("fr-FR");
}

function formatMoney(value) {
  const amount = Number.parseFloat(value);
  if (!Number.isFinite(amount)) return "0";
  return amount.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function extractApiMessage(error, fallback) {
  if (error?.body?.errors && typeof error.body.errors === "object") {
    const first = Object.values(error.body.errors)[0];
    if (Array.isArray(first) && first[0]) return String(first[0]);
  }
  if (error?.body?.message) return String(error.body.message);
  return error?.message || fallback;
}
