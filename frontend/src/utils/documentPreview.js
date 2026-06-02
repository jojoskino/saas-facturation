export function invoicePreviewPaths(invoice) {
  if (!invoice?.id) return null;
  const number = invoice.number || "document";
  return {
    preview: `/api/invoices/${invoice.id}/preview`,
    pdf: `/api/invoices/${invoice.id}/pdf`,
    filename: `${number}.pdf`,
    title: `Aperçu — ${number}`,
  };
}

export function invoiceHistoryPaths(invoice) {
  if (!invoice?.id) return null;
  const number = invoice.number || "document";
  return {
    preview: `/api/invoices/${invoice.id}/history/preview`,
    pdf: `/api/invoices/${invoice.id}/history/pdf`,
    filename: `${number}-historique.pdf`,
    title: `Historique — ${number}`,
  };
}

export function quotePreviewPaths(quote) {
  if (!quote?.id) return null;
  const number = quote.number || "document";
  return {
    preview: `/api/quotes/${quote.id}/preview`,
    pdf: `/api/quotes/${quote.id}/pdf`,
    filename: `${number}.pdf`,
    title: `Aperçu — ${number}`,
  };
}

export function quoteHistoryPaths(quote) {
  if (!quote?.id) return null;
  const number = quote.number || "document";
  return {
    preview: `/api/quotes/${quote.id}/history/preview`,
    pdf: `/api/quotes/${quote.id}/history/pdf`,
    filename: `${number}-historique.pdf`,
    title: `Historique — ${number}`,
  };
}

export function clientDocumentPreviewPaths(doc, kind) {
  if (!doc?.id) return null;
  return kind === "quote" ? quotePreviewPaths(doc) : invoicePreviewPaths(doc);
}

export function assertDocumentPreviewHtml(html) {
  const text = String(html || "").trim();
  if (!text) {
    throw new Error("Réponse vide du serveur d'aperçu.");
  }

  const looksLikeDocument =
    text.includes("doc-page") ||
    text.includes("doc-history") ||
    text.includes("doc-number") ||
    text.includes("doc-accent") ||
    text.includes("doc-brand") ||
    text.includes("doc-type") ||
    text.includes("doc-header") ||
    (text.includes("<!DOCTYPE") && (text.includes("doc-parties") || text.includes("Avoir") || text.includes("Facture")));

  if (looksLikeDocument) {
    return prepareDocumentPreviewHtml(text);
  }

  if (text.startsWith("{") || text.includes('"message"')) {
    try {
      const data = JSON.parse(text);
      if (data?.message) {
        throw new Error(String(data.message));
      }
    } catch (parseErr) {
      if (parseErr instanceof Error && parseErr.message && !parseErr.message.includes("JSON")) {
        throw parseErr;
      }
    }
  }

  if (text.includes("<title>Laravel</title>") || text.includes("Welcome to Laravel")) {
    throw new Error(
      "L'aperçu n'a pas pu joindre l'API. Lancez le backend (php artisan serve) et vérifiez VITE_API_BASE_URL.",
    );
  }

  throw new Error("Aperçu indisponible pour ce document.");
}

/** Extrait styles + contenu pour un rendu fiable dans innerHTML (évite la coupure du bas). */
export function prepareDocumentPreviewHtml(html) {
  if (typeof DOMParser === "undefined") {
    return html;
  }

  try {
    const doc = new DOMParser().parseFromString(html, "text/html");
    const styles = Array.from(doc.querySelectorAll("style"))
      .map((node) => node.textContent || "")
      .filter(Boolean)
      .join("\n");
    const bodyHtml = doc.body?.innerHTML?.trim() || html;

    if (!styles) {
      return bodyHtml;
    }

    return `<style>${styles}</style>${bodyHtml}`;
  } catch {
    return html;
  }
}
