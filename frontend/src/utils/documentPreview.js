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

export function clientDocumentPreviewPaths(doc, kind) {
  if (!doc?.id) return null;
  return kind === "quote" ? quotePreviewPaths(doc) : invoicePreviewPaths(doc);
}

export function assertDocumentPreviewHtml(html) {
  const text = String(html || "").trim();
  if (text.includes("doc-accent") || text.includes("doc-brand")) {
    return text;
  }
  if (text.includes("<title>Laravel</title>") || text.includes("Welcome to Laravel")) {
    throw new Error(
      "L'aperçu n'a pas pu joindre l'API document. Vérifiez que le backend tourne et que VITE_API_BASE_URL pointe vers Laravel.",
    );
  }
  throw new Error("Aperçu indisponible pour ce document.");
}
