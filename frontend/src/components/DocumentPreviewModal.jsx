import { useEffect, useState } from "react";
import { apiDownload, apiFetchHtml } from "../api/client";
import ModalPortal from "./ModalPortal";
import Skeleton from "./skeleton/Skeleton";

export default function DocumentPreviewModal({
  open,
  onClose,
  previewPath,
  pdfPath,
  filename,
  title,
  subtitle = "Vérifiez le rendu avant l'export PDF.",
  downloadLabel = "Télécharger le PDF",
}) {
  const [html, setHtml] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!open) {
      setHtml("");
      setError("");
      setLoading(false);
      return;
    }

    if (!previewPath) {
      setHtml("");
      setError("Document introuvable ou identifiant manquant.");
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      setHtml("");
      try {
        const content = await apiFetchHtml(previewPath);
        if (!cancelled) setHtml(content);
      } catch (err) {
        if (!cancelled) {
          setHtml("");
          setError(err?.message || "Impossible de charger l'aperçu.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, previewPath]);

  if (!open) return null;

  const hasContent = Boolean(html?.trim());
  const showEmpty = !loading && !hasContent && !error;

  async function handleDownload() {
    if (!pdfPath) return;
    setDownloading(true);
    setError("");
    try {
      await apiDownload(pdfPath, filename);
    } catch (err) {
      setError(err?.message || "Téléchargement impossible.");
    } finally {
      setDownloading(false);
    }
  }

  async function retryPreview() {
    if (!previewPath) return;
    setLoading(true);
    setError("");
    setHtml("");
    try {
      const content = await apiFetchHtml(previewPath);
      setHtml(content);
    } catch (err) {
      setHtml("");
      setError(err?.message || "Impossible de charger l'aperçu.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ModalPortal>
    <div className="doc-preview-backdrop" role="dialog" aria-modal="true" onClick={onClose}>
      <section className="doc-preview-panel" onClick={(e) => e.stopPropagation()}>
        <header className="doc-preview-head">
          <div>
            <h2>{title || "Aperçu du document"}</h2>
            <p>{subtitle}</p>
          </div>
          <button type="button" className="doc-preview-close" onClick={onClose} aria-label="Fermer">
            <i className="fa-solid fa-xmark" />
          </button>
        </header>

        {error ? <div className="doc-preview-error">{error}</div> : null}

        <div className="doc-preview-body">
          {loading ? (
            <div className="doc-preview-skeleton" aria-busy="true">
              <Skeleton width="35%" height={18} block />
              <Skeleton width="100%" height={14} block style={{ marginTop: 14 }} />
              <Skeleton width="92%" height={14} block style={{ marginTop: 8 }} />
              <Skeleton width="88%" height={14} block style={{ marginTop: 8 }} />
              <Skeleton width="100%" height={120} block style={{ marginTop: 20, borderRadius: 10 }} />
              <Skeleton width="100%" height={80} block style={{ marginTop: 12, borderRadius: 10 }} />
            </div>
          ) : showEmpty ? (
            <div className="doc-preview-empty">
              <i className="fa-solid fa-file-circle-xmark" aria-hidden />
              <p>{error || "Aperçu indisponible. Vérifiez que le backend est démarré."}</p>
              {previewPath ? (
                <button type="button" className="doc-preview-btn doc-preview-btn--ghost" onClick={retryPreview}>
                  Réessayer l&apos;aperçu
                </button>
              ) : null}
            </div>
          ) : (
            <div
              key={previewPath}
              className="doc-preview-html"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          )}
        </div>

        <footer className="doc-preview-foot">
          <button type="button" className="doc-preview-btn doc-preview-btn--ghost" onClick={onClose}>
            Fermer
          </button>
          <button
            type="button"
            className="doc-preview-btn doc-preview-btn--primary"
            onClick={handleDownload}
            disabled={loading || downloading || !pdfPath}
          >
            <i className="fa-solid fa-file-pdf" /> {downloading ? "Export…" : downloadLabel}
          </button>
        </footer>
      </section>

      <style>{`
        .doc-preview-backdrop {
          position: fixed;
          inset: 0;
          z-index: calc(var(--z-modal, 500) + 20);
          background: rgba(20, 33, 61, 0.45);
          display: grid;
          place-items: center;
          padding: 12px;
        }
        .doc-preview-panel {
          width: min(920px, 100%);
          max-height: min(92vh, 900px);
          min-height: 0;
          min-width: 0;
          display: flex;
          flex-direction: column;
          background: #fff;
          border-radius: 16px;
          border: 1px solid var(--color-border);
          box-shadow: 0 24px 48px rgba(20, 33, 61, 0.2);
          overflow: hidden;
        }
        .doc-preview-head {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
          padding: 16px 18px;
          border-bottom: 1px solid var(--color-border);
          flex-shrink: 0;
        }
        .doc-preview-head h2 {
          margin: 0 0 4px;
          font-family: var(--heading);
          font-size: 1.15rem;
          color: var(--color-text);
        }
        .doc-preview-head p {
          margin: 0;
          font-size: 0.88rem;
          color: var(--color-text-muted);
        }
        .doc-preview-close {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          border: 1px solid var(--color-border);
          background: #fff;
          cursor: pointer;
          flex-shrink: 0;
        }
        .doc-preview-error {
          margin: 0 18px;
          padding: 10px 12px;
          background: #fff1f2;
          border: 1px solid #ffd7dc;
          color: #8d2026;
          border-radius: 8px;
          font-size: 0.88rem;
        }
        .doc-preview-body {
          flex: 1 1 auto;
          min-height: 0;
          min-width: 0;
          overflow-x: auto;
          overflow-y: auto;
          padding: 16px 20px 20px;
          background: #eef2f8;
          -webkit-overflow-scrolling: touch;
        }
        .doc-preview-skeleton {
          padding: 8px 4px 16px;
          max-width: 520px;
          margin: 0 auto;
        }
        .doc-preview-html {
          background: #fff;
          border: 1px solid #d8dbe3;
          border-radius: 8px;
          padding: 0;
          margin-bottom: 4px;
          overflow-x: auto;
          max-width: 100%;
          box-shadow: 0 1px 3px rgba(15, 23, 42, 0.06);
          -webkit-overflow-scrolling: touch;
        }
        .doc-preview-html .doc-page {
          padding: 32px 36px 48px;
          min-width: 0;
          box-sizing: border-box;
        }
        .doc-preview-html table.doc-top,
        .doc-preview-html table.doc-parties,
        .doc-preview-html table.doc-totals-wrap {
          max-width: 100%;
        }
        .doc-preview-html table.doc-lines {
          display: block;
          width: 100%;
          max-width: 100%;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          border-collapse: collapse;
        }
        .doc-preview-html table.doc-lines thead,
        .doc-preview-html table.doc-lines tbody {
          display: table;
          width: 100%;
          min-width: 520px;
          border-collapse: collapse;
        }
        .doc-preview-html table.doc-lines tr {
          display: table-row;
        }
        .doc-preview-html table.doc-lines th,
        .doc-preview-html table.doc-lines td {
          display: table-cell;
        }
        .doc-preview-html table.doc-lines th.doc-col-num,
        .doc-preview-html table.doc-lines td.doc-col-num {
          width: auto;
          height: auto;
          min-width: 0;
          border-radius: 0;
          display: table-cell;
          place-items: unset;
          margin: 0;
          background: transparent;
          color: inherit;
          font-weight: inherit;
          text-align: right;
        }
        .doc-preview-empty {
          min-height: min(50vh, 400px);
          display: grid;
          place-content: center;
          justify-items: center;
          gap: 12px;
          text-align: center;
          padding: 24px;
          color: var(--color-text-muted);
          font-size: 0.92rem;
        }
        .doc-preview-empty i {
          font-size: 2rem;
          color: #94a3b8;
        }
        .doc-preview-foot {
          display: flex;
          flex-wrap: wrap;
          justify-content: flex-end;
          gap: 10px;
          padding: 14px 18px;
          border-top: 1px solid var(--color-border);
          flex-shrink: 0;
        }
        .doc-preview-btn {
          border-radius: 10px;
          padding: 10px 16px;
          font-weight: 600;
          font-size: 0.92rem;
          cursor: pointer;
          border: 1px solid transparent;
        }
        .doc-preview-btn--ghost {
          background: #fff;
          border-color: var(--color-border);
          color: var(--color-text);
        }
        .doc-preview-btn--primary {
          background: var(--color-primary);
          color: #fff;
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }
        .doc-preview-btn--primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        @media (max-width: 768px) {
          .doc-preview-backdrop {
            padding: 0;
            align-items: stretch;
          }
          .doc-preview-panel {
            width: 100%;
            max-height: 100vh;
            border-radius: 0;
            min-height: 100vh;
          }
          .doc-preview-head {
            padding: 14px 14px 12px;
          }
          .doc-preview-head h2 {
            font-size: 1rem;
            word-break: break-word;
          }
          .doc-preview-body {
            padding: 10px 8px 14px;
          }
          .doc-preview-html .doc-page {
            padding: 18px 12px 28px;
          }
          .doc-preview-html table.doc-top,
          .doc-preview-html table.doc-parties {
            display: block;
          }
          .doc-preview-html table.doc-top tbody,
          .doc-preview-html table.doc-parties tbody {
            display: block;
          }
          .doc-preview-html table.doc-top tr,
          .doc-preview-html table.doc-parties tr {
            display: block;
          }
          .doc-preview-html table.doc-top td,
          .doc-preview-html table.doc-parties td {
            display: block;
            width: 100% !important;
            box-sizing: border-box;
          }
          .doc-preview-html table.doc-parties td:first-child {
            border-right: 1px solid #e8ecf1;
          }
          .doc-preview-html .doc-meta-box {
            text-align: left;
            margin-top: 10px;
          }
          .doc-preview-html .doc-issuer-meta,
          .doc-preview-html .doc-parties-body,
          .doc-preview-html .doc-meta-line {
            word-break: break-word;
            overflow-wrap: anywhere;
          }
          .doc-preview-html .doc-lines th,
          .doc-preview-html .doc-lines td {
            font-size: 9pt;
            padding: 6px 4px;
          }
          .doc-preview-html .doc-th-unit {
            font-size: 7pt;
          }
          .doc-preview-html table.doc-totals {
            width: 100%;
            max-width: 240px;
          }
          .doc-preview-foot {
            flex-direction: column-reverse;
            padding: 12px 14px;
          }
          .doc-preview-foot .doc-preview-btn {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </div>
    </ModalPortal>
  );
}
