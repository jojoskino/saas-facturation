<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
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
                required: ['number', 'subtotal', 'tax_amount', 'total'],
                properties: [
                    new OA\Property(property: 'client_id', type: 'integer', nullable: true),
                    new OA\Property(property: 'quote_id', type: 'integer', nullable: true),
                    new OA\Property(property: 'number', type: 'string'),
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
    public function store(Request $request): JsonResponse
    {
        $userId = $request->user()->id;

        $data = $request->validate([
            'client_id' => ['nullable', Rule::exists('clients', 'id')->where('user_id', $userId)],
            'quote_id' => ['nullable', Rule::exists('quotes', 'id')->where('user_id', $userId)],
            'number' => ['required', 'string', 'max:64', Rule::unique('invoices', 'number')->where('user_id', $userId)],
            'status' => ['nullable', 'string', Rule::in(['draft', 'sent', 'paid', 'overdue', 'cancelled'])],
            'issue_date' => ['nullable', 'date'],
            'due_date' => ['nullable', 'date'],
            'currency' => ['nullable', 'string', 'max:8'],
            'subtotal' => ['required', 'numeric', 'min:0'],
            'tax_amount' => ['required', 'numeric', 'min:0'],
            'total' => ['required', 'numeric', 'min:0'],
            'paid_at' => ['nullable', 'date'],
            'notes' => ['nullable', 'string'],
        ]);

        $invoice = $request->user()->invoices()->create([
            'client_id' => $data['client_id'] ?? null,
            'quote_id' => $data['quote_id'] ?? null,
            'number' => $data['number'],
            'status' => $data['status'] ?? 'draft',
            'issue_date' => $data['issue_date'] ?? null,
            'due_date' => $data['due_date'] ?? null,
            'currency' => $data['currency'] ?? 'XOF',
            'subtotal' => $data['subtotal'],
            'tax_amount' => $data['tax_amount'],
            'total' => $data['total'],
            'paid_at' => $data['paid_at'] ?? null,
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
            ->with(['client', 'quote'])
            ->findOrFail($id);

        return response()->json($invoice);
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
            'number' => ['sometimes', 'required', 'string', 'max:64', Rule::unique('invoices', 'number')->where('user_id', $userId)->ignore($invoice->id)],
            'status' => ['nullable', 'string', Rule::in(['draft', 'sent', 'paid', 'overdue', 'cancelled'])],
            'issue_date' => ['nullable', 'date'],
            'due_date' => ['nullable', 'date'],
            'currency' => ['nullable', 'string', 'max:8'],
            'subtotal' => ['sometimes', 'required', 'numeric', 'min:0'],
            'tax_amount' => ['sometimes', 'required', 'numeric', 'min:0'],
            'total' => ['sometimes', 'required', 'numeric', 'min:0'],
            'paid_at' => ['nullable', 'date'],
            'notes' => ['nullable', 'string'],
        ]);

        $invoice->fill($data);
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
}
