<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\StripeBillingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class StripeWebhookController extends Controller
{
    public function __construct(
        private readonly StripeBillingService $billing,
    ) {}

    public function handle(Request $request): JsonResponse
    {
        try {
            $this->billing->handleWebhook(
                $request->getContent(),
                $request->header('Stripe-Signature'),
            );
        } catch (\UnexpectedValueException $e) {
            return response()->json(['message' => 'Signature invalide.'], 400);
        } catch (\RuntimeException $e) {
            Log::warning('Stripe webhook rejected', ['error' => $e->getMessage()]);

            return response()->json(['message' => $e->getMessage()], 503);
        } catch (\Throwable $e) {
            Log::error('Stripe webhook failed', ['error' => $e->getMessage()]);

            return response()->json(['message' => 'Erreur webhook.'], 500);
        }

        return response()->json(['received' => true]);
    }
}
