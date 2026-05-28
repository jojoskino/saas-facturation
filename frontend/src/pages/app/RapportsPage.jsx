import { Link } from "react-router-dom";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { apiDownload, getStoredToken } from "../../api/client";
import { useApiQuery } from "../../hooks/useApiQuery";
import { useAmountsPrivacy } from "../../hooks/useAmountsPrivacy";
import AmountsPrivacyToggle from "../../components/AmountsPrivacyToggle";
import ReportsSkeleton from "../../components/skeleton/ReportsSkeleton";
import { canAdvancedReports, canExportCsv } from "../../utils/planFeatures";

const PERIODS = [
  { value: "month", labelKey: "periodMonth" },
  { value: "quarter", labelKey: "periodQuarter" },
  { value: "year", labelKey: "periodYear" },
];

const INVOICE_STATUS_LABELS = {
  draft: "Brouillon",
  sent: "Envoyée",
  paid: "Payée",
  overdue: "En retard",
  cancelled: "Annulée",
};

const QUOTE_STATUS_LABELS = {
  draft: "Brouillon",
  sent: "Envoyé",
  accepted: "Accepté",
  rejected: "Refusé",
  expired: "Expiré",
};

export default function RapportsPage() {
  const { t } = useTranslation("reports");
  const [period, setPeriod] = useState("year");
  const { amountsVisible } = useAmountsPrivacy();
  const [exportError, setExportError] = useState("");

  const query = `/api/reports/summary?period=${period}`;
  const { data, error, loading } = useApiQuery(query, {
    enabled: Boolean(getStoredToken()),
  });

  const advanced = canAdvancedReports(data?.plan_features);
  const csvEnabled = canExportCsv(data?.plan_features);

  const monthlyTrend = useMemo(() => {
    const raw = data?.monthly_revenue_cfa;
    if (!Array.isArray(raw)) return [];
    return raw.map((item) => ({
      label: item?.label || "",
      value: Number(item?.total || 0),
    }));
  }, [data]);

  const chartYMax = Math.max(...monthlyTrend.map((p) => p.value), 1);
  const chartTicks = [1, 0.75, 0.5, 0.25, 0].map((r) => Math.round(chartYMax * r));
  const chartPoints = getLinePoints(monthlyTrend.map((p) => p.value), 580, 230, 48);

  const { bars: invoiceBarItems, max: invoiceBarMax } = buildStatusBars(
    data?.invoices_by_status,
    INVOICE_STATUS_LABELS,
    {
      draft: "#94a3b8",
      sent: "#2563eb",
      paid: "#16a34a",
      overdue: "#ef4444",
      cancelled: "#64748b",
    },
  );
  const { bars: quoteBarItems, max: quoteBarMax } = buildStatusBars(
    data?.quotes_by_status,
    QUOTE_STATUS_LABELS,
    {
      draft: "#94a3b8",
      sent: "#2563eb",
      accepted: "#16a34a",
      rejected: "#ef4444",
      expired: "#f59e0b",
    },
  );

  function shown(v) {
    return amountsVisible ? formatCfa(v) : "******";
  }

  async function handleExport() {
    setExportError("");
    if (!csvEnabled) {
      setExportError(t("exportLocked"));
      return;
    }
    const exportPeriod = period === "month" ? "month" : period === "quarter" ? "quarter" : "year";
    try {
      await apiDownload(`/api/dashboard/export?period=${exportPeriod}`, "rapport-revenus.csv", "text/csv");
    } catch (err) {
      setExportError(err?.body?.message || err?.message || "Export impossible.");
    }
  }

  const kpis = [
    {
      label: t("revenuePaid"),
      value: shown(data?.revenue_paid_cfa),
      trend: formatTrend(data?.revenue_paid_trend_pct),
      isMoney: true,
    },
    { label: t("outstanding"), value: shown(data?.outstanding_cfa), isMoney: true },
    { label: t("invoicesIssued"), value: String(data?.invoices_issued ?? 0), isMoney: false },
    { label: t("invoicesPaid"), value: String(data?.invoices_paid ?? 0), isMoney: false },
    { label: t("overdue"), value: String(data?.overdue_count ?? 0), isMoney: false },
    {
      label: t("conversion"),
      value: `${data?.conversion_rate_pct ?? 0}%`,
      sub: `${data?.quotes_accepted ?? 0} / ${data?.quotes_created ?? 0} devis`,
      isMoney: false,
    },
    {
      label: t("avgInvoice"),
      value: shown(data?.avg_invoice_cfa),
      isMoney: true,
    },
  ];

  const aging = data?.overdue_aging ?? { "0_30": 0, "31_60": 0, "61_plus": 0 };
  const agingMax = Math.max(aging["0_30"], aging["31_60"], aging["61_plus"], 1);

  if (loading && !data) {
    return <ReportsSkeleton />;
  }

  return (
    <div className="rpt app-list-page">
      <style>{`
        .rpt { color: var(--color-text); font-family: var(--sans); }
        .rpt-header { margin-bottom: 20px; }
        .rpt-header h1 {
          margin: 0 0 6px;
          font-family: var(--heading);
          font-size: 1.5rem;
          letter-spacing: -0.02em;
        }
        .rpt-header p { margin: 0; color: var(--color-text-muted); font-size: 14px; }
        .rpt-toolbar {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 10px;
          margin-bottom: 18px;
        }
        .rpt-period {
          display: inline-flex;
          border: 1px solid var(--color-border);
          border-radius: 10px;
          overflow: hidden;
          background: #fff;
        }
        .rpt-period button {
          border: none;
          background: transparent;
          padding: 8px 14px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          color: var(--color-text-muted);
        }
        .rpt-period button.active {
          background: #14213d;
          color: #fff;
        }
        .rpt-actions { margin-left: auto; display: flex; gap: 8px; flex-wrap: wrap; }
        .rpt-btn {
          border: 1px solid var(--color-border);
          background: #fff;
          border-radius: 10px;
          padding: 8px 14px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }
        .rpt-btn:hover { background: #f8fafc; }
        .rpt-btn--accent {
          background: #14213d;
          color: #fff;
          border-color: #14213d;
        }
        .rpt-btn--accent:hover { background: #0f1a2e; }
        .rpt-btn.is-locked { opacity: 0.55; cursor: not-allowed; }
        .rpt-banner {
          font-size: 13px;
          padding: 12px 14px;
          border-radius: 12px;
          border: 1px solid var(--color-border);
          margin-bottom: 16px;
          background: var(--color-surface);
        }
        .rpt-banner--warn { border-color: rgba(239,68,68,.35); color: #b91c1c; }
        .rpt-banner--pro {
          border-color: rgba(252,163,17,.35);
          background: rgba(252,163,17,.08);
        }
        .rpt-period-label {
          font-size: 12px;
          color: var(--color-text-muted);
          margin-bottom: 12px;
        }
        .rpt-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
          gap: 12px;
          margin-bottom: 18px;
        }
        .rpt-kpi {
          border-radius: 14px;
          padding: 14px;
          background: var(--glass-surface-strong);
          border: 1px solid var(--color-border);
          border-top: 3px solid #fca311;
        }
        .rpt-kpi label {
          display: block;
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--color-text-muted);
          margin-bottom: 6px;
        }
        .rpt-kpi strong { font-size: 1.15rem; font-family: var(--heading); }
        .rpt-kpi small { display: block; margin-top: 4px; font-size: 11px; color: var(--color-text-muted); }
        .rpt-kpi .rpt-trend { font-size: 11px; color: #16a34a; margin-top: 4px; display: block; }
        .rpt-panels {
          display: grid;
          grid-template-columns: 1.2fr 1fr;
          gap: 14px;
          margin-bottom: 14px;
        }
        .rpt-panel {
          border-radius: 14px;
          background: var(--glass-surface-strong);
          border: 1px solid var(--color-border);
          padding: 16px;
        }
        .rpt-panel h3 {
          margin: 0 0 12px;
          font-family: var(--heading);
          font-size: 1rem;
        }
        .rpt-chart-scroll {
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          margin: 0 -4px;
          padding-bottom: 4px;
        }
        .rpt-chart-scroll .rpt-line-svg {
          min-width: 560px;
        }
        .rpt-line-svg { width: 100%; height: auto; display: block; }
        .rpt-line { fill: none; stroke: #fca311; stroke-width: 2.5; }
        .rpt-axis-grid { stroke: #e2e8f0; stroke-width: 1; }
        .rpt-axis-label { font-size: 10px; fill: #64748b; }
        .rpt-bars-scroll {
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          margin-top: 4px;
        }
        .rpt-bars {
          display: flex;
          align-items: flex-end;
          gap: 10px;
          height: 160px;
          min-width: min(100%, 280px);
        }
        .rpt-bars--wide { min-width: 420px; }
        .rpt-bar-col { flex: 1; min-width: 52px; display: flex; flex-direction: column; align-items: center; gap: 6px; }
        .rpt-bar {
          width: 100%;
          max-width: 48px;
          border-radius: 6px 6px 0 0;
          min-height: 4px;
        }
        .rpt-bar-label { font-size: 10px; color: var(--color-text-muted); text-align: center; line-height: 1.25; }
        .rpt-pro-callout {
          font-size: 12px;
          line-height: 1.45;
          padding: 10px 12px;
          border-radius: 10px;
          border: 1px solid rgba(252, 163, 17, 0.35);
          background: rgba(252, 163, 17, 0.1);
          color: #14213d;
          margin-bottom: 12px;
        }
        .rpt-pro-callout a { font-weight: 700; color: #14213d; }
        .rpt-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .rpt-table th, .rpt-table td {
          padding: 10px 8px;
          border-bottom: 1px solid var(--color-border);
          text-align: left;
        }
        .rpt-table th {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: var(--color-text-muted);
        }
        .rpt-aging { display: flex; gap: 10px; margin-top: 8px; }
        .rpt-aging-item { flex: 1; text-align: center; }
        .rpt-aging-bar {
          height: 8px;
          border-radius: 4px;
          background: #fca311;
          margin: 8px 0 4px;
        }
        .rpt-locked {
          position: relative;
          min-height: 120px;
        }
        .rpt-locked::after {
          content: "";
          position: absolute;
          inset: 0;
          border-radius: 12px;
          background: rgba(255,255,255,.72);
          backdrop-filter: blur(3px);
          pointer-events: none;
        }
        .rpt-locked-msg {
          position: absolute;
          inset: 0;
          display: grid;
          place-items: center;
          z-index: 1;
          font-size: 13px;
          font-weight: 600;
          color: #14213d;
          text-align: center;
          padding: 16px;
          line-height: 1.45;
        }
        @media (max-width: 900px) {
          .rpt-panels { grid-template-columns: 1fr; }
        }
        @media (max-width: 768px) {
          .rpt-locked { min-height: 0; }
          .rpt-locked::after { display: none; }
          .rpt-locked-msg {
            position: static;
            display: block;
            margin-bottom: 10px;
            padding: 0;
          }
        }
      `}</style>

      <header className="rpt-header">
        <h1>{t("title")}</h1>
        <p>{t("subtitle")}</p>
      </header>

      <div className="rpt-toolbar">
        <div className="rpt-period" role="group" aria-label={t("period")}>
          {PERIODS.map((p) => (
            <button
              key={p.value}
              type="button"
              className={period === p.value ? "active" : ""}
              onClick={() => setPeriod(p.value)}
            >
              {t(p.labelKey)}
            </button>
          ))}
        </div>
        <div className="rpt-actions">
          <AmountsPrivacyToggle />
          <button
            type="button"
            className={`rpt-btn rpt-btn--accent${csvEnabled ? "" : " is-locked"}`}
            onClick={handleExport}
            title={csvEnabled ? t("exportCsv") : t("exportLocked")}
          >
            <i className="fa-solid fa-file-csv" aria-hidden />
            {t("exportCsv")}
          </button>
        </div>
      </div>

      {data?.period_label ? (
        <p className="rpt-period-label">
          {data.period_label} · {t("vsPrevious")}
        </p>
      ) : null}
      {error ? <div className="rpt-banner rpt-banner--warn">{error}</div> : null}
      {exportError ? <div className="rpt-banner rpt-banner--warn">{exportError}</div> : null}
      {!advanced ? (
        <div className="rpt-banner rpt-banner--pro">
          {t("proBanner")}{" "}
          <Link to="/app/abonnement?plan=pro&checkout=start" style={{ fontWeight: 700, color: "#14213d" }}>
            Passer à Pro →
          </Link>
        </div>
      ) : null}

      <div className="rpt-grid">
        {kpis.map((k) => (
          <div key={k.label} className="rpt-kpi">
            <label>{k.label}</label>
            <strong>{k.value}</strong>
            {k.sub ? <small>{k.sub}</small> : null}
            {k.trend ? <span className="rpt-trend">{k.trend}</span> : null}
          </div>
        ))}
      </div>

      <div className="rpt-panels">
        <section className="rpt-panel">
          <h3>{t("revenueChart")}</h3>
          {monthlyTrend.length === 0 ? (
            <p className="rpt-period-label">—</p>
          ) : (
            <div className="rpt-chart-scroll">
              <svg viewBox="0 0 620 250" className="rpt-line-svg" role="img" aria-label={t("revenueChart")}>
                {chartTicks.map((tick, idx) => {
                  const y = 20 + idx * 45;
                  return (
                    <g key={`tick-${tick}`}>
                      <line x1="46" y1={y} x2="590" y2={y} className="rpt-axis-grid" />
                      <text x="40" y={y + 4} textAnchor="end" className="rpt-axis-label">
                        {shortCfa(tick)}
                      </text>
                    </g>
                  );
                })}
                <polyline points={chartPoints} className="rpt-line" />
                {monthlyTrend.map((p, i) => {
                  const x = 48 + (i * (542 / Math.max(monthlyTrend.length - 1, 1)));
                  const y = 230 - (p.value / chartYMax) * 200;
                  return (
                    <g key={p.label}>
                      <circle cx={x} cy={y} r="4" fill="#fca311" />
                      <text x={x} y={248} textAnchor="middle" className="rpt-axis-label">
                        {p.label}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          )}
        </section>

        <section className="rpt-panel">
          <h3>{t("invoicesByStatus")}</h3>
          <div className="rpt-bars-scroll">
          <div className={`rpt-bars${invoiceBarItems.length > 4 ? " rpt-bars--wide" : ""}`}>
            {invoiceBarItems.map((b) => (
              <div key={b.key} className="rpt-bar-col">
                <div
                  className="rpt-bar"
                  style={{
                    height: `${Math.max(8, (b.value / invoiceBarMax) * 140)}px`,
                    background: b.color,
                  }}
                  title={`${b.label}: ${b.value}`}
                />
                <span className="rpt-bar-label">{b.label}</span>
              </div>
            ))}
          </div>
          </div>
        </section>
      </div>

      <div className="rpt-panels">
        <section className="rpt-panel">
          <h3>{t("quotesByStatus")}</h3>
          <div className="rpt-bars-scroll">
          <div className={`rpt-bars${quoteBarItems.length > 4 ? " rpt-bars--wide" : ""}`}>
            {quoteBarItems.map((b) => (
              <div key={b.key} className="rpt-bar-col">
                <div
                  className="rpt-bar"
                  style={{
                    height: `${Math.max(8, (b.value / quoteBarMax) * 140)}px`,
                    background: b.color,
                  }}
                />
                <span className="rpt-bar-label">{b.label}</span>
              </div>
            ))}
          </div>
          </div>
        </section>

        <section className="rpt-panel">
          <h3>{t("aging")}</h3>
          <div className={`rpt-aging${advanced ? "" : " rpt-locked"}`}>
            {!advanced ? (
              <div className="rpt-locked-msg">
                {t("proBanner")}{" "}
                <Link to="/app/abonnement?plan=pro&checkout=start">Pro →</Link>
              </div>
            ) : null}
            {[
              { key: "0_30", label: t("aging0_30") },
              { key: "31_60", label: t("aging31_60") },
              { key: "61_plus", label: t("aging61") },
            ].map((item) => (
              <div key={item.key} className="rpt-aging-item">
                <strong>{aging[item.key] ?? 0}</strong>
                <div
                  className="rpt-aging-bar"
                  style={{ width: `${((aging[item.key] ?? 0) / agingMax) * 100}%`, margin: "8px auto 4px" }}
                />
                <span className="rpt-bar-label">{item.label}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="rpt-panels">
        <section className={`rpt-panel${advanced ? "" : " rpt-locked"}`}>
          {!advanced ? (
            <div className="rpt-pro-callout rpt-locked-msg">
              {t("proBanner")}{" "}
              <Link to="/app/abonnement?plan=pro&checkout=start">Passer à Pro →</Link>
            </div>
          ) : null}
          <h3>{t("topClients")}</h3>
          <div className="app-list-table-wrap rpt-table-wrap">
            <table className="rpt-table">
              <thead>
                <tr>
                  <th>{t("colClient")}</th>
                  <th>{t("colRevenue")}</th>
                  <th>{t("colInvoices")}</th>
                </tr>
              </thead>
              <tbody>
                {(data?.top_clients ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={3}>{t("emptyTopClients")}</td>
                  </tr>
                ) : (
                  data.top_clients.map((row) => (
                    <tr key={row.client_id}>
                      <td>{row.name}</td>
                      <td>{shown(row.revenue_cfa)}</td>
                      <td>{row.invoices_count}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="app-list-cards">
            {(data?.top_clients ?? []).length === 0 ? (
              <div className="app-list-card-item app-list-card-item--empty">{t("emptyTopClients")}</div>
            ) : (
              data.top_clients.map((row) => (
                <article key={row.client_id} className="app-list-card-item">
                  <div className="app-list-card-item__head">
                    <div className="app-list-card-item__ref">{row.name}</div>
                    <div className="app-list-card-item__amount">{shown(row.revenue_cfa)}</div>
                  </div>
                  <div className="app-list-card-item__row">
                    <span className="app-list-card-item__label">{t("colInvoices")}</span>
                    <span>{row.invoices_count}</span>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>

        <section className="rpt-panel">
          <h3>{t("overdueList")}</h3>
          <div className="app-list-table-wrap rpt-table-wrap">
            <table className="rpt-table">
              <thead>
                <tr>
                  <th>{t("colReference")}</th>
                  <th>{t("colClient")}</th>
                  <th>{t("colDue")}</th>
                  <th>{t("colDays")}</th>
                  <th>{t("colAmount")}</th>
                </tr>
              </thead>
              <tbody>
                {(data?.overdue_invoices ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={5}>{t("emptyOverdue")}</td>
                  </tr>
                ) : (
                  data.overdue_invoices.map((row) => (
                    <tr key={row.id}>
                      <td>{row.number}</td>
                      <td>{row.client_name}</td>
                      <td>{formatDate(row.due_date)}</td>
                      <td>{row.days_overdue}</td>
                      <td>{shown(row.total)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="app-list-cards">
            {(data?.overdue_invoices ?? []).length === 0 ? (
              <div className="app-list-card-item app-list-card-item--empty">{t("emptyOverdue")}</div>
            ) : (
              data.overdue_invoices.map((row) => (
                <article key={row.id} className="app-list-card-item">
                  <div className="app-list-card-item__head">
                    <div>
                      <div className="app-list-card-item__ref">{row.number}</div>
                      <div className="app-list-card-item__sub">{row.client_name || "—"}</div>
                    </div>
                    <div className="app-list-card-item__amount">{shown(row.total)}</div>
                  </div>
                  <div className="app-list-card-item__row">
                    <span className="app-list-card-item__label">{t("colDue")}</span>
                    <span>{formatDate(row.due_date)}</span>
                  </div>
                  <div className="app-list-card-item__row">
                    <span className="app-list-card-item__label">{t("colDays")}</span>
                    <span>{row.days_overdue} j</span>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function buildStatusBars(byStatus, labels, colors) {
  const bars = Object.entries(byStatus || {}).map(([key, count]) => ({
    key,
    label: labels[key] || key,
    value: Number(count),
    color: colors[key] || "#94a3b8",
  }));
  const max = Math.max(...bars.map((b) => b.value), 1);
  return { bars, max };
}

function formatCfa(n) {
  if (n == null || Number.isNaN(Number(n))) return "—";
  return `${Math.round(Number(n)).toLocaleString("fr-FR")} F CFA`;
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("fr-FR");
}

function formatTrend(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return "";
  const sign = num > 0 ? "+" : "";
  return `${sign}${num.toFixed(1)}%`;
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
      const y = maxY - (value / max) * (maxY - minY);
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
}
