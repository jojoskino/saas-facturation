<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
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

        if (BillingPayload::isStripeConfigured() && $user->stripe_subscription_id) {
            try {
                $this->stripeBilling->syncUserSubscription($user);
                $user->refresh();
            } catch (ApiErrorException) {
                // Keep cached subscription data if Stripe is temporarily unavailable.
            }
        }

        return response()->json([
            ...BillingPayload::forUser($user),
            ...$this->stripeBilling->summary($user),
            'plan_features' => PlanFeatures::forUser($user),
        ]);
    }

    #[OA\Post(
        path: '/api/billing/checkout',
        tags: ['Facturation'],
        summary: 'Créer une session Stripe Checkout',
        security: [['sanctum' => []]],
        responses: [new OA\Response(response: 200, description: 'URL Stripe Checkout')]
    )]
    public function checkout(Request $request): JsonResponse
    {
        if (! BillingPayload::isStripeConfigured()) {
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
        summary: 'Portail client Stripe',
        security: [['sanctum' => []]],
        responses: [new OA\Response(response: 200, description: 'URL portail Stripe')]
    )]
    public function portal(Request $request): JsonResponse
    {
        if (! BillingPayload::isStripeConfigured()) {
            return response()->json([
                'message' => 'La gestion en ligne n\'est pas disponible.',
            ], 503);
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
}
