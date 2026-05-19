import { useEffect, useMemo, useState } from "react";
import { apiFetch, peekCache } from "../../api/client";
import TableSkeleton from "../../components/skeleton/TableSkeleton";
import FormActions from "../../components/FormActions";
import { AppSelect } from "../../components/AppFormControls";

const emptyForm = {
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  company: "",
  address: "",
  tax_id: "",
  notes: "",
};

export default function ClientsPage() {
  const [clients, setClients] = useState([]);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0 });
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(() => {
    const q = new URLSearchParams({ page: "1", per_page: "12" });
    return peekCache(`/api/clients?${q.toString()}`) == null;
  });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [viewTarget, setViewTarget] = useState(null);
  const [clientDocs, setClientDocs] = useState(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importCsv, setImportCsv] = useState("");
  const [importing, setImporting] = useState(false);
  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false);
  const [pendingPayload, setPendingPayload] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [filterCompany, setFilterCompany] = useState("all");
  const [sortBy, setSortBy] = useState("recent");

  const isEditing = editingId !== null;

  useEffect(() => {
    if (!viewTarget?.id) {
      setClientDocs(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await apiFetch(`/api/clients/${viewTarget.id}/documents`);
        if (!cancelled) setClientDocs(res);
      } catch {
        if (!cancelled) setClientDocs(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [viewTarget?.id]);

  async function submitImport(e) {
    e.preventDefault();
    setImporting(true);
    setError("");
    try {
      const res = await apiFetch("/api/clients/import", {
        method: "POST",
        body: JSON.stringify({ csv: importCsv }),
      });
      setSuccess(res?.message || "Import termine.");
      setImportOpen(false);
      setImportCsv("");
      await loadClients({ requestedPage: 1, requestedSearch: search });
    } catch (err) {
      setError(err?.body?.message || err?.message || "Import impossible.");
    } finally {
      setImporting(false);
    }
  }

  async function loadClients({ requestedPage = page, requestedSearch = search } = {}) {
    const query = new URLSearchParams({
      page: String(requestedPage),
      per_page: "12",
    });
    if (requestedSearch.trim()) query.set("q", requestedSearch.trim());
    const url = `/api/clients?${query.toString()}`;
    if (peekCache(url) == null) setLoading(true);
    setError("");
    try {
      const data = await apiFetch(url);
      setClients(Array.isArray(data?.data) ? data.data : []);
      setMeta({
        current_page: Number(data?.current_page || requestedPage || 1),
        last_page: Number(data?.last_page || 1),
        total: Number(data?.total || 0),
      });
    } catch (err) {
      setClients([]);
      setMeta({ current_page: 1, last_page: 1, total: 0 });
      setError(err?.message || "Impossible de charger les clients.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadClients();
  }, [page, search]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const next = searchInput.trim();
      setPage(1);
      setSearch(next);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  function onChangeField(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
  }

  function startCreate() {
    resetForm();
    setModalOpen(true);
    setSuccess("");
    setError("");
  }

  function startEdit(client) {
    setEditingId(client.id);
    setForm({
      first_name: client.first_name || splitName(client.name).first_name,
      last_name: client.last_name || splitName(client.name).last_name,
      email: client.email || "",
      phone: client.phone || "",
      company: client.company || "",
      address: client.address || "",
      tax_id: client.tax_id || "",
      notes: client.notes || "",
    });
    setModalOpen(true);
    setSuccess("");
    setError("");
  }

  function closeModal() {
    setModalOpen(false);
    resetForm();
  }

  async function onSubmit(e) {
    e.preventDefault();
    const validation = validateClientForm(form);
    if (!validation.valid) {
      setError(validation.message);
      pushToast(validation.message, "error");
      return;
    }
    const payload = buildClientPayload(form);
    setPendingPayload(payload);
    setConfirmSubmitOpen(true);
  }

  async function confirmSubmit() {
    if (!pendingPayload) return;
    setSaving(true);
    setError("");
    setSuccess("");
    setConfirmSubmitOpen(false);

    try {
      if (isEditing) {
        await apiFetch(`/api/clients/${editingId}`, {
          method: "PUT",
          body: JSON.stringify(pendingPayload),
        });
        pushToast("Client mis à jour.", "success");
      } else {
        await apiFetch("/api/clients", {
          method: "POST",
          body: JSON.stringify(pendingPayload),
        });
        pushToast("Client ajouté.", "success");
      }
      closeModal();
      await loadClients({ requestedPage: 1, requestedSearch: search });
      setPage(1);
    } catch (err) {
      setError(extractApiMessage(err, "Impossible d'enregistrer le client."));
      pushToast(extractApiMessage(err, "Impossible d'enregistrer le client."), "error");
    } finally {
      setPendingPayload(null);
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeletingId(deleteTarget.id);
    setError("");
    setSuccess("");
    try {
      await apiFetch(`/api/clients/${deleteTarget.id}`, { method: "DELETE" });
      setSuccess("Client supprimé.");
      pushToast("Client supprimé.", "success");
      const targetPage = clients.length === 1 && page > 1 ? page - 1 : page;
      await loadClients({ requestedPage: targetPage, requestedSearch: search });
      if (targetPage !== page) setPage(targetPage);
      setDeleteTarget(null);
    } catch (err) {
      setError(extractApiMessage(err, "Impossible de supprimer le client."));
      pushToast(extractApiMessage(err, "Impossible de supprimer le client."), "error");
    } finally {
      setDeletingId(null);
    }
  }

  function applySearch(e) {
    e.preventDefault();
    const next = searchInput.trim();
    setPage(1);
    setSearch(next);
  }

  function pushToast(message, type = "info") {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2600);
  }

  const companyOptions = useMemo(() => {
    const options = new Set();
    clients.forEach((client) => {
      if (client.company) options.add(client.company);
    });
    return Array.from(options).sort((a, b) => a.localeCompare(b, "fr"));
  }, [clients]);

  const displayedClients = useMemo(() => {
    let list = [...clients];
    if (filterCompany !== "all") {
      list = list.filter((c) => c.company === filterCompany);
    }
    if (sortBy === "name_desc") {
      list.sort((a, b) => getClientDisplayName(b).localeCompare(getClientDisplayName(a), "fr"));
    } else if (sortBy === "recent") {
      list.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    } else {
      list.sort((a, b) => getClientDisplayName(a).localeCompare(getClientDisplayName(b), "fr"));
    }
    return list;
  }, [clients, filterCompany, sortBy]);

  const companyFilterOptions = useMemo(
    () => [{ value: "all", label: "Toutes" }, ...companyOptions.map((option) => ({ value: option, label: option }))],
    [companyOptions]
  );
  const sortOptions = useMemo(
    () => [
      { value: "recent", label: "Plus recents" },
      { value: "name_asc", label: "Nom A-Z" },
      { value: "name_desc", label: "Nom Z-A" },
    ],
    []
  );

  return (
    <div className="clients">
      <style>{`
        .clients { color: var(--color-text); font-family: var(--sans); display: grid; gap: 18px; }
        .clients-grid { display: grid; grid-template-columns: 1fr; gap: 18px; align-items: start; }
        .clients-card {
          border-radius: 14px;
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          padding: 16px;
          overflow-x: hidden;
          box-shadow: 0 8px 22px rgba(20, 33, 61, 0.05);
        }
        .clients-search-card {
          border-radius: 14px;
          border: 1px solid #dde5f2;
          background: linear-gradient(180deg, #fbfcff 0%, #ffffff 100%);
          padding: 12px;
          box-shadow: 0 4px 14px rgba(20, 33, 61, 0.04);
        }
        .clients-filter-row {
          display: grid;
          grid-template-columns: minmax(300px, 1.35fr) 170px 150px auto;
          gap: 10px;
          align-items: end;
        }
        .clients-filter-item { display: grid; gap: 5px; }
        .clients-filter-item label {
          font-size: 11px;
          color: var(--color-text-muted);
          font-weight: 700;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }
        .clients-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }
        .clients-heading {
          margin: 0;
          font-size: 1.2rem;
          letter-spacing: -0.02em;
          font-family: var(--heading);
        }
        .clients-keyword {
          color: #fca311;
          font-weight: 800;
        }
        .clients-card h2 {
          margin: 0 0 6px;
          font-family: var(--heading);
          font-size: 1.05rem;
          letter-spacing: -0.02em;
        }
        .clients-sub { margin: 0 0 14px; font-size: 13px; color: var(--color-text-muted); }
        .clients-form { display: grid; gap: 10px; }
        .clients-field { display: grid; gap: 6px; }
        .clients-field label {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--color-text-muted);
          font-weight: 700;
        }
        .clients-required { color: #c63737; margin-left: 4px; }
        .clients-field input, .clients-field textarea {
          width: 100%;
          box-sizing: border-box;
          border-radius: 10px;
          border: 1px solid var(--color-border-strong);
          background: #fff;
          color: var(--color-text);
          padding: 10px 12px;
          font: 14px/1.3 var(--sans);
          outline: none;
        }
        .clients-field textarea { min-height: 74px; resize: vertical; }
        .clients-field input::placeholder, .clients-field textarea::placeholder, .clients-search input::placeholder {
          color: #94a3b8;
        }
        .clients-field input:focus::placeholder, .clients-field textarea:focus::placeholder, .clients-search input:focus::placeholder {
          color: transparent;
        }
        .clients-actions { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 4px; justify-content: flex-end; }
        .clients-btn {
          border-radius: 10px;
          border: 1px solid var(--color-border-strong);
          background: var(--color-surface);
          color: var(--color-text);
          padding: 9px 12px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
        }
        .clients-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .clients-btn--primary {
          background: var(--color-primary);
          color: var(--color-primary-contrast);
          border-color: var(--color-primary);
        }
        .clients-btn--accent {
          background: #fca311;
          color: #14213d;
          border-color: #fca311;
        }
        .clients-btn--soft-danger {
          border-color: #efc2c2;
          background: #fff6f6;
          color: #9d2f2f;
        }
        .clients-banner {
          border-radius: 10px;
          padding: 10px 12px;
          font-size: 13px;
          border: 1px solid;
        }
        .clients-banner--error {
          background: #fff3f0;
          border-color: #f4c0b6;
          color: #b3412d;
        }
        .clients-banner--success {
          background: #effaf2;
          border-color: #b8e2c2;
          color: #1c6a33;
        }
        .clients-topbar {
          display: flex;
          gap: 8px;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
          flex-wrap: wrap;
        }
        .clients-topbar h2 { margin: 0; font-family: var(--heading); font-size: 1.05rem; letter-spacing: -0.02em; }
        .clients-search {
          display: flex;
          gap: 6px;
          align-items: center;
          flex-wrap: nowrap;
        }
        .clients-search input {
          width: 100%;
          border-radius: 10px;
          border: 1px solid var(--color-border-strong);
          height: 40px;
          padding: 8px 12px;
          font: 14px/1.3 var(--sans);
        }
        .clients-select {
          width: 100%;
          border-radius: 10px;
          border: 1px solid var(--color-border-strong);
          height: 40px;
          padding: 8px 12px;
          font: 14px/1.3 var(--sans);
          background: #fff;
          color: var(--color-text);
        }
        .clients-filter-cta { align-self: end; }
        .clients-table-wrap { overflow-x: auto; }
        .clients-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 760px;
          font-size: 14px;
          background: #fff;
          border-radius: 12px;
          overflow: hidden;
        }
        .clients-table th {
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
        .clients-table td {
          padding: 11px 6px;
          border-bottom: 1px solid var(--color-border);
          vertical-align: top;
        }
        .clients-table tbody tr:hover { background: #fbfcff; }
        .clients-table td strong {
          color: #14213d;
          font-weight: 700;
        }
        .clients-mini { color: var(--color-text-muted); font-size: 12px; }
        .clients-row-actions { display: flex; gap: 6px; }
        .clients-row-btn {
          border: 1px solid var(--color-border-strong);
          background: #fff;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 700;
          padding: 7px 9px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: flex-end;
          min-width: 34px;
          transition: transform 0.18s ease, background 0.18s ease, border-color 0.18s ease;
        }
        .clients-row-btn:hover {
          transform: translateY(-1px);
          background: #f8fafc;
          border-color: #c6d1e7;
        }
        .clients-row-btn i { pointer-events: none; }
        .clients-row-btn--warn { color: #b3412d; }
        .clients-pagination {
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
        .clients-pagination-info { text-align: center; }
        .clients-modal-backdrop {
          position: fixed;
          inset: 0;
          z-index: 60;
          background: rgba(20, 33, 61, 0.35);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 18px;
        }
        .clients-modal {
          width: min(640px, 100%);
          max-height: calc(100vh - 36px);
          overflow: auto;
          border-radius: 14px;
          background: #fff;
          border: 1px solid var(--color-border);
          box-shadow: var(--shadow-soft);
          padding: 16px;
        }
        .clients-modal-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          margin-bottom: 10px;
        }
        .clients-modal-head h2 {
          margin: 0;
          font-size: 1.05rem;
          font-family: var(--heading);
        }
        .clients-icon-btn {
          border-radius: 9px;
          border: 1px solid var(--color-border-strong);
          background: #fff;
          width: 36px;
          height: 36px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }
        .clients-delete-text { margin: 0 0 14px; color: var(--color-text-muted); }
        .clients-view-list { margin: 0; padding-left: 16px; display: grid; gap: 6px; color: var(--color-text-muted); }
        .clients-toast-wrap {
          position: fixed;
          right: 16px;
          bottom: 16px;
          z-index: 120;
          display: grid;
          gap: 8px;
        }
        .clients-toast {
          border-radius: 10px;
          border: 1px solid var(--color-border);
          background: #fff;
          box-shadow: var(--shadow-soft);
          padding: 10px 12px;
          font-size: 13px;
          min-width: 230px;
        }
        .clients-toast--success { border-color: #b8e2c2; }
        .clients-toast--error { border-color: #f4c0b6; }
        @media (max-width: 1020px) {
          .clients-grid { grid-template-columns: 1fr; }
          .clients-filter-row { grid-template-columns: 1fr; }
          .clients-filter-cta { width: 100%; }
        }
        @media (max-width: 760px) {
          .clients { gap: 12px; }
          .clients-card, .clients-search-card { padding: 12px; }
          .clients-filter-row { gap: 8px; }
          .clients-search { width: 100%; }
          .clients-filter-cta { width: 100%; height: 40px; }
          .clients-topbar {
            gap: 10px;
            flex-wrap: nowrap;
            justify-content: space-between;
            min-width: 0;
          }
          .clients-topbar h2 {
            font-size: 1rem;
            min-width: 0;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
          .clients-topbar .clients-btn {
            width: auto;
            justify-content: center;
            white-space: nowrap;
            flex-shrink: 0;
          }
          .clients-table-wrap {
            width: 100%;
            overflow-x: auto;
            overflow-y: hidden;
            -webkit-overflow-scrolling: touch;
          .clients-table { min-width: 760px; }
          .clients-table th,
          .clients-table td { padding: 10px 6px; }
          .clients-row-actions { justify-content: flex-end; }
          .clients-pagination {
            gap: 6px;
            font-size: 12px;
            max-width: 100%;
            grid-template-columns: auto 1fr auto;
          }
          .clients-pagination .clients-btn {
            padding: 8px 10px;
            font-size: 12px;
          }
        }
      `}</style>

      {error ? <div className="clients-banner clients-banner--error">{error}</div> : null}
      {success ? <div className="clients-banner clients-banner--success">{success}</div> : null}

      <div className="clients-grid">
        <section className="clients-search-card">
          <div className="clients-filter-row">
            <div className="clients-filter-item">
              <label>Rechercher:</label>
              <form className="clients-search" onSubmit={applySearch}>
                <input
                  type="text"
                  placeholder="Rechercher nom, email, téléphone..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                />
              </form>
            </div>
            <div className="clients-filter-item">
              <label>Entreprise:</label>
              <AppSelect value={filterCompany} onChange={setFilterCompany} options={companyFilterOptions} />
            </div>
            <div className="clients-filter-item">
              <label>Tri:</label>
              <AppSelect value={sortBy} onChange={setSortBy} options={sortOptions} />
            </div>
            <button
              className="clients-btn clients-btn--primary clients-filter-cta"
              type="button"
              onClick={() => {
                setPage(1);
                setSearch(searchInput.trim());
                pushToast("Filtres appliqués.", "success");
              }}
            >
              <i className="fa-solid fa-filter" /> Filtrer
            </button>
          </div>
        </section>

        <section className="clients-card">
          <div className="clients-topbar">
            <h2>Liste des clients</h2>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="clients-btn" type="button" onClick={() => setImportOpen(true)}>
                <i className="fa-solid fa-file-import" /> Import CSV
              </button>
              <button className="clients-btn clients-btn--accent" type="button" onClick={startCreate}>
                <i className="fa-solid fa-plus" /> Nouveau client
              </button>
            </div>
          </div>

          <div className="clients-table-wrap">
            <table className="clients-table">
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Contact</th>
                  <th>Entreprise</th>
                  <th>Adresse</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <TableSkeleton rows={8} columns={5} withActions actionColumnIndex={4} />
                ) : displayedClients.length === 0 ? (
                  <tr>
                    <td colSpan={5}>Aucun client trouvé.</td>
                  </tr>
                ) : (
                  displayedClients.map((client) => (
                    <tr key={client.id}>
                      <td>
                        <strong>{getClientDisplayName(client)}</strong>
                        {client.tax_id ? <div className="clients-mini">NIF: {client.tax_id}</div> : null}
                      </td>
                      <td>
                        {client.email || "—"}
                        <div className="clients-mini">{client.phone || "—"}</div>
                      </td>
                      <td>{client.company || "—"}</td>
                      <td>{client.address || "—"}</td>
                      <td>
                        <div className="clients-row-actions">
                          <button className="clients-row-btn" type="button" onClick={() => setViewTarget(client)} title="Voir">
                            <i className="fa-solid fa-eye" />
                          </button>
                          <button className="clients-row-btn" type="button" onClick={() => startEdit(client)} title="Modifier">
                            <i className="fa-solid fa-pen" />
                          </button>
                          <button
                            className="clients-row-btn clients-row-btn--warn"
                            type="button"
                            onClick={() => setDeleteTarget(client)}
                            disabled={deletingId === client.id}
                            title="Supprimer"
                          >
                            <i className={`fa-solid ${deletingId === client.id ? "fa-spinner fa-spin" : "fa-trash"}`} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="clients-pagination">
            <button
              className="clients-btn"
              type="button"
              disabled={meta.current_page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Précédent
            </button>
            <span className="clients-pagination-info">
              Page {meta.current_page} / {meta.last_page}
            </span>
            <button
              className="clients-btn"
              type="button"
              disabled={meta.current_page >= meta.last_page || loading}
              onClick={() => setPage((p) => Math.min(meta.last_page, p + 1))}
            >
              Suivant
            </button>
          </div>
        </section>
      </div>

      {modalOpen ? (
        <div className="clients-modal-backdrop" role="dialog" aria-modal="true" onClick={closeModal}>
          <section className="clients-modal" onClick={(e) => e.stopPropagation()}>
            <div className="clients-modal-head">
              <h2>{isEditing ? "Modifier un client" : "Ajouter un client"}</h2>
              <button className="clients-icon-btn" type="button" onClick={closeModal} aria-label="Fermer">
                <i className="fa-solid fa-xmark" />
              </button>
            </div>
            <p className="clients-sub">
              Les champs marqués <span className="clients-required">*</span> sont obligatoires.
            </p>
            <form className="clients-form" onSubmit={onSubmit}>
              <Field
                label="Prénom"
                name="first_name"
                value={form.first_name}
                onChange={onChangeField}
                placeholder="Ex: Amina"
                required
                pattern="^[A-Za-zÀ-ÖØ-öø-ÿ' -]+$"
                title="Lettres uniquement."
              />
              <Field
                label="Nom"
                name="last_name"
                value={form.last_name}
                onChange={onChangeField}
                placeholder="Ex: Traoré"
                required
                pattern="^[A-Za-zÀ-ÖØ-öø-ÿ' -]+$"
                title="Lettres uniquement."
              />
              <Field label="Email" name="email" value={form.email} onChange={onChangeField} type="email" placeholder="exemple@entreprise.com" required />
              <Field
                label="Téléphone"
                name="phone"
                value={form.phone}
                onChange={onChangeField}
                placeholder="+225 07 12 34 56 78"
                required
                pattern="^\\+?[0-9\\s().-]{8,20}$"
                title="Format téléphone invalide."
              />
              <Field label="Entreprise" name="company" value={form.company} onChange={onChangeField} placeholder="Ex: Nova Conseil" required />
              <Field label="Identifiant fiscal" name="tax_id" value={form.tax_id} onChange={onChangeField} placeholder="Ex: NIF-AB12345" />
              <Field label="Adresse" name="address" value={form.address} onChange={onChangeField} placeholder="Ex: Cocody, Abidjan" as="textarea" />
              <Field label="Notes" name="notes" value={form.notes} onChange={onChangeField} placeholder="Information utile sur le client..." as="textarea" />

              <FormActions
                onCancel={closeModal}
                submitLabel={isEditing ? "Mettre à jour" : "Ajouter"}
                saving={saving}
              />
            </form>
          </section>
        </div>
      ) : null}

      {confirmSubmitOpen ? (
        <div className="clients-modal-backdrop" role="dialog" aria-modal="true" onClick={() => setConfirmSubmitOpen(false)}>
          <section className="clients-modal" onClick={(e) => e.stopPropagation()}>
            <div className="clients-modal-head">
              <h2>Confirmer l'enregistrement</h2>
              <button className="clients-icon-btn" type="button" onClick={() => setConfirmSubmitOpen(false)} aria-label="Fermer">
                <i className="fa-solid fa-xmark" />
              </button>
            </div>
            <p className="clients-delete-text">
              Voulez-vous confirmer cette action ?
            </p>
            <div className="clients-actions">
              <button className="clients-btn clients-btn--primary" type="button" onClick={confirmSubmit} disabled={saving}>
                Confirmer
              </button>
              <button className="clients-btn clients-btn--soft-danger" type="button" onClick={() => setConfirmSubmitOpen(false)} disabled={saving}>
                Annuler
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {deleteTarget ? (
        <div className="clients-modal-backdrop" role="dialog" aria-modal="true" onClick={() => setDeleteTarget(null)}>
          <section className="clients-modal" onClick={(e) => e.stopPropagation()}>
            <div className="clients-modal-head">
              <h2>Supprimer un client</h2>
              <button className="clients-icon-btn" type="button" onClick={() => setDeleteTarget(null)} aria-label="Fermer">
                <i className="fa-solid fa-xmark" />
              </button>
            </div>
            <p className="clients-delete-text">
              Confirmer la suppression de <strong>{getClientDisplayName(deleteTarget)}</strong> ? Cette action est irreversible.
            </p>
            <div className="clients-actions">
              <button className="clients-btn clients-btn--primary" type="button" onClick={confirmDelete} disabled={deletingId !== null}>
                {deletingId ? "Suppression..." : "Confirmer"}
              </button>
              <button className="clients-btn clients-btn--soft-danger" type="button" onClick={() => setDeleteTarget(null)} disabled={deletingId !== null}>
                Annuler
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {viewTarget ? (
        <div className="clients-modal-backdrop" role="dialog" aria-modal="true" onClick={() => setViewTarget(null)}>
          <section className="clients-modal" onClick={(e) => e.stopPropagation()}>
            <div className="clients-modal-head">
              <h2>Détails client</h2>
              <button className="clients-icon-btn" type="button" onClick={() => setViewTarget(null)} aria-label="Fermer">
                <i className="fa-solid fa-xmark" />
              </button>
            </div>
            <ul className="clients-view-list">
              <li><strong>Prénom:</strong> {viewTarget.first_name || splitName(viewTarget.name).first_name || "—"}</li>
              <li><strong>Nom:</strong> {viewTarget.last_name || splitName(viewTarget.name).last_name || "—"}</li>
              <li><strong>Email:</strong> {viewTarget.email || "—"}</li>
              <li><strong>Téléphone:</strong> {viewTarget.phone || "—"}</li>
              <li><strong>Entreprise:</strong> {viewTarget.company || "—"}</li>
              <li><strong>Adresse:</strong> {viewTarget.address || "—"}</li>
              <li><strong>NIF:</strong> {viewTarget.tax_id || "—"}</li>
              <li><strong>Notes:</strong> {viewTarget.notes || "—"}</li>
            </ul>
            {clientDocs ? (
              <div style={{ marginTop: 14 }}>
                <h3 style={{ fontSize: 14, marginBottom: 8 }}>Historique</h3>
                <p className="clients-sub">
                  CA encaisse : {Number(clientDocs?.stats?.revenue_paid_cfa || 0).toLocaleString("fr-FR")} CFA
                </p>
                <p className="clients-sub">
                  <strong>Devis :</strong>{" "}
                  {(clientDocs?.quotes || []).map((q) => q.number).join(", ") || "—"}
                </p>
                <p className="clients-sub">
                  <strong>Factures :</strong>{" "}
                  {(clientDocs?.invoices || []).map((i) => i.number).join(", ") || "—"}
                </p>
              </div>
            ) : null}
          </section>
        </div>
      ) : null}

      {importOpen ? (
        <div className="clients-modal-backdrop" role="dialog" aria-modal="true" onClick={() => setImportOpen(false)}>
          <section className="clients-modal" onClick={(e) => e.stopPropagation()}>
            <div className="clients-modal-head">
              <h2>Importer des clients (CSV)</h2>
              <button className="clients-icon-btn" type="button" onClick={() => setImportOpen(false)} aria-label="Fermer">
                <i className="fa-solid fa-xmark" />
              </button>
            </div>
            <p className="clients-sub">En-tetes : prenom, nom, email, telephone, entreprise, adresse, siret, notes</p>
            <form onSubmit={submitImport}>
              <textarea
                className="clients-textarea"
                rows={8}
                value={importCsv}
                onChange={(e) => setImportCsv(e.target.value)}
                placeholder="prenom,nom,email..."
                required
              />
              <div className="clients-modal-actions">
                <button className="clients-btn clients-btn--primary" type="submit" disabled={importing}>
                  {importing ? "Import..." : "Importer"}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}

      {toasts.length ? (
        <div className="clients-toast-wrap" aria-live="polite">
          {toasts.map((toast) => (
            <div key={toast.id} className={`clients-toast clients-toast--${toast.type}`}>
              {toast.message}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function Field({ label, as = "input", ...props }) {
  return (
    <div className="clients-field">
      <label htmlFor={props.name}>
        {label}
        {props.required ? <span className="clients-required">*</span> : null}
      </label>
      {as === "textarea" ? <textarea id={props.name} {...props} /> : <input id={props.name} {...props} />}
    </div>
  );
}

function normalizeNullable(value) {
  const trimmed = String(value ?? "").trim();
  return trimmed === "" ? null : trimmed;
}

function extractApiMessage(error, fallback) {
  if (error?.body?.errors && typeof error.body.errors === "object") {
    const firstError = Object.values(error.body.errors)[0];
    if (Array.isArray(firstError) && firstError[0]) return String(firstError[0]);
  }
  if (error?.body?.message) return String(error.body.message);
  return error?.message || fallback;
}

function getClientDisplayName(client) {
  const first = String(client?.first_name || "").trim();
  const last = String(client?.last_name || "").trim();
  if (first || last) return `${first} ${last}`.trim();
  return String(client?.name || "—").trim() || "—";
}

function splitName(fullName) {
  const cleaned = String(fullName || "").trim().replace(/\s+/g, " ");
  if (!cleaned) return { first_name: "", last_name: "" };
  const [first_name, ...rest] = cleaned.split(" ");
  return { first_name, last_name: rest.join(" ") };
}

function toTitleCase(value) {
  const normalized = String(value || "").trim().replace(/\s+/g, " ");
  if (!normalized) return "";
  return normalized
    .toLowerCase()
    .replace(/(^|[\s'-])\p{L}/gu, (m) => m.toUpperCase());
}

function buildClientPayload(form) {
  const firstName = toTitleCase(form.first_name);
  const lastName = toTitleCase(form.last_name);
  return {
    first_name: firstName,
    last_name: lastName,
    name: `${firstName} ${lastName}`.trim(),
    email: String(form.email || "").trim().toLowerCase(),
    phone: String(form.phone || "").trim(),
    company: toTitleCase(form.company),
    address: normalizeNullable(form.address),
    tax_id: normalizeNullable(form.tax_id),
    notes: normalizeNullable(form.notes),
  };
}

function validateClientForm(form) {
  const firstName = String(form.first_name || "").trim();
  const lastName = String(form.last_name || "").trim();
  const email = String(form.email || "").trim();
  const phone = String(form.phone || "").trim();
  const company = String(form.company || "").trim();
  const taxId = String(form.tax_id || "").trim();

  if (!/^[A-Za-zÀ-ÖØ-öø-ÿ' -]{2,120}$/.test(firstName)) {
    return { valid: false, message: "Le prénom est invalide (lettres uniquement)." };
  }
  if (!/^[A-Za-zÀ-ÖØ-öø-ÿ' -]{2,120}$/.test(lastName)) {
    return { valid: false, message: "Le nom est invalide (lettres uniquement)." };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { valid: false, message: "Adresse e-mail invalide." };
  }
  if (!/^\+?[0-9\s().-]{8,20}$/.test(phone)) {
    return { valid: false, message: "Numéro de téléphone invalide." };
  }
  if (!/^[A-Za-zÀ-ÖØ-öø-ÿ0-9 '&().,-]{2,255}$/.test(company)) {
    return { valid: false, message: "Le nom de l'entreprise est invalide." };
  }
  if (taxId && !/^[A-Za-z0-9\-_/. ]{2,128}$/.test(taxId)) {
    return { valid: false, message: "Identifiant fiscal invalide." };
  }

  return { valid: true, message: "" };
}
