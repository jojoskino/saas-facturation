<?php

namespace App\Services;

use App\Models\Invoice;
use App\Models\Quote;
use App\Models\User;
use App\Services\InvoiceQuotaService;
use App\Support\DocumentNumberGenerator;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Validation\ValidationException;

class QuoteToInvoiceService
{
    public function __construct(
        private readonly InvoiceQuotaService $quota,
    ) {}

    public function convert(User $user, Quote $quote): Invoice|JsonResponse
    {
        try {
            $this->quota->assertCanCreate($user);
        } catch (ValidationException $e) {
            return response()->json([
                'message' => collect($e->errors())->flatten()->first() ?: $e->getMessage(),
                'errors' => $e->errors(),
            ], 422);
        }

        $quote->loadMissing(['items', 'client']);

        if ($quote->status !== 'accepted') {
            return response()->json([
                'message' => 'Seuls les devis au statut « accepté » peuvent être convertis en facture.',
            ], 422);
        }

        $existing = Invoice::query()
            ->where('user_id', $user->id)
            ->where('quote_id', $quote->id)
            ->where('document_type', 'invoice')
            ->first();

        if ($existing) {
            return response()->json([
                'message' => 'Une facture existe déjà pour ce devis.',
                'invoice' => $existing->load(['client:id,name', 'quote:id,number']),
            ], 422);
        }

        $issueDate = now()->toDateString();
        $dueDate = Carbon::parse($issueDate)->addDays(30)->toDateString();
        $number = DocumentNumberGenerator::nextInvoiceNumber($user->id);

        $invoice = $user->invoices()->create([
            'client_id' => $quote->client_id,
            'quote_id' => $quote->id,
            'document_type' => 'invoice',
            'number' => $number,
            'status' => 'draft',
            'issue_date' => $issueDate,
            'due_date' => $dueDate,
            'currency' => $quote->currency,
            'subtotal' => $quote->subtotal,
            'tax_amount' => $quote->tax_amount,
            'total' => $quote->total,
            'discount_percent' => $quote->discount_percent ?? 0,
            'notes' => $quote->notes,
        ]);

        foreach ($quote->items as $index => $item) {
            $invoice->items()->create([
                'description' => $item->description,
                'quantity' => $item->quantity,
                'unit_price' => $item->unit_price,
                'tax_rate' => $item->tax_rate,
                'line_total' => $item->line_total,
                'sort_order' => $item->sort_order ?? $index,
            ]);
        }

        return $invoice->load(['client:id,name', 'quote:id,number', 'payments', 'items']);
    }
}
