export function normalizePlan(plan) {
  return plan === "pro" || plan === "enterprise" ? plan : "free";
}

export function canExportCsv(planOrFeatures) {
  if (typeof planOrFeatures === "object" && planOrFeatures !== null) {
    return Boolean(planOrFeatures.csv_export);
  }
  return normalizePlan(planOrFeatures) !== "free";
}

export function canAdvancedReports(planOrFeatures) {
  if (typeof planOrFeatures === "object" && planOrFeatures !== null) {
    return Boolean(planOrFeatures.advanced_reports);
  }
  return canExportCsv(planOrFeatures);
}

export function canImportClientsCsv(planOrFeatures) {
  if (typeof planOrFeatures === "object" && planOrFeatures !== null) {
    return Boolean(planOrFeatures.client_csv_import);
  }
  return canExportCsv(planOrFeatures);
}

export function invoiceQuotaFromUser(user) {
  const features = user?.plan_features;
  if (features) {
    return {
      limit: features.invoices_per_month,
      used: features.invoices_used_this_month ?? 0,
      remaining: features.invoices_remaining_this_month,
    };
  }
  const plan = normalizePlan(user?.plan);
  if (plan !== "free") {
    return { limit: null, used: 0, remaining: null };
  }
  return { limit: 10, used: 0, remaining: 10 };
}
