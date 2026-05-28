<?php

namespace App\Services;

use App\Models\Invoice;
use Illuminate\Validation\ValidationException;

class InvoiceDocumentRules
{
    /** @var list<string> */
    private const FINANCIAL_FIELDS = [
        'subtotal',
        'tax_amount',
        'total',
        'number',
        'client_id',
        'quote_id',
        'currency',
        'issue_date',
    ];

    public function __construct(
        private readonly InvoicePaymentSync $paymentSync,
    ) {}

    public function isDraft(Invoice $invoice): bool
    {
        return $invoice->status === 'draft';
    }

    public function isIssued(Invoice $invoice): bool
    {
        return $invoice->document_type === 'invoice'
            && ! in_array($invoice->status, ['draft', 'cancelled'], true);
    }

    public function hasPayments(Invoice $invoice): bool
    {
        return $this->paymentSync->paidTotal($invoice) > 0.001;
    }

    public function hasCreditNote(Invoice $invoice): bool
    {
        return $invoice->creditNotes()
            ->where('document_type', 'credit_note')
            ->exists();
    }

    /**
     * @throws ValidationException
     */
    public function assertCanDelete(Invoice $invoice): void
    {
        if ($invoice->document_type === 'credit_note') {
            throw ValidationException::withMessages([
                'invoice' => ['Un avoir ne peut pas être supprimé depuis cette interface.'],
            ]);
        }

        if (! $this->isDraft($invoice)) {
            throw ValidationException::withMessages([
                'invoice' => ['Seules les factures au statut « brouillon » peuvent être supprimées.'],
            ]);
        }

        if ($this->hasPayments($invoice)) {
            throw ValidationException::withMessages([
                'invoice' => ['Impossible de supprimer une facture avec des paiements enregistrés.'],
            ]);
        }

        if ($this->hasCreditNote($invoice)) {
            throw ValidationException::withMessages([
                'invoice' => ['Impossible de supprimer une facture pour laquelle un avoir existe.'],
            ]);
        }
    }

    /**
     * @param  array<string, mixed>  $data
     *
     * @throws ValidationException
     */
    public function assertCanUpdate(Invoice $invoice, array $data): void
    {
        if ($invoice->document_type === 'credit_note') {
            throw ValidationException::withMessages([
                'invoice' => ['Un avoir ne peut pas être modifié.'],
            ]);
        }

        if ($invoice->status === 'cancelled') {
            throw ValidationException::withMessages([
                'invoice' => ['Une facture annulée ne peut plus être modifiée.'],
            ]);
        }

        foreach (self::FINANCIAL_FIELDS as $field) {
            if (! array_key_exists($field, $data)) {
                continue;
            }

            $incoming = $data[$field];
            $current = $invoice->{$field};

            if ($field === 'client_id' || $field === 'quote_id') {
                $incoming = $incoming === null || $incoming === '' ? null : (int) $incoming;
                $current = $current === null ? null : (int) $current;
            }

            if ($incoming != $current && ($this->isIssued($invoice) || $this->hasPayments($invoice))) {
                throw ValidationException::withMessages([
                    $field => ['Les montants et références ne sont plus modifiables après émission ou enregistrement de paiements.'],
                ]);
            }
        }

        if (array_key_exists('total', $data) || array_key_exists('subtotal', $data) || array_key_exists('tax_amount', $data)) {
            $newTotal = isset($data['total']) && $data['total'] !== null && $data['total'] !== ''
                ? round((float) $data['total'], 2)
                : round((float) ($data['subtotal'] ?? $invoice->subtotal) + (float) ($data['tax_amount'] ?? $invoice->tax_amount), 2);

            $paid = $this->paymentSync->paidTotal($invoice);
            if ($paid > 0.001 && $newTotal + 0.001 < $paid) {
                throw ValidationException::withMessages([
                    'total' => ['Le montant TTC ne peut pas être inférieur au total des paiements déjà enregistrés ('.number_format($paid, 2, ',', ' ').').'],
                ]);
            }
        }

        if (array_key_exists('status', $data) && $data['status'] !== null) {
            $this->assertCanChangeStatus($invoice, (string) $data['status']);
        }
    }

    /**
     * @throws ValidationException
     */
    public function assertCanChangeStatus(Invoice $invoice, string $newStatus): void
    {
        if ($newStatus === $invoice->status) {
            return;
        }

        if ($invoice->status === 'cancelled') {
            throw ValidationException::withMessages([
                'status' => ['Une facture annulée ne peut plus changer de statut.'],
            ]);
        }

        if ($newStatus === 'cancelled') {
            $this->assertCanCancel($invoice);

            return;
        }

        if ($newStatus === 'paid') {
            return;
        }

        if ($this->hasPayments($invoice) && in_array($newStatus, ['draft'], true)) {
            throw ValidationException::withMessages([
                'status' => ['Impossible de repasser en brouillon : des paiements sont enregistrés.'],
            ]);
        }
    }

    /**
     * @throws ValidationException
     */
    public function assertCanCancel(Invoice $invoice): void
    {
        if ($this->isDraft($invoice)) {
            return;
        }

        if ($this->hasPayments($invoice)) {
            throw ValidationException::withMessages([
                'status' => ['Impossible d\'annuler une facture avec des paiements. Créez un avoir ou supprimez d\'abord les paiements.'],
            ]);
        }

        if ($this->isIssued($invoice)) {
            throw ValidationException::withMessages([
                'status' => ['Pour une facture émise, utilisez « Créer un avoir » plutôt que le statut annulée.'],
            ]);
        }
    }

    /**
     * @throws ValidationException
     */
    public function assertCanCreateCreditNote(Invoice $invoice): void
    {
        if ($invoice->document_type !== 'invoice') {
            throw ValidationException::withMessages([
                'invoice' => ['Seules les factures peuvent générer un avoir.'],
            ]);
        }

        if ($this->isDraft($invoice)) {
            throw ValidationException::withMessages([
                'invoice' => ['Un avoir concerne une facture émise. Supprimez le brouillon ou émettez-la d\'abord.'],
            ]);
        }

        if ($invoice->status === 'cancelled') {
            throw ValidationException::withMessages([
                'invoice' => ['Cette facture est déjà annulée.'],
            ]);
        }

        if ($this->hasCreditNote($invoice)) {
            throw ValidationException::withMessages([
                'invoice' => ['Un avoir existe déjà pour cette facture.'],
            ]);
        }
    }
}
