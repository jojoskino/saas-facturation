<?php

namespace App\Support;

use App\Models\User;

class PlanFeatures
{
    public const FREE_MONTHLY_INVOICE_LIMIT = 10;

    public static function normalize(?string $plan): string
    {
        return in_array($plan, ['pro', 'enterprise'], true) ? $plan : 'free';
    }

    public static function monthlyInvoiceLimit(?string $plan): ?int
    {
        return self::normalize($plan) === 'free' ? self::FREE_MONTHLY_INVOICE_LIMIT : null;
    }

    public static function canExportCsv(?string $plan): bool
    {
        return in_array(self::normalize($plan), ['pro', 'enterprise'], true);
    }

    public static function canImportClientsCsv(?string $plan): bool
    {
        return self::canExportCsv($plan);
    }

    public static function canAdvancedReports(?string $plan): bool
    {
        return self::canExportCsv($plan);
    }

    /**
     * @return array<string, mixed>
     */
    public static function forUser(User $user): array
    {
        $plan = self::normalize($user->plan);
        $limit = self::monthlyInvoiceLimit($plan);
        $used = $limit === null
            ? null
            : $user->invoices()
                ->where('document_type', 'invoice')
                ->whereYear('created_at', now()->year)
                ->whereMonth('created_at', now()->month)
                ->count();

        return [
            'plan' => $plan,
            'invoices_per_month' => $limit,
            'invoices_used_this_month' => $used,
            'invoices_remaining_this_month' => $limit === null || $used === null
                ? null
                : max(0, $limit - $used),
            'csv_export' => self::canExportCsv($plan),
            'client_csv_import' => self::canImportClientsCsv($plan),
            'advanced_reports' => self::canAdvancedReports($plan),
        ];
    }
}
