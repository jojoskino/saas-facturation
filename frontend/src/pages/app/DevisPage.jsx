import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { apiFetch, peekCache } from "../../api/client";
import { paginatedFromCache } from "../../utils/listCache";
import TableSkeleton from "../../components/skeleton/TableSkeleton";
import FormActions from "../../components/FormActions";
import DocumentPreviewModal from "../../components/DocumentPreviewModal";
import { quoteHistoryPaths } from "../../utils/documentPreview";
import { AppDateField, AppSelect, FieldLabel } from "../../components/AppFormControls";
import InlineStatusSelect from "../../components/InlineStatusSelect";
import ConfirmDialog from "../../components/ConfirmDialog";
import ModalPortal from "../../components/ModalPortal";
import DocumentLinesEditor, { computeLineTotals, createEmptyLine, validateDocumentLines } from "../../components/DocumentLinesEditor";
import ListFilterBar, { ListFilterField, ListFilterGrid } from "../../components/list/ListFilterBar";
import ListPageHeader from "../../components/list/ListPageHeader";
import ListPagination from "../../components/list/ListPagination";
import ListIconButton from "../../components/list/ListIconButton";
import { useAmountsPrivacy } from "../../hooks/useAmountsPrivacy";

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
  const { maskMoney } = useAmountsPrivacy();
  const showMoney = (value) => maskMoney(value, formatMoney);
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
  const [quotes, setQuotes] = useState(() => paginatedFromCache(buildQuotesUrl(1, "", "all"))?.rows ?? []);
  const [meta, setMeta] = useState(
    () => paginatedFromCache(buildQuotesUrl(1, "", "all"))?.meta ?? { current_page: 1, last_page: 1, total: 0 },
  );
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(() => paginatedFromCache(buildQuotesUrl(1, "", "all")) == null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState("");
  const [modalError, setModalError] = useState("");
  const [lineHints, setLineHints] = useState(null);
  const [success, setSuccess] = useState("");
  const formBaselineRef = useRef("");

  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [previewTarget, setPreviewTarget] = useState(null);
  const [historyTarget, setHistoryTarget] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [confirmState, setConfirmState] = useState(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [editingSnapshot, setEditingSnapshot] = useState(null);

  const isEditing = editingId !== null;

  useEffect(() => {
    loadQuotes(page);
  }, [page, search, filterStatus]);

  useEffect(() => {
    loadClients();
  }, []);

  async function loadClients() {
    try {
      const response = await apiFetch("/api/clients?per_page=200&minimal=1", { cacheTtl: 300_000 });
      setClients(Array.isArray(response?.data) ? response.data : []);
    } catch {
      // Keep module usable even if clients fail.
    }
  }

  async function loadQuotes(requestedPage = 1) {
    const url = buildQuotesUrl(requestedPage, search, filterStatus);
    const cached = paginatedFromCache(url);
    if (cached) {
      setQuotes(cached.rows);
      setMeta(cached.meta);
    }
    if (peekCache(url) == null) setLoading(true);
    setError("");
    try {
      const response = await apiFetch(url, { cacheTtl: 180_000 });
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
    setModalError("");
    setLineHints(null);
    formBaselineRef.current = "";
  }

  const captureFormBaseline = useCallback((nextForm) => {
    formBaselineRef.current = serializeQuoteFormSnapshot(nextForm);
  }, []);

  const isFormDirty = useCallback(() => {
    return formBaselineRef.current !== "" && formBaselineRef.current !== serializeQuoteFormSnapshot(form);
  }, [form]);

  function requestCloseModal() {
    if (isFormDirty() && !window.confirm("Des modifications non enregistrées seront perdues. Fermer quand même ?")) {
      return;
    }
    closeModal();
  }

  function openCreate() {
    setError("");
    setSuccess("");
    resetForm();
    captureFormBaseline(defaultForm);
    setModalOpen(true);
  }

  async function openEdit(quote) {
    if (quote.has_invoice) {
      setError(t("quotes.lockedWhenInvoiced"));
      return;
    }
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
          quantity: String(item.quantity ?? "1"),
          unit_price: String(item.unit_price ?? ""),
          tax_rate: String(item.tax_rate ?? "0"),
        }))
      : [createEmptyLine()];
    const nextForm = {
      client_id: full.client_id ? String(full.client_id) : "",
      status: full.status || "draft",
      issue_date: toDateInput(full.issue_date),
      valid_until: toDateInput(full.valid_until),
      currency: full.currency || "XOF",
      notes: full.notes || "",
      discount_percent: String(full.discount_percent ?? "0"),
      items,
    };
    setForm(nextForm);
    captureFormBaseline(nextForm);
    setEditingSnapshot({ number: full.number || `#${full.id}`, status: full.status || "draft" });
    setModalOpen(true);
  }

  function openPreview(quote) {
    setPreviewTarget(quote);
  }

  function openHistory(quote) {
    setHistoryTarget(quote);
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
    setError("");
    setModalError("");
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
      pushToast("Devis archivé.", "success");
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

  function renderQuoteActions(quote) {
    return (
      <>
        <ListIconButton title="Aperçu / PDF" icon="fa-eye" onClick={() => openPreview(quote)} />
        <ListIconButton title="Historique" icon="fa-clock-rotate-left" onClick={() => openHistory(quote)} />
        {quote.status === "accepted" ? (
          <ListIconButton
            title={quote.has_invoice ? "Facture deja creee pour ce devis" : "Convertir en facture"}
            icon="fa-file-invoice"
            onClick={() => requestConvertToInvoice(quote)}
            disabled={Boolean(quote.has_invoice)}
          />
        ) : null}
        <ListIconButton
          title={quote.has_invoice ? t("quotes.lockedWhenInvoiced") : "Modifier"}
          icon="fa-pen"
          onClick={() => openEdit(quote)}
          disabled={Boolean(quote.has_invoice)}
        />
        <ListIconButton
          title={quote.has_invoice ? t("quotes.lockedWhenInvoiced") : "Supprimer"}
          icon="fa-trash"
          danger
          spinning={deletingId === quote.id}
          onClick={() => setDeleteTarget(quote)}
          disabled={deletingId === quote.id || Boolean(quote.has_invoice)}
        />
      </>
    );
  }

  return (
    <div className="quo app-list-page">
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

      <ListFilterBar>
        <ListFilterGrid>
          <ListFilterField label="Rechercher">
            <input
              className="quo-input"
              type="text"
              placeholder="Numero, client..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </ListFilterField>
          <ListFilterField label="Statut">
            <AppSelect value={filterStatus} onChange={setFilterStatus} options={statusFilterOptions} />
          </ListFilterField>
        </ListFilterGrid>
      </ListFilterBar>

      <section className="quo-card app-list-card doc-list-card">
        <ListPageHeader
          title="Liste des devis"
          count={`${meta.total} devis enregistre(s)`}
          actions={
            <button className="quo-btn quo-btn--accent app-list-btn" type="button" onClick={openCreate}>
              <i className="fa-solid fa-plus" /> <span className="btn-label-long">Nouveau devis</span>
            </button>
          }
        />

        <div className="app-list-table-wrap">
          <table className="entity-list-table app-list-table">
            <thead>
              <tr>
                <th>Numéro</th>
                <th>Client</th>
                <th>
                  Dates
                  <span className="entity-list-table__unit">Émission → validité</span>
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
                <TableSkeleton rows={7} columns={6} withActions actionColumnIndex={5} />
              ) : quotes.length === 0 ? (
                <tr>
                  <td colSpan={6}>Aucun devis trouvé.</td>
                </tr>
              ) : (
                quotes.map((quote) => (
                  <tr key={quote.id} className={quoteRowClassName(quote)}>
                    <td>
                      <strong>{quote.number}</strong>
                    </td>
                    <td>{quote.client?.name || "—"}</td>
                    <td>
                      {formatDate(quote.issue_date)} → {formatDate(quote.valid_until)}
                    </td>
                    <td className="entity-list-table__amount-cell">
                      <strong>{showMoney(quote.total)}</strong>
                    </td>
                    <td>
                      <InlineStatusSelect
                        value={quote.status || "draft"}
                        options={statusOptions}
                        onChange={(next) => requestStatusChange(quote, next)}
                        disabled={Boolean(quote.has_invoice)}
                      />
                    </td>
                    <td>
                      <div className="entity-list-row-actions">{renderQuoteActions(quote)}</div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="app-list-cards">
          {loading && quotes.length === 0 ? (
            <>
              <div className="app-list-card-item app-list-card-item--skeleton" />
              <div className="app-list-card-item app-list-card-item--skeleton" />
              <div className="app-list-card-item app-list-card-item--skeleton" />
            </>
          ) : quotes.length === 0 ? (
            <div className="app-list-card-item app-list-card-item--empty">Aucun devis trouve.</div>
          ) : (
            quotes.map((quote) => (
              <article key={quote.id} className={quoteCardClassName(quote)}>
                <div className="app-list-card-item__head">
                  <div>
                    <div className="app-list-card-item__ref">{quote.number}</div>
                    <div className="app-list-card-item__sub">{quote.client?.name || "—"}</div>
                  </div>
                  <div className="app-list-card-item__amount-stack">
                    <span className="app-list-card-item__amount-label">XOF</span>
                    <strong>{showMoney(quote.total)}</strong>
                  </div>
                </div>
                <div className="app-list-card-item__row">
                  <span className="app-list-card-item__label">Validité</span>
                  <span>
                    {formatDate(quote.issue_date)} → {formatDate(quote.valid_until)}
                  </span>
                </div>
                <div className="app-list-card-item__foot">
                  <InlineStatusSelect
                    value={quote.status || "draft"}
                    options={statusOptions}
                    onChange={(next) => requestStatusChange(quote, next)}
                    disabled={Boolean(quote.has_invoice)}
                  />
                  <div className="app-list-card-item__actions">{renderQuoteActions(quote)}</div>
                </div>
              </article>
            ))
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
          <section className="doc-modal" onClick={(e) => e.stopPropagation()}>
            <div className="doc-modal-head">
              <h2>{isEditing ? "Modifier le devis" : "Creer un devis"}</h2>
              <button className="doc-modal-close" type="button" onClick={requestCloseModal} aria-label="Fermer">
                <i className="fa-solid fa-xmark" />
              </button>
            </div>

            <form className="doc-modal-form" onSubmit={onSubmit}>
              <div className="doc-modal-body">
                {modalError ? <div className="inv-banner inv-banner--error">{modalError}</div> : null}
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
                    <FieldLabel>Lignes de prestation</FieldLabel>
                    <DocumentLinesEditor
                      lines={form.items}
                      lineHints={lineHints}
                      discountPercent={form.discount_percent}
                      onDiscountChange={(value) => setForm((prev) => ({ ...prev, discount_percent: value }))}
                      onChange={(items) => {
                        setLineHints(null);
                        setForm((prev) => ({ ...prev, items }));
                      }}
                    />
                  </div>
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
        previewPath={previewTarget ? `/api/quotes/${previewTarget.id}/preview` : ""}
        pdfPath={previewTarget ? `/api/quotes/${previewTarget.id}/pdf` : ""}
        filename={previewTarget ? `${previewTarget.number}.pdf` : "document.pdf"}
        title={previewTarget ? `Aperçu — ${previewTarget.number}` : ""}
      />

      <DocumentPreviewModal
        open={Boolean(historyTarget)}
        onClose={() => setHistoryTarget(null)}
        previewPath={historyTarget ? quoteHistoryPaths(historyTarget)?.preview : ""}
        pdfPath={historyTarget ? quoteHistoryPaths(historyTarget)?.pdf : ""}
        filename={historyTarget ? quoteHistoryPaths(historyTarget)?.filename : "historique.pdf"}
        title={historyTarget ? quoteHistoryPaths(historyTarget)?.title : ""}
        subtitle="Chronologie du document — exportable en PDF."
        downloadLabel="Télécharger l'historique PDF"
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

function serializeQuoteFormSnapshot(form) {
  return JSON.stringify({
    client_id: form.client_id || "",
    status: form.status || "draft",
    issue_date: form.issue_date || "",
    valid_until: form.valid_until || "",
    currency: form.currency || "XOF",
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

function validateQuoteForm(form) {
  if (!form.client_id) {
    return { valid: false, message: "Sélectionnez un client pour ce devis." };
  }
  if (form.valid_until && form.issue_date && form.valid_until < form.issue_date) {
    return { valid: false, message: "La date de validite doit etre superieure a la date d'emission." };
  }
  const lineCheck = validateDocumentLines(form.items);
  if (!lineCheck.valid) {
    return { valid: false, message: "", lineIssues: lineCheck.issues };
  }
  const validLines = (form.items || []).filter(
    (line) => String(line.description || "").trim() !== "" && String(line.unit_price ?? "").trim() !== "",
  );
  for (const line of validLines) {
    if (!(Number.parseFloat(line.quantity) > 0)) {
      return { valid: false, message: "Chaque ligne doit avoir une quantite positive." };
    }
  }
  return { valid: true, message: "" };
}

function buildPayload(form) {
  const validLines = (form.items || [])
    .filter(
      (line) => String(line.description || "").trim() !== "" && String(line.unit_price ?? "").trim() !== "",
    )
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

function buildQuotesUrl(requestedPage, search, filterStatus) {
  const params = new URLSearchParams({ page: String(requestedPage) });
  if (search.trim()) params.set("q", search.trim());
  if (filterStatus !== "all") params.set("status", filterStatus);
  return `/api/quotes?${params.toString()}`;
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

function isQuoteRowMuted(quote) {
  return ["accepted", "rejected", "expired"].includes(quote.status);
}

function quoteRowClassName(quote) {
  return isQuoteRowMuted(quote) ? "entity-list-table-row--muted" : "";
}

function quoteCardClassName(quote) {
  return isQuoteRowMuted(quote) ? "app-list-card-item app-list-card-item--muted" : "app-list-card-item";
}
