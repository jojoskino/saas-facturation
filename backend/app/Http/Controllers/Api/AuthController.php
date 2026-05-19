<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\Utf8;
use Illuminate\Auth\Events\Verified;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password as PasswordBroker;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rules\Password as PasswordRule;
use Illuminate\Validation\ValidationException;
use OpenApi\Attributes as OA;

class AuthController extends Controller
{
    #[OA\Post(
        path: '/api/register',
        tags: ['Auth'],
        summary: 'Créer un compte',
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['name', 'email', 'password', 'password_confirmation'],
                properties: [
                    new OA\Property(property: 'name', type: 'string', example: 'Aminata Diop'),
                    new OA\Property(property: 'email', type: 'string', format: 'email'),
                    new OA\Property(property: 'password', type: 'string', format: 'password'),
                    new OA\Property(property: 'password_confirmation', type: 'string', format: 'password'),
                ]
            )
        ),
        responses: [
            new OA\Response(response: 201, description: 'Compte créé — renvoie user + token'),
            new OA\Response(response: 422, description: 'Erreur de validation'),
        ]
    )]
    public function register(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8', 'regex:/^(?=.*[A-Za-z])(?=.*\\d)(?=.*[^A-Za-z\\d]).+$/', 'confirmed'],
        ], [
            'name.required' => 'Le nom est obligatoire.',
            'name.max' => 'Le nom ne doit pas dépasser :max caractères.',
            'email.required' => "L'adresse e-mail est obligatoire.",
            'email.email' => "L'adresse e-mail n'est pas valide.",
            'email.max' => "L'adresse e-mail ne doit pas dépasser :max caractères.",
            'email.unique' => 'Cette adresse e-mail est déjà utilisée.',
            'password.required' => 'Le mot de passe est obligatoire.',
            'password.min' => 'Le mot de passe doit contenir au moins :min caractères.',
            'password.regex' => 'Le mot de passe doit contenir au moins une lettre, un chiffre et un symbole.',
            'password.confirmed' => 'La confirmation du mot de passe ne correspond pas.',
        ], [
            'name' => 'nom',
            'email' => 'adresse e-mail',
            'password' => 'mot de passe',
        ]);

        $data['name'] = Utf8::clean($data['name']);
        $data['email'] = Utf8::clean($data['email']);

        $user = User::query()->create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => $data['password'],
        ]);

        $user->sendEmailVerificationNotification();

        $user->tokens()->delete();
        $token = $user->createToken('api')->plainTextToken;

        return response()->json(
            [
                'user' => $this->userPayload($user),
                'token' => $token,
                'token_type' => 'Bearer',
            ],
            201,
            [],
            JSON_INVALID_UTF8_SUBSTITUTE | JSON_UNESCAPED_UNICODE
        );
    }

    #[OA\Post(
        path: '/api/login',
        tags: ['Auth'],
        summary: 'Connexion',
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['email', 'password'],
                properties: [
                    new OA\Property(property: 'email', type: 'string', format: 'email'),
                    new OA\Property(property: 'password', type: 'string', format: 'password'),
                ]
            )
        ),
        responses: [
            new OA\Response(response: 200, description: 'Token émis'),
            new OA\Response(response: 422, description: 'Identifiants invalides'),
        ]
    )]
    public function login(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ], [
            'email.required' => "L'adresse e-mail est obligatoire.",
            'email.email' => "L'adresse e-mail n'est pas valide.",
            'password.required' => 'Le mot de passe est obligatoire.',
        ], [
            'email' => 'adresse e-mail',
            'password' => 'mot de passe',
        ]);

        $user = User::query()->where('email', $data['email'])->first();

        if (! $user || ! Hash::check($data['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['Les identifiants fournis sont incorrects.'],
            ]);
        }

        $user->tokens()->delete();
        $token = $user->createToken('api')->plainTextToken;

        return response()->json(
            [
                'user' => $this->userPayload($user),
                'token' => $token,
                'token_type' => 'Bearer',
            ],
            200,
            [],
            JSON_INVALID_UTF8_SUBSTITUTE | JSON_UNESCAPED_UNICODE
        );
    }

    #[OA\Post(
        path: '/api/logout',
        tags: ['Auth'],
        summary: 'Révoquer le token courant',
        security: [['sanctum' => []]],
        responses: [
            new OA\Response(response: 204, description: 'Déconnecté'),
        ]
    )]
    public function logout(Request $request): JsonResponse
    {
        $request->user()?->currentAccessToken()?->delete();

        return response()->json(null, 204);
    }

    #[OA\Get(
        path: '/api/me',
        tags: ['Auth'],
        summary: 'Profil utilisateur authentifié',
        security: [['sanctum' => []]],
        responses: [
            new OA\Response(response: 200, description: 'Utilisateur'),
        ]
    )]
    public function me(Request $request): JsonResponse
    {
        return response()->json(
            $this->userPayload($request->user()),
            200,
            [],
            JSON_INVALID_UTF8_SUBSTITUTE | JSON_UNESCAPED_UNICODE
        );
    }

    public function updateProfile(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', "unique:users,email,{$user->id}"],
        ], [
            'name.required' => 'Le nom est obligatoire.',
            'email.required' => "L'adresse e-mail est obligatoire.",
            'email.email' => "L'adresse e-mail n'est pas valide.",
            'email.unique' => 'Cette adresse e-mail est déjà utilisée.',
        ]);

        $user->update([
            'name' => Utf8::clean($data['name']),
            'email' => Utf8::clean($data['email']),
        ]);

        return response()->json(
            [
                'message' => 'Profil mis à jour avec succès.',
                'user' => $this->userPayload($user->fresh()),
            ],
            200,
            [],
            JSON_INVALID_UTF8_SUBSTITUTE | JSON_UNESCAPED_UNICODE
        );
    }

    public function updateCompanyProfile(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $data = $request->validate([
            'company_name' => ['nullable', 'string', 'max:255'],
            'company_address' => ['nullable', 'string', 'max:5000'],
            'company_phone' => ['nullable', 'string', 'max:64'],
            'company_email' => ['nullable', 'string', 'email', 'max:255'],
            'company_tax_id' => ['nullable', 'string', 'max:120'],
            'company_bank_name' => ['nullable', 'string', 'max:255'],
            'company_bank_iban' => ['nullable', 'string', 'max:64'],
            'company_bank_bic' => ['nullable', 'string', 'max:32'],
            'company_legal_footer' => ['nullable', 'string', 'max:10000'],
            'document_color_primary' => ['nullable', 'string', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'document_color_accent' => ['nullable', 'string', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'company_logo' => ['nullable', 'image', 'max:2048'],
            'remove_company_logo' => ['nullable', 'boolean'],
        ], [
            'company_email.email' => "L'e-mail affiché sur les documents n'est pas valide.",
            'document_color_primary.regex' => 'La couleur principale doit être un code hexadécimal (#RRGGBB).',
            'document_color_accent.regex' => "La couleur d'accent doit être un code hexadécimal (#RRGGBB).",
            'company_logo.image' => 'Le logo doit être une image (PNG, JPG, SVG, WebP).',
            'company_logo.max' => 'Le logo ne doit pas dépasser 2 Mo.',
        ]);

        unset($data['company_logo'], $data['remove_company_logo']);

        if ($request->boolean('remove_company_logo') && $user->company_logo_path) {
            Storage::disk('public')->delete($user->company_logo_path);
            $data['company_logo_path'] = null;
        }

        if ($request->hasFile('company_logo')) {
            if ($user->company_logo_path) {
                Storage::disk('public')->delete($user->company_logo_path);
            }
            $data['company_logo_path'] = $request->file('company_logo')->store(
                'company-logos/'.$user->id,
                'public'
            );
        }

        $user->update($data);

        return response()->json(
            [
                'message' => 'Informations enregistrées. Elles pourront être utilisées sur vos devis et factures.',
                'user' => $this->userPayload($user->fresh()),
            ],
            200,
            [],
            JSON_INVALID_UTF8_SUBSTITUTE | JSON_UNESCAPED_UNICODE
        );
    }

    public function updateSettings(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $data = $request->validate([
            'locale' => ['nullable', 'string', 'max:8', 'in:fr,en'],
            'timezone' => ['nullable', 'string', 'max:64'],
            'notifications_email' => ['nullable', 'boolean'],
        ]);

        $user->update(array_filter([
            'locale' => $data['locale'] ?? null,
            'timezone' => $data['timezone'] ?? null,
            'notifications_email' => array_key_exists('notifications_email', $data)
                ? (bool) $data['notifications_email']
                : null,
        ], fn ($v) => $v !== null));

        return response()->json([
            'message' => 'Paramètres enregistrés.',
            'user' => $this->userPayload($user->fresh()),
        ]);
    }

    public function forgotPassword(Request $request): JsonResponse
    {
        $request->validate(['email' => ['required', 'email']]);

        $status = PasswordBroker::sendResetLink($request->only('email'));

        return response()->json([
            'message' => $status === PasswordBroker::RESET_LINK_SENT
                ? 'Si cette adresse existe, un e-mail de réinitialisation a été envoyé.'
                : 'Si cette adresse existe, un e-mail de réinitialisation a été envoyé.',
        ]);
    }

    public function resetPassword(Request $request): JsonResponse
    {
        $request->validate([
            'token' => ['required', 'string'],
            'email' => ['required', 'email'],
            'password' => ['required', 'confirmed', PasswordRule::min(8)->letters()->numbers()->symbols()],
        ]);

        $status = PasswordBroker::reset(
            $request->only('email', 'password', 'password_confirmation', 'token'),
            function (User $user, string $password): void {
                $user->forceFill(['password' => $password])->save();
                $user->tokens()->delete();
            }
        );

        if ($status !== PasswordBroker::PASSWORD_RESET) {
            throw ValidationException::withMessages([
                'email' => [__($status)],
            ]);
        }

        return response()->json(['message' => 'Mot de passe réinitialisé. Vous pouvez vous connecter.']);
    }

    public function verifyEmail(Request $request, string $id, string $hash): RedirectResponse
    {
        $user = User::query()->findOrFail($id);

        if (! hash_equals((string) $hash, sha1($user->getEmailForVerification()))) {
            abort(403, 'Lien de vérification invalide.');
        }

        if (! $user->hasVerifiedEmail() && $user->markEmailAsVerified()) {
            event(new Verified($user));
        }

        return redirect($this->frontendUrl('/login?verified=1'));
    }

    public function resendVerification(Request $request): JsonResponse
    {
        if ($request->user()->hasVerifiedEmail()) {
            return response()->json(['message' => 'Votre e-mail est déjà vérifié.']);
        }

        $request->user()->sendEmailVerificationNotification();

        return response()->json(['message' => 'E-mail de vérification renvoyé.']);
    }

    public function updatePassword(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $data = $request->validate([
            'current_password' => ['required', 'string'],
            'password' => ['required', 'confirmed', PasswordRule::min(8)->letters()->numbers()->symbols()],
        ], [
            'current_password.required' => 'Le mot de passe actuel est obligatoire.',
            'password.required' => 'Le nouveau mot de passe est obligatoire.',
            'password.confirmed' => 'La confirmation du mot de passe ne correspond pas.',
        ]);

        if (! Hash::check($data['current_password'], $user->password)) {
            throw ValidationException::withMessages([
                'current_password' => ['Le mot de passe actuel est incorrect.'],
            ]);
        }

        $user->update([
            'password' => $data['password'],
        ]);

        return response()->json(
            ['message' => 'Mot de passe mis à jour avec succès.'],
            200,
            [],
            JSON_INVALID_UTF8_SUBSTITUTE | JSON_UNESCAPED_UNICODE
        );
    }

    /**
     * @return array<string, mixed>
     */
    private function userPayload(?User $user): array
    {
        if ($user === null) {
            return [];
        }

        return [
            'id' => $user->id,
            'name' => Utf8::clean($user->name),
            'email' => Utf8::clean($user->email),
            'email_verified_at' => $user->email_verified_at?->toIso8601String(),
            'created_at' => $user->created_at?->toIso8601String(),
            'updated_at' => $user->updated_at?->toIso8601String(),
            'company_name' => $user->company_name !== null ? Utf8::clean($user->company_name) : null,
            'company_address' => $user->company_address !== null ? Utf8::clean($user->company_address) : null,
            'company_phone' => $user->company_phone !== null ? Utf8::clean($user->company_phone) : null,
            'company_email' => $user->company_email !== null ? Utf8::clean($user->company_email) : null,
            'company_tax_id' => $user->company_tax_id !== null ? Utf8::clean($user->company_tax_id) : null,
            'company_bank_name' => $user->company_bank_name !== null ? Utf8::clean($user->company_bank_name) : null,
            'company_bank_iban' => $user->company_bank_iban !== null ? Utf8::clean($user->company_bank_iban) : null,
            'company_bank_bic' => $user->company_bank_bic !== null ? Utf8::clean($user->company_bank_bic) : null,
            'company_legal_footer' => $user->company_legal_footer !== null ? Utf8::clean($user->company_legal_footer) : null,
            'company_logo_url' => $user->company_logo_path
                ? Storage::disk('public')->url($user->company_logo_path)
                : null,
            'document_color_primary' => $user->document_color_primary ?: '#14213D',
            'document_color_accent' => $user->document_color_accent ?: '#FCA311',
            'locale' => $user->locale ?? 'fr',
            'timezone' => $user->timezone ?? 'Africa/Abidjan',
            'notifications_email' => (bool) ($user->notifications_email ?? true),
            'plan' => $user->plan ?? 'free',
        ];
    }

    private function frontendUrl(string $path): string
    {
        return rtrim((string) config('app.frontend_url', 'http://localhost:5173'), '/').$path;
    }
}
