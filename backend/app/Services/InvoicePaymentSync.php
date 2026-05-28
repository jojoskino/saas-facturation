<?php

namespace App\Services;

use App\Models\Invoice;
use Carbon\Carbon;
use Illuminate\Validation\ValidationException;

class InvoicePaymentSync
{
    public function paidTotal(Invoice $invoice): float
    {
        if ($invoice->relationLoaded('payments')) {
            return (float) $invoice->payments->sum('amount');
        }

        return (float) $invoice->payments()->sum('amount');
    }

    public function balanceDue(Invoice $invoice, ?float $total = null): float
    {
        $totalAmount = $total ?? (float) $invoice->total;

        return max(0, round($totalAmount - $this->paidTotal($invoice), 2));
    }

    public function isFullyPaid(Invoice $invoice, ?float $total = null): bool
    {
        $totalAmount = $total ?? (float) $invoice->total;

        if ($totalAmount <= 0.001) {
            return true;
        }

        return $this->balanceDue($invoice, $totalAmount) <= 0.001;
    }

    /**
     * @throws ValidationException
     */
    public function assertCanMarkAsPaid(Invoice $invoice, ?float $total = null): void
    {
        if ($this->isFullyPaid($invoice, $total)) {
            return;
        }

        throw ValidationException::withMessages([
            'status' => [
                'La facture ne peut être marquée comme payée que lorsque le total des paiements enregistrés couvre le montant TTC. Utilisez « Paiements » pour enregistrer un encaissement.',
            ],
        ]);
    }

    public function syncStatus(Invoice $invoice): void
    {
        if ($invoice->document_type === 'credit_note') {
            return;
        }

        $invoice->loadMissing('payments');
        $balance = $this->balanceDue($invoice);

        if ($balance <= 0.001 && (float) $invoice->total > 0) {
            $latestPaidAt = $invoice->payments->max('paid_at');
            $invoice->update([
                'status' => 'paid',
                'paid_at' => $invoice->paid_at ?? $latestPaidAt ?? now(),
            ]);

            return;
        }

        if ($invoice->status === 'paid' && $balance > 0.001) {
            $dueDate = $invoice->due_date?->toDateString() ?? now()->toDateString();
            $status = Carbon::parse($dueDate)->isPast() && ! Carbon::parse($dueDate)->isToday()
                ? 'overdue'
                : 'sent';
            $invoice->update([
                'status' => $status,
                'paid_at' => null,
            ]);
        }
    }
}
