import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch, getStoredToken } from "../api/client";

const mockQuotes = [
  { id: "D-1042", client: "Nova Conseil", amount: "2 400 000 F CFA", status: "Envoyé" },
  { id: "D-1041", client: "Atelier Pixel", amount: "890 000 F CFA", status: "Brouillon" },
  { id: "D-1040", client: "Lyra Studio", amount: "1 120 000 F CFA", status: "Accepté" },
];

const mockInvoices = [
  { id: "F-2208", client: "Hexa Log", amount: "450 000 F CFA", due: "12 mai 2026", status: "Payée" },
  { id: "F-2207", client: "Minta Retail", amount: "310 000 F CFA", due: "18 mai 2026", status: "En attente" },
  { id: "F-2206", client: "Alted SaaS", amount: "1 050 000 F CFA", due: "03 mai 2026", status: "En retard" },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState(() => {
    try {
      const cached = sessionStorage.getItem("facturo_dashboard_summary");
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [summaryError, setSummaryError] = useState("");
  const [amountsVisible, setAmountsVisible] = useState(localStorage.getItem("facturo_amounts_visible") === "1");
  const [unlockOpen, setUnlockOpen] = useState(false);
  const [unlockingFor, setUnlockingFor] = useState("");
  const [codeInput, setCodeInput] = useState("");
  const [codeError, setCodeError] = useState("");

  useEffect(() => {
    if (!getStoredToken()) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await apiFetch("/api/dashboard/summary");
        if (!cancelled) {
          setSummary(data);
          sessionStorage.setItem("facturo_dashboard_summary", JSON.stringify(data));
          setSummaryError("");
        }
      } catch {
        if (!cancelled) {
          setSummary(null);
          setSummaryError(
            "Synthèse API indisponible (vérifiez le backend). Données d'exemple affichées à côté."
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const clientsCount = Number(summary?.clients_count ?? 24);
  const revenuePaid = Number(summary?.revenue_paid_cfa ?? 18400000);
  const outstanding = Number(summary?.outstanding_cfa ?? 1410000);
  const quotesByStatus = summary?.quotes_by_status ?? { draft: 2, sent: 4, accepted: 6, rejected: 1 };
  const invoicesByStatus = summary?.invoices_by_status ?? { draft: 1, sent: 3, overdue: 1, paid: 8 };

  const totalInvoices = sumObject(invoicesByStatus);
  const paidInvoices = Number(invoicesByStatus?.paid ?? 0);
  const overdueInvoices = Number(invoicesByStatus?.overdue ?? 0);
  const quoteTotal = sumObject(quotesByStatus);
  const recoveryRate = revenuePaid + outstanding > 0 ? Math.round((revenuePaid / (revenuePaid + outstanding)) * 100) : 0;
  const avgInvoice = paidInvoices > 0 ? Math.round(revenuePaid / paidInvoices) : 0;

  function shown(v) {
    return amountsVisible ? formatCfa(v) : "******";
  }

  const kpis = [
    { label: "Chiffre d'affaires encaissé", value: shown(revenuePaid), trend: "+12.4%", tone: "up", isMoney: true },
    { label: "Encours clients", value: shown(outstanding), trend: "-4.1%", tone: "down", isMoney: true },
    { label: "Taux de recouvrement", value: `${recoveryRate}%`, trend: "+1.8%", tone: "up", isMoney: false },
    { label: "Facture moyenne payée", value: avgInvoice > 0 ? shown(avgInvoice) : "—", trend: "+3.2%", tone: "up", isMoney: true },
    { label: "Clients actifs", value: String(clientsCount), trend: "+6.0%", tone: "up" },
    { label: "Factures en retard", value: String(overdueInvoices), trend: "-2.6%", tone: "down" },
  ];

  const monthlyTrendRaw = summary?.monthly_revenue_cfa;
  const monthlyTrend = Array.isArray(monthlyTrendRaw) && monthlyTrendRaw.length > 0
    ? monthlyTrendRaw.map((item) => ({
        label: item?.label || "",
        value: Number(item?.total || 0),
      }))
    : [
        { label: "Jan", value: 9800000 },
        { label: "Fév", value: 11300000 },
        { label: "Mar", value: 12600000 },
        { label: "Avr", value: 15100000 },
        { label: "Mai", value: 16700000 },
        { label: "Jun", value: 18400000 },
      ];

  const chartYMax = Math.max(...monthlyTrend.map((p) => p.value), 1);
  const chartTicks = [1, 0.75, 0.5, 0.25, 0].map((r) => Math.round(chartYMax * r));
  const chartPoints = getLinePoints(monthlyTrend.map((p) => p.value), 580, 230, 48);

  const quoteBars = [
    { key: "draft", label: "Brouillons", value: Number(quotesByStatus?.draft ?? 0), color: "#94a3b8" },
    { key: "sent", label: "Envoyés", value: Number(quotesByStatus?.sent ?? 0), color: "#2563eb" },
    { key: "accepted", label: "Acceptés", value: Number(quotesByStatus?.accepted ?? 0), color: "#16a34a" },
    { key: "rejected", label: "Refusés", value: Number(quotesByStatus?.rejected ?? 0), color: "#ef4444" },
  ];
  const quoteMax = Math.max(...quoteBars.map((b) => b.value), 1);

  function requestUnlock() {
    const existingCode = localStorage.getItem("facturo_money_code");
    const typed = codeInput.trim();
    if (!typed) {
      setCodeError("Veuillez saisir votre code.");
      return;
    }
    if (!existingCode) {
      localStorage.setItem("facturo_money_code", typed);
      localStorage.setItem("facturo_amounts_visible", "1");
      setAmountsVisible(true);
      setCodeInput("");
      setCodeError("");
      return;
    }
    if (typed !== existingCode) {
      setCodeError("Code incorrect.");
      return;
    }
    localStorage.setItem("facturo_amounts_visible", "1");
    setAmountsVisible(true);
    setCodeInput("");
    setCodeError("");
    setUnlockOpen(false);
  }

  function hideAmounts() {
    localStorage.removeItem("facturo_amounts_visible");
    setAmountsVisible(false);
  }

  function openUnlock(label) {
    if (amountsVisible) {
      hideAmounts();
      return;
    }
    setUnlockingFor(label);
    setCodeInput("");
    setCodeError("");
    setUnlockOpen(true);
  }

  return (
    <div className="dash">
      <style>{`
        .dash { color: var(--color-text); font-family: var(--sans); }
        .dash-banner {
          font-size: 13px;
          color: var(--color-text-muted);
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: 12px;
          padding: 12px 14px;
          margin-bottom: 20px;
        }
        .dash-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
          margin-bottom: 16px;
        }
        .dash-kpi {
          border-radius: 14px;
          padding: 16px;
          background: #fff;
          border: 1px solid var(--color-border);
          border-top: 3px solid #fca311;
          box-shadow: 0 8px 18px rgba(252, 163, 17, 0.08);
        }
        .dash-kpi label {
          display: block;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--color-text-muted);
          margin-bottom: 8px;
        }
        .dash-kpi strong {
          font-family: var(--heading);
          font-size: 1.3rem;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          letter-spacing: -0.02em;
          color: #14213d;
          margin-bottom: 4px;
        }
        .dash-kpi-foot {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .dash-trend {
          font-size: 12px;
          font-weight: 700;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          color: #475569;
        }
        .dash-eye-btn {
          width: 18px;
          height: 18px;
          border: 0;
          background: transparent;
          color: #64748b;
          cursor: pointer;
          border-radius: 4px;
          font-size: 11px;
          padding: 0;
        }
        .dash-eye-btn:hover { background: #f1f5f9; color: #0f172a; }
        .dash-layout {
          display: grid;
          gap: 18px;
          grid-template-columns: 1.2fr 1fr;
          margin-bottom: 14px;
        }
        .dash-chart {
          border-radius: 14px;
          background: #fff;
          border: 1px solid var(--color-border);
          padding: 18px;
        }
        .dash-chart-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 14px;
        }
        .dash-chart-head h3 {
          margin: 0;
          font-family: var(--heading);
          font-size: 1.05rem;
        }
        .dash-line-wrap {
          border-radius: 12px;
          border: 1px solid #e7edf6;
          background: #fcfdff;
          padding: 10px 10px 6px;
        }
        .dash-line-svg {
          width: 100%;
          height: 250px;
          display: block;
        }
        .dash-axis-label {
          font-size: 11px;
          fill: #7a889f;
          font-weight: 600;
        }
        .dash-axis-grid {
          stroke: #e8eef7;
          stroke-width: 1;
        }
        .dash-line {
          fill: none;
          stroke: #1d4ed8;
          stroke-width: 3;
          stroke-linecap: round;
          stroke-linejoin: round;
        }
        .dash-dot {
          fill: #1d4ed8;
          stroke: #fff;
          stroke-width: 2;
        }
        .dash-chart-bars {
          display: grid;
          grid-template-columns: repeat(6, minmax(0, 1fr));
          gap: 10px;
          align-items: end;
          height: 170px;
          padding-top: 10px;
        }
        .dash-bar-col {
          display: grid;
          align-items: end;
          gap: 8px;
          height: 100%;
        }
        .dash-bar {
          border-radius: 8px 8px 4px 4px;
          background: linear-gradient(180deg, #4c7eff 0%, #1e40af 100%);
          min-height: 6px;
        }
        .dash-bar-col span {
          text-align: center;
          font-size: 11px;
          color: var(--color-text-muted);
          font-weight: 600;
        }
        .dash-metrics {
          border-radius: 14px;
          background: #fff;
          border: 1px solid var(--color-border);
          padding: 18px;
          display: grid;
          gap: 12px;
        }
        .dash-metric-row {
          border-radius: 10px;
          border: 1px solid #e8edf5;
          background: #fafcff;
          padding: 12px;
        }
        .dash-metric-row small {
          display: block;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          font-size: 10px;
          color: var(--color-text-muted);
          font-weight: 700;
          margin-bottom: 6px;
        }
        .dash-metric-row strong {
          display: block;
          font-family: var(--heading);
          font-size: 1.15rem;
        }
        .dash-bars-list { display: grid; gap: 10px; margin-top: 4px; }
        .dash-bar-item { display: grid; gap: 5px; }
        .dash-bar-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 12px;
          color: var(--color-text-muted);
        }
        .dash-track {
          width: 100%;
          height: 8px;
          border-radius: 999px;
          background: #edf2f8;
          overflow: hidden;
        }
        .dash-fill {
          height: 100%;
          border-radius: 999px;
        }
        .dash-quick-panel {
          border-radius: 14px;
          background: #fff;
          border: 1px solid var(--color-border);
          padding: 14px;
          margin-bottom: 16px;
        }
        .dash-quick-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 10px;
          color: var(--color-text);
        }
        .dash-quick-head h3 {
          margin: 0;
          font-family: var(--heading);
          font-size: 1rem;
          color: #14213d;
        }
        .dash-quick-head span {
          display: inline;
          color: var(--color-text-muted);
          font-size: 12px;
        }
        .dash-panels {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 18px;
        }
        .dash-panel {
          border-radius: 14px;
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          padding: 20px;
        }
        .dash-panel h2 {
          font-family: var(--heading);
          font-size: 1.1rem;
          margin: 0 0 14px;
          letter-spacing: -0.02em;
        }
        .dash-table { width: 100%; border-collapse: collapse; font-size: 14px; }
        .dash-table th {
          text-align: left;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: var(--color-text-muted);
          padding: 8px 0;
          border-bottom: 1px solid var(--color-border);
        }
        .dash-table td { padding: 12px 0; border-bottom: 1px solid var(--color-border); }
        .dash-pill {
          display: inline-block;
          font-size: 11px;
          font-weight: 700;
          padding: 4px 8px;
          border-radius: 999px;
          border: 1px solid transparent;
          color: var(--color-text);
        }
        .dash-quick {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 0;
        }
        .dash-quick button {
          border-radius: 9px;
          border: 1px solid var(--color-border);
          background: #f8fafc;
          color: #14213d;
          padding: 8px 11px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 7px;
          transition: transform 0.18s ease, background 0.18s ease, border-color 0.18s ease;
        }
        .dash-quick button:hover {
          background: #fff;
          border-color: #cfd8e6;
          transform: translateY(-1px);
        }
        .dash-see-all {
          border: 0;
          background: transparent;
          color: #fca311;
          font-weight: 700;
          font-size: 14px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 5px;
        }
        .dash-unlock-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(20, 33, 61, 0.35);
          z-index: 90;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 18px;
        }
        .dash-unlock-modal {
          width: min(360px, 100%);
          border-radius: 12px;
          background: #fff;
          border: 1px solid var(--color-border);
          box-shadow: var(--shadow-soft);
          padding: 14px;
          display: grid;
          gap: 10px;
        }
        .dash-unlock-modal h3 {
          margin: 0;
          font-size: 1rem;
          font-family: var(--heading);
        }
        .dash-unlock-modal input {
          border-radius: 8px;
          border: 1px solid var(--color-border-strong);
          height: 38px;
          padding: 0 10px;
        }
        .dash-unlock-actions {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
        }
        .dash-unlock-btn {
          border: 1px solid var(--color-border-strong);
          border-radius: 8px;
          padding: 8px 10px;
          background: #fff;
          cursor: pointer;
          font-weight: 700;
          font-size: 12px;
        }
        .dash-unlock-btn--primary {
          background: var(--color-primary);
          border-color: var(--color-primary);
          color: #fff;
        }
        .dash-panel--quotes,
        .dash-panel--invoices { border-top: 0; }
        .dash-panel--quotes h2,
        .dash-panel--invoices h2 { color: var(--color-text); }
        @media (max-width: 1000px) {
          .dash-grid { grid-template-columns: 1fr 1fr; }
          .dash-layout { grid-template-columns: 1fr; }
          .dash-panels { grid-template-columns: 1fr; }
        }
        @media (max-width: 520px) {
          .dash-grid { grid-template-columns: 1fr; }
          .dash-line-svg { height: 220px; }
          .dash-chart-bars { height: 170px; gap: 8px; }
        }
      `}</style>

      {summaryError ? <div className="dash-banner">{summaryError}</div> : null}

      <div className="dash-grid">
        {kpis.map((k) => (
          <div key={k.label} className="dash-kpi">
            <label>{k.label}</label>
            <strong>
              {k.value}
              {k.isMoney ? (
                k.value.includes("*") ? (
                <button type="button" className="dash-eye-btn" onClick={() => openUnlock(k.label)} aria-label="Afficher le montant">
                  <i className="fa-regular fa-eye" />
                </button>
              ) : (
                <button type="button" className="dash-eye-btn" onClick={() => openUnlock(k.label)} aria-label="Cacher le montant">
                  <i className="fa-regular fa-eye-slash" />
                </button>
                )
              ) : null}
            </strong>
            <div className="dash-kpi-foot">
              <span className={`dash-trend ${k.tone}`}>
                <i className={`fa-solid ${k.tone === "up" ? "fa-arrow-trend-up" : "fa-arrow-trend-down"}`} />
                {k.trend}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="dash-layout">
        <section className="dash-chart">
          <div className="dash-chart-head">
            <h3>Évolution du chiffre d'affaires encaissé</h3>
            <strong>{shown(revenuePaid)}</strong>
          </div>
          <div className="dash-line-wrap">
            <svg viewBox="0 0 620 250" className="dash-line-svg" role="img" aria-label="Courbe du chiffre d'affaires mensuel">
              {chartTicks.map((tick, idx) => {
                const y = 20 + idx * 45;
                return (
                  <g key={`tick-${tick}-${idx}`}>
                    <line x1="46" y1={y} x2="590" y2={y} className="dash-axis-grid" />
                    <text x="40" y={y + 4} textAnchor="end" className="dash-axis-label">
                      {shortCfa(tick)}
                    </text>
                  </g>
                );
              })}

              <polyline points={chartPoints} className="dash-line" />
              {chartPoints
                .split(" ")
                .filter(Boolean)
                .map((pt, idx) => {
                  const [x, y] = pt.split(",").map(Number);
                  return <circle key={`dot-${idx}`} cx={x} cy={y} r="4.5" className="dash-dot" />;
                })}

              {monthlyTrend.map((point, idx) => {
                const x = 48 + (idx * (580 - 48)) / Math.max(monthlyTrend.length - 1, 1);
                return (
                  <text key={`month-${point.label}-${idx}`} x={x} y="242" textAnchor="middle" className="dash-axis-label">
                    {point.label}
                  </text>
                );
              })}
            </svg>
          </div>
        </section>

        <section className="dash-metrics">
          <div className="dash-metric-row">
            <small>Trésorerie encaissée</small>
            <strong>{shown(revenuePaid)}</strong>
          </div>
          <div className="dash-metric-row">
            <small>Encours clients</small>
            <strong>{shown(outstanding)}</strong>
          </div>
          <div className="dash-metric-row">
            <small>Répartition des devis</small>
            <div className="dash-bars-list">
              {quoteBars.map((bar) => (
                <div className="dash-bar-item" key={bar.key}>
                  <div className="dash-bar-top">
                    <span>{bar.label}</span>
                    <b>{bar.value}</b>
                  </div>
                  <div className="dash-track">
                    <div className="dash-fill" style={{ width: `${quoteMax > 0 ? (bar.value / quoteMax) * 100 : 0}%`, background: bar.color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      <section className="dash-quick-panel">
        <div className="dash-quick-head">
          <h3>Actions rapides</h3>
          <span>Accélérez votre cycle commercial</span>
        </div>
        <div className="dash-quick">
          <button type="button" onClick={() => navigate("/app/clients")}><i className="fa-solid fa-user-plus" /> Nouveau client</button>
          <button type="button" onClick={() => navigate("/app/devis")}><i className="fa-solid fa-file-signature" /> Nouveau devis</button>
          <button type="button" onClick={() => navigate("/app/factures")}><i className="fa-solid fa-file-invoice-dollar" /> Nouvelle facture</button>
          <button type="button" onClick={() => navigate("/app/devis")}><i className="fa-solid fa-chart-line" /> Voir les rapports</button>
        </div>
      </section>

      <div className="dash-panels">
        <section className="dash-panel dash-panel--quotes">
          <div className="dash-chart-head">
            <h2>Devis récents (démonstration)</h2>
            <button type="button" className="dash-see-all" onClick={() => navigate("/app/devis")}>voir tout <i className="fa-solid fa-arrow-right-long" /></button>
          </div>
          <table className="dash-table">
            <thead>
              <tr>
                <th>Réf.</th>
                <th>Client</th>
                <th>Montant</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {mockQuotes.map((row) => (
                <tr key={row.id}>
                  <td>{row.id}</td>
                  <td>{row.client}</td>
                  <td>{amountsVisible ? row.amount : "******"}</td>
                  <td>
                    <span className="dash-pill" style={getStatusStyle(row.status, "quote")}>{row.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="dash-panel dash-panel--invoices">
          <div className="dash-chart-head">
            <h2>Factures (démonstration)</h2>
            <button type="button" className="dash-see-all" onClick={() => navigate("/app/factures")}>voir tout <i className="fa-solid fa-arrow-right-long" /></button>
          </div>
          <table className="dash-table">
            <thead>
              <tr>
                <th>Réf.</th>
                <th>Client</th>
                <th>Échéance</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {mockInvoices.map((row) => (
                <tr key={row.id}>
                  <td>{row.id}</td>
                  <td>{row.client}</td>
                  <td>{row.due}</td>
                  <td>
                    <span className="dash-pill" style={getStatusStyle(row.status, "invoice")}>{row.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>

      {unlockOpen ? (
        <div className="dash-unlock-backdrop" role="dialog" aria-modal="true" onClick={() => setUnlockOpen(false)}>
          <div className="dash-unlock-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Afficher le montant</h3>
            <small>{unlockingFor}</small>
            <input
              type="password"
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value)}
              placeholder="Mot de passe"
              autoFocus
            />
            {codeError ? <small style={{ color: "#b91c1c" }}>{codeError}</small> : null}
            <div className="dash-unlock-actions">
              <button className="dash-unlock-btn" type="button" onClick={() => setUnlockOpen(false)}>Annuler</button>
              <button className="dash-unlock-btn dash-unlock-btn--primary" type="button" onClick={requestUnlock}>Valider</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function formatCfa(n) {
  if (n == null || Number.isNaN(Number(n))) return "—";
  const rounded = Math.round(Number(n));
  return `${rounded.toLocaleString("fr-FR")} F CFA`;
}

function sumObject(obj) {
  if (!obj || typeof obj !== "object") return 0;
  return Object.values(obj).reduce((a, b) => a + Number(b), 0);
}

function shortCfa(n) {
  if (!Number.isFinite(n)) return "0";
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${Math.round(n / 1000)}k`;
  return String(Math.round(n));
}

function getLinePoints(values, width, height, padding) {
  const max = Math.max(...values, 1);
  const minX = padding;
  const maxX = width;
  const minY = 20;
  const maxY = height;

  return values
    .map((value, index) => {
      const x = minX + (index * (maxX - minX)) / Math.max(values.length - 1, 1);
      const y = maxY - ((value / max) * (maxY - minY));
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
}

function getStatusStyle(status, type) {
  const value = String(status || "").toLowerCase();
  if (type === "quote") {
    if (value.includes("brouillon")) return { background: "#f3f4f6", borderColor: "#d1d5db", color: "#4b5563" };
    if (value.includes("envoy")) return { background: "#e8f1ff", borderColor: "#bfdbfe", color: "#1d4ed8" };
    if (value.includes("accept")) return { background: "#e9fbe8", borderColor: "#bbf7d0", color: "#15803d" };
    if (value.includes("refus")) return { background: "#fff1f1", borderColor: "#fecaca", color: "#b91c1c" };
  }
  if (type === "invoice") {
    if (value.includes("pay")) return { background: "#e9fbe8", borderColor: "#bbf7d0", color: "#15803d" };
    if (value.includes("attente")) return { background: "#fff8e8", borderColor: "#fde68a", color: "#b45309" };
    if (value.includes("retard")) return { background: "#fff1f1", borderColor: "#fecaca", color: "#b91c1c" };
  }
  return { background: "#f3f4f6", borderColor: "#d1d5db", color: "#4b5563" };
}
