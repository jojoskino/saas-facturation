<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\InvoiceQuotaService;
use App\Models\Invoice;
use App\Services\DocumentPdfService;
use App\Services\InvoiceDocumentRules;
use App\Services\InvoicePaymentSync;
use App\Support\ApiListQuery;
use App\Support\DocumentMath;
use App\Support\DocumentNumberGenerator;
use App\Support\UserAnalyticsCache;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use OpenApi\Attributes as OA;

class InvoiceController extends Controller
{
    public function __construct(
        private readonly InvoicePaymentSync $paymentSync,
        private readonly InvoiceDocumentRules $documentRules,
    ) {}

    #[OA\Get(
        path: '/api/invoices',
        tags: ['Factures'],
        security: [['sanctum' => []]],
        responses: [
            new OA\Response(response: 200, description: 'Liste paginée'),
        ]
    )]
    public function index(Request $request): JsonResponse
    {
        $userId = $request->user()->id;
        $status = trim((string) $request->query('status', ''));
        $q = trim((string) $request->query('q', ''));

        $query = Invoice::query()
            ->where('user_id', $userId)
            ->with(['client:id,name', 'quote:id,number']);

        $documentType = (string) $request->query('document_type', 'invoice');
        if ($documentType === 'all') {
            $query->whereIn('document_type', ['invoice', 'credit_note']);
        } else {
            $query->where('document_type', $documentType);
        }

        if ($status !== '' && $status !== 'all') {
            $query->where('status', $status);
        }

        if ($q !== '') {
            $like = '%'.$q.'%';
            $query->where(function ($sub) use ($like): void {
                $sub->where('number', 'like', $like)
                    ->orWhereHas('client', fn ($client) => $client->where('name', 'like', $like))
                    ->orWhereHas('quote', fn ($quote) => $quote->where('number', 'like', $like));
            });
        }

        $invoices = $query
            ->withSum('payments as paid_total', 'amount')
            ->withCount(['creditNotes as credit_notes_count' => fn ($builder) => $builder->where('document_type', 'credit_note')])
            ->with(['parentInvoice:id,number'])
            ->orderByDesc('id')
            ->paginate(
                ApiListQuery::perPage($request),
                ['*'],
                'page',
                ApiListQuery::page($request)
            );

        return response()->json($invoices);
    }

    #[OA\Post(
        path: '/api/invoices',
        tags: ['Factures'],
        security: [['sanctum' => []]],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['subtotal', 'tax_amount'],
                properties: [
                    new OA\Property(property: 'client_id', type: 'integer', nullable: true),
                    new OA\Property(property: 'quote_id', type: 'integer', nullable: true),
                    new OA\Property(property: 'number', type: 'string', nullable: true),
                    new OA\Property(property: 'status', type: 'string', enum: ['draft', 'sent', 'paid', 'overdue', 'cancelled'], nullable: true),
                    new OA\Property(property: 'issue_date', type: 'string', format: 'date', nullable: true),
                    new OA\Property(property: 'due_date', type: 'string', format: 'date', nullable: true),
                    new OA\Property(property: 'currency', type: 'string', example: 'XOF', nullable: true),
                    new OA\Property(property: 'subtotal', type: 'number'),
                    new OA\Property(property: 'tax_amount', type: 'number'),
                    new OA\Property(property: 'total', type: 'number'),
                    new OA\Property(property: 'paid_at', type: 'string', format: 'date-time', nullable: true),
                    new OA\Property(property: 'notes', type: 'string', nullable: true),
                ]
            )
        ),
        responses: [
            new OA\Response(response: 201, description: 'Facture créée'),
        ]
    )]
    public function store(Request $request, InvoiceQuotaService $quota): JsonResponse
    {
        $quota->assertCanCreate($request->user());

        $userId = $request->user()->id;

        $data = $request->validate([
            'client_id' => ['nullable', Rule::exists('clients', 'id')->where('user_id', $userId)],
            'quote_id' => ['nullable', Rule::exists('quotes', 'id')->where('user_id', $userId)],
            'number' => ['nullable', 'string', 'max:64', Rule::unique('invoices', 'number')->where('user_id', $userId)],
            'status' => ['nullable', 'string', Rule::in(['draft', 'sent', 'paid', 'overdue', 'cancelled'])],
            'issue_date' => ['nullable', 'date'],
            'due_date' => ['nullable', 'date'],
            'currency' => ['nullable', 'string', 'max:8'],
            'subtotal' => ['required', 'numeric', 'min:0'],
            'tax_amount' => ['required', 'numeric', 'min:0'],
            'total' => ['nullable', 'numeric', 'min:0'],
            'paid_at' => ['nullable', 'date'],
            'discount_percent' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'notes' => ['nullable', 'string'],
            'items' => ['nullable', 'array'],
            'items.*.description' => ['required_with:items', 'string', 'max:500'],
            'items.*.quantity' => ['required_with:items', 'numeric', 'min:0'],
            'items.*.unit_price' => ['required_with:items', 'numeric', 'min:0'],
            'items.*.tax_rate' => ['nullable', 'numeric', 'min:0', 'max:100'],
        ]);

        $amounts = $this->resolveAmountsFromInput($data);
        if (empty($data['quote_id']) && count($amounts['lines']) === 0 && (float) $amounts['total'] <= 0.001) {
            throw ValidationException::withMessages([
                'items' => ['Ajoutez au moins une ligne de prestation ou sélectionnez un devis source.'],
            ]);
        }

        $data['subtotal'] = $amounts['subtotal'];
        $data['tax_amount'] = $amounts['tax_amount'];
        $data['total'] = $amounts['total'];

        if (($data['status'] ?? null) === 'paid') {
            $this->paymentSync->assertCanMarkAsPaid(
                new Invoice(['total' => $this->previewTotal($data)]),
            );
        }

        $computed = $this->buildComputedInvoiceData($data);

        $invoice = $request->user()->invoices()->create([
            'client_id' => $data['client_id'] ?? null,
            'quote_id' => $data['quote_id'] ?? null,
            'number' => $computed['number'],
            'status' => $computed['status'],
            'issue_date' => $computed['issue_date'],
            'due_date' => $computed['due_date'],
            'currency' => $data['currency'] ?? 'XOF',
            'subtotal' => $computed['subtotal'],
            'tax_amount' => $computed['tax_amount'],
            'total' => $computed['total'],
            'paid_at' => $computed['paid_at'],
            'discount_percent' => (float) ($data['discount_percent'] ?? 0),
            'notes' => $data['notes'] ?? null,
        ]);

        $this->syncInvoiceItems($invoice, $amounts['lines']);

        $invoice->load(['client:id,name', 'quote:id,number', 'items']);
        UserAnalyticsCache::bust((int) $userId);

        return response()->json($invoice, 201);
    }

    #[OA\Get(
        path: '/api/invoices/{id}',
        tags: ['Factures'],
        security: [['sanctum' => []]],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Détail'),
        ]
    )]
    public function show(Request $request, string $id): JsonResponse
    {
        $invoice = Invoice::query()
            ->where('user_id', $request->user()->id)
            ->with(['client', 'quote', 'payments', 'items'])
            ->findOrFail($id);

        $paid = (float) $invoice->payments->sum('amount');

        return response()->json([
            ...$invoice->toArray(),
            'paid_total' => $paid,
            'balance_due' => max(0, round((float) $invoice->total - $paid, 2)),
        ]);
    }

    public function preview(Request $request, string $id, DocumentPdfService $pdfService): \Symfony\Component\HttpFoundation\Response
    {
        $invoice = Invoice::query()
            ->where('user_id', $request->user()->id)
            ->findOrFail($id);

        try {
            return $pdfService->invoicePreview($invoice, $request->user());
        } catch (\Throwable) {
            return response()->json(['message' => 'Aperçu indisponible pour ce document.'], 500);
        }
    }

    public function pdf(Request $request, string $id, DocumentPdfService $pdfService): \Symfony\Component\HttpFoundation\Response
    {
        $invoice = Invoice::query()
            ->where('user_id', $request->user()->id)
            ->findOrFail($id);

        return $pdfService->invoicePdf($invoice, $request->user());
    }

    public function createCreditNote(Request $request, string $id): JsonResponse
    {
        $userId = $request->user()->id;
        $invoice = Invoice::query()
            ->where('user_id', $userId)
            ->where('document_type', 'invoice')
            ->findOrFail($id);

        $this->documentRules->assertCanCreateCreditNote($invoice);

        $credit = $request->user()->invoices()->create([
            'client_id' => $invoice->client_id,
            'quote_id' => $invoice->quote_id,
            'parent_invoice_id' => $invoice->id,
            'document_type' => 'credit_note',
            'number' => DocumentNumberGenerator::nextCreditNoteNumber($userId),
            'status' => 'sent',
            'issue_date' => now()->toDateString(),
            'due_date' => now()->toDateString(),
            'currency' => $invoice->currency,
            'subtotal' => $invoice->subtotal,
            'tax_amount' => $invoice->tax_amount,
            'total' => $invoice->total,
            'notes' => 'Avoir relatif à la facture '.$invoice->number,
        ]);

        $invoice->loadMissing(['items', 'quote.items']);
        $sourceLines = $invoice->items->isNotEmpty()
            ? $invoice->items
            : ($invoice->quote?->items ?? collect());

        foreach ($sourceLines as $index => $line) {
            $credit->items()->create([
                'description' => $line->description,
                'quantity' => $line->quantity,
                'unit_price' => $line->unit_price,
                'tax_rate' => $line->tax_rate,
                'line_total' => $line->line_total,
                'sort_order' => $line->sort_order ?? $index,
            ]);
        }

        $invoice->update(['status' => 'cancelled']);

        UserAnalyticsCache::bust($userId);

        return response()->json([
            'message' => 'Avoir créé.',
            'credit_note' => $credit->load(['client:id,name', 'parentInvoice:id,number']),
        ], 201);
    }

    #[OA\Put(
        path: '/api/invoices/{id}',
        tags: ['Factures'],
        security: [['sanctum' => []]],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        ],
        requestBody: new OA\RequestBody(
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'client_id', type: 'integer', nullable: true),
                    new OA\Property(property: 'quote_id', type: 'integer', nullable: true),
                    new OA\Property(property: 'number', type: 'string'),
                    new OA\Property(property: 'status', type: 'string', nullable: true),
                    new OA\Property(property: 'issue_date', type: 'string', format: 'date', nullable: true),
                    new OA\Property(property: 'due_date', type: 'string', format: 'date', nullable: true),
                    new OA\Property(property: 'currency', type: 'string', nullable: true),
                    new OA\Property(property: 'subtotal', type: 'number'),
                    new OA\Property(property: 'tax_amount', type: 'number'),
                    new OA\Property(property: 'total', type: 'number'),
                    new OA\Property(property: 'paid_at', type: 'string', nullable: true),
                    new OA\Property(property: 'notes', type: 'string', nullable: true),
                ]
            )
        ),
        responses: [
            new OA\Response(response: 200, description: 'Mis à jour'),
        ]
    )]
    public function update(Request $request, string $id): JsonResponse
    {
        $userId = $request->user()->id;

        $invoice = Invoice::query()
            ->where('user_id', $userId)
            ->with('payments')
            ->findOrFail($id);

        if ($invoice->document_type === 'credit_note') {
            return response()->json(['message' => 'Un avoir ne peut pas être modifié.'], 422);
        }

        $data = $request->validate([
            'client_id' => ['nullable', Rule::exists('clients', 'id')->where('user_id', $userId)],
            'quote_id' => ['nullable', Rule::exists('quotes', 'id')->where('user_id', $userId)],
            'number' => ['sometimes', 'nullable', 'string', 'max:64', Rule::unique('invoices', 'number')->where('user_id', $userId)->ignore($invoice->id)],
            'status' => ['nullable', 'string', Rule::in(['draft', 'sent', 'paid', 'overdue', 'cancelled'])],
            'issue_date' => ['nullable', 'date'],
            'due_date' => ['nullable', 'date'],
            'currency' => ['nullable', 'string', 'max:8'],
            'subtotal' => ['sometimes', 'required', 'numeric', 'min:0'],
            'tax_amount' => ['sometimes', 'required', 'numeric', 'min:0'],
            'total' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'paid_at' => ['nullable', 'date'],
            'discount_percent' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'notes' => ['nullable', 'string'],
            'items' => ['sometimes', 'array'],
            'items.*.description' => ['required_with:items', 'string', 'max:500'],
            'items.*.quantity' => ['required_with:items', 'numeric', 'min:0'],
            'items.*.unit_price' => ['required_with:items', 'numeric', 'min:0'],
            'items.*.tax_rate' => ['nullable', 'numeric', 'min:0', 'max:100'],
        ]);

        $this->documentRules->assertCanUpdate($invoice, $data);

        if (array_key_exists('items', $data)) {
            $amounts = $this->resolveAmountsFromInput(array_merge($invoice->toArray(), $data));
            $data['subtotal'] = $amounts['subtotal'];
            $data['tax_amount'] = $amounts['tax_amount'];
            $data['total'] = $amounts['total'];
        }

        $merged = [
            'number' => array_key_exists('number', $data) ? $data['number'] : $invoice->number,
            'status' => array_key_exists('status', $data) ? $data['status'] : $invoice->status,
            'issue_date' => array_key_exists('issue_date', $data) ? $data['issue_date'] : optional($invoice->issue_date)->toDateString(),
            'due_date' => array_key_exists('due_date', $data) ? $data['due_date'] : optional($invoice->due_date)->toDateString(),
            'subtotal' => array_key_exists('subtotal', $data) ? $data['subtotal'] : $invoice->subtotal,
            'tax_amount' => array_key_exists('tax_amount', $data) ? $data['tax_amount'] : $invoice->tax_amount,
            'total' => array_key_exists('total', $data) ? $data['total'] : $invoice->total,
            'paid_at' => array_key_exists('paid_at', $data) ? $data['paid_at'] : optional($invoice->paid_at)->toDateString(),
        ];

        $computed = $this->buildComputedInvoiceData($merged, $invoice->id, $invoice->status);

        $requestedStatus = $data['status'] ?? null;
        if ($requestedStatus === 'paid') {
            $this->paymentSync->assertCanMarkAsPaid($invoice, (float) $computed['total']);
        }

        if ($requestedStatus === 'paid') {
            $computed['status'] = 'paid';
            $computed['paid_at'] = isset($data['paid_at']) && $data['paid_at']
                ? Carbon::parse($data['paid_at'])->toDateString()
                : ($invoice->payments->max('paid_at')?->toDateString() ?? now()->toDateString());
        } elseif (array_key_exists('paid_at', $data)) {
            unset($data['paid_at']);
        }

        $payload = $data;
        $payload['number'] = $computed['number'];
        $payload['status'] = $computed['status'];
        $payload['issue_date'] = $computed['issue_date'];
        $payload['due_date'] = $computed['due_date'];
        $payload['subtotal'] = $computed['subtotal'];
        $payload['tax_amount'] = $computed['tax_amount'];
        $payload['total'] = $computed['total'];
        $payload['paid_at'] = $computed['paid_at'];

        $invoice->fill($payload);
        $invoice->save();

        if (array_key_exists('items', $data)) {
            $amounts = $this->resolveAmountsFromInput(array_merge($invoice->fresh()->toArray(), $data));
            $this->syncInvoiceItems($invoice, $amounts['lines']);
        }

        $invoice->load(['client', 'quote', 'payments', 'items']);
        $this->paymentSync->syncStatus($invoice);
        $invoice->refresh();
        UserAnalyticsCache::bust($userId);

        return response()->json($invoice);
    }

    #[OA\Delete(
        path: '/api/invoices/{id}',
        tags: ['Factures'],
        security: [['sanctum' => []]],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        ],
        responses: [
            new OA\Response(response: 204, description: 'Supprimée'),
        ]
    )]
    public function destroy(Request $request, string $id): Response
    {
        $invoice = Invoice::query()
            ->where('user_id', $request->user()->id)
            ->with('payments')
            ->findOrFail($id);

        $this->documentRules->assertCanDelete($invoice);

        $invoice->delete();
        UserAnalyticsCache::bust((int) $request->user()->id);

        return response()->noContent();
    }

    private function buildComputedInvoiceData(array $data, ?int $ignoreInvoiceId = null, ?string $currentStatus = null): array
    {
        $issueDate = isset($data['issue_date']) && $data['issue_date']
            ? Carbon::parse($data['issue_date'])->toDateString()
            : now()->toDateString();

        $dueDate = isset($data['due_date']) && $data['due_date']
            ? Carbon::parse($data['due_date'])->toDateString()
            : Carbon::parse($issueDate)->addDays(30)->toDateString();

        $subtotal = round((float) ($data['subtotal'] ?? 0), 2);
        $taxAmount = round((float) ($data['tax_amount'] ?? 0), 2);
        $hasProvidedTotal = isset($data['total']) && $data['total'] !== null && $data['total'] !== '';
        $total = $hasProvidedTotal ? round((float) $data['total'], 2) : round($subtotal + $taxAmount, 2);

        $requestedStatus = $data['status'] ?? null;
        $status = $this->resolveStatus($requestedStatus, $dueDate, $currentStatus);
        $paidAt = null;

        $number = isset($data['number']) && trim((string) $data['number']) !== ''
            ? trim((string) $data['number'])
            : DocumentNumberGenerator::nextInvoiceNumber((int) auth()->id(), $ignoreInvoiceId);

        return [
            'number' => $number,
            'status' => $status,
            'issue_date' => $issueDate,
            'due_date' => $dueDate,
            'subtotal' => $subtotal,
            'tax_amount' => $taxAmount,
            'total' => $total,
            'paid_at' => $paidAt,
        ];
    }

    private function previewTotal(array $data): float
    {
        $subtotal = round((float) ($data['subtotal'] ?? 0), 2);
        $taxAmount = round((float) ($data['tax_amount'] ?? 0), 2);
        $hasProvidedTotal = isset($data['total']) && $data['total'] !== null && $data['total'] !== '';

        return $hasProvidedTotal ? round((float) $data['total'], 2) : round($subtotal + $taxAmount, 2);
    }

    private function resolveStatus(?string $requestedStatus, string $dueDate, ?string $currentStatus = null): string
    {
        if ($requestedStatus === 'cancelled') {
            return 'cancelled';
        }

        if ($requestedStatus === 'paid') {
            return 'sent';
        }

        if ($requestedStatus === 'draft' || ($requestedStatus === null && ($currentStatus === 'draft' || $currentStatus === null))) {
            return 'draft';
        }

        $hasDueDatePassed = Carbon::parse($dueDate)->isPast() && ! Carbon::parse($dueDate)->isToday();

        if ($requestedStatus === 'overdue' || ($hasDueDatePassed && in_array($requestedStatus, ['sent', 'overdue'], true))) {
            return 'overdue';
        }

        if ($requestedStatus === 'sent') {
            return $hasDueDatePassed ? 'overdue' : 'sent';
        }

        if ($currentStatus && in_array($currentStatus, ['sent', 'overdue', 'paid'], true)) {
            return $currentStatus;
        }

        return 'draft';
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array{lines: list<array<string, mixed>>, subtotal: string, tax_amount: string, total: string}
     */
    private function resolveAmountsFromInput(array $data): array
    {
        $itemsInput = $data['items'] ?? [];
        $discountPercent = (float) ($data['discount_percent'] ?? 0);

        if (is_array($itemsInput) && count($itemsInput) > 0) {
            $validRows = array_values(array_filter($itemsInput, function ($row): bool {
                return trim((string) ($row['description'] ?? '')) !== '';
            }));

            if (count($validRows) > 0) {
                return DocumentMath::quoteLinesFromInput($validRows, $discountPercent);
            }
        }

        $subtotal = round((float) ($data['subtotal'] ?? 0), 2);
        $taxAmount = round((float) ($data['tax_amount'] ?? 0), 2);
        $total = isset($data['total']) && $data['total'] !== null && $data['total'] !== ''
            ? round((float) $data['total'], 2)
            : round($subtotal + $taxAmount, 2);

        return [
            'lines' => [],
            'subtotal' => number_format($subtotal, 2, '.', ''),
            'tax_amount' => number_format($taxAmount, 2, '.', ''),
            'total' => number_format($total, 2, '.', ''),
        ];
    }

    /**
     * @param  list<array<string, mixed>>  $lines
     */
    private function syncInvoiceItems(Invoice $invoice, array $lines): void
    {
        $invoice->items()->delete();
        foreach ($lines as $line) {
            $invoice->items()->create($line);
        }
    }
}
