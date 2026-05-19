import { useEffect, useState } from "react";
import { apiDownload, apiFetchHtml } from "../api/client";
import ModalPortal from "./ModalPortal";
import Skeleton from "./skeleton/Skeleton";

export default function DocumentPreviewModal({ open, onClose, previewPath, pdfPath, filename, title }) {
  const [html, setHtml] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!open || !previewPath) {
      setHtml("");
      setError("");
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
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

  async function handleDownload() {
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

  return (
    <ModalPortal>
    <div className="doc-preview-backdrop" role="dialog" aria-modal="true" onClick={onClose}>
      <section className="doc-preview-panel" onClick={(e) => e.stopPropagation()}>
        <header className="doc-preview-head">
          <div>
            <h2>{title || "Aperçu du document"}</h2>
            <p>Vérifiez le rendu avant l&apos;export PDF.</p>
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
          ) : (
            <iframe
              className="doc-preview-frame"
              title={title || "Aperçu"}
              srcDoc={html}
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
            disabled={loading || downloading || !html}
          >
            <i className="fa-solid fa-file-pdf" /> {downloading ? "Export…" : "Télécharger le PDF"}
          </button>
        </footer>
      </section>

      <style>{`
        .doc-preview-backdrop {
          position: fixed;
          inset: 0;
          z-index: var(--z-modal, 500);
          background: rgba(20, 33, 61, 0.45);
          display: grid;
          place-items: center;
          padding: 16px;
        }
        .doc-preview-panel {
          width: min(920px, 100%);
          max-height: min(92vh, 900px);
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
          flex: 1;
          min-height: 0;
          padding: 12px 18px;
          background: #eef2f8;
        }
        .doc-preview-skeleton {
          padding: 8px 4px 16px;
          max-width: 520px;
          margin: 0 auto;
        }
        .doc-preview-frame {
          width: 100%;
          height: min(62vh, 640px);
          border: 1px solid #d8dbe3;
          border-radius: 8px;
          background: #fff;
        }
        .doc-preview-foot {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          padding: 14px 18px;
          border-top: 1px solid var(--color-border);
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
      `}</style>
    </div>
    </ModalPortal>
  );
}
