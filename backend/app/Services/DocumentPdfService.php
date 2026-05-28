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
        $invoice->loadMissing([
            'client',
            'quote',
            'payments',
            'quote.items',
            'items',
            'parentInvoice.items',
            'parentInvoice.quote.items',
        ]);

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
        $invoice->loadMissing([
            'client',
            'quote',
            'payments',
            'quote.items',
            'items',
            'parentInvoice.items',
            'parentInvoice.quote.items',
        ]);

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

        /** @var \Illuminate\Support\Collection<int, \App\Models\InvoiceItem|\App\Models\QuoteItem> $items */
        $items = $this->resolveInvoiceLineItems($invoice);

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
     * @return array{primary: string, accent: string, logoSrc: string|null}
     */
    private function branding(User $user): array
    {
        $primary = $user->document_color_primary ?: '#14213d';
        $accent = $user->document_color_accent ?: '#fca311';

        return [
            'primary' => $primary,
            'accent' => $accent,
            'logoSrc' => $this->logoDataUri($user->company_logo_path),
        ];
    }

    /**
     * @return Collection<int, \App\Models\InvoiceItem|\App\Models\QuoteItem>
     */
    private function resolveInvoiceLineItems(Invoice $invoice): Collection
    {
        if ($invoice->items->isNotEmpty()) {
            return $invoice->items;
        }

        if ($invoice->quote?->items?->isNotEmpty()) {
            return $invoice->quote->items;
        }

        if ($invoice->document_type === 'credit_note' && $invoice->parentInvoice) {
            $parent = $invoice->parentInvoice;
            $parent->loadMissing(['items', 'quote.items']);

            if ($parent->items->isNotEmpty()) {
                return $parent->items;
            }

            if ($parent->quote?->items?->isNotEmpty()) {
                return $parent->quote->items;
            }
        }

        return collect();
    }

    private function logoDataUri(?string $relativePath): ?string
    {
        if (! $relativePath) {
            return null;
        }

        $relative = ltrim($relativePath, '/');
        $candidates = [
            storage_path('app/public/'.$relative),
            public_path('storage/'.$relative),
        ];

        $absolute = null;
        foreach ($candidates as $path) {
            if (is_file($path) && is_readable($path)) {
                $absolute = $path;
                break;
            }
        }

        if ($absolute === null) {
            return null;
        }

        $binary = file_get_contents($absolute);
        if ($binary === false) {
            return null;
        }

        $mime = mime_content_type($absolute) ?: $this->guessImageMime($absolute);
        if (! is_string($mime) || ! str_starts_with($mime, 'image/')) {
            return null;
        }

        return 'data:'.$mime.';base64,'.base64_encode($binary);
    }

    private function guessImageMime(string $absolutePath): string
    {
        return match (strtolower(pathinfo($absolutePath, PATHINFO_EXTENSION))) {
            'jpg', 'jpeg' => 'image/jpeg',
            'gif' => 'image/gif',
            'webp' => 'image/webp',
            'svg' => 'image/svg+xml',
            default => 'image/png',
        };
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
