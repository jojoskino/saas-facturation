<?php

namespace App\Support;

use App\Models\User;

class PlanFeatures
{
    public static function normalize(?string $plan): string
    {
        return 'free';
    }

    public static function monthlyInvoiceLimit(?string $plan): ?int
    {
        return null;
    }

    public static function canExportCsv(?string $plan): bool
    {
        return true;
    }

    public static function canImportClientsCsv(?string $plan): bool
    {
        return true;
    }

    public static function canAdvancedReports(?string $plan): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public static function forUser(User $user): array
    {
        return [
            'plan' => 'free',
            'invoices_per_month' => null,
            'invoices_used_this_month' => null,
            'invoices_remaining_this_month' => null,
            'csv_export' => true,
            'client_csv_import' => true,
            'advanced_reports' => true,
        ];
    }
}
