<?php

namespace App\Services;

use App\Models\DocumentActivityLog;
use App\Models\Invoice;
use App\Models\Quote;
use App\Models\User;
use App\Support\PaymentMethods;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Response;
use Illuminate\Support\Carbon;

class DocumentHistoryService
{
    public function __construct(
        private readonly DocumentPdfService $pdfService,
    ) {}

    /**
     * @return list<array{at: string, date_label: string, title: string, detail: string}>
     */
    public function invoiceTimeline(Invoice $invoice): array
    {
        $logged = $this->loggedTimeline('invoice', (int) $invoice->id);

        if ($logged !== []) {
            return $logged;
        }

        return $this->legacyInvoiceTimeline($invoice);
    }

    /**
     * @return list<array{at: string, date_label: string, title: string, detail: string}>
     */
    public function quoteTimeline(Quote $quote): array
    {
        $logged = $this->loggedTimeline('quote', (int) $quote->id);

        if ($logged !== []) {
            return $logged;
        }

        return $this->legacyQuoteTimeline($quote);
    }

    public function invoiceHistoryPreview(Invoice $invoice, User $user): Response
    {
        return response($this->invoiceHistoryHtml($invoice, $user), 200, [
            'Content-Type' => 'text/html; charset=UTF-8',
        ]);
    }

    public function invoiceHistoryPdf(Invoice $invoice, User $user): Response
    {
        $pdf = Pdf::loadView('pdf.history', $this->invoiceHistoryViewData($invoice, $user))
            ->setPaper('a4');

        return $pdf->download(sprintf('%s-historique.pdf', $invoice->number));
    }

    public function quoteHistoryPreview(Quote $quote, User $user): Response
    {
        return response($this->quoteHistoryHtml($quote, $user), 200, [
            'Content-Type' => 'text/html; charset=UTF-8',
        ]);
    }

    public function quoteHistoryPdf(Quote $quote, User $user): Response
    {
        $pdf = Pdf::loadView('pdf.history', $this->quoteHistoryViewData($quote, $user))
            ->setPaper('a4');

        return $pdf->download(sprintf('%s-historique.pdf', $quote->number));
    }

    public function invoiceHistoryHtml(Invoice $invoice, User $user): string
    {
        return view('pdf.history', $this->invoiceHistoryViewData($invoice, $user))->render();
    }

    public function quoteHistoryHtml(Quote $quote, User $user): string
    {
        return view('pdf.history', $this->quoteHistoryViewData($quote, $user))->render();
    }

    /**
     * @return list<array{at: string, date_label: string, title: string, detail: string}>
     */
    private function loggedTimeline(string $documentType, int $documentId): array
    {
        return DocumentActivityLog::query()
            ->where('document_type', $documentType)
            ->where('document_id', $documentId)
            ->orderBy('created_at')
            ->orderBy('id')
            ->get()
            ->map(fn (DocumentActivityLog $log): array => [
                'at' => $log->created_at->toIso8601String(),
                'date_label' => $log->created_at->format('d/m/Y H:i'),
                'title' => $log->title,
                'detail' => $log->detail,
            ])
            ->all();
    }

    /**
     * @return list<array{at: string, date_label: string, title: string, detail: string}>
     */
    private function legacyInvoiceTimeline(Invoice $invoice): array
    {
        $invoice->loadMissing([
            'client:id,name',
            'quote:id,number',
            'payments',
            'creditNotes:id,number,created_at,parent_invoice_id',
            'parentInvoice:id,number',
        ]);

        $events = [];

        if ($invoice->created_at) {
            $events[] = $this->event(
                $invoice->created_at,
                'Document créé',
                sprintf('Facture %s enregistrée dans Facturo.', $invoice->number),
            );
        }

        if ($invoice->issue_date) {
            $events[] = $this->event(
                $invoice->issue_date->startOfDay(),
                'Date d\'émission',
                'Émise le '.$invoice->issue_date->format('d/m/Y').'.',
            );
        }

        if ($invoice->due_date) {
            $events[] = $this->event(
                $invoice->due_date->startOfDay(),
                'Échéance',
                'Date d\'échéance : '.$invoice->due_date->format('d/m/Y').'.',
            );
        }

        if ($invoice->quote) {
            $events[] = $this->event(
                $invoice->created_at ?? now(),
                'Lien devis',
                'Issue du devis '.$invoice->quote->number.'.',
            );
        }

        foreach ($invoice->payments->sortBy('paid_at') as $payment) {
            $method = PaymentMethods::label($payment->method) ?? '—';
            $events[] = $this->event(
                $payment->paid_at ?? $payment->created_at,
                'Paiement enregistré',
                sprintf(
                    '%s %s — %s',
                    number_format((float) $payment->amount, 2, ',', ' '),
                    $invoice->currency,
                    $method,
                ),
            );
        }

        if ($invoice->paid_at) {
            $events[] = $this->event(
                $invoice->paid_at,
                'Facture soldée',
                'Statut : Payée.',
            );
        }

        foreach ($invoice->creditNotes as $creditNote) {
            $events[] = $this->event(
                $creditNote->created_at ?? now(),
                'Avoir émis',
                'Avoir '.$creditNote->number.' généré pour cette facture.',
            );
        }

        if ($invoice->document_type === 'credit_note' && $invoice->parentInvoice) {
            $events[] = $this->event(
                $invoice->created_at ?? now(),
                'Avoir lié',
                'Avoir pour la facture '.$invoice->parentInvoice->number.'.',
            );
        }

        $events[] = $this->event(
            $invoice->updated_at ?? $invoice->created_at ?? now(),
            'Statut actuel',
            $this->invoiceStatusLabel($invoice->status, $invoice->document_type),
        );

        return $this->sortEvents($events);
    }

    /**
     * @return list<array{at: string, date_label: string, title: string, detail: string}>
     */
    private function legacyQuoteTimeline(Quote $quote): array
    {
        $quote->loadMissing([
            'client:id,name',
            'invoices:id,number,quote_id,created_at,document_type',
        ]);

        $events = [];

        if ($quote->created_at) {
            $events[] = $this->event(
                $quote->created_at,
                'Document créé',
                sprintf('Devis %s enregistré dans Facturo.', $quote->number),
            );
        }

        if ($quote->issue_date) {
            $events[] = $this->event(
                $quote->issue_date->startOfDay(),
                'Date d\'émission',
                'Émis le '.$quote->issue_date->format('d/m/Y').'.',
            );
        }

        if ($quote->valid_until) {
            $events[] = $this->event(
                $quote->valid_until->startOfDay(),
                'Validité',
                'Valable jusqu\'au '.$quote->valid_until->format('d/m/Y').'.',
            );
        }

        foreach ($quote->invoices->where('document_type', 'invoice')->sortBy('created_at') as $invoice) {
            $events[] = $this->event(
                $invoice->created_at ?? now(),
                'Conversion en facture',
                'Facture '.$invoice->number.' créée à partir de ce devis.',
            );
        }

        $events[] = $this->event(
            $quote->updated_at ?? $quote->created_at ?? now(),
            'Statut actuel',
            $this->quoteStatusLabel($quote->status),
        );

        return $this->sortEvents($events);
    }

    /**
     * @return array<string, mixed>
     */
    private function invoiceHistoryViewData(Invoice $invoice, User $user): array
    {
        return [
            'documentType' => $invoice->document_type === 'credit_note' ? 'Avoir' : 'Facture',
            'documentNumber' => $invoice->number,
            'clientName' => $invoice->client?->name ?? '—',
            'events' => $this->invoiceTimeline($invoice),
            'issuer' => $this->issuerBlock($user),
            'branding' => $this->pdfService->userBranding($user),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function quoteHistoryViewData(Quote $quote, User $user): array
    {
        return [
            'documentType' => 'Devis',
            'documentNumber' => $quote->number,
            'clientName' => $quote->client?->name ?? '—',
            'events' => $this->quoteTimeline($quote),
            'issuer' => $this->issuerBlock($user),
            'branding' => $this->pdfService->userBranding($user),
        ];
    }

    /**
     * @param  list<array{at: string, date_label: string, title: string, detail: string}>  $events
     * @return list<array{at: string, date_label: string, title: string, detail: string}>
     */
    private function sortEvents(array $events): array
    {
        usort($events, fn (array $a, array $b): int => strcmp($a['at'], $b['at']));

        return $events;
    }

    /**
     * @return array{at: string, date_label: string, title: string, detail: string}
     */
    private function event(Carbon|string|null $at, string $title, string $detail): array
    {
        $date = $at instanceof Carbon ? $at : Carbon::parse((string) $at);

        return [
            'at' => $date->toIso8601String(),
            'date_label' => $date->format('d/m/Y H:i'),
            'title' => $title,
            'detail' => $detail,
        ];
    }

    private function invoiceStatusLabel(string $status, string $documentType): string
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
            return 'Statut : '.$label.' (avoir).';
        }

        return 'Statut : '.$label.'.';
    }

    private function quoteStatusLabel(string $status): string
    {
        $label = match ($status) {
            'draft' => 'Brouillon',
            'sent' => 'Envoyé',
            'accepted' => 'Accepté',
            'rejected' => 'Refusé',
            'expired' => 'Expiré',
            default => strtoupper($status),
        };

        return 'Statut : '.$label.'.';
    }

    /**
     * @return array{name: string}
     */
    private function issuerBlock(User $user): array
    {
        return [
            'name' => (string) ($user->company_name ?: $user->name),
        ];
    }
}
