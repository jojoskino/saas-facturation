<?php

namespace App\Services;

use App\Models\User;
use App\Support\PlanFeatures;
use Illuminate\Validation\ValidationException;

class InvoiceQuotaService
{
    public function assertCanCreate(User $user): void
    {
        $limit = PlanFeatures::monthlyInvoiceLimit($user->plan);
        if ($limit === null) {
            return;
        }

        $used = $user->invoices()
            ->where('document_type', 'invoice')
            ->whereYear('created_at', now()->year)
            ->whereMonth('created_at', now()->month)
            ->count();

        if ($used >= $limit) {
            throw ValidationException::withMessages([
                'plan' => [
                    "Limite atteinte : {$limit} factures par mois sur l'offre Gratuite. Passez à Pro pour continuer.",
                ],
            ]);
        }
    }
}
