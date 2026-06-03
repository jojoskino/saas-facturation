<?php

namespace App\Support;

use App\Models\User;

class BillingPayload
{
    public static function mode(): string
    {
        return self::isStripeConfigured() ? 'stripe' : 'unconfigured';
    }

    public static function isStripeConfigured(): bool
    {
        return filled(config('billing.stripe.secret'))
            && filled(config('billing.stripe.price_pro'));
    }

    /**
     * @return array<string, mixed>
     */
    public static function forUser(User $user): array
    {
        $plan = PlanFeatures::normalize($user->plan);
        $stripeReady = self::isStripeConfigured();
        $plans = collect(config('billing.plans', []))
            ->map(function (array $meta, string $id) use ($plan) {
                return [
                    'id' => $id,
                    'label' => $meta['label'] ?? ucfirst($id),
                    'price_label' => $meta['price_label'] ?? '',
                    'self_serve' => (bool) ($meta['self_serve'] ?? false),
                    'contact_email' => $meta['contact_email'] ?? null,
                    'current' => $id === $plan,
                ];
            })
            ->values()
            ->all();

        $hasSubscription = filled($user->stripe_subscription_id)
            && in_array($user->billing_status, ['active', 'trialing'], true);

        return [
            'mode' => self::mode(),
            'configured' => $stripeReady,
            'plan' => $plan,
            'billing_status' => $user->billing_status,
            'plan_period_end' => $user->plan_period_end?->toIso8601String(),
            'stripe_customer_id' => $user->stripe_customer_id,
            'has_subscription' => $hasSubscription,
            'can_manage_portal' => $stripeReady && filled($user->stripe_customer_id),
            'plans' => $plans,
        ];
    }
}
