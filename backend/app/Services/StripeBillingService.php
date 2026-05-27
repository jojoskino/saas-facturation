<?php

namespace App\Services;

use App\Models\User;
use App\Support\PlanFeatures;
use Illuminate\Support\Facades\Log;
use Stripe\Checkout\Session as CheckoutSession;
use Stripe\Customer;
use Stripe\Exception\ApiErrorException;
use Stripe\Stripe;
use Stripe\Subscription;
use Stripe\Webhook;

class StripeBillingService
{
    public static function isConfigured(): bool
    {
        return filled(config('billing.stripe.secret'))
            && filled(config('billing.stripe.price_pro'));
    }

    public function __construct()
    {
        $secret = config('billing.stripe.secret');
        if ($secret) {
            Stripe::setApiKey($secret);
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function summary(User $user): array
    {
        $payload = [
            'payment_method' => null,
        ];

        if (! self::isConfigured() || ! $user->stripe_customer_id) {
            return $payload;
        }

        try {
            $customer = Customer::retrieve($user->stripe_customer_id, [
                'expand' => ['invoice_settings.default_payment_method'],
            ]);
            $paymentMethod = $customer->invoice_settings->default_payment_method ?? null;
            if (is_object($paymentMethod) && isset($paymentMethod->card)) {
                $payload['payment_method'] = [
                    'brand' => (string) ($paymentMethod->card->brand ?? ''),
                    'last4' => (string) ($paymentMethod->card->last4 ?? ''),
                    'exp_month' => (int) ($paymentMethod->card->exp_month ?? 0),
                    'exp_year' => (int) ($paymentMethod->card->exp_year ?? 0),
                ];
            }
        } catch (ApiErrorException $e) {
            Log::warning('Stripe customer retrieve failed', ['user_id' => $user->id, 'error' => $e->getMessage()]);
        }

        return $payload;
    }

    /**
     * @throws ApiErrorException
     */
    public function createCheckoutSession(User $user, string $plan): CheckoutSession
    {
        $this->assertConfigured();

        $plan = PlanFeatures::normalize($plan);
        if ($plan !== 'pro') {
            throw new \InvalidArgumentException('Seul le passage à Pro est disponible en ligne.');
        }

        $priceId = (string) config('billing.stripe.price_pro');
        $customerId = $this->getOrCreateCustomerId($user);
        $frontend = rtrim((string) config('app.frontend_url', 'http://localhost:5173'), '/');

        return CheckoutSession::create([
            'mode' => 'subscription',
            'customer' => $customerId,
            'client_reference_id' => (string) $user->id,
            'line_items' => [[
                'price' => $priceId,
                'quantity' => 1,
            ]],
            'success_url' => $frontend.'/app/abonnement?checkout=success',
            'cancel_url' => $frontend.'/app/abonnement?checkout=cancel',
            'metadata' => [
                'user_id' => (string) $user->id,
                'plan' => 'pro',
            ],
            'subscription_data' => [
                'metadata' => [
                    'user_id' => (string) $user->id,
                    'plan' => 'pro',
                ],
            ],
            'allow_promotion_codes' => true,
        ]);
    }

    /**
     * @throws ApiErrorException
     */
    public function createPortalSession(User $user): \Stripe\BillingPortal\Session
    {
        $this->assertConfigured();

        if (! $user->stripe_customer_id) {
            throw new \RuntimeException('Aucun client de facturation associé à ce compte.');
        }

        $frontend = rtrim((string) config('app.frontend_url', 'http://localhost:5173'), '/');

        return \Stripe\BillingPortal\Session::create([
            'customer' => $user->stripe_customer_id,
            'return_url' => $frontend.'/app/abonnement',
        ]);
    }

    public function handleWebhook(string $payload, ?string $signature): void
    {
        $this->assertConfigured();

        $secret = (string) config('billing.stripe.webhook_secret');
        if ($secret === '') {
            throw new \RuntimeException('Webhook Stripe non configuré.');
        }

        $event = Webhook::constructEvent($payload, (string) $signature, $secret);

        match ($event->type) {
            'checkout.session.completed' => $this->onCheckoutCompleted($event->data->object),
            'customer.subscription.updated' => $this->onSubscriptionUpdated($event->data->object),
            'customer.subscription.deleted' => $this->onSubscriptionDeleted($event->data->object),
            'invoice.payment_failed' => $this->onPaymentFailed($event->data->object),
            default => null,
        };
    }

    /**
     * @throws ApiErrorException
     */
    public function syncUserSubscription(User $user): void
    {
        if (! $user->stripe_subscription_id) {
            return;
        }

        $subscription = Subscription::retrieve($user->stripe_subscription_id);
        $this->applySubscriptionToUser($user, $subscription);
    }

    private function onCheckoutCompleted(object $session): void
    {
        $userId = (int) ($session->client_reference_id ?? $session->metadata->user_id ?? 0);
        if ($userId <= 0) {
            return;
        }

        $user = User::query()->find($userId);
        if (! $user) {
            return;
        }

        if (filled($session->customer)) {
            $user->stripe_customer_id = (string) $session->customer;
        }
        if (filled($session->subscription)) {
            $user->stripe_subscription_id = (string) $session->subscription;
            try {
                $subscription = Subscription::retrieve((string) $session->subscription);
                $this->applySubscriptionToUser($user, $subscription);
            } catch (ApiErrorException $e) {
                Log::error('Stripe subscription retrieve after checkout failed', ['user_id' => $user->id]);
                $user->plan = 'pro';
                $user->billing_status = 'active';
            }
        } else {
            $user->plan = 'pro';
            $user->billing_status = 'active';
        }

        $user->save();
    }

    private function onSubscriptionUpdated(object $subscription): void
    {
        $user = $this->findUserBySubscription($subscription);
        if (! $user) {
            return;
        }

        $this->applySubscriptionToUser($user, $subscription);
        $user->save();
    }

    private function onSubscriptionDeleted(object $subscription): void
    {
        $user = $this->findUserBySubscription($subscription);
        if (! $user) {
            return;
        }

        $user->plan = 'free';
        $user->billing_status = 'canceled';
        $user->stripe_subscription_id = null;
        $user->plan_period_end = null;
        $user->save();
    }

    private function onPaymentFailed(object $invoice): void
    {
        $subscriptionId = (string) ($invoice->subscription ?? '');
        if ($subscriptionId === '') {
            return;
        }

        $user = User::query()->where('stripe_subscription_id', $subscriptionId)->first();
        if (! $user) {
            return;
        }

        $user->billing_status = 'past_due';
        $user->save();
    }

    private function applySubscriptionToUser(User $user, object $subscription): void
    {
        $user->stripe_subscription_id = (string) $subscription->id;
        $user->billing_status = (string) ($subscription->status ?? 'active');
        $user->plan_period_end = isset($subscription->current_period_end)
            ? now()->createFromTimestamp((int) $subscription->current_period_end)
            : null;

        $priceId = $subscription->items->data[0]->price->id ?? null;
        $user->plan = $this->planFromPriceId($priceId) ?? ($subscription->status === 'active' || $subscription->status === 'trialing' ? 'pro' : 'free');

        if (! in_array($user->billing_status, ['active', 'trialing'], true)) {
            if ($user->billing_status === 'canceled' || $user->billing_status === 'unpaid') {
                $user->plan = 'free';
            }
        }
    }

    private function planFromPriceId(?string $priceId): ?string
    {
        if (! $priceId) {
            return null;
        }

        $proPrice = (string) config('billing.stripe.price_pro');
        if ($proPrice !== '' && $priceId === $proPrice) {
            return 'pro';
        }

        return null;
    }

    private function findUserBySubscription(object $subscription): ?User
    {
        $subscriptionId = (string) ($subscription->id ?? '');
        if ($subscriptionId !== '') {
            $bySub = User::query()->where('stripe_subscription_id', $subscriptionId)->first();
            if ($bySub) {
                return $bySub;
            }
        }

        $userId = (int) ($subscription->metadata->user_id ?? 0);
        if ($userId > 0) {
            return User::query()->find($userId);
        }

        return null;
    }

    /**
     * @throws ApiErrorException
     */
    private function getOrCreateCustomerId(User $user): string
    {
        if ($user->stripe_customer_id) {
            return $user->stripe_customer_id;
        }

        $customer = Customer::create([
            'email' => $user->email,
            'name' => $user->name,
            'metadata' => [
                'user_id' => (string) $user->id,
            ],
        ]);

        $user->stripe_customer_id = $customer->id;
        $user->save();

        return $customer->id;
    }

    private function assertConfigured(): void
    {
        if (! self::isConfigured()) {
            throw new \RuntimeException('La facturation en ligne n\'est pas configurée.');
        }
    }
}
