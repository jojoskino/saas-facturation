<?php

namespace App\Services;

use App\Models\Invoice;
use App\Models\Quote;
use App\Models\User;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Response;
use Illuminate\Support\Collection;

class DocumentPdfService
{
    public function quotePreview(Quote $quote, User $user): Response
    {
        return response($this->quoteHtml($quote, $user), 200, [
            'Content-Type' => 'text/html; charset=UTF-8',
        ]);
    }

    public function quotePdf(Quote $quote, User $user): Response
    {
        $quote->loadMissing(['client', 'items']);

        $pdf = Pdf::loadView('pdf.quote', $this->quoteViewData($quote, $user))
            ->setPaper('a4');

        return $pdf->download(sprintf('%s.pdf', $quote->number));
    }

    public function invoicePreview(Invoice $invoice, User $user): Response
    {
        return response($this->invoiceHtml($invoice, $user), 200, [
            'Content-Type' => 'text/html; charset=UTF-8',
        ]);
    }

    public function invoicePdf(Invoice $invoice, User $user): Response
    {
        $invoice->loadMissing(['client', 'quote', 'payments', 'quote.items']);

        $pdf = Pdf::loadView('pdf.invoice', $this->invoiceViewData($invoice, $user))
            ->setPaper('a4');

        return $pdf->download(sprintf('%s.pdf', $invoice->number));
    }

    public function quoteHtml(Quote $quote, User $user): string
    {
        $quote->loadMissing(['client', 'items']);

        return view('pdf.quote', $this->quoteViewData($quote, $user))->render();
    }

    public function invoiceHtml(Invoice $invoice, User $user): string
    {
        $invoice->loadMissing(['client', 'quote', 'payments', 'quote.items']);

        return view('pdf.invoice', $this->invoiceViewData($invoice, $user))->render();
    }

    /**
     * @return array<string, mixed>
     */
    private function quoteViewData(Quote $quote, User $user): array
    {
        return [
            'quote' => $quote,
            'user' => $user,
            'issuer' => $this->issuerBlock($user),
            'client' => $this->clientBlock($quote->client),
            'branding' => $this->branding($user),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function invoiceViewData(Invoice $invoice, User $user): array
    {
        $paidAmount = (float) $invoice->payments->sum('amount');
        $balance = max(0, (float) $invoice->total - $paidAmount);

        /** @var Collection<int, \App\Models\QuoteItem> $items */
        $items = $invoice->quote?->items ?? collect();

        return [
            'invoice' => $invoice,
            'user' => $user,
            'issuer' => $this->issuerBlock($user),
            'client' => $this->clientBlock($invoice->client),
            'items' => $items,
            'paidAmount' => $paidAmount,
            'balance' => $balance,
            'isCreditNote' => $invoice->document_type === 'credit_note',
            'branding' => $this->branding($user),
        ];
    }

    /**
     * @return array{primary: string, accent: string, logoPath: string|null}
     */
    private function branding(User $user): array
    {
        $primary = $user->document_color_primary ?: '#14213d';
        $accent = $user->document_color_accent ?: '#fca311';
        $logoPath = null;
        if ($user->company_logo_path) {
            $absolute = storage_path('app/public/'.$user->company_logo_path);
            if (is_file($absolute)) {
                $logoPath = $absolute;
            }
        }

        return [
            'primary' => $primary,
            'accent' => $accent,
            'logoPath' => $logoPath,
        ];
    }

    /**
     * @return array{name: string, address: string, email: string, phone: string, tax_id: string, bank: string, footer: string}
     */
    private function issuerBlock(User $user): array
    {
        return [
            'name' => (string) ($user->company_name ?: $user->name),
            'address' => (string) ($user->company_address ?? ''),
            'email' => (string) ($user->company_email ?: $user->email),
            'phone' => (string) ($user->company_phone ?? ''),
            'tax_id' => (string) ($user->company_tax_id ?? ''),
            'bank' => trim(implode(' — ', array_filter([
                $user->company_bank_name,
                $user->company_bank_iban ? 'IBAN: '.$user->company_bank_iban : null,
                $user->company_bank_bic ? 'BIC: '.$user->company_bank_bic : null,
            ]))),
            'footer' => (string) ($user->company_legal_footer ?? ''),
        ];
    }

    /**
     * @return array{name: string, address: string, email: string, phone: string, tax_id: string}
     */
    private function clientBlock(?\App\Models\Client $client): array
    {
        if ($client === null) {
            return ['name' => '—', 'address' => '', 'email' => '', 'phone' => '', 'tax_id' => ''];
        }

        return [
            'name' => (string) $client->name,
            'address' => (string) ($client->address ?? ''),
            'email' => (string) ($client->email ?? ''),
            'phone' => (string) ($client->phone ?? ''),
            'tax_id' => (string) ($client->tax_id ?? ''),
        ];
    }
}
