<?php

namespace App\Services;

use App\Models\User;
use App\Support\BillingPayload;
use App\Support\PlanFeatures;
use Illuminate\Support\Str;

class SimulatedBillingService
{
    /**
     * @param  array<string, mixed>|null  $card
     * @return array<string, mixed>
     */
    public function checkoutPro(User $user, ?array $card = null): array
    {
        if (
            PlanFeatures::normalize($user->plan) === 'pro'
            && in_array($user->billing_status, ['active', 'trialing'], true)
        ) {
            throw new \RuntimeException('Vous êtes déjà abonné à l\'offre Pro.');
        }

        $method = $this->normalizeCard($card);
        $user->stripe_customer_id = $user->stripe_customer_id ?: 'sim_cus_'.$user->id;
        $user->stripe_subscription_id = 'sim_sub_'.Str::lower(Str::random(12));
        $user->plan = 'pro';
        $user->billing_status = 'active';
        $user->plan_period_end = now()->addMonth();
        $user->billing_payment_method = $method;
        $user->save();

        return $this->payload($user, 'Abonnement Pro activé (simulation).');
    }

    /**
     * @param  array<string, mixed>|null  $card
     * @return array<string, mixed>
     */
    public function changePlan(User $user, string $plan, ?array $card = null): array
    {
        $plan = PlanFeatures::normalize($plan);
        if ($plan === 'enterprise') {
            $user->plan = 'enterprise';
            $user->billing_status = 'active';
            $user->stripe_subscription_id = $user->stripe_subscription_id ?: 'sim_sub_ent_'.Str::lower(Str::random(8));
            $user->plan_period_end = null;
            $user->save();

            return $this->payload($user, 'Offre Entreprise activée (simulation).');
        }

        if ($plan === 'pro') {
            return $this->checkoutPro($user, $card);
        }

        return $this->cancelSubscription($user, immediate: true);
    }

    /**
     * @param  array<string, mixed>  $card
     * @return array<string, mixed>
     */
    public function updatePaymentMethod(User $user, array $card): array
    {
        if (! $user->stripe_customer_id) {
            $user->stripe_customer_id = 'sim_cus_'.$user->id;
        }

        $user->billing_payment_method = $this->normalizeCard($card);
        $user->save();

        return $this->payload($user, 'Moyen de paiement mis à jour (simulation).');
    }

    /**
     * @return array<string, mixed>
     */
    public function cancelSubscription(User $user, bool $immediate = true): array
    {
        if ($immediate) {
            $user->plan = 'free';
            $user->billing_status = 'canceled';
            $user->stripe_subscription_id = null;
            $user->plan_period_end = null;
        } else {
            $user->billing_status = 'canceled';
        }

        $user->save();

        return $this->payload($user, 'Abonnement résilié (simulation).');
    }

    /**
     * @return array<string, mixed>
     */
    public function summary(User $user): array
    {
        $method = $user->billing_payment_method;

        return [
            'payment_method' => is_array($method) && isset($method['last4']) ? $method : null,
        ];
    }

    /**
     * @param  array<string, mixed>|null  $card
     * @return array{brand: string, last4: string, exp_month: int, exp_year: int}
     */
    private function normalizeCard(?array $card): array
    {
        $last4 = preg_replace('/\D/', '', (string) ($card['last4'] ?? '4242'));
        $last4 = substr(str_pad($last4, 4, '0', STR_PAD_LEFT), -4);

        return [
            'brand' => strtolower((string) ($card['brand'] ?? 'visa')),
            'last4' => $last4,
            'exp_month' => (int) ($card['exp_month'] ?? 12),
            'exp_year' => (int) ($card['exp_year'] ?? (int) now()->addYears(3)->format('Y')),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function payload(User $user, string $message): array
    {
        $user->refresh();

        return [
            'message' => $message,
            'billing' => BillingPayload::forUser($user),
            ...$this->summary($user),
            'plan_features' => PlanFeatures::forUser($user),
        ];
    }
}
