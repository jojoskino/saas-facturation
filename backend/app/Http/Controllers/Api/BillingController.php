<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\SimulatedBillingService;
use App\Services\StripeBillingService;
use App\Support\BillingPayload;
use App\Support\PlanFeatures;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;
use Stripe\Exception\ApiErrorException;

class BillingController extends Controller
{
    public function __construct(
        private readonly StripeBillingService $stripeBilling,
        private readonly SimulatedBillingService $simulatedBilling,
    ) {}

    #[OA\Get(
        path: '/api/billing',
        tags: ['Facturation'],
        summary: 'Résumé abonnement et moyens de paiement',
        security: [['sanctum' => []]],
        responses: [new OA\Response(response: 200, description: 'Résumé')]
    )]
    public function show(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if (BillingPayload::mode() === 'stripe' && $user->stripe_subscription_id) {
            try {
                $this->stripeBilling->syncUserSubscription($user);
                $user->refresh();
            } catch (ApiErrorException) {
                // Keep cached subscription data if Stripe is temporarily unavailable.
            }
        }

        $summary = BillingPayload::isSimulation()
            ? $this->simulatedBilling->summary($user)
            : $this->stripeBilling->summary($user);

        return response()->json([
            ...BillingPayload::forUser($user),
            ...$summary,
            'plan_features' => PlanFeatures::forUser($user),
        ]);
    }

    #[OA\Post(
        path: '/api/billing/checkout',
        tags: ['Facturation'],
        summary: 'Créer une session Stripe Checkout ou ouvrir la simulation',
        security: [['sanctum' => []]],
        responses: [new OA\Response(response: 200, description: 'URL ou mode simulation')]
    )]
    public function checkout(Request $request): JsonResponse
    {
        if (! BillingPayload::isConfigured()) {
            return response()->json([
                'message' => 'La facturation en ligne n\'est pas encore activée. Contactez le support.',
            ], 503);
        }

        $validated = $request->validate([
            'plan' => ['required', 'string', 'in:pro'],
        ]);

        /** @var User $user */
        $user = $request->user();

        if (PlanFeatures::normalize($user->plan) === 'pro' && in_array($user->billing_status, ['active', 'trialing'], true)) {
            return response()->json([
                'message' => 'Vous êtes déjà abonné à l\'offre Pro. Utilisez le portail pour modifier votre abonnement.',
                'portal_recommended' => true,
            ], 422);
        }

        if (BillingPayload::isSimulation()) {
            return response()->json([
                'mode' => 'simulation',
                'requires_confirmation' => true,
                'plan' => $validated['plan'],
            ]);
        }

        try {
            $session = $this->stripeBilling->createCheckoutSession($user, $validated['plan']);

            return response()->json([
                'mode' => 'stripe',
                'url' => $session->url,
            ]);
        } catch (ApiErrorException $e) {
            return response()->json([
                'message' => 'Impossible de démarrer le paiement : '.$e->getMessage(),
            ], 502);
        }
    }

    #[OA\Post(
        path: '/api/billing/portal',
        tags: ['Facturation'],
        summary: 'Portail client ou simulation de gestion',
        security: [['sanctum' => []]],
        responses: [new OA\Response(response: 200, description: 'URL ou mode simulation')]
    )]
    public function portal(Request $request): JsonResponse
    {
        if (! BillingPayload::isConfigured()) {
            return response()->json([
                'message' => 'La gestion en ligne n\'est pas disponible.',
            ], 503);
        }

        if (BillingPayload::isSimulation()) {
            return response()->json([
                'mode' => 'simulation',
                'portal' => true,
            ]);
        }

        /** @var User $user */
        $user = $request->user();

        try {
            $session = $this->stripeBilling->createPortalSession($user);

            return response()->json([
                'mode' => 'stripe',
                'url' => $session->url,
            ]);
        } catch (\RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        } catch (ApiErrorException $e) {
            return response()->json([
                'message' => 'Impossible d\'ouvrir le portail : '.$e->getMessage(),
            ], 502);
        }
    }

    #[OA\Post(
        path: '/api/billing/simulate',
        tags: ['Facturation'],
        summary: 'Actions de facturation simulées',
        security: [['sanctum' => []]],
        responses: [new OA\Response(response: 200, description: 'Résultat simulation')]
    )]
    public function simulate(Request $request): JsonResponse
    {
        if (! BillingPayload::isSimulation()) {
            return response()->json([
                'message' => 'La simulation n\'est pas active sur cet environnement.',
            ], 403);
        }

        $validated = $request->validate([
            'action' => ['required', 'string', 'in:checkout_pro,change_plan,update_card,cancel'],
            'plan' => ['nullable', 'string', 'in:free,pro,enterprise'],
            'card' => ['nullable', 'array'],
            'card.brand' => ['nullable', 'string', 'max:20'],
            'card.last4' => ['nullable', 'string', 'max:4'],
            'card.exp_month' => ['nullable', 'integer', 'min:1', 'max:12'],
            'card.exp_year' => ['nullable', 'integer', 'min:2024', 'max:2100'],
        ]);

        /** @var User $user */
        $user = $request->user();
        $card = $validated['card'] ?? null;

        try {
            $result = match ($validated['action']) {
                'checkout_pro' => $this->simulatedBilling->checkoutPro($user, $card),
                'change_plan' => $this->simulatedBilling->changePlan(
                    $user,
                    (string) ($validated['plan'] ?? 'free'),
                    $card
                ),
                'update_card' => $this->simulatedBilling->updatePaymentMethod($user, $card ?? []),
                'cancel' => $this->simulatedBilling->cancelSubscription($user),
            };

            return response()->json($result);
        } catch (\RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }
}
