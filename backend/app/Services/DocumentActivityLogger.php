<?php

namespace App\Services;

use App\Models\Client;
use App\Models\DocumentActivityLog;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\Quote;
use App\Models\User;
use App\Support\DocumentFormat;
use App\Support\PaymentMethods;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;

class DocumentActivityLogger
{
    /**
     * @return array{attributes: array<string, mixed>, items: list<array<string, string>>}
     */
    public function snapshotInvoice(Invoice $invoice): array
    {
        $invoice->loadMissing(['items', 'client']);

        return [
            'attributes' => $invoice->only([
                'client_id', 'quote_id', 'number', 'status', 'issue_date', 'due_date',
                'currency', 'subtotal', 'tax_amount', 'total', 'discount_percent', 'notes', 'paid_at',
            ]),
            'items' => $this->serializeItems($invoice->items),
            'client_name' => $invoice->client?->name,
        ];
    }

    /**
     * @return array{attributes: array<string, mixed>, items: list<array<string, string>>}
     */
    public function snapshotQuote(Quote $quote): array
    {
        $quote->loadMissing(['items', 'client']);

        return [
            'attributes' => $quote->only([
                'client_id', 'number', 'status', 'issue_date', 'valid_until',
                'currency', 'subtotal', 'tax_amount', 'total', 'discount_percent', 'notes',
            ]),
            'items' => $this->serializeItems($quote->items),
            'client_name' => $quote->client?->name,
        ];
    }

    public function logInvoiceCreated(User $user, Invoice $invoice): void
    {
        $invoice->loadMissing(['client', 'quote']);

        $detail = sprintf(
            'Facture %s créée — client : %s, total TTC : %s %s, statut : %s.',
            $invoice->number,
            $invoice->client?->name ?? '—',
            $this->formatMoney($invoice->total),
            $invoice->currency,
            $this->invoiceStatusLabel($invoice->status, $invoice->document_type),
        );

        if ($invoice->quote) {
            $detail .= ' Source : devis '.$invoice->quote->number.'.';
        }

        $this->write('invoice', (int) $invoice->id, (int) $user->id, 'created', 'Document créé', $detail);
    }

    public function logQuoteCreated(User $user, Quote $quote): void
    {
        $quote->loadMissing('client');

        $detail = sprintf(
            'Devis %s créé — client : %s, total TTC : %s %s, statut : %s.',
            $quote->number,
            $quote->client?->name ?? '—',
            $this->formatMoney($quote->total),
            $quote->currency,
            $this->quoteStatusLabel($quote->status),
        );

        $this->write('quote', (int) $quote->id, (int) $user->id, 'created', 'Document créé', $detail);
    }

    /**
     * @param  array{attributes: array<string, mixed>, items: list<array<string, string>>, client_name?: string|null}  $before
     */
    public function logInvoiceUpdated(User $user, array $before, Invoice $after): void
    {
        $after->loadMissing(['items', 'client', 'quote']);
        $diff = $this->diffDocument('invoice', $before, $after);

        if ($diff === null) {
            return;
        }

        $this->write('invoice', (int) $after->id, (int) $user->id, 'updated', $diff['title'], $diff['detail']);
    }

    /**
     * @param  array{attributes: array<string, mixed>, items: list<array<string, string>>, client_name?: string|null}  $before
     */
    public function logQuoteUpdated(User $user, array $before, Quote $after): void
    {
        $after->loadMissing(['items', 'client']);
        $diff = $this->diffDocument('quote', $before, $after);

        if ($diff === null) {
            return;
        }

        $this->write('quote', (int) $after->id, (int) $user->id, 'updated', $diff['title'], $diff['detail']);
    }

    public function logInvoiceDeleted(User $user, Invoice $invoice): void
    {
        $this->write(
            'invoice',
            (int) $invoice->id,
            (int) $user->id,
            'deleted',
            'Document archivé',
            sprintf('Facture %s archivée (suppression logique).', $invoice->number),
        );
    }

    public function logQuoteDeleted(User $user, Quote $quote): void
    {
        $this->write(
            'quote',
            (int) $quote->id,
            (int) $user->id,
            'deleted',
            'Document archivé',
            sprintf('Devis %s archivé (suppression logique).', $quote->number),
        );
    }

    public function logPaymentAdded(User $user, Invoice $invoice, Payment $payment, ?string $statusNote = null): void
    {
        $method = PaymentMethods::label($payment->method) ?? '—';
        $detail = sprintf(
            '%s %s enregistré — %s%s.',
            $this->formatMoney($payment->amount),
            $invoice->currency,
            $method,
            $statusNote ?? '',
        );

        if ($payment->reference) {
            $detail .= ' Réf. : '.$payment->reference.'.';
        }

        $this->write('invoice', (int) $invoice->id, (int) $user->id, 'payment_added', 'Paiement enregistré', $detail);
    }

    public function logPaymentRemoved(User $user, Invoice $invoice, Payment $payment, ?string $statusNote = null): void
    {
        $method = PaymentMethods::label($payment->method) ?? '—';
        $detail = sprintf(
            'Paiement de %s %s retiré (%s)%s.',
            $this->formatMoney($payment->amount),
            $invoice->currency,
            $method,
            $statusNote ?? '',
        );

        $this->write('invoice', (int) $invoice->id, (int) $user->id, 'payment_removed', 'Paiement supprimé', $detail);
    }

    public function logCreditNoteCreated(User $user, Invoice $invoice, Invoice $creditNote): void
    {
        $detail = sprintf(
            'Avoir %s généré pour un montant de %s %s. Statut de la facture : Annulée.',
            $creditNote->number,
            $this->formatMoney($creditNote->total),
            $creditNote->currency,
        );

        $this->write('invoice', (int) $invoice->id, (int) $user->id, 'credit_note_created', 'Avoir émis', $detail);

        $this->write(
            'invoice',
            (int) $creditNote->id,
            (int) $user->id,
            'created',
            'Document créé',
            sprintf('Avoir %s créé pour la facture %s.', $creditNote->number, $invoice->number),
        );
    }

    public function logQuoteConverted(User $user, Quote $quote, Invoice $invoice): void
    {
        $this->write(
            'quote',
            (int) $quote->id,
            (int) $user->id,
            'converted',
            'Conversion en facture',
            sprintf('Facture %s créée à partir de ce devis.', $invoice->number),
        );

        $invoice->loadMissing('client');
        $detail = sprintf(
            'Facture %s créée depuis le devis %s — client : %s, total TTC : %s %s.',
            $invoice->number,
            $quote->number,
            $invoice->client?->name ?? '—',
            $this->formatMoney($invoice->total),
            $invoice->currency,
        );

        $this->write('invoice', (int) $invoice->id, (int) $user->id, 'created', 'Document créé', $detail);
    }

    public function invoiceStatusLabel(string $status, string $documentType = 'invoice'): string
    {
        $label = match ($status) {
            'draft' => 'Brouillon',
            'sent' => 'Envoyée',
            'paid' => 'Payée',
            'overdue' => 'En retard',
            'cancelled' => 'Annulée',
            default => strtoupper($status),
        };

        if ($documentType === 'credit_note') {
            return $label.' (avoir)';
        }

        return $label;
    }

    public function quoteStatusLabel(string $status): string
    {
        return match ($status) {
            'draft' => 'Brouillon',
            'sent' => 'Envoyé',
            'accepted' => 'Accepté',
            'rejected' => 'Refusé',
            'expired' => 'Expiré',
            default => strtoupper($status),
        };
    }

    public function statusChangeNote(string $before, string $after, string $documentType = 'invoice'): string
    {
        if ($before === $after) {
            return '';
        }

        $label = $documentType === 'quote'
            ? $this->quoteStatusLabel($after)
            : $this->invoiceStatusLabel($after, $documentType);

        return ' Statut : '.$label.'.';
    }

    private function write(
        string $documentType,
        int $documentId,
        int $userId,
        string $action,
        string $title,
        string $detail,
        ?array $meta = null,
    ): DocumentActivityLog {
        return DocumentActivityLog::query()->create([
            'user_id' => $userId,
            'document_type' => $documentType,
            'document_id' => $documentId,
            'action' => $action,
            'title' => $title,
            'detail' => $detail,
            'meta' => $meta,
            'created_at' => now(),
        ]);
    }

    /**
     * @param  Collection<int, \App\Models\InvoiceItem|\App\Models\QuoteItem>  $items
     * @return list<array<string, string>>
     */
    private function serializeItems(Collection $items): array
    {
        return $items->map(fn ($item): array => [
            'description' => trim((string) $item->description),
            'quantity' => DocumentFormat::quantity($item->quantity),
            'unit_price' => number_format((float) $item->unit_price, 2, '.', ''),
            'tax_rate' => number_format((float) $item->tax_rate, 2, '.', ''),
        ])->values()->all();
    }

    /**
     * @param  array{attributes: array<string, mixed>, items: list<array<string, string>>, client_name?: string|null}  $before
     * @return array{title: string, detail: string}|null
     */
    private function diffDocument(string $type, array $before, Invoice|Quote $after): ?array
    {
        $fields = $type === 'invoice'
            ? [
                'client_id' => 'Client',
                'quote_id' => 'Devis source',
                'number' => 'Numéro',
                'status' => 'Statut',
                'issue_date' => 'Date d\'émission',
                'due_date' => 'Date d\'échéance',
                'currency' => 'Devise',
                'subtotal' => 'Total HT',
                'tax_amount' => 'TVA',
                'total' => 'Total TTC',
                'discount_percent' => 'Remise',
                'notes' => 'Notes',
                'paid_at' => 'Date de paiement',
            ]
            : [
                'client_id' => 'Client',
                'number' => 'Numéro',
                'status' => 'Statut',
                'issue_date' => 'Date d\'émission',
                'valid_until' => 'Validité',
                'currency' => 'Devise',
                'subtotal' => 'Total HT',
                'tax_amount' => 'TVA',
                'total' => 'Total TTC',
                'discount_percent' => 'Remise',
                'notes' => 'Notes',
            ];

        $clientNames = $this->resolveClientNames($before, $after);
        $lines = [];

        foreach ($fields as $field => $label) {
            $old = $before['attributes'][$field] ?? null;
            $new = $after->getAttribute($field);

            if ($this->valuesEqual($old, $new)) {
                continue;
            }

            $lines[] = sprintf(
                '%s : %s → %s',
                $label,
                $this->formatFieldValue($type, $field, $old, $clientNames, $before['client_name'] ?? null),
                $this->formatFieldValue($type, $field, $new, $clientNames, $after->client?->name),
            );
        }

        $itemsDetail = $this->describeItemsDiff($before['items'] ?? [], $this->serializeItems($after->items));
        if ($itemsDetail !== '') {
            $lines[] = $itemsDetail;
        }

        if ($lines === []) {
            return null;
        }

        $onlyStatus = count($lines) === 1 && str_starts_with($lines[0], 'Statut :');
        $onlyItems = count($lines) === 1 && str_starts_with($lines[0], 'Lignes');

        $title = match (true) {
            $onlyStatus => 'Statut modifié',
            $onlyItems => 'Lignes modifiées',
            default => 'Document modifié',
        };

        return [
            'title' => $title,
            'detail' => implode(' ', $lines),
        ];
    }

    /**
     * @param  array{attributes: array<string, mixed>, items: list<array<string, string>>, client_name?: string|null}  $before
     * @param  array<int, string>  $clientNames
     */
    private function resolveClientNames(array $before, Invoice|Quote $after): array
    {
        $ids = array_filter([
            $before['attributes']['client_id'] ?? null,
            $after->client_id,
        ]);

        if ($ids === []) {
            return [];
        }

        return Client::query()
            ->whereIn('id', $ids)
            ->pluck('name', 'id')
            ->all();
    }

    /**
     * @param  array<int, string>  $clientNames
     */
    private function formatFieldValue(
        string $type,
        string $field,
        mixed $value,
        array $clientNames,
        ?string $fallbackClientName = null,
    ): string {
        if ($value === null || $value === '') {
            return '—';
        }

        return match ($field) {
            'client_id' => $clientNames[(int) $value] ?? $fallbackClientName ?? (string) $value,
            'quote_id' => $value ? '#'.$value : '—',
            'status' => $type === 'quote'
                ? $this->quoteStatusLabel((string) $value)
                : $this->invoiceStatusLabel((string) $value),
            'issue_date', 'due_date', 'valid_until', 'paid_at' => $this->formatDate($value),
            'subtotal', 'tax_amount', 'total' => $this->formatMoney($value),
            'discount_percent' => number_format((float) $value, 2, ',', ' ').' %',
            'notes' => Str::limit(trim((string) $value), 80) ?: '—',
            default => (string) $value,
        };
    }

    private function formatDate(mixed $value): string
    {
        if ($value instanceof Carbon) {
            return $value->format('d/m/Y');
        }

        try {
            return Carbon::parse((string) $value)->format('d/m/Y');
        } catch (\Throwable) {
            return (string) $value;
        }
    }

    private function formatMoney(mixed $value): string
    {
        return number_format((float) $value, 2, ',', ' ');
    }

    private function valuesEqual(mixed $a, mixed $b): bool
    {
        if ($a instanceof Carbon) {
            $a = $a->toDateString();
        }
        if ($b instanceof Carbon) {
            $b = $b->toDateString();
        }

        if (is_numeric($a) && is_numeric($b)) {
            return round((float) $a, 2) === round((float) $b, 2);
        }

        return (string) $a === (string) $b;
    }

    /**
     * @param  list<array<string, string>>  $before
     * @param  list<array<string, string>>  $after
     */
    private function describeItemsDiff(array $before, array $after): string
    {
        if ($before === $after) {
            return '';
        }

        $parts = [sprintf('Lignes mises à jour (%d → %d).', count($before), count($after))];
        $max = max(count($before), count($after));

        for ($i = 0; $i < $max; $i++) {
            $b = $before[$i] ?? null;
            $a = $after[$i] ?? null;

            if ($b === null && $a !== null) {
                $parts[] = 'Ajout : « '.Str::limit($a['description'], 48).' ».';
            } elseif ($b !== null && $a === null) {
                $parts[] = 'Suppression : « '.Str::limit($b['description'], 48).' ».';
            } elseif ($b !== null && $a !== null && $b !== $a) {
                $parts[] = '« '.Str::limit($b['description'], 36).' » modifiée.';
            }
        }

        return implode(' ', $parts);
    }
}
