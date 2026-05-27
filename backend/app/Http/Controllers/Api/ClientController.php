<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Client;
use App\Models\Invoice;
use App\Models\Quote;
use App\Support\PlanFeatures;
use App\Support\Utf8;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use OpenApi\Attributes as OA;

class ClientController extends Controller
{
    #[OA\Get(
        path: '/api/clients',
        tags: ['Clients'],
        security: [['sanctum' => []]],
        responses: [
            new OA\Response(response: 200, description: 'Liste paginée'),
        ]
    )]
    public function index(Request $request): JsonResponse
    {
        $q = trim((string) $request->query('q', ''));
        $perPage = (int) $request->query('per_page', 25);
        $perPage = max(1, min($perPage, 100));

        $clients = Client::query()
            ->where('user_id', $request->user()->id)
            ->when($q !== '', function ($builder) use ($q): void {
                $builder->where(function ($sub) use ($q): void {
                    $sub->where('name', 'like', "%{$q}%")
                        ->orWhere('first_name', 'like', "%{$q}%")
                        ->orWhere('last_name', 'like', "%{$q}%")
                        ->orWhere('email', 'like', "%{$q}%")
                        ->orWhere('phone', 'like', "%{$q}%")
                        ->orWhere('company', 'like', "%{$q}%")
                        ->orWhere('tax_id', 'like', "%{$q}%")
                        ->orWhere('address', 'like', "%{$q}%")
                        ->orWhere('notes', 'like', "%{$q}%");
                });
            })
            ->orderByDesc('created_at')
            ->paginate($perPage);

        $clients->setCollection(
            $clients->getCollection()->map(
                fn (Client $client): array => $this->clientPayload($client)
            )
        );

        return response()->json(
            $clients,
            200,
            [],
            JSON_INVALID_UTF8_SUBSTITUTE | JSON_UNESCAPED_UNICODE
        );
    }

    #[OA\Post(
        path: '/api/clients',
        tags: ['Clients'],
        security: [['sanctum' => []]],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['first_name', 'last_name', 'email', 'phone', 'company'],
                properties: [
                    new OA\Property(property: 'first_name', type: 'string'),
                    new OA\Property(property: 'last_name', type: 'string'),
                    new OA\Property(property: 'name', type: 'string', nullable: true),
                    new OA\Property(property: 'email', type: 'string'),
                    new OA\Property(property: 'phone', type: 'string'),
                    new OA\Property(property: 'company', type: 'string'),
                    new OA\Property(property: 'address', type: 'string', nullable: true),
                    new OA\Property(property: 'tax_id', type: 'string', nullable: true),
                    new OA\Property(property: 'notes', type: 'string', nullable: true),
                ]
            )
        ),
        responses: [
            new OA\Response(response: 201, description: 'Client créé'),
            new OA\Response(response: 422, description: 'Validation'),
        ]
    )]
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'first_name' => ['required', 'string', 'max:120', "regex:/^[\pL\s'\-]+$/u"],
            'last_name' => ['required', 'string', 'max:120', "regex:/^[\pL\s'\-]+$/u"],
            'email' => ['required', 'email', 'max:255'],
            'phone' => ['required', 'string', 'max:32', 'regex:/^\+?[0-9\s\-().]{8,20}$/'],
            'company' => ['required', 'string', 'max:255', "regex:/^[\pL0-9\s'&().,\-]+$/u"],
            'address' => ['nullable', 'string'],
            'tax_id' => ['nullable', 'string', 'max:128', 'regex:/^[A-Za-z0-9\-_\/. ]+$/'],
            'notes' => ['nullable', 'string'],
        ], [
            'first_name.required' => 'Le prénom du client est obligatoire.',
            'first_name.max' => 'Le prénom ne doit pas dépasser :max caractères.',
            'first_name.regex' => 'Le prénom ne doit contenir que des lettres.',
            'last_name.required' => 'Le nom du client est obligatoire.',
            'last_name.max' => 'Le nom ne doit pas dépasser :max caractères.',
            'last_name.regex' => 'Le nom ne doit contenir que des lettres.',
            'email.required' => "L'adresse e-mail est obligatoire.",
            'email.email' => "L'adresse e-mail n'est pas valide.",
            'email.max' => "L'adresse e-mail ne doit pas dépasser :max caractères.",
            'phone.required' => 'Le téléphone est obligatoire.',
            'phone.max' => 'Le téléphone ne doit pas dépasser :max caractères.',
            'phone.regex' => 'Le téléphone ne doit contenir que des chiffres et séparateurs valides.',
            'company.required' => "Le nom de l'entreprise est obligatoire.",
            'company.max' => "Le nom de l'entreprise ne doit pas dépasser :max caractères.",
            'company.regex' => "Le nom de l'entreprise contient des caractères invalides.",
            'tax_id.max' => "L'identifiant fiscal ne doit pas dépasser :max caractères.",
            'tax_id.regex' => "L'identifiant fiscal contient des caractères invalides.",
        ]);

        $data = $this->sanitizePayload($data);
        $client = $request->user()->clients()->create($data);

        return response()->json(
            $this->clientPayload($client),
            201,
            [],
            JSON_INVALID_UTF8_SUBSTITUTE | JSON_UNESCAPED_UNICODE
        );
    }

    #[OA\Get(
        path: '/api/clients/{id}',
        tags: ['Clients'],
        security: [['sanctum' => []]],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Détail'),
            new OA\Response(response: 404, description: 'Introuvable'),
        ]
    )]
    public function show(Request $request, string $id): JsonResponse
    {
        $client = Client::query()
            ->where('user_id', $request->user()->id)
            ->findOrFail($id);

        return response()->json(
            $this->clientPayload($client),
            200,
            [],
            JSON_INVALID_UTF8_SUBSTITUTE | JSON_UNESCAPED_UNICODE
        );
    }

    #[OA\Put(
        path: '/api/clients/{id}',
        tags: ['Clients'],
        security: [['sanctum' => []]],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        ],
        requestBody: new OA\RequestBody(
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'first_name', type: 'string'),
                    new OA\Property(property: 'last_name', type: 'string'),
                    new OA\Property(property: 'name', type: 'string', nullable: true),
                    new OA\Property(property: 'email', type: 'string', nullable: true),
                    new OA\Property(property: 'phone', type: 'string', nullable: true),
                    new OA\Property(property: 'company', type: 'string', nullable: true),
                    new OA\Property(property: 'address', type: 'string', nullable: true),
                    new OA\Property(property: 'tax_id', type: 'string', nullable: true),
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
        $client = Client::query()
            ->where('user_id', $request->user()->id)
            ->findOrFail($id);

        $data = $request->validate([
            'first_name' => ['required', 'string', 'max:120', "regex:/^[\pL\s'\-]+$/u"],
            'last_name' => ['required', 'string', 'max:120', "regex:/^[\pL\s'\-]+$/u"],
            'email' => ['required', 'email', 'max:255'],
            'phone' => ['required', 'string', 'max:32', 'regex:/^\+?[0-9\s\-().]{8,20}$/'],
            'company' => ['required', 'string', 'max:255', "regex:/^[\pL0-9\s'&().,\-]+$/u"],
            'address' => ['nullable', 'string'],
            'tax_id' => ['nullable', 'string', 'max:128', 'regex:/^[A-Za-z0-9\-_\/. ]+$/'],
            'notes' => ['nullable', 'string'],
        ], [
            'first_name.required' => 'Le prénom du client est obligatoire.',
            'first_name.max' => 'Le prénom ne doit pas dépasser :max caractères.',
            'first_name.regex' => 'Le prénom ne doit contenir que des lettres.',
            'last_name.required' => 'Le nom du client est obligatoire.',
            'last_name.max' => 'Le nom ne doit pas dépasser :max caractères.',
            'last_name.regex' => 'Le nom ne doit contenir que des lettres.',
            'email.required' => "L'adresse e-mail est obligatoire.",
            'email.email' => "L'adresse e-mail n'est pas valide.",
            'email.max' => "L'adresse e-mail ne doit pas dépasser :max caractères.",
            'phone.required' => 'Le téléphone est obligatoire.',
            'phone.max' => 'Le téléphone ne doit pas dépasser :max caractères.',
            'phone.regex' => 'Le téléphone ne doit contenir que des chiffres et séparateurs valides.',
            'company.required' => "Le nom de l'entreprise est obligatoire.",
            'company.max' => "Le nom de l'entreprise ne doit pas dépasser :max caractères.",
            'company.regex' => "Le nom de l'entreprise contient des caractères invalides.",
            'tax_id.max' => "L'identifiant fiscal ne doit pas dépasser :max caractères.",
            'tax_id.regex' => "L'identifiant fiscal contient des caractères invalides.",
        ]);

        $data = $this->sanitizePayload($data);
        $client->update($data);

        return response()->json(
            $this->clientPayload($client),
            200,
            [],
            JSON_INVALID_UTF8_SUBSTITUTE | JSON_UNESCAPED_UNICODE
        );
    }

    #[OA\Delete(
        path: '/api/clients/{id}',
        tags: ['Clients'],
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
        $client = Client::query()
            ->where('user_id', $request->user()->id)
            ->findOrFail($id);

        $client->delete();

        return response()->noContent();
    }

    public function documents(Request $request, string $id): JsonResponse
    {
        $userId = $request->user()->id;
        $client = Client::query()->where('user_id', $userId)->findOrFail($id);

        $quotes = Quote::query()
            ->where('user_id', $userId)
            ->where('client_id', $client->id)
            ->orderByDesc('id')
            ->limit(50)
            ->get(['id', 'number', 'status', 'total', 'currency', 'issue_date', 'valid_until']);

        $invoices = Invoice::query()
            ->where('user_id', $userId)
            ->where('client_id', $client->id)
            ->orderByDesc('id')
            ->limit(50)
            ->get(['id', 'number', 'status', 'document_type', 'total', 'currency', 'issue_date', 'due_date']);

        $revenuePaid = (float) Invoice::query()
            ->where('user_id', $userId)
            ->where('client_id', $client->id)
            ->where('status', 'paid')
            ->sum('total');

        return response()->json([
            'client' => $this->clientPayload($client),
            'quotes' => $quotes,
            'invoices' => $invoices,
            'stats' => [
                'quotes_count' => $quotes->count(),
                'invoices_count' => $invoices->count(),
                'revenue_paid_cfa' => $revenuePaid,
            ],
        ]);
    }

    public function importCsv(Request $request): JsonResponse
    {
        if (! PlanFeatures::canImportClientsCsv($request->user()->plan)) {
            return response()->json([
                'message' => "L'import CSV clients est réservé à l'offre Pro.",
            ], 403);
        }

        $data = $request->validate([
            'csv' => ['required', 'string', 'max:500000'],
        ]);

        $lines = preg_split('/\r\n|\r|\n/', $data['csv']) ?: [];
        $header = null;
        $created = 0;
        $errors = [];

        foreach ($lines as $index => $line) {
            $line = trim($line);
            if ($line === '') {
                continue;
            }
            $cols = str_getcsv($line);
            if ($header === null) {
                $header = array_map(fn ($h) => mb_strtolower(trim((string) $h)), $cols);
                continue;
            }
            if (count($cols) < 2) {
                $errors[] = 'Ligne '.($index + 1).' : colonnes insuffisantes.';
                continue;
            }
            $row = [];
            foreach ($header as $i => $key) {
                $row[$key] = $cols[$i] ?? '';
            }
            $first = trim((string) ($row['prenom'] ?? $row['first_name'] ?? ''));
            $last = trim((string) ($row['nom'] ?? $row['last_name'] ?? $row['name'] ?? ''));
            if ($first === '' && $last === '') {
                $errors[] = 'Ligne '.($index + 1).' : nom manquant.';
                continue;
            }
            try {
                $payload = $this->sanitizePayload([
                    'first_name' => $first,
                    'last_name' => $last,
                    'email' => trim((string) ($row['email'] ?? '')) ?: 'import-'.$index.'@facturo.local',
                    'phone' => trim((string) ($row['telephone'] ?? $row['phone'] ?? '')),
                    'company' => trim((string) ($row['entreprise'] ?? $row['company'] ?? '')),
                    'address' => trim((string) ($row['adresse'] ?? $row['address'] ?? '')),
                    'tax_id' => trim((string) ($row['siret'] ?? $row['tax_id'] ?? '')),
                    'notes' => trim((string) ($row['notes'] ?? '')),
                ]);
                $request->user()->clients()->create($payload);
                $created++;
            } catch (\Throwable $e) {
                $errors[] = 'Ligne '.($index + 1).' : '.$e->getMessage();
            }
        }

        return response()->json([
            'message' => "{$created} client(s) importé(s).",
            'created' => $created,
            'errors' => $errors,
        ]);
    }

    /**
     * @param array<string, mixed> $data
     * @return array<string, mixed>
     */
    private function sanitizePayload(array $data): array
    {
        $stringFields = ['first_name', 'last_name', 'name', 'email', 'phone', 'company', 'address', 'tax_id', 'notes'];
        foreach ($stringFields as $field) {
            if (! array_key_exists($field, $data)) {
                continue;
            }
            if ($data[$field] === null) {
                continue;
            }
            $data[$field] = Utf8::clean((string) $data[$field]);
        }

        $data['first_name'] = isset($data['first_name']) ? $this->toTitleCase($data['first_name']) : null;
        $data['last_name'] = isset($data['last_name']) ? $this->toTitleCase($data['last_name']) : null;
        if (isset($data['first_name'], $data['last_name'])) {
            $data['name'] = trim("{$data['first_name']} {$data['last_name']}");
        }
        if (isset($data['email'])) {
            $data['email'] = mb_strtolower(trim((string) $data['email']));
        }
        if (isset($data['company'])) {
            $data['company'] = $this->toTitleCase($data['company']);
        }

        return $data;
    }

    /**
     * @return array<string, mixed>
     */
    private function clientPayload(Client $client): array
    {
        return [
            'id' => $client->id,
            'user_id' => $client->user_id,
            'first_name' => Utf8::clean($client->first_name),
            'last_name' => Utf8::clean($client->last_name),
            'name' => Utf8::clean($client->name),
            'email' => Utf8::clean($client->email),
            'phone' => Utf8::clean($client->phone),
            'company' => Utf8::clean($client->company),
            'address' => Utf8::clean($client->address),
            'tax_id' => Utf8::clean($client->tax_id),
            'notes' => Utf8::clean($client->notes),
            'created_at' => $client->created_at?->toIso8601String(),
            'updated_at' => $client->updated_at?->toIso8601String(),
        ];
    }

    private function toTitleCase(string $value): string
    {
        $value = trim(preg_replace('/\s+/', ' ', $value) ?? '');
        if ($value === '') {
            return '';
        }

        return mb_convert_case($value, MB_CASE_TITLE, 'UTF-8');
    }
}
