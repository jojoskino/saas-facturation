<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Quote;
use App\Services\DocumentPdfService;
use App\Services\QuoteToInvoiceService;
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

class QuoteController extends Controller
{
    #[OA\Get(
        path: '/api/quotes',
        tags: ['Devis'],
        security: [['sanctum' => []]],
        responses: [
            new OA\Response(response: 200, description: 'Liste paginée (lignes sur GET /quotes/{id} uniquement)'),
        ]
    )]
    public function index(Request $request): JsonResponse
    {
        $userId = $request->user()->id;
        $status = trim((string) $request->query('status', ''));
        $q = trim((string) $request->query('q', ''));

        $query = Quote::query()
            ->where('user_id', $userId)
            ->with(['client:id,name'])
            ->withExists([
                'invoices as has_invoice' => fn ($builder) => $builder->where('document_type', 'invoice'),
            ]);

        if ($status !== '' && $status !== 'all') {
            $query->where('status', $status);
        }

        if ($q !== '') {
            $like = '%'.$q.'%';
            $query->where(function ($sub) use ($like): void {
                $sub->where('number', 'like', $like)
                    ->orWhereHas('client', fn ($client) => $client->where('name', 'like', $like));
            });
        }

        if ($request->boolean('include_items')) {
            $query->with('items');
        }

        $quotes = $query
            ->orderByDesc('id')
            ->paginate(
                ApiListQuery::perPage($request),
                ['*'],
                'page',
                ApiListQuery::page($request)
            );

        return response()->json($quotes);
    }

    #[OA\Post(
        path: '/api/quotes',
        tags: ['Devis'],
        security: [['sanctum' => []]],
        summary: 'Créer un devis (lignes optionnelles : recalcul des totaux)',
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: [],
                properties: [
                    new OA\Property(property: 'client_id', type: 'integer', nullable: true),
                    new OA\Property(property: 'number', type: 'string', nullable: true),
                    new OA\Property(property: 'status', type: 'string', enum: ['draft', 'sent', 'accepted', 'rejected'], nullable: true),
                    new OA\Property(property: 'issue_date', type: 'string', format: 'date', nullable: true),
                    new OA\Property(property: 'valid_until', type: 'string', format: 'date', nullable: true),
                    new OA\Property(property: 'currency', type: 'string', example: 'XOF', nullable: true),
                    new OA\Property(property: 'notes', type: 'string', nullable: true),
                    new OA\Property(
                        property: 'items',
                        type: 'array',
                        items: new OA\Items(
                            properties: [
                                new OA\Property(property: 'description', type: 'string'),
                                new OA\Property(property: 'quantity', type: 'number'),
                                new OA\Property(property: 'unit_price', type: 'number'),
                                new OA\Property(property: 'tax_rate', type: 'number', nullable: true),
                            ],
                            type: 'object'
                        ),
                        nullable: true
                    ),
                ]
            )
        ),
        responses: [
            new OA\Response(response: 201, description: 'Devis créé'),
            new OA\Response(response: 422, description: 'Validation'),
        ]
    )]
    public function store(Request $request): JsonResponse
    {
        $userId = $request->user()->id;

        $data = $request->validate([
            'client_id' => ['nullable', Rule::exists('clients', 'id')->where('user_id', $userId)],
            'number' => ['nullable', 'string', 'max:64', Rule::unique('quotes', 'number')->where('user_id', $userId)],
            'status' => ['nullable', 'string', Rule::in(['draft', 'sent', 'accepted', 'rejected', 'expired'])],
            'discount_percent' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'issue_date' => ['nullable', 'date'],
            'valid_until' => ['nullable', 'date'],
            'currency' => ['nullable', 'string', 'max:8'],
            'notes' => ['nullable', 'string'],
            'items' => ['nullable', 'array'],
            'items.*.description' => ['required_with:items', 'string', 'max:500'],
            'items.*.quantity' => ['required_with:items', 'numeric', 'min:0'],
            'items.*.unit_price' => ['required_with:items', 'numeric', 'min:0'],
            'items.*.tax_rate' => ['nullable', 'numeric', 'min:0', 'max:100'],
        ]);

        $itemsInput = $data['items'] ?? [];
        $discountPercent = (float) ($data['discount_percent'] ?? 0);
        $computed = count($itemsInput) > 0
            ? DocumentMath::quoteLinesFromInput($itemsInput, $discountPercent)
            : ['lines' => [], 'subtotal' => '0.00', 'tax_amount' => '0.00', 'total' => '0.00'];

        $quote = $request->user()->quotes()->create([
            'client_id' => $data['client_id'] ?? null,
            'number' => isset($data['number']) && trim((string) $data['number']) !== '' ? trim((string) $data['number']) : DocumentNumberGenerator::nextQuoteNumber($userId),
            'status' => $data['status'] ?? 'draft',
            'issue_date' => isset($data['issue_date']) && $data['issue_date'] ? Carbon::parse($data['issue_date'])->toDateString() : now()->toDateString(),
            'valid_until' => isset($data['valid_until']) && $data['valid_until']
                ? Carbon::parse($data['valid_until'])->toDateString()
                : now()->addDays(30)->toDateString(),
            'currency' => $data['currency'] ?? 'XOF',
            'subtotal' => $computed['subtotal'],
            'tax_amount' => $computed['tax_amount'],
            'total' => $computed['total'],
            'discount_percent' => $discountPercent,
            'notes' => $data['notes'] ?? null,
        ]);

        foreach ($computed['lines'] as $line) {
            $quote->items()->create($line);
        }

        $quote->load(['client:id,name', 'items']);
        UserAnalyticsCache::bust((int) $userId);

        return response()->json($quote, 201);
    }

    #[OA\Get(
        path: '/api/quotes/{id}',
        tags: ['Devis'],
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
        $quote = Quote::query()
            ->where('user_id', $request->user()->id)
            ->with(['client', 'items'])
            ->findOrFail($id);

        return response()->json($quote);
    }

    #[OA\Put(
        path: '/api/quotes/{id}',
        tags: ['Devis'],
        security: [['sanctum' => []]],
        summary: 'Mettre à jour (si `items` est envoyé, lignes remplacées et totaux recalculés)',
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        ],
        requestBody: new OA\RequestBody(
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'client_id', type: 'integer', nullable: true),
                    new OA\Property(property: 'number', type: 'string'),
                    new OA\Property(property: 'status', type: 'string', nullable: true),
                    new OA\Property(property: 'issue_date', type: 'string', format: 'date', nullable: true),
                    new OA\Property(property: 'valid_until', type: 'string', format: 'date', nullable: true),
                    new OA\Property(property: 'currency', type: 'string', nullable: true),
                    new OA\Property(property: 'notes', type: 'string', nullable: true),
                    new OA\Property(property: 'items', type: 'array', nullable: true, items: new OA\Items(type: 'object')),
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

        $quote = Quote::query()
            ->where('user_id', $userId)
            ->withCount(['invoices as has_invoice' => fn ($builder) => $builder->where('document_type', 'invoice')])
            ->findOrFail($id);

        $this->assertQuoteMutable($quote);

        $data = $request->validate([
            'client_id' => ['nullable', Rule::exists('clients', 'id')->where('user_id', $userId)],
            'number' => ['sometimes', 'nullable', 'string', 'max:64', Rule::unique('quotes', 'number')->where('user_id', $userId)->ignore($quote->id)],
            'status' => ['nullable', 'string', Rule::in(['draft', 'sent', 'accepted', 'rejected', 'expired'])],
            'discount_percent' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'issue_date' => ['nullable', 'date'],
            'valid_until' => ['nullable', 'date'],
            'currency' => ['nullable', 'string', 'max:8'],
            'notes' => ['nullable', 'string'],
            'items' => ['sometimes', 'array'],
            'items.*.description' => ['required_with:items', 'string', 'max:500'],
            'items.*.quantity' => ['required_with:items', 'numeric', 'min:0'],
            'items.*.unit_price' => ['required_with:items', 'numeric', 'min:0'],
            'items.*.tax_rate' => ['nullable', 'numeric', 'min:0', 'max:100'],
        ]);

        $quote->fill([
            'client_id' => array_key_exists('client_id', $data) ? $data['client_id'] : $quote->client_id,
            'number' => array_key_exists('number', $data)
                ? (trim((string) ($data['number'] ?? '')) !== '' ? trim((string) $data['number']) : DocumentNumberGenerator::nextQuoteNumber($userId, $quote->id))
                : $quote->number,
            'status' => $data['status'] ?? $quote->status,
            'discount_percent' => array_key_exists('discount_percent', $data) ? (float) $data['discount_percent'] : $quote->discount_percent,
            'issue_date' => array_key_exists('issue_date', $data) ? $data['issue_date'] : $quote->issue_date,
            'valid_until' => array_key_exists('valid_until', $data) ? $data['valid_until'] : $quote->valid_until,
            'currency' => $data['currency'] ?? $quote->currency,
            'notes' => array_key_exists('notes', $data) ? $data['notes'] : $quote->notes,
        ]);

        if (array_key_exists('items', $data)) {
            $discountPercent = (float) ($quote->discount_percent ?? 0);
            $computed = count($data['items']) > 0
                ? DocumentMath::quoteLinesFromInput($data['items'], $discountPercent)
                : ['lines' => [], 'subtotal' => '0.00', 'tax_amount' => '0.00', 'total' => '0.00'];

            $quote->items()->delete();
            foreach ($computed['lines'] as $line) {
                $quote->items()->create($line);
            }
            $quote->subtotal = $computed['subtotal'];
            $quote->tax_amount = $computed['tax_amount'];
            $quote->total = $computed['total'];
        }

        $quote->save();
        $quote->load(['client', 'items']);
        UserAnalyticsCache::bust($userId);

        return response()->json($quote);
    }

    public function convertToInvoice(Request $request, string $id, QuoteToInvoiceService $converter): JsonResponse
    {
        $quote = Quote::query()
            ->where('user_id', $request->user()->id)
            ->findOrFail($id);

        $result = $converter->convert($request->user(), $quote);

        if ($result instanceof JsonResponse) {
            return $result;
        }

        UserAnalyticsCache::bust((int) $request->user()->id);

        return response()->json([
            'message' => 'Facture créée à partir du devis.',
            'invoice' => $result,
        ], 201);
    }

    public function preview(Request $request, string $id, DocumentPdfService $pdfService): \Symfony\Component\HttpFoundation\Response
    {
        $quote = Quote::query()
            ->where('user_id', $request->user()->id)
            ->findOrFail($id);

        try {
            return $pdfService->quotePreview($quote, $request->user());
        } catch (\Throwable) {
            return response()->json(['message' => 'Aperçu indisponible pour ce document.'], 500);
        }
    }

    public function pdf(Request $request, string $id, DocumentPdfService $pdfService): \Symfony\Component\HttpFoundation\Response
    {
        $quote = Quote::query()
            ->where('user_id', $request->user()->id)
            ->findOrFail($id);

        return $pdfService->quotePdf($quote, $request->user());
    }

    #[OA\Delete(
        path: '/api/quotes/{id}',
        tags: ['Devis'],
        security: [['sanctum' => []]],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        ],
        responses: [
            new OA\Response(response: 204, description: 'Supprimé'),
        ]
    )]
    public function destroy(Request $request, string $id): Response
    {
        $quote = Quote::query()
            ->where('user_id', $request->user()->id)
            ->withCount(['invoices as has_invoice' => fn ($builder) => $builder->where('document_type', 'invoice')])
            ->findOrFail($id);

        $this->assertQuoteMutable($quote);

        $quote->delete();
        UserAnalyticsCache::bust((int) $request->user()->id);

        return response()->noContent();
    }

    private function assertQuoteMutable(Quote $quote): void
    {
        if ((int) ($quote->has_invoice ?? 0) > 0) {
            throw ValidationException::withMessages([
                'quote' => ['Ce devis est lié à une facture et ne peut plus être modifié ou supprimé.'],
            ]);
        }
    }
}
