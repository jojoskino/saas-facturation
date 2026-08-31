export function normalizePlan() {
  return "free";
}

export function canExportCsv() {
  return true;
}

export function canAdvancedReports() {
  return true;
}

export function canImportClientsCsv() {
  return true;
}

export function invoiceQuotaFromUser() {
  return { limit: null, used: 0, remaining: null };
}
