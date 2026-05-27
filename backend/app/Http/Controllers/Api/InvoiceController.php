<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\InvoiceQuotaService;
use App\Models\Invoice;
use App\Services\DocumentPdfService;
use App\Support\DocumentNumberGenerator;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Validation\Rule;
use OpenApi\Attributes as OA;

class InvoiceController extends Controller
{
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
        $invoices = Invoice::query()
            ->where('user_id', $request->user()->id)
            ->with(['client:id,name', 'quote:id,number'])
            ->orderByDesc('id')
            ->paginate(25);

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
            'notes' => ['nullable', 'string'],
        ]);

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
            'notes' => $data['notes'] ?? null,
        ]);

        $invoice->load(['client:id,name', 'quote:id,number']);

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
            ->with(['client', 'quote', 'payments'])
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

        return $pdfService->invoicePreview($invoice, $request->user());
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
            ->findOrFail($id);

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
            'notes' => ['nullable', 'string'],
        ]);

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

        $computed = $this->buildComputedInvoiceData($merged, $invoice->id);

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
        $invoice->load(['client', 'quote']);

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
            ->findOrFail($id);

        $invoice->delete();

        return response()->noContent();
    }

    private function buildComputedInvoiceData(array $data, ?int $ignoreInvoiceId = null): array
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

        $status = $this->resolveStatus($data['status'] ?? null, $dueDate, $data['paid_at'] ?? null);

        $paidAt = isset($data['paid_at']) && $data['paid_at']
            ? Carbon::parse($data['paid_at'])->toDateString()
            : null;
        if ($status === 'paid' && $paidAt === null) {
            $paidAt = now()->toDateString();
        }
        if ($status !== 'paid') {
            $paidAt = null;
        }

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

    private function resolveStatus(?string $requestedStatus, string $dueDate, ?string $paidAt): string
    {
        if ($requestedStatus === 'cancelled') {
            return 'cancelled';
        }

        if ($requestedStatus === 'paid' || $paidAt) {
            return 'paid';
        }

        $hasDueDatePassed = Carbon::parse($dueDate)->isPast() && ! Carbon::parse($dueDate)->isToday();
        if ($requestedStatus === 'overdue' || $hasDueDatePassed) {
            return 'overdue';
        }

        if ($requestedStatus === 'sent') {
            return 'sent';
        }

        return 'draft';
    }

}
